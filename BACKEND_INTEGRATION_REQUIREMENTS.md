# Backend Integration Requirements

**Document purpose:** This specification defines the backend contract required by the REBORN mobile frontend. It is intended for the backend team and for Cursor in the backend project to implement or fix the backend so it is fully compatible with the frontend.

**Important:** Do not assume any backend implementation exists or is correct. This document defines the contract the frontend expects.

---

## 1. Project Overview

### 1.1 App Purpose

REBORN is a **mobile application for industrial distribution** (B2B field agents). It supports:

- **Work sessions (journées):** Agents start/end a work day; during a session they record cash payments, credit payments, credit sales, expenses, and completed deliveries. Session totals and recap are central to the flow.
- **Clients:** CRUD of clients (garages, car washes, hardware stores) with contact info, segment, optional photos and fiscal ID.
- **Deliveries:** List and filter deliveries; validate delivery status (pending → in_transit → completed); link completed deliveries to the active work session.
- **Payments:** Record payments (cash/check/transfer), track pending vs completed; link payments to the active work session (cash payment, credit repayment, credit sale).
- **Products:** CRUD of products (name, SKU, category, price, unit, stock, picture).
- **Planning:** Events (tournées) = circuit + date + time + per-stop action (delivery / payment / task).
- **Circuits:** Routes defined by an ordered list of clients with coordinates; used by planning.

### 1.2 User Roles

| Role        | Description |
|------------|-------------|
| **Agent**  | Field user: manages work sessions, clients, deliveries, payments, planning, circuits. All data is scoped to the authenticated user (see Security). |

The frontend currently assumes a single role (agent). Role-based access must be enforced by the backend for future roles (e.g. admin).

### 1.3 Backend Responsibilities

- **Authentication:** Issue and validate JWT access and refresh tokens; provide current user (me).
- **Work sessions:** Create and end sessions; persist one active session per user; store and return session history and session detail; compute or persist session totals (cash, credit collected, credit sales, expenses, deliveries).
- **Clients, Deliveries, Payments, Products, Planning, Circuits:** Full CRUD (where applicable) with persistence; list with optional pagination and filters; data isolated per user (or per tenant).
- **Global:** Consistent response format, error codes, pagination, and headers as specified below.

### 1.4 Data Persistence Requirements

- All entities must be stored in a **persistent datastore** (e.g. MongoDB, PostgreSQL). **In-memory storage is not allowed** for production.
- Work sessions, clients, payments, deliveries, products, planning events, and circuits must survive server restarts and be queryable by the authenticated user.

---

## 2. Authentication Requirements

**Current implementation uses HttpOnly cookie-based auth.** Tokens are never returned or accepted in the request/response body (or Authorization header). See **FRONTEND_AUTH_MIGRATION.md** for what the frontend must change and how to integrate.

### 2.1 Endpoints

#### POST `/api/v1/auth/login`

Authenticate with email and password. Server sets `accessToken` and `refreshToken` in HttpOnly cookies; response body contains only user.

