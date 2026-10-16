#!/usr/bin/env python3
"""Read-only integrity/coverage checks for this specification pack, not website tests."""
from pathlib import Path
import hashlib
import json
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
errors = []
checks = []


def require(condition, message):
    if not condition:
        errors.append(message)


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"Invalid JSON {path.relative_to(ROOT)}: {exc}")
        return None


required = [
    "00_START_HERE.md", "PASTE_IN_NEW_CHAT.txt", "MASTER_AI_CONTEXT.md", "README.md",
    "spec/PRODUCT.md", "spec/DECISIONS.md", "spec/DESIGN.md", "spec/design-tokens.json",
    "spec/UX_CONTRACT.md", "spec/ROUTES.json", "spec/CONTROL_REGISTRY.json",
    "spec/flows/acquisition-buyer.json", "spec/flows/foundation-team-settings.json",
    "spec/flows/work-money.json", "spec/data/README.md", "spec/data/fixture_v1.json",
    "spec/data/scenarios_v1.json", "spec/data/verify_fixtures.py",
    "spec/contracts/SERVICE_AND_EVENT_CONTRACTS.md", "spec/contracts/domain-contracts.ts",
    "spec/contracts/AUDIENCE_PROJECTIONS.md", "spec/contracts/TRANSITIONS_AND_POLICIES.md",
    "assets/anchors/01_HOME.png", "assets/anchors/02_TEAM.png",
    "assets/anchors/01_HOME_reference.html", "assets/anchors/02_TEAM_reference.html",
    "assets/brand-original/BRAND.md", "assets/brand-original/assets/geometry.json",
    "assets/characters/scout.svg", "assets/characters/promoter.svg", "assets/characters/sales.svg",
    "assets/characters/account-manager.svg", "assets/characters/operations.svg", "assets/characters/finance.svg",
    "assets/fonts/README.md", "assets/demo/team-worldmap.svg",
    "references/README.md", "references/REFERENCE_MANIFEST.json", "skills/README.md",
    "skills/CREWMORI_SKILL_ADAPTER.md", "skills/SOURCES.json",
    "acceptance/IMPLEMENTATION_REVIEW_LOOP.md", "acceptance/ACCEPTANCE.md",
    "delivery/SOURCE_AND_HANDOFF.md", "delivery/DEVELOPER_FUNCTIONALITY.md",
    "context/archive/README.md", "context/archive/ORIGINAL_ARCHIVE_MANIFEST.json", "context/archive/restore_original.py",
]
for rel in required:
    require((ROOT / rel).is_file(), f"Missing required file: {rel}")

json_files = sorted(ROOT.rglob("*.json"))
for path in json_files:
    read_json(path)
checks.append(f"Parsed {len(json_files)} JSON files")

flows = []
flow_ids = set()
control_ids = set()
shared = {"field", "search_filter", "navigation", "overlay", "save", "download", "reversible_remove", "task_control"}
required_flow = {"id", "title", "actor", "route", "record_refs", "preconditions", "initial_state", "controls", "steps", "cancel_back", "persistence", "cross_screen", "success_assertions", "negative_assertions", "scenario_tests"}
required_control = {"id", "label", "kind", "behavior", "enabled_when", "validation"}
required_step = {"id", "control_id", "trigger", "before", "validation", "mutation", "visible_result", "failure_recovery", "focus"}
step_count = 0
for path in sorted((ROOT / "spec/flows").glob("*.json")):
    data = read_json(path)
    if not data:
        continue
    for flow in data.get("flows", []):
        fid = flow.get("id")
        require(fid not in flow_ids, f"Duplicate flow ID: {fid}")
        flow_ids.add(fid)
        require(not (required_flow - set(flow)), f"Flow {fid} missing fields {required_flow - set(flow)}")
        require(bool(flow.get("success_assertions")) and bool(flow.get("negative_assertions")) and bool(flow.get("scenario_tests")), f"Flow {fid} lacks observable assertions/tests")
        controls = {c.get("id"): c for c in flow.get("controls", [])}
        require(len(controls) == len(flow.get("controls", [])), f"Duplicate local control in {fid}")
        referenced = set()
        step_ids = set()
        for step in flow.get("steps", []):
            sid = step.get("id")
            require(sid not in step_ids, f"Duplicate step {fid}/{sid}")
            step_ids.add(sid)
            require(not (required_step - set(step)), f"Step {fid}/{sid} missing {required_step - set(step)}")
            require(step.get("control_id") in controls, f"Step {fid}/{sid} references missing control")
            referenced.add(step.get("control_id"))
            step_count += 1
        for cid, control in controls.items():
            require(cid not in control_ids, f"Duplicate global control ID: {cid}")
            control_ids.add(cid)
            require(not (required_control - set(control)), f"Control {cid} missing {required_control - set(control)}")
            require(control.get("kind") in {"button", "link", "input", "select", "tab", "menu", "event"}, f"Invalid control kind {cid}")
            contract = control.get("shared_contract")
            require(cid in referenced or contract in shared, f"Control {cid} has no step/shared contract")
            if contract is not None:
                require(contract in shared, f"Unknown shared contract {cid}: {contract}")
        flows.append(flow)
