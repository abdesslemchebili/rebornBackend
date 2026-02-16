# Frontend Alignment Report

**Purpose:** This document describes the **actual** backend API implementation so frontend developers can integrate correctly. All endpoints, request/response shapes, and behavior below are derived from the implemented backend code.

---

## 1. OVERVIEW

### Description

The backend is a **Node.js/Express REST API** for the REBORN mobile app (B2B field agents). It provides authentication, work sessions, clients, deliveries, payments, products, planning, circuits, and categories. All success responses use a consistent envelope; errors use a structured `error` object with `code` and `message`.

### Base URL

- **Path prefix:** `/api/v1` (configurable via `API_PREFIX`, default `/api/v1`).
- **Full base URL example:** `https://your-server.com/api/v1`

All endpoints listed in this document are relative to this base (e.g. login is `POST /api/v1/auth/login`).

### Authentication

- **Method:** JWT (JSON Web Token).
- **Access token:** Sent in the `Authorization` header as `Bearer <token>`.
- **Refresh token:** Stored by the client; sent only to `POST /api/v1/auth/refresh` (body or `x-refresh-token` header) to obtain a new access token.
- **Protected routes:** Require a valid, non-expired access token. Missing or invalid token returns `401` with `error.code` `UNAUTHORIZED` or `INVALID_TOKEN`.

---

## 2. AUTHENTICATION DETAILS

### Login

- **Endpoint:** `POST /api/v1/auth/login`
- **Body:** `{ "email": "string", "password": "string" }`
- **Success (200):** `data` contains `user`, `token`, and `refreshToken`. Use `data.token` as the access token for subsequent requests.

### Register (ADMIN only)

- **Endpoint:** `POST /api/v1/auth/register`
- **Authentication:** Required (Bearer token); caller must have role `ADMIN`.
- **Body:** `email`, `password` (min 6), optional `firstName`, `lastName`, `role` (default `COMMERCIAL`), `isActive` (default `true`).

### Token format

- **Access token:** JWT signed with `JWT_SECRET` (or `JWT_ACCESS_SECRET`). Payload includes `userId` and `exp`. Default expiry: 15 minutes.
- **Refresh token:** JWT signed with `JWT_REFRESH_SECRET`, payload includes `userId` and `type: 'refresh'`. Default expiry: 7 days.

### How the frontend must send the token

For every protected request:

```
Authorization: Bearer <accessToken>
```

Example header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh flow

- **Endpoint:** `POST /api/v1/auth/refresh`
- **Body:** `{ "refreshToken": "string" }` (or send refresh token in header `x-refresh-token`).
- **Success (200):** `data` contains `token` (new access token) and `refreshToken` (new refresh token). Store both and use the new `token` for `Authorization: Bearer ...`.

### Current user (me)

- **Endpoint:** `GET /api/v1/auth/me`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Success (200):** `data.user` = `{ id, name, email }`.

### Logout

- **Endpoint:** `POST /api/v1/auth/logout`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body (optional):** `{ "refreshToken": "string" }` or empty.
- **Success (200):** `data` is `{}`. Frontend should clear stored tokens.

---

## 3. ENDPOINTS LIST

All responses use the envelope below unless noted.

- **Success:** `{ "success": true, "data": <payload> }`
- **Error:** `{ "success": false, "error": { "code": "string", "message": "string", "details": [] } }` — `details` is optional (e.g. validation errors).

---

### Endpoint: GET /api/v1/health

**Description:** Health check; no authentication.

**Request:** None.

**Response (success):**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-02-16T12:00:00.000Z"
  }
}
```

**Authentication required:** NO

---

### Endpoint: POST /api/v1/auth/login

**Description:** Authenticate with email and password; returns user and tokens.

**Request:**
- **Headers:** `Content-Type: application/json`
- **Body:** `{ "email": "string", "password": "string" }`

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    },
    "token": "string",
    "refreshToken": "string"
  }
}
```

**Response (error, 401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

**Response (error, 422):** Validation error; `error.details` may contain field-level errors.

**Authentication required:** NO

---

### Endpoint: POST /api/v1/auth/refresh

**Description:** Issue new access and refresh tokens using a valid refresh token.

**Request:**
- **Headers:** `Content-Type: application/json`
- **Body:** `{ "refreshToken": "string" }` (or `x-refresh-token` header)

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "token": "string",
    "refreshToken": "string"
  }
}
```

**Response (error, 401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid refresh token"
  }
}
```

