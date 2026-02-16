# JWT Token Scripts – Development & Testing

CLI tools to generate and verify JWT access and refresh tokens using your `.env` secrets. **Never hardcode secrets;** these scripts use `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and expiry values from `.env` only.

---

## Prerequisites

- `.env` in the project root with:
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - Optional: `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`

---

## Generate tokens

### Default (test user)

```bash
npm run generate-token
```

Or:

```bash
node scripts/generate-token.js
```

Uses default payload: `id: "test-user-id"`, `email: "test@reborn.com"`, `role: "agent"`, `type: "access"`.

### With custom user (optional CLI args)

```bash
node scripts/generate-token.js --id=123 --role=admin
node scripts/generate-token.js --id=507f1f77bcf86cd799439011 --email=dev@reborn.com --role=COMMERCIAL
```

- `--id=<value>` – user id (and `userId` in payload)
- `--email=<value>` – email
- `--role=<value>` – role (e.g. `admin`, `agent`, `COMMERCIAL`)

Fallback: if an option is omitted, the default test value is used.

### Example output

```
ACCESS TOKEN:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJpZCI6InRlc3QtdXNlci1pZCIsImVtYWlsIjoidGVzdEByZWJvcm4uY29tIiwicm9sZSI6ImFnZW50IiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDA5MDAwfQ.xxx

REFRESH TOKEN:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzA2MDQ4MDAwfQ.xxx
```

---

## Verify token

Verifies a token using `JWT_ACCESS_SECRET` and prints the decoded payload (or an error).

### Usage

```bash
node scripts/verify-token.js <token>
```

### Example commands

```bash
# Paste the access token from generate-token output
node scripts/verify-token.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example output (valid token)

```
Valid token.
Decoded payload: {
  "userId": "test-user-id",
  "id": "test-user-id",
  "email": "test@reborn.com",
  "role": "agent",
  "type": "access",
  "iat": 1700000000,
  "exp": 1700000900
}
```

### Example output (invalid or expired)

```
Error: Token has expired.
```

or

```
Error: Invalid token. <message>
```

---

## Security

- Secrets are read only from `.env`; never hardcoded.
- Inputs are sanitized and length-limited.
- Invalid or missing input is handled without crashing (clear errors, non-zero exit).
- For production, use real auth flows; these scripts are for **development and testing** only.
