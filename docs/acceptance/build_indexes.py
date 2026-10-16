#!/usr/bin/env python3
"""Rebuild compact indexes from complete domain flow specifications."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
flows, controls, index = [], [], []
for path in sorted((ROOT / "spec/flows").glob("*.json")):
    data = json.loads(path.read_text())
    for flow in data["flows"]:
        source = str(path.relative_to(ROOT))
        flows.append(flow)
        index.append({"id": flow["id"], "title": flow["title"], "route": flow["route"], "actor": flow["actor"], "source": source, "control_count": len(flow["controls"]), "step_count": len(flow["steps"])})
        for control in flow["controls"]:
            controls.append({"id": control["id"], "flow_id": flow["id"], "route": flow["route"], "actor": flow["actor"], "source": source,
                **{key: control[key] for key in ["label", "kind", "behavior", "enabled_when", "validation"]},
                "shared_contract": control.get("shared_contract"),
                "step_ids": [step["id"] for step in flow["steps"] if step["control_id"] == control["id"]]})
(ROOT / "spec/CONTROL_REGISTRY.json").write_text(json.dumps({"schema_version": 1, "purpose": "Traceability lookup. Read complete relevant flow objects for effects/recovery. Register controls added during implementation.", "controls": controls}, indent=2, ensure_ascii=False))
(ROOT / "spec/FLOW_INDEX.json").write_text(json.dumps({"schema_version": 1, "flows": index}, indent=2, ensure_ascii=False))
lines = ["# Compact flow index", "", "Read shared DECISIONS/UX/FLOW_FORMAT first. Use `python3 acceptance/read_spec.py --flow FLOW_ID` for complete relevant objects. This index does not omit any scoped capability.", "", "| Flow ID | Job | Route | Controls |", "|---|---|---|---:|"]
for item in index:
    lines.append("| " + item["id"] + " | " + item["title"].replace("|", "/") + " | `" + item["route"].replace("|", "/") + "` | " + str(item["control_count"]) + " |")
(ROOT / "spec/FLOW_INDEX.md").write_text("\n".join(lines) + "\n")
routes = json.loads((ROOT / "spec/ROUTES.json").read_text())["routes"]
lines = ["# Required route to flow coverage", "", "| Route | Relevant flows |", "|---|---|"]
for route in routes:
    ids = [flow["id"] for flow in flows if route["path"] in str(flow["route"])]
    lines.append("| `" + route["path"] + "` | " + ", ".join(ids) + " |")
(ROOT / "spec/COVERAGE_MATRIX.md").write_text("\n".join(lines) + "\n")
print(json.dumps({"routes": len(routes), "flows": len(flows), "controls": len(controls), "explicit_steps": sum(len(flow["steps"]) for flow in flows)}, indent=2))