**Authentication required:** NO

---

### Endpoint: POST /api/v1/auth/logout

**Description:** Invalidate refresh token (optional); backend may clear server-side state.

**Request:**
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body:** Optional `{ "refreshToken": "string" }` or empty

**Response (success, 200):**
```json
{
  "success": true,
  "data": {}
}
```

**Authentication required:** YES

---

### Endpoint: GET /api/v1/auth/me

**Description:** Return the current authenticated user.

**Request:** No body. Headers: `Authorization: Bearer <accessToken>`.

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
}
```

**Response (error, 401):** `UNAUTHORIZED` or `INVALID_TOKEN`.

**Authentication required:** YES

---

### Endpoint: POST /api/v1/auth/register

**Description:** Create a new user. Only callable by an authenticated user with role `ADMIN`.

**Request:**
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body:** `email` (required), `password` (required, min 6), `firstName`, `lastName`, `role` (default `COMMERCIAL`), `isActive` (default `true`)

**Response (success, 201):** `data` is the created user object (no password).

**Response (error, 403):** Insufficient permissions. **Error (409):** User with email already exists.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: GET /api/v1/categories

**Description:** List product categories (id + label). Used for product forms.

**Request:** No body. Headers: `Authorization: Bearer <accessToken>`.

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "results": [
      { "id": "degreasing", "label": "Degreasing" },
      { "id": "oil_remover", "label": "Oil remover" },
      { "id": "engine", "label": "Engine" },
      { "id": "car_wash", "label": "Car wash" }
    ]
  }
}
```

**Authentication required:** YES

---

### Endpoint: GET /api/v1/users/me

**Description:** Get current user profile (users module). Requires authentication.

**Request:** Headers: `Authorization: Bearer <accessToken>`.

**Response (success, 200):** `data` is the user object.

**Authentication required:** YES

---

### Endpoint: GET /api/v1/users

**Description:** List users (paginated). Allowed roles: ADMIN, COMMERCIAL.

**Request:**
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query:** `page`, `limit` (per list query schema)

**Response (success, 200):** `data` contains paginated list (e.g. `items` or `results`, `page`, `limit`, `total`).

**Authentication required:** YES

---

### Endpoint: GET /api/v1/users/:id

**Description:** Get one user by id.

**Request:** Params: `id` (user id).

**Response (success, 200):** `data` is the user object.

**Authentication required:** YES

---

### Endpoint: POST /api/v1/users

**Description:** Create user. ADMIN only.

**Request:** Body per user create schema.

**Response (success, 201):** `data` is the created user.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: PATCH /api/v1/users/:id

**Description:** Update user. ADMIN only.

**Request:** Params: `id`. Body: fields to update.

**Response (success, 200):** `data` is the updated user.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: DELETE /api/v1/users/:id

**Description:** Delete user. ADMIN only.

**Request:** Params: `id`.

**Response (success, 200):** `data` e.g. `{ "message": "User deleted" }`.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: GET /api/v1/clients

**Description:** List clients (paginated, filterable). Data may be scoped by current user for non-ADMIN.

