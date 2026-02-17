# Backend: Client API — Fields the frontend sends and expects

The app sends **all** of the fields below on **POST /api/v1/clients** (create) and **PATCH /api/v1/clients/:id** (update). To avoid 422 validation errors, the backend should **accept and persist** these fields (and return them in GET responses).

---

## POST /api/v1/clients — Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | Client name (trimmed) |
| `type` | string | **yes** | One of: `mechanic`, `car_wash`, `hardware` |
| `segment` | string | **yes** | Frontend sends `"STANDARD"` |
| `isActive` | boolean | **yes** | Frontend sends `true` |
| `shopName` | string | no | Shop / business name (often same as owner name or client name) |
| `address` | object | no | `{ city: string, governorate: string }` — both may be the same if user entered one line |
| `phone` | string | no | Phone (digits, may include leading `+`) |
| `email` | string | no | Email (lowercase) |
| `matriculeFiscale` | string | no | Fiscal ID / tax number |
| `latitude` | number | no | From map picker; exact location for “open in Maps” |
| `longitude` | number | no | From map picker |
| `ownerName` | string | no | Name of the responsible person |
| `ownerPicture` | string | no | URL of owner photo (never `file://` from app) |
| `shopPicture` | string | no | URL of shop photo (never `file://` from app) |

- **Do not** reject the request if extra fields are present; either persist them or ignore unknown ones.
- All optional fields may be omitted from the body when the user leaves them empty.

---

## PATCH /api/v1/clients/:id — Request body

Same fields as above. Partial update: only the fields sent are updated; others stay unchanged.

---

## GET /api/v1/clients and GET /api/v1/clients/:id — Response (client object)

The frontend expects the client object to include (when stored):

- `id`, `name`, `type`, `segment`, `isActive`
- `shopName`, `ownerName`
- `address` — either:
  - **object** `{ city?, governorate? }`, or
  - **string** (legacy)
- `phone`, `email`
- `matriculeFiscale`
- `latitude`, `longitude` (numbers or null) — used to open exact location in Google/Apple Maps
- `ownerPicture`, `shopPicture` (URLs or null)
- `archived`, `totalOrders`, `lastVisit` (optional)

So the backend should:

1. **Accept** on create/update: `name`, `type`, `segment`, `isActive`, `shopName`, `address`, `phone`, `email`, `matriculeFiscale`, `latitude`, `longitude`, `ownerName`, `ownerPicture`, `shopPicture`.
2. **Persist** them and return them in GET list and GET by id.
3. **Not** return 422 for unknown fields; either add these fields to the client schema or allow additional properties.

---

## Summary: what to add on the backend

- Add to the **Client model/schema** (if not already present):
  - `matriculeFiscale` (string, optional)
  - `latitude` (number, optional)
  - `longitude` (number, optional)
  - `ownerName` (string, optional)
  - `ownerPicture` (string, optional, URL)
  - `shopPicture` (string, optional, URL)
- Ensure **address** is stored as an object `{ city, governorate }` (or equivalent) when the frontend sends it.
- Ensure **validation** does not reject requests that include these fields or that send only a subset of fields on PATCH.

Once the backend accepts and returns these fields, the app will work without further frontend changes.
