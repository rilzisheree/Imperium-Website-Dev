import { Router } from "express";
import { eq, and, ilike, desc, count, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  ticketsTable,
  ticketRepliesTable,
  ticketNotesTable,
  ticketEventsTable,
  staffMembersTable,
} from "@workspace/db";
import { requireStaff } from "../middlewares/auth";
import {
  sendTicketStatusUpdate,
  sendStaffReplyNotification,
  sendTicketClosedNotification,
} from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();
router.use(requireStaff);

function formatTicket(t: typeof ticketsTable.$inferSelect, assignedName?: string | null) {
  return {
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
    assignedToName: assignedName ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

// GET /api/staff/tickets
router.get("/", async (req, res) => {
  try {
    const { status, type, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(eq(ticketsTable.status, status));
    if (type) conditions.push(eq(ticketsTable.type, type));
    if (search) {
      conditions.push(
        sql`(${ticketsTable.robloxUsername} ILIKE ${'%' + search + '%'} OR ${ticketsTable.ticketCode} ILIKE ${'%' + search + '%'} OR ${ticketsTable.subject} ILIKE ${'%' + search + '%'})`
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [tickets, totalResult] = await Promise.all([
      db.select().from(ticketsTable).where(where).orderBy(desc(ticketsTable.createdAt)).limit(limitNum).offset(offset),
      db.select({ count: count() }).from(ticketsTable).where(where),
    ]);

    const staffIds = [...new Set(tickets.map((t) => t.assignedToId).filter(Boolean))] as number[];
    const staffMap: Record<number, string> = {};
    if (staffIds.length > 0) {
      const staffMembers = await db.select().from(staffMembersTable).where(sql`id = ANY(ARRAY[${sql.join(staffIds.map(id => sql`${id}`), sql`, `)}])`);
      for (const s of staffMembers) staffMap[s.id] = s.username;
    }

    const total = totalResult[0]?.count ?? 0;

    res.json({
      tickets: tickets.map((t) => formatTicket(t, t.assignedToId ? staffMap[t.assignedToId] : null)),
      total,
      page: pageNum,
      totalPages: Math.ceil(Number(total) / limitNum),
    });
  } catch (err) {
    logger.error({ err }, "Failed to list tickets");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/staff/tickets/:ticketId
router.get("/:ticketId", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    if (isNaN(ticketId)) { res.status(400).json({ error: "Invalid ticket ID" }); return; }

    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId)).limit(1);
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    let assignedName: string | null = null;
    if (ticket.assignedToId) {
      const [staff] = await db.select().from(staffMembersTable).where(eq(staffMembersTable.id, ticket.assignedToId)).limit(1);
      assignedName = staff?.username ?? null;
    }

    const [replies, events, notes] = await Promise.all([
      db.select().from(ticketRepliesTable).where(eq(ticketRepliesTable.ticketId, ticket.id)).orderBy(ticketRepliesTable.createdAt),
      db.select().from(ticketEventsTable).where(eq(ticketEventsTable.ticketId, ticket.id)).orderBy(ticketEventsTable.createdAt),
      db.select().from(ticketNotesTable).where(eq(ticketNotesTable.ticketId, ticket.id)).orderBy(ticketNotesTable.createdAt),
    ]);

    res.json({
      ticket: formatTicket(ticket, assignedName),
      timeline: events.map((e) => ({
        id: e.id, ticketId: e.ticketId, eventType: e.eventType,
        description: e.description, actorName: e.actorName ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
      replies: replies.map((r) => ({
        id: r.id, ticketId: r.ticketId, authorName: r.authorName,
        authorRole: r.authorRole, message: r.message, createdAt: r.createdAt.toISOString(),
      })),
      notes: notes.map((n) => ({
        id: n.id, ticketId: n.ticketId, authorName: n.authorName,
        note: n.note, createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to get ticket"); res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/staff/tickets/:ticketId/status
router.patch("/:ticketId/status", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { status } = req.body;
    const session = (req as any).session;

    const validStatuses = ["pending", "awaiting-user", "under-investigation", "accepted", "denied", "resolved", "closed"];
    if (!validStatuses.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }

    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId)).limit(1);
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    const [updated] = await db.update(ticketsTable).set({ status, updatedAt: new Date() }).where(eq(ticketsTable.id, ticketId)).returning();

    await db.insert(ticketEventsTable).values({
      ticketId,
      eventType: "status_changed",
      description: `Status changed to "${status.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}"`,
      actorName: session?.staffUsername ?? "Staff",
    });

    const closedStatuses = ["closed", "resolved", "accepted", "denied"];
    if (closedStatuses.includes(status)) {
      sendTicketClosedNotification({ to: ticket.email, ticketCode: ticket.ticketCode, subject: ticket.subject, resolution: status }).catch(() => {});
    } else {
      sendTicketStatusUpdate({ to: ticket.email, ticketCode: ticket.ticketCode, subject: ticket.subject, newStatus: status, staffName: session?.staffUsername }).catch(() => {});
    }

    res.json(formatTicket(updated));
  } catch (err) {
    logger.error({ err }, "Failed to update status"); res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/staff/tickets/:ticketId/assign
router.patch("/:ticketId/assign", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { staffId } = req.body;
    const session = (req as any).session;

    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId)).limit(1);
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    let assignedName: string | null = null;
    if (staffId) {
      const [staff] = await db.select().from(staffMembersTable).where(eq(staffMembersTable.id, staffId)).limit(1);
      if (!staff) { res.status(404).json({ error: "Staff member not found" }); return; }
      assignedName = staff.username;
    }

    const [updated] = await db.update(ticketsTable).set({ assignedToId: staffId ?? null, updatedAt: new Date() }).where(eq(ticketsTable.id, ticketId)).returning();

    await db.insert(ticketEventsTable).values({
      ticketId,
      eventType: "assigned",
      description: staffId ? `Assigned to ${assignedName}` : "Unassigned",
      actorName: session?.staffUsername ?? "Staff",
    });

    res.json(formatTicket(updated, assignedName));
  } catch (err) {
    logger.error({ err }, "Failed to assign ticket"); res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/staff/tickets/:ticketId/replies
router.post("/:ticketId/replies", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { message } = req.body;
    const session = (req as any).session;

    if (!message?.trim()) { res.status(400).json({ error: "Message is required" }); return; }

    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId)).limit(1);
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    const [staff] = await db.select().from(staffMembersTable).where(eq(staffMembersTable.id, session.staffId)).limit(1);
    const authorName = staff?.username ?? "Staff";
    const authorRole = staff?.role ?? "staff";

    const [reply] = await db.insert(ticketRepliesTable).values({
      ticketId, staffId: session.staffId, authorName, authorRole, message: message.trim(),
    }).returning();

    await db.insert(ticketEventsTable).values({
      ticketId, eventType: "replied", description: `Staff reply from ${authorName}`, actorName: authorName,
    });

    if (ticket.status === "pending") {
      await db.update(ticketsTable).set({ status: "awaiting-user", updatedAt: new Date() }).where(eq(ticketsTable.id, ticketId));
    } else {
      await db.update(ticketsTable).set({ updatedAt: new Date() }).where(eq(ticketsTable.id, ticketId));
    }

    sendStaffReplyNotification({ to: ticket.email, ticketCode: ticket.ticketCode, subject: ticket.subject, staffName: authorName, staffRole: authorRole, message: message.trim() }).catch(() => {});

    res.status(201).json({ id: reply.id, ticketId: reply.ticketId, authorName: reply.authorName, authorRole: reply.authorRole, message: reply.message, createdAt: reply.createdAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "Failed to add reply"); res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/staff/tickets/:ticketId/notes
router.post("/:ticketId/notes", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { note } = req.body;
    const session = (req as any).session;

    if (!note?.trim()) { res.status(400).json({ error: "Note is required" }); return; }

    const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId)).limit(1);
    if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }

    const [staff] = await db.select().from(staffMembersTable).where(eq(staffMembersTable.id, session.staffId)).limit(1);
    const authorName = staff?.username ?? "Staff";

    const [inserted] = await db.insert(ticketNotesTable).values({
      ticketId, staffId: session.staffId, authorName, note: note.trim(),
    }).returning();

    await db.insert(ticketEventsTable).values({
      ticketId, eventType: "note_added", description: `Internal note added by ${authorName}`, actorName: authorName,
    });

    res.status(201).json({ id: inserted.id, ticketId: inserted.ticketId, authorName: inserted.authorName, note: inserted.note, createdAt: inserted.createdAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "Failed to add note"); res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
