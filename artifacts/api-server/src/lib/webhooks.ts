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

function safe(value: unknown, fallback = "N/A"): string {
  const str = String(value ?? "").trim();
  return str.length > 0 ? str : fallback;
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
    "awaiting-user": "Awaiting User",
    "under-investigation": "Under Investigation",
    accepted: "Accepted",
    denied: "Denied",
    closed: "Closed",
    resolved: "Resolved",
  };
  return map[status] ?? status;
}

const EVENT_COLORS: Record<WebhookEventType | "test", number> = {
  "ticket.created": 0x5865f2,
  "ticket.status_changed": 0xffa500,
  "ticket.reply_added": 0x57f287,
  "ticket.note_added": 0xfee75c,
  "ticket.assigned": 0xeb459e,
  "ticket.deleted": 0xed4245,
  test: 0xffd23f,
};

export function buildDiscordEmbed(
  event: WebhookEventType | "test",
  data: Record<string, unknown>
): object[] {
  const color = EVENT_COLORS[event] ?? 0x5865f2;
  const timestamp = new Date().toISOString();
  const footer = { text: "Imperium Support System" };

  if (event === "test") {
    return [{
      title: "🔔 Webhook Test",
      description: `Webhook **${safe(data.webhookName)}** is connected and working correctly.`,
      color,
      fields: [
        { name: "Webhook ID", value: safe(data.webhookId), inline: true },
        { name: "Event", value: "test", inline: true },
      ],
      footer,
      timestamp,
    }];
  }

  switch (event) {
    case "ticket.created": {
      const fields: { name: string; value: string; inline: boolean }[] = [
        { name: "Ticket Code", value: safe(data.ticketCode), inline: true },
        { name: "Type", value: ticketTypeLabel(safe(data.type)), inline: true },
        { name: "Status", value: statusLabel(safe(data.status, "pending")), inline: true },
        { name: "Roblox Username", value: safe(data.robloxUsername), inline: true },
        { name: "Discord Username", value: safe(data.discordUsername), inline: true },
      ];
      if (data.discordUserId) fields.push({ name: "Discord User ID", value: safe(data.discordUserId), inline: true });
      if (data.email) fields.push({ name: "Email", value: safe(data.email), inline: true });
      fields.push({ name: "Subject", value: safe(data.subject).slice(0, 1024), inline: false });
      if (data.reason) fields.push({ name: "Reason / Story", value: safe(data.reason as string).slice(0, 1024), inline: false });
      if (data.additionalInfo) fields.push({ name: "Additional Info / Evidence", value: safe(data.additionalInfo as string).slice(0, 1024), inline: false });
      return [{ title: "🎫 New Ticket Created", color, fields, footer, timestamp }];
    }

    case "ticket.status_changed": {
      const fields = [
        { name: "Ticket Code", value: safe(data.ticketCode), inline: true },
        { name: "Old Status", value: statusLabel(safe(data.oldStatus)), inline: true },
        { name: "New Status", value: statusLabel(safe(data.newStatus)), inline: true },
      ];
      if (data.changedBy) fields.push({ name: "Changed By", value: safe(data.changedBy), inline: true });
      return [{ title: "🔄 Ticket Status Changed", color, fields, footer, timestamp }];
    }

    case "ticket.reply_added":
      return [{
        title: "💬 Reply Added",
        color,
        fields: [
          { name: "Ticket Code", value: safe(data.ticketCode), inline: true },
          { name: "Author", value: safe(data.authorName), inline: true },
          { name: "Role", value: safe(data.authorRole), inline: true },
          { name: "Message", value: safe(data.message).slice(0, 1024), inline: false },
        ],
        footer,
        timestamp,
      }];

    case "ticket.note_added":
      return [{
        title: "📝 Internal Note Added",
        color,
        fields: [
          { name: "Ticket Code", value: safe(data.ticketCode), inline: true },
          { name: "Added By", value: safe(data.addedBy ?? data.authorName), inline: true },
          { name: "Note", value: safe(data.note ?? data.authorNote).slice(0, 1024), inline: false },
        ],
        footer,
        timestamp,
      }];

    case "ticket.assigned": {
      const fields = [
        { name: "Ticket Code", value: safe(data.ticketCode), inline: true },
        { name: "Assigned To", value: safe(data.assignedTo, "Unassigned"), inline: true },
      ];
      if (data.assignedBy) fields.push({ name: "Assigned By", value: safe(data.assignedBy), inline: true });
      return [{ title: "👤 Ticket Assigned", color, fields, footer, timestamp }];
    }

    case "ticket.deleted": {
      const fields: { name: string; value: string; inline: boolean }[] = [
        { name: "Ticket Code", value: safe(data.ticketCode), inline: true },
      ];
      if (data.deletedBy) fields.push({ name: "Deleted By", value: safe(data.deletedBy), inline: true });
      return [{ title: "🗑️ Ticket Deleted", color, fields, footer, timestamp }];
    }

    default:
      return [{
        title: `🔔 ${event}`,
        color,
        description: ("```json\n" + JSON.stringify(data, null, 2) + "\n```").slice(0, 2000),
        footer,
        timestamp,
      }];
  }
}

