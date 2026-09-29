# Render deployment: GrowTH API + CDC 2000

Use the **repository-root `render.yaml`**. `backend/render.yaml` is retired.
The Blueprint provisions a free Python web service and free PostgreSQL in Singapore.
No local database is uploaded. The first start creates an empty application database
and installs only reference data, never user or administrator accounts.

## Before creating the Blueprint

Commit the backend code, migrations, `backend/data/cdc2000/` (including the manifest),
and root Blueprint. Do not commit `.env`, `.local`, test databases, or `tmp/`.
Use Render **New → Blueprint**, select the repository and the intended branch.
Fill these environment values in Render, not in source control:

| Variable | Value |
| --- | --- |
| `CORS_ORIGINS` | Exact HTTPS frontend origins, comma-separated, without paths or `*` |
| `APP_BASE_URL` | HTTPS frontend URL used in verification/reset email links |
| `RESEND_API_KEY` | Private Resend API key |
| `MAIL_FROM` | Sender on a domain verified with Resend |
| `GOOGLE_CLIENT_IDS` | Google web client ID(s); leave empty if not using Google login |

The Blueprint generates `JWT_SECRET` and supplies `DATABASE_URL` from the database's
internal connection string. Keep the generated JWT secret stable across redeploys.
Resend uses HTTPS: free Render services block standard SMTP ports. A Resend test
sender can only send to permitted test recipients; use a verified sender for other users.
Add the deployed frontend origin in Google Cloud's authorized JavaScript origins.
Set the frontend API base URL to the new API's HTTPS URL (follow its existing API client convention).

## Startup and readiness

Build: `pip install -r requirements.txt`

Start: `python init_database.py && exec uvicorn main:app --host 0.0.0.0 --port $PORT`

Python is pinned to 3.12.14, matching the tested local interpreter. Pinned dependency
resolution was checked for Linux CPython 3.12 wheels (manylinux 2.28 / manylinux2014).
The actual hosted Render build remains a post-deployment check.
Local validation on 2026-09-29 passed all 12 regression files and the live HTTP smoke
test against disposable PostgreSQL, including concurrent initialization, schema migration,
conflict rejection, readiness failures and persistence after restarting the API.

Initialization validates production settings before writes. Schema setup, known additive
migrations and CDC seeding share one transaction and advisory lock. Existing accounts
and growth results are preserved. Incompatible schema or conflicting reference data
stops startup; inspect the error and migrate explicitly, never reset a populated database.
`python init_database.py` is also the repeatable seed/repair command for missing CDC rows.

`GET /health` returns 200 only when database connectivity, mapped schema and all 1,308
expected reference rows are ready. Failures return 503 without exposing database errors.
After deployment, check `/health`, `/docs`, and the service startup logs.

## Reference behavior

The original official CDC CSV files are vendored unchanged; `manifest.json` records
their source URLs, CDC 2000 release, retrieval date and SHA-256 checksums. Both sexes
and height/weight/BMI have 218 supported age rows each. The BMI source repeats its
header and contains extra 240.5-month rows; those are deliberately not imported.

LMS age is stored as double precision to preserve CDC half-month points. Exact 24- and
240-month boundaries use the published endpoint rows; other ages use their completed
month's midpoint (e.g. age 120.2 → row 120.5). Fractional calendar age prevents a child
older than their 20th birthday from being treated as exactly 240 months. Outside
24–240 months, reference results are null and guidance indicates unavailable reference
data. No extrapolation or interpolation across missing data is performed.

Existing POST/GET growth response fields are unchanged. Old results are not recalculated.
BMI is still calculated below the reference range, but SDS/percentile remain unavailable.
This is a CDC-based project demonstration, not a replacement for a clinical assessment.

## Verification

From `backend`, run `python -X utf8 tests/run_regression_tests.py`.
For live database/API checks, create a **new disposable localhost PostgreSQL database**
whose name starts with `render_test`, set `GROWTH_TEST_DATABASE_URL` to its connection
URL and run `python -X utf8 tests/render_database_smoke.py`. It intentionally modifies
test reference data/schema and leaves the test database for inspection. Never point it
at local application or hosted data. It starts/stops its own API process and disables
external mail/Google; inbox delivery is not covered by this test.

After deploying, verify actual email delivery, verification links, password login,
Google login (if configured), child creation, growth/history, allowed frontend CORS,
and persistence after a manual service restart. Missing reference values in the UI
must not be interpreted as a normal result.

## Export before the free database expires

Free Render PostgreSQL expires **30 days after creation** and has no managed backups.
Export before expiry; do not wait for the grace period. Temporarily allow only the
operator's IP in database external access settings, use its **external** URL locally,
and remove the IP allowance afterward. Use compatible PostgreSQL client tools.
Store URLs through environment variables, never in committed scripts or shell history.

```powershell
pg_dump --dbname=$env:RENDER_EXPORT_DATABASE_URL --format=custom --no-owner --no-acl --file=growth-backup.dump
pg_restore --dbname=$env:NEW_DATABASE_URL --no-owner --no-acl growth-backup.dump
```

Restore into an empty replacement database. For a final migration, pause writes, take
the final export, restore, update the API's database binding/Blueprint, redeploy and
verify counts, login and history before resuming writes. Keep the old database and
backup until verification passes. Backups contain private user data; keep them outside Git.

Sources: [CDC data and age-bin convention](https://www.cdc.gov/growthcharts/cdc-data-files.htm),
[Render free limits](https://render.com/docs/free),
[Render Python versions](https://render.com/docs/python-version).
