# 🛰️ SatQuery AI

**An Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis through Text Queries**

| | |
|---|---|
| **Problem Statement ID** | SIH26167 |
| **Ministry / Nodal Agency** | Indian Space Research Organisation (ISRO) |
| **Category** | Software |
| **Theme** | Space Technology |

---

## 1. Overview

SatQuery AI lets an analyst type a plain-English request — *"Highlight flooded regions in this tile"* — and instantly see the answer rendered as spatial polygons on an interactive satellite map. It bridges the gap between raw remote-sensing imagery and actionable geospatial insight, removing the need for manual GIS interpretation or hand-coded classification rules for every new query.

### Why this matters for ISRO

- **Disaster response** — Flood extent mapping over the Brahmaputra basin in near real time accelerates NDRF/SDRF deployment decisions.
- **Urban planning** — Automated detection of unplanned urban sprawl (e.g. around Bengaluru) supports AMRUT / Smart Cities Mission monitoring.
- **Water resource management** — Continuous water-spread monitoring of lagoons and reservoirs (e.g. Chilika Lake) feeds into CWC and state irrigation department dashboards.
- **Scalability** — A single natural-language interface generalizes across sensors (Cartosat, Resourcesat, RISAT, Sentinel) and use-cases without retraining a dedicated classifier per task.

---

## 2. Technical Architecture

```
                         ┌────────────────────────────────────────────┐
                         │              FRONTEND (Browser)              │
                         │  index.html + styles.css + app.js            │
                         │  • Leaflet.js interactive map                │
                         │  • Query console + preset scenario buttons   │
                         │  • Live metrics panel + query history log    │
                         └───────────────────┬──────────────────────────┘
                                             │ REST (JSON over HTTPS)
                                             ▼
                         ┌────────────────────────────────────────────┐
                         │            BACKEND — FastAPI                 │
                         │  backend/main.py                             │
                         │  • POST /api/v1/query                        │
                         │  • GET  /api/v1/scenarios                    │
                         │  • GET  /api/v1/health                       │
                         │  • Static frontend hosting                   │
                         └───────────────────┬──────────────────────────┘
                                             │
                                             ▼
                         ┌────────────────────────────────────────────┐
                         │        SatQueryEngine (backend/inference.py) │
                         │                                               │
                         │   Query Text                                  │
                         │       │                                       │
                         │       ▼                                       │
                         │   ┌─────────────────────┐                     │
                         │   │ Query Classification │  (keyword / VLM)   │
                         │   └──────────┬──────────┘                     │
                         │              │                                │
                         │     ┌────────┴─────────┐                     │
                         │     ▼                  ▼                     │
                         │ REAL MODE          MOCK MODE                 │
                         │ (if enabled &      (default / fallback)      │
                         │  weights loaded)                              │
                         │     │                  │                     │
                         │     ▼                  ▼                     │
                         │ Vision-Language   backend/mock_data.py       │
                         │ Model (RemoteCLIP /  curated GeoJSON for:    │
                         │ Qwen2-VL) → grounded  • Assam Floods          │
                         │ phrase                • Bengaluru Urban       │
                         │     │                    Sprawl               │
                         │     ▼                  • Chilika Lake Water  │
                         │ Grounding DINO +                              │
                         │ SAM 2 → pixel masks                           │
                         │     │                                        │
                         │     ▼                                        │
                         │ rasterio affine transform                    │
                         │ → geographic polygons (GeoJSON)               │
                         └───────────────────┬──────────────────────────┘
                                             │
                                             ▼
                              GeoJSON FeatureCollection
                        (label, confidence, area_sqkm, geometry)
                                             │
                                             ▼
                         Rendered as animated, color-coded polygons
                              on the Leaflet map in the browser
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| `frontend/index.html` | Page skeleton: side navigation, map container, query console, history log |
| `frontend/styles.css` | Dark-mode glassmorphism theme, scenario color coding |
| `frontend/app.js` | Leaflet map lifecycle, fetch calls, GeoJSON layer rendering, metrics/history UI |
| `backend/main.py` | FastAPI app, CORS, routing, static file serving |
| `backend/inference.py` | `SatQueryEngine` — dual-mode (real VLM / mock) inference orchestration |
| `backend/mock_data.py` | Hand-curated, realistic GeoJSON scenarios for demoable, GPU-free operation |

---

## 3. Tech Stack

- **Backend:** Python 3.10+, FastAPI, Uvicorn, Pydantic
- **Geospatial:** Rasterio, Shapely, PyProj, GeoJSON
- **Imaging:** Pillow, NumPy
- **AI / VLM (real-mode hook):** HuggingFace Transformers, PyTorch, OpenCLIP — designed to plug in RemoteCLIP or Qwen2-VL for language grounding, and Grounding DINO / SAM 2 for spatial segmentation
- **Frontend:** HTML5, CSS3 (glassmorphism, dark theme), vanilla JavaScript, Leaflet.js
- **Map tiles:** Esri World Imagery (satellite) + CARTO Voyager labels (OSM-compatible tile scheme)

---

## 4. Setup & Run

### Prerequisites
- Python 3.10 or higher
- pip
- (Optional, for real-mode inference) a CUDA-capable GPU with PyTorch GPU build installed

### Installation

```bash
# 1. Navigate into the project root
cd satquery-ai

