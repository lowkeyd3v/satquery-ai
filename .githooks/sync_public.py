#!/usr/bin/env python3
"""
pre-commit hook - SatQuery AI
Automatically syncs frontend/ to public/ before every git commit.
No more manually copying files!
"""
import shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SYNC_MAP = {
    ROOT / "frontend" / "index.html"  : ROOT / "public" / "index.html",
    ROOT / "frontend" / "app.js"      : ROOT / "public" / "static" / "app.js",
    ROOT / "frontend" / "styles.css"  : ROOT / "public" / "static" / "styles.css",
}

changed = []
for src, dst in SYNC_MAP.items():
    if not src.exists():
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not dst.exists() or src.read_bytes() != dst.read_bytes():
        shutil.copy2(src, dst)
        changed.append(dst.relative_to(ROOT))

if changed:
    import subprocess
    subprocess.run(
        ["git", "add"] + [str(p) for p in changed],
        cwd=str(ROOT), check=True
    )
    print(f"[pre-commit] Synced {len(changed)} file(s) frontend/ to public/:")
    for p in changed:
        print(f"             + {p}")
else:
    print("[pre-commit] public/ already up to date with frontend/")

sys.exit(0)
