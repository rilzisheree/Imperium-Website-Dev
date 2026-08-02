# Imperium

Official website for Imperium — a My Hero Academia lore roleplay Roblox game. Features a cinematic dark frontend, full ticket support system (4 types), ticket tracking, staff dashboard, news/updates, and Resend email notifications.

## Run on Replit

Two workflows must run simultaneously:

1. **Start API Server** — `PORT=8080 pnpm --filter @workspace/api-server run dev` (port 8080, console)
2. **Start Imperium Frontend** — `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/imperium run dev` (port 5173, webview)

The Replit-managed PostgreSQL database is auto-provisioned; `DATABASE_URL` is set automatically.
`SESSION_SECRET` is stored as a Replit Secret.

## Useful commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Framer Motion, Wouter, TanStack Query
- API: Express 5 + express-session + connect-pg-simple
- DB: PostgreSQL + Drizzle ORM
- Email: Resend (via fetch, 4 branded templates)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/imperium/` — React Vite frontend (routes on `/`)
- `artifacts/api-server/` — Express API (routes on `/api/*`)
- `lib/db/src/schema/` — DB schema: `staff.ts`, `tickets.ts`, `updates.ts`
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — Generated hooks + Zod schemas from Orval codegen

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → React Query hooks + Zod schemas
- Session-based auth for staff (bcryptjs passwords, PostgreSQL-backed session store)
- Email sent via Resend REST API (no SDK, pure fetch) with 4 HTML email templates
- Ticket codes format: `IMP-XXXXXX` (6-digit random, unique-checked before insert)
- Staff roles: owner, developer, head-administrator, administrator, moderator, support-team

## Product

- **Home** — cinematic hero section, feature cards, stats, lore faction showcase
- **About** — game overview and team info
- **Information** — rules, lore, rank information
- **Support** — 4 ticket types with modal forms (Report User, Appeal Ban, Appeal Character Death, Permadeath Event)
- **Track** — ticket tracking by Ticket ID + email, shows timeline + staff replies
- **Updates** — news/announcements with category filtering
- **Staff Portal** (`/staff`) — login, dashboard (stats + charts), ticket queue, ticket detail with replies, notes, status changes, and assignment

## Staff Accounts

- `imperiumowner` / `Imperium#2025!` — Owner role (auto-seeded on first API server start)
- `kirata` — Owner role (created via `scripts/create-owner.mjs`)

## Scripts

- `scripts/create-owner.mjs` — Creates/updates an owner staff account against any `DATABASE_URL`.
  Run with: `DATABASE_URL="..." node scripts/create-owner.mjs` (or in Railway shell with `DATABASE_URL` already set)

## Gotchas

- `pnpm run typecheck:libs` must be run before leaf artifact typechecks if you change a `lib/*` package
- Do NOT run `pnpm dev` at workspace root — use `restart_workflow` instead
- The old `artifacts/api-server/src/routes/tickets.ts` was replaced by `tickets-public.ts` and `tickets-staff.ts`
- Ticket public routes mount at `/api/tickets`; staff ticket routes mount at `/api/staff/tickets`
- Updates router handles both public (`/api/updates`) and staff (`/api/staff/updates`) via the same file

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
