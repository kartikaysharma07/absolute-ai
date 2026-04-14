# Architecture & folder layout

This project uses a clean, modular structure to keep features isolated and scalable. The main pattern:

- `features/*` — feature modules split into `domain`, `application`, `infrastructure`, and `ui`.
- `src/app/*` — Next.js App Router routes and pages.
- `src/lib/*` — cross-cutting libraries and shared clients (Stripe, Supabase, OpenAI).

Quick map of created scaffolding:
- Authentication: `src/features/auth/...` and API routes under `src/app/api/auth`.
- Dashboard: `src/features/dashboard/...` and page at `src/app/dashboard/page.tsx`.
- Billing: `src/features/billing/...` and page at `src/app/billing/page.tsx`.
- AI: `src/features/ai/...` and API route `src/app/api/ai/generate`.

Next steps:
- Wire real integrations (Supabase client and server secrets, Stripe SDK, OpenAI SDK).
- Add tests for application/use-case boundaries.
- Implement guards and server-side session handling.
