# Backend: Missing Endpoints & Config (from Postman + docs vs frontend)

**Purpose:** Gaps between the REBORN Postman collection / documentation and what the frontend expects or what is documented but not in Postman. Add or fix these on the backend (and optionally in the Postman collection).

---

## 1. Missing from Postman collection

### 1.1 POST /api/v1/upload

- **Used by:** Client add/edit screens (owner photo, shop photo).
- **Frontend:** `uploadService.js` → `POST /upload` (relative to base `/api/v1`), `multipart/form-data` with field `file`, expects response with a URL in `data.url` or `data.data.url` or `data.data.fileUrl`.
- **Docs:** `BACKEND_CLIENT_API_SPEC.md` specifies this endpoint.
- **Action:** Implement if not present; add a request to the Postman collection (e.g. under "Upload" or "Auth") for manual testing.

---

## 2. Query parameters the frontend sends (backend must support)

### 2.1 GET /api/v1/payments

- **Frontend:** `transactionService.getCreditTransactions({ fromDate, toDate, page, limit, status, client })`.
- **Postman:** "List payments" has only `page`, `limit`; "Payments by date range" uses a **separate path** `GET /payments/by-date-range?fromDate=&toDate=`.
- **Expectation:** The app calls **one** endpoint: `GET /api/v1/payments?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&page=1&limit=500`. It does **not** call `/payments/by-date-range`.
- **Action:** Backend must accept **optional** `fromDate` and `toDate` on `GET /api/v1/payments` and filter results (and summary) by that range. Optionally keep `by-date-range` as an alias, but the main list endpoint must support these query params.
- **Summary:** Same response must include `data.summary: { totalCollected, pending }` (for the filtered set when fromDate/toDate are used). See §6.3 in BACKEND_INTEGRATION_REQUIREMENTS.md.

### 2.2 GET /api/v1/deliveries

- **Frontend:** `deliveriesService.getDeliveries({ date, limit, page, status, clientId })` → `GET /deliveries?date=YYYY-MM-DD&limit=200`.
- **Postman:** "List deliveries" has `page`, `limit`; "Deliveries by date" uses **separate path** `GET /deliveries/by-date?date=`.
- **Expectation:** The app uses a **single** list endpoint with optional **query param** `date`.
- **Action:** Backend must accept optional **query param** `date` (YYYY-MM-DD) on `GET /api/v1/deliveries` and filter by delivery date. No need for the frontend to call `/deliveries/by-date` if the main list supports `?date=`.

### 2.3 GET /api/v1/work-sessions/history

- **Frontend:** `daySessionService.getSessionHistory({ fromDate, toDate, page, limit })` → `GET /work-sessions/history?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&page=1&limit=100`.
- **Postman:** "Session history" only has `page=1`, `limit=20`.
- **Action:** Backend must accept optional **query params** `fromDate` and `toDate` (YYYY-MM-DD) and filter sessions (e.g. by `startTime` or `endTime` in range). Add these query params to the Postman request for "Session history".

---

## 3. Response shape / config the frontend expects

### 3.1 GET /api/v1/auth/me (and login user)

- **Frontend:** Settings screen shows profile using `user.firstName`, `user.lastName`, `user.email`, `user.role`. Display name is built from `firstName` + `lastName` or `name` or `email`.
- **Docs:** BACKEND_INTEGRATION_REQUIREMENTS §19.1 mentions `user: { id, name, email }` only.
- **Action:** Backend should return (in login response and in `GET /auth/me`) at least: `id`, `email`, and preferably `firstName`, `lastName`, `name` (or computed display name), and `role` so the Settings screen can show a full profile and role badge.

### 3.2 GET /api/v1/payments — summary in list response

- **Frontend:** Expects `data.summary: { totalCollected: number, pending: number }` in the **same** response as `data.results` (and `page`, `limit`, `total`).
- **Action:** When returning a paginated/filtered list, always include `summary` with `totalCollected` (sum of completed payments in the filtered set) and `pending` (sum of pending in the filtered set). If the backend only has a separate "summary" endpoint, the frontend would need to call it; currently it expects summary in the list response.

### 3.3 Login response with cookie auth

- **Docs:** COOKIE_AUTH_IMPLEMENTATION_REPORT and frontend use cookie-based auth; login returns `{ success: true, user }` (no tokens in body).
- **Action:** Ensure login response includes a **user** object with the fields above (§3.1). Frontend does not expect `token`/`refreshToken` in body when using cookies.

---

## 4. Client API (from BACKEND_CLIENT_API_SPEC)

- **PATCH vs PUT:** Spec says frontend uses **PATCH** for update; BACKEND_INTEGRATION_REQUIREMENTS sometimes says PUT. Frontend uses **PATCH** (`EditClientScreen` → `patchClient`). Backend should accept **PATCH** `/api/v1/clients/:id` for partial updates.
- **Client fields:** Backend must accept and return: `matriculeFiscale`, `latitude`, `longitude`, `ownerName`, `ownerPicture`, `shopPicture`, and `address` as object `{ city, governorate }`. Do not 422 on these or on extra fields.

---

## 5. Optional / future

### 5.1 Forgot password

- **Frontend:** `ForgotPasswordScreen` exists but currently **simulates** the API (no real call). A future endpoint could be e.g. `POST /api/v1/auth/forgot-password` with `{ email }` and return success (send reset link by email).
- **Action:** Not required for current app; add to backend and Postman when implementing "forgot password" flow.

### 5.2 CORS / cookie config

- **Docs:** COOKIE_AUTH_IMPLEMENTATION_REPORT mentions `CORS_ORIGIN` and `credentials: true`. Backend must allow the frontend origin (e.g. Expo web, or the app’s origin when using cookies) and send cookies with correct `SameSite`/`Secure` for production.

---

## 6. Postman collection updates (recommended)

| Item | Change |
|------|--------|
| **Auth** | Add "Upload image" (POST /api/v1/upload, multipart/form-data, field `file`) if backend implements it. |
| **Payments** | In "List payments", add optional query params: `fromDate`, `toDate`, `client`, `status`. Document that response must include `data.summary`. |
| **Deliveries** | In "List deliveries", add optional query param: `date` (YYYY-MM-DD). |
| **Work Sessions** | In "Session history", add optional query params: `fromDate`, `toDate`. |

---

## 7. Summary checklist for backend

- [x] **Upload:** POST /api/v1/upload (multipart `file`) → returns URL; add to Postman.
- [x] **Payments:** GET /api/v1/payments accepts `fromDate`, `toDate`, `client`, `status` and returns `data.summary { totalCollected, pending }` for the filtered set.
- [x] **Deliveries:** GET /api/v1/deliveries accepts optional query param `date`.
- [x] **Work sessions:** GET /api/v1/work-sessions/history accepts optional `fromDate`, `toDate`.
- [x] **Auth/me (and login user):** Return `firstName`, `lastName`, `role` (and `name`, email) for profile/roles.
- [x] **Clients:** PATCH supported; accept and return client spec fields (address object, matriculeFiscale, lat/long, owner/shop pictures).
- [x] **Postman:** Upload request present; fromDate/toDate/date query params added to Payments, Deliveries, Work Sessions history.
