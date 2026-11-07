#!/usr/bin/env python3
"""Buat arsip ZIP kode sumber proyek tanpa node_modules, cache, dan artefak build."""
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "rumah-gadang-3d-interaktif-source.zip"

EXCLUDED_DIRS = {
    "node_modules",
    "dist",
    ".git",
    ".firebase",
    "__pycache__",
    ".vite",
    "playwright-report",
    "test-results",
}
EXCLUDED_FILES = {OUTPUT.name, ".DS_Store", "Thumbs.db", "startup-error.png"}


def should_include(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if any(part in EXCLUDED_DIRS for part in rel.parts):
        return False
    if len(rel.parts) >= 2 and rel.parts[0] == "public" and rel.parts[1] == "references":
        return False
    if path.name in EXCLUDED_FILES or path.suffix in {".zip", ".log"}:
        return False
    return True


def main() -> None:
    files = sorted(p for p in ROOT.rglob("*") if p.is_file() and should_include(p))
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for file_path in files:
            arcname = Path("FinalProject") / file_path.relative_to(ROOT)
            zf.write(file_path, arcname.as_posix())
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"Created {OUTPUT} ({len(files)} files, {size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