**Request:**
- **Headers:** `Authorization: Bearer <accessToken>`
- **Query:** `page`, `limit`, `sort`, `type` (mechanic | car_wash | hardware), `segment`, `circuit`, `search`, `q`, `archived`, `isActive`

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "results": [ "<Client>" ],
    "page": 1,
    "limit": 20,
    "total": 99
  }
}
```

**Authentication required:** YES

---

### Endpoint: GET /api/v1/clients/near

**Description:** Get clients near a geographic point.

**Request:**
- **Query:** `lng` (required), `lat` (required), `maxDistance` (optional, default 50)

**Response (success, 200):** `data` is array of client objects (contract shape).

**Authentication required:** YES

---

### Endpoint: GET /api/v1/clients/:id

**Description:** Get one client by id.

**Request:** Params: `id` (client id).

**Response (success, 200):** `data` is a single Client object (contract shape).

**Authentication required:** YES

---

### Endpoint: POST /api/v1/clients

**Description:** Create client. Allowed: ADMIN, COMMERCIAL.

**Request:**
- **Body:** `name` (required), `type` (mechanic | car_wash | hardware), and other client fields (address, geoLocation, segment, circuit, archived, totalOrders, lastVisit, matriculeFiscale, ownerName, ownerPicture, shopPicture, etc.)

**Response (success, 201):** `data` is the created client in contract shape.

**Authentication required:** YES

---

### Endpoint: PUT /api/v1/clients/:id | PATCH /api/v1/clients/:id

**Description:** Update client (partial update). Allowed: ADMIN, COMMERCIAL.

**Request:** Params: `id`. Body: subset of client fields.

**Response (success, 200):** `data` is the updated client in contract shape.

**Authentication required:** YES

---

### Endpoint: DELETE /api/v1/clients/:id

**Description:** Delete client. ADMIN only.

**Request:** Params: `id`.

**Response (success, 200):** `data` e.g. `{ "message": "Client deleted" }`.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: GET /api/v1/products

**Description:** List products (paginated). Optional filter by category, search, active.

**Request:**
- **Query:** `page`, `limit`, `search`, `category`, `active`

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "results": [ "<Product>" ],
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

**Authentication required:** YES

---

### Endpoint: GET /api/v1/products/:id

**Description:** Get one product by id.

**Response (success, 200):** `data` is a Product object (id, name, sku, category, price, unit, stock, picture).

**Authentication required:** YES

---

### Endpoint: POST /api/v1/products

**Description:** Create product. ADMIN only.

**Request:** Body: `name`, `sku`/`code`, `category`, `price`, `unit` (L | unit | kg), `stock`, `picture`, etc.

**Response (success, 201):** `data` is the created product in contract shape.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: PUT /api/v1/products/:id | PATCH /api/v1/products/:id

**Description:** Update product. ADMIN only.

**Response (success, 200):** `data` is the updated product.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: PATCH /api/v1/products/:id/stock

**Description:** Update product stock. ADMIN only.

**Request:** Body: `{ "quantity": number }`.

**Response (success, 200):** `data` is the updated product.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: PATCH /api/v1/products/:id/deactivate

**Description:** Deactivate product. ADMIN only.

**Response (success, 200):** `data` is the updated product.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: DELETE /api/v1/products/:id

**Description:** Delete product. ADMIN only.

**Response (success, 200):** `data` e.g. `{ "message": "Product deleted" }`.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: GET /api/v1/deliveries

**Description:** List deliveries (paginated). Optional filter by client, circuit, status, date, fromDate, toDate.

**Request:** Query: `page`, `limit`, `client`, `clientId`, `circuit`, `status` (pending | in_transit | completed), `date`, `fromDate`, `toDate`.

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "results": [ "<Delivery>" ],
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

**Authentication required:** YES

---

### Endpoint: GET /api/v1/deliveries/by-date

**Description:** Get deliveries for a specific date.

**Request:** Query: `date` (required).

**Response (success, 200):** `data` is array of Delivery objects.

**Authentication required:** YES

---

### Endpoint: GET /api/v1/deliveries/by-client/:clientId

**Description:** Get deliveries for a client.

**Request:** Params: `clientId`.

**Response (success, 200):** `data` is array of Delivery objects.

**Authentication required:** YES

---

### Endpoint: GET /api/v1/deliveries/:id

**Description:** Get one delivery by id.

**Response (success, 200):** `data` is a Delivery object (id, clientId, clientName, date, status, items, total).

**Authentication required:** YES

---

### Endpoint: POST /api/v1/deliveries

**Description:** Create delivery. Allowed: ADMIN, DELIVERY.

**Request:** Body: `client` or `clientId`, optional `clientName`, `products` or `items` (array of `{ productId, qty }` or `{ product, quantity, unitPrice }`), `plannedDate` or `date`, `status`, `circuit`, `assignedTo`, `proofPhoto`, `notes`, `paymentType` (CASH | CREDIT).

**Response (success, 201):** `data` is the created delivery in contract shape.

**Authentication required:** YES

---

### Endpoint: PATCH /api/v1/deliveries/:id

**Description:** Update delivery (non-status fields). Allowed: ADMIN, DELIVERY.

**Request:** Body: `circuit`, `assignedTo`, `plannedDate`, `proofPhoto`, `notes`, `products`.

**Response (success, 200):** `data` is the updated delivery.

**Authentication required:** YES

---

### Endpoint: PATCH /api/v1/deliveries/:id/status

**Description:** Update delivery status (e.g. in_transit, completed).

**Request:** Body: `{ "status": "pending" | "in_transit" | "completed" }`, optional `proofPhoto`, `deliveryDate`.

**Response (success, 200):** `data` is the updated delivery in contract shape.

**Authentication required:** YES

---

### Endpoint: DELETE /api/v1/deliveries/:id

**Description:** Delete delivery. ADMIN only.

**Response (success, 200):** `data` e.g. `{ "message": "Delivery deleted" }`.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: GET /api/v1/payments

**Description:** List payments (paginated) with summary (totalCollected, pending). Optional filter by client, status, fromDate, toDate.

**Request:** Query: `page`, `limit`, `client`, `status`, `fromDate`, `toDate`.

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "results": [ "<Payment>" ],
    "summary": { "totalCollected": 1000, "pending": 200 },
    "page": 1,
    "limit": 20,
    "total": 30
  }
}
```