checks.append(f"Validated {len(flows)} flows, {len(control_ids)} unique controls, {step_count} explicit steps")

routes = read_json(ROOT / "spec/ROUTES.json") or {}
for route in routes.get("routes", []):
    path = route["path"]
    require(any(path in str(f.get("route")) for f in flows), f"No flow coverage for route: {path}")
checks.append(f"Covered {len(routes.get('routes', []))} required route patterns")

registry = read_json(ROOT / "spec/CONTROL_REGISTRY.json") or {}
entries = registry.get("controls", [])
require({x.get("id") for x in entries} == control_ids, "Aggregate control registry differs from domain controls")
require(len(entries) == len(control_ids), "Aggregate registry count mismatch")

refs = read_json(ROOT / "references/REFERENCE_MANIFEST.json") or {}
require(len(refs.get("items", [])) == 24, "Expected 24 selected third-party screenshots")
for item in refs.get("items", []):
    file = ROOT / item["selected_file"]
    require(file.is_file(), f"Missing reference {item['id']}")
    if file.is_file():
        require(hashlib.sha256(file.read_bytes()).hexdigest() == item["sha256"], f"Reference hash mismatch {item['id']}")
checks.append("Verified all 24 selected reference hashes")

svg_count = 0
for folder in ["assets/characters", "assets/demo", "assets/brand-original/assets"]:
    for path in (ROOT / folder).rglob("*.svg"):
        try:
            ET.parse(path)
            svg_count += 1
        except Exception as exc:
            errors.append(f"Invalid SVG {path.relative_to(ROOT)}: {exc}")
checks.append(f"Parsed {svg_count} SVG assets")

font_files = list((ROOT / "assets/fonts").glob("*.ttf")) + list((ROOT / "assets/fonts").glob("*.woff2"))
license_files = [x for x in (ROOT / "assets/fonts").iterdir() if x.is_file() and ("ofl" in x.name.lower() or "license" in x.name.lower())]
require(len(font_files) >= 4, "Missing bundled Newsreader/Inter font variants")
require(len(license_files) >= 2, "Missing font licenses")
checks.append(f"Found {len(font_files)} local fonts and {len(license_files)} font license files")

archive = read_json(ROOT / "context/archive/ORIGINAL_ARCHIVE_MANIFEST.json") or {}
archive_hash = hashlib.sha256()
archive_bytes = 0
for item in archive.get("parts", []):
    path = ROOT / "context/archive" / item["path"]
    require(path.is_file(), f"Missing original context part: {item['path']}")
    if path.is_file():
        data = path.read_bytes()
        require(len(data) == item["bytes"] and hashlib.sha256(data).hexdigest() == item["sha256"], f"Corrupt context part: {item['path']}")
        archive_hash.update(data)
        archive_bytes += len(data)
require(archive_hash.hexdigest() == archive.get("original_sha256") and archive_bytes == archive.get("original_bytes"), "Original context reassembly hash/size mismatch")
require(all(x.stat().st_size < 25 * 1024 * 1024 for x in ROOT.rglob("*") if x.is_file()), "An individual pack file exceeds browser-friendly 25MiB handoff size")
checks.append(f"Verified original context losslessly in {len(archive.get('parts', []))} parts")

manifest_path = ROOT / "PACKAGE_MANIFEST.json"
if manifest_path.exists():
    manifest = read_json(manifest_path) or {}
    actual_paths = {str(path.relative_to(ROOT)) for path in ROOT.rglob("*") if path.is_file() and path != manifest_path}
    require(actual_paths == {item["path"] for item in manifest.get("files", [])}, "Package manifest does not cover exactly all non-root-manifest files")
    for item in manifest.get("files", []):
        path = ROOT / item["path"]
        require(path.is_file(), f"Manifest file missing: {item['path']}")
        if path.is_file():
            require(path.stat().st_size == item["bytes"], f"Size mismatch: {item['path']}")
            require(hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"], f"Hash mismatch: {item['path']}")
    checks.append(f"Verified package manifest for {len(manifest.get('files', []))} files")

result = {"status": "passed" if not errors else "failed", "scope": "Input specification pack integrity only; not frontend runtime/build verification", "checks": checks, "errors": errors}
print(json.dumps(result, indent=2))
sys.exit(1 if errors else 0)
