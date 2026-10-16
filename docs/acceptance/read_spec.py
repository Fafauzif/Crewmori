#!/usr/bin/env python3
"""Load complete relevant specification objects without flooding model context."""
from pathlib import Path
import argparse
import json

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
group = parser.add_mutually_exclusive_group(required=True)
group.add_argument("--index", action="store_true", help="Compact flow index")
group.add_argument("--flow", nargs="+", metavar="ID", help="One or more complete flow objects")
group.add_argument("--route", metavar="PATH", help="Flow index filtered by canonical route pattern")
group.add_argument("--scenario", metavar="ID", help="One complete scenario overlay")
group.add_argument("--record", nargs=2, metavar=("TABLE", "ID"), help="One baseline record")
args = parser.parse_args()
flows = []
for path in sorted((ROOT / "spec/flows").glob("*.json")):
    data = json.loads(path.read_text())
    flows.extend((str(path.relative_to(ROOT)), flow) for flow in data["flows"])

if args.index or args.route:
    result = [
        {"id": flow["id"], "title": flow["title"], "route": flow["route"], "source": source,
         "controls": len(flow["controls"]), "steps": len(flow["steps"])}
        for source, flow in flows if not args.route or args.route in str(flow["route"])
    ]
elif args.flow:
    lookup = {flow["id"]: flow for _, flow in flows}
    missing = set(args.flow) - set(lookup)
    if missing:
        parser.error("Unknown flow IDs: " + ", ".join(sorted(missing)))
    result = [lookup[id] for id in args.flow]
elif args.scenario:
    scenarios = json.loads((ROOT / "spec/data/scenarios_v1.json").read_text())["scenarios"]
    result = next((x for x in scenarios if x["id"] == args.scenario), None)
    if result is None:
        parser.error("Unknown scenario ID: " + args.scenario)
else:
    table, id = args.record
    tables = json.loads((ROOT / "spec/data/fixture_v1.json").read_text())["tables"]
    result = tables.get(table, {}).get(id)
    if result is None:
        parser.error(f"Unknown record: {table}/{id}")
print(json.dumps(result, indent=2, ensure_ascii=False))
