## 2026-09-29 — Password-only registration

- Register and sign in with a password without email verification. Existing pending accounts remain usable without being marked as email verified.
- Retire verification/resend endpoints and pages; send email only for password reset or first password setup.
- Apply the registration-verification retirement migration during initialization; retain account and growth history.

## 2026-09-29 — CDC 2000 and Render preparation

- Vendor official CDC CSVs and SHA-256 manifest; seed 1,308 rows transactionally without overwriting conflicts.
- Preserve half-month LMS ages, use CDC monthly bins, and return unavailable outside 24–240 months.
- Root Render Blueprint uses Python 3.12.14, initialization before Uvicorn, production configuration checks, and database/schema/reference readiness.
- Add CDC percentile validation, production configuration checks, and disposable PostgreSQL/live HTTP smoke coverage.
- Deployment/export instructions: `docs/render-deployment.md`. No hosted deployment or local application database migration performed.

# Changelog

## 2026-09-23 — One account with password and Google login

- Add unauthenticated `/api/auth/google/link-login` with fresh Google proof, email matching, website-password confirmation, row locking, and existing attempt limits.
- Activate pending accounts and consume verification tokens while preserving the password hash, account ID, and child data.
- Add optional `expected_email` to Google sign-in and inline `GoogleLinkForm` to login/registration pages. Keep Settings linking available.
- Support Resend HTTPS delivery alongside SMTP, including production registration/resend checks and sanitized failure logging.
- No new migration required on the current schema. No cloud deployment performed.
- Validation: 10 backend regression files, frontend build, targeted auth lint, and rollback-only PostgreSQL HTTP linking checks passed. Google proof was mocked in the database test; real Google sign-in and inbox delivery remain unverified.


## 2026-09-22 — Descriptive filenames

- Name the full parent/child/growth prototype `tests/growth_demo.html`, with matching JavaScript and CSS assets and `tests/growth-demo.md` instructions.
- Name the auth-only application example `tests/auth_router_example.py`.
- Identify smoke-test scope in `auth_api_smoke_test.ps1`, `children_growth_api_smoke_test.ps1`, `google_auth_smoke_test.py`, and `schema_smoke_test.sql`.
- Name the isolated Python suite runner `tests/run_regression_tests.py` and Google verification record `tests/google-auth-verification.md`.
- Update local demo URLs, stylesheet/script links, self-links, and documented test commands to match.

## 2026-09-22 — Frontend integration handoff

### Backend changes included

- Validate Google subject/email claim types and restrict automatic linking to authoritative Gmail or verified hosted-domain identities.
- Trim parent/child names and reject blank names, including child PATCH requests.
- Remove rejected raw input and exception context from validation errors to avoid echoing passwords or tokens.
- Report missing or partial LMS references instead of presenting an incomplete growth assessment as normal.
- Add Google authentication and request-validation regression tests, extend growth checks, and make the test runner's subprocess output UTF-8 on Windows.

### Demo and examples

- Add the local parent workflow for registration/login, child profiles, and measurement history.
- Add the Google Identity Services button with consent, loading/error handling, and connection to the existing Google endpoint.
- Keep the diagnostic auth page at `tests/auth_debug.html` and the auth-only app example at `tests/auth_router_example.py`.
- Keep local demo credentials out of Git; retain only the synthetic example fixture.
- Restore the demo's base layout styles after a CSS editing issue and format the stylesheet for review.

### Documentation and Git preparation

- Replace the previous mixed progress log/setup README with a current English overview, setup steps, feature limits, and verification record.
- Document frontend environment variables, all implemented endpoints, request examples, errors, Google account flags, refresh rotation, and logout limitations.
- Separate completed local verification from pending real Google/SMTP tests and production deployment.
- Add a Git handoff guide and ignore local secrets, uploads, database dumps, and environment directories.

### Validation

All six Python regression files passed on 2026-09-22, including 11 Google tests and five request-validation tests. Google success routes use mocked database operations. The browser button was visually checked earlier in the session; real Google account login remains unverified. Historical HTTP smoke results are recorded in the README and were not rerun for this documentation update.
