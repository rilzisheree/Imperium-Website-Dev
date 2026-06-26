import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, desc, sql, count } from "drizzle-orm";
import { db } from "@workspace/db";
import { staffMembersTable, ticketsTable, loginEventsTable } from "@workspace/db";
import { requireStaff, requireOwner } from "../middlewares/auth";
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
      // Log failed attempt
      await db.insert(loginEventsTable).values({
        staffId: staff.id,
        eventType: "failed_login",
        ipAddress: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
        note: "Invalid password",
      });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const session = (req as any).session;

    // Single session enforcement: if someone else is logged in, notify and kick them out
    if (staff.activeSessionId && staff.activeSessionId !== session.id) {
      // Log the session conflict
      await db.insert(loginEventsTable).values({
        staffId: staff.id,
        eventType: "session_conflict",
        ipAddress: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
        note: `New login displaced session ${staff.activeSessionId}`,
      });
    }

    // Store session ID on staff record
    await db.update(staffMembersTable)
      .set({ activeSessionId: session.id })
      .where(eq(staffMembersTable.id, staff.id));

    session.staffId = staff.id;
    session.staffUsername = staff.username;
    session.staffRole = staff.role;

    // Explicitly save session to the PostgreSQL store before responding,
    // so the next request (useGetStaffMe) always finds it in the DB.
    await new Promise<void>((resolve, reject) => {
      session.save((err: unknown) => (err ? reject(err) : resolve()));
    });

    // Log successful login
    await db.insert(loginEventsTable).values({
      staffId: staff.id,
      eventType: "login",
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      sessionId: session.id,
    });

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
router.post("/auth/logout", async (req, res) => {
  const session = (req as any).session;
  if (session?.staffId) {
    try {
      await db.update(staffMembersTable)
        .set({ activeSessionId: null })
        .where(eq(staffMembersTable.id, session.staffId));
      await db.insert(loginEventsTable).values({
        staffId: session.staffId,
        eventType: "logout",
        sessionId: session.id,
      });
    } catch (_) {}
  }
  session?.destroy(() => {});
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

    // Check if this session was displaced by a new login
    if (staff.activeSessionId && staff.activeSessionId !== session.id) {
      session.destroy(() => {});
      res.status(401).json({ error: "Session expired — another device signed in to this account." });
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
      isOnline: !!m.activeSessionId,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    logger.error({ err }, "Failed to list members");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/staff/members — owner only: create staff account
router.post("/members", requireOwner, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username?.trim() || !password?.trim()) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const validRoles = ["owner", "developer", "head-administrator", "administrator", "moderator", "support-team"];
    const assignedRole = validRoles.includes(role) ? role : "moderator";

    const passwordHash = await bcrypt.hash(password, 10);
    const [member] = await db.insert(staffMembersTable).values({
      username: username.trim(),
      passwordHash,
      role: assignedRole,
    }).returning();

    const session = (req as any).session;
    await db.insert(loginEventsTable).values({
      staffId: member.id,
      eventType: "account_created",
      note: `Created by ${session.staffUsername}`,
    });

    res.status(201).json({
      id: member.id,
      username: member.username,
      role: member.role,
      isOnline: false,
      createdAt: member.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Username already exists" });
      return;
    }
    logger.error({ err }, "Failed to create staff member");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/staff/members/:id — owner only
router.delete("/members/:memberId", requireOwner, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId as string);
    const session = (req as any).session;

    if (memberId === session.staffId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    const [member] = await db.select().from(staffMembersTable).where(eq(staffMembersTable.id, memberId)).limit(1);
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }

    await db.delete(staffMembersTable).where(eq(staffMembersTable.id, memberId));
    res.json({ message: "Member deleted" });
  } catch (err) {
    logger.error({ err }, "Failed to delete member");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/staff/members/:id/password — owner only
router.patch("/members/:memberId/password", requireOwner, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId as string);
    const { password } = req.body;
    if (!password?.trim()) { res.status(400).json({ error: "Password is required" }); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(staffMembersTable).set({ passwordHash, activeSessionId: null }).where(eq(staffMembersTable.id, memberId));
    res.json({ message: "Password updated" });
  } catch (err) {
    logger.error({ err }, "Failed to update password");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/staff/login-logs — owner only
router.get("/login-logs", requireOwner, async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limit = 50;
    const offset = (pageNum - 1) * limit;

    const [logs, totalResult] = await Promise.all([
      db.select({
        id: loginEventsTable.id,
        staffId: loginEventsTable.staffId,
        username: staffMembersTable.username,
        eventType: loginEventsTable.eventType,
        ipAddress: loginEventsTable.ipAddress,
        userAgent: loginEventsTable.userAgent,
        note: loginEventsTable.note,
        createdAt: loginEventsTable.createdAt,
      })
      .from(loginEventsTable)
      .leftJoin(staffMembersTable, eq(loginEventsTable.staffId, staffMembersTable.id))
      .orderBy(desc(loginEventsTable.createdAt))
      .limit(limit)
      .offset(offset),
      db.select({ count: count() }).from(loginEventsTable),
    ]);

    const total = totalResult[0]?.count ?? 0;

    res.json({
      logs: logs.map((l) => ({
        id: l.id,
        staffId: l.staffId,
        username: l.username ?? "Deleted User",
        eventType: l.eventType,
        ipAddress: l.ipAddress ?? null,
        userAgent: l.userAgent ?? null,
        note: l.note ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    logger.error({ err }, "Failed to get login logs");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/staff/dashboard
router.get("/dashboard", requireStaff, async (req, res) => {
  try {
    const [
      openResult, pendingResult, closedTodayResult, totalResult,
      recentTickets, byType, byStatus,
    ] = await Promise.all([
      db.select({ count: count() }).from(ticketsTable).where(sql`status NOT IN ('closed','resolved','accepted','denied')`),
      db.select({ count: count() }).from(ticketsTable).where(eq(ticketsTable.status, "pending")),
      db.select({ count: count() }).from(ticketsTable).where(sql`status IN ('closed','resolved') AND updated_at::date = CURRENT_DATE`),
      db.select({ count: count() }).from(ticketsTable),
      db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt)).limit(5),
      db.select({ label: ticketsTable.type, count: count() }).from(ticketsTable).groupBy(ticketsTable.type),
      db.select({ label: ticketsTable.status, count: count() }).from(ticketsTable).groupBy(ticketsTable.status),
    ]);

    const fmt = (t: typeof ticketsTable.$inferSelect) => ({
      id: t.id, ticketCode: t.ticketCode, type: t.type, status: t.status,
      robloxUsername: t.robloxUsername, discordUsername: t.discordUsername,
      email: t.email, subject: t.subject, reason: t.reason ?? null,
      additionalInfo: t.additionalInfo ?? null, assignedToId: t.assignedToId ?? null,
      assignedToName: null, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
    });

    res.json({
      openTickets: openResult[0]?.count ?? 0,
      pendingTickets: pendingResult[0]?.count ?? 0,
      closedToday: closedTodayResult[0]?.count ?? 0,
      totalTickets: totalResult[0]?.count ?? 0,
      recentTickets: recentTickets.map(fmt),
      ticketsByType: byType.map((r) => ({ label: r.label.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), count: r.count })),
      ticketsByStatus: byStatus.map((r) => ({ label: r.label.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), count: r.count })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
