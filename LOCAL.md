# Local development

## Temporary password-registration database testing

Set `LOCAL_SKIP_EMAIL_VERIFICATION=1` in `backend/.env` with `APP_ENV=development` to let newly registered password accounts log in immediately without sending verification email. Passwords are still hashed and checked; email ownership is not marked verified. Existing pending accounts can also sign in with the correct password while this flag is enabled; their stored verification status remains unchanged. The flag has no effect in production. Set it to `0` and restart the API to restore verification for future registrations; existing test accounts keep their original verification requirement.

Set `VITE_HIDE_GOOGLE_LOGIN=1` in `frontend/.env` to hide the Google button in the development server. Remove it and restart Vite to restore the button. Google credentials and linking code are preserved.

## Local Resend verification testing

Set `RESEND_API_KEY` privately in `backend/.env`. The local test sender is `MAIL_FROM=onboarding@resend.dev`; it can send only to the email address associated with your Resend account. `APP_BASE_URL=http://127.0.0.1:5173` sends users back to the local verification page, so open the email link on this computer while the app is running. Never put the API key in a `VITE_` variable or Git.

Restart the API after changing these settings. Register the Resend account email, open the delivered link, enter the registration password, then log in. For an existing pending account, use `/resend-verification` instead. Verification links expire after 24 hours and are single-use; requests are limited by the existing quota. Public resend replies intentionally do not reveal whether an account exists. A successful API reply alone does not prove inbox delivery; check the inbox and Resend dashboard. Delivery failures are logged without provider response bodies or credentials.

## Starting the app

## Password and Google on the same account

Register with email/password, then either verify by email or choose Google with the same email. If the Google identity is not linked yet, the login/register page asks for the existing website password once. Successful confirmation verifies the pending account, links Google, and signs in without changing the password hash or child records. Later, either login method opens the same account. Google-first accounts still start without a website password.

`POST /api/auth/google/link-login` accepts `id_token`, `email`, and `current_password` and returns the normal Google token pair. The Google token must be no more than five minutes old. Invalid/expired credentials return `GOOGLE_REAUTH_REQUIRED`; mismatched emails return `GOOGLE_EMAIL_MISMATCH`. Wrong passwords use the existing attempt limits. `POST /api/auth/google` also accepts optional `expected_email` so the selected Google email can be checked against the form before sign-in or creation. Existing Settings linking remains available.

Run `./start-local.ps1` from PowerShell. It starts PostgreSQL, the API, and Vite in the background and checks their health. Node must be on PATH. The PostgreSQL binary directory defaults to `D:\Postgre\bin`; override it with `-PostgresBin` if needed.

Google token validation allows 30 seconds of clock skew, including tokens issued slightly ahead of the local clock. Signature, issuer, audience, and expiry validation remain enabled; linking still requires a token no more than five minutes old. If the API log reports `The token is not yet valid (iat)` after retrying Google sign-in, synchronize Windows time in Settings > Time & language > Date & time > Sync now, then choose Google again.

- App: http://127.0.0.1:5173
- API documentation: http://127.0.0.1:8001/docs
- Database health: http://127.0.0.1:8001/health

This machine uses a separate password-protected PostgreSQL 18 cluster in `.local/postgres`, listening only on `127.0.0.1:5433`, with database `growth_db`. The schema is initialized without sample accounts or children. The existing PostgreSQL service on port 5432 has not been cleared: its password was unavailable.

The ignored `backend/.env` contains the connection URL, generated JWT secret, and allowed frontend origins. `frontend/.env` points to the API. Never commit these files or `.local`, which contains database files, credentials, and development email logs.

Dependencies are installed in `backend/venv` and `frontend/node_modules`. For a fresh checkout, follow `backend/README.md` from the **backend directory**, install frontend dependencies from **frontend**, and configure a PostgreSQL database before starting. `start-local.ps1` reuses the initialized project-local cluster; it does not provision or reset databases.

Register through the app. In development, verification emails are written to `.local/api.error.log`; open the verification link and enter the registration password. Google sign-in is configured locally using the client ID from D:/Studio5/backend/.env. The Google button renders; a real Google account sign-in still needs user testing. Actual email delivery requires SMTP configuration.

Dashboard child profiles, child creation/edit/deletion, and growth creation/history use the API. Profile displays the signed-in account. Growth charts show stored measurements; reference data has not been seeded. Bone-age and puberty processing remain previews with no persistence API.

Build the frontend from its directory: `node node_modules/vite/bin/vite.js build`. Run backend regressions from the backend directory: `./venv/Scripts/python.exe -X utf8 tests/run_regression_tests.py`.
