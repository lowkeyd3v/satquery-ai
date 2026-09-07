"""
mock_data.py
--------------------------------------------------------------------------
SatQuery AI | SIH26167 | ISRO
--------------------------------------------------------------------------
Pre-configured, realistic GeoJSON FeatureCollections used as the
Mock/Fallback inference mode. These represent five diverse Indian
remote-sensing scenarios that the frontend can render immediately without
any GPU or model weights being present.

Each Feature carries a `properties` block with:
    - id            : unique feature identifier
    - label         : scenario classification label
    - confidence    : simulated model confidence score (0-1)
    - area_sqkm     : calculated polygon area in square kilometers
    - severity      : severity rating (Critical / High / Moderate / etc.)
    - sensor        : earth observation sensor source
    - resolution    : ground sampling distance (GSD)
    - description   : human readable caption for the popup / metrics panel
    - action        : recommended operational action for field agencies
    - color         : hex color used by the frontend to render the polygon
"""

from copy import deepcopy
from datetime import datetime, timezone


def _timestamp() -> str:
    """Return current UTC ISO timestamp, used to stamp each query result."""
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# SCENARIO 1: Flooded Zones — Brahmaputra Basin, Assam
# Ground Truth Reference: Copernicus Emergency Management Service (EMS)
# Activation EMSR586 & ESA Sentinel-1A SAR / ISRO RISAT-1A
# ---------------------------------------------------------------------------
ASSAM_FLOOD_GEOJSON = {
    "type": "FeatureCollection",
    "name": "assam_brahmaputra_flood_delineation",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "flood_001",
                "label": "Severe Riverine Inundation",
                "confidence": 0.96,
                "area_sqkm": 48.2,
                "severity": "Critical",
                "sensor": "Sentinel-1A C-SAR / RISAT-1A",
                "resolution": "10m SAR (Cloud Penetrating)",
                "dataset": "Copernicus EMS EMSR586 / ESA Sentinel-1A",
                "methodology": "Bitemporal SAR Backscatter Ratio (\u03c3\u2070 VV/VH) Otsu Thresholding",
                "scene_id": "S1A_IW_GRDH_1SDV_20240816T115842_055238",
                "description": "Critical flood inundation across Majuli island braided riverbeds and lower agricultural alluvial plains.",
                "action": "Dispatch NDRF Boat Teams to Majuli Sector 3; prioritize medical evacuation along Kamalabari ghat.",
                "color": "#ff1744",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [94.1180, 26.9380],
                        [94.1520, 26.9550],
                        [94.1950, 26.9620],
                        [94.2380, 26.9750],
                        [94.2620, 27.0050],
                        [94.2450, 27.0320],
                        [94.2050, 27.0420],
                        [94.1620, 27.0350],
                        [94.1280, 27.0120],
                        [94.1020, 26.9740],
                        [94.1180, 26.9380],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "flood_002",
                "label": "Embankment Breach & Waterlogging",
                "confidence": 0.89,
                "area_sqkm": 31.4,
                "severity": "High",
                "sensor": "Sentinel-1A C-SAR / RISAT-1A",
                "resolution": "10m SAR",
                "dataset": "Copernicus EMS EMSR586",
                "methodology": "Co-polarized VV Backscatter Depolarization Deficit",
                "scene_id": "S1A_IW_GRDH_1SDV_20240816T115842_055238",
                "description": "Breached dyke flood waters submerging rural settlements and agricultural paddy along Dibrugarh ring embankment.",
                "action": "Deploy geotextile sandbag reinforcements to Dibrugarh dyke; alert Assam State Disaster Management Authority (ASDMA).",
                "color": "#ff1744",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [94.8820, 27.4420],
                        [94.9280, 27.4550],
                        [94.9680, 27.4780],
                        [94.9820, 27.5080],
                        [94.9650, 27.5320],
                        [94.9220, 27.5250],
                        [94.8850, 27.4920],
                        [94.8680, 27.4620],
                        [94.8820, 27.4420],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "flood_003",
                "label": "Wildlife Corridor Wetland Inundation",
                "confidence": 0.84,
                "area_sqkm": 19.5,
                "severity": "Moderate",
                "sensor": "Cartosat-2E / Sentinel-1A",
                "resolution": "2m Optical / 10m SAR",
                "dataset": "ISRO Bhuvan Disaster Support / Copernicus EMS",
                "methodology": "Optical NDWI & SAR Coherence Fusion",
                "scene_id": "CARTOSAT2E_PAN_20240817_KAZIRANGA",
                "description": "Seasonal flood pulse submerging 70% of Kaziranga National Park grassland habitats, forcing animal migration across NH-715.",
                "action": "Enforce strict 40 km/h vehicle speed restrictions on NH-715 animal transit corridors with forest department checkpoints.",
                "color": "#ff1744",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [93.3150, 26.5480],
                        [93.3650, 26.5620],
                        [93.4180, 26.5780],
                        [93.4350, 26.6120],
                        [93.3980, 26.6320],
                        [93.3450, 26.6210],
                        [93.3080, 26.5880],
                        [93.3150, 26.5480],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Assam, Brahmaputra Valley, India",
        "sensor": "Sentinel-1A SAR / RISAT-1A C-SAR",
        "scenario": "flood",
        "center": [26.95, 94.2],
        "zoom": 8,
        "dataset_source": "Copernicus Emergency Management Service (EMS EMSR586) & ESA Sentinel-1A",
        "methodology": "Bitemporal SAR Backscatter Ratio (\u03c3\u2070 VV/VH) Otsu Thresholding",
        "citation": "Copernicus EMS Rapid Mapping Activation EMSR586: Flood in Assam, India (August 2024)",
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 2: Urban Expansion — Bengaluru Metropolitan Region
# Ground Truth Reference: European Commission Global Human Settlement Layer (GHSL)
# & ISRO Cartosat-3 High-Resolution Optical
# ---------------------------------------------------------------------------
BENGALURU_URBAN_GEOJSON = {
    "type": "FeatureCollection",
    "name": "bengaluru_urban_expansion",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "urban_001",
                "label": "Tech Corridor & Commercial Infill",
                "confidence": 0.93,
                "area_sqkm": 21.8,
                "severity": "Rapid Growth",
                "sensor": "Cartosat-3 High-Resolution Optical",
                "resolution": "0.28m PAN / 1.12m MX",
                "dataset": "European Commission GHSL / ISRO Cartosat-3",
                "methodology": "Normalized Difference Built-up Index (NDBI) + Pan-Sharpened Segmentation",
                "scene_id": "CARTOSAT3_PANMX_20240412_BLR_004",
                "description": "High-density concrete infrastructure and commercial campus expansions along the Outer Ring Road and Sarjapur axis.",
                "action": "Update BDA master plan zoning; verify stormwater runoff buffer compliance for lake catchment protection.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.6420, 12.8180],
                        [77.6880, 12.8250],
                        [77.7280, 12.8520],
                        [77.7350, 12.8820],
                        [77.6980, 12.8920],
                        [77.6580, 12.8750],
                        [77.6350, 12.8420],
                        [77.6420, 12.8180],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "urban_002",
                "label": "Horizontal Peri-Urban Residential Layouts",
                "confidence": 0.88,
                "area_sqkm": 26.4,
                "severity": "Moderate Growth",
                "sensor": "Cartosat-3 / Resourcesat-2A",
                "resolution": "0.5m Optical",
                "dataset": "GHSL Settlement Grid / OpenStreetMap Landuse",
                "methodology": "Spectral Impervious Surface Fraction (ISF) Mapping",
                "scene_id": "CARTOSAT3_MX_20240320_WHITEFIELD",
                "description": "Rapid peri-urban agricultural conversion to residential layouts detected along Whitefield-Kadugodi-Varthur corridor.",
                "action": "Audit lake buffer encroachments around Varthur basin; integrate with BBMP property cadastral registry.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.7120, 12.9220],
                        [77.7680, 12.9300],
                        [77.8150, 12.9620],
                        [77.8020, 12.9980],
                        [77.7520, 12.9920],
                        [77.7180, 12.9680],
                        [77.7020, 12.9380],
                        [77.7120, 12.9220],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "urban_003",
                "label": "Aerotropolis Logistics & Industrial Zone",
                "confidence": 0.85,
                "area_sqkm": 16.3,
                "severity": "Planned Infrastructure",
                "sensor": "Cartosat-3 Optical",
                "resolution": "0.28m PAN",
                "dataset": "ISRO National Urban Information System (NUIS)",
                "methodology": "Multi-temporal Morphological Building Index (MBI)",
                "scene_id": "CARTOSAT3_PAN_20240502_DEVANAHALLI",
                "description": "Logistics hub, warehousing complexes, and high-speed arterial road grading detected near Devanahalli KIA.",
                "action": "Cross-reference detected building perimeters with KIADB industrial corridor statutory clearance records.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.6720, 13.1920],
                        [77.7220, 13.2020],
                        [77.7550, 13.2350],
                        [77.7420, 13.2680],
                        [77.6920, 13.2620],
                        [77.6580, 13.2300],
                        [77.6720, 13.1920],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Bengaluru Metropolitan Region, Karnataka, India",
        "sensor": "Cartosat-3 High-Resolution Optical / Resourcesat-2A",
        "scenario": "urban",
        "center": [12.97, 77.64],
        "zoom": 10,
        "dataset_source": "European Commission Global Human Settlement Layer (GHSL) & ISRO Cartosat-3",
        "methodology": "Normalized Difference Built-Up Index (NDBI) + Pan-Sharpened Segmentation",
        "citation": "GHSL Global Human Settlement Grid 2024 / Cartosat-3 High-Res EO Benchmark",
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 3: Water Bodies — Chilika Lake, Odisha
# Ground Truth Reference: JRC Global Surface Water (GSW) / Ramsar Site #229
# & ISRO Resourcesat-2A LISS-IV / Sentinel-2 MSI
# ---------------------------------------------------------------------------
CHILIKA_WATER_GEOJSON = {
    "type": "FeatureCollection",
    "name": "chilika_lake_water_bodies",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "water_001",
                "label": "Brackish Water Lagoon Core",
                "confidence": 0.98,
                "area_sqkm": 128.4,
                "severity": "Stable Extent",
                "sensor": "Resourcesat-2A LISS-IV / Sentinel-2 MSI",
                "resolution": "5.8m Multispectral / 10m Optical",
                "dataset": "JRC Global Surface Water (GSW) / Ramsar Site #229",
                "methodology": "Modified Normalized Difference Water Index (MNDWI > 0.28)",
                "scene_id": "RS2A_LISS4_20240510_CHILIKA_R229",
                "description": "Central open-water lagoon body of Chilika Lake, Asia's largest coastal brackish lagoon wetland system.",
                "action": "Stream water-spread polygon metrics directly to Chilika Development Authority (CDA) salinity tracker.",
                "color": "#00e676",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [85.1750, 19.6180],
                        [85.2750, 19.6420],
                        [85.3850, 19.6920],
                        [85.4480, 19.7750],
                        [85.4280, 19.8420],
                        [85.3150, 19.8380],
                        [85.2200, 19.7750],
                        [85.1550, 19.6880],
                        [85.1750, 19.6180],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "water_002",
                "label": "Nalabana Wetland Bird Sanctuary",
                "confidence": 0.94,
                "area_sqkm": 14.8,
                "severity": "Protected Zone",
                "sensor": "Resourcesat-2A LISS-IV",
                "resolution": "5.8m Multispectral",
                "dataset": "Chilika Development Authority / Ramsar Convention",
                "methodology": "Automated Water Extraction Index (AWEI) + NDVI Weed Mask",
                "scene_id": "RS2A_LISS4_20240510_NALABANA",
                "description": "Nalabana Island core wetland sanctuary, seasonal shallow mudflats supporting over 1 million migratory waterfowl.",
                "action": "Track aquatic macrophytes (Eichhornia crassipes) coverage to prevent habitat degradation on bird feeding shoals.",
                "color": "#00e676",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [85.3220, 19.7020],
                        [85.3720, 19.7150],
                        [85.3980, 19.7450],
                        [85.3680, 19.7680],
                        [85.3180, 19.7480],
                        [85.3220, 19.7020],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "water_003",
                "label": "Satapada Tidal Estuarine Channel",
                "confidence": 0.89,
                "area_sqkm": 9.2,
                "severity": "Active Inlet",
                "sensor": "Sentinel-2 MSI",
                "resolution": "10m Optical",
                "dataset": "JRC Global Surface Water Seasonal Dynamics",
                "methodology": "Sub-pixel Surface Water Probability Classification",
                "scene_id": "S2B_MSIL2A_20240512_SATAPADA",
                "description": "Outer barrier spit channel linking the lagoon with the Bay of Bengal, critical for tidal flushing and Irrawaddy dolphin passage.",
                "action": "Assess sediment littoral drift at sea-mouth bar to ensure natural hydrodynamic flushing and salinity balance.",
                "color": "#00e676",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [85.4320, 19.5520],
                        [85.4820, 19.5680],
                        [85.5150, 19.6120],
                        [85.4780, 19.6320],
                        [85.4280, 19.5920],
                        [85.4320, 19.5520],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Chilika Lake, Odisha, India",
        "sensor": "Resourcesat-2A LISS-IV / Sentinel-2 MSI",
        "scenario": "water",
        "center": [19.72, 85.34],
        "zoom": 10,
        "dataset_source": "JRC Global Surface Water (GSW) / Ramsar Site #229 / ISRO Resourcesat-2A",
        "methodology": "Modified Normalized Difference Water Index (MNDWI > 0.28) + Otsu Thresholding",
        "citation": "Pekel et al., High-resolution mapping of global surface water and its long-term changes, Nature (2016)",
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 4: Forest Fire & Burn Scars — Similipal Biosphere Reserve
# Ground Truth Reference: NASA FIRMS (Fire Information for Resource Management System)
# VIIRS 375m & Sentinel-2 MSI Normalized Burn Ratio (NBR)
# ---------------------------------------------------------------------------
SIMILIPAL_FIRE_GEOJSON = {
    "type": "FeatureCollection",
    "name": "similipal_wildfire_hotspots",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "fire_001",
                "label": "Active Forest Wildfire Front",
                "confidence": 0.95,
                "area_sqkm": 14.2,
                "severity": "Emergency",
                "sensor": "Oceansat-3 / NASA VIIRS 375m Thermal IR",
                "resolution": "375m Thermal / 30m Optical",
                "dataset": "NASA FIRMS VIIRS Active Fire Archive / Forest Survey of India (FSI)",
                "methodology": "Contextual Thermal Anomaly Detection (Bright Temp 4\u03bcm / 11\u03bcm)",
                "scene_id": "NASA_VIIRS_VNP14IMGTDL_NRT_20240218_SIMILIPAL",
                "description": "High-intensity active fire perimeter advancing through dry deciduous Sal canopy along Chahala-Baripada ridgeline.",
                "action": "Alert Odisha Forest Department emergency ops; deploy local Van Suraksha Samiti ground fire-lines and aerial reconnaissance.",
                "color": "#e040fb",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [86.2780, 21.8380],
                        [86.3320, 21.8520],
                        [86.3680, 21.8880],
                        [86.3450, 21.9280],
                        [86.2920, 21.9180],
                        [86.2620, 21.8720],
                        [86.2780, 21.8380],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "fire_002",
                "label": "Post-Fire Canopy Burn Scar",
                "confidence": 0.91,
                "area_sqkm": 28.6,
                "severity": "High Post-Fire Damage",
                "sensor": "Sentinel-2 MSI SWIR/NIR",
                "resolution": "20m SWIR/NIR",
                "dataset": "Copernicus Sentinel-2 MSI Level-2A / FSI Van Agni",
                "methodology": "Differenced Normalized Burn Ratio (dNBR > 0.44)",
                "scene_id": "S2A_MSIL2A_20240222_SIMILIPAL_NBR",
                "description": "Extensive charcoal ash deposition and complete loss of understory foliage observed over upper Meghasani plateau slopes.",
                "action": "Deploy vegetative contour check-dams to prevent post-fire topsoil erosion ahead of Southwest monsoon rainfall.",
                "color": "#e040fb",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [86.3780, 21.7480],
                        [86.4380, 21.7620],
                        [86.4780, 21.8080],
                        [86.4380, 21.8480],
                        [86.3720, 21.8320],
                        [86.3480, 21.7820],
                        [86.3780, 21.7480],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Similipal Biosphere Reserve, Odisha, India",
        "sensor": "NASA VIIRS 375m Thermal IR / Sentinel-2 MSI",
        "scenario": "fire",
        "center": [21.85, 86.35],
        "zoom": 10,
        "dataset_source": "NASA FIRMS (Fire Information for Resource Management System) & Sentinel-2 NBR",
        "methodology": "Thermal Anomaly Brightness Temperature + Differenced Normalized Burn Ratio (dNBR)",
        "citation": "NASA FIRMS Global Fire Archive & Forest Survey of India (FSI) Fire Danger Rating System",
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 5: Agricultural Crop Stress & Drought — Vidarbha, Maharashtra
# Ground Truth Reference: NASA LP DAAC MODIS MOD13A2 / ISRO Bhuvan PMFBY
# & Resourcesat-2A AWiFS NDVI Anomaly Mapping
# ---------------------------------------------------------------------------
VIDARBHA_AGRI_GEOJSON = {
    "type": "FeatureCollection",
    "name": "vidarbha_crop_drought_stress",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "agri_001",
                "label": "Severe Crop Moisture Deficit",
                "confidence": 0.92,
                "area_sqkm": 54.3,
                "severity": "Drought Stress",
                "sensor": "Resourcesat-2A AWiFS / Sentinel-2 NDVI",
                "resolution": "10m Optical / 56m AWiFS",
                "dataset": "NASA MODIS MOD13A2 16-Day NDVI / ISRO Bhuvan Agricultural Drought",
                "methodology": "Vegetation Condition Index (VCI < 25%) & NDMI Anomaly",
                "scene_id": "MOD13A2_061_20240728_VIDARBHA_VCI",
                "description": "Vegetation Condition Index (VCI) depressed below 25% threshold across rainfed cotton and soybean parcels in Yavatmal.",
                "action": "Trigger Pradhan Mantri Fasal Bima Yojana (PMFBY) mid-season crop loss assessments and subsidized fodder reserves.",
                "color": "#ffd600",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.6480, 20.8180],
                        [77.7380, 20.8320],
                        [77.8120, 20.8780],
                        [77.7880, 20.9420],
                        [77.7120, 20.9380],
                        [77.6380, 20.8820],
                        [77.6480, 20.8180],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "agri_002",
                "label": "Critically Depleted Farm Pond Storage",
                "confidence": 0.87,
                "area_sqkm": 18.7,
                "severity": "Low Water Storage",
                "sensor": "Sentinel-1A SAR / Cartosat-2",
                "resolution": "10m SAR",
                "dataset": "ISRO Bhuvan Water Resources / Central Water Commission (CWC)",
                "methodology": "SAR Dual-Polarization Surface Water Inversion",
                "scene_id": "S1A_IW_GRDH_20240804_WARDHA",
                "description": "Surface irrigation reservoir capacity across Upper Wardha sub-basin depleted to 18% of historical 10-year median.",
                "action": "Prioritize staged canal water release from Upper Wardha reservoir; enforce ban on non-potable agricultural diversions.",
                "color": "#ffd600",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.8180, 20.9580],
                        [77.8820, 20.9720],
                        [77.9180, 21.0180],
                        [77.8780, 21.0420],
                        [77.8220, 21.0280],
                        [77.8180, 20.9580],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Vidarbha Region, Maharashtra, India",
        "sensor": "Resourcesat-2A AWiFS / NASA MODIS MOD13A2",
        "scenario": "agriculture",
        "center": [20.91, 77.78],
        "zoom": 9,
        "dataset_source": "NASA LP DAAC MODIS MOD13A2 & ISRO Bhuvan Agricultural Drought Advisory",
        "methodology": "Vegetation Condition Index (VCI < 25%) & Normalized Difference Moisture Index (NDMI)",
        "citation": "Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 1km SIN Grid V061. NASA EOSDIS LP DAAC.",
    },
}


# ---------------------------------------------------------------------------
# Registry mapping scenario_id -> raw GeoJSON template
# ---------------------------------------------------------------------------
SCENARIO_REGISTRY = {
    "flood": ASSAM_FLOOD_GEOJSON,
    "urban": BENGALURU_URBAN_GEOJSON,
    "water": CHILIKA_WATER_GEOJSON,
    "fire": SIMILIPAL_FIRE_GEOJSON,
    "agriculture": VIDARBHA_AGRI_GEOJSON,
}

# ---------------------------------------------------------------------------
# Preset definitions surfaced to the frontend via GET /api/v1/scenarios
# ---------------------------------------------------------------------------
SCENARIO_PRESETS = [
    {
        "id": "flood",
        "name": "Detect Floods",
        "sample_query": "Highlight flooded regions in this tile",
        "description": "Identifies inundated floodplains and breached embankments using SAR change detection.",
        "region": "Brahmaputra Basin, Assam",
        "color": "#ff1744",
        "sensor": "Sentinel-1A / RISAT-1A SAR",
        "dataset_source": "Copernicus EMS EMSR586 & Sentinel-1A SAR",
    },
    {
        "id": "urban",
        "name": "Track Urban Sprawl",
        "sample_query": "Show urban expansion and built-up development",
        "description": "Detects newly constructed concrete and peri-urban sprawl for town planning.",
        "region": "Bengaluru Metropolitan Region",
        "color": "#ff9100",
        "sensor": "Cartosat-3 High-Res Optical",
        "dataset_source": "EC GHSL Settlement Grid & Cartosat-3",
    },
    {
        "id": "water",
        "name": "Monitor Water Bodies",
        "sample_query": "Segment all major lakes and water spread extent",
        "description": "Delineates lakes, coastal lagoons, and wetland water-spread boundaries.",
        "region": "Chilika Lake, Odisha",
        "color": "#00e676",
        "sensor": "Resourcesat-2A LISS-IV / Sentinel-2",
        "dataset_source": "JRC Global Surface Water & Ramsar #229",
    },
    {
        "id": "fire",
        "name": "Forest Fire Hotspots",
        "sample_query": "Detect active forest fire fronts and burn scars",
        "description": "Flags thermal wildfire anomalies and post-fire canopy burn damage.",
        "region": "Similipal National Park, Odisha",
        "color": "#e040fb",
        "sensor": "NASA VIIRS 375m / Sentinel-2 SWIR",
        "dataset_source": "NASA FIRMS Active Fire Archive & FSI",
    },
    {
        "id": "agriculture",
        "name": "Crop Drought Stress",
        "sample_query": "Analyze crop drought moisture stress and farm ponds",
        "description": "Maps agricultural vegetation moisture deficit and depleted reservoirs.",
        "region": "Vidarbha, Maharashtra",
        "color": "#ffd600",
        "sensor": "Resourcesat-2A AWiFS / MODIS NDVI",
        "dataset_source": "NASA MODIS MOD13A2 & ISRO Bhuvan",
    },
]


def get_scenario_geojson(scenario_id: str) -> dict:
    """
    Return a fresh deep copy of the GeoJSON FeatureCollection for a given
    scenario_id. A deep copy is returned so that callers may safely mutate
    the result without corrupting the shared in-memory template.
    """
    template = SCENARIO_REGISTRY.get(scenario_id)
    if template is None:
        return {
            "type": "FeatureCollection",
            "name": "empty_result",
            "features": [],
            "metadata": {
                "region": "Pan-India Coverage",
                "sensor": "Multi-Sensor EO",
                "scenario": "unknown",
                "center": [22.9734, 78.6569],  # geographic center of India
                "zoom": 5,
            },
        }

    result = deepcopy(template)
    result["metadata"]["query_timestamp"] = _timestamp()
    return result


def list_presets() -> list:
    """Return the list of scenario presets for the frontend buttons."""
    return deepcopy(SCENARIO_PRESETS)


# ---------------------------------------------------------------------------
# Temporal snapshot helpers — used by /api/v1/temporal/{scenario_id}
# ---------------------------------------------------------------------------

TEMPORAL_STEP_META = {
    "flood": [
        {"tag": "Detection", "label": "Initial Breach Detected",   "date": "Aug 12, 2025"},
        {"tag": "Spread",    "label": "Inundation Spreading",       "date": "Aug 16, 2025"},
        {"tag": "Peak",      "label": "Peak Flood Extent",          "date": "Aug 20, 2025"},
    ],
    "urban": [
        {"tag": "Detection", "label": "New Development Detected",   "date": "Jan 2025"},
        {"tag": "Spread",    "label": "Construction Phase 2",       "date": "Apr 2025"},
        {"tag": "Peak",      "label": "Maximum Sprawl Extent",      "date": "Jul 2025"},
    ],
    "water": [
        {"tag": "Detection", "label": "Pre-Monsoon — Low Water",    "date": "May 2025"},
        {"tag": "Spread",    "label": "Monsoon Inflow",             "date": "Jul 2025"},
        {"tag": "Peak",      "label": "Peak Lagoon Spread",         "date": "Sep 2025"},
    ],
    "fire": [
        {"tag": "Detection", "label": "Active Hotspot — Day 1",     "date": "Feb 14, 2025"},
        {"tag": "Spread",    "label": "Burn Scar Expanding",        "date": "Feb 18, 2025"},
        {"tag": "Peak",      "label": "Maximum Fire Perimeter",     "date": "Feb 22, 2025"},
    ],
    "agriculture": [
        {"tag": "Detection", "label": "Early Stress Signals",       "date": "Jun 2025"},
        {"tag": "Spread",    "label": "Drought Spreading",          "date": "Jul 2025"},
        {"tag": "Peak",      "label": "Critical Failure Zone",      "date": "Aug 2025"},
    ],
}


def _poly_centroid(coords: list) -> tuple:
    """Compute lon/lat centroid of a polygon's outer ring."""
    ring = coords[0]
    n = max(len(ring) - 1, 1)  # exclude closing point if present
    cx = sum(p[0] for p in ring[:n]) / n
    cy = sum(p[1] for p in ring[:n]) / n
    return cx, cy


def _scale_poly(coords: list, factor: float) -> list:
    """Scale a polygon's coordinates outward from its centroid by `factor`."""
    cx, cy = _poly_centroid(coords)
    return [
        [
            [round(cx + (p[0] - cx) * factor, 4),
             round(cy + (p[1] - cy) * factor, 4)]
            for p in ring
        ]
        for ring in coords
    ]


def get_scenario_temporal(scenario_id: str) -> list:
    """
    Return a list of 3 snapshot dicts representing temporal progression
    of the scenario.  Each snapshot contains:
        step   : 0 | 1 | 2
        tag    : e.g. "T+0d", "T+4d", "T+8d"
        label  : human-readable phase label
        date   : representative observation date string
        geojson: FeatureCollection with scaled / cropped features
    """
    base = get_scenario_geojson(scenario_id)
    all_features = base.get("features", [])
    step_meta = TEMPORAL_STEP_META.get(
        scenario_id, TEMPORAL_STEP_META["flood"]
    )

    # Progressive reveal: T+0 → 1 feature at 55%, T+4 → 2 at 78%, T+8 → all at 100%
    configs = [
        {"scale": 0.55, "count": 1},
        {"scale": 0.78, "count": max(1, len(all_features) - 1)},
        {"scale": 1.00, "count": len(all_features)},
    ]

    snapshots = []
    for i, (cfg, meta) in enumerate(zip(configs, step_meta)):
        subset = all_features[: cfg["count"]]
        scaled_features = []
        for feat in subset:
            f = deepcopy(feat)
            f["geometry"]["coordinates"] = _scale_poly(
                feat["geometry"]["coordinates"], cfg["scale"]
            )
            # Adjust area proportional to scale²
            orig_area = feat["properties"].get("area_sqkm", 0)
            f["properties"]["area_sqkm"] = round(
                orig_area * cfg["scale"] * cfg["scale"], 1
            )
            scaled_features.append(f)

        snapshots.append({
            "step":   i,
            "tag":    meta["tag"],
            "label":  meta["label"],
            "date":   meta["date"],
            "geojson": {
                "type":     "FeatureCollection",
                "features": scaled_features,
            },
        })

    return snapshots
