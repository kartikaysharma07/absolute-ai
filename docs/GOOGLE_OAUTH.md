# Google OAuth setup and testing

Summary:
- Use `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Supabase provider config (server-side only).
- Expose `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the browser only if you need the client ID client-side; do not expose the secret.

Quick steps to enable and test locally:
1. Create OAuth client in Google Cloud Console. Add these redirect URIs:
   - `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
   - `http://localhost:3000` (or your exact dev callback if used)
2. In Supabase Dashboard → Auth → Providers → Google: paste `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. Copy `.env.example` to `.env.local` and set the values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `google_client_id` or `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`.
4. Apply SQL migration (create `profiles` and optional `oauth_accounts`) in Supabase SQL editor.
5. Start dev server and click the Sign-in button:
   ```bash
   npm install
   npm run dev
   ```
6. After sign-in, confirm the `profiles` row exists and Supabase Auth logs show success.

Security checklist:
- Never commit `SUPABASE_SERVICE_ROLE_KEY` or `GOOGLE_CLIENT_SECRET`.
- Use `NEXT_PUBLIC_` only for non-secret values.
- Enforce HTTPS in production and set cookies to `Secure`, `HttpOnly`, `SameSite=Lax` or `Strict`.
