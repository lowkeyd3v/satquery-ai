"""
api/index.py
--------------------------------------------------------------------------
Vercel Serverless Function entrypoint for SatQuery AI.
--------------------------------------------------------------------------
Wraps the FastAPI application defined in backend/main.py and exposes it
as an ASGI handler for Vercel's Python runtime.
"""

import sys
from pathlib import Path

# Ensure project root and backend are on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.main import app  # noqa: E402
from fastapi.responses import RedirectResponse  # noqa: E402


@app.get("/api/index.py", include_in_schema=False)
@app.get("/api/index", include_in_schema=False)
def vercel_entry_redirect():
    """Fallback redirect to root if Vercel attempts to resolve the script path directly."""
    return RedirectResponse(url="/")
