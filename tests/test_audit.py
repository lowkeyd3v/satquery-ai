import sys
import io
from pathlib import Path

sys.path.insert(0, r"c:\My Imp Files\My Projects\satquery-ai\backend")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

results = []

def record(test_name, passed, detail=""):
    results.append((test_name, passed, detail))
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {test_name}: {detail}")

print("=" * 70)
print("AUDITING SATQUERY AI ENDPOINTS & DEFENSIVE RESILIENCE")
print("=" * 70)

# 1. Health check endpoint
try:
    r = client.get("/api/v1/health")
    passed = r.status_code == 200 and r.json().get("status") == "ok"
    record("Health Check", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Health Check", False, str(e))

# 2. Scenarios list endpoint
try:
    r = client.get("/api/v1/scenarios")
    scenarios = r.json().get("scenarios", [])
    passed = r.status_code == 200 and len(scenarios) == 8
    record("Scenarios List", passed, f"Returned {len(scenarios)} scenarios")
except Exception as e:
    record("Scenarios List", False, str(e))

# 3. Temporal endpoints for all 8 presets
for s in ["flood", "sikkim_flood", "joshimath", "landslide", "manipur_landslide", "urban", "fire", "agriculture"]:
    try:
        r = client.get(f"/api/v1/temporal/{s}")
        data = r.json()
        snapshots = data.get("snapshots", [])
        passed = r.status_code == 200 and len(snapshots) == 3
        record(f"Temporal Snapshot: {s}", passed, f"{len(snapshots)} steps returned")
    except Exception as e:
        record(f"Temporal Snapshot: {s}", False, str(e))

# 4. Temporal path traversal / injection resistance
try:
    r = client.get("/api/v1/temporal/../../etc/passwd")
    passed = r.status_code in [404, 400]
    record("Temporal Path Traversal Check", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Temporal Path Traversal Check", False, str(e))

# 5. Location search input boundaries
try:
    # Too short (<2 chars)
    r = client.get("/api/v1/search/location?q=a")
    passed = r.status_code == 400
    record("Location Search Short Query (<2 chars)", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Location Search Short Query", False, str(e))

try:
    # XSS injection attempt in location search
    r = client.get("/api/v1/search/location?q=<script>alert(1)</script>")
    # Should safely return 404 (not found) or 400, never execute or crash
    passed = r.status_code in [404, 400]
    record("Location Search XSS payload handling", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Location Search XSS payload handling", False, str(e))

# 6. Main Query validation
try:
    # Empty query
    r = client.post("/api/v1/query", json={"query": ""})
    passed = r.status_code == 422  # Pydantic min_length=1 validation
    record("Empty Query Validation", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Empty Query Validation", False, str(e))

try:
    # Query exceeding max length (>500 chars)
    r = client.post("/api/v1/query", json={"query": "flood " * 150})
    passed = r.status_code == 422  # Pydantic max_length=500
    record("Oversized Query Validation (>500 chars)", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Oversized Query Validation", False, str(e))

try:
    # Invalid scenario_id injection
    r = client.post("/api/v1/query", json={"query": "flood", "scenario_id": "../evil_scenario"})
    passed = r.status_code == 400
    record("Invalid scenario_id rejection", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Invalid scenario_id rejection", False, str(e))

try:
    # Script tag in query string
    r = client.post("/api/v1/query", json={"query": "<script>alert('xss')</script> flood"})
    passed = r.status_code == 200
    # Output should not crash
    record("XSS in Query Body", passed, f"Status: {r.status_code}, Mode: {r.json().get('mode')}")
except Exception as e:
    record("XSS in Query Body", False, str(e))

try:
    # Nonsense query unsupported domain check
    r = client.post("/api/v1/query", json={"query": "order a pizza to my house"})
    data = r.json()
    passed = r.status_code == 200 and data.get("mode") == "unsupported" and data.get("scenario_id") == "unknown"
    record("Unsupported domain query graceful handling", passed, f"Mode: {data.get('mode')}, Scenario: {data.get('scenario_id')}")
except Exception as e:
    record("Unsupported domain query graceful handling", False, str(e))

# 7. File Upload Endpoint security & validation
try:
    # Disallowed file type (.exe)
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    r = client.post(
        "/api/v1/upload-query",
        data={"query": "Detect floods"},
        files={"file": ("malicious.exe", fake_exe, "application/x-msdownload")},
    )
    passed = r.status_code == 415  # Unsupported Media Type
    record("Upload rejection of executable (.exe)", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Upload rejection of executable", False, str(e))

try:
    # Disallowed script file (.sh / .py)
    fake_script = io.BytesIO(b"#!/bin/bash\necho pwned")
    r = client.post(
        "/api/v1/upload-query",
        data={"query": "Detect floods"},
        files={"file": ("exploit.sh", fake_script, "text/x-shellscript")},
    )
    passed = r.status_code == 415
    record("Upload rejection of script file (.sh)", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Upload rejection of script file", False, str(e))

try:
    # Valid PNG mock upload
    # 1x1 transparent PNG bytes
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    r = client.post(
        "/api/v1/upload-query",
        data={"query": "Highlight flooded regions in this tile"},
        files={"file": ("test_tile.png", io.BytesIO(png_bytes), "image/png")},
    )
    passed = r.status_code == 200 and r.json().get("success") is True
    record("Valid satellite tile upload inference", passed, f"Status: {r.status_code}, Mode: {r.json().get('mode')}")
except Exception as e:
    record("Valid satellite tile upload inference", False, str(e))

# 8. Temporary upload file leak check
from main import _UPLOAD_TEMP_DIR
remaining_files = list(_UPLOAD_TEMP_DIR.glob("*"))
passed = len(remaining_files) == 0
record("Temp Upload Directory File Cleanup", passed, f"Remaining files in temp dir: {len(remaining_files)}")

# 9. Static frontend serving
try:
    r = client.get("/")
    passed = r.status_code == 200 and "<!DOCTYPE html>" in r.text
    record("Root Dashboard Serving (/)", passed, f"Status: {r.status_code}")
except Exception as e:
    record("Root Dashboard Serving", False, str(e))

print("\n" + "=" * 70)
total_tests = len(results)
passed_tests = sum(1 for _, p, _ in results if p)
print(f"AUDIT SUMMARY: {passed_tests}/{total_tests} tests PASSED")
print("=" * 70)
