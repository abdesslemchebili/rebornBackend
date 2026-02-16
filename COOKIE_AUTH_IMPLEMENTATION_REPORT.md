# Cookie-Based Authentication Implementation Report

## Summary

Authentication has been migrated from returning JWT tokens in the response body to **HttpOnly cookie-based authentication**. Tokens are no longer exposed in JSON; they are set and read via secure cookies.

---

## Files Modified

| File | Changes |
|------|---------|
| `package.json` | Added dependency: `cookie-parser` |
| `src/app.js` | Imported `cookie-parser`; added `app.use(cookieParser())` before routes; updated CORS to `{ origin: env.corsOrigin, credentials: true }` |
| `src/config/env.js` | Added `corsOrigin: process.env.CORS_ORIGIN \|\| 'http://localhost:19006'` |
| `src/modules/auth/auth.controller.js` | Login: set `accessToken` and `refreshToken` cookies, return only `{ success: true, user }`. Refresh: read `refreshToken` from cookie, set new cookies, return `{ success: true }`. Logout: read refresh from cookie for server-side invalidation, clear both cookies, return `{ success: true, message: 'Logged out successfully' }` |
| `src/middleware/auth.js` | Replaced `Authorization` header with `req.cookies.accessToken` in both `authenticate` and `optionalAuth` |
| `src/modules/auth/auth.routes.js` | Removed `authenticate` middleware from `POST /logout` so logout can clear cookies without a valid access token |
| `.env` | Added `CORS_ORIGIN=http://localhost:19006` |
| `.env.example` | Added `CORS_ORIGIN=http://localhost:19006` |

---

## Security Settings Applied

- **Cookies**
  - `httpOnly: true` — not accessible via JavaScript (mitigates XSS).
  - `secure: true` in production (`process.env.NODE_ENV === 'production'`).
  - `sameSite: 'strict'` — not sent on cross-site requests (CSRF mitigation).
  - Access token cookie: `path: '/'`, `maxAge: 15 * 60 * 1000` (15 minutes).
  - Refresh token cookie: `path: '/api/v1/auth/refresh'`, `maxAge: 70 * 24 * 60 * 60 * 1000` (70 days); only sent to the refresh endpoint.
- **Responses**
  - Login and refresh do **not** include tokens in the JSON body; only user/success data is returned.
- **CORS**
  - `credentials: true` so browsers send cookies on cross-origin requests; `origin` set from `CORS_ORIGIN` (single allowed origin, as required when using credentials).

---

## Endpoints Updated

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/api/v1/auth/login` | Sets `accessToken` and `refreshToken` HttpOnly cookies; returns `{ success: true, user }` only. |
| `POST` | `/api/v1/auth/refresh` | Reads `refreshToken` from cookie; verifies, issues new pair; sets new cookies; returns `{ success: true }`. |
| `POST` | `/api/v1/auth/logout` | Reads `refreshToken` from cookie (for server-side invalidation), clears both cookies; returns `{ success: true, message: 'Logged out successfully' }`. No authentication required. |
| `GET` | `/api/v1/auth/me` | Uses `authenticate` middleware; reads `accessToken` from `req.cookies.accessToken`. |

All other protected routes use the same `authenticate` middleware and therefore now rely on the `accessToken` cookie.

---

## Frontend / React Native Integration

- Requests that need to send or receive auth cookies must use **`credentials: 'include'`** (fetch) or **`withCredentials: true`** (axios).
- The backend is configured with `CORS_ORIGIN=http://localhost:19006` and `credentials: true` so the React Native / web client at that origin can use cookie-based auth.

---

## Testing Requirements (Checklist)

- [ ] **Login** — POST `/api/v1/auth/login` with valid credentials; response has no tokens; `Set-Cookie` headers present for `accessToken` and `refreshToken`.
- [ ] **Authenticated routes** — Requests to protected routes (e.g. GET `/api/v1/auth/me`) with the access cookie succeed; without the cookie, 401.
- [ ] **Refresh** — POST `/api/v1/auth/refresh` with refresh cookie; new access (and refresh) cookies set; response has no tokens.
- [ ] **Logout** — POST `/api/v1/auth/logout`; cookies cleared via `Set-Cookie` with `Max-Age=0` or `Clear-Site-Data`-style behavior; subsequent authenticated requests fail until login again.

---

## Remaining TODO

1. **Refresh token storage** — Refresh tokens are still stored in an in-memory `Map` in `auth.service.js`. For production with multiple instances or restarts, move to a persistent store (e.g. Redis) and keep the same cookie contract.
2. **E2E / integration tests** — Add or update tests to assert cookie setting on login, cookie reading for protected routes, refresh flow, and logout clearing cookies.
3. **Frontend** — Remove any code that reads or stores `accessToken`/`refreshToken` from the response body; ensure all API calls use `credentials: 'include'` (or equivalent) so cookies are sent.

---

## Critical Rules Compliance

- Existing architecture preserved; only auth transport (header/body → cookies) and related CORS/env changed.
- Tokens are not exposed in the response body.
- Production-oriented cookie settings: `httpOnly`, `secure` in production, `sameSite: 'strict'`.
- System is compatible with a React Native frontend using `credentials: true` and the configured `CORS_ORIGIN`.
