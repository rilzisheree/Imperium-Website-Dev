---
name: Imperium project architecture
description: Key non-obvious decisions in the Imperium MHA roleplay site build
---

# Imperium Architecture Notes

## Ticket routes split
The ticket router was split into two files to avoid route conflicts when mounting under both `/api/tickets` (public) and `/api/staff/tickets` (staff):
- `artifacts/api-server/src/routes/tickets-public.ts` — POST `/`, POST `/track`
- `artifacts/api-server/src/routes/tickets-staff.ts` — all staff CRUD (has `requireStaff` applied at router level)

**Why:** A single router with `/staff/*` sub-routes caused URL-rewriting hacks in `routes/index.ts` that were fragile and hard to maintain.

## DB lib must be rebuilt before leaf typecheck
When schema changes are made in `lib/db/`, run `pnpm run typecheck:libs` before running `pnpm --filter @workspace/api-server run typecheck`. Missing exports from `@workspace/db` are always stale lib declarations, not bad imports.

## Staff auth
Session-based (express-session + connect-pg-simple). Sessions stored in Postgres `session` table (created automatically). Passwords hashed with bcryptjs (10 rounds). Default staff: `admin`/`imperium2025` (owner), `HeroMod`/`staff2025` (moderator). Change in production.

## Email
Resend via plain `fetch()` to `https://api.resend.com/emails` — no SDK. 4 HTML templates in `artifacts/api-server/src/lib/email.ts`. RESEND_FROM_EMAIL defaults to `support@imperium.gg` if env not set. All sends are fire-and-forget (errors logged, not thrown).

## Ticket codes
Format `IMP-XXXXXX` (6-digit random). Uniqueness checked with up to 10 retry attempts before insert.

## Updates router dual-mounting
The updates router handles both `/api/updates` (public GET) and `/api/staff/updates` (staff POST/PATCH). The `requireStaff` middleware is applied per-route, not at the router level, because the same router is mounted at two paths.