**Authentication required:** YES

---

### Endpoint: GET /api/v1/payments/by-client/:clientId

**Description:** Get payments for a client.

**Request:** Params: `clientId`.

**Response (success, 200):** `data` is array of Payment objects.

**Authentication required:** YES

---

### Endpoint: GET /api/v1/payments/by-date-range

**Description:** Get payments in a date range.

**Request:** Query: `fromDate` (required), `toDate` (required).

**Response (success, 200):** `data` is array of Payment objects.

**Authentication required:** YES

---

### Endpoint: GET /api/v1/payments/:id

**Description:** Get one payment by id.

**Response (success, 200):** `data` is a Payment object (id, clientId, clientName, amount, date, method, status).

**Authentication required:** YES

---

### Endpoint: POST /api/v1/payments

**Description:** Create payment. Allowed: ADMIN, COMMERCIAL.

**Request:** Body: `client` or `clientId` (one required), optional `clientName`, `amount` (required), `date` or `paidAt`, `method` (cash | check | transfer), `status` (completed | pending), `delivery`, `notes`.

**Response (success, 201):** `data` is the created payment in contract shape.

**Authentication required:** YES

---

### Endpoint: PATCH /api/v1/payments/:id

**Description:** Update payment.

**Request:** Body: `delivery`, `currency`, `method`, `status`, `paidAt`, `notes`.

**Response (success, 200):** `data` is the updated payment.

**Authentication required:** YES

---

### Endpoint: DELETE /api/v1/payments/:id

**Description:** Delete payment. ADMIN only.

**Response (success, 200):** `data` e.g. `{ "message": "Payment deleted" }`.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: GET /api/v1/circuits

**Description:** List circuits (paginated). Optional filter by search, zone, isActive.

