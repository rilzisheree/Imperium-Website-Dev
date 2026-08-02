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
Session-based (express-session + connect-pg-simple) with `createTableIfMissing: true` — session table is auto-created on startup. Passwords hashed with bcryptjs (10 rounds). Seeded owner: `imperiumowner` / `Imperium#2025!`.

## Owner account seeding
`seedOwner()` in `artifacts/api-server/src/index.ts` reads `OWNER_USERNAME` / `OWNER_PASSWORD` env vars (defaults to `imperiumowner` / `Imperium#2025!`) and upserts on every startup. Set these env vars on Railway to control which account is the owner.

## Email
Email (Resend) has been fully removed. No email is sent on ticket creation, status changes, or staff replies.

## Ticket codes
Format `IMP-XXXXXX` (6-digit random). Uniqueness checked with up to 10 retry attempts.

## CSS import order
Google Fonts `@import url(...)` must be the VERY FIRST line in index.css, before `@import "tailwindcss"`. PostCSS enforces this strictly.

## Updates router dual-mounting
Updates router handles both `/api/updates` (public GET) and `/api/staff/updates` (staff POST/PATCH). `requireStaff` applied per-route, not at router level. Marketplace router uses the same dual-mount pattern: `/api/marketplace` (public) + `/api/staff/marketplace` (admin).

## Staff delete ticket
Owner/developer only. Uses `DELETE /staff/tickets/:ticketId/delete` (extra `/delete` suffix to avoid route conflicts). Implemented as a raw `fetch()` call in `DeleteTicketButton` component in `staff-ticket-detail.tsx` since it's not in the generated API client.

## Marketplace feature
`marketplace_listings` table: id, name, description, image_url, price (text display), location, category, status, timestamps. Status values: available/sold/reserved/unavailable. Staff management requires `requireAdmin` (head-administrator+). Public page at `/marketplace`, staff management at `/staff/marketplace`. All staff page StaffHeader navs include the Marketplace link.

## Drizzle push non-TTY issue
Running `drizzle-kit push --force` in non-TTY (CI/shell piped) mode fails when it needs to confirm constraint changes on tables that already have data. If this happens, create new tables directly with `executeSql`. Railway fresh deployments should be fine since they start with empty tables.

## Staff pages: inline StaffHeader
Each staff page (staff-tickets, staff-dashboard, staff-members, staff-logs, staff-cms, staff-webhooks, staff-ticket-detail, staff-marketplace) defines its own `StaffHeader` component inline with a hardcoded nav links array. There is no shared StaffHeader component. When adding new staff routes, update the nav array in ALL 8 staff page files.

## Frontend API calls pattern
Staff pages use direct `fetch()` with a local `apiFetch` helper for operations not in the generated orval client. Public pages use `useQuery` from `@tanstack/react-query` with the same `apiFetch` pattern. The orval-generated hooks (`useListTickets`, `useGetStaffMe`, etc.) are used where available.
