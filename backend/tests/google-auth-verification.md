# Google Auth verification — 2026-09-22

Backend verification completed:

- Google enabled; one configured client ID. No configuration values copied here.
- PostgreSQL connection works; `usr_identities` exists and `password_hash` is nullable.
- Google's public JWKS endpoint is reachable.
- Temporary Uvicorn instance: `/health` returns 200, malformed Google token returns 401,
  empty token returns 422, and CORS accepts `http://localhost:3000`.
- All six test files pass, including 11 new Google authentication regression tests.
- No real user records changed by the smoke checks; temporary API stopped afterwards.

Run from the backend directory:

```powershell
.\venv\Scripts\python.exe -X utf8 tests\run_regression_tests.py
.\venv\Scripts\python.exe -X utf8 tests\google_auth_smoke_test.py
```

Security change: automatic linking to an existing email account requires Gmail or
a verified Google hosted-domain account (`hd`). Third-party email accounts without
`hd` receive 403 on automatic linking; existing subject-based Google identities
can still sign in. Invalid or empty subjects are rejected with 401.

Reference: https://developers.google.com/identity/sign-in/web/backend-auth

Still to verify interactively with the frontend team:

1. Add the test Google account in Google Auth Platform > Audience > Test users
   if required by the project's testing configuration.
2. Confirm the OAuth client's authorized JavaScript origin is `http://localhost:3000`.
3. Start the API on port 8000, obtain `response.credential` using Google Identity
   Services, then POST `{ "id_token": response.credential, "terms_accepted": true }`
   to `/api/auth/google`.
4. Verify the returned system token works with `/api/auth/me`; repeat login to
   confirm the same user and `is_new_account=false`. Never log or share tokens.
5. Use only a disposable account for the account-linking test: linking clears its
   old password and revokes existing sessions, by design.

Successful real-Google login and actual database account creation/linking were
not exercised in this run. Route success paths use mocked database operations;
token validation tests use actual RSA signatures with synthetic keys.
