# Frontend authentication guide

Updated 2026-09-23. The React implementation is in `frontend/src/context/AuthContext.jsx`, `frontend/src/lib/api.js`, and the authentication pages. OpenAPI schemas are available at `/docs` and `/openapi.json` when the API runs.

## Configuration

Frontend `.env`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

Backend `.env`:

```dotenv
APP_ENV=development
CORS_ORIGINS=http://localhost:5173
APP_BASE_URL=http://localhost:5173
GOOGLE_CLIENT_IDS=<same-web-client-id>.apps.googleusercontent.com
```

Google must authorize the exact frontend origin. The frontend client ID is public; never expose backend secrets there. `APP_BASE_URL` must serve `/verify-email?token=...` and `/reset-password?token=...`. For production, set `APP_ENV=production`, configure SMTP, and test delivery. Backend startup rejects production configuration without SMTP, but configuration alone does not prove delivery.

## Registration and verification

`POST /api/auth/register` accepts `full_name`, `email`, `password`, `terms_accepted`, and optional `phone_number`. It returns `202` with a generic message and no session. Duplicate email produces the same response and leaves the existing account intact. A new account has `email_verification_required=true` and cannot use password login, refresh, or protected APIs until verified.

The verification email contains a single-use token valid for 24 hours. The page sends `POST /api/auth/email/verify` with `{ "token": "...", "password": "<password chosen at registration>" }`. A matching token and password mark the email verified; the user then logs in. `POST /api/auth/email/verification/resend` accepts `{ "email": "..." }`, returns a generic message, and limits issuance per pending account.

Existing accounts are not locked by this rollout. They retain `email_verified_at=null` until there is proof of email ownership.
Changing an account email clears its verified marker. The existing email-change endpoint does not itself verify the replacement address; the product should add a dedicated pending-email-change flow before treating a changed address as verified.

## Password login and sessions

`POST /api/auth/login` accepts `{ "email": "...", "password": "..." }` and returns an access and refresh token pair. Pending accounts receive `403` with `code=EMAIL_VERIFICATION_REQUIRED` after a correct password. `GET /api/auth/me` includes `has_password`, `providers`, `email_verified`, and `verification_required`.

Access tokens last 15 minutes. Refresh tokens last 30 days and rotate on `POST /api/auth/refresh`. The React client keeps the access token in memory and the refresh token in session storage, or local storage with Remember me. It shares a refresh promise among requests and uses a session generation check so a late refresh response does not restore a logged-out session. `POST /api/auth/logout` receives the refresh token. Already-issued access tokens can remain valid until expiry.

## Google sign-in and linking

The React button obtains a Google Identity Services ID token and sends it to `POST /api/auth/google` as `id_token`. A known Google subject signs in to its linked user. An unknown subject with a new email creates a Google account after terms consent. An unknown subject whose email matches an existing website account receives `409` with `detail.code=LINK_REQUIRED`; that request changes no password, session, identity, or child data.

The user must log in with the website password, open Settings, enter that password, and select the Google account with the same email. Settings sends `POST /api/auth/google/link` with `{ "current_password": "...", "id_token": "..." }` under the website Bearer session. The backend checks the password and a verified Google token issued within five minutes, rejects an email mismatch or duplicate identity, and links in one database transaction. Website password login continues to work. Google sign-in then resolves by the stable Google subject.

The `linked` and `password_cleared` response fields remain for older clients. The new sign-in and link paths do not clear passwords or return `password_cleared=true`.

## Recovery of an account with a cleared password

An account affected before this change can still sign in with its existing Google link. Its Settings page points to Forgot password. `POST /api/auth/password/forgot` sends a single-use reset link to the account email and gives a generic response. The React `/reset-password?token=...` page calls `POST /api/auth/password/reset` with a new password. Reset revokes old refresh sessions but preserves the Google identity and child data. The user can then sign in with either method.

## Rollout and end-to-end check

Apply the Google migration if needed, then `migrations/2026-09-23_email_verification.sql`, before running the new API. Do not rerun `growth_schema.sql` over a populated database. Configure the frontend and SMTP, and confirm that a real recipient receives verification and reset messages with reachable pages.

Against a disposable database and a real Google test account, check: pending registration cannot log in; verification needs the original password and cannot be reused; website login works before and after linking; wrong password and mismatched Google email fail; Google sign-in first returns `LINK_REQUIRED` and later reaches the same user and child records; duplicate and concurrent link attempts yield conflict rather than another identity; an account with a previously cleared password regains website login through reset while Google login and child records remain intact.
