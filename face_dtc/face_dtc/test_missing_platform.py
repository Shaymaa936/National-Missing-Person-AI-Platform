import cv2
import numpy as np
import base64
import json
from db_manager import db_inst
from face_engine import engine_inst

def create_sample_missing_photo():
    img = np.ones((320, 320, 3), dtype=np.uint8) * 210
    # Facial shape
    cv2.ellipse(img, (160, 160), (75, 95), 0, 0, 360, (190, 160, 140), -1)
    # Eyes
    cv2.circle(img, (135, 140), 12, (255, 255, 255), -1)
    cv2.circle(img, (185, 140), 12, (255, 255, 255), -1)
    cv2.circle(img, (135, 140), 5, (0, 0, 0), -1)
    cv2.circle(img, (185, 140), 5, (0, 0, 0), -1)
    # Nose & Mouth
    pts = np.array([[160, 150], [153, 175], [167, 175]], np.int32)
    cv2.fillPoly(img, [pts], (170, 135, 115))
    cv2.ellipse(img, (160, 205), (28, 14), 0, 0, 180, (90, 45, 45), -1)

    _, buffer = cv2.imencode(".jpg", img)
    b64 = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"

def run_tests():
    print("==========================================")
    print("  MISSING PERSONS PLATFORM INTEGRATION TEST ")
    print("==========================================")

    # 1. Generate Photo
    photo_b64 = create_sample_missing_photo()
    print("[1] Missing Person test photo generated.")

    # 2. Extract Embedding & Enroll
    img_np = engine_inst.decode_image(photo_b64)
    faces = engine_inst.detect_faces(img_np)
    embedding = engine_inst.extract_embedding(img_np, faces[0] if faces else None)

    raw_bytes = base64.b64decode(photo_b64.split(",")[1])

    case = db_inst.enroll_missing_person(
        name="Samantha Reed",
        age=22,
        gender="Female",
        missing_since="2026-08-15",
        last_seen_location="Times Square, New York, NY",
        contact_number="+1 (555) 918-2736",
        notes="Wearing red hoodie, denim jeans",
        img_bytes=raw_bytes,
        embedding=embedding
    )

    print(f"[2] Enrolled Missing Person Case: {json.dumps(case, indent=2)}")
    assert case["name"] == "Samantha Reed"
    assert case["status"] == "Missing"

    # 3. AI Facial Similarity Search
    search_results = engine_inst.search_missing_candidates(photo_b64, top_k=5, threshold=0.30)
    print(f"[3] Search Results Count: {len(search_results)}")
    assert len(search_results) > 0

    top_candidate = search_results[0]["top_match"]
    print(f"[3] Top Candidate Match: {json.dumps(top_candidate, indent=2)}")
    assert top_candidate is not None
    assert top_candidate["match_percentage"] >= 50.0

    # 4. Log Sighting Report
    sighting = db_inst.add_sighting_report(
        case_id=case["id"],
        location="Grand Central Station, NYC",
        notes="Spotted near coffee kiosk",
        reporter_contact="+1 (555) 321-7654",
        img_bytes=raw_bytes
    )
    print(f"[4] Sighting Report Added: {json.dumps(sighting, indent=2)}")
    assert sighting["sighting_id"].startswith("ST-")

    # 5. Status Toggle (Mark Found)
    updated_case = db_inst.update_case_status(case["id"], "Found")
    print(f"[5] Case Status Updated: {updated_case['status']}")
    assert updated_case["status"] == "Found"

    # 6. Cleanup
    db_inst.delete_case(case["id"])
    print("[6] Cleaned up test case record.")

    print("==========================================")
    print("  ALL MISSING PERSONS TESTS PASSED 100%!  ")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
