# GrowTH local demo

Open http://localhost:3000/growth_demo.html for the user-facing prototype.
The old API/Google troubleshooting screen is preserved at `auth_debug.html`.

## Run (from backend/)

PostgreSQL must be running with `growth_db` initialized using `growth_schema.sql`
and `admin_schema.sql`. Set `DATABASE_URL`, `PGPASSWORD` and `JWT_SECRET` locally
in `.env` (never commit that file).

Run these in separate terminals:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
.\venv\Scripts\python.exe -m http.server 3000 --bind 127.0.0.1 --directory tests
```

Use `localhost:3000` in the browser because that is the API's default allowed
CORS origin. A visit via `127.0.0.1:3000` redirects to `localhost:3000`.

## Features

- Register without an email verification step, then sign in immediately.
- Sign in with Google through Google Identity Services and the backend
  `POST /api/auth/google` endpoint. New Google accounts must accept the terms checkbox.
- Log in/out; automatically refresh expired access tokens.
- Add/select/edit child profiles (name, sex and birth date).
- Add height/weight measurements and read saved history and BMI.
- Confirm before permanently deleting a child and their measurements.
- Reload or sign out/in to confirm that profiles persist in PostgreSQL.

Accounts live in `usr_accounts`, children in `chd_profiles`, measurements in
`chd_growth_records` and sessions in `usr_sessions`. Data belongs to the signed-in
parent, enforced by the existing backend. Passwords are stored as bcrypt hashes.
This does not store real passwords or child profiles in JSON files/browser storage.

The optional `demo_login.local.json` contains only the existing dummy login and is
ignored by Git. The example JSON is a fixture, not a live account export. Never
serve the tests directory publicly: it includes this local fixture and debug tools.

The new page stores session tokens in sessionStorage for this tab (and memory),
not persistent localStorage. A closed tab requires another login. This remains a
local prototype; production session transport must be reviewed before deployment.

Google sign-in is available on `growth_demo.html` after `GOOGLE_CLIENT_IDS` is
configured in `.env` and matches the public `GOOGLE_CLIENT_ID` in `growth_demo.js`.
Add the selected account to Google's test users if required by the project's
testing configuration. `http://localhost:3000` must be an authorized JavaScript
origin. The button has rendered locally, but successful real-account sign-in
still needs end-to-end verification. The `auth_debug.html` page remains available
for lower-level troubleshooting.

When reference LMS data is absent/partial, the new UI says it cannot assess growth.
The backend now returns an incomplete-reference message for new measurements;
the UI also handles old records that still contain the former generic “normal” text.
Available flagged results remain visible even when other references are missing.
Changing birth date/sex does not recalculate past measurements (existing API behavior).
