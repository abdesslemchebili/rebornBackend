# Deploy REBORN Backend to Render

## 1. Fix the Start Command

In the Render form, change **Start Command** from:

```text
npm run dev
```

to:

```text
npm start
```

- `npm run dev` is for local development (file watching).  
- `npm start` runs `node src/server.js`, which is what you want in production.  
- Render will set `PORT` for you; your app already uses `process.env.PORT`.

---

## 2. Build Command

Keep:

```text
npm install
```

No separate build step needed for this Node backend.

---

## 3. Environment Variables (required)

Click **“Add Environment Variable”** (or **“Add from .env”** if you want to paste from a file) and add these. Use your **real** values; never commit them to git.

| Name | Value | Notes |
|------|--------|--------|
| `NODE_ENV` | `production` | Required for production. |
| `MONGODB_URI` | Your Atlas URI | e.g. `mongodb+srv://user:pass@cluster.mongodb.net/reborn?retryWrites=true&w=majority` |
| `JWT_ACCESS_SECRET` | (long random string) | Generate with `openssl rand -base64 32`. Not the placeholder. |
| `JWT_REFRESH_SECRET` | (different long random string) | Generate with `openssl rand -base64 32`. Not the placeholder. |

Optional (you can omit and use defaults):

| Name | Example value | Notes |
|------|----------------|--------|
| `JWT_ACCESS_EXPIRES_IN` | `150m` | Default 15m if omitted. |
| `JWT_REFRESH_EXPIRES_IN` | `70d` | Default 7d if omitted. |
| `CORS_ORIGIN` | `http://localhost:19006` or your API URL | For mobile-only you can leave as-is. |
| `LOG_LEVEL` | `info` | Optional. |
| `SWAGGER_ENABLED` | `false` | Recommended in production (or `true` if you want `/api-docs`). |

Do **not** add `PORT` — Render sets it automatically.

---

## 4. Rest of the form

- **Name:** `rebornBackend` (or any name you like).  
- **Branch:** `main` (or the branch you deploy from).  
- **Root Directory:** Leave empty (repo root is correct).  
- **Region:** Oregon (or your preferred region).  
- **Instance type:** Free is fine to start; upgrade if you need no spin-down or more resources.

---

## 5. Deploy

Click **“Deploy web service”**. Render will:

1. Clone the repo  
2. Run `npm install`  
3. Start with `npm start`  
4. Expose the app at `https://rebornBackend.onrender.com` (or the name you chose)

---

## 6. After first deploy

- Open the service URL; you should get a 404 for `/` (your API lives under `/api/v1`).  
- Test health: `https://YOUR-SERVICE-NAME.onrender.com/api/v1/...` (e.g. login or a public route).  
- In your **mobile app**, set the API base URL to `https://YOUR-SERVICE-NAME.onrender.com/api/v1` (or whatever Render shows).

**Free tier:** The service may spin down after inactivity; the first request after that can be slow (cold start).