| Aspect | Specification |
|--------|----------------|
| **Request body** | `{ "email": "string", "password": "string" }` |
| **Request** | Must be sent with **credentials** (e.g. `credentials: 'include'` / `withCredentials: true`) so cookies can be set. |
| **Response body (200)** | `{ "success": true, "user": { "id": "string", "name": "string", "email": "string" } }` — **no** `token` or `refreshToken` in body. |
| **Response headers** | `Set-Cookie` for `accessToken` and `refreshToken` (HttpOnly, secure in production, sameSite strict). |
| **Error (401)** | Invalid credentials: `{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }` |
| **Error (422)** | Validation: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }` |

**Frontend usage:** Send credentials on login. Store only `user` from the response; do not store or send tokens. Rely on cookies for subsequent requests.

---

#### POST `/api/v1/auth/refresh`

Issue new access (and refresh) tokens. Server reads refresh token from cookie and sets new tokens via `Set-Cookie`.

| Aspect | Specification |
|--------|----------------|
| **Request body** | None (or empty). Refresh token is read from `refreshToken` cookie. |
| **Request** | Must be sent with **credentials** so the refresh cookie is sent. |
| **Response body (200)** | `{ "success": true }` — **no** tokens in body. |
| **Response headers** | New `Set-Cookie` for `accessToken` and `refreshToken`. |
| **Error (401)** | `{ "success": false, "error": { "code": "INVALID_TOKEN", "message": "..." } }` |

---

#### POST `/api/v1/auth/logout`

Clear auth cookies. No authentication required.

| Aspect | Specification |
|--------|----------------|
| **Request body** | None. |
| **Request** | Should be sent with **credentials** so cookies are sent and can be cleared. |
| **Response body (200)** | `{ "success": true, "message": "Logged out successfully" }` |
| **Response headers** | Cookies `accessToken` and `refreshToken` cleared. |

---

#### GET `/api/v1/auth/me`

Return the current authenticated user. Access token is read from cookie.

| Aspect | Specification |
|--------|----------------|
| **Request** | Must be sent with **credentials** so the `accessToken` cookie is sent. **Do not** send `Authorization: Bearer ...`. |
| **Response body (200)** | `{ "success": true, "data": { "user": { "id": "string", "name": "string", "email": "string" } } }` |
| **Error (401)** | `{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }` or `INVALID_TOKEN` |

---

### 2.2 Token format (server-side; not sent in JSON)

- **Access token:** JWT in cookie `accessToken`, path `/`, HttpOnly, short-lived (e.g. 15 min). Used for all protected requests; server reads from cookie.
- **Refresh token:** JWT in cookie `refreshToken`, path `/api/v1/auth/refresh`, HttpOnly, long-lived (e.g. 70 days). Sent only to the refresh endpoint by the browser.

**Frontend:** Do not read or set these tokens. Use **credentials** on every API request so cookies are sent automatically.

### 2.3 Expiration and refresh behavior

- Access token: short-lived. Expired → 401. Frontend should call `POST /api/v1/auth/refresh` with credentials; on 200, retry the failed request with credentials.
- Refresh token: long-lived. If refresh returns 401, treat as logged out (clear user, redirect to login).
- All requests to the API must use **credentials** (e.g. `credentials: 'include'` or `withCredentials: true`).

---

## 3. Work Session Requirements

Work sessions are **critical**. The frontend starts/ends a session via API and expects the backend to persist the session and enforce business rules.

### 3.1 Endpoints

#### POST `/api/v1/work-sessions/start`

Start a new work session for the authenticated user.

| Aspect | Specification |
|--------|----------------|
| **Request body** | `{ "startTime": "string" }` — ISO 8601 datetime (e.g. `2025-02-14T08:00:00.000Z`) |
| **Headers** | `Authorization: Bearer <accessToken>`, `Content-Type: application/json` |
| **Response body (201)** | `{ "success": true, "data": { "session": { "id": "string", "startTime": "string", "endTime": null, "status": "ACTIVE", "totalCash": 0, "totalCreditCollected": 0, "totalCreditSales": 0, "totalExpenses": 0, "totalRevenue": 0, "cashPayments": [], "creditPayments": [], "creditSales": [], "expenses": [], "deliveriesCompleted": [] } } }` |
| **Alternative response shape** | Frontend also accepts `data.sessionId` and `data.session.startTime` (see workSessionAPI.js). Prefer returning full `session` object. |
| **Error (409)** | User already has an active session: `{ "success": false, "error": { "code": "ACTIVE_SESSION_ALREADY_EXISTS", "message": "..." } }` |
| **Error (401)** | `{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }` |

**Business rule:** Only **one active session** per user. If an active session exists, return 409.

---

#### POST `/api/v1/work-sessions/end`

End the active work session.

| Aspect | Specification |
|--------|----------------|
| **Request body** | `{ "sessionId": "string", "endTime": "string" }` — ISO 8601 datetime |
| **Headers** | `Authorization: Bearer <accessToken>`, `Content-Type: application/json` |
| **Response body (200)** | `{ "success": true, "data": { "endTime": "string", "session": { ... } } }` — session object with `status: "ENDED"` and final totals |
| **Error (404)** | No active session for this sessionId/user: `{ "success": false, "error": { "code": "NO_ACTIVE_SESSION", "message": "..." } }` |
| **Error (401)** | `{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }` |

**Business rule:** Session must exist and be ACTIVE for the authenticated user. After end, session is persisted with status ENDED and must appear in history.

---

#### GET `/api/v1/work-sessions/active`

Get the current user's active work session (if any).

| Aspect | Specification |
|--------|----------------|
| **Request body** | None |
| **Headers** | `Authorization: Bearer <accessToken>` |
| **Response body (200)** | If active session exists: `{ "success": true, "data": { "session": { ... } } }` with full session object. If none: `{ "success": true, "data": { "session": null } }` |
| **Error (401)** | `{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }` |

---

#### GET `/api/v1/work-sessions/history`

Get past work sessions for the current user (most recent first).

| Aspect | Specification |
|--------|----------------|
| **Query params** | Optional: `page`, `limit` (see Pagination) |
| **Headers** | `Authorization: Bearer <accessToken>` |
| **Response body (200)** | `{ "success": true, "data": { "results": [ { session object }, ... ], "page": 1, "limit": 20, "total": 42 } }` or paginated format per §12. Session objects must include at least: `id`, `startTime`, `endTime`, `status`, `totalCash`, `totalCreditCollected`, `totalCreditSales`, `totalExpenses`, and optionally the detail arrays. |

---

#### GET `/api/v1/work-sessions/:id`

Get a single work session by id (active or ended). Used for recap screen.

| Aspect | Specification |
|--------|----------------|
| **Headers** | `Authorization: Bearer <accessToken>` |
| **Response body (200)** | `{ "success": true, "data": { "session": { ... } } }` — full session object |
| **Error (404)** | `{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }` |
| **Error (401)** | `{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }` |

**Authorization:** Session must belong to the authenticated user.

---

### 3.2 Session Object Schema (Backend Must Persist and Return)

```json
{
  "id": "string",
  "startTime": "string (ISO 8601)",
  "endTime": "string | null (ISO 8601)",
  "status": "ACTIVE | ENDED",
  "totalCash": "number",
  "totalCreditCollected": "number",
  "totalCreditSales": "number",
  "totalExpenses": "number",
  "totalRevenue": "number (optional; can be computed: totalCash + totalCreditCollected + totalCreditSales)",
  "cashPayments": [
    { "id": "string", "clientId": "string", "clientName": "string", "amount": "number", "time": "string (ISO 8601)" }
  ],
  "creditPayments": [
    { "id": "string", "clientId": "string", "clientName": "string", "amount": "number", "time": "string (ISO 8601)" }
  ],
  "creditSales": [
    { "id": "string", "clientId": "string", "clientName": "string", "amount": "number", "time": "string (ISO 8601)" }
  ],
  "expenses": [
    { "id": "string", "label": "string", "amount": "number", "time": "string (ISO 8601)" }
  ],
  "deliveriesCompleted": [
    { "id": "string", "deliveryId": "string", "clientId": "string", "clientName": "string", "total": "number", "time": "string (ISO 8601)" }
  ]
}
```

### 3.3 Totals Object / Computation

- **totalRevenue** = totalCash + totalCreditCollected + totalCreditSales (may be computed server-side or stored).
- **Session totals** must update when the frontend (or backend) records payments, credit sales, expenses, or completed deliveries linked to that session. Backend may expose sub-resources (e.g. POST to add payment to session) or accept updates when payments/deliveries are created/updated; in any case, GET active and GET :id must return up-to-date totals and arrays.

### 3.4 Business Rules Summary

| Rule | Requirement |
|------|-------------|
| One active session per user | Reject start if user already has an active session (409). |
| Session must persist | Store in database; not in-memory. |
| Session totals | Update automatically when linked payments/expenses/deliveries are added; return correct values on GET active and GET :id. |

---

## 4. Clients Requirements

### 4.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/clients` | List clients (paginated, filterable). |
| GET | `/api/v1/clients/:id` | Get one client by id. |
| POST | `/api/v1/clients` | Create client. |
| PUT | `/api/v1/clients/:id` | Update client. |
| DELETE | `/api/v1/clients/:id` | Delete client (or soft-delete/archive). Frontend uses archive; backend may implement DELETE as hard delete or set `archived: true`. |

