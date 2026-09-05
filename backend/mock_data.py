"""
mock_data.py
--------------------------------------------------------------------------
SatQuery AI | SIH26167 | ISRO
--------------------------------------------------------------------------
Pre-configured, hand-tuned GeoJSON FeatureCollections used as the
Mock/Fallback inference mode. These represent three realistic Indian
remote-sensing scenarios that the frontend can render immediately without
any GPU or model weights being present.

Each Feature carries a `properties` block with:
    - label        : scenario classification label
    - confidence    : simulated model confidence score (0-1)
    - area_sqkm     : approximate polygon area in square kilometers
    - description   : human readable caption for the popup / metrics panel
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
                "label": "Flooded Zone",
                "confidence": 0.94,
                "area_sqkm": 42.7,
                "description": "Severe inundation detected along the Brahmaputra floodplain near Majuli island.",
                "color": "#ff1744",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [94.1450, 26.9700],
                        [94.2200, 26.9700],
                        [94.2200, 27.0250],
                        [94.1450, 27.0250],
                        [94.1450, 26.9700],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "flood_002",
                "label": "Flooded Zone",
                "confidence": 0.88,
                "area_sqkm": 27.3,
                "description": "Waterlogged agricultural fields near Dibrugarh district embankment breach.",
                "color": "#ff1744",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [94.9000, 27.4600],
                        [94.9600, 27.4600],
                        [94.9600, 27.5050],
                        [94.9000, 27.5050],
                        [94.9000, 27.4600],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "flood_003",
                "label": "Flooded Zone",
                "confidence": 0.79,
                "area_sqkm": 15.9,
                "description": "Moderate flooding signature detected near Kaziranga National Park buffer zone.",
                "color": "#ff1744",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [93.3500, 26.5700],
                        [93.4100, 26.5700],
                        [93.4100, 26.6100],
                        [93.3500, 26.6100],
                        [93.3500, 26.5700],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Assam, India",
        "sensor": "Sentinel-1 SAR (simulated)",
        "scenario": "flood",
        "center": [26.9, 94.2],
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
                "label": "Urban Expansion",
                "confidence": 0.91,
                "area_sqkm": 18.4,
                "description": "New built-up land cover detected along the Electronic City IT corridor.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.6600, 12.8300],
                        [77.7100, 12.8300],
                        [77.7100, 12.8700],
                        [77.6600, 12.8700],
                        [77.6600, 12.8300],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "urban_002",
                "label": "Urban Expansion",
                "confidence": 0.86,
                "area_sqkm": 22.1,
                "description": "Rapid horizontal sprawl observed near Whitefield-Sarjapur growth axis.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.7300, 12.9350],
                        [77.7900, 12.9350],
                        [77.7900, 12.9800],
                        [77.7300, 12.9800],
                        [77.7300, 12.9350],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "urban_003",
                "label": "Urban Expansion",
                "confidence": 0.82,
                "area_sqkm": 12.6,
                "description": "New residential layout construction detected near Devanahalli, close to KIA airport.",
                "color": "#ff9100",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [77.6900, 13.2100],
                        [77.7300, 13.2100],
                        [77.7300, 13.2450],
                        [77.6900, 13.2450],
                        [77.6900, 13.2100],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Bengaluru, Karnataka, India",
        "sensor": "Cartosat-3 optical (simulated)",
        "scenario": "urban",
        "center": [12.97, 77.59],
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
                "label": "Water Body",
                "confidence": 0.97,
                "area_sqkm": 116.5,
                "description": "Main open-water lagoon extent of Chilika Lake, Asia's largest brackish water lagoon.",
                "color": "#00e676",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [85.2000, 19.6500],
                        [85.4200, 19.6500],
                        [85.4200, 19.8200],
                        [85.2000, 19.8200],
                        [85.2000, 19.6500],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "water_002",
                "label": "Water Body",
                "confidence": 0.93,
                "area_sqkm": 8.2,
                "description": "Nalabana Bird Sanctuary wetland core zone, seasonal water spread detected.",
                "color": "#00e676",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [85.3400, 19.7200],
                        [85.3800, 19.7200],
                        [85.3800, 19.7500],
                        [85.3400, 19.7500],
                        [85.3400, 19.7200],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "id": "water_003",
                "label": "Water Body",
                "confidence": 0.85,
                "area_sqkm": 4.6,
                "description": "Satapada channel connecting the lagoon to the Bay of Bengal, tidal inlet detected.",
                "color": "#00e676",
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [85.4500, 19.5700],
                        [85.4900, 19.5700],
                        [85.4900, 19.6000],
                        [85.4500, 19.6000],
                        [85.4500, 19.5700],
                    ]
                ],
            },
        },
    ],
    "metadata": {
        "region": "Chilika Lake, Odisha, India",
        "sensor": "Resourcesat-2A LISS-IV (simulated)",
        "scenario": "water",
        "center": [19.71, 85.32],
        "zoom": 10,
    },
}


# ---------------------------------------------------------------------------
# Registry mapping scenario_id -> raw GeoJSON template
# ---------------------------------------------------------------------------
SCENARIO_REGISTRY = {
    "flood": ASSAM_FLOOD_GEOJSON,
    "urban": BENGALURU_URBAN_GEOJSON,
    "water": CHILIKA_WATER_GEOJSON,
}

# ---------------------------------------------------------------------------
# Preset definitions surfaced to the frontend via GET /api/v1/scenarios
# ---------------------------------------------------------------------------
SCENARIO_PRESETS = [
    {
        "id": "flood",
        "name": "Detect Floods",
        "sample_query": "Highlight flooded regions in this tile",
        "description": "Identifies inundated land and waterlogged terrain using SAR-based change detection.",
        "region": "Assam, India",
        "color": "#ff1744",
    },
    {
        "id": "urban",
        "name": "Track Urban Sprawl",
        "sample_query": "Show urban expansion over the last observation window",
        "description": "Flags newly built-up land cover indicating metropolitan growth.",
        "region": "Bengaluru, India",
        "color": "#ff9100",
    },
    {
        "id": "water",
        "name": "Monitor Water Bodies",
        "sample_query": "Segment all major water bodies in this scene",
        "description": "Delineates lakes, lagoons, and wetland water spread extent.",
        "region": "Chilika Lake, Odisha, India",
        "color": "#00e676",
    },
]


def get_scenario_geojson(scenario_id: str) -> dict:
    """
    Return a fresh deep copy of the GeoJSON FeatureCollection for a given
    scenario_id. A deep copy is returned so that callers may safely mutate
    the result (e.g. stamping a query_timestamp) without corrupting the
    shared in-memory template.
    """
    template = SCENARIO_REGISTRY.get(scenario_id)
    if template is None:
        return {
            "type": "FeatureCollection",
            "name": "empty_result",
            "features": [],
            "metadata": {
                "region": "Unknown",
                "sensor": "N/A",
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
