#!/usr/bin/env python3
import argparse,json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
CONTRACT=ROOT/"docs/contracts/HOMENT_QUOTE_REQUEST_V1.json"
ORDER=["YOUR_HOME","CLEANING_REQUIREMENTS","PERSONALISE_SERVICE","PREFERRED_VISIT","ACCESS_HOUSEHOLD","PHOTOS_NOTES","YOUR_DETAILS","REVIEW_SUBMIT"]
TITLES={"YOUR_HOME":"Your Home","CLEANING_REQUIREMENTS":"Cleaning Requirements","PERSONALISE_SERVICE":"Personalise Your Service","PREFERRED_VISIT":"Preferred Visit","ACCESS_HOUSEHOLD":"Access and Household Details","PHOTOS_NOTES":"Photos and Notes","YOUR_DETAILS":"Your Details","REVIEW_SUBMIT":"Review and Submit"}
LABELS={
"property_type_other":"Property type info","address_line_1":"Full service address","country_sa_confirmed":"Property is in South Africa","floor_size":"Approx. floor size","bedrooms_apartment":"Bedrooms","bedrooms_other":"Bedrooms","living_areas":"Living areas","storeys":"Storeys in the home","apartment_floor":"Exact floor / level","apartment_access":"Access to your unit","outdoor_area":"Balcony or patio","estate_classification":"Estate or complex",
"primary_service":"Cleaning service","service_not_sure_details":"Cleaning details","frequency_full":"Frequency","frequency_deep":"Frequency","frequency_simple":"Frequency","custom_frequency_note":"Preferred schedule","home_condition":"Home condition","post_event_venue_type":"Venue context","post_event_guest_band":"Approximate guests","post_event_kitchen_used":"Kitchen substantially used?","post_event_outdoor_areas":"Outdoor areas to clean","post_event_significant_soiling":"Significant spills / soiling?","post_event_overnight":"Late-night / overnight?","post_event_bulk_waste":"Bulk waste removal?","post_event_specialist_contamination":"Specialist contamination?","post_event_specialist_carpet":"Specialist carpet treatment?","post_event_complex_venue":"Large / complex venue?",
"add_ons":"Add-ons","extra_refrigerator_quantity":"Extra refrigerators","balcony_patio_quantity":"Balcony / patio qty","eco_friendly_products":"Eco-friendly products","laundry_requested":"Add laundry","ironing_requested":"Add ironing","laundry_facilities":"Laundry facilities","laundry_loads":"Laundry loads","ironing_loads":"Ironing loads",
"preferred_date":"Preferred date","alternative_date":"Alternative date","preferred_time":"Preferred time","flexibility":"Date flexibility","recurring_notes":"Recurring notes",
"complex_access":"Complex access","security_instructions":"Security details","key_handover":"Entry / key handover","key_handover_details":"Handover details","someone_present":"Someone will be present?","has_pets":"Pets at the property?","pet_type_other":"Other pet type","pet_temperament":"Pet temperament","off_limits_areas":"Off-limits areas","fragile_items":"Fragile items","product_restrictions_choice":"Product restrictions?","product_restrictions_details":"Product restrictions","allergies_choice":"Allergies / sensitivities?","allergies_details":"Allergy details",
"existing_damage":"Existing damage","attention_areas":"Attention areas","renovation_dust":"Renovation dust","appliance_notes":"Appliance notes","additional_notes":"Anything else?","full_name":"Full name","mobile":"Mobile number","preferred_contact":"Preferred contact"}
HELP={"address_line_1":"Street number and street name.","floor_size":"Choose Not sure if you do not know.","living_areas":"Lounges, family rooms or similar spaces.","primary_service":"Regular is routine upkeep; Deep is more thorough.","frequency_full":"Dates remain requests until confirmed.","frequency_deep":"Dates remain requests until confirmed.","frequency_simple":"Dates remain requests until confirmed.","home_condition":"Choose the closest current condition.","add_ons":"Choose only extras you need.","complex_access":"Tell us how arrival access works.","existing_damage":"Mention damage we should know about."}
OPT={"REGULAR_HOME":"Regular Home Cleaning","DEEP":"Deep Cleaning","MOVE_IN":"Move-In Cleaning","MOVE_OUT":"Move-Out Cleaning","BATHROOM":"Bathroom Sanitisation","LIVING_AREA":"Living Area Cleaning","INTERIOR_WINDOWS":"Interior Window Cleaning","POST_RENOVATION":"Post-Renovation Cleaning","POST_EVENT":"Post-Event Cleaning","NOT_SURE":"Not sure","EVERY_TWO_WEEKS":"Every two weeks","FIVE_PLUS":"5+","FOUR_PLUS":"4+","FROM_150_UP":"150+","ELEVATOR_AND_STAIRS":"Elevator and stairs","GATED_COMMUNITY":"Gated community","DOG_AND_CAT":"Dog and cat","WASHER_DRYER":"Washer and dryer","WASHER_LINE":"Washer and washing line","TO_BE_ARRANGED":"To be arranged","CONCIERGE_RECEPTION":"Concierge / reception","SOMEONE_WILL_OPEN":"Someone will open","NOT_APPLICABLE":"Not applicable","VISITOR_SIGN_IN":"Visitor sign-in","RESIDENT_ARRANGED":"Resident arranged"}
def title(v):
    if v in OPT:return OPT[v]
    if v=="ONE":return "1"
    if v=="TWO":return "2"
    if v=="THREE":return "3"
    if v=="FOUR":return "4"
    return v.replace("_"," ").title()
