"""Verify planning data with Python stdlib; not a runtime/UI/production test suite."""
from pathlib import Path
from copy import deepcopy
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import json

ROOT=Path(__file__).resolve().parent
def read(name):return json.loads((ROOT/name).read_text())
def require(value,message):
    if not value:raise AssertionError(message)

def validate(value,schema,root,path="$"):
    """Evaluate only keywords used by these two supplied schemas, failing loudly on unknown ones."""
    allowed={"$schema","$id","title","$defs","$ref","type","const","enum","anyOf","properties","required","additionalProperties","items","minimum","minItems","maxItems"}
    require(not(set(schema)-allowed),f"Unsupported schema keyword at {path}: {set(schema)-allowed}")
    if "$ref" in schema:
        target=root
        require(schema["$ref"].startswith("#/"),"Only local references are supported")
        for part in schema["$ref"][2:].split("/"):target=target[part]
        return validate(value,target,root,path)
    if "anyOf" in schema:
        errors=[]
        for option in schema["anyOf"]:
            try:validate(value,option,root,path);break
            except AssertionError as e:errors.append(str(e))
        else:raise AssertionError(f"{path}: no anyOf alternative matched: {errors}")
    if "const" in schema:require(value==schema["const"],f"{path}: const")
    if "enum" in schema:require(value in schema["enum"],f"{path}: enum {value}")
    types=schema.get("type",[]);types=[types] if isinstance(types,str) else types
    checks={"null":lambda v:v is None,"object":lambda v:isinstance(v,dict),"array":lambda v:isinstance(v,list),"string":lambda v:isinstance(v,str),"boolean":lambda v:isinstance(v,bool),"integer":lambda v:isinstance(v,int) and not isinstance(v,bool),"number":lambda v:isinstance(v,(int,float)) and not isinstance(v,bool)}
    if types:require(any(checks[t](value) for t in types),f"{path}: expected {types}, found {type(value).__name__}")
    if isinstance(value,dict):
        require(set(schema.get("required",[]))<=set(value),f"{path}: missing {set(schema.get('required',[]))-set(value)}")
        properties=schema.get("properties",{})
        for key,item in value.items():
            if key in properties:validate(item,properties[key],root,f"{path}.{key}")
            elif schema.get("additionalProperties") is False:raise AssertionError(f"{path}: extra key {key}")
            elif isinstance(schema.get("additionalProperties"),dict):validate(item,schema["additionalProperties"],root,f"{path}.{key}")
    if isinstance(value,list):
        require(len(value)>=schema.get("minItems",0),f"{path}: minItems")
        require(len(value)<=schema.get("maxItems",10**9),f"{path}: maxItems")
        for index,item in enumerate(value):validate(item,schema.get("items",{}),root,f"{path}[{index}]")
    if isinstance(value,(int,float)) and not isinstance(value,bool) and "minimum" in schema:require(value>=schema["minimum"],f"{path}: minimum")

def materialize(base,scenario):
    state=deepcopy(base);state["sample_clock"]=scenario["sample_clock"]
    for table in scenario["replace_tables"]:state["tables"][table]={}
    for table,records in scenario["upsert_records"].items():state["tables"][table].update(deepcopy(records))
    return state

def dt(value):return datetime.fromisoformat(value)
def half_up(value):return int(Decimal(value).quantize(Decimal(1),rounding=ROUND_HALF_UP))
def next_business_day(value):
    value=value+timedelta(days=1)
    while value.weekday()>4:value+=timedelta(days=1)
    return value.replace(hour=9,minute=0,second=0,microsecond=0)
def fifth_business_day(value):
    count=1
    while count<5:
        value+=timedelta(days=1)
        if value.weekday()<5:count+=1
    return value.replace(hour=17,minute=0,second=0,microsecond=0)

