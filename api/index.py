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

from starlette.types import ASGIApp, Receive, Scope, Send

from backend.main import app  # noqa: E402


class VercelPathFixMiddleware:
    """
    ASGI middleware ensuring that requests rewritten by Vercel (which may set
    scope['path'] to '/api/index.py' or '/api/index') are restored to their
    original requested paths (via x-matched-path, x-forwarded-uri, or
    x-vercel-matched-path) so FastAPI's internal router matches routes correctly.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path in ("/api/index.py", "/api/index", "/api", ""):
                headers = dict(scope.get("headers", []))
                matched = (
                    headers.get(b"x-matched-path")
                    or headers.get(b"x-forwarded-uri")
                    or headers.get(b"x-vercel-matched-path")
                )
                if matched:
                    decoded = matched.decode("utf-8").split("?")[0]
                    if decoded and decoded not in ("/api/index.py", "/api/index"):
                        scope["path"] = decoded
        await self.app(scope, receive, send)


app.add_middleware(VercelPathFixMiddleware)


@app.api_route("/api/index.py", methods=["GET", "POST", "OPTIONS"], include_in_schema=False)
@app.api_route("/api/index", methods=["GET", "POST", "OPTIONS"], include_in_schema=False)
def vercel_entry_fallback():
    """Fallback handler for direct access to the Vercel function script path."""
    return {
        "status": "ok",
        "service": "SatQuery AI",
        "problem_statement": "SIH26167",
        "message": "SatQuery AI Vercel Serverless Function is active.",
    }
