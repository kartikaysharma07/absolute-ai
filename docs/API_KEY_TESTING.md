# API Key Testing

These quick tests exercise the API key verification and dashboard endpoints locally.

Prerequisites
- Dev server running at `http://localhost:3000` (`npm run dev`).
- If testing dashboard endpoints, you must be signed in and have a Supabase access token.
- If testing external endpoint, you must have a raw API key (the unhashed value returned when creating the key).

1) Test external AI endpoint (uses `x-api-key`)

CLI (replace `<RAW_KEY>`):

```bash
node scripts/test-external-api-key.js <RAW_KEY>
# optionally: node scripts/test-external-api-key.js <RAW_KEY> http://localhost:3000
```

Or using curl:

```bash
curl -X POST http://localhost:3000/api/external/ai/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: <RAW_KEY>" \
  -d '{"prompt":"Hello from API key test"}'
```

Expected:
- HTTP 200 with JSON `{ result: ... }` when the key is valid and generation succeeds.
- HTTP 401 with `{ error: 'Invalid API key' }` or `{ error: 'Missing API key' }` when invalid/missing.

2) List API keys for your signed-in user

Get a Supabase access token from the browser console after signing in (example):

```js
// in browser console (on a page where supabaseBrowserClient is available)
(await supabaseBrowserClient.auth.getSession()).data.session.access_token
```

Then run:

```bash
node scripts/list-api-keys.js <ACCESS_TOKEN>
```

Or curl:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:3000/api/dashboard/api-keys
```

3) Create/revoke keys via the Dashboard UI
- Use `/dashboard` UI to create keys (or POST to `/api/dashboard/api-keys` with Bearer token).

Notes
- If `generateAIResponse` depends on external service keys (Gemini), external endpoint may return 500 if those keys are not configured.
- For local testing of API key verification only (without AI generation), you may temporarily modify `scripts/test-external-api-key.js` to call a small test route that only verifies the key.