def verify_state(state,name):
    tabs=state["tables"];allids={id for rows in tabs.values() for id in rows}
    require(sum(len(x) for x in tabs.values())==len(allids),f"{name}: IDs must be globally unique")
    now=dt(state["sample_clock"])
    opaque={"role_id","assigned_role","sender_kind","command_id","cause_command_id","interrupted_command_id","provider_event_id","fixture_id","idempotency_key"}
    def walk(value,path=""):
        if isinstance(value,dict):
            if {"amount_minor","currency","scale"}<=set(value):
                require(type(value["amount_minor"]) is int and value["amount_minor"]>=0,f"{name}:{path}: exact nonnegative money")
                require(value["currency"] in ["USD","IDR"] and value["scale"]==({"USD":2,"IDR":0}[value["currency"]]),f"{name}:{path}: currency scale")
            if {"table","id","version"}<=set(value):
                require(value["table"] in tabs and value["id"] in tabs[value["table"]],f"{name}:{path}: dangling typed ref")
                require(value["version"]<=tabs[value["table"]][value["id"]]["version"],f"{name}:{path}: impossible future ref version")
            for key,item in value.items():
                if key.endswith("_id") and key not in opaque and item is not None:require(item in allids,f"{name}:{path}.{key}: dangling {item}")
                if key.endswith("_ids") and isinstance(item,list):
                    for id in item:require(id in allids,f"{name}:{path}.{key}: dangling {id}")
                walk(item,path+"."+key)
        elif isinstance(value,list):
            for index,item in enumerate(value):walk(item,path+f"[{index}]")
    walk(tabs)
    for table,rows in tabs.items():
        for id,row in rows.items():
            require(row["id"]==id,f"{name}:{table}: key/id mismatch")
            require(row["workspace_id"]=="workspace_alya",f"{name}:{id}: workspace")
            require(dt(row["created_at"])<=dt(row["updated_at"])<=now,f"{name}:{id}: record timestamp order")
    for attachment in tabs["attachments"].values():
        if attachment["storage_kind"]=="bundled_asset":
            path=ROOT.parent.parent/attachment["storage_locator"]
            require(path.is_file() and path.stat().st_size==attachment["byte_length"],f"{name}: bundled asset missing or byte length differs")
    sequences=[x["sequence"] for x in tabs["events"].values()]
    require(len(sequences)==len(set(sequences)),f"{name}: duplicate event sequence")
    for event in tabs["events"].values():require(dt(event["occurred_at"])<=now,f"{name}: future event")
    for offer in tabs["offers"].values():
        current=tabs["offer_versions"][offer["current_version_id"]]
        require(current["offer_id"]==offer["id"],f"{name}: offer/current crosslink")
        require(offer["status"]==current["state"],f"{name}: offer/current lifecycle mismatch")
        if offer["status"]=="accepted":
            require(offer["accepted_version_id"]==current["id"] and current["immutable_after_acceptance"],f"{name}: accepted immutability")
        else:require(offer["accepted_version_id"] is None,f"{name}: false accepted version")
    for receipt in tabs["receipts"].values():
        g,f,n=receipt["gross"],receipt["fee"],receipt["net"]
        require(g["currency"]==f["currency"]==n["currency"],f"{name}: mixed gross/fee/net")
        require(g["amount_minor"]-f["amount_minor"]==n["amount_minor"],f"{name}: gross-fee != net")
        allocations=[a for a in tabs["allocations"].values() if a["receipt_id"]==receipt["id"] and a["state"]=="posted"]
        require(sum(a["amount"]["amount_minor"] for a in allocations)<=g["amount_minor"],f"{name}: overallocated receipt")
        for a in allocations:
            require(a["amount"]["currency"]==g["currency"]==tabs["invoices"][a["invoice_id"]]["currency"],f"{name}: allocation currency mismatch")
    for invoice in tabs["invoices"].values():
        lines=[tabs["invoice_lines"][id] for id in invoice["line_ids"]]
        require(all(l["invoice_id"]==invoice["id"] and l["unit_amount"]["currency"]==invoice["currency"] for l in lines),f"{name}: invoice line link/currency")
        total=sum(l["unit_amount"]["amount_minor"]*l["quantity"] for l in lines)
        posted=sum(a["amount"]["amount_minor"] for a in tabs["allocations"].values() if a["invoice_id"]==invoice["id"] and a["state"]=="posted")
        require(0<=posted<=total,f"{name}: invoice allocation range")
        require((invoice["state"]=="paid")==bool(total and posted==total),f"{name}: false invoice paid state")
    for project in tabs["projects"].values():
        reservation=tabs["reservations"][project["reservation_id"]]
        inputs=[tabs["required_inputs"][id] for id in project["required_input_ids"]]
        require((project["inputs_state"]=="complete")==all(i["state"]=="provided" for i in inputs),f"{name}: inputs gate")
        if reservation["state"]=="committed":
            require(project["deposit_state"]=="confirmed" and project["inputs_state"]=="complete",f"{name}: premature commitment")
            receipt_at=max(dt(r["received_at"]) for r in tabs["receipts"].values() if r["observation_state"]=="sample_confirmed" and r["reconciliation_state"]=="reconciled")
            inputs_at=max(dt(i["provided_at"]) for i in inputs)
            ready_at=max(receipt_at,inputs_at)
            require(ready_at<dt(reservation["expires_at"]),f"{name}: late prerequisites without rescheduling")
            start=next_business_day(ready_at)
            require(dt(project["committed_start_at"])==start,f"{name}: start day calculation")
            require(dt(project["committed_due_at"])==fifth_business_day(start),f"{name}: due business day calculation")
        else:require(project["committed_start_at"] is None and project["committed_due_at"] is None,f"{name}: premature date promise")
        acceptance=tabs["acceptances"][project["acceptance_id"]]
        require(dt(reservation["expires_at"])-dt(acceptance["accepted_at"])==timedelta(hours=48),f"{name}: reservation elapsed-hour expiry")
    require(len(tabs["projects"])<=1 and len(tabs["acceptances"])<=1,f"{name}: duplicate seeded acceptance effects")
    if name in ["review_ready","baseline","empty_filtered_list"]:
        require(not any(tabs[t] for t in ["share_records","acceptances","projects","reservations","invoices","payment_requests","receipts","allocations"]),f"{name}: contradictory baseline")
    if name=="wrong_currency_receipt":require(not tabs["allocations"],"Wrong-currency receipt allocated")
    if name=="partial_receipt":require(tabs["invoices"]["invoice_northstar_deposit"]["state"]=="partially_paid","Partial receipt false success")
    if name in ["running_handoff","recoverable_task_failure"]:
        unfinished=["operations","finance","sales"] if name=="running_handoff" else ["finance","sales"]
        require(not any(a["role_id"] in unfinished for a in tabs["artifacts"].values()),f"{name}: premature artifact")
        require(not any(e["role_id"] in unfinished for e in tabs["events"].values()),f"{name}: premature success event")
        for role in (["scout"] if name=="running_handoff" else ["scout","operations"]):require(f"artifact_{role}_northstar" in tabs["artifacts"],f"{name}: completed work was erased")
        require(tabs["agent_runs"]["run_sales_northstar"]["status"]=="waiting_input",f"{name}: Sales does not wait for inputs")
    if name=="disconnected_gmail":require(not tabs["share_records"] and tabs["connections"]["gmail"]["state"]=="reconnect_required","Disconnected share occurred")
    if name=="stale_offer":require(not tabs["acceptances"] and tabs["offer_versions"]["offer_northstar_v1"]["state"]=="superseded","Stale branch accepted")

