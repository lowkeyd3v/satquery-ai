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

# Ensure project root is on sys.path so 'backend' can be imported
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import app  # noqa: E402
