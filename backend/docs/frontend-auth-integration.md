# Frontend authentication guide

Updated 2026-09-23. The current local API runs on port 8001; the frontend runs on port 5173. This guide describes implemented behavior, not a completed public deployment.

## Configuration

Frontend `.env`:

```dotenv
VITE_API_URL=http://127.0.0.1:8001
VITE_GOOGLE_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

Backend `.env`:

```dotenv
APP_ENV=development
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
APP_BASE_URL=http://127.0.0.1:5173
GOOGLE_CLIENT_IDS=<same-web-client-id>.apps.googleusercontent.com
RESEND_API_KEY=<private-api-key>
MAIL_FROM=onboarding@resend.dev
```

Keep secrets in ignored backend configuration, never in `VITE_` variables. Google must authorize the frontend origin. Resend's test sender can deliver only to the email associated with your Resend account; other recipients require a verified sender domain. SMTP remains supported. Production startup, registration, and resend recognize either configured provider through `EMAIL_ENABLED`. Provider configuration does not prove inbox delivery.

## Registration and verification

`POST /api/auth/register` accepts `full_name`, `email`, optional `phone_number`, `password`, and `terms_accepted`. It returns HTTP 202 with a neutral message, not session tokens. Passwords are stored as bcrypt hashes. Duplicate registrations receive the same neutral reply.

A password account starts pending verification. It can be activated in either way:

1. Open `/verify-email?token=...` and enter the registration password. The page sends `{ "token": "...", "password": "..." }` to `POST /api/auth/email/verify`. Links expire after 24 hours and are single-use. The user then logs in normally.
2. Choose Google with the same email and confirm the existing website password through the linking flow below. This verifies the account and signs in immediately.

`POST /api/auth/email/verification/resend` accepts `{ "email": "..." }`. For eligible pending accounts it generates a new link under the existing quota of fewer than three issued verification tokens in the previous hour. Its neutral response does not prove that an email was sent. Email delivery failures are recorded without provider response bodies, passwords, or API keys.

## Google sign-in and password-preserving linking

`POST /api/auth/google` accepts `id_token`, `terms_accepted`, and optional `expected_email`. If `expected_email` is supplied, the verified Google email must match it case-insensitively before any account is signed in or created.

- Known Google identity: sign in to its existing account.
- New Google identity and unused email: create a Google-first account after terms acceptance. It has no website password initially.
- New identity with an existing account email: return HTTP 409 with `LINK_REQUIRED`, without changing the account.

The React login and registration pages handle `LINK_REQUIRED` by displaying `GoogleLinkForm`. The user confirms the website email and existing website password. The Google credential stays in component memory and is never put in browser storage.

`POST /api/auth/google/link-login` does not require a Bearer session:

```json
{
  "id_token": "<fresh-google-id-token>",
  "email": "parent@example.com",
  "current_password": "<existing-website-password>"
}
```

The backend validates the Google token (including verified email and a maximum age of five minutes), checks matching email, locks the account row, and validates the website password with existing rate-limit and lockout controls. It rejects identities belonging to other accounts and accounts linked to a different Google identity. Repeating a link for the same identity is allowed without creating a duplicate.

Successful linking marks the email verified, consumes outstanding email-verification tokens, and issues tokens in one transaction. The account ID, password hash, and child records remain unchanged. The response contains `access_token`, `refresh_token`, `token_type`, `is_new_account: false`, `linked: true`, and `password_cleared: false`.

| Condition | Result |
| --- | --- |
| Invalid or expired Google token (401) | `GOOGLE_REAUTH_REQUIRED`; choose Google again |
| Google email differs from website email | 403 `GOOGLE_EMAIL_MISMATCH`; no linking |
| Wrong website password | 401 `INVALID_PASSWORD`; record failed attempt |
| Account locked or request rate exceeded | Existing lockout/rate-limit response |
| Conflicting Google identity | 409; preserve account ownership |

The existing authenticated `POST /api/auth/google/link` and Settings flow remain available. Linking never clears or replaces a password. Google does not disclose its user's Google password to this application.

## Sessions and password recovery

`POST /api/auth/login` accepts email/password. A pending password account receives 403 `EMAIL_VERIFICATION_REQUIRED`. After activation, password login and linked Google login access the same account.

The frontend keeps access tokens in memory. Refresh tokens use session storage, or local storage when Remember me is selected. Refresh tokens rotate through `/api/auth/refresh`; logout revokes the supplied refresh session. Already-issued access tokens can remain valid until expiry.

Google-first users can set a website password using the existing email password-reset flow. Reset revokes old refresh sessions and preserves Google identity and child records. Working email delivery is required for that flow.

## Verification and deployment status

- All 10 isolated backend regression files passed after this change.
- The frontend production build and lint for the changed authentication files passed.
- A PostgreSQL-backed HTTP test, with Google token verification mocked, confirmed pending-login denial, Google activation, an unchanged password hash, both login methods returning the same account/child IDs, and repeated linking. Test records were rolled back.
- Regression coverage includes wrong passwords, email mismatches, stale tokens, identity conflicts, account lockout, request limits, Resend failures, and email-verification expiry/reuse.
- Real Google account selection and real inbox delivery still need user testing. Concurrent requests were not exercised by the recorded database smoke test.
- No Render deployment or Google Cloud configuration change was performed.

This linking change needs no migration on the current schema. Older installations still need the existing Google and email-verification migrations; never rerun the fresh schema over a populated database. Use the repository-root `render.yaml` for the new Render blueprint; `backend/render.yaml` is the older SMTP-oriented configuration.