### 4.2 Pagination and Filter Format (GET `/api/v1/clients`)

- **Query parameters:**  
  - `page` (optional, default 1)  
  - `limit` (optional, default 20)  
  - `type` (optional): `mechanic` \| `car_wash` \| `hardware`  
  - `archived` (optional): `true` \| `false` — frontend filters "archived" vs "active"  
  - `search` or `q` (optional): search by name and/or address  

- **Response (200):**  
  `{ "success": true, "data": { "results": [ ...client objects... ], "page": 1, "limit": 20, "total": 99 } }`  
  (See §12 for standard pagination.)

### 4.3 Client Object Schema

```json
{
  "id": "string",
  "name": "string",
  "type": "mechanic | car_wash | hardware",
  "address": "string | null",
  "phone": "string | null",
  "email": "string | null",
  "totalOrders": "number (optional, default 0)",
  "lastVisit": "string | null (date YYYY-MM-DD or ISO)",
  "archived": "boolean (default false)",
  "latitude": "number | null",
  "longitude": "number | null",
  "matriculeFiscale": "string | null",
  "ownerName": "string | null",
  "ownerPicture": "string | null (URL)",
  "shopPicture": "string | null (URL)"
}
```

- **POST body:** Same fields as above (id may be generated by backend). Required: `name`, `type`.  
- **PUT body:** Subset of fields to update (partial update supported by frontend).

