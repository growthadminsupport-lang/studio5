# GrowTH Backend

FastAPI backend for parent accounts, child profiles, and growth records, backed by PostgreSQL.

**Status, 2026-09-23:** password-preserving Google linking and new-account email verification are implemented. Regression tests, the React build, a disposable PostgreSQL HTTP smoke run, and a legacy-schema migration check pass. SMTP delivery and a real Google browser sign-in still need live verification before deployment.

## Start here

- [Frontend API guide](docs/frontend-api.md): connection settings, endpoints, and child/growth examples.
- [Authentication guide](docs/frontend-auth-integration.md): login, Google Sign-In, refresh, and logout.
- [Local demo](tests/growth-demo.md): a browser example for exercising the APIs.
- [Google verification notes](tests/google-auth-verification.md): completed checks and remaining live tests.
- [Changes in this handoff](CHANGELOG.md).

After starting the backend:

| Resource | Local URL |
| --- | --- |
| API base | http://127.0.0.1:8000 |
| Swagger UI | http://127.0.0.1:8000/docs |
| OpenAPI specification | http://127.0.0.1:8000/openapi.json |
| Database health check | http://127.0.0.1:8000/health |
| Optional demo (separate server) | http://localhost:3000/growth_demo.html |

`localhost` and `127.0.0.1` refer to the computer running the browser. A teammate must run their own backend locally or use a shared deployed API. Cloning this repository does not copy the local database or its accounts.

## Implemented scope

| Area | Current behavior |
| --- | --- |
| Accounts | New password registrations require an email link and registration password before login. Existing accounts remain accessible. |
| Sessions | Bearer access tokens, rotating refresh tokens, session listing, logout, and logout from all devices. |
| Google | Verify a Google ID token, create an account, or sign in with an already-linked identity. An email match returns `LINK_REQUIRED`; authenticated linking requires the website password and a fresh Google token. |
| Children | Create, list, read, update, and delete profiles belonging to the authenticated parent. |
| Growth | Save height/weight, calculate BMI, and read measurement history. Percentile/SDS require reference LMS data. |
| Email | Password reset and security notification code is implemented. SMTP delivery has not been verified; development mode logs email content. |
| Hosting | Local setup works; `render.yaml` supplies a deployment blueprint. Online deployment is pending. |
| AI and other modules | Bone-age, puberty screening, admin, and article tables exist, but their APIs are not implemented. |

The fresh schema now includes `usr_email_verifications`. A table's existence does not mean its feature has an API.

## Run locally

Commands below use PowerShell from the repository root (the directory containing `main.py`).

### 1. Install dependencies

Use Python 3.13 and PostgreSQL; the existing local environment was tested with PostgreSQL 18.

```powershell
py -3.13 -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

If the virtual environment already exists, reuse it.

### 2. Configure the backend

For a new checkout, copy the template once:

```powershell
Copy-Item .env.example .env
```

Do not overwrite an existing `.env`. Edit its values for your machine:

```dotenv
DATABASE_URL=postgresql+asyncpg://postgres@localhost:5432/growth_db
PGPASSWORD=<your-local-postgres-password>
JWT_SECRET=<your-own-random-secret-at-least-32-characters>
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
APP_BASE_URL=http://localhost:5173
APP_ENV=development
# Optional:
# GOOGLE_CLIENT_IDS=<web-client-id>.apps.googleusercontent.com
```

Generate a JWT secret locally:

```powershell
.\venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

Keep the generated value in `.env`; never put it in frontend variables or commit it. See [.env.example](.env.example) for pool, Google, and SMTP settings. `APP_BASE_URL` controls links in emails, while `CORS_ORIGINS` controls browser access.

### 3. Initialize a new database

Skip this step if the database is already initialized. With PostgreSQL running and `psql` on PATH:

```powershell
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE growth_db;"
psql -h localhost -U postgres -d growth_db -v ON_ERROR_STOP=1 -f growth_schema.sql
psql -h localhost -U postgres -d growth_db -v ON_ERROR_STOP=1 -f admin_schema.sql
```

Enter the database password when prompted. If `psql` is not on PATH, invoke its installed executable instead. The main schema is a fresh-database initialization script, not a repeatable migration; do not rerun it over an existing database. Existing installations must first have [the Google migration](migrations/2026-08-22_google_signin.sql) if it was not already applied, then apply [the email verification migration](migrations/2026-09-23_email_verification.sql). The latter leaves legacy accounts accessible and unmarked as verified.

### 4. Start the API

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

The health check queries PostgreSQL. A successful response includes `status: "ok"`, the PostgreSQL version, and the table count.

### 5. Start the React frontend

From `frontend`, copy `.env.example` to `.env`, set `VITE_GOOGLE_CLIENT_ID`, then run `npm ci` and `npm run dev`. Use the exact Vite origin in `CORS_ORIGINS` and `APP_BASE_URL`.

### 6. Start the optional demo

```powershell
.\venv\Scripts\python.exe -m http.server 3000 --bind 127.0.0.1 --directory tests
```

Open http://localhost:3000/growth_demo.html. It supports email registration/login, a Google button, child profiles, and growth history. Successful writes go to the configured PostgreSQL database.

The demo is test source, not the production frontend. Keep the test server on loopback: the directory can contain ignored local fixtures. The frontend team owns the production UI.