def label(fid): return LABELS.get(fid,fid.replace("_"," ").title())
def dtype(f):
    if f["type"]=="CheckboxGroup":return {"type":"array","items":{"type":"string"},"__example__":[]}
    if f["type"]=="OptIn":return {"type":"boolean","__example__":False}
    return {"type":"string","__example__":"example"}
def refs_for(screen,by_screen): return {f["id"] for f in by_screen[screen]["fields"]}
def ref(screen,name,current): return "${form."+name+"}" if name in current else "${data."+name+"}"
def cond(screen,expr,current):
    if not expr:return None
    if expr=="resolved_frequency == CUSTOM":
        return "("+ref(screen,"frequency_full",current)+" == 'CUSTOM') || ("+ref(screen,"frequency_deep",current)+" == 'CUSTOM') || ("+ref(screen,"frequency_simple",current)+" == 'CUSTOM')"
    if expr=="resolved_frequency != ONE_TIME":
        terms=[]
        for field,values in (("frequency_full",("WEEKLY","EVERY_TWO_WEEKS","MONTHLY","CUSTOM")),("frequency_deep",("MONTHLY","CUSTOM")),("frequency_simple",("CUSTOM",))):
            terms.extend(ref(screen,field,current)+" == '"+value+"'" for value in values)
        return " || ".join(terms)
    if expr.startswith("add_ons contains "): return None
    m=re.fullmatch(r"(\w+) in \[([^\]]+)\]",expr)
    if m:
        k,vals=m.group(1),m.group(2).split(",")
        return " || ".join(ref(screen,k,current)+" == '"+v.strip()+"'" for v in vals)
    m=re.fullmatch(r"(\w+) (==|!=) (.+)",expr)
    if m:
        k,op,val=m.groups(); val=val.strip()
        if val in ("true","false"):return ref(screen,k,current)+" "+op+" "+val
        return ref(screen,k,current)+" "+op+" '"+val+"'"
    return None
def comp(screen,f,current):
    if f["id"]=="quote_photos":return None
    raw=f["type"]; typ=raw.split(":",1)[0]
    c={"type":typ,"name":f["id"],"label":label(f["id"])}
    if typ=="TextInput": c["input-type"]=raw.split(":",1)[1] if ":" in raw else "text"
    if "options" in f:c["data-source"]=[{"id":v,"title":title(v)} for v in f["options"]]
    visible=cond(screen,f.get("visibleWhen") or f.get("requiredWhen"),current)
    if visible:c["visible"]=visible
    c["required"]=visible if f.get("requiredWhen") and visible else bool(f.get("required",False))
    if f["id"] in HELP:c["helper-text"]=HELP[f["id"]]
    if f["id"]=="add_ons":
        for item in c["data-source"]:
            if item["id"]=="EXTRA_REFRIGERATOR":
                item["on-select-action"]={"name":"update_data","payload":{"show_extra_refrigerator_quantity":True}}
                item["on-unselect-action"]={"name":"update_data","payload":{"show_extra_refrigerator_quantity":False}}
            elif item["id"]=="BALCONY_PATIO":
                item["on-select-action"]={"name":"update_data","payload":{"show_balcony_patio_quantity":True}}
                item["on-unselect-action"]={"name":"update_data","payload":{"show_balcony_patio_quantity":False}}
    if f["id"]=="extra_refrigerator_quantity": c["visible"]=c["required"]="${data.show_extra_refrigerator_quantity}"
    if f["id"]=="balcony_patio_quantity": c["visible"]=c["required"]="${data.show_balcony_patio_quantity}"
    return c
def walk(v):
    if isinstance(v,dict):
        if "type" in v:yield v
        for k,x in v.items():
            if k not in ("data-source","on-click-action","on-select-action","on-unselect-action"):yield from walk(x)
    elif isinstance(v,list):
        for x in v:yield from walk(x)
