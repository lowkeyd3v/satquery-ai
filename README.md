# 🛰️ SatQuery AI

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
| **Operational Mode** | Dual-Mode (Real VLM / Segmenter + Deterministic Spatial Fallback) |

---

## 1. Overview & Operational Need

SatQuery AI bridges the divide between raw Earth Observation (EO) satellite imagery and frontline operational decision-making. Non-GIS specialists, field coordinators, and emergency response teams can submit plain natural-language requests &mdash; such as *"Highlight flooded regions in Assam"* or *"Detect active wildfire fronts and burn scars"* &mdash; and immediately receive georeferenced vector polygons rendered over satellite imagery, complete with area quantification, practical confidence scores, and actionable tactical directives.

### Strategic Use-Cases for ISRO & Partner Agencies

1. **Disaster Management Support (DMSP / NDRF / SDMA):**
   Rapid delineation of riverine floodplains and breached embankments (e.g., Brahmaputra Basin, Assam) using cloud-penetrating Synthetic Aperture Radar (SAR) imagery to accelerate rescue logistics.
2. **Urban Planning & Municipal Governance (MoHUA / AMRUT / Smart Cities):**
   Automated tracking of unplanned peri-urban sprawl and concrete built-up growth (e.g., Bengaluru Metropolitan Region) for zoning compliance and infrastructure planning.
3. **Water Resource Assessment (CWC / State Irrigation Depts):**
   Continuous monitoring of open water spread, lagoon salinity dynamics, and wetland sanctuaries (e.g., Chilika Lake, Odisha).
4. **Forestry & Wildfire Response (FSI / Forest Departments):**
   Thermal anomaly detection and post-fire burn scar mapping (e.g., Similipal Biosphere Reserve) to guide containment and soil erosion mitigation.
5. **Agricultural Monitoring & Drought Relief (PMFBY / Ministry of Agriculture):**
   Vegetation Condition Index (VCI) tracking and farm pond depletion analysis (e.g., Vidarbha, Maharashtra) for targeted drought relief distribution.

---

## 2. System Architecture

```
                          ┌────────────────────────────────────────────┐
                          │         FRONTEND (Edge CDN / Browser)      │
                          │  public/ (Vercel CDN) & frontend/ (Local)  │
                          │  • Leaflet.js interactive satellite map    │
                          │  • Query console + 5 preset scenario chips │
                          │  • 3-Step temporal progression player      │
                          │  • Tactical action guidance & sensor specs │
                          │  • Query history drawer with quick replay  │
                          │  • Instant workspace reset via brand click │
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
                          │     ┌───────────┴────────────┐             │
                          │     ▼                        ▼             │
                          │ REAL MODE                MOCK / FALLBACK   │
                          │ (SATQUERY_REAL_MODE=1    (Default & Edge)  │
                          │  + GPU weights loaded)                     │
                          │     │                        │             │
                          │     ▼                        ▼             │
                          │ Vision-Language Model    backend/mock_data │
                          │ (RemoteCLIP / Qwen2-VL)  Curated GeoJSON:  │
                          │ → Grounded phrase        • Assam Floods    │
                          │     │                    • Bengaluru Sprawl│
                          │     ▼                    • Chilika Lagoon  │
                          │ Open-Vocabulary          • Similipal Fire  │
                          │ Segmenter (Grounding     • Vidarbha Drought│
                          │ DINO + SAM 2)                              │
                          │ → Pixel segmentation                       │
                          │     │                                      │
                          │     ▼                                      │
                          │ Rasterio Affine Transform                  │
                          │ (Pixel [u,v] → WGS84 [lon,lat])            │
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

### Geospatial Affine Transformation

In full inference mode, pixel mask contours $(u, v)$ output by SAM 2 are mapped to geographic coordinates $(\text{lon}, \text{lat})$ using the raster's 6-parameter affine transformation matrix:

```
┌          ┐   ┌             ┐ ┌   ┐
│  X_geo   │   │  a   b   c  │ │ u │
│  Y_geo   │ = │  d   e   f  │ │ v │
│    1     │   │  0   0   1  │ │ 1 │
└          ┘   └             ┘ └   ┘
```

$$X_{\text{geo}} = a \cdot u + b \cdot v + c$$

$$Y_{\text{geo}} = d \cdot u + e \cdot v + f$$

Where:
- $c, f$ = Top-left origin coordinates $(X_{\text{origin}}, Y_{\text{origin}})$
- $a, e$ = Pixel width and height (Ground Sampling Distance / GSD)
- $b, d$ = Rotation and shear coefficients ($0$ for standard north-up rasters)
- $u, v$ = Mask pixel column and row indices
- Coordinates are projected into WGS84 (`EPSG:4326`) GeoJSON standard geometry.

---

## 3. Tech Stack

- **Backend & API:** Python 3.10+, FastAPI, Uvicorn, Starlette, Pydantic v2
- **Cloud Infrastructure & Serverless:** Vercel Python Runtime, Vercel Edge CDN, custom `VercelPathFixMiddleware`
- **Geospatial & Vector Processing:** Shapely, PyProj, GeoJSON, Rasterio
- **Vision-Language & Deep Learning (Real-Mode):** HuggingFace Transformers, PyTorch, OpenCLIP, Qwen2-VL, Grounding DINO, SAM 2 (Segment Anything 2)
- **Frontend & Mapping:** HTML5, CSS3 (ISRO Mission Control dark theme, JetBrains Mono font), Vanilla JavaScript (ES2020+), Leaflet.js
- **Satellite Basemaps:** Esri World Imagery (High-Resolution Satellite Operations) + CARTO Voyager Reference Labels

---

## 4. Dual Requirements Architecture

To optimize for both lightweight serverless cloud deployments and high-performance local GPU workstations, dependencies are cleanly bifurcated:

| File | Target Environment | Footprint | Included Packages |
|---|---|---|---|
| **`requirements.txt`** | **Production & Vercel Serverless** | **~25 MB** | FastAPI, Uvicorn, Pydantic, HTTPX, Shapely, PyProj, GeoJSON |
| **`requirements-gpu.txt`** | **Local Workstation / GPU Cluster** | **~2.5 GB** | PyTorch, Torchvision, Transformers, OpenCLIP, Rasterio, SAM 2 |

---

## 5. Installation & Setup

### Option A: Local Development (Standard / Fast Setup)

Run the full platform locally with lightweight dependencies:

```bash
# 1. Clone repository
git clone https://github.com/lowkeyd3v/satquery-ai.git
cd satquery-ai