**Request:** Query: `page`, `limit`, `search`, `zone`, `isActive`.

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "results": [ "<Circuit>" ],
    "page": 1,
    "limit": 20,
    "total": 10
  }
}
```

**Authentication required:** YES

---

### Endpoint: GET /api/v1/circuits/:id/clients

**Description:** Get clients assigned to a circuit.

**Request:** Params: `id` (circuit id).

**Response (success, 200):** `data` is array of client documents (backend shape).

**Authentication required:** YES

---

### Endpoint: GET /api/v1/circuits/:id

**Description:** Get one circuit by id.

**Response (success, 200):** `data` is a Circuit object (id, name, region, clientIds, stops, estimatedDuration).

**Authentication required:** YES

---

### Endpoint: POST /api/v1/circuits

**Description:** Create circuit. Allowed: ADMIN, COMMERCIAL.

**Request:** Body: `name` (required), `code`, `zone`, `region`, `clientIds` (array), `stops` (array of `{ clientId, order, lat, lng }`), `estimatedDuration`, `assignedTo`, `description`, `isActive`.

**Response (success, 201):** `data` is the created circuit in contract shape.

**Authentication required:** YES

---

### Endpoint: PATCH /api/v1/circuits/:id

**Description:** Update circuit.

**Request:** Body: same fields as create (partial).

**Response (success, 200):** `data` is the updated circuit.

**Authentication required:** YES

---

### Endpoint: DELETE /api/v1/circuits/:id

**Description:** Delete circuit. ADMIN only.

**Response (success, 200):** `data` e.g. `{ "message": "Circuit deleted" }`.

**Authentication required:** YES (ADMIN only)

---

### Endpoint: GET /api/v1/planning

**Description:** List planning events (paginated). Optional filter by commercial, fromDate, toDate.

**Request:** Query: `page`, `limit`, `commercial`, `fromDate`, `toDate`.

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "results": [ "<PlanningEvent>" ],
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

**Authentication required:** YES

---

### Endpoint: GET /api/v1/planning/by-date

**Description:** Get planning events for a specific date.

**Request:** Query: `date` (required).

**Response (success, 200):** `data` is array of planning events in contract shape.

**Authentication required:** YES

---

### Endpoint: GET /api/v1/planning/:id

**Description:** Get one planning event by id.

**Response (success, 200):** `data` is an event object (id, circuitId, title, date, time, status, stops).

**Authentication required:** YES

---

### Endpoint: POST /api/v1/planning

**Description:** Create planning event. Allowed: ADMIN, COMMERCIAL.

**Request:** Body: `circuitId`, `title`, `date` (required), `time`, `status` (scheduled | completed), `stops` (array of `{ clientId, order, action }`), optional `commercial`, `clients`, `notes`.

**Response (success, 201):** `data` is the created event in contract shape.

**Authentication required:** YES

---

### Endpoint: PUT /api/v1/planning/:id | PATCH /api/v1/planning/:id

**Description:** Update planning event.

**Request:** Body: same fields as create (partial).

**Response (success, 200):** `data` is the updated event.

**Authentication required:** YES

---

### Endpoint: DELETE /api/v1/planning/:id

**Description:** Delete planning event. Allowed: ADMIN, COMMERCIAL, DELIVERY.

**Response (success, 200):** `data` e.g. `{ "message": "Planning deleted" }`.

**Authentication required:** YES

---

### Endpoint: GET /api/v1/work-sessions/active

**Description:** Get the current user's active work session (if any).

**Request:** Headers: `Authorization: Bearer <accessToken>`.

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "string",
      "startTime": "ISO8601",
      "endTime": null,
      "status": "ACTIVE",
      "totalCash": 0,
      "totalCreditCollected": 0,
      "totalCreditSales": 0,
      "totalExpenses": 0,
      "totalRevenue": 0,
      "cashPayments": [],
      "creditPayments": [],
      "creditSales": [],
      "expenses": [],
      "deliveriesCompleted": []
    }
  }
}
```
If no active session: `data.session` is `null`.

**Authentication required:** YES

---

### Endpoint: GET /api/v1/work-sessions/history

**Description:** Get past work sessions for the current user (paginated, most recent first).

**Request:** Query: `page`, `limit`, `fromDate`, `toDate`.

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "results": [ "<WorkSession>" ],
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

**Authentication required:** YES

---

### Endpoint: GET /api/v1/work-sessions/:id

**Description:** Get a single work session by id (for recap). Session must belong to the current user.

**Request:** Params: `id` (session id).

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "session": { "<WorkSession>" }
  }
}
```

**Response (error, 404):** `NOT_FOUND` if session does not exist or does not belong to user.

**Authentication required:** YES

---

### Endpoint: POST /api/v1/work-sessions/start

**Description:** Start a new work session for the current user. Only one active session per user; if one exists, returns 409.

**Request:**
- **Body (optional):** `{ "startTime": "ISO8601" }`

**Response (success, 201):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "string",
      "startTime": "ISO8601",
      "endTime": null,
      "status": "ACTIVE",
      "totalCash": 0,
      "totalCreditCollected": 0,
      "totalCreditSales": 0,
      "totalExpenses": 0,
      "totalRevenue": 0,
      "cashPayments": [],
      "creditPayments": [],
      "creditSales": [],
      "expenses": [],
      "deliveriesCompleted": []
    }
  }
}
```

**Response (error, 409):**
```json
{
  "success": false,
  "error": {
    "code": "ACTIVE_SESSION_ALREADY_EXISTS",
    "message": "Active session already exists"
  }
}
```

**Authentication required:** YES

---

### Endpoint: POST /api/v1/work-sessions/end

**Description:** End the active work session for the current user.

**Request:** Body: `{ "sessionId": "string (optional)", "endTime": "ISO8601 (optional)" }`. If omitted, server uses current time.

**Response (success, 200):**
```json
{
  "success": true,
  "data": {
    "endTime": "ISO8601",
    "session": { "<WorkSession with status ENDED>" }
  }
}
```

**Response (error, 404):**
```json
{
  "success": false,
  "error": {
    "code": "NO_ACTIVE_SESSION",
    "message": "No active session"
  }
}
```

**Authentication required:** YES

---

### Endpoint: POST /api/v1/work-sessions/expenses

**Description:** Add an expense to the current user's active work session.

