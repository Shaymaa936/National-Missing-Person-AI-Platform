import cv2
import numpy as np
import base64
from db_manager import db_inst
from face_engine import engine_inst

def seed_sample():
    img = np.ones((320, 320, 3), dtype=np.uint8) * 200
    cv2.ellipse(img, (160, 160), (75, 95), 0, 0, 360, (190, 160, 140), -1)
    cv2.circle(img, (135, 140), 12, (255, 255, 255), -1)
    cv2.circle(img, (185, 140), 12, (255, 255, 255), -1)
    cv2.circle(img, (135, 140), 5, (0, 0, 0), -1)
    cv2.circle(img, (185, 140), 5, (0, 0, 0), -1)
    pts = np.array([[160, 150], [153, 175], [167, 175]], np.int32)
    cv2.fillPoly(img, [pts], (170, 135, 115))
    cv2.ellipse(img, (160, 205), (28, 14), 0, 0, 180, (90, 45, 45), -1)

    _, buffer = cv2.imencode(".jpg", img)
    b64 = base64.b64encode(buffer).decode("utf-8")
    img_np = engine_inst.decode_image(b64)
    faces = engine_inst.detect_faces(img_np)
    embedding = engine_inst.extract_embedding(img_np, faces[0] if faces else None)
    raw_bytes = base64.b64decode(b64)

    case = db_inst.enroll_missing_person(
        name="Sarah Connor",
        age=26,
        gender="Female",
        missing_since="2026-08-10",
        last_seen_location="5th Avenue, New York, NY",
        contact_number="+1 (555) 019-2831",
        notes="Wearing dark gray jacket, silver necklace.",
        img_bytes=raw_bytes,
        embedding=embedding
    )
    print(f"Successfully seeded sample missing person: {case['name']} (ID: {case['id']})")

if __name__ == "__main__":
    seed_sample()
