"""Showcase Register for the public demo: "Pinewood Stays" (Manali, Kasol, Shimla). Every name, phone and amount is
invented. Dates are written around BASE; the browser moves them so BASE becomes the visitor's today (demo never ages).

  python -I src/make_seed.py build/seed.json
"""
import datetime as dt, json, random, sys

random.seed(11)
BASE = dt.date(2026, 1, 15)            # any fixed day: the page shifts every date by (today - BASE)
iso = lambda d: d.isoformat()
day = lambda n: BASE + dt.timedelta(days=n)

props = []
def prop(pid, name, city, area, typ, br, rate, clean, cleaner, **kw):
    props.append({"property_id": pid, "property": f"{name}, {area}", "city": city, "area": area, "type": typ, "bedrooms": br,
                  "bathrooms": max(1, br - 1), "base_rate": rate, "base_guests": br * 2, "max_guests": br * 2 + 2,
                  "extra_guest_fee": 600, "cleaning_fee": clean, "cleaner": cleaner, "status": "Active",
                  "check_in_time": "13:00", "check_out_time": "11:00", "ownership": "Owned" if not kw.get("owner_share") else "Managed",
                  "amenities": ["Wi-Fi", "Parking", "Kitchen", "Hot water", "Heater"] + (["Bonfire area"] if br >= 2 else []),
                  "description": f"{name} in {area}, {city}: {br} bedroom {typ.lower()} with mountain views.",
                  "rules": "No parties after 10 PM. Pets on request.", "live_since": iso(day(-400 - len(props) * 20)),
                  "owner_share": None, **kw})

prop("P01", "Oak House", "Manali", "Old Manali", "Heritage Home", 4, 7800, 1200, "Hill Housekeeping")
prop("P02", "Cedar Loft", "Manali", "Vashisht", "Apartment", 2, 4200, 800, "Hill Housekeeping")
prop("P03", "Apple Orchard Cottage", "Manali", "Aleo", "Cottage", 3, 6200, 1000, "Bhupesh N.", owner_share=0.3)
prop("P04", "Hadimba Woods Villa", "Manali", "Hadimba Road", "Villa", 5, 11500, 1500, "Bhupesh N.")
prop("P05", "Log Hut Studio", "Manali", "Log Huts", "Studio", 1, 3200, 600, "Hill Housekeeping")
prop("P06", "Prini Pine Cabin", "Manali", "Prini", "Cottage", 2, 4800, 800, "Bhupesh N.")
prop("P07", "Parvati Riverside Cottage", "Kasol", "Parvati Bank", "Riverside Cottage", 2, 4500, 700, "Valley Services")
prop("P08", "Chalal Pine Cabin", "Kasol", "Chalal", "Cottage", 2, 3900, 700, "Mohan L.")
prop("P09", "Tosh Sky Cottage", "Kasol", "Tosh", "Cottage", 3, 5600, 900, "Pooja R.", owner_share=0.25)
prop("P10", "Katagla Studio", "Kasol", "Katagla", "Studio", 1, 2800, 500, "Valley Services")
prop("P11", "Kalga Apple Farm Stay", "Kasol", "Kalga", "Villa", 4, 8200, 1200, "Pooja R.")
prop("P12", "Ridge View Apartment", "Shimla", "Mall Road", "Apartment", 2, 5200, 800, "Sunita (Ridge Clean)")
prop("P13", "Jakhoo Hill Villa", "Shimla", "Jakhoo", "Villa", 4, 9800, 1300, "Ramesh K.")
prop("P14", "Mashobra Woods Cottage", "Shimla", "Mashobra", "Cottage", 3, 6900, 1000, "Ramesh K.", owner_share=0.3)
prop("P15", "Summer Hill Studio", "Shimla", "Summer Hill", "Studio", 1, 3400, 600, "Sunita (Ridge Clean)")
prop("P16", "Lakkar Bazaar Loft", "Shimla", "Lakkar Bazaar", "Apartment", 2, 4600, 800, "Sunita (Ridge Clean)")

FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Saanvi", "Vihaan", "Anaya", "Ishaan", "Tara", "Neil", "Zoya", "Arjun",
         "Ira", "Dev", "Nisha", "Rahul", "Priya", "Aditya", "Kavya", "Siddharth", "Ananya", "Varun", "Pooja"]
LAST = ["Mehta", "Kapoor", "Das", "Iyer", "Singh", "Joshi", "Rao", "Bose", "Malhotra", "Thomas", "Nair", "Verma",
        "Chopra", "Reddy", "Bhatt", "Sethi", "Arora", "Gupta", "Saxena", "Menon"]
CH = [("Airbnb", .155, 5), ("Booking.com", .18, 3), ("MakeMyTrip", .2, 2), ("Direct", 0, 3)]
ACC = ["Business bank account", "Owner UPI", "Manager UPI"]
name = lambda: f"{random.choice(FIRST)} {random.choice(LAST)}"
bookings, busy, n = [], {}, 0

def book(pid, ci, nights, ch=None, **kw):
    global n
    co = ci + dt.timedelta(days=nights)
    if any(ci < b and a < co for a, b in busy.get(pid, [])):
        return None
    n += 1
    ch = ch or random.choices([c[0] for c in CH], [c[2] for c in CH])[0]
    fee = {c[0]: c[1] for c in CH}[ch]
    p = next(x for x in props if x["property_id"] == pid)
    weekend = sum(1 for i in range(nights) if (ci + dt.timedelta(days=i)).weekday() in (4, 5))
    tariff = round((p["base_rate"] * nights + p["base_rate"] * .15 * weekend) * random.uniform(.92, 1.08) / 50) * 50
    direct, past = ch == "Direct", ci < BASE
    rec = tariff if (not direct or past) else round(tariff / 2)
    b = {"booking_id": f"BK{3000 + n}", "booking_date": iso(ci - dt.timedelta(days=random.randint(3, 50))), "property_id": pid,
         "guest": name(), "phone": f"+91 98{random.randint(10, 99)}{random.randint(100000, 999999)}",
         "guests": random.randint(1, p["max_guests"] - 1), "channel": ch, "check_in": iso(ci), "check_out": iso(co),
         "tariff": tariff, "platform_fee": round(tariff * fee), "gst": round(tariff * fee * .18) if fee else 0,
         "received": rec if direct else (tariff - round(tariff * fee) if ci < BASE - dt.timedelta(days=5) else 0),
         "balance_due": (tariff - rec) if direct and tariff - rec else None, "payment_terms": "UPI" if direct else "Banking",
         "account": random.choice(ACC), "booking_status": "Confirmed", "notes": ""}
    b.update(kw)
    bookings.append(b)
    if b["booking_status"] != "Cancelled":
        busy.setdefault(pid, []).append((ci, co))
    return b

for p in props:                                       # history (6 months) and the next 3 months, busier on weekends
    d = day(-185)
    while d < day(95):
        ahead = (d - BASE).days
        if random.random() < (.72 if ahead < 0 else .62 - ahead / 300):
            book(p["property_id"], d, random.choice([1, 2, 2, 3, 3, 4, 5]))
        d += dt.timedelta(days=random.randint(1, 4))
for pid, off in (("P02", 0), ("P08", 0), ("P12", -2), ("P05", -3)):   # a busy check-in desk today
    book(pid, day(off), 2 if off else 3)
for i in range(6):                                    # a few cancellations
    b = book(random.choice(props)["property_id"], day(random.randint(5, 60)), 2, booking_status="Cancelled", cancel_reason="Guest changed plans")

payouts = [{"reference": f"PO{i:04d}", "booking_id": b["booking_id"], "received_on": iso(dt.date.fromisoformat(b["check_out"]) + dt.timedelta(days=3)),
            "amount_received": b["tariff"] - b["platform_fee"], "channel": b["channel"]}
           for i, b in enumerate(x for x in bookings if x["channel"] != "Direct" and x["booking_status"] == "Confirmed"
                                 and dt.date.fromisoformat(x["check_out"]) < BASE - dt.timedelta(days=5))]
