# Imperium — My Hero Academia RP Website

A cinematic roleplay website for the Imperium MHA Roblox game. Includes a full ticket support system, staff dashboard, news/updates, and a staff portal.

## Stack

- **Frontend:** React + Vite + Tailwind CSS (pnpm workspace)
- **Backend:** Express (Node.js) + Drizzle ORM
- **Database:** PostgreSQL (Neon or any Postgres provider)
- **Auth:** Session-based (connect-pg-simple)
- **Email:** Resend

---

## Railway Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/imperium
git push -u origin main
```

### 2. Provision a PostgreSQL database

Use [Neon](https://neon.tech) (free tier) or Railway's built-in Postgres plugin.
Copy the **connection string** — you'll need it as `DATABASE_URL`.

### 3. Deploy the API server on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select this repository
3. Set the **Root Directory** to `artifacts/api-server`
4. Set the **Build Command** to `pnpm run build`
5. Set the **Start Command** to `node --enable-source-maps ./dist/index.mjs`
6. Add these environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon/Postgres connection string |
| `SESSION_SECRET` | A long random string (64+ chars) |
| `ALLOWED_ORIGINS` | Your frontend Railway URL (e.g. `https://imperium-web.up.railway.app`) |
| `RESEND_API_KEY` | Your Resend API key |
| `RESEND_FROM_EMAIL` | `support@yourdomain.com` |
| `NODE_ENV` | `production` |
| `PORT` | Set automatically by Railway |

### 4. Run database migrations

After the API service is deployed, open the Railway shell and run:

```bash
pnpm --filter @workspace/db run push
```

Or run it locally pointing at your production `DATABASE_URL`:

```bash
DATABASE_URL="your-neon-url" pnpm --filter @workspace/db run push
```

### 5. Create the owner staff account

Connect to your database and run:

```sql
INSERT INTO staff_members (username, password_hash, role)
VALUES ('vkiraowner', '<bcrypt-hash-of-your-password>', 'owner');
```

Generate the hash locally:
```bash
node --input-type=commonjs -e "
const b = require('bcryptjs');
console.log(b.hashSync('YOUR_PASSWORD', 10));
"
```

### 6. Deploy the frontend on Railway

1. Add a **second service** in the same Railway project
2. Set **Root Directory** to `artifacts/imperium`
3. Set **Build Command** to `pnpm run build`
4. Set **Start Command** to `npx serve dist/public -l $PORT`
5. Add these environment variables:

| Variable | Value |
|---|---|
| `BASE_PATH` | `/` |
| `NODE_ENV` | `production` |

> **Note:** The frontend calls the API via relative paths (`/api/...`). In production you'll need to either serve both from the same domain, or configure a reverse proxy / Railway's networking to route `/api` to the API service.

---

## Local Development

```bash
# Install dependencies
pnpm install

# Start both services (two terminals)
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/imperium run dev
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Copy `.env.example` to `.env` in the project root and fill in `DATABASE_URL`.

---

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list.
