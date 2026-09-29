# Authentication change memory

## Latest update — 2026-09-23

This section supersedes the older Settings-only linking description below. Users can now activate pending password accounts using a matching Google identity plus their existing website password, directly from login/registration. `POST /api/auth/google/link-login` locks the account, verifies the password and fresh Google token, links the identity, marks email verified, consumes verification tokens, and issues session tokens without replacing the password hash. Both methods reach the same account and child data. `GoogleLinkForm.jsx` supplies the inline confirmation UI; `AuthContext.jsx` accepts the resulting tokens. Optional `expected_email` prevents Google sign-in/creation against a different email entered in the form.

Resend HTTPS delivery is implemented in `mailer.py`; production gates now use `EMAIL_ENABLED` for either SMTP or Resend. Local URLs are frontend `http://127.0.0.1:5173` and API `http://127.0.0.1:8001`. Private email settings belong only in ignored `backend/.env`.

Verified: 10 backend regression files, frontend build, targeted auth lint, and a transaction-rolled-back PostgreSQL HTTP test of activation, password preservation, both login methods, repeated linking, and child identity preservation. The database test mocked Google token verification. Live Google login and actual inbox delivery remain pending. No deployment occurred. See `backend/docs/frontend-auth-integration.md` for the current contract.

## Earlier implementation record

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

## Session log: 2026-09-29, refine9 model and website integration

Confirmed refine9_b5_456 is the best saved single checkpoint by recomputing nine 1,425-row validation CSVs: MAE 7.425048931 months, 80.210526% within 12 months, versus refine8 8.197286886 and refine10 20.488415724. Copied its 115,444,602-byte checkpoint into ignored backend/bone_age_ai/models and vendored the original train/model/dataset/evaluate modules with only relative-import changes. Manifest pins source/checkpoint hashes. Weight SHA256: 18ba920a8d2eada0198477619b2b1945df98f028384aeae0fafc8aa82987491c.

Added checksum-verified CPU inference, a release downloader, private authenticated prediction/upload/history/image/delete API, deferred PostgreSQL image bytes, additive repeatable migration, interrupted-job recovery, bounded serialized inference and model/schema readiness. Connected multipart/blob requests and the bone-age page to the API and shared useChildren helper; added Vercel route rewrites. Preserved incoming c2c9f37 authentication/CDC/child work during rebase, including its child form. Added model migration to init_database.py and model dependencies/download/readiness to root render.yaml. No paid hosting plan selected.

Verification: 10 exact Linux source/website prediction comparisons and transforms, zero drift; fresh pinned Windows CPU runtime; final real HTTP/PostgreSQL/weight check passed, including female image 1386 prediction 28.04 months despite supplied male form flag, guardian isolation, invalid/oversized files, image roundtrip/history/deletion. Final HTTP end-to-end 1.11 seconds. Model shown in browser at 28.0 months, persisted through route refresh and server restart. All 12 merged backend regression files, frontend build and targeted lint passed. Two initializer runs preserved existing accounts/prediction history, seeding 1,308 then zero CDC rows. Windows API working set after first inference 587.8 MiB; private committed memory 1,413.5 MiB. Linux/free-host fit unverified.

Files: backend/bone_age_ai/**, routes_bone_age.py, models.py, main.py, init_database.py, requirements*.txt, config.py, migration, integration docs/README, model smoke check and two existing test-isolation/config checks; frontend/src/lib/api.js, pages/BoneAgePage.jsx, frontend/vercel.json; root render.yaml and this memory.

Deployment limitation: studio5-phi.vercel.app serves main demo, no current auth/model API and /login returned 404; Backend+AI produces Vercel previews. Hosted API URL is still needed. Public GitHub release publication of the checkpoint was rejected by automatic approval review as sensitive egress requiring explicit approval for that public release destination. Weight remains local, release download/build is pending that approval. See backend/docs/refine9-integration.md. Local test API 127.0.0.1:8019/frontend 127.0.0.1:5173 and disposable PostgreSQL cluster remain available for review.


## Session log: 2026-09-29, public refine9 weight release

User approved public publication after the earlier explicit public-release question. Published best_model_refine9_b5_456.pth (115,444,602 bytes) to https://github.com/growthadminsupport-lang/studio5/releases/tag/refine9-b5-456-v1, targeting Backend+AI. Tested the existing deployment downloader without credentials in a fresh temporary directory. Downloaded size and SHA-256 matched the manifest: 18ba920a8d2eada0198477619b2b1945df98f028384aeae0fafc8aa82987491c. Local checkpoints preserved, weight stays excluded from Git. The deployment download URL now works. Hosted inference remains unverified. Files touched: backend/docs/refine9-integration.md and this memory.
