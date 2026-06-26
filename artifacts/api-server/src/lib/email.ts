import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "support@imperium.gg";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not set — skipping email");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Resend API error");
    } else {
      logger.info({ to, subject }, "Email sent");
    }
  } catch (err) {
    logger.error({ err }, "Failed to send email");
  }
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background-color: #0B0B0F; font-family: 'Inter', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background-color: #111118; border: 1px solid #FFD23F33; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0B0B0F 0%, #1a1a28 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #FFD23F; }
    .header h1 { color: #FFD23F; font-size: 28px; font-weight: 900; letter-spacing: 6px; margin: 0; text-transform: uppercase; }
    .header p { color: #00D9FF; font-size: 13px; letter-spacing: 2px; margin: 8px 0 0; text-transform: uppercase; }
    .body { padding: 32px 24px; }
    .body p { color: #cccccc; line-height: 1.7; margin: 0 0 16px; }
    .ticket-box { background: #0B0B0F; border: 1px solid #FFD23F55; border-left: 4px solid #FFD23F; border-radius: 6px; padding: 20px 24px; margin: 24px 0; }
    .ticket-code { color: #FFD23F; font-size: 22px; font-weight: 900; letter-spacing: 4px; }
    .label { color: #666; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
    .value { color: #eee; font-size: 14px; margin-bottom: 16px; }
    .status-badge { display: inline-block; background: #FFD23F22; color: #FFD23F; border: 1px solid #FFD23F44; border-radius: 4px; padding: 4px 12px; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
    .button { display: inline-block; background: #FFD23F; color: #0B0B0F; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; padding: 14px 28px; border-radius: 6px; text-decoration: none; margin: 8px 0; }
    .footer { background: #0B0B0F; padding: 20px 24px; text-align: center; border-top: 1px solid #ffffff11; }
    .footer p { color: #444; font-size: 12px; margin: 0; }
    hr { border: none; border-top: 1px solid #ffffff11; margin: 24px 0; }
    .message-box { background: #0f0f1a; border: 1px solid #ffffff11; border-radius: 6px; padding: 16px; color: #ccc; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>IMPERIUM</h1>
      <p>Support Center</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>This email was sent by the Imperium Support System. Do not reply to this email.</p>
      <p style="margin-top:8px;">Copyright &copy; 2025 Imperium. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendTicketConfirmation(opts: {
  to: string;
  ticketCode: string;
  type: string;
  subject: string;
  createdAt: Date;
}): Promise<void> {
  const typeLabel = opts.type.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const html = baseTemplate(`
    <p>Thank you for contacting the Imperium Support Team. Your ticket has been received and is under review.</p>
    <div class="ticket-box">
      <div class="label">Ticket ID</div>
      <div class="ticket-code">${opts.ticketCode}</div>
    </div>
    <div class="label">Ticket Type</div>
    <div class="value">${typeLabel}</div>
    <div class="label">Subject</div>
    <div class="value">${opts.subject}</div>
    <div class="label">Submitted</div>
    <div class="value">${opts.createdAt.toUTCString()}</div>
    <div class="label">Current Status</div>
    <div class="value"><span class="status-badge">Pending Review</span></div>
    <hr />
    <p>Keep your Ticket ID safe. You can use it along with your email to track your ticket status at any time.</p>
    <p>Our staff aims to respond within <strong style="color:#FFD23F">24–72 hours</strong>.</p>
  `);
  await sendEmail(opts.to, `[${opts.ticketCode}] Ticket Received — Imperium Support`, html);
}

export async function sendTicketStatusUpdate(opts: {
  to: string;
  ticketCode: string;
  subject: string;
  newStatus: string;
  staffName?: string;
}): Promise<void> {
  const statusLabel = opts.newStatus.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const html = baseTemplate(`
    <p>Your ticket status has been updated by the Imperium Support Team.</p>
    <div class="ticket-box">
      <div class="label">Ticket ID</div>
      <div class="ticket-code">${opts.ticketCode}</div>
    </div>
    <div class="label">Subject</div>
    <div class="value">${opts.subject}</div>
    <div class="label">New Status</div>
    <div class="value"><span class="status-badge">${statusLabel}</span></div>
    ${opts.staffName ? `<div class="label">Updated By</div><div class="value">${opts.staffName}</div>` : ""}
    <hr />
    <p>You can check your full ticket details, including timeline and staff replies, using your Ticket ID.</p>
  `);
  await sendEmail(opts.to, `[${opts.ticketCode}] Ticket Status Updated — ${statusLabel}`, html);
}

export async function sendStaffReplyNotification(opts: {
  to: string;
  ticketCode: string;
  subject: string;
  staffName: string;
  staffRole: string;
  message: string;
}): Promise<void> {
  const html = baseTemplate(`
    <p>A staff member has replied to your ticket.</p>
    <div class="ticket-box">
      <div class="label">Ticket ID</div>
      <div class="ticket-code">${opts.ticketCode}</div>
    </div>
    <div class="label">Subject</div>
    <div class="value">${opts.subject}</div>
    <div class="label">Reply from ${opts.staffName} (${opts.staffRole})</div>
    <div class="message-box">${opts.message.replace(/\n/g, "<br/>")}</div>
    <hr />
    <p>To view the full conversation and reply, track your ticket using your Ticket ID and email address.</p>
  `);
  await sendEmail(opts.to, `[${opts.ticketCode}] New Reply — Imperium Support`, html);
}

export async function sendTicketClosedNotification(opts: {
  to: string;
  ticketCode: string;
  subject: string;
  resolution: string;
}): Promise<void> {
  const resolutionLabel = opts.resolution.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const html = baseTemplate(`
    <p>Your support ticket has been closed by the Imperium Support Team.</p>
    <div class="ticket-box">
      <div class="label">Ticket ID</div>
      <div class="ticket-code">${opts.ticketCode}</div>
    </div>
    <div class="label">Subject</div>
    <div class="value">${opts.subject}</div>
    <div class="label">Resolution</div>
    <div class="value"><span class="status-badge">${resolutionLabel}</span></div>
    <hr />
    <p>If you believe this was resolved in error or have additional information, please submit a new ticket referencing this Ticket ID.</p>
    <p>Thank you for contacting Imperium Support.</p>
  `);
  await sendEmail(opts.to, `[${opts.ticketCode}] Ticket Closed — Imperium Support`, html);
}