---

## 5. Deliveries Requirements

### 5.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/deliveries` | List deliveries (paginated; optional filter by status, date, clientId). |
| POST | `/api/v1/deliveries` | Create delivery. |
| PATCH | `/api/v1/deliveries/:id/status` | Update delivery status (e.g. to `in_transit` or `completed`). |

### 5.2 Delivery Object Schema

```json
{
  "id": "string",
  "clientId": "string",
  "clientName": "string",
  "date": "string (YYYY-MM-DD)",
  "status": "pending | in_transit | completed",
  "items": [
    { "productId": "string", "qty": "number" }
  ],
  "total": "number"
}
```

- **POST body:** `clientId`, `clientName`, `date`, `status` (optional, default `pending`), `items`, `total`.  
- **PATCH body:** `{ "status": "in_transit" | "completed" }`.

### 5.3 Relation with Work Session

When the frontend marks a delivery as completed, it also records a “delivery completed” entry in the **active work session** (see session object `deliveriesCompleted`). The backend may:

- Accept a call that both updates delivery status and appends to the current session, or  
- Rely on the frontend to call PATCH delivery status and separately update session (e.g. if backend exposes a “add delivery to session” endpoint).  

In all cases, GET work-session active/history/:id must return up-to-date `deliveriesCompleted` and session totals.

---

## 6. Payments Requirements

### 6.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/payments` | List payments (paginated; optional filter by clientId, status). |
| POST | `/api/v1/payments` | Create payment. |

### 6.2 Payment Object Schema

```json
{
  "id": "string",
  "clientId": "string",
  "clientName": "string",
  "amount": "number",
  "date": "string (YYYY-MM-DD)",
  "method": "cash | check | transfer",
  "status": "completed | pending"
}
```

- **POST body:** `clientId`, `clientName`, `amount`, `date`, `method`, `status` (optional).

### 6.3 Payments Summary

Frontend expects a **summary** for “À encaisser” and “Encaissé (total)”:

- **Option A:** GET `/api/v1/payments` response includes a summary:  
  `{ "success": true, "data": { "results": [...], "summary": { "totalCollected": "number", "pending": "number" }, "page", "limit", "total" } }`  