## Connect a frontend

Example Vite configuration:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

Use the same variable names throughout the frontend. Add its exact origin to backend `CORS_ORIGINS` and restart the API after environment changes. For Google, register that frontend origin with the matching Web OAuth client.

```text
Frontend → login / register / Google credential → FastAPI
Frontend ← GrowTH access token + refresh token ← FastAPI
Frontend → Bearer access token → child/growth API → PostgreSQL
```

Use the returned API `id` fields for URLs. Database primary keys have names such as `usr_id` and `chd_id`; do not substitute those names into the frontend JSON contract. Request and response examples are in the [frontend API guide](docs/frontend-api.md).

## Security behavior and limits

- Passwords are stored as bcrypt hashes; refresh tokens are stored as hashes.
- Access tokens expire after 15 minutes. Refresh tokens have a 30-day lifetime and rotate on use; reusing an old token can revoke its session family.
- Child and growth endpoints check ownership. A missing child or another parent's child returns `404`.
- Google verification checks the signature, audience, issuer, expiry, subject, and verified email. Email alone never links an existing account.
- Linking requires the current website password and a Google ID token issued within five minutes for the same email. It retains the password, sessions, and child data.
- New password registrations cannot log in until email verification. A delivered password reset also verifies a pending account's email. Legacy accounts are not silently marked verified.
- Failed-login controls and temporary account lockout are implemented. Registration still needs rate limiting before public launch.
- Validation errors omit rejected raw input and exception context, including submitted passwords/tokens.
- Logout and logout-all revoke refresh sessions; already-issued access tokens can remain valid until expiry. Logout-all does not itself change the password timestamp.
- The React frontend keeps access tokens in memory and refresh tokens in session or local storage, depending on Remember me. An HttpOnly cookie design would need backend and CSRF changes.
- SMTP-free development logs may contain reset links and personal information. Keep those logs private.

These controls are not a claim of a completed security audit or production readiness.

## Data and calculation limits

- Reference LMS data has not been seeded in the current local setup. Missing reference values produce null percentile/SDS fields and an incomplete-reference message; `is_flagged: false` alone does not establish a normal result.
- Changing a child's sex or birth date does not recalculate existing growth records.
- One measurement per child per date is allowed. Deleting a child cascades to associated records.
- There is no upload endpoint, private image storage integration, model loader, or AI inference endpoint yet.

## Verification

Run the isolated Python regression suite:

```powershell
.\venv\Scripts\python.exe -X utf8 tests\run_regression_tests.py
node --check tests\growth_demo.js
```

Node is only needed for the optional JavaScript syntax check.

For integration testing against a dedicated local test database, start an API configured for that same database, then run:

```powershell
powershell -File tests\auth_api_smoke_test.ps1 -Psql "<path-to-psql.exe>" -Database "<test-database>"
powershell -File tests\children_growth_api_smoke_test.ps1 -Psql "<path-to-psql.exe>" -Db "<test-database>"
```

These smoke tests create disposable accounts/data and clean them up. Configure PostgreSQL authentication for the scripts; `psql` does not read the application's `.env` automatically. Never target a production database. The auth script verifies the email registration and password reset paths; the real Google button and link flow still require a Google test account in the browser.

Verification record:
- 2026-09-23: the Python regression runner passed all eight test files, including Google linking and email verification checks. The React production build passed.
- 2026-09-23: a disposable PostgreSQL 18/FastAPI HTTP run passed pending registration, verification, password login, and cleared-password recovery. The migration preserved a legacy account's hash and accessibility. The temporary cluster was removed.
- 2026-09-22: the local Google button rendered; JavaScript syntax and Git whitespace checks passed.
- Earlier recorded local HTTP checks: auth 53/53 and children/growth 32/32. These counts are historical, not a new run during this documentation handoff.
- Google success routes use database mocks in regression tests; a successful real-account Google flow and SMTP delivery still need verification.
- The runner currently emits a Starlette/httpx deprecation warning; tests still pass.

## Repository layout

```text
main.py                     FastAPI entry point and CORS
routes_auth.py              Authentication endpoints
routes_children.py          Child profiles and ownership checks
routes_growth.py            Growth record endpoints
auth.py / security.py       Tokens, sessions, and password policy
google_oauth.py / mailer.py  Google verification and email delivery
models.py / database.py     ORM and database connection
growth_calc.py              BMI and reference-based calculations
growth_schema.sql           Main schema for a fresh database
admin_schema.sql            Admin and content schema
migrations/                 Existing-database migrations
docs/                       Frontend handoff guides
tests/                      Regression tests, demos, and example app
render.yaml                 Proposed Render deployment configuration
.env.example                Configuration template
```

## Before going online

Deploy the API and database only after applying the correct schema/migrations, setting actual frontend HTTPS origins and email-link URL, configuring `APP_ENV=production` with SMTP, and receiving a verification and reset email at the reachable React pages. Verify Google origins and end-to-end login, rate limits, session handling, and backup/restore. Reference data and AI/image storage remain separate unfinished work.

Use the actual URL assigned to the deployed service; no example Render URL in documentation should be treated as a live endpoint. Keep `.env`, local credentials, logs, uploads, and virtual environments out of Git.

See [Git handoff](docs/git-handoff.md) for review and push commands.