def main():
    base=read("fixture_v1.json");scenarios=read("scenarios_v1.json");schema=read("fixture_v1.schema.json");scenario_schema=read("scenarios_v1.schema.json")
    validate(base,schema,schema);validate(scenarios,scenario_schema,scenario_schema)
    setup=deepcopy(base)
    setup["tables"]["onboarding_sessions"]["onboarding_alya"]["draft"]={"business":{"displayName":"Alya Studio","profession":"Consultant","timezone":"Asia/Jakarta","locale":"en"},"services":[{"title":"Discovery","slug":"discovery","description":"A focused session","deliverables":["Findings"],"pricing":"Custom quote"}],"schedule":{"weekdays":[0,1,2,3,4],"intervals":[{"weekday":0,"start":"09:00","end":"17:00"}]},"intake":{"status":"open_to_inquiries","availableFrom":None},"preferences":{"focusMode":False,"recapEnabled":True},"lastStep":"availability"}
    validate(setup,schema,schema)
    verify_state(base,"baseline")
    require(len({s["id"] for s in scenarios["scenarios"]})==12,"Scenario IDs/count")
    for scenario in scenarios["scenarios"]:
        state=materialize(base,scenario);validate(state,schema,schema);verify_state(state,scenario["id"])
    gross=half_up(Decimal(45000)*6000/10000);fee=half_up(Decimal(gross)*200/10000);net=gross-fee
    require((gross,fee,net,half_up(Decimal(net)*15000/100),45000-gross)==(27000,540,26460,3969000,18000),"Canonical deposit arithmetic")
    require(3000000-half_up(Decimal(17640)*15000/100)==354000,"40% comparison shortfall")
    require(dt("2026-10-16T09:00:00+07:00").weekday()==4,"Frozen weekday")
    idr=sum(e["amount"]["amount_minor"] for e in base["tables"]["expenses"].values() if e["amount"]["currency"]=="IDR")
    usd=sum(e["amount"]["amount_minor"] for e in base["tables"]["expenses"].values() if e["amount"]["currency"]=="USD")
    require((idr,usd)==(575000,1200),"Expense totals by currency")
    print(f"PASS: baseline + 12 scenarios; {len(base['tables'])} tables; supported JSON Schema keywords, nonempty setup draft, entity refs, money, lifecycle/date gates and branch assertions. No UI/runtime tests performed.")

if __name__=="__main__":main()