def build(contract):
    by={s["id"]:s for s in contract["screens"]}; acc=[]; types={}; screens=[]
    routing={ORDER[i]:([ORDER[i+1]] if i+1<len(ORDER) else []) for i in range(len(ORDER))}
    for i,sid in enumerate(ORDER):
        if sid=="REVIEW_SUBMIT":
            data={n:dtype(types[n]) for n in acc}
            ch=[{"type":"TextHeading","text":"Review your quote request"},{"type":"TextBody","text":"Check the important details below. Homent validates and prices the request after submission."},{"type":"TextSubheading","text":"Contact"},{"type":"TextBody","text":"${data.full_name} · ${data.mobile} · ${data.email}"},{"type":"TextSubheading","text":"Property"},{"type":"TextBody","text":"${data.address_line_1}, ${data.suburb}"},{"type":"TextSubheading","text":"Service"},{"type":"TextBody","text":"Selected service: ${data.primary_service}"},{"type":"TextBody","text":"Preferred date: ${data.preferred_date}"},{"type":"TextCaption","text":"Submitting does not guarantee availability or a final price."}]
            p={"homent_contract":contract["contractId"],"homent_mapping_version":contract["mappingVersion"],"homent_completion_version":contract["completionVersion"]};p.update({n:"${data."+n+"}" for n in acc})
            ch.append({"type":"Footer","label":"Submit quote request","on-click-action":{"name":"complete","payload":p}})
            screens.append({"id":sid,"title":TITLES[sid],"terminal":True,"success":True,"data":data,"layout":{"type":"SingleColumnLayout","children":ch}});continue
        current=refs_for(sid,by); names=[]; cs=[]
        for f in by[sid]["fields"]:
            if f["id"]=="quote_photos":continue
            types[f["id"]]=f;names.append(f["id"]);cs.append(comp(sid,f,current))
        data={n:dtype(types[n]) for n in acc}
        if sid=="PERSONALISE_SERVICE":
            data["show_extra_refrigerator_quantity"]={"type":"boolean","__example__":False};data["show_balcony_patio_quantity"]={"type":"boolean","__example__":False}
        prefix=[]
        if sid=="CLEANING_REQUIREMENTS":prefix=[{"type":"TextBody","text":"Regular is routine upkeep; Deep is a more thorough clean. Post-Event requests may need review."}]
        if sid=="PERSONALISE_SERVICE":prefix=[{"type":"TextBody","text":"Choose only the add-ons you need."}]
        if sid=="ACCESS_HOUSEHOLD":prefix=[{"type":"TextBody","text":"Share only details needed to plan the service safely."}]
        if sid=="PHOTOS_NOTES":prefix=[{"type":"TextBody","text":"Photos are temporarily disabled for this pilot. Notes remain available."}]
        payload={n:"${data."+n+"}" for n in acc};payload.update({n:"${form."+n+"}" for n in names})
        if ORDER[i+1]=="PERSONALISE_SERVICE": payload.update({"show_extra_refrigerator_quantity":False,"show_balcony_patio_quantity":False})
        cs.append({"type":"Footer","label":"Continue","on-click-action":{"name":"navigate","next":{"type":"screen","name":ORDER[i+1]},"payload":payload}})
        s={"id":sid,"title":TITLES[sid],"layout":{"type":"SingleColumnLayout","children":prefix+[{"type":"Form","name":sid.lower()+"_form","children":cs}]}}
        if data:s["data"]=data
        screens.append(s);acc+=names
    return {"version":contract["flowJsonVersion"],"routing_model":routing,"screens":screens}
def validate(flow,contract):
    e=[];txt=json.dumps(flow)
    if contract["contractId"]!="HOMENT_QUOTE_REQUEST_V1" or contract["mappingVersion"]!="HOMENT_QUOTE_REQUEST_MAPPING_V1" or contract["completionVersion"]!="HOMENT_QUOTE_REQUEST_COMPLETION_V1":e.append("Frozen IDs changed")
    if flow["version"]!="7.3":e.append("Flow version is not 7.3")
    if [s["id"] for s in flow["screens"]]!=ORDER:e.append("Screen order drifted")
    if "PhotoPicker" in txt or "quote_photos" in txt:e.append("Non-photo artifact contains PhotoPicker")
    if "resolved_frequency" in txt:e.append("Artifact contains unresolved synthetic frequency reference")
    expected={f["id"] for s in contract["screens"] for f in s["fields"] if f["id"]!="quote_photos"}
    actual={c["name"] for s in flow["screens"] for c in walk(s["layout"]) if c.get("name") and c["type"]!="Form"}
    if expected!=actual:e.append("Field IDs drifted")
    for s in flow["screens"]:
        if sum(1 for _ in walk(s["layout"]))>50:e.append(s["id"]+" exceeds 50 components")
    return e
def main():
    a=argparse.ArgumentParser();a.add_argument("--output");a.add_argument("--check",action="store_true");args=a.parse_args()
    c=json.loads(CONTRACT.read_text());f=build(c);errs=validate(f,c)
    if errs: print("\n".join(errs),file=sys.stderr);return 1
    out=json.dumps(f,indent=2,ensure_ascii=False)+"\n"
    if args.output:pathlib.Path(args.output).write_text(out)
    else:sys.stdout.write(out)
    if args.check:print("LOCAL VALIDATION PASSED",file=sys.stderr)
    return 0
if __name__=="__main__":raise SystemExit(main())
