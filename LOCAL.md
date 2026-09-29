# Local development

## Accounts and email

Register with email and password, then sign in immediately. Registration does not send email. `python init_database.py` lets existing pending accounts sign in while preserving their account and child records. It does not falsely mark their email as verified. `LOCAL_SKIP_EMAIL_VERIFICATION` is obsolete.

Set `VITE_HIDE_GOOGLE_LOGIN=1` in `frontend/.env` to hide the Google button in the development server. Remove it and restart Vite to restore the button. Google credentials and linking code are preserved.

## Local password-reset email testing

Set `RESEND_API_KEY` privately in `backend/.env` if you want real reset emails. The local test sender is `MAIL_FROM=onboarding@resend.dev`; it can send only to the email address associated with your Resend account. `APP_BASE_URL=http://127.0.0.1:5173` sends users back to the local reset page. Never put the API key in a `VITE_` variable or Git.

Restart the API after changing these settings. Use Forgot password, open the delivered reset link and set a new password. The public reply does not reveal whether an account exists. Check the inbox and Resend dashboard to confirm delivery; a successful API reply alone does not prove it. Delivery failures are logged without provider response bodies or credentials.

## Starting the app

## Password and Google on the same account

Register with email/password, then optionally choose Google with the same email. If the Google identity is not linked yet, the login/register page asks for the existing website password once. Successful confirmation links Google and signs in without changing the password hash or child records. Later, either login method opens the same account. Google-first accounts still start without a website password.

`POST /api/auth/google/link-login` accepts `id_token`, `email`, and `current_password` and returns the normal Google token pair. The Google token must be no more than five minutes old. Invalid/expired credentials return `GOOGLE_REAUTH_REQUIRED`; mismatched emails return `GOOGLE_EMAIL_MISMATCH`. Wrong passwords use the existing attempt limits. `POST /api/auth/google` also accepts optional `expected_email` so the selected Google email can be checked against the form before sign-in or creation. Existing Settings linking remains available.

Run `./start-local.ps1` from PowerShell. It starts PostgreSQL, the API, and Vite in the background and checks their health. Node must be on PATH. The PostgreSQL binary directory defaults to `D:\Postgre\bin`; override it with `-PostgresBin` if needed.

Google token validation allows 30 seconds of clock skew, including tokens issued slightly ahead of the local clock. Signature, issuer, audience, and expiry validation remain enabled; linking still requires a token no more than five minutes old. If the API log reports `The token is not yet valid (iat)` after retrying Google sign-in, synchronize Windows time in Settings > Time & language > Date & time > Sync now, then choose Google again.

- App: http://127.0.0.1:5173
- API documentation: http://127.0.0.1:8001/docs
- Database health: http://127.0.0.1:8001/health

This machine uses a separate password-protected PostgreSQL 18 cluster in `.local/postgres`, listening only on `127.0.0.1:5433`, with database `growth_db`. The schema is initialized without sample accounts or children. The existing PostgreSQL service on port 5432 has not been cleared: its password was unavailable.

The ignored `backend/.env` contains the connection URL, generated JWT secret, and allowed frontend origins. `frontend/.env` points to the API. Never commit these files or `.local`, which contains database files, credentials, and development email logs.

Dependencies are installed in `backend/venv` and `frontend/node_modules`. For a fresh checkout, follow `backend/README.md` from the **backend directory**, install frontend dependencies from **frontend**, and configure a PostgreSQL database before starting. `start-local.ps1` reuses the initialized project-local cluster; it does not provision or reset databases.

Register through the app and sign in with your password. In development without an email provider, password-reset links are written to `.local/api.error.log`. The Google button renders; a real Google account sign-in still needs user testing. Actual reset-email delivery requires Resend or SMTP configuration.

Dashboard child profiles, child creation/edit/deletion, and growth creation/history use the API. Profile displays the signed-in account. Growth charts show stored measurements with CDC 2000 reference data for ages 24–240 months. Bone-age and puberty processing remain previews with no persistence API.

Build the frontend from its directory: `node node_modules/vite/bin/vite.js build`. Run backend regressions from the backend directory: `./venv/Scripts/python.exe -X utf8 tests/run_regression_tests.py`.
