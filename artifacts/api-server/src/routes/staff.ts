import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, desc, sql, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { staffMembersTable, ticketsTable } from "@workspace/db";
import { requireStaff } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// POST /api/staff/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const [staff] = await db
      .select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.username, username.trim()))
      .limit(1);

    if (!staff) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, staff.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const session = (req as any).session;
    session.staffId = staff.id;
    session.staffUsername = staff.username;
    session.staffRole = staff.role;

    res.json({
      id: staff.id,
      username: staff.username,
      role: staff.role,
      createdAt: staff.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Login failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/staff/auth/logout
router.post("/auth/logout", (req, res) => {
  (req as any).session?.destroy();
  res.json({ message: "Logged out" });
});

// GET /api/staff/auth/me
router.get("/auth/me", async (req, res) => {
  const session = (req as any).session;
  if (!session?.staffId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [staff] = await db
      .select()
      .from(staffMembersTable)
      .where(eq(staffMembersTable.id, session.staffId))
      .limit(1);

    if (!staff) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.json({
      id: staff.id,
      username: staff.username,
      role: staff.role,
      createdAt: staff.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to get me");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/staff/members
router.get("/members", requireStaff, async (req, res) => {
  try {
    const members = await db.select().from(staffMembersTable).orderBy(staffMembersTable.createdAt);
    res.json(members.map((m) => ({
      id: m.id,
      username: m.username,
      role: m.role,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "Failed to list members");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/staff/dashboard
router.get("/dashboard", requireStaff, async (req, res) => {
  try {
    const [
      openResult,
      pendingResult,
      closedTodayResult,
      totalResult,
      recentTickets,
      byType,
      byStatus,
    ] = await Promise.all([
      db.select({ count: count() }).from(ticketsTable).where(sql`status NOT IN ('closed','resolved','accepted','denied')`),
      db.select({ count: count() }).from(ticketsTable).where(eq(ticketsTable.status, "pending")),
      db.select({ count: count() }).from(ticketsTable).where(sql`status IN ('closed','resolved') AND updated_at::date = CURRENT_DATE`),
      db.select({ count: count() }).from(ticketsTable),
      db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt)).limit(5),
      db.select({
        label: ticketsTable.type,
        count: count(),
      }).from(ticketsTable).groupBy(ticketsTable.type),
      db.select({
        label: ticketsTable.status,
        count: count(),
      }).from(ticketsTable).groupBy(ticketsTable.status),
    ]);

    const formatTicket = (t: typeof ticketsTable.$inferSelect) => ({
      id: t.id,
      ticketCode: t.ticketCode,
      type: t.type,
      status: t.status,
      robloxUsername: t.robloxUsername,
      discordUsername: t.discordUsername,
      email: t.email,
      subject: t.subject,
      reason: t.reason ?? null,
      additionalInfo: t.additionalInfo ?? null,
      assignedToId: t.assignedToId ?? null,
      assignedToName: null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    });

    res.json({
      openTickets: openResult[0]?.count ?? 0,
      pendingTickets: pendingResult[0]?.count ?? 0,
      closedToday: closedTodayResult[0]?.count ?? 0,
      totalTickets: totalResult[0]?.count ?? 0,
      recentTickets: recentTickets.map(formatTicket),
      ticketsByType: byType.map((r) => ({
        label: r.label.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        count: r.count,
      })),
      ticketsByStatus: byStatus.map((r) => ({
        label: r.label.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        count: r.count,
      })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
