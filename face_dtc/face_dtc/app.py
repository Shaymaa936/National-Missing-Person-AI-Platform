import os
import base64
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List

from db_manager import db_inst
from face_engine import engine_inst, check_deepface_available

app = FastAPI(
    title="Missing Persons AI Identification Platform API",
    description="Cross-platform Facial Matching & Identification System for Missing Persons",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DATA_DIR = os.path.join(BASE_DIR, "data")
SDK_DIR = os.path.join(BASE_DIR, "sdk")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(SDK_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "data"), exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")
app.mount("/sdk", StaticFiles(directory=SDK_DIR), name="sdk")

# Request Models
class SearchPayload(BaseModel):
    image: str
    top_k: Optional[int] = 5
    threshold: Optional[float] = 0.30

class RegisterMissingPayload(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = "Unknown"
    missing_since: Optional[str] = "Recently"
    last_seen_location: str
    contact_number: str
    notes: Optional[str] = ""
    image: str

class SightingPayload(BaseModel):
    case_id: str
    location: str
    notes: str
    reporter_contact: str
    image: Optional[str] = None

class StatusUpdatePayload(BaseModel):
    status: str # "Missing" or "Found"

@app.get("/")
async def get_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"message": "Missing Persons AI API online."})

@app.get("/api/health")
async def health_check():
    all_cases = db_inst.get_all_cases()
    active_missing = len([c for c in all_cases if c.get("status") == "Missing"])
    found_cases = len([c for c in all_cases if c.get("status") == "Found"])
    return {
        "status": "online",
        "deepface_available": check_deepface_available(),
        "model_name": engine_inst.model_name,
        "total_cases": len(all_cases),
        "active_missing": active_missing,
        "found_cases": found_cases
    }

@app.post("/api/missing/search")
async def search_missing(payload: SearchPayload):
    try:
        results = engine_inst.search_missing_candidates(
            img_input=payload.image,
            top_k=payload.top_k or 5,
            threshold=payload.threshold or 0.30
        )
        return {
            "success": True,
            "faces_detected": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/missing/register")
async def register_missing(payload: RegisterMissingPayload):
    try:
        if not payload.name or not payload.name.strip():
            raise HTTPException(status_code=400, detail="Missing person name is required.")
        if not payload.last_seen_location or not payload.last_seen_location.strip():
            raise HTTPException(status_code=400, detail="Last seen location is required.")
        if not payload.contact_number or not payload.contact_number.strip():
            raise HTTPException(status_code=400, detail="Emergency contact number is required.")

        img_np = engine_inst.decode_image(payload.image)
        faces = engine_inst.detect_faces(img_np)

        primary_bbox = faces[0] if faces else None
        embedding = engine_inst.extract_embedding(img_np, primary_bbox)

        if "," in payload.image:
            raw_base64 = payload.image.split(",")[1]
        else:
            raw_base64 = payload.image
        img_bytes = base64.b64decode(raw_base64)

        new_case = db_inst.enroll_missing_person(
            name=payload.name,
            age=payload.age,
            gender=payload.gender,
            missing_since=payload.missing_since,
            last_seen_location=payload.last_seen_location,
            contact_number=payload.contact_number,
            notes=payload.notes,
            img_bytes=img_bytes,
            embedding=embedding
        )

        return {
            "success": True,
            "message": f"Successfully published missing person case for '{payload.name}'.",
            "case": new_case
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@app.get("/api/missing/cases")
async def list_cases(status: Optional[str] = "all", q: Optional[str] = None):
    cases = db_inst.get_all_cases(status_filter=status, query=q)
    return {
        "success": True,
        "count": len(cases),
        "cases": cases
    }

@app.get("/api/missing/cases/{case_id}")
async def get_case_details(case_id: str):
    case = db_inst.get_case_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case ID not found")
    return {
        "success": True,
        "case": case
    }

@app.put("/api/missing/cases/{case_id}/status")
async def update_status(case_id: str, payload: StatusUpdatePayload):
    updated = db_inst.update_case_status(case_id, payload.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Case ID not found")
    return {
        "success": True,
        "message": f"Updated case '{case_id}' status to '{payload.status}'",
        "case": updated
    }

@app.post("/api/missing/sighting")
async def report_sighting(payload: SightingPayload):
    try:
        img_bytes = None
        if payload.image:
            img_data = payload.image.split(",")[1] if "," in payload.image else payload.image
            img_bytes = base64.b64decode(img_data)

        sighting = db_inst.add_sighting_report(
            case_id=payload.case_id,
            location=payload.location,
            notes=payload.notes,
            reporter_contact=payload.reporter_contact,
            img_bytes=img_bytes
        )

        if not sighting:
            raise HTTPException(status_code=404, detail="Missing person case ID not found")

        return {
            "success": True,
            "message": "Sighting report submitted successfully!",
            "sighting": sighting
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/missing/cases/{case_id}")
async def delete_case(case_id: str):
    deleted = db_inst.delete_case(case_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Case ID not found")
    return {
        "success": True,
        "message": f"Case '{case_id}' removed from system."
    }

@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("  MISSING PERSONS AI FINDER SERVER STARTED SUCCESSFULLY!")
    print("  Open in your web browser: http://localhost:8000")
    print("  Alternative URL:          http://127.0.0.1:8000")
    print("=" * 60)
    engine_inst.warm_up()

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
