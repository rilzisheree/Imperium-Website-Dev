import { Router } from "express";
import { eq, and, ilike } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  ticketsTable,
  ticketRepliesTable,
  ticketEventsTable,
  staffMembersTable,
} from "@workspace/db";
import {
  sendTicketConfirmation,
} from "../lib/email";
import { logger } from "../lib/logger";

const router = Router();

function generateTicketCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `IMP-${num}`;
}

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

// POST /api/tickets
router.post("/", async (req, res) => {
  try {
    const { type, robloxUsername, discordUsername, discordUserId, email, subject, reason, additionalInfo, agreedToTerms } = req.body;

    if (!type || !robloxUsername || !discordUsername || !discordUserId || !email || !subject || !agreedToTerms) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const validTypes = ["report-user", "appeal-ban", "appeal-character-death", "permadeath-event"];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: "Invalid ticket type" });
      return;
    }

    let ticketCode = generateTicketCode();
    for (let i = 0; i < 10; i++) {
      const existing = await db.select().from(ticketsTable).where(eq(ticketsTable.ticketCode, ticketCode)).limit(1);
      if (existing.length === 0) break;
      ticketCode = generateTicketCode();
    }

    const [ticket] = await db.insert(ticketsTable).values({
      ticketCode,
      type,
      status: "pending",
      robloxUsername,
      discordUsername,
      discordUserId,
      email,
      subject,
      reason: reason ?? null,
      additionalInfo: additionalInfo ?? null,
    }).returning();

    await db.insert(ticketEventsTable).values({
      ticketId: ticket.id,
      eventType: "created",
      description: "Ticket submitted by user",
    });

    sendTicketConfirmation({
      to: email,
      ticketCode,
      type,
      subject,
      createdAt: ticket.createdAt,
    }).catch((err) => logger.error({ err }, "Failed to send confirmation email"));

    res.status(201).json(formatTicket(ticket));
  } catch (err) {
    logger.error({ err }, "Failed to create ticket");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tickets/track
router.post("/track", async (req, res) => {
  try {
    const { ticketCode, email } = req.body;
    if (!ticketCode || !email) {
      res.status(400).json({ error: "Ticket ID and email are required" });
      return;
    }

    const [ticket] = await db
      .select()
      .from(ticketsTable)
      .where(and(
        eq(ticketsTable.ticketCode, ticketCode.trim().toUpperCase()),
        ilike(ticketsTable.email, email.trim()),
      ))
      .limit(1);

    if (!ticket) {
      res.status(404).json({ error: "Ticket not found. Check your Ticket ID and email address." });
      return;
    }

    let assignedName: string | null = null;
    if (ticket.assignedToId) {
      const [staff] = await db.select().from(staffMembersTable).where(eq(staffMembersTable.id, ticket.assignedToId)).limit(1);
      assignedName = staff?.username ?? null;
    }

    const [replies, events] = await Promise.all([
      db.select().from(ticketRepliesTable).where(eq(ticketRepliesTable.ticketId, ticket.id)).orderBy(ticketRepliesTable.createdAt),
      db.select().from(ticketEventsTable).where(eq(ticketEventsTable.ticketId, ticket.id)).orderBy(ticketEventsTable.createdAt),
    ]);

    res.json({
      ticket: formatTicket(ticket, assignedName),
      timeline: events.map((e) => ({
        id: e.id,
        ticketId: e.ticketId,
        eventType: e.eventType,
        description: e.description,
        actorName: e.actorName ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
      replies: replies.map((r) => ({
        id: r.id,
        ticketId: r.ticketId,
        authorName: r.authorName,
        authorRole: r.authorRole,
        message: r.message,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, "Failed to track ticket");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
