import crypto from "crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { webhooksTable } from "@workspace/db";
import { requireStaff, requireOwner } from "../middlewares/auth";
import { logger } from "../lib/logger";
import {
  ALL_WEBHOOK_EVENTS,
  isDiscordUrl,
  buildDiscordPayload,
  testDeliver,
  testDeliverViaBot,
} from "../lib/webhooks";

const router = Router();
router.use(requireStaff);

function formatWebhook(w: typeof webhooksTable.$inferSelect) {
  return {
    id: w.id,
    name: w.name,
    url: w.url ?? null,
    discordChannelId: w.discordChannelId ?? null,
    events: w.events ?? [],
    secret: w.secret ? "••••••••" : null,
    active: w.active,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

// GET /api/staff/webhooks
router.get("/", async (_req, res) => {
  try {
    const webhooks = await db.select().from(webhooksTable).orderBy(webhooksTable.createdAt);
    res.json(webhooks.map(formatWebhook));
  } catch (err) {
    logger.error({ err }, "Failed to list webhooks");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/staff/webhooks — owner only
router.post("/", requireOwner, async (req, res) => {
  try {
    const { name, url, discordChannelId, events, secret } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const trimmedUrl = url?.trim() || null;
    const trimmedChannelId = discordChannelId?.trim() || null;

    if (!trimmedUrl && !trimmedChannelId) {
      res.status(400).json({ error: "Either a Webhook URL or a Discord Channel ID is required" });
      return;
    }

    if (trimmedUrl) {
      try { new URL(trimmedUrl); } catch {
        res.status(400).json({ error: "Invalid URL" });
        return;
      }
    }

    const validEvents = ALL_WEBHOOK_EVENTS as string[];
    const parsedEvents: string[] = Array.isArray(events)
      ? events.filter((e: string) => validEvents.includes(e))
      : [];

    if (parsedEvents.length === 0) {
      res.status(400).json({ error: "At least one valid event is required" });
      return;
    }

    const [webhook] = await db.insert(webhooksTable).values({
      name: name.trim(),
      url: trimmedUrl,
      discordChannelId: trimmedChannelId,
      events: parsedEvents,
      secret: secret?.trim() || null,
      active: true,
    }).returning();

    res.status(201).json(formatWebhook(webhook));
  } catch (err) {
    logger.error({ err }, "Failed to create webhook");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/staff/webhooks/:id — owner only
router.patch("/:id", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [existing] = await db.select().from(webhooksTable).where(eq(webhooksTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Webhook not found" }); return; }

    const { name, url, discordChannelId, events, secret, active } = req.body;
    const validEvents = ALL_WEBHOOK_EVENTS as string[];
    const update: Partial<typeof webhooksTable.$inferInsert> = { updatedAt: new Date() };

    if (name !== undefined) update.name = name.trim();
    if (url !== undefined) {
      if (url) {
        try { new URL(url); } catch { res.status(400).json({ error: "Invalid URL" }); return; }
        update.url = url.trim();
      } else {
        update.url = null;
      }
    }
    if (discordChannelId !== undefined) update.discordChannelId = discordChannelId?.trim() || null;
    if (events !== undefined) {
      update.events = Array.isArray(events) ? events.filter((e: string) => validEvents.includes(e)) : existing.events;
    }
    if (secret !== undefined) update.secret = secret?.trim() || null;
    if (active !== undefined) update.active = Boolean(active);

    const [updated] = await db.update(webhooksTable).set(update).where(eq(webhooksTable.id, id)).returning();
    res.json(formatWebhook(updated));
  } catch (err) {
    logger.error({ err }, "Failed to update webhook");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/staff/webhooks/:id — owner only
router.delete("/:id", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [existing] = await db.select().from(webhooksTable).where(eq(webhooksTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Webhook not found" }); return; }

    await db.delete(webhooksTable).where(eq(webhooksTable.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete webhook");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/staff/webhooks/:id/test
router.post("/:id/test", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [webhook] = await db.select().from(webhooksTable).where(eq(webhooksTable.id, id)).limit(1);
    if (!webhook) { res.status(404).json({ error: "Webhook not found" }); return; }

    const testData = { webhookId: webhook.id, webhookName: webhook.name };

    // Bot delivery via channel ID
    if (webhook.discordChannelId) {
      try {
        const result = await testDeliverViaBot(webhook.discordChannelId, webhook.id, webhook.name);
        res.json({
          success: result.ok,
          status: result.status,
          rateLimited: result.rateLimited,
          retryAfterMs: result.retryAfterMs,
          detail: result.ok ? undefined : result.body,
        });
      } catch (err: any) {
        res.status(200).json({ success: false, status: 0, rateLimited: false, retryAfterMs: 0, error: err?.message ?? "Bot delivery failed" });
      }
      return;
    }

    // Webhook URL delivery
    if (webhook.url) {
      const discord = isDiscordUrl(webhook.url);
      const body = discord
        ? JSON.stringify(buildDiscordPayload("test", testData))
        : JSON.stringify({ event: "test", timestamp: new Date().toISOString(), data: testData });

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (webhook.secret && !discord) {
        const sig = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
        headers["X-Webhook-Signature"] = `sha256=${sig}`;
      }

      try {
        const result = await testDeliver(webhook.url, body, headers);
        res.json({
          success: result.ok,
          status: result.status,
          rateLimited: result.rateLimited,
          retryAfterMs: result.retryAfterMs,
          detail: result.ok ? undefined : result.body,
        });
      } catch (err: any) {
        res.status(200).json({ success: false, status: 0, rateLimited: false, retryAfterMs: 0, error: err?.message ?? "Request timed out or failed" });
      }
      return;
    }

    res.status(400).json({ error: "Webhook has no URL or channel ID configured" });
  } catch (err: any) {
    logger.warn({ err }, "Test webhook failed");
    res.status(200).json({ success: false, status: 0, rateLimited: false, retryAfterMs: 0, error: err?.message ?? "Unexpected error" });
  }
});

export default router;
