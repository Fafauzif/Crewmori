#!/usr/bin/env python3
"""Restore the founder's exact original context ZIP only when needed."""
from pathlib import Path
import hashlib
import json
import argparse

BASE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", type=Path, required=True, help="Destination ZIP outside a deployed/public directory")
args = parser.parse_args()
manifest = json.loads((BASE / "ORIGINAL_ARCHIVE_MANIFEST.json").read_text())
if args.output.exists():
    parser.error("Refusing to overwrite an existing file")
for item in manifest["parts"]:
    path = BASE / item["path"]
    if path.stat().st_size != item["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
        parser.error("Part integrity check failed: " + item["path"])
digest = hashlib.sha256()
count = 0
args.output.parent.mkdir(parents=True, exist_ok=True)
with args.output.open("xb") as output:
    for item in manifest["parts"]:
        with (BASE / item["path"]).open("rb") as source:
            while chunk := source.read(1024 * 1024):
                output.write(chunk)
                digest.update(chunk)
                count += len(chunk)
if count != manifest["original_bytes"] or digest.hexdigest() != manifest["original_sha256"]:
    args.output.unlink()
    raise SystemExit("Restored archive failed integrity check")
print(f"Restored {args.output} ({count} bytes), original SHA-256 verified")
