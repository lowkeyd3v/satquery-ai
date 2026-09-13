"""
main.py
--------------------------------------------------------------------------
SatQuery AI | SIH26167 | ISRO
--------------------------------------------------------------------------
FastAPI application entrypoint.

Run with:
    uvicorn backend.main:app --reload

Then open http://127.0.0.1:8000 in a browser.
"""

from __future__ import annotations

import os
import sys
import uuid
import shutil
import logging
import tempfile
from pathlib import Path
from typing import Optional

# Ensure this file's own directory (backend/) is on sys.path so that the
# sibling modules `inference` and `spatial_data` can always be imported with
# plain absolute imports, regardless of whether this app is launched as
# `uvicorn backend.main:app` from the project root, or as `uvicorn main:app`
# from inside the backend/ directory itself.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from inference import engine

# Temp directory for uploaded satellite tiles (cleaned up per-request)
_UPLOAD_TEMP_DIR = Path(tempfile.gettempdir()) / "satquery_uploads"
_UPLOAD_TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Allowed image MIME types judges may upload
_ALLOWED_MIME = {
    "image/png", "image/jpeg", "image/tiff", "image/geotiff",
    "image/x-tiff", "image/jpg", "application/octet-stream",
}

logger = logging.getLogger("satquery.main")
logging.basicConfig(level=logging.INFO)

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="SatQuery AI",
    description=(
        "An Interactive Vision-Language Assistant for Multimodal Remote "
        "Sensing Image Analysis through Text Queries. "
        "Built for Smart India Hackathon 2026 — Problem Statement SIH26167, "
        "Indian Space Research Organisation (ISRO)."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — permissive for hackathon/demo purposes. Restrict origins in
# production deployments.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------
class QueryRequest(BaseModel):
    query: str = Field(
        ..., min_length=1, max_length=500,
        description="Natural language query, e.g. 'Highlight flooded regions in this tile'.",
    )
    scenario_id: Optional[str] = Field(
        default=None,
        description="Optional explicit scenario override: 'flood' | 'sikkim_flood' | 'joshimath' | 'landslide' | 'manipur_landslide' | 'urban' | 'water' | 'fire' | 'agriculture'.",
    )
    image_path: Optional[str] = Field(
        default=None,
        description="Optional path to a raster tile for real-mode inference.",
    )


class QueryResponse(BaseModel):
    success: bool
    mode: str
    scenario_id: str
    matched_label: str
    query_confidence: float
    processing_time_ms: float
    message: str
    geojson: dict


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.get("/api/v1/health", tags=["system"])
def health_check():
    """Basic health and inference-engine status check."""
    return {
        "status": "ok",
        "service": "SatQuery AI",
        "problem_statement": "SIH26167",
        "engine_status": engine.status(),
    }


@app.get("/api/v1/scenarios", tags=["scenarios"])
def get_scenarios():
    """
    Return the list of preset scenarios ('Detect Floods',
    'Monitor Water Bodies', 'Track Urban Sprawl') for the frontend's
    quick-action buttons.
    """
    return {"scenarios": engine.get_presets()}


@app.get("/api/v1/search/location", tags=["location"])
def search_location(q: str):
    """
    Geocode and retrieve bounding box & live Sentinel-2 metadata for any
    city or place worldwide using OpenStreetMap Nominatim and Element84 STAC.
    """
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query string too short.")
    try:
        from dynamic_resolver import resolve_location, fetch_sentinel_stac
    except ImportError:
        from backend.dynamic_resolver import resolve_location, fetch_sentinel_stac

    loc = resolve_location(q)
    if not loc:
        raise HTTPException(status_code=404, detail=f"Location '{q}' not found.")

    stac = fetch_sentinel_stac(loc["bbox"])
    return {
        "location": loc,
        "stac": stac,
    }


@app.post("/api/v1/query", response_model=QueryResponse, tags=["inference"])
def submit_query(request: QueryRequest):
    """
    Main inference endpoint. Accepts a natural-language query (and an
    optional explicit scenario override / raster path), runs it through
    the SatQueryEngine, and returns a GeoJSON FeatureCollection along
    with confidence and timing metadata.
    """
    query_text = request.query.strip()
    if not query_text:
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")

    if request.scenario_id:
        # Explicit scenario override (used by the preset buttons in the UI)
        try:
            from backend.spatial_data import get_scenario_geojson, SCENARIO_REGISTRY
        except ImportError:
            from spatial_data import get_scenario_geojson, SCENARIO_REGISTRY

        if request.scenario_id not in SCENARIO_REGISTRY:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid scenario_id. Must be one of {sorted(SCENARIO_REGISTRY.keys())}.",
            )

        # Safety check: if user query specifically targets a different location than the preset template
        # (e.g. 'Water bodies in gorakhpur' with scenario_id 'water'), do not hijack with the Chilika preset!
        preset_template = SCENARIO_REGISTRY.get(request.scenario_id, {})
        preset_region = (preset_template.get("metadata", {}).get("region", "")).lower()

        loc_token = None
        try:
            from backend.dynamic_resolver import extract_location_token
            loc_token = extract_location_token(query_text)
        except ImportError:
            try:
                from dynamic_resolver import extract_location_token
                loc_token = extract_location_token(query_text)
            except ImportError:
                pass

        location_conflict = bool(
            loc_token
            and loc_token.lower() not in preset_region
            and loc_token.lower() not in request.scenario_id.lower()
        )

        if not location_conflict:
            import time

            start = time.perf_counter()
            geojson = get_scenario_geojson(request.scenario_id)
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

            # Compute practical scenario confidence as the mean of detected feature confidences
            features = geojson.get("features", [])
            if features:
                conf_scores = [f.get("properties", {}).get("confidence", 0.88) for f in features]
                calculated_conf = round(sum(conf_scores) / len(conf_scores), 2)
            else:
                calculated_conf = 0.88

            return QueryResponse(
                success=True,
                mode="calibrated",
                scenario_id=request.scenario_id,
                matched_label=request.scenario_id,
                query_confidence=calculated_conf,
                processing_time_ms=elapsed_ms,
                message=f"Preset scenario '{request.scenario_id}' loaded directly from calibrated spatial engine.",
                geojson=geojson,
            )

    result = engine.run_inference(query_text, image_path=request.image_path)

    return QueryResponse(
        success=True,
        mode=result.mode,
        scenario_id=result.scenario_id,
        matched_label=result.matched_label,
        query_confidence=result.query_confidence,
        processing_time_ms=result.processing_time_ms,
        message=result.message,
        geojson=result.geojson,
    )