- **Option B:** Separate endpoint GET `/api/v1/payments/summary` returning `{ "success": true, "data": { "totalCollected": "number", "pending": "number" } }`.

`totalCollected` = sum of `amount` where `status === 'completed'`.  
`pending` = sum of `amount` where `status === 'pending'`.

### 6.4 Relation with Work Session

Cash payments and credit repayments (and credit sales) are also recorded in the **active work session** (`cashPayments`, `creditPayments`, `creditSales`). Backend must either accept payloads that link a payment to the current session or provide an way to attach payments to the session so that GET work-session returns correct totals and lists.

---

## 7. Products Requirements

### 7.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/products` | List products (paginated; optional filter by category). |
| POST | `/api/v1/products` | Create product. |
| PUT | `/api/v1/products/:id` | Update product. |
| DELETE | `/api/v1/products/:id` | Delete product. |

### 7.2 Product Object Schema

```json
{
  "id": "string",
  "name": "string",
  "sku": "string",
  "category": "string (e.g. degreasing, oil_remover, engine, car_wash)",
  "price": "number",
  "unit": "L | unit | kg",
  "stock": "number",
  "picture": "string (URL or empty)"
}
```

- **POST body:** `name`, `sku`, `category`, `price`, `unit`, `stock`, `picture` (optional).  
- **PUT body:** Partial update supported.

### 7.3 Categories

Frontend uses a **categories** list (id + label) for product form. Options:

- **Option A:** Backend exposes GET `/api/v1/categories` returning `{ "success": true, "data": { "results": [ { "id": "string", "label": "string" } ] } }`.  
- **Option B:** Categories are fixed in frontend; backend only stores `product.category` as string.  
- **Option C:** Backend provides categories and frontend syncs; create category via POST if needed.

---

## 8. Planning Requirements

### 8.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/planning` | List planning events (optionally filter by date range). |
| POST | `/api/v1/planning` | Create planning event. |

Frontend also updates and removes events (edit/delete tournée); backend should support:

- **PUT** `/api/v1/planning/:id` — update event.  
- **DELETE** `/api/v1/planning/:id` — delete event.  

### 8.2 Planning Event Object Schema

```json
{
  "id": "string",
  "circuitId": "string",
  "title": "string",
  "date": "string (YYYY-MM-DD)",
  "time": "string | null (e.g. 09:00)",
  "status": "scheduled | completed",
  "stops": [
    { "clientId": "string", "order": "number", "action": "delivery | payment | task" }
  ]
}
```

- **POST body:** `circuitId`, `title`, `date`, `time` (optional), `status` (optional), `stops`.  
- **PUT body:** Same fields, partial update.

---

## 9. Circuits Requirements

### 9.1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/circuits` | List circuits. |
| GET | `/api/v1/circuits/:id` | Get one circuit. |
| POST | `/api/v1/circuits` | Create circuit. |
| PUT | `/api/v1/circuits/:id` | Update circuit. |
| DELETE | `/api/v1/circuits/:id` | Delete circuit. |

### 9.2 Circuit Object Schema

```json
{
  "id": "string",
  "name": "string",
  "region": "string",
  "clientIds": [ "string" ],
  "stops": [
    { "clientId": "string", "order": "number", "lat": "number", "lng": "number" }
  ],
  "estimatedDuration": "number (minutes)"
}
```

- **POST body:** `name`, `region`, `clientIds`, `stops` (order, lat, lng per client), `estimatedDuration` (optional; can be computed).  
- **PUT body:** Same; full or partial update.

---

## 10. Global API Response Format

### 10.1 Success

```json
{
  "success": true,
  "data": { ... }
}
```

- For list endpoints, `data` typically contains `results` plus pagination fields (see §12).

