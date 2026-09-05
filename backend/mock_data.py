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
# ---------------------------------------------------------------------------
ASSAM_FLOOD_GEOJSON = {
    "type": "FeatureCollection",
    "name": "assam_flood_zones",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "flood_001",
                "label": "Severe Inundation",
                "confidence": 0.96,
                "area_sqkm": 48.2,
                "severity": "Critical",
                "sensor": "Sentinel-1 C-SAR / RISAT-1A",
                "resolution": "10m SAR (Cloud Penetrating)",
                "description": "Severe riverine inundation detected along the Brahmaputra floodplain near Majuli island.",
                "action": "Dispatch NDRF Boat Teams to Majuli Sector 3; prioritize medical evacuation.",
                "color": "#ff1744",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [94.1200, 26.9400],
                        [94.1650, 26.9620],
                        [94.2150, 26.9580],
                        [94.2480, 26.9850],
                        [94.2250, 27.0280],
                        [94.1750, 27.0350],
                        [94.1320, 27.0080],
                        [94.1080, 26.9650],
                        [94.1200, 26.9400],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "flood_002",
                "label": "Agricultural Waterlogging",
                "confidence": 0.89,
                "area_sqkm": 31.4,
                "severity": "High",
                "sensor": "Sentinel-1 C-SAR / RISAT-1A",
                "resolution": "10m SAR",
                "description": "Waterlogged paddy fields and breached dykes near Dibrugarh district embankments.",
                "action": "Reinforce vulnerable dyke embankments; notify State Disaster Management Authority (SDMA).",
                "color": "#ff1744",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [94.8850, 27.4450],
                        [94.9350, 27.4580],
                        [94.9780, 27.4820],
                        [94.9620, 27.5250],
                        [94.9150, 27.5180],
                        [94.8720, 27.4800],
                        [94.8850, 27.4450],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "flood_003",
                "label": "Wetland Inundation",
                "confidence": 0.84,
                "area_sqkm": 19.5,
                "severity": "Moderate",
                "sensor": "Cartosat-2E / Sentinel-1",
                "resolution": "2m Optical / 10m SAR",
                "description": "Seasonal flood pulse inundating Kaziranga National Park southern wildlife corridors.",
                "action": "Enforce highway speed restrictions along NH-715 for wildlife crossing.",
                "color": "#ff1744",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [93.3200, 26.5500],
                        [93.3750, 26.5650],
                        [93.4250, 26.5820],
                        [93.4100, 26.6250],
                        [93.3600, 26.6180],
                        [93.3150, 26.5850],
                        [93.3200, 26.5500],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Assam, Brahmaputra Valley, India",
        "sensor": "Sentinel-1 SAR / RISAT-1A (simulated)",
        "scenario": "flood",
        "center": [26.95, 94.2],
        "zoom": 8,
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 2: Urban Expansion — Bengaluru Metropolitan Region
# ---------------------------------------------------------------------------
BENGALURU_URBAN_GEOJSON = {
    "type": "FeatureCollection",
    "name": "bengaluru_urban_expansion",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "urban_001",
                "label": "Commercial & Tech Corridor Sprawl",
                "confidence": 0.93,
                "area_sqkm": 21.8,
                "severity": "Rapid Growth",
                "sensor": "Cartosat-3 High-Resolution Optical",
                "resolution": "0.28m PAN / 1.12m MX",
                "description": "High-density commercial built-up expansion along the Electronic City Phase 2 corridor.",
                "action": "Update BDA master plan zoning; verify stormwater drainage buffer compliance.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.6450, 12.8200],
                        [77.6950, 12.8280],
                        [77.7250, 12.8550],
                        [77.7180, 12.8850],
                        [77.6720, 12.8780],
                        [77.6400, 12.8500],
                        [77.6450, 12.8200],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "urban_002",
                "label": "Horizontal Residential Sprawl",
                "confidence": 0.88,
                "area_sqkm": 26.4,
                "severity": "Moderate Growth",
                "sensor": "Cartosat-3 / Resourcesat-2A",
                "resolution": "0.5m Optical",
                "description": "Rapid peri-urban layout conversions observed along the Whitefield-Sarjapur growth axis.",
                "action": "Audit lake buffer encroachments; integrate with BBMP property tax registry.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.7150, 12.9250],
                        [77.7750, 12.9320],
                        [77.8100, 12.9650],
                        [77.7920, 12.9950],
                        [77.7400, 12.9880],
                        [77.7080, 12.9550],
                        [77.7150, 12.9250],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "urban_003",
                "label": "Airport Aerotropolis Development",
                "confidence": 0.85,
                "area_sqkm": 16.3,
                "severity": "Planned Infrastructure",
                "sensor": "Cartosat-3 Optical",
                "resolution": "0.28m PAN",
                "description": "Logistics hub and residential township construction detected near Devanahalli KIA.",
                "action": "Cross-reference with KIADB industrial corridor allocations.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.6750, 13.1950],
                        [77.7250, 13.2050],
                        [77.7500, 13.2380],
                        [77.7320, 13.2620],
                        [77.6850, 13.2550],
                        [77.6620, 13.2200],
                        [77.6750, 13.1950],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Bengaluru Metropolitan Region, Karnataka, India",
        "sensor": "Cartosat-3 Optical (simulated)",
        "scenario": "urban",
        "center": [12.97, 77.64],
        "zoom": 10,
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 3: Water Bodies — Chilika Lake, Odisha
# ---------------------------------------------------------------------------
CHILIKA_WATER_GEOJSON = {
    "type": "FeatureCollection",
    "name": "chilika_lake_water_bodies",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "water_001",
                "label": "Brackish Water Lagoon Core",
                "confidence": 0.98,
                "area_sqkm": 128.4,
                "severity": "Stable Extent",
                "sensor": "Resourcesat-2A LISS-IV / Sentinel-2",
                "resolution": "5.8m Multispectral",
                "description": "Main open-water body of Chilika Lake, Asia's largest coastal wetland ecosystem.",
                "action": "Feed water-spread metrics to Chilika Development Authority (CDA) salinity tracker.",
                "color": "#00e676",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [85.1800, 19.6200],
                        [85.2850, 19.6450],
                        [85.3900, 19.6950],
                        [85.4500, 19.7800],
                        [85.4200, 19.8450],
                        [85.3100, 19.8350],
                        [85.2150, 19.7700],
                        [85.1600, 19.6900],
                        [85.1800, 19.6200],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "water_002",
                "label": "Wetland Wildlife Sanctuary",
                "confidence": 0.94,
                "area_sqkm": 14.8,
                "severity": "Protected Zone",
                "sensor": "Resourcesat-2A LISS-IV",
                "resolution": "5.8m Multispectral",
                "description": "Nalabana Bird Sanctuary core wetland zone, seasonal bird-feeding flats.",
                "action": "Monitor aquatic weed infestation (Eichhornia) to preserve migratory bird habitat.",
                "color": "#00e676",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [85.3250, 19.7050],
                        [85.3750, 19.7180],
                        [85.3950, 19.7480],
                        [85.3650, 19.7650],
                        [85.3200, 19.7450],
                        [85.3250, 19.7050],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "water_003",
                "label": "Tidal Estuarine Channel",
                "confidence": 0.89,
                "area_sqkm": 9.2,
                "severity": "Active Inlet",
                "sensor": "Sentinel-2 MSI",
                "resolution": "10m Optical",
                "description": "Satapada sea-mouth connecting the Chilika lagoon to the Bay of Bengal.",
                "action": "Assess littoral drift siltation to maintain natural tidal flushing.",
                "color": "#00e676",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [85.4350, 19.5550],
                        [85.4850, 19.5700],
                        [85.5100, 19.6150],
                        [85.4750, 19.6280],
                        [85.4300, 19.5900],
                        [85.4350, 19.5550],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Chilika Lake, Odisha, India",
        "sensor": "Resourcesat-2A LISS-IV (simulated)",
        "scenario": "water",
        "center": [19.72, 85.34],
        "zoom": 10,
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 4: Forest Fire & Burn Scars — Similipal Biosphere / Uttarakhand
# ---------------------------------------------------------------------------
SIMILIPAL_FIRE_GEOJSON = {
    "type": "FeatureCollection",
    "name": "forest_fire_hotspots",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "id": "fire_001",
                "label": "Active Forest Fire Front",
                "confidence": 0.95,
                "area_sqkm": 14.2,
                "severity": "Emergency",
                "sensor": "Oceansat-3 / MODIS Thermal IR",
                "resolution": "375m Thermal / 30m Optical",
                "description": "Intense thermal anomaly and active wildfire front advancing through dry deciduous forest.",
                "action": "Alert Odisha Forest Department and mobilize air-drop fire suppression teams.",
                "color": "#e040fb",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [86.2800, 21.8400],
                        [86.3350, 21.8550],
                        [86.3650, 21.8900],
                        [86.3400, 21.9250],
                        [86.2900, 21.9150],
                        [86.2650, 21.8700],
                        [86.2800, 21.8400],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "fire_002",
                "label": "Recent Burn Scar",
                "confidence": 0.91,
                "area_sqkm": 28.6,
                "severity": "High Post-Fire Damage",
                "sensor": "Sentinel-2 NBR (Normalized Burn Ratio)",
                "resolution": "20m SWIR/NIR",
                "description": "Extensive canopy burn scar with high char index and complete understory loss.",
                "action": "Deploy soil erosion barriers prior to monsoon; initiate reforestation audit.",
                "color": "#e040fb",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [86.3800, 21.7500],
                        [86.4400, 21.7650],
                        [86.4750, 21.8100],
                        [86.4350, 21.8450],
                        [86.3750, 21.8300],
                        [86.3500, 21.7850],
                        [86.3800, 21.7500],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Similipal National Park, Odisha, India",
        "sensor": "Oceansat-3 / Sentinel-2 SWIR (simulated)",
        "scenario": "fire",
        "center": [21.85, 86.35],
        "zoom": 10,
    },
}


# ---------------------------------------------------------------------------
# SCENARIO 5: Agricultural Crop Stress & Drought — Vidarbha, Maharashtra
# ---------------------------------------------------------------------------
VIDARBHA_AGRI_GEOJSON = {
    "type": "FeatureCollection",
    "name": "vidarbha_crop_drought_stress",
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
                "description": "Vegetation Condition Index (VCI) below 25% indicating severe soybean/cotton moisture stress.",
                "action": "Trigger Pradhan Mantri Fasal Bima Yojana (PMFBY) drought relief assessment.",
                "color": "#ffd600",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.6500, 20.8200],
                        [77.7400, 20.8350],
                        [77.8100, 20.8800],
                        [77.7850, 20.9400],
                        [77.7100, 20.9350],
                        [77.6400, 20.8850],
                        [77.6500, 20.8200],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "agri_002",
                "label": "Depleted Irrigation Reservoir",
                "confidence": 0.87,
                "area_sqkm": 18.7,
                "severity": "Low Water Storage",
                "sensor": "Sentinel-1 SAR / Cartosat-2",
                "resolution": "10m SAR",
                "description": "Agricultural surface farm pond storage reduced to 15% of historical seasonal median.",
                "action": "Prioritize canal water release from Upper Wardha reservoir.",
                "color": "#ffd600",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.8200, 20.9600],
                        [77.8800, 20.9750],
                        [77.9150, 21.0150],
                        [77.8750, 21.0400],
                        [77.8250, 21.0250],
                        [77.8200, 20.9600],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Vidarbha Region, Maharashtra, India",
        "sensor": "Resourcesat-2A AWiFS / Sentinel-2 (simulated)",
        "scenario": "agriculture",
        "center": [20.91, 77.78],
        "zoom": 9,
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
        "sensor": "Sentinel-1 / RISAT-1A SAR",
    },
    {
        "id": "urban",
        "name": "Track Urban Sprawl",
        "sample_query": "Show urban expansion and built-up development",
        "description": "Detects newly constructed concrete and peri-urban sprawl for town planning.",
        "region": "Bengaluru Metropolitan Region",
        "color": "#ff9100",
        "sensor": "Cartosat-3 High-Res Optical",
    },
    {
        "id": "water",
        "name": "Monitor Water Bodies",
        "sample_query": "Segment all major lakes and water spread extent",
        "description": "Delineates lakes, coastal lagoons, and wetland water-spread boundaries.",
        "region": "Chilika Lake, Odisha",
        "color": "#00e676",
        "sensor": "Resourcesat-2A LISS-IV",
    },
    {
        "id": "fire",
        "name": "Forest Fire Hotspots",
        "sample_query": "Detect active forest fire fronts and burn scars",
        "description": "Flags thermal wildfire anomalies and post-fire canopy burn damage.",
        "region": "Similipal National Park, Odisha",
        "color": "#e040fb",
        "sensor": "Oceansat-3 / Sentinel-2 SWIR",
    },
    {
        "id": "agriculture",
        "name": "Crop Drought Stress",
        "sample_query": "Analyze crop drought moisture stress and farm ponds",
        "description": "Maps agricultural vegetation moisture deficit and depleted reservoirs.",
        "region": "Vidarbha, Maharashtra",
        "color": "#ffd600",
        "sensor": "Resourcesat-2A AWiFS / NDVI",
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