@app.post("/api/v1/upload-query", response_model=QueryResponse, tags=["inference"])
async def upload_and_query(
    query: str = Form(..., min_length=1, max_length=500,
                      description="Natural language query about the uploaded satellite tile."),
    file: UploadFile = File(..., description="Satellite image tile — PNG, JPEG, or GeoTIFF."),
):
    """
    Upload a satellite image tile and run a natural-language query against it.

    Accepts ``multipart/form-data`` with two fields:

    * **query** – plain English, e.g. *"Detect flooded regions"*
    * **file**  – a raster image (PNG / JPEG / GeoTIFF)

    The image is saved to a temporary file, passed to the SatQueryEngine
    (real VLM pipeline when ``SATQUERY_REAL_MODE=1``, otherwise the
    calibrated spatial engine), and deleted immediately after inference.
    """
    # ── Validate file type ──────────────────────────────────────────
    content_type = (file.content_type or "").lower()
    filename_lower = (file.filename or "").lower()
    is_image_ext = any(filename_lower.endswith(ext)
                       for ext in (".png", ".jpg", ".jpeg", ".tif", ".tiff"))
    if content_type not in _ALLOWED_MIME and not is_image_ext:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                "Please upload a PNG, JPEG, or GeoTIFF satellite image."
            ),
        )

    # ── Validate file size (max 50 MB for demo) ─────────────────────
    MAX_BYTES = 50 * 1024 * 1024  # 50 MB
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(contents) // (1024*1024)} MB). Maximum is 50 MB.",
        )

    # ── Save to temp file ───────────────────────────────────────────
    suffix = Path(file.filename or "upload.png").suffix or ".png"
    tmp_path = _UPLOAD_TEMP_DIR / f"{uuid.uuid4().hex}{suffix}"
    try:
        tmp_path.write_bytes(contents)
        logger.info("Saved uploaded tile to %s (%d bytes)", tmp_path, len(contents))

        # ── Run inference ───────────────────────────────────────────
        query_text = query.strip()
        result = engine.run_inference(query_text, image_path=str(tmp_path))

        return QueryResponse(
            success=True,
            mode=result.mode,
            scenario_id=result.scenario_id,
            matched_label=result.matched_label,
            query_confidence=result.query_confidence,
            processing_time_ms=result.processing_time_ms,
            message=f"[Image Upload] {result.message}",
            geojson=result.geojson,
        )

    finally:
        # Always clean up the temp file, even on error
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass


@app.get("/api/v1/temporal/{scenario_id}", tags=["temporal"])
def get_temporal_snapshots(scenario_id: str):
    """
    Return 3 sequential GeoJSON snapshots (T+0, T+mid, T+peak) showing
    the temporal progression of a detected scenario.
    Used by the frontend temporal animation player.
    """
    try:
        from backend.spatial_data import get_scenario_temporal, SCENARIO_REGISTRY
    except ImportError:
        from spatial_data import get_scenario_temporal, SCENARIO_REGISTRY

    if scenario_id not in SCENARIO_REGISTRY:
        raise HTTPException(
            status_code=404,
            detail=f"No temporal data available for scenario '{scenario_id}'.",
        )

    return {
        "scenario_id": scenario_id,
        "total_steps": 3,
        "snapshots": get_scenario_temporal(scenario_id),
    }


# ---------------------------------------------------------------------------
# Static frontend serving
# ---------------------------------------------------------------------------
# Serve individual static assets (styles.css, app.js) under /static/*
if FRONTEND_DIR.exists():
    app.mount(
        "/static",
        StaticFiles(directory=str(FRONTEND_DIR)),
        name="static",
    )


@app.get("/", tags=["frontend"])
def serve_index():
    """Serve the single-page dashboard at the application root."""
    index_path = FRONTEND_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Frontend not found. Ensure frontend/index.html exists.",
        )
    return FileResponse(str(index_path))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
