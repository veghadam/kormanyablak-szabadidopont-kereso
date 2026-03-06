#!/usr/bin/env python3
"""
Kormányablak Slot Checker — Standalone mode (no browser required)

Uses session cookies extracted from your browser to check available
appointment slots directly via HTTP requests.

Usage:
    python check_slots_standalone.py --county budapest --weeks 6

Setup:
    1. Log in to https://idopontfoglalo.kh.gov.hu in your browser
    2. Open DevTools (F12) → Application → Cookies → idopontfoglalo.kh.gov.hu
    3. Copy cookie values into cookies.json (see cookies.example.json)
    4. Run this script
"""

import argparse
import json
import re
import time
from datetime import date, timedelta
from pathlib import Path
from html.parser import HTMLParser

try:
    import requests
except ImportError:
    print("Missing dependency: pip install requests")
    raise

BASE_URL = "https://idopontfoglalo.kh.gov.hu"

BUDAPEST_OFFICES = [
    {"id": "61",  "label": "1013 Budapest, Attila út 12."},
    {"id": "62",  "label": "1024 Budapest, Margit körút 47-49."},
    {"id": "280", "label": "1029 Budapest, Bátori László u. 2."},
    {"id": "63",  "label": "1033 Budapest, Harrer Pál utca 9-11."},
    {"id": "64",  "label": "1042 Budapest, István út 15."},
    {"id": "65",  "label": "1051 Budapest, Erzsébet tér 3."},
    {"id": "66",  "label": "1062 Budapest, Andrássy út 55."},
    {"id": "286", "label": "1062 Budapest, Teréz körút 55. (Nyugati)"},
    {"id": "68",  "label": "1073 Budapest, Erzsébet körút 6."},
    {"id": "69",  "label": "1082 Budapest, Baross utca 59."},
    {"id": "70",  "label": "1087 Budapest, Kerepesi út 2-6. (Keleti)"},
    {"id": "72",  "label": "1092 Budapest, Bakáts tér 14."},
    {"id": "73",  "label": "1102 Budapest, Havas Ignác utca 1-3."},
    {"id": "75",  "label": "1113 Budapest, Bocskai út 39-41."},
    {"id": "78",  "label": "1126 Budapest, Kiss János altábornagy u. 31-33/A"},
    {"id": "347", "label": "1133 Budapest, Visegrádi u. 110. (Központi)"},
    {"id": "80",  "label": "1139 Budapest, Teve utca 1/A-C"},
    {"id": "81",  "label": "1145 Budapest, Pétervárad utca 17."},
    {"id": "83",  "label": "1153 Budapest, Bácska utca 14."},
    {"id": "84",  "label": "1165 Budapest, Baross Gábor utca 28-30."},
    {"id": "85",  "label": "1173 Budapest, Pesti út 163."},
    {"id": "86",  "label": "1181 Budapest, Üllői út 445."},
    {"id": "87",  "label": "1195 Budapest, Városház tér 18-20."},
    {"id": "89",  "label": "1201 Budapest, Vörösmarty utca 3."},
    {"id": "90",  "label": "1211 Budapest, Szent Imre tér 11."},
    {"id": "91",  "label": "1221 Budapest, Kossuth Lajos utca 25-29."},
    {"id": "93",  "label": "1238 Budapest, Grassalkovich út 158."},
]

PEST_OFFICES = [
    {"id": "107", "label": "2457 Adony, Rákóczi utca 21."},
    {"id": "108", "label": "2060 Bicske, Szent István út 7-11."},
    {"id": "109", "label": "2400 Dunaújváros, Október 23. tér 1."},
    {"id": "307", "label": "2451 Ercsi, Fő utca 27."},
    {"id": "111", "label": "2483 Gárdony, Szabadság út 20-22."},
    {"id": "112", "label": "2462 Martonvásár, Budai út 1."},
    {"id": "170", "label": "2510 Dorog, Hantken Miksa utca 8."},
    {"id": "171", "label": "2500 Esztergom, Bottyán János utca 3."},
    {"id": "308", "label": "2536 Nyergesújfalu, Kossuth Lajos utca 104-106."},
    {"id": "178", "label": "2660 Balassagyarmat, Rákóczi fejedelem út 12."},
    {"id": "181", "label": "2651 Rétság, Rákóczi út 20-21."},
    {"id": "316", "label": "2740 Abony, Kossuth Lajos tér 1."},
    {"id": "184", "label": "2170 Aszód, Szabadság tér 9."},
    {"id": "185", "label": "2092 Budakeszi, Dózsa György tér 25."},
    {"id": "186", "label": "2040 Budaörs, Szabadság út 134."},
    {"id": "191", "label": "2700 Cegléd, Kossuth tér 1."},
    {"id": "187", "label": "2700 Cegléd, Kölcsey tér 3."},
    {"id": "188", "label": "2371 Dabas, Szent János út 112."},
    {"id": "306", "label": "2049 Diósd, Szent István tér 1."},
    {"id": "355", "label": "2330 Dunaharaszti, Báthory utca 1."},
    {"id": "322", "label": "2120 Dunakeszi, Verseny utca 1."},
    {"id": "190", "label": "2030 Érd, Budai út 8."},
    {"id": "321", "label": "2030 Érd, Diósdi út 4."},
    {"id": "192", "label": "2100 Gödöllő, Kotlán Sándor utca 1-3."},
    {"id": "193", "label": "2360 Gyál, Somogyi Béla utca 2."},
    {"id": "317", "label": "2230 Gyömrő, Fő tér 1/A"},
    {"id": "194", "label": "2200 Monor, Kossuth Lajos utca 78-80."},
    {"id": "195", "label": "2760 Nagykáta, Dózsa György út 3."},
    {"id": "196", "label": "2750 Nagykőrös, Szabadság tér 4."},
    {"id": "311", "label": "2364 Ócsa, Bajcsy-Zsilinszky utca 26."},
    {"id": "314", "label": "2119 Pécel, Kossuth tér 1."},
    {"id": "197", "label": "2085 Pilisvörösvár, Fő utca 66."},
    {"id": "198", "label": "2300 Ráckeve, Szent István tér 4."},
    {"id": "199", "label": "2440 Százhalombatta, Szent István tér 5."},
    {"id": "200", "label": "2000 Szentendre, Dózsa György út 8."},
    {"id": "201", "label": "2310 Szigetszentmiklós, Apor Vilmos utca 1."},
    {"id": "202", "label": "2628 Szob, Szent Imre utca 12."},
    {"id": "203", "label": "2022 Tahitótfalu, Szabadság tér 3."},
    {"id": "348", "label": "2316 Tököl, Fő utca 119."},
    {"id": "310", "label": "2045 Törökbálint, Munkácsy Mihály utca 79."},
    {"id": "366", "label": "2194 Tura, Puskin tér 26."},
    {"id": "315", "label": "2600 Vác, Dr. Csányi László krt. 45."},
    {"id": "205", "label": "2600 Vác, Széchenyi utca 42."},
    {"id": "206", "label": "2220 Vecsés, Fő út 246-248."},
    {"id": "312", "label": "2112 Veresegyház, Fő út 45-47."},
]


