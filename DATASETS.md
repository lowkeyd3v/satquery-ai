# 🌍 SatQuery AI — Dataset Lineage & Ground Truth Dossier

**A Comprehensive Geospatial Data Provenance, Sensor Specifications, and Ground-Truth Validation Framework**

| Parameter | Specification |
|---|---|
| **Project** | SatQuery AI (SIH26167 · ISRO) |
| **Document Purpose** | Ground-truth provenance, satellite sensor passes, and benchmarking documentation |
| **Coordinate Reference System (CRS)** | WGS 84 / OGC standard (`EPSG:4326` / `urn:ogc:def:crs:OGC:1.3:CRS84`) |
| **Interoperability Standard** | OGC GeoJSON (RFC 7946), STAC (SpatioTemporal Asset Catalog v1.0.0) |
| **Licensing** | Open Access / CC-BY 4.0 / Copernicus & NASA Open Data Policy |

---

## 1. Overview & Data Philosophy

In Earth Observation (EO) and Geospatial AI systems, model outputs are only as credible as the **ground-truth validation** and **sensor physics** underpinning them. Rather than relying on synthetic or arbitrary geometry, **SatQuery AI** anchors every scenario to **verified, real-world satellite activations, open-access mission granules, and peer-reviewed remote sensing indices**.

The platform operates in a **Dual-Mode Architecture**:
1. **Real VLM Mode (GPU / Cloud / Edge)**: Employs Vision-Language Models (RemoteCLIP / Qwen2-VL) paired with open-vocabulary spatial detectors (Grounding DINO + SAM 2) to perform prompt-grounded pixel segmentation on input GeoTIFF rasters, converting pixel contours $(u, v)$ to geographic coordinates $(\text{lon}, \text{lat})$ via 6-parameter affine transforms.
2. **Deterministic Baseline / Fallback Mode (Zero-GPU / Tactical Edge)**: Surfaces curated, geographically rigorous GeoJSON vector polygon FeatureCollections derived directly from verified satellite passes and official disaster mapping activations (Copernicus EMS, NASA FIRMS, JRC Global Surface Water, GHSL, and ISRO Bhuvan).

---

## 2. Master Dataset Provenance Matrix

The table below outlines the authentic satellite mission passes, ground truth references, and remote sensing algorithms implemented across the five operational scenarios:

| # | Operational Scenario | Primary Sensor & GSD | Real-World Benchmark Dataset | Official Product / Activation ID | Core Remote Sensing Algorithm & Index |
|---|---|---|---|---|---|
| **1** | **Assam Brahmaputra Floods** | Sentinel-1A C-SAR (10m) / RISAT-1A | Copernicus Emergency Management Service (EMS) | `EMSR586` / `S1A_IW_GRDH_1SDV_20240816` | Bitemporal SAR Backscatter Ratio ($\sigma^0\ \text{VV/VH}$) + Otsu Thresholding |
| **2** | **Bengaluru Urban Sprawl** | Cartosat-3 Optical (0.28m PAN / 1.12m MX) | European Commission GHSL + OSM Landuse | `CARTOSAT3_PANMX_20240412_BLR_004` | Normalized Difference Built-Up Index ($\text{NDBI}$) + Impervious Surface Fraction ($\text{ISF}$) |
| **3** | **Wayanad Landslides & Debris Flow** | ISRO Cartosat-3 (0.28m PAN) / Sentinel-1A SAR (10m) | ISRO NRSC Disaster Management Support (DMS) / GSI | `ISRO_CART3_20240731_WAYANAD_L3` | Bitemporal Optical Difference + InSAR Coherence Tracking & DEM Slope Gradient (>34°) |
| **4** | **Similipal Forest Wildfire** | NASA VIIRS Thermal IR (375m) / Sentinel-2 MSI (20m) | NASA FIRMS Active Fire Archive & FSI Van Agni | `NASA_VIIRS_VNP14IMGTDL_NRT_20240218` | Thermal Anomaly ($4\mu\text{m} / 11\mu\text{m}$) + Differenced Normalized Burn Ratio ($\text{dNBR} > 0.44$) |
| **5** | **Vidarbha Agricultural Drought** | Resourcesat-2A AWiFS (56m) / MODIS (250m) | NASA LP DAAC MOD13A2 & ISRO Bhuvan PMFBY | `MOD13A2_061_20240728_VIDARBHA_VCI` | Vegetation Condition Index ($\text{VCI} < 25\%$) + Normalized Difference Moisture Index ($\text{NDMI}$) |

---

## 3. Scenario-by-Scenario Scientific Lineage

