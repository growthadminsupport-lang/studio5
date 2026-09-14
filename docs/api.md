# GrowTH API Contract

**Status:** draft v0.1 (2026-09-14) · **Owner:** backend team · **Reviewers:** frontend team

This file is the agreement between frontend and backend. The frontend can build against mocks
that follow it before the backend exists, and a backend endpoint is done when it behaves exactly
as written here. When a contract has to change, change this file first, in the same pull request
as the code, and tag the other team — nobody should find out from a broken page.

Phases follow the build order: each one depends on the one before it.

---

## 1. Conventions

### Base URL

| Environment | Backend | Frontend origin |
| --- | --- | --- |
| Local | `http://localhost:3001` | `http://localhost:5173` |
| Production | Render URL — fill in once deployed | Vercel URL — fill in once deployed |

The frontend reads the base URL from `VITE_API_URL`. There is no `/api` prefix: every path below is
relative to the base URL.

### Format

- Requests and responses are JSON (`Content-Type: application/json`). File uploads are the only
  exception and use `multipart/form-data`.
- Field names are `camelCase`.
- IDs are strings (UUIDs).
- Timestamps are ISO 8601 in UTC: `"2026-09-14T08:30:00.000Z"`. Calendar dates with no time
  (`dateOfBirth`, `measuredAt`) are `"YYYY-MM-DD"`.
- Numbers are JSON numbers, never strings. Postgres `DECIMAL` columns often come back from an ORM
  as strings or decimal objects — convert them before responding.
- Units go in the field name: `heightCm`, `weightKg`.
- An optional field with no value is returned as `null`, not left out.
- List endpoints return a bare JSON array. No pagination is needed at this scale.

### Authentication

- `POST /auth/register` and `POST /auth/login` return a `token` (a JWT, valid for 7 days).
- Every endpoint marked **Auth: required** needs the header `Authorization: Bearer <token>`.
- A missing, invalid or expired token returns `401`. On any `401` the frontend clears the stored
  token and sends the user to `/login`.
- "Remember me" is a frontend decision only: keep the token in `localStorage` when ticked,
  `sessionStorage` when not. The backend issues the same token either way.
- Hash passwords with bcrypt (cost 10 or higher). Never return, log or `console.log` a password
  or a password hash.

Bearer tokens rather than cookies because frontend (Vercel) and backend (Render) live on different
domains. Cross-site cookies need `SameSite=None; Secure` and `withCredentials` on every request,
and are easy to get subtly wrong.

### Errors

Every error response has the same shape, so the frontend can show `response.data.message` in one
place for every page:

```json
{ "message": "Email already registered" }
```

Validation errors may add a per-field map:

```json
{ "message": "Invalid input", "errors": { "password": "Must be at least 8 characters and include a letter and a number" } }
```

Write `message` for the user, not for a developer — the frontend displays it as-is.

