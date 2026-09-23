# Frontend API handoff

Updated 2026-09-22. This guide covers the implemented backend; the production frontend is maintained by a separate team.

## Connection

Run the backend using the [README](../README.md). Local defaults:

- API: `http://127.0.0.1:8000`
- Interactive contract: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`
- Frontend demo: `http://localhost:3000/growth_demo.html`

A teammate's browser cannot reach this computer using their own `localhost`. Run a local backend/database per developer until a shared environment is deployed.

For Vite:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

Backend `CORS_ORIGINS` must include the exact frontend origin, for example `http://localhost:5173`. Port, protocol, and hostname matter. Vite variables are public browser configuration: never include database credentials or backend secrets.

## Endpoint map

All paths are relative to the API base. JSON request bodies use `Content-Type: application/json`.

| Method | Path | Authentication | Success |
| --- | --- | --- | --- |
| GET | `/` | None | 200 service info |
| GET | `/health` | None | 200 database health |
| POST | `/api/auth/register` | None | 201 token pair |
| POST | `/api/auth/login` | None | 200 token pair |
| POST | `/api/auth/google` | Google ID token in body | 200 token pair and account flags |
| POST | `/api/auth/refresh` | Refresh token in body | 200 new token pair |
| POST | `/api/auth/logout` | Refresh token in body | 204, no body |
| POST | `/api/auth/logout-all` | GrowTH Bearer token | 200 message |
| GET | `/api/auth/me` | GrowTH Bearer token | 200 account |
| GET | `/api/auth/sessions` | GrowTH Bearer token | 200 array |
| POST | `/api/auth/password/forgot` | None | 200 generic message |
| POST | `/api/auth/password/reset` | Reset token in body | 200 message |
| POST | `/api/auth/password/change` | GrowTH Bearer token | 200 message |
| POST | `/api/auth/email/change` | GrowTH Bearer token | 200 message |
| GET | `/api/children` | GrowTH Bearer token | 200 array |
| POST | `/api/children` | GrowTH Bearer token | 201 child |
| GET | `/api/children/{child_id}` | GrowTH Bearer token | 200 child |
| PATCH | `/api/children/{child_id}` | GrowTH Bearer token | 200 child |
| DELETE | `/api/children/{child_id}` | GrowTH Bearer token | 204, no body |
| GET | `/api/children/{child_id}/growth` | GrowTH Bearer token | 200 array |
| POST | `/api/children/{child_id}/growth` | GrowTH Bearer token | 201 record |

There are no public AI inference, image upload, screening, admin, or article endpoints yet.

## A complete local request example

This helper checks HTTP failures and handles empty 204 responses. It intentionally does not log credentials or tokens.

```js
const API = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");

export async function request(path, { method = "GET", body, accessToken } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map(item => item.msg).join("\n")
        : `Request failed (${response.status})`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return payload;
}
```

Wire this function to form submissions and display caught errors. For an existing account:

```js
// email/password come from the login form, not source-code constants.
const tokens = await request("/api/auth/login", {
  method: "POST",
  body: { email, password },
});

const user = await request("/api/auth/me", {
  accessToken: tokens.access_token,
});

const child = await request("/api/children", {
  method: "POST",
  accessToken: tokens.access_token,
  body: {
    name: "Example child",
    sex: "male",
    date_of_birth: "2020-05-15",
  },
});

const history = await request(
  `/api/children/${encodeURIComponent(child.id)}/growth`,
  { accessToken: tokens.access_token },
);
```

Keep tokens in your session manager and apply the [authentication lifecycle](frontend-auth-integration.md). This basic helper does not automatically refresh or retry requests.

## Child contract

Create body:

```json
{
  "name": "Example child",
  "sex": "male",
  "date_of_birth": "2020-05-15"
}
```

The response contains `id` (UUID string), `name`, `sex`, `date_of_birth`, and `created_at`. The list endpoint returns an array ordered by creation time.

- Allowed sex values: `male`, `female`.
- Names are trimmed; blank names and names over 150 characters are rejected.
- Dates use `YYYY-MM-DD`; birth dates cannot be in the future.
- PATCH accepts any subset of the three fields. Omit unchanged fields.
- A changed birth date cannot be later than an existing measurement.
- Changing sex/birth date does not recalculate saved measurements.
- The backend obtains the parent from the token. Do not send a parent/user ID.
- DELETE removes the child and associated records. Ask the user before deleting.

## Growth contract

Create body:

```json
{
  "measurement_date": "2026-09-22",
  "height_cm": 112.5,
  "weight_kg": 19.2
}
```

Use the user's selected date, no later than today and no earlier than the child's birth date.

Response fields:

| Fields | Type |
| --- | --- |
| `id`, `created_at` | UUID string, timestamp string |
| `measurement_date` | Date string |
| `height_cm`, `weight_kg` | Number |
| `bmi` | Number or null |
| `height_percentile`, `weight_percentile`, `bmi_percentile` | Number or null |
| `height_sds`, `weight_sds`, `bmi_sds` | Number or null |
| `guidance_message` | String or null |
| `is_flagged` | Boolean |

GET returns records newest measurement first. One record per child/date is allowed; duplicates return `409`. Height must be 20–250 cm, weight 0.3–300 kg, and the combined BMI must not exceed 200; these are input limits, not clinical interpretation.

Missing LMS reference data gives null percentile/SDS fields. Show an unavailable/incomplete assessment state, not a normal badge based only on `is_flagged: false`. No growth PATCH/DELETE endpoint currently exists.

## Errors and UI handling

| Status | Frontend handling |
| --- | --- |
| 400 | Display the request/consent error. |
| 401 | For protected requests, attempt coordinated refresh once; login failures stay on the login form. |
| 403 | Display the restriction; do not repeatedly retry. |
| 404 | Child is missing or not accessible to this account. |
| 409 | Display the duplicate/conflict message. |
| 422 | Show validation feedback; `detail` can be a string or an array with `loc`, `msg`, and `type`. |
| 429 | Respect `Retry-After` when provided and wait before another attempt. |
| 503 | A configured service is unavailable or Google is disabled. |
| Network/5xx | Show a recoverable error. Re-read data before retrying a write whose outcome is unknown. |

Error messages may be Thai. Do not automatically replay registration, writes, or password changes after network failures.

## Team acceptance checks

1. Start API and confirm `/health`.
2. Register/login, then load `/api/auth/me`.
3. Create a child, save a measurement, and read it after re-login.
4. Confirm another test account cannot access that child's ID.
5. Confirm refresh rotation, parallel 401 handling, and logout UX.
6. Complete real Google login using the configured Web client.
7. Recheck CORS, HTTPS, Google origin, session design, and actual API URL on deployment.

The local demo in `tests/` is a reference implementation. It is not part of the FastAPI server's static routes.
