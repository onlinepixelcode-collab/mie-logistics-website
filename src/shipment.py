#!/usr/bin/env python3
"""Add or update a shipment on the Track page.

The site is static, so tracking data lives in assets/data/shipments.json.
Each shipment is stored under a SHA-256 key made from the booking reference
plus the last 4 digits of the customer's phone number. No names or phone
numbers are ever written to the file, and references can't be looked up
without the matching phone digits.

Examples
  python3 src/shipment.py set --ref MIE-T6S8XE --phone "082 123 4567" \
      --from Durban --to Johannesburg --status collected --eta 2026-11-28 --cars 2
  python3 src/shipment.py set --ref MIE-T6S8XE --phone 0821234567 --status in_transit --note "Left Durban, on the N3"
  python3 src/shipment.py remove --ref MIE-T6S8XE --phone 0821234567
  python3 src/shipment.py list

Statuses (in order): confirmed, collected, in_transit, out_for_delivery, delivered
After changing shipments, publish: git add -A && git commit -m "Update tracking" && git push
"""
import argparse, datetime, hashlib, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "data" / "shipments.json"
STATUSES = ["confirmed", "collected", "in_transit", "out_for_delivery", "delivered"]


def key_for(ref: str, phone: str) -> str:
    ref = re.sub(r"\s+", "", ref).upper()
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 4:
        sys.exit("Phone must have at least 4 digits.")
    return hashlib.sha256(f"{ref}|{digits[-4:]}".encode()).hexdigest()


def load():
    if DATA.exists():
        return json.loads(DATA.read_text())
    return {"updated": None, "shipments": {}}


def save(db):
    db["updated"] = now()
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(db, indent=2, ensure_ascii=False) + "\n")


def now():
    return datetime.datetime.now().astimezone().isoformat(timespec="minutes")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("set", help="add or update a shipment")
    s.add_argument("--ref", required=True)
    s.add_argument("--phone", required=True)
    s.add_argument("--from", dest="frm")
    s.add_argument("--to")
    s.add_argument("--status", choices=STATUSES)
    s.add_argument("--eta", help="expected delivery date, YYYY-MM-DD")
    s.add_argument("--cars", type=int)
    s.add_argument("--note", help="short public note shown to the customer")
    r = sub.add_parser("remove", help="delete a shipment")
    r.add_argument("--ref", required=True)
    r.add_argument("--phone", required=True)
    sub.add_parser("list", help="list stored shipments (keys only)")
    a = ap.parse_args()

    db = load()
    if a.cmd == "list":
        for k, v in db["shipments"].items():
            print(k[:12], v.get("from"), "→", v.get("to"), v.get("status"), v.get("eta") or "")
        return
    k = key_for(a.ref, a.phone)
    if a.cmd == "remove":
        print("removed" if db["shipments"].pop(k, None) else "not found")
        save(db)
        return

    sh = db["shipments"].get(k, {"history": {}})
    is_new = k not in db["shipments"]
    if is_new and not (a.frm and a.to):
        sys.exit("A new shipment needs --from and --to.")
    if a.frm: sh["from"] = a.frm
    if a.to: sh["to"] = a.to
    if a.cars: sh["cars"] = a.cars
    if a.eta:
        datetime.date.fromisoformat(a.eta)
        sh["eta"] = a.eta
    if a.note is not None: sh["note"] = a.note
    status = a.status or sh.get("status") or "confirmed"
    sh["status"] = status
    stamp = now()
    for st in STATUSES[: STATUSES.index(status) + 1]:   # earlier steps count as done
        sh["history"].setdefault(st, stamp)
    for st in STATUSES[STATUSES.index(status) + 1 :]:   # moving a status back clears later steps
        sh["history"].pop(st, None)
    sh["updated"] = stamp
    db["shipments"][k] = sh
    save(db)
    print(("added " if is_new else "updated ") + f"{a.ref.upper()} → {status}")


if __name__ == "__main__":
    main()
