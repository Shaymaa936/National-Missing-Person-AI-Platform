import os
import json
import uuid
import time
import numpy as np
from PIL import Image
import io

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
FACES_DIR = os.path.join(DATA_DIR, "faces")
SIGHTINGS_DIR = os.path.join(DATA_DIR, "sightings")
DB_FILE = os.path.join(DATA_DIR, "missing_db.json")

class MissingPersonDBManager:
    """
    Manages Missing Persons profiles, vector embedding index,
    Top-K candidate similarity searching, and sighting reports.
    """
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        os.makedirs(FACES_DIR, exist_ok=True)
        os.makedirs(SIGHTINGS_DIR, exist_ok=True)
        self.db_file = DB_FILE
        self._load_db()

    def _load_db(self):
        if os.path.exists(self.db_file):
            try:
                with open(self.db_file, "r", encoding="utf-8") as f:
                    self.db = json.load(f)
            except Exception as e:
                print(f"[DB] Error loading DB file, initializing fresh: {e}")
                self.db = {}
        else:
            self.db = {}
            self._save_db()

    def _save_db(self):
        with open(self.db_file, "w", encoding="utf-8") as f:
            json.dump(self.db, f, indent=2)

    def enroll_missing_person(
        self,
        name: str,
        age: int,
        gender: str,
        missing_since: str,
        last_seen_location: str,
        contact_number: str,
        notes: str,
        img_bytes: bytes,
        embedding: list
    ) -> dict:
        """
        Enrolls a new missing person record with photo preview & 512d facial vector.
        """
        case_id = "MP-" + str(uuid.uuid4())[:8].upper()
        timestamp = int(time.time())

        img_filename = f"{case_id}_{timestamp}.jpg"
        img_path = os.path.join(FACES_DIR, img_filename)

        try:
            image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            image.save(img_path, format="JPEG", quality=92)
        except Exception as e:
            print(f"[DB] Image save fallback: {e}")
            with open(img_path, "wb") as f:
                f.write(img_bytes)

        # Normalize 512d embedding vector
        vector = np.array(embedding, dtype=np.float32)
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm

        case_record = {
            "id": case_id,
            "name": name.strip(),
            "age": int(age) if age else None,
            "gender": gender.strip() if gender else "Unknown",
            "missing_since": missing_since.strip() if missing_since else "Recently",
            "last_seen_location": last_seen_location.strip(),
            "contact_number": contact_number.strip(),
            "notes": notes.strip() if notes else "",
            "status": "Missing", # "Missing" or "Found"
            "image_path": f"/data/faces/{img_filename}",
            "created_at": timestamp,
            "sightings": [],
            "embedding": vector.tolist()
        }

        self.db[case_id] = case_record
        self._save_db()
        print(f"[DB] Enrolled missing person case: {name} (Case ID: {case_id})")
        return self._strip_embedding(case_record)

    def get_all_cases(self, status_filter: str = None, query: str = None) -> list:
        """
        Returns list of missing person cases (without large embedding vector payload).
        """
        self._load_db()
        result = []
        for case_id, record in self.db.items():
            if status_filter and status_filter.lower() != "all":
                if record.get("status", "").lower() != status_filter.lower():
                    continue

            if query:
                q = query.lower()
                n = record.get("name", "").lower()
                loc = record.get("last_seen_location", "").lower()
                cid = record.get("id", "").lower()
                if q not in n and q not in loc and q not in cid:
                    continue

            result.append(self._strip_embedding(record))

        result.sort(key=lambda x: x.get("created_at", 0), reverse=True)
        return result

    def get_case_by_id(self, case_id: str) -> dict:
        record = self.db.get(case_id)
        if record:
            return self._strip_embedding(record)
        return None

    def update_case_status(self, case_id: str, new_status: str) -> dict:
        if case_id in self.db:
            self.db[case_id]["status"] = new_status
            self._save_db()
            return self._strip_embedding(self.db[case_id])
        return None

    def delete_case(self, case_id: str) -> bool:
        if case_id in self.db:
            record = self.db.pop(case_id)
            img_rel_path = record.get("image_path", "")
            if img_rel_path:
                filename = os.path.basename(img_rel_path)
                full_path = os.path.join(FACES_DIR, filename)
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                    except Exception as e:
                        print(f"[DB] Error removing image {full_path}: {e}")
            self._save_db()
            return True
        return False

    def add_sighting_report(
        self,
        case_id: str,
        location: str,
        notes: str,
        reporter_contact: str,
        img_bytes: bytes = None
    ) -> dict:
        """
        Logs a sighting report attached to a missing person case.
        """
        if case_id not in self.db:
            return None

        sighting_id = "ST-" + str(uuid.uuid4())[:6].upper()
        timestamp = int(time.time())
        sighting_img_url = None

        if img_bytes:
            img_filename = f"sighting_{sighting_id}_{timestamp}.jpg"
            img_path = os.path.join(SIGHTINGS_DIR, img_filename)
            try:
                image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
                image.save(img_path, format="JPEG", quality=90)
                sighting_img_url = f"/data/sightings/{img_filename}"
            except Exception as e:
                print(f"[DB] Sighting image save error: {e}")

        sighting_entry = {
            "sighting_id": sighting_id,
            "timestamp": timestamp,
            "location": location.strip(),
            "notes": notes.strip(),
            "reporter_contact": reporter_contact.strip(),
            "image_url": sighting_img_url
        }

        if "sightings" not in self.db[case_id]:
            self.db[case_id]["sightings"] = []

        self.db[case_id]["sightings"].insert(0, sighting_entry)
        self._save_db()
        return sighting_entry

    def search_top_candidates(self, query_vector: list, top_k: int = 5, min_threshold: float = 0.30) -> list:
        """
        Calculates cosine similarity of query_vector against all enrolled missing persons in memory.
        Returns top K candidate matches sorted by similarity score.
        """
        self._load_db()
        q_vec = np.array(query_vector, dtype=np.float32)
        norm = np.linalg.norm(q_vec)
        if norm > 0:
            q_vec = q_vec / norm

        candidates = []
        for case_id, record in self.db.items():
            emb = record.get("embedding")
            if not emb:
                continue

            target_vec = np.array(emb, dtype=np.float32)
            t_norm = np.linalg.norm(target_vec)
            if t_norm > 0:
                target_vec = target_vec / t_norm

            sim = float(np.dot(q_vec, target_vec))
            if sim >= min_threshold:
                match_percentage = round(min(sim * 100, 99.9), 1)

                if match_percentage >= 75.0:
                    tier = "High Match"
                    tier_code = "high"
                elif match_percentage >= 50.0:
                    tier = "Possible Match"
                    tier_code = "medium"
                else:
                    tier = "Low Match"
                    tier_code = "low"

                case_data = self._strip_embedding(record)
                case_data["similarity"] = round(sim, 4)
                case_data["match_percentage"] = match_percentage
                case_data["confidence_tier"] = tier
                case_data["tier_code"] = tier_code

                candidates.append(case_data)

        # Sort descending by similarity score
        candidates.sort(key=lambda c: c["similarity"], reverse=True)
        return candidates[:top_k]

    def _strip_embedding(self, record: dict) -> dict:
        rec_copy = dict(record)
        rec_copy.pop("embedding", None)
        return rec_copy

# Singleton Instance
db_inst = MissingPersonDBManager()