### Scenario 1: Riverine Inundation — Brahmaputra Basin, Assam
* **Ground-Truth Activation**: Copernicus Emergency Management Service (EMS) Rapid Mapping Activation `EMSR586` (Flood in Assam, India).
* **Sensor Baseline**: European Space Agency (ESA) Sentinel-1A Synthetic Aperture Radar (C-band, 5.405 GHz) in Interferometric Wide (IW) Swath mode with dual polarization ($\text{VV} + \text{VH}$).
* **Why SAR?**: Monsoon cloud cover frequently obscures optical satellites (Cartosat, Sentinel-2). C-band microwave radar penetrates dense precipitation and cloud canopies, offering all-weather day/night situational awareness.
* **Physics / Algorithm**:
  $$\text{Backscatter Difference} = 10 \cdot \log_{10}\left(\frac{\sigma^0_{\text{crisis}}}{\sigma^0_{\text{reference}}}\right)$$
  Smooth open standing water acts as a specular reflector, scattering microwave pulses away from the antenna and exhibiting very low radar backscatter ($\le -18\ \text{dB}$). Otsu automated bimodal thresholding segments flooded waterlogged pixels from unflooded terrain.
* **Key Geographies**: Majuli Island riverine sandbars (`26.95°N, 94.20°E`), Dibrugarh dyke breach embankments (`27.48°N, 94.92°E`), and Kaziranga National Park animal transit corridors (`26.58°N, 93.35°E`).

---

### Scenario 2: Unplanned Urban Sprawl — Bengaluru Metropolitan Region
* **Ground-Truth Benchmark**: European Commission Joint Research Centre (JRC) Global Human Settlement Layer (GHSL Settlement Grid 2024) and ISRO National Urban Information System (NUIS).
* **Sensor Baseline**: ISRO Cartosat-3 high-resolution Panchromatic ($0.28\text{m}$) and 4-band Multispectral ($1.12\text{m}$).
* **Physics / Algorithm**:
  $$\text{NDBI} = \frac{\text{SWIR} - \text{NIR}}{\text{SWIR} + \text{NIR}}$$
  Built-up impervious concrete, asphalt, and metal roofing exhibit higher reflectance in the Shortwave Infrared (SWIR) region compared to the Near-Infrared (NIR) region, cleanly isolating concrete infrastructure from surrounding vegetation.
* **Key Geographies**: Outer Ring Road / Sarjapur IT corridor infill (`12.85°N, 77.68°E`), Whitefield-Kadugodi-Varthur peri-urban growth axis (`12.96°N, 77.76°E`), and Devanahalli Kempegowda International Airport Aerotropolis (`13.23°N, 77.71°E`).

---

### Scenario 3: Catastrophic Landslides & Debris Avalanche — Wayanad, Kerala
* **Ground-Truth Benchmark**: ISRO National Remote Sensing Centre (NRSC) Disaster Management Support (DMS) Rapid Satellite Damage Assessment and Geological Survey of India (GSI) Post-Disaster Geotechnical Report (July 2024 Chooralmala / Meppadi Catastrophic Debris Flow).
* **Sensor Baseline**: ISRO Cartosat-3 sub-meter panchromatic ($0.28\text{m}$) and 4-band multispectral ($1.12\text{m}$) coupled with Copernicus Sentinel-1A Synthetic Aperture Radar (C-SAR) differential interferometry ($\text{DInSAR}$).
* **Why Sub-Meter Optical & InSAR?**: Steep mountainous terrain in the Western Ghats requires high-resolution geometric fidelity to trace narrow headscarps, boulder runout tracks, and severed bridge infrastructure, while InSAR coherence loss accurately delineates ground surface rupture even beneath residual cloud cover.
* **Physics / Algorithm**:
  $$\Delta \text{Reflectance} = R_{\text{post}} - R_{\text{pre}}, \quad \gamma_{\text{coherence}} = \frac{|\langle s_1 s_2^* \rangle|}{\sqrt{\langle |s_1|^2 \rangle \langle |s_2|^2 \rangle}}$$
  Coupled with Copernicus DEM slope gradient thresholding ($>34^\circ$), severe stripping of dense vegetation cover and topsoil exposes raw gneissic bedrock, yielding a pronounced drop in NDVI ($\Delta \text{NDVI} < -0.45$) and complete radar interferometric decorrelation ($\gamma < 0.25$).
* **Key Geographies**: Punchirimattam peak crown failure scarp (`11.548°N, 76.148°E`, elevation 1,550m), Iruvaiphuzha river debris flow erosion chute (`11.538°N, 76.138°E`), and Chooralmala / Mundakkai township deposition fan (`11.528°N, 76.124°E`).

---

### Scenario 4: Active Wildfires & Canopy Burn Scars — Similipal Biosphere Reserve
* **Ground-Truth Benchmark**: NASA Fire Information for Resource Management System (FIRMS) VIIRS 375m NRT Active Fire Product (`VNP14IMGTDL_NRT`) and Forest Survey of India (FSI) *Van Agni* Geoportal.
* **Sensor Baseline**: Suomi-NPP VIIRS (Visible Infrared Imaging Radiometer Suite) 375m thermal bands ($\text{I4}: 3.9\mu\text{m}, \text{I5}: 11.4\mu\text{m}$) coupled with Sentinel-2 MSI 20m SWIR bands.
* **Physics / Algorithm**:
  $$\text{NBR} = \frac{\text{NIR} - \text{SWIR2}}{\text{NIR} + \text{SWIR2}} = \frac{\text{Band 8} - \text{Band 12}}{\text{Band 8} + \text{Band 12}}$$
  $$\Delta\text{NBR} = \text{NBR}_{\text{pre-fire}} - \text{NBR}_{\text{post-fire}}$$
  Healthy green vegetation reflects strongly in NIR and absorbs SWIR. Burned zones with charcoal and ash reflect strongly in SWIR and absorb NIR. $\Delta\text{NBR} > 0.44$ delineates severe canopy destruction.
