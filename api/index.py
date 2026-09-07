"""
api/index.py
--------------------------------------------------------------------------
Vercel Serverless Function entrypoint for SatQuery AI.
--------------------------------------------------------------------------
Wraps the FastAPI application defined in backend/main.py and exposes it
as an ASGI handler for Vercel's Python runtime.
"""

import sys
import urllib.parse
from pathlib import Path
from starlette.types import ASGIApp, Receive, Scope, Send

# Ensure project root and backend are on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.main import app  # noqa: E402


class VercelPathFixMiddleware:
    """
    ASGI middleware ensuring that requests rewritten by Vercel (which sets
    scope['path'] to '/api/index.py' or '/api/index' and passes the subpath
    in the 'path' query parameter) are restored to their intended route path
    before FastAPI dispatches to route handlers.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            curr_path = scope.get("path", "")
            if curr_path in ("/api/index.py", "/api/index", "/api", ""):
                # 1. First check query parameters (Vercel :path* syntax puts captured segments in 'path')
                raw_qs = scope.get("query_string", b"").decode("latin1", "ignore")
                qs = urllib.parse.parse_qs(raw_qs)
                path_param = qs.pop("path", [None])[0]

                if path_param:
                    clean_param = path_param.strip("/")
                    if clean_param in ("docs", "redoc", "openapi.json"):
                        scope["path"] = f"/{clean_param}"
                    elif clean_param.startswith("api/"):
                        scope["path"] = f"/{clean_param}"
                    else:
                        scope["path"] = f"/api/{clean_param}"
                    # Reconstruct query string without the internal routing parameter
                    scope["query_string"] = urllib.parse.urlencode(qs, doseq=True).encode("latin1")
                else:
                    # 2. Check headers as secondary fallback
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