### 10.2 Error

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": [ ] 
  }
}
```

- `details` is optional (e.g. validation errors).  
- HTTP status must reflect the error (401, 404, 409, 422, etc.).

---

## 11. Error Codes Requirements

Backend must use the following codes in `error.code`:

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Not authenticated or invalid credentials. |
| `INVALID_TOKEN` | 401 | Access or refresh token invalid/expired. |
| `ACTIVE_SESSION_ALREADY_EXISTS` | 409 | User already has an active work session. |
| `NO_ACTIVE_SESSION` | 404 | No active session for end or for given sessionId. |
| `NOT_FOUND` | 404 | Resource not found (client, delivery, product, session, etc.). |
| `VALIDATION_ERROR` | 422 | Request body/query validation failed; `details` may list field errors. |

---

## 12. Pagination Standard

- **Query parameters:** `page` (1-based), `limit` (default 20, max e.g. 100).  
- **Response shape:**

```json
{
  "success": true,
  "data": {
    "results": [ ... ],
    "page": 1,
    "limit": 20,
    "total": 99
  }
}
```

- Frontend may send `page` and `limit` on list endpoints (clients, deliveries, payments, products, work-sessions/history). Backend must return `results`, `page`, `limit`, and `total` for list endpoints that support pagination.

---

## 13. Required Headers

| Header / behavior | When | Value |
|------------------|------|--------|
| **Credentials** | All requests to the API (login, refresh, logout, me, and all protected routes) | Send cookies: use `credentials: 'include'` (fetch) or `withCredentials: true` (axios). **Do not** send `Authorization: Bearer`; auth uses HttpOnly cookies. |
| `Content-Type` | Request with body | `application/json` |

Responses: `Content-Type: application/json`.

---

## 14. Environment Configuration Requirements

Backend must support at least these environment variables (e.g. in `.env`):

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (e.g. 3000). |
| `MONGODB_URI` | MongoDB connection string (or equivalent if using another DB). |
| `JWT_SECRET` | Secret for signing access tokens. |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (if separate). |

Optional: `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `NODE_ENV`, `API_BASE_PATH` (e.g. `/api/v1`).

---

## 15. Data Persistence Requirements

| Entity | Requirement |
|--------|-------------|
| Work sessions | Must persist; one active per user; history queryable. |
| Clients | Must persist; scoped to user/tenant. |
| Payments | Must persist; scoped to user/tenant. |
| Deliveries | Must persist; scoped to user/tenant. |
| Products | Must persist; scoped to user/tenant. |
| Planning events | Must persist; scoped to user/tenant. |
| Circuits | Must persist; scoped to user/tenant. |

**No in-memory-only storage** for production data.

---

## 16. Performance Requirements

| Requirement | Specification |
|-------------|----------------|
| Pagination | All list endpoints that can return many items must support `page` and `limit` and return `total`. |
| Indexes | Indexes on: user/tenant id, work session user + status, client/delivery/payment/product/planning/circuit by owner and common filters (e.g. status, date). |
| Response time | List endpoints: target &lt; 500 ms under normal load. Single-resource GET: target &lt; 200 ms. |

---

## 17. Security Requirements

| Requirement | Specification |
|-------------|----------------|
| Cookie-based auth | All endpoints except login (and optionally refresh) require a valid `accessToken` cookie. Frontend must send **credentials** on every request so cookies are sent; no Bearer header. |
| Role-based access | Enforce by user role; at minimum, data must be restricted to the authenticated user (or tenant). |
| Data isolation | Clients, deliveries, payments, products, planning, circuits, work sessions must be filtered by user (or tenant) so that one user cannot read or modify another user’s data. |

---

## 18. API Base URL Configuration

- **Base URL format:** `http://<server>/api/v1` (or `https://<server>/api/v1`).  
- **Example:** `https://api.reborn.tn/api/v1` — then e.g. login is `POST https://api.reborn.tn/api/v1/auth/login`.  
- Frontend uses `EXPO_PUBLIC_API_URL` (e.g. `https://api.reborn.tn/v1`). Backend must serve under a path that matches (e.g. `/api/v1` or `/v1`). Ensure path alignment (e.g. if frontend base is `https://host/v1`, backend routes should be under `/v1`).

---

## 19. Frontend Expected Data Shapes (Exact)

These shapes are derived from Redux slices and screens. Backend responses should match so the frontend can use `data` directly or with minimal mapping.

### 19.1 Auth (authSlice)