# 2. Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the application (Mock Mode — works immediately, no GPU needed)
uvicorn backend.main:app --reload
```

Then open **http://127.0.0.1:8000** in your browser.

### Enabling Real Inference Mode (optional)

By default the system runs entirely in **Mock Mode**, returning curated GeoJSON so the full pipeline is demoable without any model weights. To attempt loading real Vision-Language + segmentation models:

```bash
export SATQUERY_REAL_MODE=1
export SATQUERY_VLM_MODEL="Qwen/Qwen2-VL-2B-Instruct"
export SATQUERY_SEGMENTATION_MODEL="IDEA-Research/grounding-dino-tiny"
uvicorn backend.main:app --reload
```

If model loading fails for any reason (no internet access to the HuggingFace Hub, insufficient VRAM, missing weights), `SatQueryEngine` automatically and transparently falls back to Mock Mode — the API and frontend continue to function without interruption.

### API Quick Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check + current engine status (real vs mock) |
| `GET` | `/api/v1/scenarios` | List of preset scenarios for the UI's quick-action buttons |
| `POST` | `/api/v1/query` | Submit a natural-language query, receive a GeoJSON result |

Example request:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Highlight flooded regions in this tile"}'
```

---

## 5. Project Structure

```
satquery-ai/
├── README.md
├── requirements.txt
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI app + routes + static serving
│   ├── inference.py         # SatQueryEngine (real + mock dual-mode)
│   └── mock_data.py         # Curated GeoJSON for 3 Indian scenarios
└── frontend/
    ├── index.html           # Dashboard layout
    ├── styles.css           # Dark glassmorphism theme
    └── app.js               # Map logic + API integration
```

---

## 6. Hackathon Presentation Tips

1. **Open with the problem, not the tech.** Lead with a 15-second story: *"During the 2024 Assam floods, disaster response teams needed flood extent maps within hours — not days. SatQuery AI turns a typed sentence into that map instantly."*
2. **Live-demo the three preset buttons first** (Detect Floods, Monitor Water Bodies, Track Urban Sprawl) — they are guaranteed to work offline and look polished, since they hit the mock pipeline deterministically.
3. **Then type a free-text query live** (e.g. *"Show me waterlogged areas"*) to prove the NLP classification layer generalizes beyond the buttons.
4. **Show the architecture diagram** (Section 2) when judges ask "how does this scale to real models?" — emphasize the dual-mode design: the exact same API contract works whether the backend is running curated data today or RemoteCLIP + SAM 2 in production tomorrow.
5. **Quantify area coverage and confidence** using the metrics panel — judges from ISRO will want to see numbers, not just pretty polygons.
6. **Mention the real-mode extension points explicitly:** RemoteCLIP/Qwen2-VL for language-grounded scene understanding, Grounding DINO for open-vocabulary detection, SAM 2 for pixel-accurate segmentation, and rasterio for converting pixel masks back into geographic coordinates via the tile's affine transform.
7. **Close with impact + roadmap:** near-term integration with Bhuvan/VEDAS tile services, multi-temporal change detection, and a mobile-first field version for on-ground disaster response teams.

---

## 7. Roadmap (Post-Hackathon)

- [ ] Integrate live Bhuvan / Sentinel Hub tile ingestion
- [ ] Replace keyword classifier with RemoteCLIP zero-shot text-image similarity
- [ ] Wire up Grounding DINO + SAM 2 for real pixel-level segmentation
- [ ] Add multi-temporal (before/after) change-detection queries
- [ ] User authentication + saved query workspaces for field teams
- [ ] Export detected regions as shapefiles / KML for GIS interoperability

---

## 8. License

Prototype developed for Smart India Hackathon 2026 (Problem Statement SIH26167). Intended for evaluation and further development in collaboration with ISRO.
