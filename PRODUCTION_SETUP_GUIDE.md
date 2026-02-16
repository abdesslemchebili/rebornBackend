# Production Setup Guide – Step by Step

This guide walks you through the three things you must do before going live.

---

## 1. Real JWT secrets

**What it means:** Right now your `.env` has placeholder text like `your-super-secret-access-key-change-in-production`. Anyone who sees that string could forge tokens. In production you need **long, random secrets** that only your server knows.

**What to do:**

### Step 1.1 – Generate two random secrets

On your Mac (in Terminal), run these two commands. Each will print a long random string.

```bash
openssl rand -base64 32
```

Run it **twice** so you get **two different** strings (one for access, one for refresh).

Example output (yours will be different):
```
K7x9mP2vQnR4sL1wE6yU3iO0pA8tZ5cB
```

Run again:
```bash
openssl rand -base64 32
```

Second output, e.g.:
```
M2nJ6qW4eR8tY1uI3oP7aS0dF5gH9kL
```

### Step 1.2 – Put them in `.env`

Open your `.env` file and replace the placeholder lines with your two new strings.

**Before (unsafe):**
```env
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
```

**After (example – use YOUR two strings from Step 1.1):**
```env
JWT_ACCESS_SECRET=K7x9mP2vQnR4sL1wE6yU3iO0pA8tZ5cB
JWT_REFRESH_SECRET=M2nJ6qW4eR8tY1uI3oP7aS0dF5gH9kL
```

- Use the **first** random string for `JWT_ACCESS_SECRET`.
- Use the **second** random string for `JWT_REFRESH_SECRET`.
- Never commit `.env` to git or share these strings.

**Done.** Your server will now only accept tokens signed with these secrets.

---

## 2. Production NODE_ENV and CORS_ORIGIN

**What it means:**

- **NODE_ENV=production** – Tells the app “I am in production.” The server then uses secure cookie options (e.g. `secure: true`) and hides detailed errors from users.
- **CORS_ORIGIN** – The **exact URL** of your frontend (e.g. your React Native app or website). The backend will only accept requests from that URL when sending cookies. If you leave it as `http://localhost:19006`, only localhost can use the API, not your real app.

**What to do:**

### Step 2.1 – Set NODE_ENV for production

On the **machine where the backend runs in production** (your server, or Railway, Render, etc.), set:

```env
NODE_ENV=production
```

So in your **production** `.env` (or in your host’s “Environment variables” panel), you should have:

```env
NODE_ENV=production
```

(You can keep `NODE_ENV=development` on your **local** `.env` for development.)

### Step 2.2 – CORS when you have **only a mobile app** (no website)

You don't have a "live frontend URL" to put in CORS. That's fine. The backend **allows requests that send no Origin** (typical for native mobile). Your React Native / Expo app will work in production without setting any special CORS URL. In production you can **leave `CORS_ORIGIN` as-is** or set it to your API base URL. **Mobile requests (no Origin) are allowed by default.** Summary: set `NODE_ENV=production`; you do **not** need to set `CORS_ORIGIN` to a frontend URL for your mobile app.

### Step 2.3 – CORS when you **also have a web app**

Ask yourself: **What is the full URL users use to open my app in production?**

Examples:

- Website: `https://app.reborn.tn` or `https://reborn.tn`
- Expo web: `https://my-expo-app.vercel.app`
- React Native with a custom scheme: sometimes you still have a “web” or “origin” URL for API calls; use that.

Then in your **production** `.env` (or host’s env vars), set:

```env
CORS_ORIGIN=https://your-real-app-url.com
```

Replace `https://your-real-app-url.com` with your real URL. Use `https://` in production, not `http://`.

**Example:**
```env
CORS_ORIGIN=https://app.reborn.tn
```

**Done.** In production, the server will only accept cookie-based requests from that origin.

---

## 3. Plan for refresh token storage (Redis or similar)

**What it means:** Today, when a user logs in, the server stores “this refresh token belongs to user X” in **memory** (a Map). If you restart the server, or run **two or more** server instances (e.g. for load balancing), that in-memory list is lost or not shared. So:

- After a restart, all refresh tokens stop working (users get logged out when they try to refresh).
- With multiple instances, refresh might work on one server and fail on another.

So “a plan for refresh token storage” means: **store refresh tokens in a place that survives restarts and is shared by all instances** – usually **Redis** or a database.

**What to do (choose one path):**

### Option A – Single server, restarts are rare (e.g. small team, one VM)

- **You can go live** without changing anything.
- Accept that after each **server restart**, users will have to log in again when their access token expires (they’ll get 401, refresh will fail, app sends them to login).
- Later, when you want “refresh to survive restarts,” add Redis (see Option B).

### Option B – You want refresh to survive restarts and/or multiple instances

1. **Add a Redis service** (e.g. Redis Cloud, Upstash, or Redis on your server).
2. **In the backend**, replace the in-memory `Map` in `auth.service.js` with Redis:
   - On login/refresh: store `refreshToken → userId` in Redis (with a TTL similar to refresh token expiry).
   - On refresh: check Redis for the token; if found, issue new tokens and update Redis.
   - On logout: remove the token from Redis.
3. **Environment:** Add something like `REDIS_URL=redis://...` to your production env and read it in the app.

This requires code changes (using a Redis client and calling it instead of the Map). If you tell me you want to do Option B, I can outline the exact code changes in `auth.service.js` and env.

**Summary:**

| Situation | What to do now |
|-----------|----------------|
| One server, rare restarts, OK if users re-login after deploy | Go live as-is; plan Redis later if needed. |
| Multiple servers or you want no re-login after restarts | Add Redis (or similar) and store refresh tokens there before or soon after go-live. |

---

## Quick checklist before go-live

- [ ] **JWT secrets:** Generated two random strings with `openssl rand -base64 32` and set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production `.env`.
- [ ] **NODE_ENV:** Set to `production` in production environment.
- [ ] **CORS_ORIGIN:** Set to your real frontend URL (e.g. `https://app.reborn.tn`) in production.
- [ ] **Refresh tokens:** Decided: accept re-login after restarts for now (Option A) or plan Redis (Option B).

Once these are done, you’re in good shape to go live from a configuration and security perspective.
