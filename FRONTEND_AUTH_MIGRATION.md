# Auth Migration: JWT in Body → HttpOnly Cookies

**Audience:** Frontend team (React Native / web)  
**Purpose:** Describe what changed on the backend and what the frontend must do to work with cookie-based authentication.

---

## 1. What Changed

| Before (old) | After (current) |
|--------------|-----------------|
| Login response included `token` and `refreshToken` in JSON body | **No tokens in response body.** Tokens are set in **HttpOnly cookies** only. |
| Frontend stored tokens (e.g. in state/AsyncStorage) and sent `Authorization: Bearer <accessToken>` | Frontend **must not** store tokens. Browser/client sends cookies automatically when **credentials** are included. |
| Refresh: frontend sent `refreshToken` in body or header | Refresh: frontend calls `POST /auth/refresh` **with credentials**; refresh token is read from cookie by the server. |
| Logout: optional body/header, often required Bearer token | Logout: **no auth required**. Frontend calls `POST /auth/logout` with credentials; server clears cookies. |
| Protected requests: `Authorization: Bearer <accessToken>` | Protected requests: **no header.** Server reads access token from **cookie** `accessToken`. |

**Summary:** The backend no longer returns or accepts tokens in the request/response body (or Authorization header). It uses **HttpOnly cookies** only. The frontend must send **credentials** on every request to the API so cookies are attached.

---

## 2. What the Frontend Must Do

### 2.1 Send credentials on every API request

All requests to the backend (same-origin or cross-origin) must be sent **with credentials** so the browser (or React Native client) includes the cookies.

- **Fetch:** use `credentials: 'include'`.
- **Axios:** use `withCredentials: true` (e.g. on the axios instance or per request).

Example (axios):

```js
const api = axios.create({
  baseURL: 'https://your-api.com/api/v1',
  withCredentials: true,  // required so cookies are sent
});
```

Example (fetch):

```js
fetch(`${API_BASE}/auth/me`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
});
```

### 2.2 Stop storing and sending tokens yourself

- **Do not** store `token` or `refreshToken` from the login response (they are no longer in the response).
- **Do not** set `Authorization: Bearer ...` on requests. The server ignores it; it only reads the `accessToken` cookie.
- **Do not** send `refreshToken` in the body or a header to `/auth/refresh`. The server reads it from the `refreshToken` cookie.

### 2.3 Update login handling

**Old (remove):**
- Reading `action.payload.token` and `action.payload.refreshToken` from the login response.
- Storing them in state or AsyncStorage.
- Setting an Authorization header from stored token.

**New (current API):**

- **Request:** `POST /api/v1/auth/login` with body `{ "email": "...", "password": "..." }` and **credentials included**.
- **Response (200):**
  ```json
  {
    "success": true,
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
  ```
  There is **no** `data` wrapper and **no** `token` or `refreshToken` in the response. The server sets `accessToken` and `refreshToken` via `Set-Cookie` headers.

**Frontend:** Store only **user** (e.g. in state/context). Mark the user as logged in (e.g. `isAuthenticated: true`). Do **not** store or expect any token from the response.

### 2.4 Update refresh flow

**Old:**  
Frontend sent `refreshToken` in body or header to `POST /api/v1/auth/refresh` and received new `token` and `refreshToken` in the response, then stored them.

**New:**

- **Request:** `POST /api/v1/auth/refresh` with **no body** (or empty body) and **credentials included**. The server reads the refresh token from the `refreshToken` cookie.
- **Response (200):**
  ```json
  { "success": true }
  ```
  No tokens in body. The server sets new `accessToken` and `refreshToken` via `Set-Cookie`.

**Frontend:** On access token expiry (e.g. 401 on a protected request), call `POST /api/v1/auth/refresh` with **credentials included**. If it returns 200, retry the original request (again with credentials). Do not read or store any token from the response.

### 2.5 Update logout

**Old:**  
Some flows required sending the access token (Bearer) and optionally the refresh token in the body.

**New:**

- **Request:** `POST /api/v1/auth/logout` with **credentials included**. No auth required; no body needed.
- **Response (200):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
  The server clears the `accessToken` and `refreshToken` cookies.

**Frontend:** Call logout with credentials, then clear local user state and redirect to login. Do not send or clear any stored token (you no longer store them).

### 2.6 Protected requests (e.g. GET /auth/me, work sessions, clients, …)

- Send the request **with credentials** (so the `accessToken` cookie is sent).
- Do **not** set `Authorization: Bearer ...`. The server reads the token from the cookie.

If the server returns **401** (e.g. expired access token):

1. Call `POST /api/v1/auth/refresh` with credentials.
2. If refresh returns 200, retry the original request with credentials.
3. If refresh returns 401, treat as logged out: clear user state and redirect to login.

---

## 3. CORS and base URL

The backend allows only the origin configured in `CORS_ORIGIN` (e.g. `http://localhost:19006` for dev) and uses `credentials: true`. So:

- Frontend must call the API from an origin that matches the backend’s `CORS_ORIGIN`, or the backend must list your frontend origin there.
- All API requests must use **credentials** (see above).

---

## 4. Quick checklist for frontend

- [ ] Every API request uses `credentials: 'include'` (fetch) or `withCredentials: true` (axios).
- [ ] Login: use only `user` from the response; do not read or store `token` / `refreshToken`.
- [ ] Refresh: call `POST /api/v1/auth/refresh` with credentials and no body; do not send or store tokens.
- [ ] Logout: call `POST /api/v1/auth/logout` with credentials; clear local user state only.
- [ ] Remove any code that sets `Authorization: Bearer ...` or stores tokens from the API.
- [ ] 401 handling: try refresh with credentials → retry request; if refresh fails, redirect to login.

---

## 5. Response shapes reference (current backend)

| Endpoint | Request | Success response body |
|----------|---------|------------------------|
| `POST /api/v1/auth/login` | `{ "email", "password" }` | `{ "success": true, "user": { "id", "name", "email" } }` |
| `POST /api/v1/auth/refresh` | (none; credentials only) | `{ "success": true }` |
| `POST /api/v1/auth/logout` | (none; credentials only) | `{ "success": true, "message": "Logged out successfully" }` |
| `GET /api/v1/auth/me` | (credentials only) | `{ "success": true, "data": { "user": { "id", "name", "email" } } }` |

Tokens are **only** in cookies (`Set-Cookie` / cookie header), never in these JSON bodies.
