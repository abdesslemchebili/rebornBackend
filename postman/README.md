# Postman collection – REBORN API

## Import

1. Open Postman.
2. **Import** → **File** → choose `REBORN_API.postman_collection.json`.
3. The collection **REBORN API** appears in the sidebar.

## Base URL

- Collection variable **`baseUrl`** is set to `https://rebornbackend.onrender.com`.
- For local: edit the collection → **Variables** → set `baseUrl` to `http://localhost:3000`.

## Auth (cookie-based)

1. Run **Auth → Login** with:
   - `email`: `admin@reborn.tn`
   - `password`: `Admin123!`
   (if you used the seed script)
2. The server responds with `Set-Cookie`; Postman stores and sends these on later requests.
3. No need to set headers manually; just run any other request (e.g. **Auth → Me**, **Clients → List clients**).

## Variables (IDs)

For requests that need IDs (e.g. `{{clientId}}`, `{{productId}}`):

- After **List clients** or **List products**, copy an `id` from the response.
- Collection → **Variables** → paste into `clientId`, `productId`, `deliveryId`, etc., or set them in the request URL/path.

## Folders

| Folder          | Endpoints |
|-----------------|-----------|
| Health          | GET health |
| Auth            | Login, Refresh, Logout, Me, Register |
| Categories      | List categories |
| Users           | List, Get, Create, Update, Delete (ADMIN) |
| Clients         | List, Near, Get, Create, Update, Delete |
| Products        | List, Get, Create, Update, Stock, Deactivate, Delete |
| Deliveries      | List, By date, By client, Get, Create, Update status, Delete |
| Payments        | List, By client, By date range, Get, Create, Update, Delete |
| Circuits        | List, Get, Get clients, Create, Update, Delete |
| Planning        | List, By date, Get, Create, Update, Delete |
| Work Sessions   | Active, History, Recap, Start, End, Add expense |