turnovers = [{"booking_id": b["booking_id"], "property_id": b["property_id"], "date": b["check_out"],
              "status": "Done" if b["check_out"] < iso(BASE) else "Pending",
              "cleaner": next(p["cleaner"] for p in props if p["property_id"] == b["property_id"])}
             for b in bookings if b["booking_status"] == "Confirmed" and abs((dt.date.fromisoformat(b["check_out"]) - BASE).days) < 30]
expenses, e = [], 0
def exp(date, pid, cat, amt, via="UPI", frm="Business bank account", **kw):
    global e
    e += 1
    expenses.append({"expense_id": f"EX{e:04d}", "date": date, "property_id": pid, "category": cat, "amount": amt,
                     "paid_via": via, "paid_from": frm, "vendor": kw.pop("vendor", ""), **kw})
for m in range(-6, 1):
    first = (BASE.replace(day=1) + dt.timedelta(days=32 * m)).replace(day=1)
    exp(iso(first), "*", "Software", 2400, "Card", vendor="Channel manager")
    for p in props:
        exp(iso(first + dt.timedelta(days=random.randint(2, 25))), p["property_id"], "Electricity", random.randint(18, 60) * 100, "Auto-debit")
        for _ in range(random.randint(2, 4)):
            exp(iso(first + dt.timedelta(days=random.randint(0, 27))), p["property_id"],
                random.choice(["Cleaning", "Laundry", "Supplies", "Repairs", "Groceries"]), random.randint(4, 45) * 100,
                random.choice(["UPI", "Cash", "Card"]), random.choice(ACC))
expenses = [x for x in expenses if x["date"] <= iso(BASE)]
lists = [{"row_id": f"L{i + 1:02d}", "list": l, "value": v, "active": "Yes", "fee_pct": f} for i, (l, v, f) in enumerate([
    ("platform", "Airbnb", 15.5), ("platform", "Booking.com", 18), ("platform", "MakeMyTrip", 20), ("platform", "Direct", None),
    ("payment_term", "Banking", None), ("payment_term", "UPI", None), ("payment_term", "Cash", None),
    ("account", "Business bank account", None), ("account", "Owner UPI", None), ("account", "Manager UPI", None)])]
addons = [{"id": "cook", "title": "Home cook", "price": 700, "per": "per meal"},
          {"id": "bonfire", "title": "Bonfire evening", "price": 900, "per": "per evening"},
          {"id": "taxi", "title": "Airport / bus stand pickup", "price": 1800, "per": "once"},
          {"id": "late", "title": "Late check-out", "price": 1000, "per": "once"}]
settings = [{"key": "google_client_id", "value": "demo-cid"}, {"key": "pricing.weekend_markup_pct", "value": 15},
            {"key": "pricing.weekend_nights", "value": "fri,sat"}, {"key": "pricing.direct_discount_pct", "value": 5},
            {"key": "pricing.holiday_markup_pct", "value": 20}, {"key": "pricing.addons", "value": json.dumps(addons)},
            {"key": "ops.start_date", "value": iso(day(-2))},
            {"key": "ops.geotag", "value": "off"}]   # a public demo shouldn't ask visitors for their location
overrides = [{"ov_id": "H1", "unit_id": "*", "from": iso(day(24)), "to": iso(day(26)), "pct": 20, "note": "Long weekend"},
             {"ov_id": "H2", "unit_id": "*", "from": iso(day(70)), "to": iso(day(73)), "pct": 25, "note": "Holi"},
             {"ov_id": "C1", "unit_id": "P04", "from": iso(day(10)), "to": iso(day(12)), "rate": 13500, "note": "Snowfall weekend"}]
guest_info = [{"property_id": p["property_id"], "wifi_name": f"Pinewood-{p['property_id']}", "wifi_password": "demo-only",
               "pin_steps": "Wake the keypad | Enter your PIN | Press #", "checkin_steps": "Self check-in with the keypad",
               "checkout_note": "Leave the keys on the dining table", "parking": "Free, inside the gate"} for p in props]
