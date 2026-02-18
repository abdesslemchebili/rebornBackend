# Supabase Storage for uploads

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`, the **POST /api/v1/upload** endpoint stores files in **Supabase Storage** instead of local disk. The response still returns `{ "success": true, "data": { "url": "https://..." } }` with the public file URL.

## 1. Get your keys (never commit them)

- **Project URL:** Supabase Dashboard → Project Settings → API → Project URL  
  Example: `https://fprmsksbncaxjvmqxwja.supabase.co`

- **Service role key:** Project Settings → API → **service_role** (secret)  
  Use this for server-side uploads. **Do not** use the anon key in backend code for uploads unless you configure Storage policies.

## 2. Create a Storage bucket

1. In Supabase: **Storage** → **New bucket**.
2. Name it `uploads` (or set `SUPABASE_STORAGE_BUCKET` in `.env` to your bucket name).
3. Make the bucket **Public** so the returned URLs work for images (or use signed URLs if you prefer).

## 3. Set environment variables

In your `.env` (and on Render: Environment):

```env
SUPABASE_URL=https://fprmsksbncaxjvmqxwja.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_STORAGE_BUCKET=uploads
```

Use the **service_role** key from the API settings, not the anon/publishable key.

## 4. Security reminder

You shared credentials in chat. You should:

- Put **only** in `.env` / Render env (never in code or git).
- In Supabase: **Database** → reset the database password if the connection string was exposed.
- In Supabase: **Project Settings → API** → rotate the service_role key if you pasted it anywhere.

The **direct connection string** (PostgreSQL) is not used by the upload feature; it’s only for connecting a database client to Supabase Postgres if you use it.
