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

export function isDiscordUrl(url: string): boolean {
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

export function buildDiscordEmbed(event: WebhookEventType | "test", data: Record<string, unknown>): object {
  const color = EVENT_COLORS[event] ?? 0x5865F2;
  const timestamp = new Date().toISOString();

  if (event === "test") {
    return {
      username: "Imperium",
      embeds: [{
        title: "🔔 Webhook Test",
        description: `Webhook **${String(data.webhookName ?? "Unknown")}** is connected and working correctly.`,
        color,
        fields: [
          { name: "Webhook ID", value: String(data.webhookId ?? "N/A"), inline: true },
          { name: "Event", value: "test", inline: true },
        ],
        footer: { text: "Imperium Support System" },
        timestamp,
      }],
    };
  }

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
          title: "💬 Reply Added",
          color,
          fields: [
            { name: "Ticket Code", value: String(data.ticketCode ?? "N/A"), inline: true },
            { name: "Author", value: String(data.authorName ?? "N/A"), inline: true },
            { name: "Role", value: String(data.authorRole ?? "N/A"), inline: true },
            { name: "Message", value: message.slice(0, 1024) || "N/A", inline: false },
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
            { name: "Note", value: note.slice(0, 1024) || "N/A", inline: false },
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

export type TestDeliveryResult = {
  ok: boolean;
  status: number;
  rateLimited: boolean;
  retryAfterMs: number;
  body: string;
};

export async function testDeliver(url: string, body: string, headers: Record<string, string>): Promise<TestDeliveryResult> {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(10000),
  });

  const responseBody = await response.text().catch(() => "");

  if (response.status === 429) {
    let retryAfterMs = 5000;
    try {
      const json = JSON.parse(responseBody);
      if (typeof json.retry_after === "number") retryAfterMs = Math.ceil(json.retry_after * 1000);
    } catch {
      const header = response.headers.get("Retry-After");
      if (header) retryAfterMs = Math.ceil(parseFloat(header) * 1000);
    }
    return { ok: false, status: 429, rateLimited: true, retryAfterMs, body: responseBody };
  }

  return { ok: response.ok, status: response.status, rateLimited: false, retryAfterMs: 0, body: responseBody };
}

async function deliverWithRetry(url: string, body: string, headers: Record<string, string>): Promise<void> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      logger.warn({ err, url, attempt }, "Webhook fetch error");
      return;
    }

    if (response.status !== 429) {
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        logger.warn({ url, status: response.status, detail }, "Webhook non-2xx response");
      }
      return;
    }

    if (attempt === MAX_ATTEMPTS) {
      logger.warn({ url, attempt }, "Webhook still rate limited after max attempts — giving up");
      return;
    }

    let waitMs = 3000;
    try {
      const json = await response.clone().json();
      if (typeof json.retry_after === "number") waitMs = Math.ceil(json.retry_after * 1000) + 250;
    } catch {
      const header = response.headers.get("Retry-After");
      if (header) waitMs = Math.ceil(parseFloat(header) * 1000) + 250;
    }
    waitMs = Math.max(waitMs, 1000);
    logger.warn({ url, attempt, waitMs }, "Webhook rate limited — retrying after delay");
    await new Promise((r) => setTimeout(r, waitMs));
  }
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

          await deliverWithRetry(webhook.url, body, headers);
        } catch (err) {
          logger.warn({ err, webhookId: webhook.id }, "Webhook delivery failed");
        }
      })
    );
  } catch (err) {
    logger.error({ err }, "Failed to fire webhooks");
  }
}
