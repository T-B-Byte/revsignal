/**
 * HTML Email Template Builder — RevSignal Branding
 *
 * Generates responsive HTML emails with consistent RevSignal styling.
 * All transactional emails use these templates.
 *
 * Design: Dark theme matching the app, clean typography, mobile-responsive.
 */

// ── Base Layout ──────────────────────────────────────────────────────

/**
 * Wrap content in the base RevSignal email layout.
 * Includes header, content area, and footer.
 */
export function baseLayout(options: {
  title: string;
  preheader?: string;
  content: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeHtml(options.title)}</title>
${options.preheader ? `<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(options.preheader)}</span>` : ""}
<style>
  body { margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; background-color: #111111; }
  .header { padding: 24px 32px; border-bottom: 1px solid #222; }
  .header h1 { margin: 0; font-size: 18px; font-weight: 600; color: #ffffff; letter-spacing: -0.02em; }
  .header .tagline { margin: 4px 0 0; font-size: 12px; color: #666; }
  .content { padding: 32px; color: #d4d4d4; font-size: 14px; line-height: 1.6; }
  .content h2 { color: #ffffff; font-size: 16px; font-weight: 600; margin: 24px 0 12px; }
  .content h2:first-child { margin-top: 0; }
  .content h3 { color: #e5e5e5; font-size: 14px; font-weight: 600; margin: 20px 0 8px; }
  .content p { margin: 0 0 12px; }
  .content ul { margin: 0 0 12px; padding-left: 20px; }
  .content li { margin: 0 0 6px; }
  .content a { color: #60a5fa; text-decoration: none; }
  .content a:hover { text-decoration: underline; }
  .footer { padding: 24px 32px; border-top: 1px solid #222; font-size: 12px; color: #555; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .badge-green { background: #052e16; color: #4ade80; }
  .badge-yellow { background: #422006; color: #fbbf24; }
  .badge-red { background: #450a0a; color: #f87171; }
  .badge-blue { background: #0c1e3a; color: #60a5fa; }
  .card { background: #1a1a1a; border: 1px solid #262626; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .metric { font-size: 28px; font-weight: 700; color: #ffffff; }
  .metric-label { font-size: 12px; color: #888; margin-top: 2px; }
  .divider { border: none; border-top: 1px solid #222; margin: 20px 0; }
  @media (max-width: 600px) {
    .container { width: 100% !important; }
    .content { padding: 20px !important; }
    .header { padding: 20px !important; }
  }
</style>
</head>
<body>
<table role="presentation" width="100%" style="background-color:#0a0a0a;">
<tr><td align="center" style="padding:20px 12px;">
<div class="container">
  <div class="header">
    <h1>RevSignal</h1>
    <div class="tagline">Where signals become revenue</div>
  </div>
  <div class="content">
    ${options.content}
  </div>
  <div class="footer">
    RevSignal &mdash; Your sales command center<br>
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://revsignal.app"}" style="color:#555;">Open Dashboard</a>
  </div>
</div>
</td></tr>
</table>
</body>
</html>`;
}

// ── Template Builders ────────────────────────────────────────────────

/**
 * Build a morning briefing email.
 */
export function buildBriefingEmail(data: {
  greeting: string;
  priorities: string[];
  pipelineSummary: { activeDeals: number; totalAcv: number; closedRevenue: number };
  overdueItems: { description: string; company: string; daysPastDue: number }[];
  briefingContent: string;
}): string {
  const prioritiesHtml = data.priorities
    .map((p, i) => `<li><strong>${i + 1}.</strong> ${escapeHtml(p)}</li>`)
    .join("\n");

  const overdueHtml = data.overdueItems.length > 0
    ? `<h3>Overdue Follow-Ups</h3>
      ${data.overdueItems.map((item) => `
        <div class="card">
          <span class="badge badge-red">${item.daysPastDue}d overdue</span>
          <div style="margin-top:8px;color:#e5e5e5;">${escapeHtml(item.description)}</div>
          <div style="font-size:12px;color:#888;margin-top:4px;">${escapeHtml(item.company)}</div>
        </div>
      `).join("\n")}`
    : "";

  return baseLayout({
    title: "Daily Briefing",
    preheader: data.priorities[0] ?? "Your daily sales briefing",
    content: `
      <p>${escapeHtml(data.greeting)}</p>

      <h2>Top Priorities</h2>
      <ul>${prioritiesHtml}</ul>

      <hr class="divider">

      <h2>Pipeline Snapshot</h2>
      <table width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="padding:8px;">
            <div class="metric">${data.pipelineSummary.activeDeals}</div>
            <div class="metric-label">Active Deals</div>
          </td>
          <td style="padding:8px;">
            <div class="metric">$${formatCompact(data.pipelineSummary.totalAcv)}</div>
            <div class="metric-label">Pipeline ACV</div>
          </td>
          <td style="padding:8px;">
            <div class="metric">$${formatCompact(data.pipelineSummary.closedRevenue)}</div>
            <div class="metric-label">Closed Revenue</div>
          </td>
        </tr>
      </table>

      ${overdueHtml}

      <hr class="divider">

      <h2>Strategist Brief</h2>
      ${sanitizeHtml(data.briefingContent)}
    `,
  });
}

/**
 * Build a follow-up escalation alert email.
 */
export function buildFollowUpAlertEmail(data: {
  items: {
    description: string;
    company: string;
    daysPastDue: number;
    escalationLevel: "green" | "yellow" | "red";
  }[];
}): string {
  const itemsHtml = data.items
    .map(
      (item) => `
      <div class="card">
        <span class="badge badge-${item.escalationLevel}">${item.escalationLevel.toUpperCase()}</span>
        <span style="margin-left:8px;font-size:12px;color:#888;">${item.daysPastDue}d overdue</span>
        <div style="margin-top:8px;color:#e5e5e5;">${escapeHtml(item.description)}</div>
        <div style="font-size:12px;color:#888;margin-top:4px;">${escapeHtml(item.company)}</div>
      </div>`
    )
    .join("\n");

  return baseLayout({
    title: "Follow-Up Alert",
    preheader: `${data.items.length} follow-up${data.items.length === 1 ? "" : "s"} need attention`,
    content: `
      <h2>Follow-Ups Need Attention</h2>
      <p>${data.items.length} item${data.items.length === 1 ? "" : "s"} overdue.</p>
      ${itemsHtml}
      <p style="margin-top:20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://revsignal.app"}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;font-weight:600;text-decoration:none;">Open Dashboard</a>
      </p>
    `,
  });
}

/**
 * Build a weekly strategy memo email.
 */
export function buildWeeklyMemoEmail(data: {
  memoContent: string;
  weekSummary: {
    dealsAdvanced: number;
    dealsStalled: number;
    revenueClosed: number;
    newProspects: number;
  };
}): string {
  return baseLayout({
    title: "Weekly Strategy Memo",
    preheader: "Your weekly revenue strategy brief",
    content: `
      <h2>Weekly Strategy Memo</h2>

      <table width="100%" style="border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:8px;">
            <div class="metric" style="color:#4ade80;">${data.weekSummary.dealsAdvanced}</div>
            <div class="metric-label">Deals Advanced</div>
          </td>
          <td style="padding:8px;">
            <div class="metric" style="color:#fbbf24;">${data.weekSummary.dealsStalled}</div>
            <div class="metric-label">Deals Stalled</div>
          </td>
          <td style="padding:8px;">
            <div class="metric">$${formatCompact(data.weekSummary.revenueClosed)}</div>
            <div class="metric-label">Revenue Closed</div>
          </td>
          <td style="padding:8px;">
            <div class="metric">${data.weekSummary.newProspects}</div>
            <div class="metric-label">New Prospects</div>
          </td>
        </tr>
      </table>

      <hr class="divider">

      ${sanitizeHtml(data.memoContent)}
    `,
  });
}

/**
 * Build a deal stage change notification email.
 */
export function buildDealStageEmail(data: {
  company: string;
  oldStage: string;
  newStage: string;
  acv: number | null;
  note?: string;
}): string {
  const isWon = data.newStage === "Closed Won";
  const isLost = data.newStage === "Closed Lost";

  return baseLayout({
    title: `${data.company} — Stage Change`,
    preheader: `${data.company} moved to ${data.newStage}`,
    content: `
      <h2>${escapeHtml(data.company)}</h2>
      <div class="card">
        <div style="font-size:12px;color:#888;margin-bottom:8px;">STAGE CHANGE</div>
        <span class="badge badge-blue">${escapeHtml(data.oldStage)}</span>
        <span style="color:#555;margin:0 8px;">&rarr;</span>
        <span class="badge ${isWon ? "badge-green" : isLost ? "badge-red" : "badge-yellow"}">${escapeHtml(data.newStage)}</span>
        ${data.acv ? `<div style="margin-top:12px;"><span class="metric" style="font-size:20px;">$${data.acv.toLocaleString()}</span> <span class="metric-label" style="display:inline;">ACV</span></div>` : ""}
      </div>
      ${data.note ? `<p>${escapeHtml(data.note)}</p>` : ""}
    `,
  });
}

// ── CEO Weekly Update ────────────────────────────────────────────────

/**
 * Build the CEO weekly update email.
 * Designed to be read in 30 seconds. No fluff, no internal strategy.
 * No specific company names. Pure revenue signal.
 */
export function buildCeoWeeklyEmail(data: {
  recipientName: string;
  closedRevenue: number;
  revenueTarget: number;
  pipelineAcv: number;
  dealsAdvanced: number;
  activeDeals: number;
  meetingsThisWeek: number;
  highlights: string[];
  nextWeek: string;
}): string {
  const pacing = Math.round((data.closedRevenue / data.revenueTarget) * 100);

  const highlightsHtml = data.highlights
    .map((h) => `<li style="margin:0 0 4px;color:#d4d4d4;">${escapeHtml(h)}</li>`)
    .join("\n");

  return baseLayout({
    title: "DaaS Weekly",
    preheader: `$${formatCompact(data.closedRevenue)} closed — ${pacing}% to target`,
    content: `
      <p style="color:#888;margin:0 0 20px;">DaaS Revenue Update — Week of ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>

      <table width="100%" style="border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 12px 8px 0;">
            <div class="metric">$${formatCompact(data.closedRevenue)}</div>
            <div class="metric-label">Closed Revenue</div>
          </td>
          <td style="padding:8px 12px;">
            <div class="metric">${pacing}%</div>
            <div class="metric-label">To $${formatCompact(data.revenueTarget)} Target</div>
          </td>
          <td style="padding:8px 0 8px 12px;">
            <div class="metric">$${formatCompact(data.pipelineAcv)}</div>
            <div class="metric-label">Active Pipeline</div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom:20px;">
        <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">This Week</div>
        <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;">
          ${highlightsHtml}
          <li style="margin:0 0 4px;color:#d4d4d4;">${data.dealsAdvanced} deal${data.dealsAdvanced === 1 ? "" : "s"} advanced, ${data.activeDeals} active, ${data.meetingsThisWeek} meeting${data.meetingsThisWeek === 1 ? "" : "s"}</li>
        </ul>
      </div>

      <div>
        <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Next Week</div>
        <p style="margin:0;color:#d4d4d4;">${escapeHtml(data.nextWeek)}</p>
      </div>
    `,
  });
}

// ── Deal Room: Data Test ─────────────────────────────────────────────

/**
 * Build the internal notification email sent to the room owner when a
 * prospect submits a data test request through a deal room.
 */
export function buildDataTestNotificationEmail(data: {
  companyName: string;
  roomSlug: string;
  scope: "personas_intent" | "full_schema";
  domainCount: number;
  domains: string[];
  prospectName?: string | null;
  prospectEmail?: string | null;
  prospectCompany?: string | null;
  testId: string;
}): string {
  const scopeLabel =
    data.scope === "full_schema" ? "Full Schema (needs approval)" : "Standard (personas + intent)";
  const scopeBadge = data.scope === "full_schema" ? "badge-yellow" : "badge-green";

  const previewDomains = data.domains.slice(0, 25);
  const remainder = data.domains.length - previewDomains.length;
  const domainsHtml = previewDomains
    .map((d) => `<div style="font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#d4d4d4;padding:2px 0;">${escapeHtml(d)}</div>`)
    .join("\n");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://revsignal.app";

  const prospectInfoHtml =
    data.prospectName || data.prospectEmail || data.prospectCompany
      ? `
      <h3>Submitted By</h3>
      <div class="card">
        ${data.prospectName ? `<div><strong>${escapeHtml(data.prospectName)}</strong></div>` : ""}
        ${data.prospectCompany ? `<div style="color:#a3a3a3;font-size:13px;">${escapeHtml(data.prospectCompany)}</div>` : ""}
        ${data.prospectEmail ? `<div style="margin-top:6px;"><a href="mailto:${escapeHtml(data.prospectEmail)}">${escapeHtml(data.prospectEmail)}</a></div>` : ""}
      </div>
    `
      : `<p style="color:#888;font-size:13px;">No contact info provided.</p>`;

  return baseLayout({
    title: `Data test request — ${data.companyName}`,
    preheader: `${data.domainCount} domains, ${scopeLabel}`,
    content: `
      <h2>New Data Test Request</h2>
      <div class="card">
        <div style="font-size:12px;color:#888;margin-bottom:6px;">DEAL ROOM</div>
        <div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:10px;">${escapeHtml(data.companyName)}</div>
        <span class="badge ${scopeBadge}">${escapeHtml(scopeLabel)}</span>
        <span style="margin-left:8px;font-size:13px;color:#a3a3a3;">${data.domainCount} domain${data.domainCount === 1 ? "" : "s"}</span>
      </div>

      ${prospectInfoHtml}

      <h3>Domains</h3>
      <div class="card">
        ${domainsHtml}
        ${remainder > 0 ? `<div style="margin-top:8px;font-size:12px;color:#888;">+ ${remainder} more</div>` : ""}
      </div>

      <p style="margin-top:20px;">
        <a href="${appUrl}/deal-rooms" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;font-weight:600;text-decoration:none;">Open Deal Rooms</a>
      </p>

      <p style="font-size:12px;color:#666;margin-top:16px;">Room slug: ${escapeHtml(data.roomSlug)} · Test ID: ${escapeHtml(data.testId)}</p>
    `,
  });
}

/**
 * Build the confirmation email sent to the prospect who submitted the
 * data test request.
 */
export function buildDataTestConfirmationEmail(data: {
  prospectName?: string | null;
  scope: "personas_intent" | "full_schema";
  domainCount: number;
}): string {
  const greeting = data.prospectName ? `Hi ${escapeHtml(data.prospectName.split(" ")[0])},` : "Hi,";
  const timing =
    data.scope === "full_schema"
      ? "Full schema tests go through a quick approval. You'll hear back within one business day."
      : "We'll process your domains and send results shortly.";

  return baseLayout({
    title: "Your data test request",
    preheader: "We received your data test request",
    content: `
      <p>${greeting}</p>
      <p>Your data test request is in. ${data.domainCount} domain${data.domainCount === 1 ? "" : "s"} submitted.</p>
      <p>${timing}</p>
      <p>Reply to this email if you want to add context or ask questions in the meantime.</p>
      <p style="margin-top:24px;color:#a3a3a3;">Tina<br><span style="color:#666;font-size:12px;">pharosIQ</span></p>
    `,
  });
}

// ── Deal Room: Quote ─────────────────────────────────────────────────

export interface QuoteLineItem {
  product_name: string;
  tier: string;
  quantity?: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

/**
 * Build the internal notification email sent to the room owner when a
 * prospect submits a quote from a deal room.
 */
export function buildQuoteNotificationEmail(data: {
  companyName: string;
  roomSlug: string;
  items: QuoteLineItem[];
  totalPrice: number;
  prospectName?: string | null;
  prospectEmail?: string | null;
  prospectTitle?: string | null;
  prospectNotes?: string | null;
  quoteId: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://revsignal.app";

  const itemsHtml = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #222;color:#e5e5e5;font-size:13px;">
          <div style="font-weight:600;">${escapeHtml(it.product_name)}</div>
          <div style="color:#888;font-size:12px;margin-top:2px;">${escapeHtml(it.tier)}${it.quantity ? ` · Qty ${it.quantity}` : ""}</div>
          ${it.notes ? `<div style="color:#a3a3a3;font-size:12px;margin-top:4px;">${escapeHtml(it.notes)}</div>` : ""}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #222;color:#e5e5e5;font-size:13px;text-align:right;white-space:nowrap;">$${it.subtotal.toLocaleString()}</td>
      </tr>`
    )
    .join("\n");

  const prospectInfoHtml =
    data.prospectName || data.prospectEmail || data.prospectTitle
      ? `
      <h3>Submitted By</h3>
      <div class="card">
        ${data.prospectName ? `<div><strong>${escapeHtml(data.prospectName)}</strong></div>` : ""}
        ${data.prospectTitle ? `<div style="color:#a3a3a3;font-size:13px;">${escapeHtml(data.prospectTitle)}</div>` : ""}
        ${data.prospectEmail ? `<div style="margin-top:6px;"><a href="mailto:${escapeHtml(data.prospectEmail)}">${escapeHtml(data.prospectEmail)}</a></div>` : ""}
      </div>
    `
      : `<p style="color:#888;font-size:13px;">No contact info provided.</p>`;

  const notesHtml = data.prospectNotes
    ? `<h3>Notes from Prospect</h3><div class="card" style="color:#d4d4d4;font-size:13px;white-space:pre-wrap;">${escapeHtml(data.prospectNotes)}</div>`
    : "";

  return baseLayout({
    title: `Quote submitted — ${data.companyName}`,
    preheader: `$${data.totalPrice.toLocaleString()} · ${data.items.length} line item${data.items.length === 1 ? "" : "s"}`,
    content: `
      <h2>New Quote Submitted</h2>
      <div class="card">
        <div style="font-size:12px;color:#888;margin-bottom:6px;">DEAL ROOM</div>
        <div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:10px;">${escapeHtml(data.companyName)}</div>
        <div class="metric">$${data.totalPrice.toLocaleString()}</div>
        <div class="metric-label">Total Quoted</div>
      </div>

      ${prospectInfoHtml}

      <h3>Line Items</h3>
      <table width="100%" style="border-collapse:collapse;background:#1a1a1a;border:1px solid #262626;border-radius:8px;overflow:hidden;">
        ${itemsHtml}
        <tr>
          <td style="padding:12px 8px;color:#fff;font-weight:600;font-size:13px;">Total</td>
          <td style="padding:12px 8px;color:#fff;font-weight:600;font-size:14px;text-align:right;">$${data.totalPrice.toLocaleString()}</td>
        </tr>
      </table>

      ${notesHtml}

      <p style="margin-top:20px;">
        <a href="${appUrl}/deal-rooms" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;font-weight:600;text-decoration:none;">Open Deal Rooms</a>
      </p>

      <p style="font-size:12px;color:#666;margin-top:16px;">Room slug: ${escapeHtml(data.roomSlug)} · Quote ID: ${escapeHtml(data.quoteId)}</p>
    `,
  });
}

/**
 * Build the confirmation email sent to the prospect who submitted the quote.
 */
export function buildQuoteConfirmationEmail(data: {
  prospectName?: string | null;
  items: QuoteLineItem[];
  totalPrice: number;
}): string {
  const greeting = data.prospectName ? `Hi ${escapeHtml(data.prospectName.split(" ")[0])},` : "Hi,";

  const itemsHtml = data.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #222;color:#e5e5e5;font-size:13px;">
          <div>${escapeHtml(it.product_name)}</div>
          <div style="color:#888;font-size:12px;">${escapeHtml(it.tier)}${it.quantity ? ` · Qty ${it.quantity}` : ""}</div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #222;color:#e5e5e5;font-size:13px;text-align:right;white-space:nowrap;">$${it.subtotal.toLocaleString()}</td>
      </tr>`
    )
    .join("\n");

  return baseLayout({
    title: "Your quote is in",
    preheader: `Total: $${data.totalPrice.toLocaleString()}`,
    content: `
      <p>${greeting}</p>
      <p>Your quote came through. Here is what you selected:</p>

      <table width="100%" style="border-collapse:collapse;background:#1a1a1a;border:1px solid #262626;border-radius:8px;overflow:hidden;margin:12px 0;">
        ${itemsHtml}
        <tr>
          <td style="padding:10px 8px;color:#fff;font-weight:600;font-size:13px;">Total</td>
          <td style="padding:10px 8px;color:#fff;font-weight:600;font-size:14px;text-align:right;">$${data.totalPrice.toLocaleString()}</td>
        </tr>
      </table>

      <p>I will review and follow up with next steps shortly. Reply to this email with any questions or adjustments.</p>
      <p style="margin-top:24px;color:#a3a3a3;">Tina<br><span style="color:#666;font-size:12px;">pharosIQ</span></p>
    `,
  });
}

// ── Utility ──────────────────────────────────────────────────────────

/** Escape HTML entities */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize HTML content from agent outputs.
 * Strips dangerous tags (script, iframe, object, embed, form) and event handlers
 * while preserving safe formatting tags used in email content.
 */
function sanitizeHtml(html: string): string {
  return html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove iframe, object, embed, form tags
    .replace(/<\/?(?:iframe|object|embed|form|input|textarea|button|select)\b[^>]*>/gi, "")
    // Remove event handler attributes (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="')
    // Remove data: URLs in src attributes
    .replace(/src\s*=\s*["']?\s*data:/gi, 'src="');
}

/** Format number compactly: 1000000 → "1M", 150000 → "150K" */
function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}