users = [{"email": "owner@pinewood.demo", "name": "Riya Sharma", "role": "Admin", "active": "Yes"},
         {"email": "partner@pinewood.demo", "name": "Kunal Sharma", "role": "Admin", "active": "Yes"},
         {"email": "asha@pinewood.demo", "name": "Asha Thakur", "role": "Manager", "active": "Yes", "login": "asha", "properties": "P01, P02, P03, P04, P05, P06"},
         {"email": "karan@pinewood.demo", "name": "Karan Negi", "role": "Manager", "active": "Yes", "login": "karan", "properties": "P07, P08, P09, P10, P11"},
         {"email": "accounts@pinewood.demo", "name": "Accounts (view only)", "role": "Viewer", "active": "Yes"}]
ISSUES = [("Geyser not heating", "High"), ("Wi-Fi slow in the bedroom", "Medium"), ("Leaking bathroom tap", "Medium"),
          ("Door lock battery low", "High"), ("Heater fuse blown", "High"), ("Curtain rail loose", "Low"),
          ("Kitchen chimney noisy", "Low"), ("Balcony light not working", "Low"), ("TV remote missing", "Low"), ("Water pressure low", "Medium")]
maint = [{"ticket_id": f"MT{i:03d}", "property_id": random.choice(props)["property_id"], "reported_on": iso(day(-random.randint(0, 30))),
          "issue": t, "priority": pr, "status": random.choice(["Open", "Open", "In progress", "Closed"]),
          "assigned_to": random.choice(["Asha Thakur", "Karan Negi"]), "cost": random.choice([0, 350, 800, 1500])} for i, (t, pr) in enumerate(ISSUES)]
STAGES = ["Asked", "Quoted", "Quoted", "Held", "Booked", "Booked", "Expired", "Requested"]
leads = []
for i in range(34):
    p = random.choice(props)
    ci = day(random.randint(3, 50))
    st = STAGES[i % len(STAGES)]
    leads.append({"lead_id": f"LD{i:03d}", "created_at": iso(day(-(i // 2))) + f"T{9 + i % 11:02d}:{(i * 7) % 60:02d}", "kind": "stay",
                  "name": name(), "phone": f"+91 97{random.randint(10, 99)}{random.randint(100000, 999999)}", "stage": st,
                  "property_id": p["property_id"], "city": p["city"], "check_in": iso(ci), "check_out": iso(ci + dt.timedelta(days=random.randint(2, 4))),
                  "guests": random.randint(2, 6), "times_asked": 1 + i % 3, "quoted": p["base_rate"] * 2 if st != "Asked" else "",
                  "status": "Won" if st == "Booked" else "New" if i % 3 else "Contacted"})
upcoming = [b for b in bookings if b["check_in"] <= iso(BASE) < b["check_out"] and b["booking_status"] == "Confirmed"]
requests = [{"request_id": f"RQ{i:03d}", "created_at": iso(BASE) + "T0" + str(8 + i) + ":30", "booking_id": b["booking_id"],
             "property_id": b["property_id"], "addon": random.choice(["Bonfire evening", "Home cook", "Extra blankets", "Late check-out"]),
             "price": random.choice([0, 700, 900, 1000]), "status": "New", "phone": b["phone"]} for i, b in enumerate(upcoming[:5])]
blocks = [{"block_id": "BL1", "property_id": "P13", "from": iso(day(15)), "to": iso(day(18)), "reason": "Owner stay"}]

seed = {"Properties": props, "Bookings": bookings, "Payouts": payouts, "Turnovers": turnovers, "Expenses": expenses,
        "Lists": lists, "Settings": settings, "Overrides": overrides, "GuestInfo": guest_info, "Users": users,
        "Maintenance": maint, "Leads": leads, "Requests": requests, "Blocks": blocks}
json.dump({"base": iso(BASE), "tabs": seed}, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print({k: len(v) for k, v in seed.items()})
