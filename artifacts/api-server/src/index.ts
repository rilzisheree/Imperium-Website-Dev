import { execSync } from "child_process";
import path from "path";
import bcrypt from "bcryptjs";
import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { staffMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function runMigrations() {
  try {
    const workspaceRoot = path.resolve(import.meta.dirname, "../../../");
    logger.info({ workspaceRoot }, "Running DB schema push...");
    execSync("pnpm --filter @workspace/db run push --force", {
      cwd: workspaceRoot,
      stdio: "pipe",
      env: { ...process.env },
    });
    logger.info("DB schema push completed");
  } catch (err) {
    logger.error({ err }, "DB schema push failed — server will start anyway");
  }
}

async function seedOwner() {
  try {
    const existing = await db
      .select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.username, "vkiraowner"))
      .limit(1);

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash("vkira4422", 10);
      await db.insert(staffMembersTable).values({
        username: "vkiraowner",
        passwordHash,
        role: "owner",
      });
      logger.info("Seeded owner account: vkiraowner");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed owner account");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await runMigrations();
await seedOwner();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