export function buildDiscordPayload(
  event: WebhookEventType | "test",
  data: Record<string, unknown>
): object {
  return { username: "Imperium", embeds: buildDiscordEmbed(event, data) };
}

async function postJson(
  url: string,
  body: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method: "POST", headers, body, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseRetryAfterMs(response: Response, responseBody: string): number {
  try {
    const json = JSON.parse(responseBody);
    if (typeof json.retry_after === "number") {
      return Math.ceil(json.retry_after * 1000) + 500;
    }
  } catch { /* fall through */ }
  const header = response.headers.get("retry-after") ?? response.headers.get("Retry-After");
  if (header) {
    const seconds = parseFloat(header);
    if (!isNaN(seconds)) return Math.ceil(seconds * 1000) + 500;
  }
  return 5000;
}

export type TestDeliveryResult = {
  ok: boolean;
  status: number;
  rateLimited: boolean;
  retryAfterMs: number;
  body: string;
};

export async function testDeliver(
  url: string,
  body: string,
  headers: Record<string, string>
): Promise<TestDeliveryResult> {
  let response: Response;
  try {
    response = await postJson(url, body, headers, 10000);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Request timed out or network error";
    throw new Error(msg);
  }
  const responseBody = await response.text().catch(() => "");
  if (response.status === 429) {
    return { ok: false, status: 429, rateLimited: true, retryAfterMs: parseRetryAfterMs(response, responseBody), body: responseBody };
  }
  return { ok: response.ok, status: response.status, rateLimited: false, retryAfterMs: 0, body: responseBody };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deliverWithRetry(
  webhookId: number,
  url: string,
  body: string,
  headers: Record<string, string>
): Promise<void> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await postJson(url, body, headers, 10000);
    } catch (err) {
      logger.warn({ err, webhookId, url, attempt }, "Webhook fetch error");
      if (attempt < MAX_ATTEMPTS) { await sleep(1000 * attempt); continue; }
      logger.warn({ webhookId, url }, "Webhook delivery failed after all attempts");
      return;
    }
    if (response.status === 429) {
      if (attempt === MAX_ATTEMPTS) { logger.warn({ webhookId, url, attempt }, "Still rate limited — giving up"); return; }
      const responseText = await response.text().catch(() => "");
      const waitMs = Math.min(Math.max(parseRetryAfterMs(response, responseText), 1000), 15000);
      logger.warn({ webhookId, url, attempt, waitMs }, "Rate limited — retrying");
      await sleep(waitMs);
      continue;
    }
    if (response.ok) {
      logger.info({ webhookId, url, status: response.status, attempt }, "Webhook delivered");
    } else {
      const detail = await response.text().catch(() => "");
      logger.warn({ webhookId, url, status: response.status, detail, attempt }, "Webhook non-2xx");
    }
    return;
  }
}

async function deliverViaBot(
  webhookId: number,
  channelId: string,
  embeds: object[]
): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    logger.error({ webhookId }, "DISCORD_BOT_TOKEN is not set — cannot deliver via bot");
    return;
  }
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  const body = JSON.stringify({ embeds });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bot ${token}`,
  };
  await deliverWithRetry(webhookId, url, body, headers);
}

export async function testDeliverViaBot(channelId: string, webhookId: number, webhookName: string): Promise<TestDeliveryResult> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN is not set on the server");
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  const embeds = buildDiscordEmbed("test", { webhookId, webhookName });
  const body = JSON.stringify({ embeds });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bot ${token}`,
  };
  return testDeliver(url, body, headers);
}

export async function fireWebhooks(
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  let matching: (typeof webhooksTable.$inferSelect)[];
  try {
    const allActive = await db.select().from(webhooksTable).where(eq(webhooksTable.active, true));
    matching = allActive.filter((w) => Array.isArray(w.events) && w.events.includes(event));
  } catch (err) {
    logger.error({ err, event }, "Failed to query webhooks");
    return;
  }
  if (matching.length === 0) { logger.debug({ event }, "No active webhooks matched"); return; }
  logger.info({ event, count: matching.length }, "Firing webhooks");

  await Promise.allSettled(
    matching.map(async (webhook) => {
      try {
        if (webhook.discordChannelId) {
          const embeds = buildDiscordEmbed(event, data);
          logger.debug({ webhookId: webhook.id, channelId: webhook.discordChannelId, event }, "Delivering via bot");
          await deliverViaBot(webhook.id, webhook.discordChannelId, embeds);
          return;
        }
        if (webhook.url) {
          const discord = isDiscordUrl(webhook.url);
          const payload = discord
            ? buildDiscordPayload(event, data)
            : { event, timestamp: new Date().toISOString(), data };
          const body = JSON.stringify(payload);
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (webhook.secret && !discord) {
            const sig = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
            headers["X-Webhook-Signature"] = `sha256=${sig}`;
          }
          logger.debug({ webhookId: webhook.id, url: webhook.url, event, discord }, "Delivering via URL");
          await deliverWithRetry(webhook.id, webhook.url, body, headers);
          return;
        }
        logger.warn({ webhookId: webhook.id }, "Webhook has no URL or channel ID — skipping");
      } catch (err) {
        logger.warn({ err, webhookId: webhook.id, event }, "Webhook delivery failed unexpectedly");
      }
    })
  );
}