- **After login (current backend):**  
  Response body: `{ success: true, user: { id: string, name: string, email: string } }` — **no** `token` or `refreshToken` in response (tokens are in HttpOnly cookies).  
  Stored in state: `user`, `isAuthenticated: true`. Do **not** store tokens; send **credentials** on all API requests so cookies are sent. See **FRONTEND_AUTH_MIGRATION.md**.

### 19.2 Work Session (workSessionSlice + workSessionSelectors)

- **Active session:**  
  One object with: `id`, `startTime`, `endTime` (null if active), `status` ('ACTIVE' | 'ENDED'), `totalCash`, `totalCreditCollected`, `totalCreditSales`, `totalExpenses`, `totalRevenue`, `cashPayments[]`, `creditPayments[]`, `creditSales[]`, `expenses[]`, `deliveriesCompleted[]` (each entry with id, clientId, clientName, amount or total, time).
- **History:** Array of same session shape with `status: 'ENDED'`.
- **Session for recap:** Same object; frontend uses `selectSessionForRecap(state, sessionId)` and expects `totalCash`, `totalCreditCollected`, `totalCreditSales`, `totalExpenses`, and detail arrays.

### 19.3 Clients (clientsSlice)

- **List item:**  
  `id`, `name`, `type` ('mechanic'|'car_wash'|'hardware'), `address`, `phone`, `email`, `totalOrders`, `lastVisit`, `archived`, `latitude`, `longitude`; optional `matriculeFiscale`, `ownerName`, `ownerPicture`, `shopPicture`.
- **Form (add/edit):** name, type, matriculeFiscale, ownerName, ownerPicture, shopPicture, address, phone, email.

### 19.4 Deliveries (deliveriesSlice)

- **List item:**  
  `id`, `clientId`, `clientName`, `date`, `status` ('pending'|'in_transit'|'completed'), `items` ([{ productId, qty }]), `total`.

### 19.5 Payments (paymentsSlice)

- **List item:**  
  `id`, `clientId`, `clientName`, `amount`, `date`, `method` ('cash'|'check'|'transfer'), `status` ('completed'|'pending').
- **Summary:** `totalCollected`, `pending` (numbers).

### 19.6 Products (productsSlice)

- **List item:**  
  `id`, `name`, `sku`, `category`, `price`, `unit` ('L'|'unit'|'kg'), `stock`, `picture`.

### 19.7 Categories (categoriesSlice)

- **Item:** `id`, `label`.

### 19.8 Planning (planningSlice)

- **Event:**  
  `id`, `circuitId`, `title`, `date`, `time` (optional), `status` ('scheduled'|'completed'), `stops` ([{ clientId, order, action: 'delivery'|'payment'|'task' }]).

### 19.9 Circuits (circuitsSlice)

- **Item:**  
  `id`, `name`, `region`, `clientIds[]`, `stops` ([{ clientId, order, lat, lng }]), `estimatedDuration` (number, minutes).

---

## Summary Checklist for Backend

- [ ] Auth: login, refresh, logout, me — request/response and error format.  
- [ ] Work sessions: start, end, active, history, :id — one active per user, persistence, session schema and totals.  
- [ ] Clients: GET list (pagination, filters), GET :id, POST, PUT, DELETE — client schema.  
- [ ] Deliveries: GET list, POST, PATCH :id/status — delivery schema; relation to session.  
- [ ] Payments: GET list (and summary), POST — payment schema; relation to session.  
- [ ] Products: GET list, POST, PUT :id, DELETE :id — product schema.  
- [ ] Planning: GET list, POST, PUT :id, DELETE :id — event schema.  
- [ ] Circuits: GET list, GET :id, POST, PUT :id, DELETE :id — circuit schema.  
- [ ] Global: success/error response format, error codes, pagination, headers.  
- [ ] Config: PORT, MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET.  
- [ ] Security: JWT on protected routes, data isolation per user/tenant.  
- [ ] No in-memory-only storage for production data.

This document is the single source of truth for the backend contract required by the REBORN frontend.