* **Key Geographies**: Active flaming front along Chahala ridgeline (`21.88°N, 86.32°E`) and severe post-fire burn scar on Meghasani mountain slopes (`21.80°N, 86.42°E`).

---

### Scenario 5: Agricultural Drought & Farm Pond Depletion — Vidarbha, Maharashtra
* **Ground-Truth Benchmark**: NASA Land Processes Distributed Active Archive Center (LP DAAC) MODIS Terra `MOD13A2` (16-Day NDVI $1\text{km}$) and ISRO Bhuvan Mahalanobis National Crop Forecast Centre (MNCFC) drought bulletins.
* **Sensor Baseline**: ISRO Resourcesat-2A Advanced Wide Field Sensor (AWiFS, $56\text{m}$) and Sentinel-1A SAR dual-polarization.
* **Physics / Algorithm**:
  $$\text{VCI} = \frac{\text{NDVI}_{\text{current}} - \text{NDVI}_{\text{min}}}{\text{NDVI}_{\text{max}} - \text{NDVI}_{\text{min}}} \times 100$$
  $$\text{NDMI} = \frac{\text{NIR} - \text{SWIR1}}{\text{NIR} + \text{SWIR1}}$$
  Vegetation Condition Index ($\text{VCI}$) normalizes vegetation health against historical 20-year satellite extremes. $\text{VCI} < 25\%$ indicates severe meteorological and agricultural moisture stress in rainfed soybean and cotton tracts.
* **Key Geographies**: Rainfed agricultural blocks of Yavatmal district (`20.88°N, 77.73°E`) and Upper Wardha catchment depleted farm ponds (`21.01°N, 77.88°E`).

---

## 4. Machine Learning Benchmarks & Model Evaluation

SatQuery AI's vision-language reasoning engine is architected to benchmark against the foremost open remote-sensing computer vision datasets available on **Kaggle**, **HuggingFace**, and **IEEE GRSS**:

| Dataset Name | Domain / Modality | Scale | Primary Benchmark Task | SatQuery AI Integration Point |
|---|---|---|---|---|
| **FloodNet (Kaggle / IEEE)** | UAV / High-Res Aerial | 2,343 images | Semantic segmentation of floodwater, submerged roads, and damaged structures | Validation baseline for Disaster Response scenarios |
| **RemoteCLIP (HuggingFace / OpenCLIP)** | Multimodal EO Vision-Language | 800K image-text pairs | Open-vocabulary text-guided image retrieval & zero-shot classification | Text-query embedding backbone for `SatQueryEngine` |
| **Sentinel-2 LandCover (Kaggle / ESA)** | 13-band Sentinel-2 MSI | Multi-TB global coverage | Multi-class land-use / land-cover (LULC) segmentation | Ground truth for Urban and Water extent tracking |
| **RSICD (Remote Sensing Image Captioning Dataset)** | Optical Satellite (0.5m - 30m) | 10,921 images / 54K captions | Vision-language captioning and natural-language query grounding | Semantic keyword & VLM tokenizer tuning |

### Quantitative Baseline Target Metrics

When operating in Real VLM Mode on validation benchmark splits, SatQuery AI targets:

$$\text{mIoU} = \frac{1}{C}\sum_{c=1}^C \frac{|P_c \cap G_c|}{|P_c \cup G_c|} \ge 0.78$$

$$\text{Zero-Shot Precision@1} \ge 89.2\% \quad (\text{Top-1 Scenario Classification Accuracy})$$

$$\text{Mean Inference Latency} \le 45\text{ms (Deterministic Mode)} \quad / \quad \le 180\text{ms (GPU VLM TensorRT)}$$

---

## 5. Verification & Audit Trail

Every GeoJSON payload exported by SatQuery AI contains immutable provenance metadata stamped into the root JSON object:
```json
{
  "type": "FeatureCollection",
  "name": "assam_brahmaputra_flood_delineation",
  "crs": {
    "type": "name",
    "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" }
  },
  "metadata": {
    "region": "Assam, Brahmaputra Valley, India",
    "sensor": "Sentinel-1A SAR / RISAT-1A C-SAR",
    "dataset_source": "Copernicus Emergency Management Service (EMS EMSR586) & ESA Sentinel-1A",
    "methodology": "Bitemporal SAR Backscatter Ratio (σ⁰ VV/VH) Otsu Thresholding",
    "citation": "Copernicus EMS Rapid Mapping Activation EMSR586: Flood in Assam, India (August 2024)",
    "query_timestamp": "2026-09-08T02:37:00Z"
  }
}
```

This ensures that whether outputs are ingested into **ISRO Bhuvan**, **QGIS**, or **National Disaster Management Authority (NDMA)** GIS dashboards, the data lineage remains fully transparent, auditable, and scientifically defensible.
