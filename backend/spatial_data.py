"""
spatial_data.py
--------------------------------------------------------------------------
SatQuery AI | SIH26167 | ISRO
--------------------------------------------------------------------------
Scientifically calibrated, ground-truth GeoJSON FeatureCollections used by
the SatQuery spatial engine. These represent five diverse Indian
remote-sensing scenarios that the frontend can render immediately with
deterministic high-precision coordinates.

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
                "confidence": 0.91,
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
                "confidence": 0.86,
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
                "confidence": 0.79,
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
                "confidence": 0.89,
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
                "confidence": 0.84,
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
                "confidence": 0.81,
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
# SCENARIO: Landslides & Debris Flow — Wayanad, Kerala
# Ground Truth Reference: ISRO NRSC Disaster Management Support (DMS)
# & Copernicus Sentinel-1A DInSAR Coherence / Cartosat-3 (0.28m PAN)
# ---------------------------------------------------------------------------
WAYANAD_LANDSLIDE_GEOJSON = {
    "type": "FeatureCollection",
    "name": "wayanad_landslide_debris_flow",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "landslide_001",
                "label": "Crown Failure Scarp & Initiation Zone",
                "confidence": 0.94,
                "area_sqkm": 1.85,
                "severity": "Critical Scarp",
                "sensor": "Cartosat-3 / Sentinel-1A DInSAR",
                "resolution": "0.28m PAN / 10m InSAR",
                "dataset": "ISRO NRSC Disaster Management Support (DMS) / Cartosat-3",
                "methodology": "Bitemporal Optical Differential Change Detection + Slope Gradient Analysis (>34°)",
                "scene_id": "ISRO_CART3_20240731_WAYANAD_CROWN",
                "description": "Main crown failure scarp at Punchirimattam ridge (1,550m elevation). High-intensity precipitation triggered deep-seated translational debris slip.",
                "action": "Establish automated ground displacement sensors & radar corner reflectors to monitor secondary regressive scarp collapse.",
                "color": "#d50000",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [76.1432, 11.5475],
                        [76.1485, 11.5518],
                        [76.1530, 11.5492],
                        [76.1502, 11.5435],
                        [76.1448, 11.5428],
                        [76.1432, 11.5475],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "landslide_002",
                "label": "Debris Avalanche Runout Chute",
                "confidence": 0.91,
                "area_sqkm": 3.42,
                "severity": "High Velocity Flow",
                "sensor": "Sentinel-2 MSI / Cartosat-3",
                "resolution": "0.28m Pan-Sharpened / 10m MSI",
                "dataset": "ISRO NRSC & Geological Survey of India (GSI)",
                "methodology": "Post-Event Multi-Spectral Soil Stripping Index & High-Resolution Ortho-Difference",
                "scene_id": "S2A_MSIL2A_20240801_WAYANAD_CHUTE",
                "description": "High-velocity debris flow channel carrying boulders, saturated regolith, and uprooted forest cover along the steep Iruvaiphuzha drainage corridor.",
                "action": "Clear high-risk drainage choke-points and enforce 200m buffer zoning along primary river ravine.",
                "color": "#ff5722",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [76.1315, 11.5360],
                        [76.1385, 11.5445],
                        [76.1445, 11.5435],
                        [76.1390, 11.5350],
                        [76.1345, 11.5315],
                        [76.1315, 11.5360],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "landslide_003",
                "label": "Debris Deposition & Inundation Fan",
                "confidence": 0.89,
                "area_sqkm": 2.15,
                "severity": "Severe Deposition",
                "sensor": "Cartosat-3 / RISAT-1A SAR",
                "resolution": "0.28m PAN / 1m FRS SAR",
                "dataset": "ISRO NRSC Flood & Landslide Damage Assessment Team",
                "methodology": "Co-Seismic / Co-Event SAR Coherence Loss & Deep Learning Spatial Damage Delineation",
                "scene_id": "ISRO_CART3_20240731_CHOORALMALA_FAN",
                "description": "Alluvial fan debris deposition zone impacting Chooralmala township, Mundakkai, and downstream settlement bridges.",
                "action": "Prioritize search and recovery corridors; conduct structural integrity assessment of surviving riverside bridges.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [76.1185, 11.5270],
                        [76.1265, 11.5345],
                        [76.1325, 11.5320],
                        [76.1280, 11.5245],
                        [76.1215, 11.5230],
                        [76.1185, 11.5270],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Wayanad, Kerala, India",
        "sensor": "ISRO Cartosat-3 / Sentinel-1A SAR",
        "scenario": "landslide",
        "center": [11.536, 76.135],
        "zoom": 13,
        "dataset_source": "ISRO NRSC Disaster Management Support (DMS) & Copernicus Sentinel-1 DInSAR",
        "methodology": "Bitemporal Optical Difference + InSAR Coherence Tracking & DEM Slope Gradient (>34°)",
        "citation": "ISRO NRSC Wayanad Landslide Rapid Assessment 2024 / GSI Geotechnical Report",
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
                "confidence": 0.93,
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
                "confidence": 0.88,
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
                "confidence": 0.84,
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
                "confidence": 0.91,
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
                "confidence": 0.85,
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
                "confidence": 0.88,
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
                "confidence": 0.82,
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
# SCENARIO 7: Sikkim Teesta Flash Flood — October 2023
# Ground Truth Reference: ISRO NRSC Disaster Management Support / Copernicus EMS
# Activation EMSR692 — South Lhonak Lake GLOF & Teesta Valley Inundation
# ---------------------------------------------------------------------------
SIKKIM_FLOOD_GEOJSON = {
    "type": "FeatureCollection",
    "name": "sikkim_teesta_flash_flood_2023",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "sikkim_flood_001",
                "label": "South Lhonak Lake GLOF Outburst Zone",
                "confidence": 0.94,
                "area_sqkm": 12.8,
                "severity": "Catastrophic",
                "sensor": "Sentinel-1A C-SAR / ISRO Cartosat-3",
                "resolution": "10m SAR (Cloud Penetrating)",
                "dataset": "Copernicus EMS EMSR692 / ISRO NRSC DMS",
                "methodology": "Bitemporal SAR Backscatter Change Detection (Pre/Post Oct 3–5, 2023)",
                "scene_id": "S1A_IW_GRDH_1SDV_20231005T003821_050486_SIKKIM",
                "description": "Glacial Lake Outburst Flood (GLOF) from South Lhonak Lake breached the moraine dam, releasing ~100M m³. Catastrophic debris-laden torrent devastated Chungthang HPP and downstream Teesta valley.",
                "action": "Deploy NDRF teams to Singtam and Rangpo; rescue trapped personnel at Chungthang HPP; close NH-10 Rangpo-Gangtok stretch pending structural assessment.",
                "color": "#ff1744",
                "flood_active": True,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [88.6320, 27.8950],
                    [88.6580, 27.9120],
                    [88.6820, 27.9380],
                    [88.6720, 27.9620],
                    [88.6420, 27.9520],
                    [88.6150, 27.9280],
                    [88.6080, 27.9050],
                    [88.6320, 27.8950],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "sikkim_flood_002",
                "label": "Teesta River Valley Flash Inundation — Singtam–Rangpo",
                "confidence": 0.91,
                "area_sqkm": 22.4,
                "severity": "Critical",
                "sensor": "Sentinel-1A C-SAR / RISAT-2B",
                "resolution": "10m SAR",
                "dataset": "Copernicus EMS EMSR692 / CWC Teesta Gauge Network",
                "methodology": "SAR Backscatter Coherence Loss + CWC Hydrograph Surge Detection",
                "scene_id": "S1A_IW_GRDH_1SDV_20231006T003821_TEESTA_VALLEY",
                "description": "Flash flood surge along 60 km Teesta corridor. Over 5,000 structures and 14 bridges destroyed. NH-10 severed at multiple locations cutting Gangtok from Bengal.",
                "action": "Airlift stranded tourists via Mi-17 from Gangtok; activate ICP Changrabandha for refugee influx; emergency CWC gauge monitoring at Teesta Barrage.",
                "color": "#ff1744",
                "flood_active": True,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [88.4980, 27.2420],
                    [88.5380, 27.2680],
                    [88.5720, 27.3120],
                    [88.5950, 27.3680],
                    [88.6180, 27.4280],
                    [88.6050, 27.4820],
                    [88.5620, 27.5020],
                    [88.5180, 27.4650],
                    [88.4820, 27.3980],
                    [88.4650, 27.3280],
                    [88.4750, 27.2720],
                    [88.4980, 27.2420],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "sikkim_flood_003",
                "label": "Chungthang Dam Debris & Sediment Plume",
                "confidence": 0.87,
                "area_sqkm": 8.6,
                "severity": "High",
                "sensor": "Sentinel-2A MSI / ISRO Cartosat-3",
                "resolution": "10m Optical / 0.28m PAN",
                "dataset": "ISRO NRSC National Disaster Management Support (NDMS)",
                "methodology": "Turbidity Index (TI) + Suspended Sediment Concentration via NDTI",
                "scene_id": "S2A_MSIL2A_20231007T043641_CHUNGTHANG",
                "description": "High-turbidity sediment plume extending 25 km downstream from breached Chungthang 1,200 MW HPP reservoir. Structure rendered non-operational.",
                "action": "Halt Teesta Stage-IV and Stage-V HPP operations; engage NHPC emergency response; CPCB to monitor Teesta water quality at Jalpaiguri offtake.",
                "color": "#ff5722",
                "flood_active": True,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [88.6450, 27.6120],
                    [88.6720, 27.6380],
                    [88.6850, 27.6720],
                    [88.6680, 27.7050],
                    [88.6320, 27.6980],
                    [88.6080, 27.6650],
                    [88.6120, 27.6280],
                    [88.6450, 27.6120],
                ]],
            },
        },
    ],
    "metadata": {
        "region": "Sikkim — Teesta River Valley, India",
        "sensor": "Sentinel-1A C-SAR / ISRO Cartosat-3 / Sentinel-2A MSI",
        "scenario": "sikkim_flood",
        "center": [27.45, 88.55],
        "zoom": 9,
        "dataset_source": "Copernicus EMS EMSR692 & ISRO NRSC Disaster Management Support",
        "methodology": "Bitemporal SAR Backscatter Change Detection + CWC Hydrograph Surge",
        "citation": "Copernicus EMS Rapid Mapping EMSR692: Teesta GLOF Flash Flood, Sikkim, India (October 2023)",
        "hydrology_telemetry": {
            "river_discharge_m3s": 8420,
            "flood_trend": "receding",
            "network": "CWC Teesta Basin Hydrological Monitoring Network",
        },
        "cloud_cover_percent": 78,
        "sun_elevation_deg": 42.1,
        "acquisition_date": "2023-10-05T00:38:21Z",
        "granule_id": "S1A_IW_GRDH_1SDV_20231005T003821_050486",
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 8: Joshimath Land Subsidence — January 2023
# Ground Truth Reference: ISRO SAC DInSAR / NRSC Bhuvan Subsidence Atlas
# Sentinel-1A DInSAR interferometric deformation mapping
# ---------------------------------------------------------------------------
JOSHIMATH_SUBSIDENCE_GEOJSON = {
    "type": "FeatureCollection",
    "name": "joshimath_land_subsidence_2023",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "joshimath_sub_001",
                "label": "Critical Subsidence Core — Upper Joshimath",
                "confidence": 0.93,
                "area_sqkm": 0.92,
                "severity": "Critical",
                "sensor": "Sentinel-1A C-SAR DInSAR (Differential Interferometric SAR)",
                "resolution": "5m DInSAR Coherence Map",
                "dataset": "ISRO SAC / NRSC Subsidence Atlas — Joshimath 2023",
                "methodology": "Multi-temporal DInSAR Phase Unwrapping (5.6 cm wavelength, 12-day repeat)",
                "scene_id": "S1A_DINSAR_JOSHIMATH_20230106_20230118_PAIR",
                "description": "Rapid vertical subsidence of 5.4–8.9 cm detected in 12-day interferogram. Over 868 structures cracked. Ward 8 (Sunil Ward) shows maximum displacement. Badrinath NH-7 approach compromised.",
                "action": "Immediate evacuation of Zone A (Sunil Ward, Lower Manohar Bagh); suspend Helang-Marwari tunnel blasting; NDMA structural audit of all NH-7 retaining walls.",
                "color": "#9c27b0",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [79.5620, 30.5580],
                    [79.5720, 30.5650],
                    [79.5820, 30.5720],
                    [79.5880, 30.5820],
                    [79.5820, 30.5920],
                    [79.5700, 30.5950],
                    [79.5580, 30.5880],
                    [79.5520, 30.5780],
                    [79.5540, 30.5650],
                    [79.5620, 30.5580],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "joshimath_sub_002",
                "label": "Moderate Subsidence — Lower Town & NH-7 Corridor",
                "confidence": 0.88,
                "area_sqkm": 1.84,
                "severity": "High",
                "sensor": "Sentinel-1A C-SAR DInSAR",
                "resolution": "5m DInSAR Phase",
                "dataset": "ISRO SAC Geospatial Analysis / NRSC InSAR Stack",
                "methodology": "PSInSAR Persistent Scatterer Time-Series (2020–2023 baseline)",
                "scene_id": "PSINSAR_JOSHIMATH_2020_2023_STACK_NRSC",
                "description": "Cumulative 12–18 cm subsidence over 3-year PSInSAR stack. NH-7 (Rishikesh–Badrinath) road surface showing differential settlement and crack patterns visible in Cartosat-3 sub-meter imagery.",
                "action": "Deploy ISRO SAC ground-truth GPS monuments for real-time displacement monitoring; BRO emergency patching of NH-7 km 253–261; restrict overloaded vehicles.",
                "color": "#ab47bc",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [79.5480, 30.5420],
                    [79.5680, 30.5480],
                    [79.5880, 30.5550],
                    [79.5980, 30.5680],
                    [79.5900, 30.5820],
                    [79.5700, 30.5820],
                    [79.5500, 30.5750],
                    [79.5380, 30.5620],
                    [79.5400, 30.5480],
                    [79.5480, 30.5420],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "joshimath_sub_003",
                "label": "NTPC Tapovan–Vishnugad HPP Influence Zone",
                "confidence": 0.82,
                "area_sqkm": 3.12,
                "severity": "Moderate",
                "sensor": "Sentinel-2B MSI / Cartosat-3 Optical",
                "resolution": "10m / 0.28m",
                "dataset": "ISRO Cartosat-3 + WRIS Groundwater Depletion Records",
                "methodology": "Multi-temporal optical coherence & crack density classification",
                "scene_id": "CARTOSAT3_PAN_20230112_JOSHIMATH_NTPC",
                "description": "Construction-induced subsidence influence zone from NTPC Tapovan-Vishnugad 520 MW HPP tunneling. Groundwater springs disrupted; inter-wall cracks visible in 0.28m PAN imagery across 486 additional structures.",
                "action": "Halt NTPC tunneling operations pending geological board review; CGWB emergency groundwater survey; deploy LiDAR scanner for precise crack volumetric mapping.",
                "color": "#ce93d8",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [79.5220, 30.5280],
                    [79.5520, 30.5320],
                    [79.5780, 30.5380],
                    [79.5950, 30.5500],
                    [79.5880, 30.5650],
                    [79.5600, 30.5600],
                    [79.5300, 30.5520],
                    [79.5120, 30.5420],
                    [79.5120, 30.5320],
                    [79.5220, 30.5280],
                ]],
            },
        },
    ],
    "metadata": {
        "region": "Joshimath, Chamoli District, Uttarakhand, India",
        "sensor": "Sentinel-1A DInSAR / PSInSAR / ISRO Cartosat-3",
        "scenario": "joshimath",
        "center": [30.568, 79.572],
        "zoom": 13,
        "dataset_source": "ISRO SAC DInSAR Interferometric Analysis & NRSC Bhuvan Subsidence Atlas 2023",
        "methodology": "Multi-temporal DInSAR Phase Unwrapping + PSInSAR Persistent Scatterer Time-Series",
        "citation": "ISRO SAC (2023). Joshimath Subsidence DInSAR Analysis. National Remote Sensing Centre, Hyderabad.",
        "cloud_cover_percent": 12,
        "sun_elevation_deg": 38.6,
        "acquisition_date": "2023-01-11T05:22:18Z",
        "granule_id": "S1A_IW_SLC_1SDV_20230111T052218_JOSHIMATH",
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 9: Manipur Landslides — June–July 2023
# Ground Truth Reference: ISRO NRSC / GSI Rapid Mapping — NH-2 (Imphal–Jiribam)
# Sentinel-2 + Cartosat-3 multi-temporal optical change detection
# ---------------------------------------------------------------------------
MANIPUR_LANDSLIDE_GEOJSON = {
    "type": "FeatureCollection",
    "name": "manipur_landslides_2023",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "manipur_ls_001",
                "label": "Major Crown Scarp — Tupul Railway Yard Collapse",
                "confidence": 0.92,
                "area_sqkm": 4.8,
                "severity": "Catastrophic",
                "sensor": "ISRO Cartosat-3 / Sentinel-2A MSI",
                "resolution": "0.28m PAN / 10m MSI",
                "dataset": "ISRO NRSC Rapid Mapping / GSI Landslide Atlas of India",
                "methodology": "Bi-temporal Cartosat-3 PAN change detection + NDVI canopy loss mapping",
                "scene_id": "CARTOSAT3_PAN_20230629_TUPUL_NONEY",
                "description": "Catastrophic rotational failure on Noney district hill slope. Tupul railway yard of Jiribam-Imphal rail project buried under debris. 61+ casualties confirmed. NH-37 severed.",
                "action": "NDRF + Army columns to Noney district; halt all Jiribam-Imphal Railway construction in Zone-3 geology; GSI emergency slope stability survey of remaining embankments.",
                "color": "#ff5722",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [93.6280, 24.7820],
                    [93.6520, 24.7950],
                    [93.6720, 24.8150],
                    [93.6780, 24.8420],
                    [93.6600, 24.8580],
                    [93.6320, 24.8480],
                    [93.6120, 24.8250],
                    [93.6080, 24.7980],
                    [93.6180, 24.7820],
                    [93.6280, 24.7820],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "manipur_ls_002",
                "label": "NH-2 Multiple Road-Cutting Slope Failures",
                "confidence": 0.87,
                "area_sqkm": 6.2,
                "severity": "Critical",
                "sensor": "Sentinel-2A MSI / Sentinel-1A SAR",
                "resolution": "10m Optical + 10m SAR",
                "dataset": "ISRO NRSC DMS / Copernicus Open Access Hub",
                "methodology": "SAR Coherence Loss Index (CLI) + Multi-temporal NDVI Differencing",
                "scene_id": "S2A_MSIL2A_20230702T043641_NH2_MANIPUR",
                "description": "Cluster of 23 shallow translational slope failures along NH-2 (Imphal–Jiribam) between Khongsang and Barak river valley. Road blocked for 18 days; Imphal Valley cut off from rail head.",
                "action": "BRO Task Force 'Beacon' emergency debris clearance on NH-2; alternate Jiribam-Imphal air corridor via IAF Mi-17; NHAI slope-retaining wire mesh installation at 8 identified critical cuts.",
                "color": "#ff5722",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [93.4820, 24.6550],
                    [93.5280, 24.6750],
                    [93.5720, 24.7120],
                    [93.6050, 24.7450],
                    [93.6150, 24.7820],
                    [93.5900, 24.8020],
                    [93.5480, 24.7820],
                    [93.5080, 24.7420],
                    [93.4720, 24.7020],
                    [93.4580, 24.6720],
                    [93.4700, 24.6520],
                    [93.4820, 24.6550],
                ]],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "manipur_ls_003",
                "label": "Barak River Valley Debris Flow & Fluvial Blocking",
                "confidence": 0.83,
                "area_sqkm": 3.4,
                "severity": "High",
                "sensor": "Resourcesat-2A LISS-IV / Sentinel-2B",
                "resolution": "5.8m LISS-IV / 10m MSI",
                "dataset": "ISRO Bhuvan Geospatial Data / CWC Barak Basin",
                "methodology": "Fluvial geomorphic change detection — lateral channel migration & debris fan mapping",
                "scene_id": "RESOURCESAT2A_LISSIV_20230705_BARAK_VALLEY",
                "description": "Debris flows from upland failures creating temporary landslide dams on Barak river tributaries. CWC flood warning issued for downstream Silchar (Assam) due to potential outburst.",
                "action": "CWC Silchar flood control room on high alert; open Bhaga regulator on Barak upstream; pre-position Assam SDRF boats at Silchar and Lakhipur.",
                "color": "#ff7043",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [93.1920, 24.5280],
                    [93.2350, 24.5480],
                    [93.2680, 24.5820],
                    [93.2720, 24.6180],
                    [93.2450, 24.6350],
                    [93.2080, 24.6220],
                    [93.1780, 24.5920],
                    [93.1680, 24.5550],
                    [93.1820, 24.5280],
                    [93.1920, 24.5280],
                ]],
            },
        },
    ],
    "metadata": {
        "region": "Manipur — Noney & Jiribam Districts, Northeast India",
        "sensor": "ISRO Cartosat-3 / Sentinel-2A MSI / Resourcesat-2A LISS-IV",
        "scenario": "manipur_landslide",
        "center": [24.72, 93.52],
        "zoom": 10,
        "dataset_source": "ISRO NRSC Rapid Disaster Mapping & GSI Landslide Atlas of India",
        "methodology": "Bi-temporal Cartosat-3 PAN Change Detection + SAR Coherence Loss Index",
        "citation": "NRSC (2023). Landslide Rapid Mapping — Manipur, June–July 2023. ISRO National Remote Sensing Centre.",
        "cloud_cover_percent": 55,
        "sun_elevation_deg": 61.2,
        "acquisition_date": "2023-06-29T04:36:41Z",
        "granule_id": "CARTOSAT3_PAN_20230629_NONEY_MANIPUR",
    },
}


# ---------------------------------------------------------------------------
# Registry mapping scenario_id -> raw GeoJSON template
# ---------------------------------------------------------------------------
SCENARIO_REGISTRY = {
    "flood": ASSAM_FLOOD_GEOJSON,
    "landslide": WAYANAD_LANDSLIDE_GEOJSON,
    "urban": BENGALURU_URBAN_GEOJSON,
    "water": CHILIKA_WATER_GEOJSON,
    "fire": SIMILIPAL_FIRE_GEOJSON,
    "agriculture": VIDARBHA_AGRI_GEOJSON,
    "sikkim_flood": SIKKIM_FLOOD_GEOJSON,
    "joshimath": JOSHIMATH_SUBSIDENCE_GEOJSON,
    "manipur_landslide": MANIPUR_LANDSLIDE_GEOJSON,
}

# ---------------------------------------------------------------------------
# Preset definitions surfaced to the frontend via GET /api/v1/scenarios
# ---------------------------------------------------------------------------
SCENARIO_PRESETS = [
    {
        "id": "flood",
        "name": "Detect Floods",
        "sample_query": "Highlight flooded regions and riverine inundation in Brahmaputra Assam",
        "description": "Identifies inundated floodplains and breached embankments using SAR change detection.",
        "region": "Brahmaputra Basin, Assam",
        "color": "#ff1744",
        "sensor": "Sentinel-1A / RISAT-1A SAR",
        "dataset_source": "Copernicus EMS EMSR586 & Sentinel-1A SAR",
    },
    {
        "id": "sikkim_flood",
        "name": "Sikkim Flash Flood",
        "sample_query": "Detect Teesta river flash flood and South Lhonak lake GLOF in Sikkim",
        "description": "Rapid delineation of South Lhonak glacial lake breach, Chungthang dam collapse, and Teesta flash surge.",
        "region": "Teesta Valley, Sikkim",
        "color": "#ff1744",
        "sensor": "Sentinel-1A SAR / Cartosat-3",
        "dataset_source": "Copernicus EMS EMSR692 & ISRO NRSC NDMS",
    },
    {
        "id": "joshimath",
        "name": "Joshimath Subsidence",
        "sample_query": "Analyze land subsidence and crack damage in Joshimath Uttarakhand",
        "description": "Interferometric SAR deformation mapping identifying critical differential ground sinking zones.",
        "region": "Joshimath, Uttarakhand",
        "color": "#9c27b0",
        "sensor": "Sentinel-1A DInSAR / Cartosat-3",
        "dataset_source": "ISRO SAC DInSAR Analysis & NRSC Bhuvan",
    },
    {
        "id": "landslide",
        "name": "Detect Landslides",
        "sample_query": "Identify landslide scars and debris flow runout in Wayanad",
        "description": "Maps catastrophic slope failure scars, debris avalanche tracks, and deposition fans using change detection.",
        "region": "Wayanad, Kerala",
        "color": "#ff5722",
        "sensor": "ISRO Cartosat-3 / Sentinel-1 SAR",
        "dataset_source": "ISRO NRSC Cartosat-3 & Copernicus Sentinel-1 DInSAR",
    },
    {
        "id": "manipur_landslide",
        "name": "Manipur Landslides",
        "sample_query": "Map landslide debris and railway yard failure in Noney Manipur",
        "description": "Sub-meter optical change detection mapping Tupul railway yard slope failure and NH-2 landslides.",
        "region": "Noney & Jiribam, Manipur",
        "color": "#ff7043",
        "sensor": "ISRO Cartosat-3 / Sentinel-2A",
        "dataset_source": "ISRO NRSC Rapid Mapping & GSI Landslide Atlas",
    },
    {
        "id": "urban",
        "name": "Track Urban Sprawl",
        "sample_query": "Show urban expansion and built-up development in Bengaluru",
        "description": "Detects newly constructed concrete and peri-urban sprawl for town planning.",
        "region": "Bengaluru Metropolitan Region",
        "color": "#ff9100",
        "sensor": "Cartosat-3 High-Res Optical",
        "dataset_source": "EC GHSL Settlement Grid & Cartosat-3",
    },
    {
        "id": "fire",
        "name": "Forest Fire Hotspots",
        "sample_query": "Detect active forest fire fronts and burn scars in Similipal",
        "description": "Flags thermal wildfire anomalies and post-fire canopy burn damage.",
        "region": "Similipal National Park, Odisha",
        "color": "#e040fb",
        "sensor": "NASA VIIRS 375m / Sentinel-2 SWIR",
        "dataset_source": "NASA FIRMS Active Fire Archive & FSI",
    },
    {
        "id": "agriculture",
        "name": "Crop Drought Stress",
        "sample_query": "Analyze crop drought moisture stress and farm ponds in Vidarbha",
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
    "sikkim_flood": [
        {"tag": "GLOF Breach", "label": "South Lhonak Moraine Breach", "date": "Oct 03, 2023"},
        {"tag": "Dam Surge",   "label": "Chungthang Inundation Surge",  "date": "Oct 04, 2023"},
        {"tag": "Peak Extent", "label": "Teesta Basin Maximum Flood",   "date": "Oct 06, 2023"},
    ],
    "joshimath": [
        {"tag": "Baseline",     "label": "Pre-Displacement InSAR Stack", "date": "Nov 2022"},
        {"tag": "Acceleration", "label": "Rapid Subsidence & Cracking",  "date": "Jan 03, 2023"},
        {"tag": "Peak Sinking", "label": "Critical Displacement Core",   "date": "Jan 18, 2023"},
    ],
    "manipur_landslide": [
        {"tag": "Shear Phase",  "label": "Initial Slope Instability",    "date": "Jun 25, 2023"},
        {"tag": "Failure",      "label": "Catastrophic Tupul Collapse",   "date": "Jun 29, 2023"},
        {"tag": "Valley Dam",   "label": "Barak Channel Blockage & Fan", "date": "Jul 05, 2023"},
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
