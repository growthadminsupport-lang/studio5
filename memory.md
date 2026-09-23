# Authentication change memory

Date: 2026-09-23. Scope: `studio5` FastAPI backend and React frontend. The sibling `project_stu5` is a separate NestJS/Prisma application; its authentication code was not changed by this work. Its `memory.md` contains a separate review. Project context there describes GrowTH as a child growth and bone-age application, and Google login as a later addition to the original email/password TOR.

## Cause and decision

The old `studio5` Google sign-in path matched accounts by email and cleared a website password when linking. This kept the user row and child data but prevented password login. Email equality alone also could not establish that the Google user controlled a website account that someone else had registered first.

The new rule is that an unknown Google subject never modifies an existing email account. It returns `409 LINK_REQUIRED`. An authenticated user can link only after submitting the current website password and a verified Google ID token issued within five minutes for the same email. The operation uses row locking and identity uniqueness constraints in one transaction. Password hash, sessions, and child data remain in place.

## Changes

- `backend/routes_auth.py`: safe Google sign-in, explicit `/api/auth/google/link`, pending website registration, `/api/auth/email/verify`, resend verification, pending-account login denial, and reset-based recovery.
- `backend/google_oauth.py`: optional ID-token age check for linking.
- `backend/models.py`, `backend/growth_schema.sql`, `backend/migrations/2026-09-23_email_verification.sql`: email verification state and single-use tokens. The migration leaves legacy accounts usable and does not falsely mark their email verified.
- `backend/auth.py`: pending accounts cannot refresh or access protected routes.
- `backend/mailer.py`, `backend/main.py`, `backend/render.yaml`, `.env.example`: verification email and production SMTP configuration gate.
- `frontend/src/context/AuthContext.jsx`, `frontend/src/lib/api.js`, auth forms and pages, `SettingsPage.jsx`: API-backed authentication, official Google button, explicit linking, verification, reset, logout, and refresh handling.
- `backend/tests/test_google_auth.py`, `backend/tests/test_email_verification.py`, `backend/tests/auth_api_smoke_test.ps1`: regressions and disposable-database HTTP smoke path.
- `backend/README.md` and `backend/docs/frontend-auth-integration.md`: current API contract and rollout steps.

## Verification and remaining deployment checks

The isolated Python regression files passed. The React production build and targeted lint for changed authentication files passed. Full frontend lint still reports five pre-existing errors in `NotificationsContext.jsx`, `ThemeContext.jsx`, `AboutPage.jsx`, `ChildFormPage.jsx`, and `HomePage.jsx`.

A disposable PostgreSQL 18 cluster was created in the Windows temporary directory. The FastAPI HTTP smoke script passed pending registration, single-use verification, website login, and recovery of a simulated Google-linked account with a cleared password. Applying the migration to a disposable copy of the previous schema preserved a legacy account's password hash and left it accessible without falsely marking its email verified. The temporary API and cluster were stopped and removed afterward.

A real Google test-account browser run and SMTP delivery test were not possible because there is no configured Google client credential or email service. Before deployment, test website and Google login against the same preserved child records, and confirm verification/reset links reach the deployed React routes. `APP_ENV=production` requires SMTP configuration, but actual delivery still needs an operational test.

The older `/api/auth/email/change` flow changes an address without a verification step. This work clears its `email_verified_at` marker rather than carrying proof from the old address. A later pending-email-change flow should verify the replacement address before considering it verified.
