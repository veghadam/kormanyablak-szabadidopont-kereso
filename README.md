# Kormányablak Szabad Időpont Kereső

Automatically checks all Budapest and Pest Vármegye Kormányablak offices for available appointment slots.

👉 [Magyar leírás lejjebb](#magyar-leírás)

---

## How it works

The Hungarian government booking site ([idopontfoglalo.kh.gov.hu](https://idopontfoglalo.kh.gov.hu)) requires:
1. Authentication via Ügyfélkapu (government SSO)
2. A server-side session to navigate the booking flow

This tool reuses your existing browser session to check slot availability across all offices without having to click through each one manually.

### Slot color meaning
- 🟢 **Green (`success`)** — available slot, contains a booking link
- 🟡 **Yellow (`warning`)** — fully booked for that hour block
- 🔴 **Red (`alert`)** — office closed / not working those hours

---

## Option A — CDP mode (browser required, easiest)

Uses Chrome DevTools Protocol to run requests inside your already-logged-in browser tab.

### Requirements
- Opera or Chrome/Chromium started with remote debugging enabled
- Node.js
- `ws` npm package

### Setup

**1. Start your browser with remote debugging:**

```bash
# Opera (macOS)
/Applications/Opera.app/Contents/MacOS/Opera --remote-debugging-port=9222

# Chrome (macOS)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Chrome (Linux)
google-chrome --remote-debugging-port=9222
```

**2. Log in to the booking site in that browser:**

Go to [https://idopontfoglalo.kh.gov.hu](https://idopontfoglalo.kh.gov.hu) and log in with your Ügyfélkapu credentials. Navigate to the office selection step for your appointment type.

**3. Install dependencies:**

```bash
npm install ws
```

**4. Run the checker:**

```bash
# Check Budapest offices (next 6 weeks)
node check_slots.js --county budapest

# Check Pest Vármegye offices (next 3 weeks)
node check_slots.js --county pest --weeks 3

# Custom browser port
node check_slots.js --county budapest --port 9223
```

**5. Run the monitor (checks every 5 minutes, sends desktop notification):**

```bash
node monitor.js --county budapest --interval 5
```

### Environment variables

| Variable  | Default      | Description                        |
|-----------|--------------|------------------------------------|
| `CASE_ID` | `OKMIR00107` | Appointment type ID from the URL   |

To use a different appointment type, find the ID in the URL after logging in:
`/ugyek-OKMIR00107/...` → case ID is `OKMIR00107`

---

## Option B — Standalone mode (no browser needed after setup)

Uses session cookies extracted from your browser. No browser needs to stay open.

### Requirements
- Python 3.11+
- `requests` library

### Setup

**1. Log in to the booking site in any browser.**

**2. Extract session cookies:**

Open DevTools (F12) → **Application** tab → **Cookies** → `idopontfoglalo.kh.gov.hu`

Copy the cookie values into `cookies.json`:

```json
{
  "PHPSESSID": "abc123...",
  "cookie_law_dismissed": "1"
}
```

> ⚠️ `cookies.json` is in `.gitignore` — never commit it.

**3. Install dependencies:**

```bash
pip install requests
```

**4. Run:**

```bash
# Budapest offices
python check_slots_standalone.py --county budapest

# Pest Vármegye, 4 weeks ahead
python check_slots_standalone.py --county pest --weeks 4

# Custom appointment type
python check_slots_standalone.py --case-id OKMIR00107 --county budapest
```

> **Note:** Sessions expire. If you get empty results or errors, log in again and refresh `cookies.json`.

---

## Adding more counties

Office IDs can be found by inspecting the radio button values on the office selection page (`/ugyek-{CASE_ID}/kormanyablak-valasztas`). Add them to the `BUDAPEST_OFFICES` / `PEST_OFFICES` arrays (or create a new array) in either script.

---

## Disclaimer

This tool is for personal use only. Do not use it to mass-book or hold appointments. Be respectful of rate limits — the built-in 150ms delay between requests is intentional.

---
---

# Magyar leírás

# Kormányablak Szabad Időpont Kereső

Automatikusan ellenőrzi az összes budapesti és Pest vármegyei kormányablak szabad időpontjait.

---

## Hogyan működik?

A [idopontfoglalo.kh.gov.hu](https://idopontfoglalo.kh.gov.hu) oldal használatához szükséges:
1. Ügyfélkapus bejelentkezés
2. Szerver oldali munkamenet (session) a foglalási folyamat elvégzéséhez

Ez az eszköz a meglévő böngésző-munkamenetet használja fel, és egyszerre ellenőrzi az összes kormányablak szabad időpontjait — kattintgatás nélkül.

### Az időpontnaptár színei
- 🟢 **Zöld (`success`)** — szabad időpont, foglalható
- 🟡 **Sárga (`warning`)** — tele van az adott órasáv
- 🔴 **Piros (`alert`)** — zárva / nem dolgoznak abban az időszakban

---

## A módszer — CDP mód (böngésző szükséges, a legegyszerűbb)

A Chrome DevTools Protocol segítségével a már bejelentkezett böngésző-munkameneten belül futtatja a lekéréseket.

### Követelmények
- Opera vagy Chrome/Chromium böngésző hibakeresési módban indítva
- Node.js telepítve
- `ws` npm csomag

### Beállítás

**1. Indítsd el a böngészőt hibakeresési módban:**

```bash
# Opera (macOS)
/Applications/Opera.app/Contents/MacOS/Opera --remote-debugging-port=9222

# Chrome (macOS)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Chrome (Linux)
google-chrome --remote-debugging-port=9222
```

**2. Jelentkezz be az időpontfoglaló oldalra:**

Nyisd meg a [https://idopontfoglalo.kh.gov.hu](https://idopontfoglalo.kh.gov.hu) oldalt, és lépj be Ügyfélkapu azonosítóddal. Navigálj el a kormányablak-választás lépésig a saját ügykörödhöz.

**3. Telepítsd a függőségeket:**

```bash
npm install ws
```

**4. Futtasd az ellenőrzőt:**

```bash
# Budapest kormányablakok (következő 6 hét)
node check_slots.js --county budapest

# Pest vármegye (következő 3 hét)
node check_slots.js --county pest --weeks 3

# Egyéni böngésző port
node check_slots.js --county budapest --port 9223
```

**5. Folyamatos figyelés (5 percenként, asztali értesítéssel):**

```bash
node monitor.js --county budapest --interval 5
```

### Környezeti változók

| Változó   | Alapértelmezett | Leírás                                  |
|-----------|-----------------|-----------------------------------------|
| `CASE_ID` | `OKMIR00107`    | Ügykör azonosítója az URL-ből           |

Más ügykörhöz az azonosítót az URL-ből olvashatod ki bejelentkezés után:
`/ugyek-OKMIR00107/...` → az ügykör azonosítója: `OKMIR00107`

---

## B módszer — Önálló mód (a beállítás után nincs szükség böngészőre)

A böngészőből kimentett munkamenet-sütik (cookies) segítségével fut. A böngészőnek nem kell nyitva maradnia.

### Követelmények
- Python 3.11+
- `requests` könyvtár

### Beállítás

**1. Jelentkezz be az időpontfoglaló oldalra bármely böngészőben.**

**2. Mentsd ki a munkamenet-sütiket:**

Nyisd meg a fejlesztői eszközöket (F12) → **Application** fül → **Cookies** → `idopontfoglalo.kh.gov.hu`

Másold be a süti értékeket a `cookies.json` fájlba:

```json
{
  "PHPSESSID": "abc123...",
  "cookie_law_dismissed": "1"
}
```

> ⚠️ A `cookies.json` szerepel a `.gitignore`-ban — soha ne töltsd fel a repóba.

**3. Telepítsd a függőségeket:**

```bash
pip install requests
```

**4. Futtatás:**

```bash
# Budapest
python check_slots_standalone.py --county budapest

# Pest vármegye, 4 hét előre
python check_slots_standalone.py --county pest --weeks 4

# Egyéni ügykör
python check_slots_standalone.py --case-id OKMIR00107 --county budapest
```

> **Megjegyzés:** A munkamenetek lejárnak. Ha üres eredményt vagy hibát kapsz, jelentkezz be újra és frissítsd a `cookies.json` fájlt.

---

## További vármegyék hozzáadása

A kormányablakok azonosítói megtalálhatók a rádió gombok értékeiben a hivatal-választó oldalon (`/ugyek-{CASE_ID}/kormanyablak-valasztas`). Add hozzá őket a `BUDAPEST_OFFICES` / `PEST_OFFICES` tömbhöz (vagy hozz létre egy újat) bármelyik szkriptben.

---

## Felelősségkizárás

Ez az eszköz kizárólag személyes használatra készült. Ne használd tömeges időpontfoglalásra vagy időpontok blokkolására. Tartsd tiszteletben a szerver terhelési korlátait — a beépített 150 ms-os késleltetés szándékos.