| Status | Meaning |
| --- | --- |
| `200` | OK, body returned |
| `201` | Created, body is the new resource |
| `204` | OK, no body |
| `400` | The request is invalid (missing field, wrong type, out of range) |
| `401` | Not logged in, bad or expired token, or wrong login credentials |
| `403` | Logged in, but not allowed to touch this resource (e.g. not this child's guardian) |
| `404` | Does not exist |
| `409` | Conflict, e.g. email already registered |
| `413` | Uploaded file too large |
| `429` | Too many requests (rate limit) |
| `500` | A bug. Never returned on purpose — log it and fix it |

### CORS

Allow exactly the frontend origin(s) listed in the `CORS_ORIGIN` environment variable — scheme and
host, no trailing slash. Allow the `Authorization` and `Content-Type` headers and the methods
`GET, POST, PATCH, DELETE`. Credentials are not needed because the token travels in a header, not a
cookie.

### Access rule for child data

Every endpoint that reads or changes a child, or any record belonging to a child, must check that
the logged-in user is linked to that child as a guardian. If not, return `403`. Never rely on the
frontend hiding a button — anyone can call the API directly.

### Backend environment variables

| Variable | Example | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Port the server listens on |
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/growth` | Postgres connection |
| `JWT_SECRET` | long random string | Signs tokens |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |

Commit a `.env.example` with these names and safe example values. Never commit `.env`.

---

## 2. Data shapes

These are the response shapes. Request bodies are listed with each endpoint.

### User

```json
{
  "id": "5f0c1a2e-...",
  "email": "parent@example.com",
  "fullName": "Somchai Jaidee",
  "phoneNumber": "0812345678",
  "avatarUrl": null,
  "createdAt": "2026-09-14T08:30:00.000Z"
}
```

Never includes the password hash.

### Child

```json
{
  "id": "9b2d...",
  "fullName": "Mali Jaidee",
  "nickname": "Mali",
  "sex": "FEMALE",
  "dateOfBirth": "2016-03-15",
  "relation": "PARENT",
  "createdAt": "2026-09-14T08:30:00.000Z"
}
```

- `sex`: `"MALE"` or `"FEMALE"`
- `relation`: the logged-in user's relation to this child — `"PARENT"`, `"GUARDIAN"` or `"RELATIVE"`

### GrowthRecord

```json
{
  "id": "c41e...",
  "childId": "9b2d...",
  "measuredAt": "2026-09-01",
  "heightCm": 140.5,
  "weightKg": 35.2,
  "bmi": 17.83,
  "heightPercentile": 62.1,
  "weightPercentile": 58.4,
  "bmiPercentile": 55.0,
  "heightZ": 0.31,
  "weightZ": 0.21,
  "bmiZ": 0.13,
  "note": null,
  "createdAt": "2026-09-14T08:30:00.000Z"
}
```

`bmi`, the percentiles and the z-scores are computed by the backend (see Phase 3) and are `null`
when they cannot be computed — no height, no weight, or BMI for a child under two years old.

### PubertyScreening

```json
{
  "id": "e7a0...",
  "childId": "9b2d...",
  "assessedAt": "2026-09-14T08:30:00.000Z",
  "answers": { "breastDevelopment": "yes", "breastDevelopmentAgeYears": 7, "menstruation": "no" },
  "notes": null,
  "result": {
    "outcome": "EARLY_SIGNS",
    "title": "Signs of early puberty",
    "summary": "Breast development before age 8, which is earlier than typical.",
    "flagged": true,
    "guidance": ["Book an appointment with a pediatrician.", "Keep recording height regularly."]
  }
}
```

`answers` keys are listed in Phase 4. `result` is computed by the backend.

### BoneAgePrediction

```json
{
  "id": "1d9f...",
  "childId": "9b2d...",
  "status": "COMPLETED",
  "predictedAgeMonths": 138,
  "modelVersion": "effnetb0-v1",
  "failureReason": null,
  "createdAt": "2026-09-14T08:30:00.000Z",
  "completedAt": "2026-09-14T08:30:04.000Z"
}
```

- `status`: `"PENDING"`, `"COMPLETED"` or `"FAILED"`
- `predictedAgeMonths` is `null` until `COMPLETED`
- `failureReason` says why a `FAILED` prediction failed (unreadable image vs model offline need
  different actions from the parent)
- The image itself is fetched from `GET /bone-age/:id/image`, never from a public URL

### Article

```json
{
  "id": "a3c5...",
  "slug": "understanding-bone-age",
  "title": "Understanding Bone Age",
  "summary": "How skeletal maturity is read from a hand X-ray...",
  "category": "bone-age",
  "tag": "Explainer",
  "contentMd": "## What \"bone age\" actually measures\n\n...",
  "publishedAt": "2026-09-14T08:30:00.000Z"
}
```

`contentMd` is Markdown. The list endpoint may leave it out to keep the response small.

### Notification

```json
{
  "id": "77b1...",
  "type": "BONE_AGE_RESULT",
  "title": "Bone age result ready",
  "body": "The X-ray you uploaded for Mali has been analysed.",
  "isRead": false,
  "createdAt": "2026-09-14T08:30:00.000Z"
}
```

---

## 3. Endpoints

### Phase 1 — Auth and account (week 1)

#### `GET /health`

Auth: none. Returns `200` `{ "status": "ok" }`. Used to check the server is up, and to wake the
free Render instance before the user logs in.

#### `POST /auth/register`

Auth: none.

```json
{
  "email": "parent@example.com",
  "password": "abc12345",
  "fullName": "Somchai Jaidee",
  "phoneNumber": "0812345678",
  "acceptedTerms": true
}
```

- `email`: valid email, unique → `409` if already registered
- `password`: at least 8 characters, with at least one letter and one number → `400` otherwise
- `fullName`: required, not empty
- `phoneNumber`: optional
- `acceptedTerms`: must be `true` → `400` otherwise. Record the time it was accepted.

Returns `201`:

```json
{ "token": "eyJhbGciOi...", "user": { "...": "User" } }
```

#### `POST /auth/login`

Auth: none.

```json
{ "email": "parent@example.com", "password": "abc12345" }
```

Returns `200` with the same `{ token, user }` shape as register.
Wrong email **or** wrong password returns `401` `{ "message": "Invalid email or password" }` — the
same message for both, so the endpoint does not reveal which emails have accounts.

#### `GET /auth/me`

Auth: required. Returns `200` `User`. The frontend calls this when the page loads to turn a stored
token back into a logged-in user.

#### `POST /auth/logout`

Auth: required. Returns `204`. With plain JWTs the server holds no session, so this can do
nothing; logging out means the frontend deletes its token. It exists so the frontend has one call
to make if the backend later adds token revocation.

#### `PATCH /users/me`

Auth: required. Any subset of:

```json
{ "fullName": "Somchai Jaidee", "phoneNumber": "0812345678" }
```

Returns `200` with the updated `User`. The frontend replaces its stored user with this response.

#### `POST /auth/change-password`

Auth: required.

```json
{ "currentPassword": "abc12345", "newPassword": "xyz98765" }
```

- `204` on success
- `401` `{ "message": "Current password is incorrect" }`
- `400` if `newPassword` breaks the password rule

#### `DELETE /users/me`

Auth: required. Returns `204`. Deletes the account. Children that this user is the **only**
guardian of are deleted together with all their records; children shared with another guardian
stay, with only this user's link removed. The frontend must ask for confirmation first.

#### `POST /users/me/avatar` *(optional, later)*

Auth: required. `multipart/form-data` with one field `file` (JPEG, PNG or WebP, max 5 MB).
Returns `200` `User`. Wrong type → `400` with a message naming the allowed types; too large → `413`.

---

### Phase 2 — Children (week 2)

Every feature after this is about one selected child, so this phase unblocks the rest.

#### `GET /children`

Auth: required. Returns `200` `Child[]` — the children this user is a guardian of, oldest first.

#### `POST /children`

Auth: required.

```json
{
  "fullName": "Mali Jaidee",
  "nickname": "Mali",
  "sex": "FEMALE",
  "dateOfBirth": "2016-03-15",
  "relation": "PARENT"
}
```

- `fullName`, `sex`, `dateOfBirth` required; `dateOfBirth` cannot be in the future
- `nickname` optional; `relation` optional, defaults to `"PARENT"`

Creates the child **and** the guardian link to the current user in one transaction. Returns `201`
`Child`.

#### `GET /children/:id`

Auth: required. `200` `Child`, `403` if not a guardian, `404` if it does not exist.

#### `PATCH /children/:id`

Auth: required. Any subset of the `POST` fields. Returns `200` `Child`. Changing `dateOfBirth` or
`sex` changes every growth percentile, so recompute this child's growth records when either one
changes.

#### `DELETE /children/:id`

Auth: required. Returns `204`. If the user is the only guardian, deletes the child and all of its
records. If another guardian exists, removes only this user's link.

---

### Phase 3 — Growth tracking (weeks 3–4)

#### `GET /growth?childId=:childId`

Auth: required. Returns `200` `GrowthRecord[]`, newest `measuredAt` first. `400` without
`childId`.

#### `POST /growth`

Auth: required.

```json
{
  "childId": "9b2d...",
  "measuredAt": "2026-09-01",
  "heightCm": 140.5,
  "weightKg": 35.2,
  "note": "School check-up"
}
```

- At least one of `heightCm` / `weightKg` is required → `400` otherwise
- `heightCm` between 30 and 250, `weightKg` between 1 and 300 — this catches typos like `1405`
- `measuredAt` cannot be before `dateOfBirth` or in the future

The backend computes `bmi`, the percentiles and the z-scores. Returns `201` `GrowthRecord`.

#### `PATCH /growth/:id`

Auth: required. Any subset of `measuredAt`, `heightCm`, `weightKg`, `note`. Recomputes every
derived field. Returns `200` `GrowthRecord`.

#### `DELETE /growth/:id`

Auth: required. Returns `204`.

#### `GET /growth/reference?childId=:childId&measure=height|weight|bmi`

Auth: required. The reference percentile curves for the child's sex, for the chart to draw behind
the child's own line:

```json
[
  { "ageMonths": 24.5, "p3": 82.1, "p50": 87.8, "p97": 93.6 },
  { "ageMonths": 25.5, "p3": 82.9, "p50": 88.7, "p97": 94.5 }
]
```

`400` for any other `measure`. BMI curves start at 24 months.

#### How percentiles are computed

Use the CDC 2000 growth chart LMS tables
(<https://www.cdc.gov/growthcharts/cdc-data-files.htm>): one row per sex and age in months, each
with three parameters `L`, `M`, `S`. For a measurement `X`:

1. Age in months = days since birth ÷ 30.4375.
2. Find `L`, `M`, `S` for the child's sex at that age, interpolating between the two nearest rows.
3. z-score: `z = ((X / M)^L − 1) / (L × S)`, or `z = ln(X / M) / S` when `L = 0`.
4. Percentile = Φ(z) × 100, where Φ is the standard normal CDF.
5. Curve points: `value = M × (1 + L × S × z)^(1/L)` with `z = −1.881` for P3, `0` for P50 and
   `+1.881` for P97.

BMI-for-age only applies from 24 months. Test the implementation against the percentile columns
CDC publishes in the same files — a value taken from the P50 column must come out at the 50th
percentile.

**Open question for the client:** CDC 2000 is a US reference. Confirm whether they want CDC, WHO
or a Thai reference before this ships.

---

### Phase 4 — Puberty screening (weeks 4–5)

#### `POST /puberty`

Auth: required.

```json
{
  "childId": "9b2d...",
  "answers": {
    "growthSpurt": "yes",
    "breastDevelopment": "yes",
    "breastDevelopmentAgeYears": 7,
    "menstruation": "no",
    "pubicOrBodyHairGrowth": "unsure"
  },
  "notes": "Answered by grandmother"
}
```

Returns `201` `PubertyScreening`, including `result`.

#### `GET /puberty?childId=:childId`

Auth: required. Returns `200` `PubertyScreening[]`, newest first, each with `result`.

#### Answer keys

Every sign is answered `"yes"`, `"no"` or `"unsure"`. Every `...AgeYears` field is optional and
only meaningful when the sign is `"yes"`.

| Key | For |
| --- | --- |
| `breastDevelopment`, `breastDevelopmentAgeYears` | girls |
| `menstruation`, `menstruationAgeYears` | girls |
| `testicularEnlargement`, `testicularEnlargementAgeYears` | boys |
| `voiceDeepening` | boys |
| `pubicOrBodyHairGrowth`, `pubicOrBodyHairGrowthAgeYears` | both |
| `growthSpurt` | both |
| `familyPubertyOnsetAgeYears` | both, optional |

#### Result rules (backend-owned)

`result.outcome` is one of `NO_SIGNS_YET`, `TYPICAL_ONSET`, `EARLY_SIGNS`, `DELAYED_ONSET`,
`INSUFFICIENT_INFO`.

- **Early:** a sign that began before age 8 (girls) or 9 (boys).
- **Delayed:** no breast development by 13 (girls), or no testicular enlargement by 14 (boys).
- **"Unsure" never produces a delayed flag.** "I have not seen it" and "I would not have seen it"
  mean opposite things; if the deciding sign is `"unsure"`, the outcome is `INSUFFICIENT_INFO`.
- The result is a screening signal, never a diagnosis — `summary` and `guidance` must say so.

Every threshold shown to a parent needs a recorded medical source before release. Store the raw
`answers`; the result can be computed on each read, so a rule fix applies to old screenings too.

---

### Phase 5 — AI bone age (weeks 5–6)

#### `POST /bone-age`

Auth: required. `multipart/form-data`:

| Field | Value |
| --- | --- |
| `file` | the hand X-ray, JPEG or PNG, max 10 MB |
| `childId` | the child's ID |

Returns `201` `BoneAgePrediction` with `status: "PENDING"` immediately — do not make the upload
wait for the model. Wrong file type → `400` naming the allowed types; too large → `413`.

#### `GET /bone-age?childId=:childId`

Auth: required. Returns `200` `BoneAgePrediction[]`, newest first. The frontend polls this every
few seconds only while any item is `PENDING`.

#### `GET /bone-age/:id/image`

Auth: required, guardian check. Returns the image bytes with the right `Content-Type`. These are
medical images of children: **never serve the upload folder as public static files**, or anyone
with a filename can download one. The frontend fetches the image with its token and shows it
through an object URL.

#### `DELETE /bone-age/:id`

Auth: required. Returns `204`. Deletes the record and the stored file.

#### Model integration

The AI team provides the model. The backend runs it — in-process or as a separate service — and
updates the record to `COMPLETED` with `predictedAgeMonths`, or to `FAILED` with a
`failureReason`. Until the model is connected, uploads stay `PENDING` and the frontend shows "not
analysed yet".

Render's free plan counts 750 instance hours per **workspace**, so a second always-on service
spends that twice as fast. Its disk is also wiped on every deploy: plan for object storage before
uploads have to survive a redeploy.

---

### Phase 6 — Content, notifications, support (week 6)

#### `GET /articles?category=:category`

Auth: none. Returns `200` `Article[]`, newest first. `category` is optional.
Until this exists, the frontend keeps its articles in **one** static data file with this same
shape (today they are copied in three places), so switching to the API is a one-line change.

#### `GET /articles/:slug`

Auth: none. Returns `200` `Article` with `contentMd`, or `404`.

#### `GET /notifications`

Auth: required. Returns `200` `Notification[]`, newest first.

#### `PATCH /notifications/:id`

Auth: required. Body `{ "isRead": true }`. Returns `200` `Notification`. Marking read does
**not** delete.

#### `DELETE /notifications/:id`

Auth: required. Returns `204`.

Decide what creates notifications (for example: a bone-age result completing, or a follow-up
screening coming due). Without that decision the endpoints work but the list is always empty.

#### `POST /contact`

Auth: none. Rate-limited, since it writes a row for anyone who calls it.

```json
{ "email": "parent@example.com", "subject": "Chart not loading", "message": "..." }
```

Returns `204`. If the caller is logged in, link the message to their user ID.

#### `POST /auth/forgot-password` and `POST /auth/reset-password`

Auth: none.

- `forgot-password` body `{ "email": "..." }` always returns `204`, whether or not the email has
  an account, so it cannot be used to find out who is registered.
- `reset-password` body `{ "token": "...", "newPassword": "..." }` returns `204`, or `400` if the
  token is invalid, expired or already used. Tokens expire after 1 hour and work once. Store only
  a hash of the token.

Needs an email provider. Render blocks outbound SMTP, so use an HTTP email API such as Resend
(free tier).

---

## 4. Frontend side of the integration

| File | Change |
| --- | --- |
| `src/lib/api.js` (new) | One axios instance: `baseURL: import.meta.env.VITE_API_URL`, a request interceptor that adds `Authorization: Bearer <token>`, and a response interceptor that logs out on `401` |
| `.env.example` (new) | `VITE_API_URL=http://localhost:3001` |
| `src/context/AuthContext.jsx` | Replace the `growth_logged_in` flag with a real token and user: `login` calls `/auth/login`, page load calls `/auth/me` |
| `src/components/Auth/LoginForm.jsx` | Send the password — today it is never used |
| `src/components/Auth/RegisterForm.jsx` | Remove `console.log("Register:", form)`, which prints the password; call `/auth/register` |
| `ProfilePage`, `SettingsPage`, `ContactPage`, `NotificationsPage` | Replace the mock data with the endpoints above |

Show `response.data.message` for errors. A request that fails with no response at all means the
server did not answer — say that, not "wrong password".

---

## 5. Week 1 definition of done

```bash
curl http://localhost:3001/health
# 200 {"status":"ok"}

curl -X POST http://localhost:3001/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"t@t.com","password":"abc12345","fullName":"Test","acceptedTerms":true}'
# 201 {"token":"...","user":{...}}

curl http://localhost:3001/auth/me -H "Authorization: Bearer <token>"
# 200 {...user}

curl -i http://localhost:3001/auth/me
# 401 {"message":"..."}
```

Then in the browser, from the frontend at `http://localhost:5173`: register, log in, refresh the
page and still be logged in, log out. No CORS errors in the console.

---

## 6. Open decisions

| Decision | Options | Owner |
| --- | --- | --- |
| Backend stack | Express, NestJS, FastAPI — whatever the backend team knows best | Backend |
| Database access / migrations | Prisma, Knex, SQLAlchemy + Alembic | Backend |
| Growth reference | CDC 2000, WHO, Thai reference | Client + PM |
| What creates notifications | See Phase 6 | PM |
| Bone-age model hosting | Inside the backend, or a separate service | Backend + AI |
| Production URLs | Fill in the table in section 1 | Whoever deploys |
