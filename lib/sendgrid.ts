/**
 * SendGrid Transactional Email Integration
 *
 * Core send function for all RevSignal transactional emails:
 *  - Morning briefing digests
 *  - Follow-up reminder alerts (escalation)
 *  - Weekly strategy memos
 *  - Deal stage change notifications
 *  - Prospect research results
 *  - Integration status alerts
 *
 * All emails use the RevSignal brand template from lib/email-templates.ts.
 */

// ── Configuration ─────────────────────────────────────────────────────

interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

function getSendGridConfig(): SendGridConfig | null {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return null;

  return {
    apiKey,
    fromEmail: process.env.SENDGRID_FROM_EMAIL ?? "alerts@revsignal.app",
    fromName: process.env.SENDGRID_FROM_NAME ?? "RevSignal",
  };
}

// ── Types ──────────────────────────────────────────────────────────────

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  categories?: string[];
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ── Core Send Function ────────────────────────────────────────────────

/**
 * Send a transactional email via SendGrid.
 * Returns success/failure — never throws.
 */
export async function sendEmail(params: EmailParams): Promise<SendResult> {
  const config = getSendGridConfig();
  if (!config) {
    console.error("[sendgrid] SENDGRID_API_KEY not configured");
    return { success: false, error: "SendGrid not configured" };
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
          },
        ],
        from: {
          email: config.fromEmail,
          name: config.fromName,
        },
        reply_to: params.replyTo
          ? { email: params.replyTo }
          : undefined,
        subject: params.subject,
        content: [
          ...(params.text
            ? [{ type: "text/plain", value: params.text }]
            : []),
          { type: "text/html", value: params.html },
        ],
        categories: params.categories,
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true },
        },
      }),
    });

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get("x-message-id") ?? undefined;
      return { success: true, messageId };
    }

    const errorBody = await response.text().catch(() => "");
    console.error(
      `[sendgrid] Send failed: ${response.status} — ${errorBody}`
    );
    return {
      success: false,
      error: `SendGrid ${response.status}: ${errorBody}`,
    };
  } catch (error) {
    console.error(
      "[sendgrid] Send error:",
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ── Convenience Functions ─────────────────────────────────────────────

/**
 * Send a morning briefing email.
 */
export async function sendBriefingEmail(
  to: string,
  briefingHtml: string
): Promise<SendResult> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return sendEmail({
    to,
    subject: `RevSignal Daily Briefing — ${today}`,
    html: briefingHtml,
    categories: ["briefing", "daily"],
  });
}

/**
 * Send a follow-up escalation alert.
 */
export async function sendFollowUpAlert(
  to: string,
  alertHtml: string,
  overdueCount: number
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `${overdueCount} overdue follow-up${overdueCount === 1 ? "" : "s"} need attention`,
    html: alertHtml,
    categories: ["followup", "alert"],
  });
}

/**
 * Send the weekly strategy memo.
 */
export async function sendWeeklyMemo(
  to: string,
  memoHtml: string
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: "RevSignal Weekly Strategy Memo",
    html: memoHtml,
    categories: ["memo", "weekly"],
  });
}

/**
 * Send a deal stage change notification.
 */
export async function sendDealStageAlert(
  to: string,
  company: string,
  oldStage: string,
  newStage: string,
  alertHtml: string
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `${company} moved to ${newStage}`,
    html: alertHtml,
    categories: ["deal", "stage-change"],
  });
}

/**
 * Send the CEO weekly DaaS revenue update.
 */
export async function sendCeoWeeklyUpdate(
  to: string,
  updateHtml: string
): Promise<SendResult> {
  const weekOf = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return sendEmail({
    to,
    subject: `DaaS Update — Week of ${weekOf}`,
    html: updateHtml,
    categories: ["ceo-update", "weekly"],
  });
}

/**
 * Send an integration status alert (degraded/disconnected).
 */
export async function sendIntegrationAlert(
  to: string,
  integration: string,
  status: string,
  alertHtml: string
): Promise<SendResult> {
  return sendEmail({
    to,
    subject: `Integration alert: ${integration} is ${status}`,
    html: alertHtml,
    categories: ["integration", "alert"],
  });
}
