# SatQuery AI

**An Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis through Natural Language Queries**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel%20Production-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://satquery-ai-sage.vercel.app)
[![API Documentation](https://img.shields.io/badge/API%20Docs-Swagger%20UI-0288d1?style=for-the-badge&logo=swagger&logoColor=white)](https://satquery-ai-sage.vercel.app/docs)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776ab?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

| Parameter | Specification |
|---|---|
| **Problem Statement ID** | **SIH26167** |
| **Ministry / Nodal Agency** | **Indian Space Research Organisation (ISRO)** |
| **Category** | Software |
| **Theme** | Space Technology |
| **Live Production Deployment** | [https://satquery-ai-sage.vercel.app](https://satquery-ai-sage.vercel.app) |
| **Interactive API Documentation** | [https://satquery-ai-sage.vercel.app/docs](https://satquery-ai-sage.vercel.app/docs) |
| **Operational Modes** | Dual-Mode Engine (Neural VLM / Segmenter + Live Multi-API STAC/USGS/Overpass Resolver) |

---

## 1. Overview & Operational Need

SatQuery AI bridges the divide between raw Earth Observation (EO) satellite telemetry and frontline operational decision-making. Non-GIS specialists, disaster response commanders, and environmental planners can submit plain natural-language requests &mdash; such as *"Highlight flooded regions in Assam"*, *"Identify landslide scars in Wayanad"*, or *"Earthquakes in India"* &mdash; and immediately receive georeferenced vector polygons rendered over satellite imagery, complete with area quantification, practical confidence scores, telemetry breakdowns, and actionable tactical directives.

### Strategic Disaster & Geohazard Domains

1. **Riverine Inundation & Embankment Breaches (NDRF / SDMA / CWC):**
   Rapid delineation of riverine floodplains and breached dykes (e.g., Brahmaputra Basin, Assam; Kosi River, Bihar) using cloud-penetrating Synthetic Aperture Radar (SAR) imagery and Copernicus GloFAS river discharge telemetry.
2. **Catastrophic Landslides & Debris Flow (GSI / NDMA):**
   Mapping of steep crown failure scarps, high-velocity avalanche runout chutes, and deposition fans (e.g., Wayanad Landslide, Kerala) using ISRO Cartosat-3 sub-meter optical and Sentinel-1A DInSAR coherence tracking.
3. **Real-Time Earthquake & Seismic Hazards (USGS / National Center for Seismology):**
   Live dynamic ingestion of global seismic feeds plotting earthquake epicenters, Richter magnitudes, focal depths, and geodetic shake impact radii.
4. **Forestry & Wildfire Response (FSI / State Forest Departments):**
   Thermal anomaly hotspot detection and post-fire burn scar perimeter mapping (e.g., Similipal Biosphere Reserve, Odisha) using NASA VIIRS 375m and Sentinel-2 SWIR.
5. **Urban Planning & Built-Up Growth (MoHUA / Smart Cities):**
   Automated tracking of unplanned peri-urban sprawl and impervious surface fractions (e.g., Bengaluru Metropolitan Region) using Cartosat-3 and European Commission GHSL.
6. **Agricultural Drought & Moisture Stress (PMFBY / Ministry of Agriculture):**
   Vegetation Condition Index (VCI) tracking and farm pond moisture deficit analysis (e.g., Vidarbha, Maharashtra) to prioritize drought relief.
7. **Dynamic Water Resource Monitoring (Global):**
   On-demand extraction of lakes, rivers, reservoirs, and coastal lagoons worldwide (e.g., Ramgarh Tal, Dal Lake, Powai Lake) via real-time OpenStreetMap Overpass hydrography.

---

## 2. System Architecture

```
                          ┌────────────────────────────────────────────┐
                          │         FRONTEND (Edge CDN / Browser)      │
                          │  public/ (Vercel CDN) & frontend/ (Local)  │
                          │  • Leaflet.js interactive satellite map    │
                          │  • Query console + 5 preset scenario chips │
                          │  • Live NASA GIBS daily satellite toggle   │
                          │  • Light / Dark mode theme controller      │
                          │  • 3-Step temporal progression player      │
                          │  • Tactical action guidance & sensor specs │
                          │  • Interactive Provenance & AI Model Modal │
                          │  • GeoJSON vector export & API Docs link   │
                          └───────────────────┬────────────────────────┘
                                              │ REST (JSON over HTTP/HTTPS)
                                              ▼
                          ┌────────────────────────────────────────────┐
                          │            BACKEND — FastAPI               │
                          │  backend/main.py / api/index.py (Vercel)   │
                          │  • POST /api/v1/query                      │
                          │  • GET  /api/v1/scenarios                  │
                          │  • GET  /api/v1/health                     │
                          │  • GET  /api/v1/temporal/{scenario_id}     │
                          │  • GET  /docs & /openapi.json (Swagger UI) │
                          │  • VercelPathFixMiddleware (ASGI routing)  │
                          └───────────────────┬────────────────────────┘
                                              │
                                              ▼
                          ┌────────────────────────────────────────────┐
                          │        SatQueryEngine (backend/inference.py)│
                          │                                            │
                          │   Natural Language Query                   │
                          │       │                                    │
                          │       ▼                                    │
                          │   ┌───────────────────────────┐            │
                          │   │ NLP Semantic Classifier   │            │
                          │   └─────────────┬─────────────┘            │
                          │                 │                          │
                          │     ┌───────────┼────────────┐             │
                          │     ▼           ▼            ▼             │
                          │ DYNAMIC API   CALIBRATED   REAL VLM MODE   │
                          │ (Live Feeds)  (Benchmarks) (Local GPU)     │
                          │     │           │            │             │
                          │     ▼           ▼            ▼             │
                          │ dynamic_      spatial_     RemoteCLIP +    │
                          │ resolver.py   data.py      Grounding DINO  │
                          │               • Assam      + SAM 2         │
                          │ • OSM Overpass  Floods                     │
                          │ • USGS Quakes • Wayanad                    │
                          │ • AWS STAC      Landslides                 │
                          │ • GloFAS      • Bengaluru                  │
                          │   Hydro         Sprawl                     │
                          │               • Similipal                  │
                          │                 Wildfire                   │
                          │               • Vidarbha                   │
                          │                 Drought                    │
                          └───────────────────┬────────────────────────┘
                                              │
                                              ▼
                                GeoJSON FeatureCollection
                       (Geometry, Practical Confidence, Area km², Specs)
                                              │
                                              ▼
                          Rendered as interactive vector polygons
                             on Leaflet.js satellite basemap
```

---

## 3. Live External API Integrations

SatQuery AI connects to an ecosystem of real-time open Earth Observation and disaster monitoring APIs:

| External Service | Provider | Purpose | Endpoints / Specifications |
|---|---|---|---|
| **NASA GIBS** | NASA EOSDIS | Live Daily True-Color Satellite Imagery | WMTS / EPSG:3857 MODIS Terra & VIIRS TrueColor (`default/default`) with `maxNativeZoom: 9` |
| **USGS Earthquake API** | US Geological Survey | Real-time global seismic feeds & epicenters | `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` |
| **OpenStreetMap Overpass** | OpenStreetMap Foundation | High-precision dynamic global hydrography & water bodies | `https://overpass-api.de/api/interpreter` (QL: `natural=water`, `water=*`) |
| **OSM Nominatim** | OpenStreetMap Foundation | Global geocoding & administrative boundary resolution | `https://nominatim.openstreetmap.org/search` |
| **Earth Search STAC** | Element84 / AWS | Daily Sentinel-2 L2A scene granule metadata & cloud cover | `https://earth-search.aws.element84.com/v1` (Copernicus Sentinel-2 Collection) |
| **GloFAS Flood API** | Copernicus EMS / Open-Meteo | Real-time river discharge ($m^3/s$) & 7-day forecast trend | `https://flood-api.open-meteo.com/v1/flood` |

---

## 4. Operational Scenario Presets & Benchmarks

In addition to dynamic queries worldwide, SatQuery AI features five calibrated disaster and environmental benchmarks based on official satellite activations:

| Scenario | Location | Sensors | Benchmark Source | Core Algorithm / Model |
|---|---|---|---|---|
| **Detect Floods** | Brahmaputra Basin, Assam | Sentinel-1A C-SAR (10m) / RISAT-1A | Copernicus EMS Activation `EMSR586` | Bitemporal SAR Backscatter Ratio ($\sigma^0\ 	ext{VV/VH}$) + Otsu Thresholding |
| **Detect Landslides** | Wayanad, Kerala | Cartosat-3 (0.28m PAN) / Sentinel-1A SAR | ISRO NRSC DMS & GSI Geotechnical Report | Optical Differential Change Detection + InSAR Coherence ($\gamma < 0.25$) + DEM Slope (>34°) |
| **Track Urban Sprawl** | Bengaluru Metropolitan | Cartosat-3 Optical (0.28m PAN / 1.12m MX) | European Commission GHSL Settlement Grid | Normalized Difference Built-Up Index ($	ext{NDBI}$) + Impervious Surface Fraction |
| **Forest Fire Hotspots** | Similipal National Park, Odisha | NASA VIIRS (375m) / Sentinel-2 MSI (20m) | NASA FIRMS Active Fire Archive & FSI Van Agni | Thermal Anomaly ($4\mu	ext{m} / 11\mu	ext{m}$) + Differenced Normalized Burn Ratio ($	ext{dNBR} > 0.44$) |
| **Crop Drought Stress** | Vidarbha, Maharashtra | Resourcesat-2A AWiFS (56m) / MODIS (250m) | NASA LP DAAC MOD13A2 & ISRO Bhuvan | Vegetation Condition Index ($	ext{VCI} < 25\%$) + Normalized Difference Moisture Index ($	ext{NDMI}$) |

---

## 5. Tech Stack

- **Backend Framework:** Python 3.10+, FastAPI, Uvicorn, Starlette, Pydantic v2
- **Cloud Infrastructure & Serverless:** Vercel Python Runtime, Vercel Edge CDN, custom `VercelPathFixMiddleware`
- **Geospatial & Vector Processing:** Shapely, PyProj, GeoJSON, Rasterio
- **Vision-Language & Deep Learning (Real-Mode):** HuggingFace Transformers, PyTorch, OpenCLIP, Qwen2-VL, Grounding DINO, SAM 2 (Segment Anything 2)
- **Frontend & Mapping:** HTML5, CSS3 (Light/Dark themes, JetBrains Mono font), Vanilla JavaScript (ES2020+), Leaflet.js
- **Satellite Basemaps:** Esri World Imagery (High-Resolution Baseline) + CARTO Voyager Reference Labels + NASA EOSDIS GIBS Daily True-Color Layer

---

## 6. Installation & Setup

### Option A: Local Development (Standard / Fast Setup)

Run the full platform locally with lightweight dependencies:

```bash
# 1. Clone repository
git clone https://github.com/lowkeyd3v/satquery-ai.git
cd satquery-ai

# 2. Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scriptsctivate
# Linux/macOS:
source venv/bin/activate

# 3. Install lightweight production requirements
pip install -r requirements.txt

# 4. Start the FastAPI development server
uvicorn backend.main:app --reload
```

Then open **`http://127.0.0.1:8000`** in your browser.

### Option B: Enabling GPU Real VLM Mode (Optional)

If running on a machine equipped with an NVIDIA GPU (CUDA 12+, 8GB+ VRAM):

```bash
# Install GPU and vision-language dependencies
pip install -r requirements-gpu.txt

# Set environment flags
export SATQUERY_REAL_MODE=1
export SATQUERY_VLM_MODEL="Qwen/Qwen2-VL-2B-Instruct"
export SATQUERY_SEGMENTATION_MODEL="IDEA-Research/grounding-dino-tiny"

# Start the server
uvicorn backend.main:app --reload
```

*Note: If GPU weights cannot be fetched or VRAM is exhausted, the engine automatically falls back to deterministic multi-API geospatial generation without disrupting API uptime.*

### Option C: Live Production (Vercel)

The live application is hosted at:
* **App URL:** [https://satquery-ai-sage.vercel.app](https://satquery-ai-sage.vercel.app)
* **API Documentation:** [https://satquery-ai-sage.vercel.app/docs](https://satquery-ai-sage.vercel.app/docs)

Deploying your own fork to Vercel requires zero build configuration &mdash; simply connect the repository to Vercel; `vercel.json` and `api/index.py` handle all serverless routing automatically.

---

## 7. Key Features & User Interface

### 1. Natural Language Geospatial Querying
Submit unconstrained operational queries such as:
* *"Highlight flooded regions in Assam along the Brahmaputra"*
* *"Identify landslide scars and debris flow runout in Wayanad"*
* *"Earthquakes in India"*
* *"Water bodies in Gorakhpur"* or *"Ramgarh Tal"*
* *"Detect active wildfire fronts in Similipal"*
* *"Track urban sprawl in Bengaluru"*

### 2. Live NASA GIBS Daily Satellite Layer
Toggle daily true-color satellite imagery directly from the floating map pill. Leaflet smoothly overzooms level 9 imagery up to level 19 via `maxNativeZoom: 9`, providing recent global true-color coverage without tile clipping errors.

### 3. Light & Dark Mode Toggle
Switch instantly between the **ISRO Mission Control Dark Theme** and high-visibility **Daylight / Clean Light Theme** with seamless transitions, persisted in browser `localStorage`.

### 4. Interactive Provenance & AI Model Modal
Click **"View Source & AI Model Details"** on any query report to open a dedicated modal displaying:
* STAC granule scene ID and acquisition timestamp
* Optical / SAR sensor platform and ground sampling distance (GSD)
* Hydrological and seismic telemetry (river discharge $m^3/s$, focal depth km, Richter magnitude)
* Machine learning model architectures (RemoteCLIP, Grounding DINO, SAM 2, Otsu, DInSAR)
* Official data provider links (Copernicus, ISRO, NASA, USGS, OpenStreetMap)

### 5. Interactive 3-Step Temporal Progression
Inspect temporal evolution across three distinct operational phases:
* **Step 1: Baseline / Detection** (Initial anomaly identified)
* **Step 2: Spread / Growth** (Active propagation)
* **Step 3: Peak / Post-Event** (Maximum extent / burn scar / inundation)

### 6. Standard Vector Export
Export delineated polygons directly as `.geojson` for seamless drag-and-drop import into **QGIS**, **ArcGIS**, or **ISRO Bhuvan**.

---

## 8. API Reference

Interactive Swagger documentation is available at [`/docs`](https://satquery-ai-sage.vercel.app/docs).

### Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health status and inference engine diagnostics |
| `GET` | `/api/v1/scenarios` | List of supported preset scenarios, queries, and sensor sources |
| `POST` | `/api/v1/query` | Submit natural-language query; returns GeoJSON with spatial polygons |
| `GET` | `/api/v1/temporal/{scenario_id}` | Returns 3-step temporal GeoJSON snapshots (Detection → Spread → Peak) |
| `GET` | `/docs` | Interactive Swagger UI API documentation |
| `GET` | `/openapi.json` | Complete OpenAPI 3.1 specification schema |

### Sample POST `/api/v1/query` Request

```bash
curl -X POST https://satquery-ai-sage.vercel.app/api/v1/query   -H "Content-Type: application/json"   -d '{"query": "Earthquakes in India"}'
```

### Sample Response Payload

```json
{
  "success": true,
  "mode": "dynamic_api",
  "scenario_id": "earthquake",
  "matched_label": "Earthquakes — India",
  "query_confidence": 0.95,
  "processing_time_ms": 142.6,
  "message": "Resolved via live USGS Live Seismographic Network & Copernicus InSAR for India.",
  "geojson": {
    "type": "FeatureCollection",
    "name": "india_earthquake_seismic_assessment",
    "features": [
      {
        "type": "Feature",
        "id": "us7000tg4b",
        "properties": {
          "name": "M5.1 Seismic Event",
          "label": "M5.1 Earthquake Epicenter",
          "magnitude": 5.1,
          "depth_km": 10.0,
          "place": "115 km NE of Joshimath, India",
          "event_time": "2026-09-09 14:22 UTC",
          "scenario": "earthquake",
          "confidence": 0.96,
          "area_sqkm": 2042.8,
          "severity": "High",
          "sensor": "USGS Global Seismographic Network & Copernicus Sentinel-1A InSAR",
          "resolution": "Continuous Seismometric & 10m InSAR",
          "dataset": "USGS Real-Time Earthquake Feed & Copernicus InSAR",
          "methodology": "Waveform Moment Tensor Inversion + InSAR Surface Deformation Phase Mapping",
          "action": "Trigger automated advisory to Disaster Management Authorities; conduct rapid structural stability evaluation of bridges and dams along fault zone.",
          "color": "#ff1744"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [79.82, 30.85],
              [80.05, 30.98],
              [80.25, 30.82],
              [79.82, 30.85]
            ]
          ]
        }
      }
    ],
    "metadata": {
      "region": "India (Global)",
      "sensor": "USGS Global Seismographic Network & Copernicus Sentinel-1A InSAR",
      "scenario": "earthquake",
      "center": [22.97, 78.65],
      "zoom": 6,
      "dataset_source": "USGS Real-Time Earthquake Feed & Copernicus InSAR",
      "is_dynamic": true,
      "earthquake_count": 15,
      "max_magnitude": 5.1
    }
  }
}
```

---

## 9. Project Structure

```
satquery-ai/
├── README.md                 # Master project documentation
├── DATASETS.md               # Scientific dataset provenance, benchmarks & ground truth
├── requirements.txt          # Production & Vercel dependencies (~25MB)
├── requirements-gpu.txt      # GPU dependencies for real VLM / SAM 2 mode (~2.5GB)
├── vercel.json               # Vercel serverless routing & static asset rewrite rules
├── api/
│   └── index.py              # Vercel Serverless Function entrypoint + ASGI path middleware
├── backend/
│   ├── __init__.py           # Backend package initializer
│   ├── main.py               # FastAPI application, API endpoints & local static server
│   ├── inference.py          # SatQueryEngine: VLM pipeline & NLP semantic classifier
│   ├── dynamic_resolver.py   # Multi-API resolver (Overpass, USGS, GloFAS, STAC)
│   └── spatial_data.py       # Calibrated GeoJSON scenarios, contours & temporal progression
├── frontend/                 # Local source frontend
│   ├── index.html            # Dashboard markup and control panels
│   ├── styles.css            # Dark/Light theme styles, responsive layout, animations
│   └── app.js                # Map engine, Leaflet handlers, history & temporal animation
└── public/                   # Production CDN static assets for Vercel
    ├── index.html            # Edge CDN landing page
    └── static/
        ├── styles.css        # CDN stylesheet
        └── app.js            # CDN client script
```

---

## 10. License & Attribution

Developed for **Smart India Hackathon 2026** under Problem Statement **SIH26167** in collaboration with the **Indian Space Research Organisation (ISRO)**. Designed for mission evaluation, authorized research, and operational prototyping.