# 2. Create and activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
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

*Note: If GPU weights cannot be fetched or VRAM is exhausted, the engine automatically falls back to deterministic geospatial generation without disrupting API uptime.*

### Option C: Live Production (Vercel)

The live application is hosted at:
* **App URL:** [https://satquery-ai-sage.vercel.app](https://satquery-ai-sage.vercel.app)
* **API Documentation:** [https://satquery-ai-sage.vercel.app/docs](https://satquery-ai-sage.vercel.app/docs)

Deploying your own fork to Vercel requires zero build configuration &mdash; simply connect the repository to Vercel; `vercel.json` and `api/index.py` handle all serverless routing automatically.

---

## 6. Key Features & Operational Capabilities

### 1. Natural Language Querying
Submit unconstrained operational queries such as:
* *"Highlight flooded regions in Assam along the Brahmaputra"*
* *"Track urban sprawl and concrete expansion in Bengaluru"*
* *"Monitor water bodies and shoreline dynamics in Chilika Lake"*
* *"Detect active wildfire fronts and burn scars in Similipal"*
* *"Identify drought affected zones and depleted farm ponds in Vidarbha"*

### 2. Practical Confidence Scoring
Confidence scores are calculated based on sensor signal-to-noise ratio, spatial feature clarity, and spectral index thresholds (typically **86% &ndash; 94%**) rather than arbitrary 99%+ claims, giving operational commanders a realistic metric for risk assessment.

### 3. Interactive 3-Step Temporal Progression
For every scenario, inspect the temporal evolution across three distinct operational phases:
* **Step 1: Baseline / Detection** (Initial anomaly identified)
* **Step 2: Spread / Growth** (Active propagation)
* **Step 3: Peak / Post-Event** (Maximum extent / burn scar / inundation)
Equipped with Play, Pause, Step Next, and Step Prev controls.

### 4. Query History & Instant Workspace Reset
* **History Drawer:** Maintains a session log of submitted queries with timestamps and scenario tags; click any past query to replay it immediately. Includes a single-click **"Clear History"** action.
* **Instant Workspace Reset:** Click the top-left **"SatQuery AI"** brand header to instantly reset active layers, restore the map to the India-wide satellite view, clear inputs, and reset metrics without disruptive alerts.

### 5. Tactical Action Cards & Mission Reports
Every query generates:
* Total affected area in $\text{km}^2$
* Severity rating (`Critical`, `High`, `Moderate`)
* Sensor provenance (e.g., `Sentinel-1 C-SAR / RISAT-1A`)
* Specific operational guidance (e.g., *"Dispatch NDRF Boat Teams to Majuli Sector 3; prioritize medical evacuation"*).

### 6. Standard Vector Export
Export delineated polygons directly as `.geojson` for seamless drag-and-drop import into **QGIS**, **ArcGIS**, or **ISRO Bhuvan**.

---

## 7. API Reference

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
curl -X POST https://satquery-ai-sage.vercel.app/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Highlight flooded regions along the river"}'
```

### Sample Response Payload

```json
{
  "success": true,
  "mode": "mock",
  "scenario_id": "flood",
  "matched_label": "flood",
  "query_confidence": 0.89,
  "processing_time_ms": 18.4,
  "message": "Served from mock inference fallback.",
  "geojson": {
    "type": "FeatureCollection",
    "name": "assam_flood_zones",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "id": "flood_001",
          "label": "Severe Inundation",
          "confidence": 0.91,
          "area_sqkm": 48.2,
          "severity": "Critical",
          "sensor": "Sentinel-1 C-SAR / RISAT-1A",
          "resolution": "10m SAR (Cloud Penetrating)",
          "description": "Severe riverine inundation detected along the Brahmaputra floodplain near Majuli island.",
          "action": "Dispatch NDRF Boat Teams to Majuli Sector 3; prioritize medical evacuation.",
          "color": "#ff1744"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [94.12, 26.94],
              [94.165, 26.962],
              [94.215, 26.958],
              [94.248, 26.985],
              [94.225, 27.028],
              [94.175, 27.035],
              [94.132, 27.008],
              [94.108, 26.965],
              [94.12, 26.94]
            ]
          ]
        }
      }
    ],
    "metadata": {
      "region": "Assam, Brahmaputra Valley, India",
      "sensor": "Sentinel-1 SAR / RISAT-1A (simulated)",
      "scenario": "flood",
      "center": [26.95, 94.2],
      "zoom": 8
    }
  }
}
```

---

## 8. Project Structure

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
│   └── mock_data.py          # Curated GeoJSON scenarios, contours & temporal progression
├── frontend/                 # Local source frontend
│   ├── index.html            # Dashboard markup and control panels
│   ├── styles.css            # Dark theme styles, responsive layout, animations
│   └── app.js                # Map engine, Leaflet handlers, history & temporal animation
└── public/                   # Production CDN static assets for Vercel
    ├── index.html            # Edge CDN landing page
    └── static/
        ├── styles.css        # CDN stylesheet
        └── app.js            # CDN client script
```

