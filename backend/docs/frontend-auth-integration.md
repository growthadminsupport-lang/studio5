# Frontend authentication guide

Updated 2026-09-22. See [the API guide](frontend-api.md) for setup and all endpoint paths. Request schemas are generated at `/docs` and `/openapi.json`.

## Configuration

Frontend (Vite example):

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

Backend:

```dotenv
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
APP_BASE_URL=http://localhost:5173
GOOGLE_CLIENT_IDS=<web-client-id>.apps.googleusercontent.com
```

Google must authorize the actual frontend origin. Backend and frontend must use matching client IDs. A client ID is public; no Google Client Secret is required for this ID-token verification flow. Never expose backend secrets in frontend environment variables.

The local demo currently has its public Web client ID in `tests/growth_demo.js`. If using a different Google project, update that value and the backend allowlist together. The production frontend should read its own public configuration.

## Token contract

Registration (`201`), login (`200`), and refresh (`200`) return:

```ts
type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number; // currently 900 seconds
};
```

Use the GrowTH access token as `Authorization: Bearer <access_token>`. It expires after 15 minutes. Refresh tokens expire after 30 days and rotate on every successful refresh.

The demo keeps tokens in memory/sessionStorage. Production browser session storage remains a design task; HttpOnly cookies would require backend and CSRF changes. The current endpoints expect tokens in JSON or the Bearer header.

Always check `response.ok` before saving tokens. Never log token responses. Fetch `GET /api/auth/me` to load the account rather than treating decoded JWT claims as the account API.

## Registration and password login

`POST /api/auth/register`:

```json
{
  "full_name": "Example Parent",
  "email": "parent@example.com",
  "password": "a-strong-passphrase",
  "phone_number": null,
  "terms_accepted": true
}
```

Populate `terms_accepted` from the user's actual consent. Registration currently has no email verification step and immediately returns a token pair. Names are trimmed; blank names are rejected. The backend validates password policy and duplicate email addresses.

`POST /api/auth/login`:

```json
{
  "email": "parent@example.com",
  "password": "a-strong-passphrase"
}
```

After success, save the pair and call `GET /api/auth/me`. Its response includes `id`, `full_name`, `email`, `phone_number`, `created_at`, `has_password`, and `providers`.

## Google Sign-In

Load the Google Identity Services script before initializing the button:

```html
<div id="google-button"></div>
<label>
  <input id="google-consent" type="checkbox">
  I accept the terms and privacy policy when creating a new account.
</label>
<p id="google-error" role="alert"></p>
```

Example using `request` from [the API guide](frontend-api.md) and a frontend session manager's `saveTokens` function:

```js
const script = document.createElement("script");
script.src = "https://accounts.google.com/gsi/client";
script.async = true;
script.onerror = () => {
  document.getElementById("google-error").textContent = "Unable to load Google Sign-In.";
};
script.onload = () => {
  google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    ux_mode: "popup",
    auto_select: false,
    callback: async ({ credential }) => {
      try {
        const result = await request("/api/auth/google", {
          method: "POST",
          body: {
            id_token: credential,
            terms_accepted: document.getElementById("google-consent").checked,
          },
        });
        saveTokens(result);
        // Handle account flags below, load /api/auth/me, then show the dashboard.
      } catch (error) {
        document.getElementById("google-error").textContent = error.message;
      }
    },
  });
  google.accounts.id.renderButton(document.getElementById("google-button"), {
    theme: "outline",
    size: "large",
    text: "continue_with",
  });
};
document.head.appendChild(script);
```

Send `response.credential` to `/api/auth/google` as `id_token`. Use the resulting GrowTH access token for all other endpoints. New accounts require consent; existing accounts do not need to accept again.

Google responses extend the token pair:

| Field | Frontend behavior |
| --- | --- |
| `is_new_account: true` | Offer to create the first child profile. |
| `linked: true` | Explain that Google was linked to the existing account. |
| `password_cleared: true` | Explain that the old password was removed and offer password setup. |
| All flags false | Continue as a returning user. |

Automatic linking to an existing email account requires an authoritative Gmail/verified hosted-domain identity. Third-party email identities that are not eligible receive `403` and should follow the backend's error message. An already-linked Google subject can still sign in.

Linking an eligible existing password account clears its old password and revokes sessions/reset links to address account pre-hijacking. Test that case only with disposable accounts.

Google client configuration and applicable test-user access must be correct. The button has rendered locally and verification tests pass; a successful real Google account sign-in and database linking flow are still pending end-to-end verification.

## Refresh lifecycle

`POST /api/auth/refresh`:

```json
{ "refresh_token": "<current-refresh-token>" }
```

Replace **both** stored tokens with the returned pair.

For protected requests that receive `401`:

1. Remember which access token was used for the failed request.
2. If another request has already replaced that token, retry once with the current token.
3. Otherwise share one in-flight refresh promise across concurrent requests.
4. Save the new pair and retry the original request once.
5. If refresh or the retried request confirms invalid authentication, clear local session state and return to login.

Do not apply this mechanism to login, registration, Google sign-in, or refresh itself. Do not refresh repeatedly. Prevent a pending refresh from restoring a session after logout or after a different account logs in; the demo uses a session generation counter.

Reusing a rotated refresh token can revoke its session family. A network failure during refresh can leave its outcome uncertain, so do not blindly resend the same refresh token. Coordinate multiple browser tabs if they share a refresh token.

The existing implementation in [tests/growth_demo.js](../tests/growth_demo.js) illustrates request coordination for the local demo.

## Logout

`POST /api/auth/logout` accepts the current refresh token and returns `204` with no JSON body:

```json
{ "refresh_token": "<current-refresh-token>" }
```

On success, clear all local tokens and user/child state. If choosing to clear local state after a network failure, tell the user that server-side revocation was not confirmed; do not report a successful server logout.

`POST /api/auth/logout-all` requires a Bearer access token and returns a message. Both logout endpoints revoke refresh sessions. Already-issued access tokens can remain usable for up to 15 minutes; logout-all does not immediately invalidate those JWTs.

`GET /api/auth/sessions` lists active refresh sessions. Its `current` field is currently always false, so do not use it to label the current device.

## Password and email flows

| Endpoint | JSON body | Auth |
| --- | --- | --- |
| `POST /api/auth/password/forgot` | `{ "email": "..." }` | None |
| `POST /api/auth/password/reset` | `{ "token": "...", "new_password": "..." }` | Reset token |
| `POST /api/auth/password/change` | `{ "current_password": "...", "new_password": "..." }` | Bearer |
| `POST /api/auth/email/change` | `{ "current_password": "...", "new_email": "..." }` | Bearer |

A Google-only account can omit `current_password` when setting its first password. Accounts with passwords must supply it. Follow the response and return to login after credential changes invalidate sessions.

The frontend needs a `/reset-password?token=...` page matching backend `APP_BASE_URL`. Forgot-password returns a generic message, not a reset token. When SMTP is not configured, reset links appear in private development logs; real email delivery has not been verified.

## Integration checks

- Confirm exact CORS and Google JavaScript origins.
- Exercise email registration/login and `/api/auth/me`.
- Complete real Google login and repeat it to confirm the same user identity.
- Verify consent is based on the checkbox, not a hardcoded true value.
- Test parallel expired requests with a single coordinated refresh.
- Test logout while refresh is pending and failed logout messaging.
- Never commit/log tokens, passwords, private keys, or `.env`.
- Confirm HTTPS, session transport, SMTP, and rate limiting before public deployment.
