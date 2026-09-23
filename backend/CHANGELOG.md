# Changelog

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
