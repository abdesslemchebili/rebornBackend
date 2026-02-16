# Production Readiness Checklist

Use this before deploying the REBORN backend to production.

---

## Must do before production

### 1. Environment variables (`.env` on the server, never in git)

| Variable | Production action |
|----------|-------------------|
| `NODE_ENV` | Set to `production`. |
| `JWT_ACCESS_SECRET` | **Required.** Use a long, random secret (e.g. `openssl rand -base64 32`). The app will **not start** if you keep the placeholder `your-super-secret-access-key-change-in-production`. |
| `JWT_REFRESH_SECRET` | **Required.** Different from access secret; same length/randomness. App will not start with the placeholder. |
| `MONGODB_URI` | Your production MongoDB (e.g. Atlas) URI with database name and options. |
| `CORS_ORIGIN` | Your **production frontend origin** only (e.g. `https://app.reborn.tn`). Do not use `http://localhost:19006` in production. |
| `PORT` | Set if your host uses something other than 3000. |

### 2. Refresh token storage

- **Current:** Refresh tokens are stored in an **in-memory Map** in `auth.service.js`.
- **Impact:** With multiple server instances or after a restart, existing refresh tokens are not recognized (users get logged out on refresh).
- **For production:** Store refresh tokens in a shared store (e.g. **Redis**) and keep the same cookie/API contract. See `COOKIE_AUTH_IMPLEMENTATION_REPORT.md` → “Remaining TODO”.

### 3. Swagger / API docs

- **Current:** Enabled via `SWAGGER_ENABLED=true`. In production you may want `SWAGGER_ENABLED=false` or to serve `/api-docs` only behind auth or on an internal URL.

### 4. Secrets and repo

- **Confirm** `.env` is in `.gitignore` (it is) and that you never commit real secrets.
- **Rotate** any secret that was ever committed or shared (e.g. MongoDB password, JWT secrets).

---

## Already in good shape

- **Cookies:** `secure: true` and `sameSite: 'strict'` when `NODE_ENV=production`.
- **CORS:** Single origin + `credentials: true`; no wildcard with credentials.
- **Errors:** In production, 500 responses return “Internal server error” instead of stack traces.
- **Helmet, mongo-sanitize:** Security middleware in place.
- **Env validation:** Server refuses to start in production without JWT secrets and rejects placeholder secrets.

---

## Quick pre-deploy check

- [ ] `NODE_ENV=production` on the server.
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` set to strong, unique values (not placeholders).
- [ ] `CORS_ORIGIN` set to the production frontend URL (HTTPS).
- [ ] `MONGODB_URI` points to production DB with correct database name.
- [ ] `.env` (and any real secrets) never committed; deploy env via platform env vars or a secure secret store.
- [ ] Plan for refresh token storage (Redis or similar) if you run multiple instances or need refresh to survive restarts.