**Request:** Body: `{ "amount": number (>= 0), "label": "string" }`.

**Response (success, 201):** `data` contains updated `session` (contract shape). If no active session, 400 with `NO_ACTIVE_SESSION`.

**Authentication required:** YES

---

## 4. DATA MODELS USED IN RESPONSES

The backend returns these shapes in `data` (or inside `data.results`, `data.session`, etc.). All IDs are strings (MongoDB ObjectId as string).

### Auth user (login, me)
```json
{
  "id": "string",
  "name": "string",
  "email": "string"
}
```

### Client
```json
{
  "id": "string",
  "name": "string",
  "type": "mechanic | car_wash | hardware",
  "address": "string | null",
  "phone": "string | null",
  "email": "string | null",
  "totalOrders": 0,
  "lastVisit": "YYYY-MM-DD | null",
  "archived": false,
  "latitude": "number | null",
  "longitude": "number | null",
  "matriculeFiscale": "string | null",
  "ownerName": "string | null",
  "ownerPicture": "string | null",
  "shopPicture": "string | null"
}
```

### Product
```json
{
  "id": "string",
  "name": "string",
  "sku": "string",
  "category": "string",
  "price": 0,
  "unit": "L | unit | kg",
  "stock": 0,
  "picture": "string"
}
```

### Delivery
```json
{
  "id": "string",
  "clientId": "string",
  "clientName": "string",
  "date": "YYYY-MM-DD",
  "status": "pending | in_transit | completed",
  "items": [ { "productId": "string", "qty": 0 } ],
  "total": 0
}
```

### Payment
```json
{
  "id": "string",
  "clientId": "string",
  "clientName": "string",
  "amount": 0,
  "date": "YYYY-MM-DD",
  "method": "cash | check | transfer",
  "status": "completed | pending"
}
```

### Circuit
```json
{
  "id": "string",
  "name": "string",
  "region": "string",
  "clientIds": [ "string" ],
  "stops": [
    { "clientId": "string", "order": 0, "lat": 0, "lng": 0 }
  ],
  "estimatedDuration": 0
}
```

### Planning event
```json
{
  "id": "string",
  "circuitId": "string",
  "title": "string",
  "date": "YYYY-MM-DD",
  "time": "string | null",
  "status": "scheduled | completed",
  "stops": [
    { "clientId": "string", "order": 0, "action": "delivery | payment | task" }
  ]
}
```

### Work session
```json
{
  "id": "string",
  "startTime": "ISO8601",
  "endTime": "ISO8601 | null",
  "status": "ACTIVE | ENDED",
  "totalCash": 0,
  "totalCreditCollected": 0,
  "totalCreditSales": 0,
  "totalExpenses": 0,
  "totalRevenue": 0,
  "cashPayments": [
    { "id": "string", "clientId": "string", "clientName": "string", "amount": 0, "time": "ISO8601" }
  ],
  "creditPayments": [ "same shape" ],
  "creditSales": [],
  "expenses": [
    { "id": "string", "label": "string", "amount": 0, "time": "ISO8601" }
  ],
  "deliveriesCompleted": [
    { "id": "string", "deliveryId": "string", "clientId": "string", "clientName": "string", "total": 0, "time": "ISO8601" }
  ]
}
```

### Category
```json
{
  "id": "string",
  "label": "string"
}
```

---

## 5. FRONTEND INTEGRATION INSTRUCTIONS

### How to authenticate

1. Call `POST /api/v1/auth/login` with `{ "email", "password" }`.
2. On success, read `data.user`, `data.token`, and `data.refreshToken`.
3. Store `data.token` as the access token and `data.refreshToken` for refresh (e.g. secure storage).
4. Use **only** `data.token` in the `Authorization` header for all protected requests: `Authorization: Bearer <data.token>`.

### How to store and use the token

- **Access token:** Store in memory or secure storage. Attach to every request to protected endpoints: `Authorization: Bearer <accessToken>`.
- **Refresh token:** Store securely (e.g. secure store / keychain). Use only when the access token is expired and the backend returns 401; then call `POST /api/v1/auth/refresh` with the refresh token, get a new `token` and `refreshToken`, and retry the original request with the new access token.

### How to call protected endpoints

1. Set header: `Authorization: Bearer <accessToken>`.
2. Set `Content-Type: application/json` for requests with a body.
3. Parse response: check `success`. If `success === false`, read `error.code` and `error.message` (and optionally `error.details` for validation).