def get_weeks(count: int) -> list[str]:
    today = date.today()
    days_to_monday = (7 - today.weekday()) % 7 or 7
    next_monday = today + timedelta(days=days_to_monday)
    return [(next_monday + timedelta(weeks=i)).isoformat() for i in range(count)]


def extract_slots(html: str, office_id: str, case_id: str) -> list[str]:
    """Extract booking slot times from page HTML."""
    pattern = rf'/ugyek-{re.escape(case_id)}/kormanyablak-{re.escape(office_id)}/idopont/([^"\'<>\s]+)'
    matches = re.findall(pattern, html)
    from urllib.parse import unquote
    return [unquote(m) for m in matches]


def check_office(session: requests.Session, office: dict, weeks: list[str], case_id: str) -> dict:
    # Select this office
    session.post(
        f"{BASE_URL}/ugyek-{case_id}/kormanyablak-valasztas",
        data={"form[governmentWindow]": office["id"]},
        allow_redirects=True,
    )

    for week in weeks:
        try:
            resp = session.get(
                f"{BASE_URL}/ugyek-{case_id}/kormanyablak-{office['id']}/idopont-valasztas/{week}",
                timeout=15,
            )
            slots = extract_slots(resp.text, office["id"], case_id)
            if slots:
                return {"firstAvailable": {"week": week, "count": len(slots), "slots": slots[:5]}}
        except requests.RequestException as e:
            print(f"  Warning: request failed for {office['label']}: {e}")
        time.sleep(0.2)

    return {"firstAvailable": None}


def load_cookies(cookie_file: str) -> dict:
    path = Path(cookie_file)
    if not path.exists():
        raise FileNotFoundError(
            f"Cookie file not found: {cookie_file}\n"
            "Create it from cookies.example.json with your session cookies.\n"
            "See README.md for instructions."
        )
    return json.loads(path.read_text())


def print_results(results: list, weeks_checked: int):
    with_slots = [r for r in results if r.get("firstAvailable")]
    no_slots = [r for r in results if not r.get("firstAvailable")]

    with_slots.sort(key=lambda r: r["firstAvailable"]["week"])

    if not with_slots:
        print(f"No available slots found in the next {weeks_checked} weeks.")
    else:
        print("OFFICES WITH AVAILABLE SLOTS:\n")
        for r in with_slots:
            fa = r["firstAvailable"]
            print(f"  {r['label']}")
            print(f"    First available: {fa['week']} ({fa['count']} slots)")
            for s in fa["slots"]:
                print(f"    - {s}")
            print()

    if no_slots:
        print(f"FULLY BOOKED (next {weeks_checked} weeks): {len(no_slots)} offices")
        for r in no_slots:
            print(f"  - {r['label']}")


def main():
    parser = argparse.ArgumentParser(description="Check Kormányablak appointment slots")
    parser.add_argument("--county", choices=["budapest", "pest"], default="budapest")
    parser.add_argument("--weeks", type=int, default=6, help="Number of weeks to check ahead")
    parser.add_argument("--case-id", default="OKMIR00107", help="Appointment type case ID")
    parser.add_argument("--cookies", default="cookies.json", help="Path to cookies JSON file")
    args = parser.parse_args()

    cookies = load_cookies(args.cookies)
    offices = BUDAPEST_OFFICES if args.county == "budapest" else PEST_OFFICES
    weeks = get_weeks(args.weeks)

    session = requests.Session()
    session.cookies.update(cookies)
    session.headers.update({"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})

    print(f"Checking {'Budapest' if args.county == 'budapest' else 'Pest Vármegye'} offices")
    print(f"Weeks: {', '.join(weeks)}\n")

    results = []
    for office in offices:
        print(f"  Checking {office['label']}...", end=" ", flush=True)
        result = check_office(session, office, weeks, args.case_id)
        result.update(office)
        results.append(result)
        fa = result.get("firstAvailable")
        print(f"{'✓ ' + fa['week'] if fa else 'full'}")

    print()
    print_results(results, args.weeks)


if __name__ == "__main__":
    main()
