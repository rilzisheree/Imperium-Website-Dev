import crypto from "crypto";
import { db } from "@workspace/db";
import { webhooksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export type WebhookEventType =
  | "ticket.created"
  | "ticket.status_changed"
  | "ticket.reply_added"
  | "ticket.note_added"
  | "ticket.assigned"
  | "ticket.deleted";

export const ALL_WEBHOOK_EVENTS: WebhookEventType[] = [
  "ticket.created",
  "ticket.status_changed",
  "ticket.reply_added",
  "ticket.note_added",
  "ticket.assigned",
  "ticket.deleted",
];

export async function fireWebhooks(event: WebhookEventType, data: Record<string, unknown>): Promise<void> {
  try {
    const allActive = await db.select().from(webhooksTable).where(eq(webhooksTable.active, true));
    const matching = allActive.filter((w) => w.events?.includes(event));
    if (matching.length === 0) return;

    const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data });

    await Promise.allSettled(
      matching.map(async (webhook) => {
        try {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (webhook.secret) {
            const sig = crypto.createHmac("sha256", webhook.secret).update(payload).digest("hex");
            headers["X-Webhook-Signature"] = `sha256=${sig}`;
          }
          const res = await fetch(webhook.url, {
            method: "POST",
            headers,
            body: payload,
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) {
            logger.warn({ webhookId: webhook.id, status: res.status }, "Webhook returned non-2xx");
          }
        } catch (err) {
          logger.warn({ err, webhookId: webhook.id, url: webhook.url }, "Webhook delivery failed");
        }
      })
    );
  } catch (err) {
    logger.error({ err }, "Failed to fire webhooks");
  }
}
