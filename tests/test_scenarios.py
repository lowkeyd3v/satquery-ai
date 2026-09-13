import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, r"c:\My Imp Files\My Projects\satquery-ai\backend")

from fastapi.testclient import TestClient
from main import app
from spatial_data import SCENARIO_PRESETS

client = TestClient(app)

print("=" * 70)
print("TEST 1: ALL 8 PRESET DROPDOWN SCENARIOS (request.scenario_id + sample_query)")
print("=" * 70)

all_preset_passed = True
for preset in SCENARIO_PRESETS:
    pid = preset["id"]
    query = preset["sample_query"]
    expected_region = preset["region"]

    resp = client.post("/api/v1/query", json={"query": query, "scenario_id": pid})
    if resp.status_code != 200:
        print(f"[FAIL] {pid}: HTTP {resp.status_code} - {resp.text}")
        all_preset_passed = False
        continue

    data = resp.json()
    mode = data.get("mode")
    geojson = data.get("geojson", {})
    meta = geojson.get("metadata", {})
    actual_region = meta.get("region", "")
    center = meta.get("center", [0, 0])
    features = geojson.get("features", [])

    is_india = (8 <= center[0] <= 37) and (68 <= center[1] <= 98)
    passed = (mode == "calibrated") and (len(features) > 0) and is_india

    status_str = "PASS" if passed else "FAIL"
    if not passed:
        all_preset_passed = False
    print(f"[{status_str}] Preset: {pid:18} | Mode: {mode:10} | Region: {actual_region} | Center: {center} | Features: {len(features)}")

print(f"\nPreset Test Result: {'ALL PASSED!' if all_preset_passed else 'SOME FAILED!'}\n")

print("=" * 70)
print("TEST 2: DYNAMIC NATURAL LANGUAGE QUERIES (NO scenario_id)")
print("=" * 70)

dynamic_queries = [
    # Generic queries with no location token (should fall back to calibrated preset, NOT geocode "this tile")
    ("Highlight flooded regions in this tile", "flood", "Assam"),
    ("Show urban expansion and built-up development", "urban", "Bengaluru"),
    ("Detect active forest fire fronts and burn scars", "fire", "Similipal"),
    ("Analyze crop drought moisture stress and farm ponds", "agriculture", "Vidarbha"),

    # Explicit locations
    ("Water bodies in gorakhpur", "water", "Gorakhpur"),
    ("Floods in assam", "flood", "Assam"),
    ("Floods in punjab", "flood", "Punjab"),
    ("Identify landslide scars and debris flow runout in Wayanad", "landslide", "Wayanad"),
    ("Analyze land subsidence and crack damage in Joshimath Uttarakhand", "joshimath", "Joshimath"),
    ("Detect Teesta river flash flood and South Lhonak lake GLOF in Sikkim", "sikkim_flood", "Sikkim"),
    ("Map landslide debris and railway yard failure in Noney Manipur", "manipur_landslide", "Noney"),
]

all_dynamic_passed = True
for query, expected_scenario, expected_location_kw in dynamic_queries:
    resp = client.post("/api/v1/query", json={"query": query})
    if resp.status_code != 200:
        print(f"[FAIL] '{query}': HTTP {resp.status_code} - {resp.text}")
        all_dynamic_passed = False
        continue

    data = resp.json()
    mode = data.get("mode")
    sid = data.get("scenario_id")
    geojson = data.get("geojson", {})
    meta = geojson.get("metadata", {})
    actual_region = meta.get("region", "")
    center = meta.get("center", [0, 0])
    features = geojson.get("features", [])

    is_india = (8 <= center[0] <= 37) and (68 <= center[1] <= 98)
    kw_match = expected_location_kw.lower() in actual_region.lower()
    scenario_match = (sid == expected_scenario)
    passed = is_india and kw_match and scenario_match and (len(features) > 0)

    if not passed:
        all_dynamic_passed = False
    status_str = "PASS" if passed else "FAIL"
    print(f"[{status_str}] Query: '{query}'")
    print(f"       -> Scenario: {sid} | Mode: {mode} | Region: {actual_region} | Center: {center} | Features: {len(features)}")

print(f"\nDynamic Query Test Result: {'ALL PASSED!' if all_dynamic_passed else 'SOME FAILED!'}\n")
