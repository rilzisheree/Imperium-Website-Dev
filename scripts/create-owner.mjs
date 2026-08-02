/**
 * Create an owner staff account.
 *
 * Usage:
 *   DATABASE_URL="your-connection-string" node scripts/create-owner.mjs
 *
 * Or in the Railway shell (DATABASE_URL is already set):
 *   node scripts/create-owner.mjs
 *
 * Edit USERNAME and PASSWORD below before running.
 */

import pg from "pg";
import bcrypt from "bcryptjs";

// ── configure these ────────────────────────────────────────────────────────────
const USERNAME = "kirata";
const PASSWORD = "imjoo4422";
// ──────────────────────────────────────────────────────────────────────────────

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set.");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Ensure the table exists
await client.query(`
  CREATE TABLE IF NOT EXISTS staff_members (
    id              SERIAL PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'moderator',
    active_session_id TEXT,
    locked_ip       TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
  )
`);

const hash = bcrypt.hashSync(PASSWORD, 10);

await client.query(
  `INSERT INTO staff_members (username, password_hash, role)
   VALUES ($1, $2, 'owner')
   ON CONFLICT (username)
   DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'owner'`,
  [USERNAME, hash],
);

console.log(`✅  Owner account "${USERNAME}" created (or updated).`);
await client.end();
