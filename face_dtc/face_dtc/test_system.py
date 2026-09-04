import os
import cv2
import numpy as np
import base64
import json
from db_manager import db_inst
from face_engine import engine_inst

def create_sample_face_image():
    """
    Creates a synthetic 300x300 image with a basic face pattern for testing logic.
    """
    img = np.ones((300, 300, 3), dtype=np.uint8) * 220
    # Head outline
    cv2.ellipse(img, (150, 150), (70, 90), 0, 0, 360, (180, 150, 130), -1)
    # Eyes
    cv2.circle(img, (125, 130), 12, (255, 255, 255), -1)
    cv2.circle(img, (175, 130), 12, (255, 255, 255), -1)
    cv2.circle(img, (125, 130), 5, (0, 0, 0), -1)
    cv2.circle(img, (175, 130), 5, (0, 0, 0), -1)
    # Nose
    pts = np.array([[150, 140], [145, 165], [155, 165]], np.int32)
    cv2.fillPoly(img, [pts], (160, 130, 110))
    # Mouth
    cv2.ellipse(img, (150, 190), (25, 12), 0, 0, 180, (100, 50, 50), -1)
    
    _, buffer = cv2.imencode(".jpg", img)
    base64_str = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{base64_str}"

def run_tests():
    print("==========================================")
    print("    DEEPFACE SYSTEM INTEGRATION TEST      ")
    print("==========================================")

    # 1. Test Image Creation
    sample_b64 = create_sample_face_image()
    print("[1] Sample Face Image generated successfully.")

    # 2. Test Face Engine Detection & Embedding
    img_np = engine_inst.decode_image(sample_b64)
    print(f"[2] Image decoded. Array shape: {img_np.shape}")

    faces = engine_inst.detect_faces(img_np)
    print(f"[2] OpenCV Face Detector returned {len(faces)} faces.")

    embedding = engine_inst.extract_embedding(img_np, faces[0] if faces else None)
    print(f"[2] Embedding Vector Extracted. Length: {len(embedding)}")
    assert len(embedding) > 0, "Embedding vector extraction failed!"

    # 3. Test Identity Enrollment in DB
    raw_b64 = sample_b64.split(",")[1]
    img_bytes = base64.b64decode(raw_b64)

    enrolled = db_inst.enroll_identity(
        name="Test User Alex",
        role="Test Developer",
        img_bytes=img_bytes,
        embedding=embedding
    )
    print(f"[3] Enrolled Test User in DB: {enrolled}")
    assert enrolled["name"] == "Test User Alex"

    # 4. Test 1:N Recognition Search
    rec_results = engine_inst.recognize_faces(sample_b64, threshold=0.40)
    print(f"[4] 1:N Recognition Results: {json.dumps(rec_results, indent=2)}")
    assert len(rec_results) > 0, "Recognition failed to return face result!"
    matched_name = rec_results[0]["identity"]["name"]
    print(f"[4] Matched Identity Name: {matched_name}")

    # 5. Test 1:1 Verification
    ver_res = engine_inst.verify_identity(sample_b64, enrolled["id"], threshold=0.40)
    print(f"[5] 1:1 Verification Result: {json.dumps(ver_res, indent=2)}")
    assert ver_res["verified"] is True, "1:1 Verification failed!"

    # Cleanup Test Record
    db_inst.delete_identity(enrolled["id"])
    print("[6] Cleaned up test identity record.")

    print("==========================================")
    print("  ALL SYSTEM INTEGRATION TESTS PASSED!    ")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