### Common integration mistakes to avoid

- **Do not** send the refresh token in `Authorization`. Use it only for `POST /api/v1/auth/refresh` (body or `x-refresh-token`).
- **Do not** assume the login response uses the key `accessToken`; the backend returns `token` (access) and `refreshToken`.
- **Do not** read error messages from a top-level `message`; errors are under `error.message` and `error.code`.
- **Do not** assume list responses use `items`; most list endpoints return `data.results` with `data.page`, `data.limit`, `data.total`.
- **Do not** use delivery status values `in_progress` or `delivered` in requests; the API accepts and returns `in_transit` and `completed` for the contract.

---

## 6. ERROR RESPONSE FORMAT

All errors return HTTP status codes (401, 404, 409, 422, etc.) and a body in this shape:

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": []
  }
}
```

- **`details`** is optional. It is present for validation errors (e.g. Joi) as an array of `{ field, message }`.
- **Common `error.code` values:**  
  `UNAUTHORIZED`, `INVALID_TOKEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `ACTIVE_SESSION_ALREADY_EXISTS`, `NO_ACTIVE_SESSION`, `CONFLICT`, `DUPLICATE_KEY`, `INVALID_ID`, `APP_ERROR`, `INTERNAL_ERROR`.

**Note:** There is no top-level `message`; the human-readable message is always `error.message`.

---

## 7. READY-TO-USE FRONTEND EXAMPLES

### Health check (no auth)
```javascript
fetch(`${API_BASE}/health`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### Login
```javascript
const res = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'secret' })
});
const data = await res.json();
if (data.success) {
  const { user, token, refreshToken } = data.data;
  // Store token, refreshToken; use token for Authorization
} else {
  console.error(data.error.code, data.error.message);
}
```

### Refresh token
```javascript
const res = await fetch(`${API_BASE}/auth/refresh`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: storedRefreshToken })
});
const data = await res.json();
if (data.success) {
  const { token, refreshToken } = data.data;
  // Update stored tokens; use new token for subsequent requests
}
```

### Get current user (protected)
```javascript
fetch(`${API_BASE}/auth/me`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => {
    if (data.success) console.log(data.data.user);
    else console.error(data.error.message);
  });
```

### List clients (protected, paginated)
```javascript
const page = 1, limit = 20;
fetch(`${API_BASE}/clients?page=${page}&limit=${limit}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const { results, total, page: p, limit: l } = data.data;
      console.log(results, total, p, l);
    }
  });
```

### Get active work session (protected)
```javascript
fetch(`${API_BASE}/work-sessions/active`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const session = data.data.session;
      if (session) console.log('Active session:', session);
      else console.log('No active session');
    }
  });
```

### Start work session (protected)
```javascript
fetch(`${API_BASE}/work-sessions/start`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ startTime: new Date().toISOString() })
})
  .then(res => res.json())
  .then(data => {
    if (data.success) console.log('Session started:', data.data.session);
    if (data.success === false && data.error.code === 'ACTIVE_SESSION_ALREADY_EXISTS')
      console.log('Already have an active session');
  });
```

### End work session (protected)
```javascript
fetch(`${API_BASE}/work-sessions/end`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ endTime: new Date().toISOString() })
})
  .then(res => res.json())
  .then(data => {
    if (data.success) console.log('Session ended:', data.data.session);
  });
```

### Create payment (protected)
```javascript
fetch(`${API_BASE}/payments`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    clientId: '...',
    amount: 100,
    date: '2025-02-16',
    method: 'cash',
    status: 'completed'
  })
})
  .then(res => res.json())
  .then(data => {
    if (data.success) console.log('Payment created:', data.data);
    else console.error(data.error.code, data.error.message, data.error.details);
  });
```

### Generic error handling
```javascript
const res = await fetch(url, options);
const data = await res.json();
if (!data.success) {
  const { code, message, details } = data.error;
  if (code === 'INVALID_TOKEN' || code === 'UNAUTHORIZED') {
    // Try refresh, then retry or redirect to login
  }
  if (code === 'VALIDATION_ERROR' && details) {
    details.forEach(({ field, message }) => console.warn(field, message));
  }
  return;
}
// use data.data
```

---

**End of report.** This document reflects the backend implementation as of the codebase analysis. Use the base URL appropriate for your environment (e.g. `process.env.EXPO_PUBLIC_API_URL` or similar).
