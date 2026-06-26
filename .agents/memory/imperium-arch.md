---
name: Imperium project architecture
description: Key non-obvious decisions in the Imperium MHA roleplay site build
---

# Imperium Architecture Notes

## Startup
Two workflows needed (both must run simultaneously):
- "Start Imperium Frontend": `PORT=22990 BASE_PATH=/ pnpm --filter @workspace/imperium run dev` (webview, port 22990)
- "Start API Server": `PORT=8080 pnpm --filter @workspace/api-server run dev` (console, port 8080)
The frontend BASE_URL is set to `/` and `setBaseUrl(base)` in App.tsx prefixes all API calls. Replit's path-based routing sends `/api/*` to port 8080 and everything else to port 22990.

## Ticket routes split
The ticket router was split into two files to avoid route conflicts:
- `artifacts/api-server/src/routes/tickets-public.ts` — POST `/`, POST `/track`
- `artifacts/api-server/src/routes/tickets-staff.ts` — all staff CRUD (has `requireStaff` applied at router level)
Delete route is `DELETE /:ticketId/delete` (not `/:ticketId`) to avoid conflicts with GET /:ticketId.

**Why:** A single router with `/staff/*` sub-routes caused URL-rewriting hacks in `routes/index.ts`.

## Access code system
Tickets use an 8-char alphanumeric `access_code` column (added to DB schema). Tracking is by `{ticketCode, accessCode}`, NOT email. Generated on ticket creation in `tickets-public.ts`. Shown to user in success dialog.

## DB lib must be rebuilt before leaf typecheck
When schema changes are made in `lib/db/`, run `pnpm run typecheck:libs` before running `pnpm --filter @workspace/api-server run typecheck`.

## Staff auth
Session-based (express-session + connect-pg-simple). Requires `session` table in Postgres — created manually via psql (connect-pg-simple's auto-create reads a `table.sql` file that doesn't exist in the pnpm store path). Passwords hashed with bcryptjs (10 rounds). Owner: `vkiraowner`/`vkira4422`. Default moderator: `HeroMod` (same password). Bcryptjs in pnpm store at: `/home/runner/workspace/node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs/index.js` — use `node --input-type=commonjs` to require it.

## Email
Resend via plain `fetch()` to `https://api.resend.com/emails` — no SDK. RESEND_FROM_EMAIL defaults to `support@imperium.gg`.

## Ticket codes
Format `IMP-XXXXXX` (6-digit random). Uniqueness checked with up to 10 retry attempts.

## CSS import order
Google Fonts `@import url(...)` must be the VERY FIRST line in index.css, before `@import "tailwindcss"`. PostCSS enforces this strictly.

## Updates router dual-mounting
Updates router handles both `/api/updates` (public GET) and `/api/staff/updates` (staff POST/PATCH). `requireStaff` applied per-route, not at router level.

## Staff delete ticket
Owner/developer only. Uses `DELETE /staff/tickets/:ticketId/delete` (extra `/delete` suffix to avoid route conflicts). Implemented as a raw `fetch()` call in `DeleteTicketButton` component in `staff-ticket-detail.tsx` since it's not in the generated API client.
