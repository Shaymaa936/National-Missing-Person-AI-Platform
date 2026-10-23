import os
import cv2
import base64
import numpy as np
import io
from PIL import Image

from db_manager import db_inst

CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

MODEL_NAME = "Facenet512"
DETECTOR_BACKEND = "opencv"
HISTOGRAM_MODEL = "histogram"

# FACE_STRICT_MODE=1 -> refuse to work without DeepFace and reject photos
# with no detectable face (recommended once you confirm DeepFace runs).
# Off by default so nothing that works today stops working.
STRICT_MODE = os.environ.get("FACE_STRICT_MODE", "0") == "1"

# Face finder: "opencv" (default, fast) or "retinaface" (much better with side
# angles, children and low light; slower on CPU). retinaface needs:
#   pip install retina-face        then set FACE_DETECTOR=retinaface
FACE_DETECTOR = os.environ.get("FACE_DETECTOR", "opencv").strip().lower()
_detector_warned = False


class NoFaceError(ValueError):
    pass

_deepface_loaded = False

def check_deepface_available():
    global _deepface_loaded
    try:
        from deepface import DeepFace
        _deepface_loaded = True
        return True
    except Exception:
        return False

class FaceEngine:
    def __init__(self, model_name: str = MODEL_NAME, detector_backend: str = DETECTOR_BACKEND):
        self.model_name = model_name
        self.detector_backend = detector_backend

    def warm_up(self):
        """
        Pre-warms the face detector & embedding model on startup.
        """
        if check_deepface_available():
            try:
                from deepface import DeepFace
                dummy_img = np.zeros((160, 160, 3), dtype=np.uint8)
                _ = DeepFace.represent(
                    img_path=dummy_img,
                    model_name=self.model_name,
                    enforce_detection=False,
                    detector_backend=self.detector_backend
                )
                print(f"[FaceEngine] Model '{self.model_name}' ready.")
            except Exception as e:
                print(f"[FaceEngine] Pre-warm info: {e}")
        else:
            print("[FaceEngine] Engine ready (OpenCV + NumPy Vector Engine active).")

    def decode_image(self, img_input) -> np.ndarray:
        if isinstance(img_input, np.ndarray):
            if len(img_input.shape) == 3 and img_input.shape[2] == 3:
                return img_input
            return cv2.cvtColor(img_input, cv2.COLOR_BGR2RGB)

        if isinstance(img_input, str):
            if "," in img_input:
                img_input = img_input.split(",")[1]
            img_bytes = base64.b64decode(img_input)
        elif isinstance(img_input, bytes):
            img_bytes = img_input
        else:
            raise ValueError("Unsupported image input format")

        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        return np.array(pil_img)

    def _detect_with_deepface(self, img_np: np.ndarray):
        """Better detector through DeepFace. Returns None if unavailable."""
        global _detector_warned
        try:
            from deepface import DeepFace
            faces = DeepFace.extract_faces(
                img_path=img_np[:, :, ::-1],  # DeepFace expects BGR
                detector_backend=FACE_DETECTOR,
                enforce_detection=False,
                align=False,
            )
            h, w = img_np.shape[:2]
            results = []
            for f in faces:
                area = f.get("facial_area") or {}
                conf = float(f.get("confidence") or 0)
                fw, fh = int(area.get("w", 0)), int(area.get("h", 0))
                # with enforce_detection=False "no face" comes back as the whole image
                if conf < 0.9 or fw <= 0 or fh <= 0 or (fw >= w - 2 and fh >= h - 2):
                    continue
                results.append({"x": int(area.get("x", 0)), "y": int(area.get("y", 0)),
                                "w": fw, "h": fh, "confidence": round(conf, 3)})
            return results
        except Exception as e:
            if not _detector_warned:
                print(f"[FaceEngine] '{FACE_DETECTOR}' detector unavailable, using OpenCV: {e}")
                _detector_warned = True
            return None

    def detect_faces(self, img_np: np.ndarray) -> list:
        if FACE_DETECTOR != "opencv":
            better = self._detect_with_deepface(img_np)
            if better is not None:
                return better

        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(40, 40)
        )

        # Second, more relaxed pass for small / low-contrast faces
        if len(faces) == 0:
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(24, 24)
            )

        results = []
        for (x, y, w, h) in faces:
            results.append({
                "x": int(x),
                "y": int(y),
                "w": int(w),
                "h": int(h),
                "confidence": 0.95
            })

        return results

    def extract_embedding(self, img_np: np.ndarray, bbox=None) -> list:
        """Backwards-compatible: returns only the vector."""
        vec, _model = self.extract_embedding_with_model(img_np, bbox)
        return vec

    def extract_embedding_with_model(self, img_np: np.ndarray, bbox=None):
        """
        Returns (vector, model_name). model_name is "Facenet512" for a real
        face embedding or "histogram" for the colour fallback, so the two
        kinds are never compared with each other.
        """
        crop_img = img_np
        if bbox:
            x, y, w, h = bbox["x"], bbox["y"], bbox["w"], bbox["h"]
            height, width = img_np.shape[:2]
            pad_w = int(w * 0.15)
            pad_h = int(h * 0.15)
            x1 = max(0, x - pad_w)
            y1 = max(0, y - pad_h)
            x2 = min(width, x + w + pad_w)
            y2 = min(height, y + h + pad_h)
            crop_img = img_np[y1:y2, x1:x2]

        if crop_img.size == 0:
            crop_img = img_np

        if check_deepface_available():
            from deepface import DeepFace
            try:
                embedding_objs = DeepFace.represent(
                    img_path=crop_img,
                    model_name=self.model_name,
                    enforce_detection=False,
                    detector_backend=self.detector_backend
                )
                if embedding_objs and len(embedding_objs) > 0:
                    raw_emb = embedding_objs[0]["embedding"]
                    vec = np.array(raw_emb, dtype=np.float32)
                    norm = np.linalg.norm(vec)
                    if norm > 0:
                        vec = vec / norm
                    return vec.tolist(), self.model_name
            except Exception as e:
                print(f"[FaceEngine] DeepFace represent error: {e}")

        if STRICT_MODE:
            raise RuntimeError("Face model (DeepFace) is not available; refusing colour-histogram fallback.")

        # Colour-histogram fallback (NOT a face embedding). Tagged so it is
        # only ever compared with other histogram vectors.
        print("[FaceEngine] WARNING: using colour-histogram fallback, not a face model.")
        resized = cv2.resize(crop_img, (64, 64))
        hist = cv2.calcHist([resized], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        vec = hist.flatten()
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist(), HISTOGRAM_MODEL

    def search_missing_candidates(self, img_input, top_k: int = 5, threshold: float = 0.30) -> list:
        """
        Main Missing Persons AI Pipeline:
        1. Decodes photo / video frame.
        2. Detects faces.
        3. Extracts 512d facial feature vector.
        4. Performs Top-K similarity search against all registered missing persons.
        5. Returns detected faces with ranked candidates, match %, and confidence tier.
        """
        img_np = self.decode_image(img_input)
        bboxes = self.detect_faces(img_np)

        if not bboxes:
            if STRICT_MODE:
                # No face found: return no matches instead of matching the whole photo
                return []
            # Fallback: process entire image frame if Haar Cascade misses small angle
            height, width = img_np.shape[:2]
            bboxes = [{"x": 0, "y": 0, "w": width, "h": height, "confidence": 0.80}]

        results = []
        for bbox in bboxes:
            emb, model = self.extract_embedding_with_model(img_np, bbox)
            candidates = db_inst.search_top_candidates(
                emb, top_k=top_k, min_threshold=threshold, model=model
            )

            top_match = candidates[0] if candidates else None

            results.append({
                "bbox": bbox,
                "has_matches": len(candidates) > 0,
                "top_match": top_match,
                "candidates": candidates
            })

        return results

# Singleton Instance
engine_inst = FaceEngine()
