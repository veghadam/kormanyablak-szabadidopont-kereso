# Kormányablak Szabad Időpont Kereső

Automatically checks all Budapest and Pest Vármegye Kormányablak offices for available appointment slots.

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