---

## 9. Key Architectural & Scientific Highlights

1. **Decoupled Reasoning & Segmentation:** Semantic interpretation (RemoteCLIP / Qwen2-VL) is separated from geometric contour extraction (Grounding DINO + SAM 2), avoiding hallucinated boundaries.
2. **Deterministic Fallback Pipeline:** Zero-downtime architecture ensures that if GPU memory limits or network timeouts occur, operational decision-makers still receive calibrated geospatial outputs.
3. **Sensor Cross-Compatibility:** Supports optical (Cartosat, Resourcesat), thermal infrared (Oceansat-3, MODIS), and Synthetic Aperture Radar (RISAT-1A, Sentinel-1) modalities.
4. **Empirical Ground Truth Anchoring:** Scenarios reference Copernicus Emergency Management Service (**EMSR586**), NASA FIRMS, JRC Global Surface Water, and European Commission GHSL benchmarks. See [`DATASETS.md`](./DATASETS.md) for full indices ($\sigma^0\ \text{SAR}$, $\text{NDBI}$, $\text{MNDWI}$, $\Delta\text{NBR}$, $\text{VCI}$).
5. **Direct GIS Interoperability:** All outputs strictly conform to the `EPSG:4326` WGS84 GeoJSON standard for seamless ingestion into national command centers and ISRO Bhuvan.

---

## 10. Post-Hackathon Roadmap

- [ ] Direct ingestion hooks for ISRO Bhuvan & MOSDAC Web Map Services (WMS/WFS)
- [ ] Bi-temporal change detection queries (*"Compare water spread between June 2024 and September 2024"*)
- [ ] Edge model quantization (TensorRT-LLM / ONNX) for deployment on UAV ground stations
- [ ] Multi-polygon spatial queries (*"Show all flooded schools and hospital evacuation routes"*)
- [ ] Direct export to Shapefile (`.shp`), KML, and GeoPackage (`.gpkg`) formats

---

## 11. License & Attribution

Developed for **Smart India Hackathon 2026** under Problem Statement **SIH26167** in collaboration with the **Indian Space Research Organisation (ISRO)**. Designed for mission evaluation, authorized research, and operational prototyping.

