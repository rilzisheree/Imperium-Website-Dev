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

function isDiscordUrl(url: string): boolean {
  return /discord(?:app)?\.com\/api\/webhooks\//i.test(url);
}

function ticketTypeLabel(type: string): string {
  const map: Record<string, string> = {
    "report-user": "Report User",
    "appeal-ban": "Appeal Ban",
    "appeal-character-death": "Appeal Character Death",
    "permadeath-event": "Permadeath Event",
  };
  return map[type] ?? type;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    open: "Open",
    closed: "Closed",
    resolved: "Resolved",
  };
  return map[status] ?? status;
}

const EVENT_COLORS: Record<WebhookEventType | "test", number> = {
  "ticket.created": 0x5865F2,
  "ticket.status_changed": 0xFFA500,
  "ticket.reply_added": 0x57F287,
  "ticket.note_added": 0xFEE75C,
  "ticket.assigned": 0xEB459E,
  "ticket.deleted": 0xED4245,
  test: 0xFFD23F,
};

function buildDiscordEmbed(event: WebhookEventType, data: Record<string, unknown>): object {
  const color = EVENT_COLORS[event] ?? 0x5865F2;
  const timestamp = new Date().toISOString();

  switch (event) {
    case "ticket.created": {
      return {
        username: "Imperium",
        embeds: [{
          title: "🎫 New Ticket Created",
          color,
          fields: [
            { name: "Ticket Code", value: String(data.ticketCode ?? "N/A"), inline: true },
            { name: "Type", value: ticketTypeLabel(String(data.type ?? "")), inline: true },
            { name: "Status", value: statusLabel(String(data.status ?? "pending")), inline: true },
            { name: "Roblox Username", value: String(data.robloxUsername ?? "N/A"), inline: true },
            { name: "Discord Username", value: String(data.discordUsername ?? "N/A"), inline: true },
            { name: "Subject", value: String(data.subject ?? "N/A"), inline: false },
          ],
          footer: { text: "Imperium Support System" },
          timestamp,
        }],
      };
    }

    case "ticket.status_changed": {
      return {
        username: "Imperium",
        embeds: [{
          title: "🔄 Ticket Status Changed",
          color,
          fields: [
            { name: "Ticket Code", value: String(data.ticketCode ?? "N/A"), inline: true },
            { name: "Old Status", value: statusLabel(String(data.oldStatus ?? "N/A")), inline: true },
            { name: "New Status", value: statusLabel(String(data.newStatus ?? "N/A")), inline: true },
            ...(data.changedBy ? [{ name: "Changed By", value: String(data.changedBy), inline: true }] : []),
          ],
          footer: { text: "Imperium Support System" },
          timestamp,
        }],
      };
    }

    case "ticket.reply_added": {
      const message = String(data.message ?? "");
      return {
        username: "Imperium",
        embeds: [{
          title: "💬 Reply Added to Ticket",
          color,
          fields: [
            { name: "Ticket Code", value: String(data.ticketCode ?? "N/A"), inline: true },
            { name: "Author", value: String(data.authorName ?? "N/A"), inline: true },
            { name: "Role", value: String(data.authorRole ?? "N/A"), inline: true },
            { name: "Message", value: message.length > 1024 ? message.slice(0, 1021) + "..." : message || "N/A", inline: false },
          ],
          footer: { text: "Imperium Support System" },
          timestamp,
        }],
      };
    }

    case "ticket.note_added": {
      const note = String(data.note ?? "");
      return {
        username: "Imperium",
        embeds: [{
          title: "📝 Internal Note Added",
          color,
          fields: [
            { name: "Ticket Code", value: String(data.ticketCode ?? "N/A"), inline: true },
            { name: "Added By", value: String(data.addedBy ?? "N/A"), inline: true },
            { name: "Note", value: note.length > 1024 ? note.slice(0, 1021) + "..." : note || "N/A", inline: false },
          ],
          footer: { text: "Imperium Support System" },
          timestamp,
        }],
      };
    }

    case "ticket.assigned": {
      return {
        username: "Imperium",
        embeds: [{
          title: "👤 Ticket Assigned",
          color,
          fields: [
            { name: "Ticket Code", value: String(data.ticketCode ?? "N/A"), inline: true },
            { name: "Assigned To", value: String(data.assignedTo ?? "N/A"), inline: true },
            ...(data.assignedBy ? [{ name: "Assigned By", value: String(data.assignedBy), inline: true }] : []),
          ],
          footer: { text: "Imperium Support System" },
          timestamp,
        }],
      };
    }

    case "ticket.deleted": {
      return {
        username: "Imperium",
        embeds: [{
          title: "🗑️ Ticket Deleted",
          color,
          fields: [
            { name: "Ticket Code", value: String(data.ticketCode ?? "N/A"), inline: true },
            ...(data.deletedBy ? [{ name: "Deleted By", value: String(data.deletedBy), inline: true }] : []),
          ],
          footer: { text: "Imperium Support System" },
          timestamp,
        }],
      };
    }

    default: {
      return {
        username: "Imperium",
        embeds: [{
          title: `🔔 ${event}`,
          color,
          description: "```json\n" + JSON.stringify(data, null, 2).slice(0, 1900) + "\n```",
          footer: { text: "Imperium Support System" },
          timestamp,
        }],
      };
    }
  }
}

async function deliverWithRetry(url: string, body: string, headers: Record<string, string>): Promise<Response> {
  let response = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(10000),
  });

  if (response.status === 429) {
    let waitMs = 2000;
    try {
      const json = await response.clone().json();
      if (json.retry_after) waitMs = Math.min(json.retry_after * 1000, 8000);
    } catch {
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter) waitMs = Math.min(parseFloat(retryAfter) * 1000, 8000);
    }
    await new Promise((r) => setTimeout(r, waitMs));
    response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });
  }

  return response;
}

export async function fireWebhooks(event: WebhookEventType, data: Record<string, unknown>): Promise<void> {
  try {
    const allActive = await db.select().from(webhooksTable).where(eq(webhooksTable.active, true));
    const matching = allActive.filter((w) => w.events?.includes(event));
    if (matching.length === 0) return;

    await Promise.allSettled(
      matching.map(async (webhook) => {
        try {
          const discord = isDiscordUrl(webhook.url);
          const body = discord
            ? JSON.stringify(buildDiscordEmbed(event, data))
            : JSON.stringify({ event, timestamp: new Date().toISOString(), data });

          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (webhook.secret && !discord) {
            const sig = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
            headers["X-Webhook-Signature"] = `sha256=${sig}`;
          }

          const res = await deliverWithRetry(webhook.url, body, headers);
          if (!res.ok) {
            const detail = await res.text().catch(() => "");
            logger.warn({ webhookId: webhook.id, status: res.status, detail }, "Webhook returned non-2xx");
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
