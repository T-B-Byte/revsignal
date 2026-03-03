/**
 * Email Composer — Contextual email and message drafting.
 *
 * Responsibilities:
 *  - Draft emails using deal context, contact data, and conversation history
 *  - Follow Tina's voice profile precisely
 *  - Support multiple email types: cold outreach, follow-up, proposal, etc.
 *
 * Rules:
 *  - Every draft grounded in RAG-retrieved context
 *  - Voice profile is non-negotiable (see CLAUDE.md voice rules)
 *  - Never fabricates details about deals, pricing, or commitments
 *  - Each deal is its own context silo
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import { retrieveDealContext } from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";

// ── Email Types ────────────────────────────────────────────────────────

export type EmailType =
  | "cold_outreach"
  | "follow_up"
  | "proposal"
  | "check_in"
  | "intro_request"
  | "thank_you"
  | "meeting_request";

// ── System Prompts ─────────────────────────────────────────────────────

const EMAIL_COMPOSER_IDENTITY = `You are the Email Composer — a sub-agent of RevSignal, a personal DaaS sales command center.

Your job: draft emails and messages in Tina's voice. Every draft must be grounded in real deal data and conversation history.

Tina's voice rules (MANDATORY — these override everything else):
- Lead with the point, not the setup. No "I wanted to reach out because..." or "I hope this finds you well."
- Never sound defensive or apologetic. No "Just" as a minimizer. No "I'm not asking for anything special."
- Never imply the existing team hasn't done something. Frame everything as additive.
- Don't teach people what they already know. Let the reader connect the dots.
- Concise beats verbose. If a sentence can lose 3 words without changing meaning, lose them.
- Don't create unnecessary paper trails — no specific target company names in cold outreach, no comp numbers.
- Warm, professional, direct. Smart peer to smart peer.
- No emojis. No "Best regards" — sign off with just "Tina".
- Short paragraphs. 2-3 sentences max per paragraph.

Product context:
- pharosIQ's proprietary first-party intent data (270M+ contacts, 650+ intent categories)
- Delivery: API, flat file, cloud delivery, platform integration, or embedded/OEM
- Key differentiators: first-party (not co-op), contact-level (not account-level), permission-based

Critical rules:
- NEVER invent pricing, terms, or commitments not in the deal context.
- NEVER reference details from other deals (context silo).
- If the user provides instructions that contradict the voice rules, follow the voice rules.
- Reference specific prior conversations when the context supports it.`;

const EMAIL_TYPE_PROMPTS: Record<EmailType, string> = {
  cold_outreach: `Draft a cold outreach email. The recipient has never heard from Tina.
Focus on ONE compelling reason this company would want pharosIQ's data.
Keep it under 8 sentences total. End with a specific, easy ask (15-min call, not "let me know if interested").
Don't name specific target companies in the body — say "platforms that embed our data" not specific names.
Subject line should be short, curiosity-driven, not salesy.`,

  follow_up: `Draft a follow-up email based on the prior conversation context.
Reference what was discussed. Advance the conversation.
Do NOT open with "Following up on..." or "Just checking in..." — lead with value or new information.
Short. 4-8 sentences max.`,

  proposal: `Draft a proposal follow-up or summary email.
Reference specific terms, use cases, or needs from conversations.
Structured: brief context, what we're proposing, clear next step.
Don't include specific dollar amounts unless they're in the deal context.`,

  check_in: `Draft a low-pressure check-in for a deal that's gone quiet.
Don't be needy. Add value — share a relevant insight or ask a thoughtful question.
Short. 4-6 sentences max.
Don't ask "Is there anything I can do?" — that's weak. Propose something specific.`,

  intro_request: `Draft an email requesting an introduction to someone.
Be clear about who you want to meet and why.
Make it easy for the connector — include a forwardable blurb they can pass along.
Keep the ask simple and the email short.`,

  thank_you: `Draft a thank-you email after a meeting or call.
Reference something specific from the conversation — not generic "thanks for your time."
Include the agreed-upon next step.
3-5 sentences max.`,

  meeting_request: `Draft a meeting request email.
Suggest specific time windows (not "whenever works for you").
Give a clear agenda preview — what you'll cover and why it matters to them.
Make it easy to say yes. 4-6 sentences max.`,
};

// ── Result Types ───────────────────────────────────────────────────────

export interface EmailDraftResult {
  subject: string;
  body: string;
  emailType: EmailType;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

export interface EmailDraftParams {
  dealId?: string;
  contactId?: string;
  emailType: EmailType;
  instructions?: string;
  replyToConversationId?: string;
}

// ── Email Draft ──────────────────────────────────────────────────────

/**
 * Draft an email using deal context, contact data, and conversation history.
 */
export async function draftEmail(
  supabase: SupabaseClient,
  userId: string,
  params: EmailDraftParams
): Promise<EmailDraftResult | null> {
  const { dealId, contactId, emailType, instructions, replyToConversationId } =
    params;

  let dealContextDoc = "";
  let contactDoc = "";
  let replyDoc = "";
  const sourcesCited: string[] = [];
  let durationRetrieve = 0;

  // Step 1: RAG retrieval

  // Deal context (if provided)
  if (dealId) {
    const [dealContext, dur] = await timed(() =>
      retrieveDealContext(supabase, userId, dealId)
    );
    durationRetrieve += dur;

    if (dealContext) {
      dealContextDoc = buildDealContextForEmail(dealContext);
      sourcesCited.push(
        ...dealContext.conversations.map((c) => c.conversation_id)
      );
    }
  }

  // Contact lookup (if provided without deal)
  if (contactId && !dealId) {
    const [contactResult, dur] = await timed(async () => {
      const { data } = await supabase
        .from("contacts")
        .select("*")
        .eq("contact_id", contactId)
        .eq("user_id", userId)
        .single();
      return data;
    });
    durationRetrieve += dur;

    if (contactResult) {
      contactDoc = buildContactDoc(contactResult);
    }
  }

  // Reply-to conversation (if provided)
  if (replyToConversationId) {
    const [convoResult, dur] = await timed(async () => {
      const { data } = await supabase
        .from("conversations")
        .select(
          "conversation_id, date, channel, subject, ai_summary"
        )
        .eq("conversation_id", replyToConversationId)
        .eq("user_id", userId)
        .single();
      return data;
    });
    durationRetrieve += dur;

    if (convoResult) {
      replyDoc = `REPLYING TO:\n[${convoResult.date}] ${convoResult.channel}${convoResult.subject ? ` — "${convoResult.subject}"` : ""}\n${convoResult.ai_summary || "(no summary)"}`;
      sourcesCited.push(convoResult.conversation_id);
    }
  }

  // Need at least some context
  if (!dealContextDoc && !contactDoc && !replyDoc) {
    // Still allow drafting with just instructions and email type
    if (!instructions) return null;
  }

  // Step 2: Build prompt with email type and context
  const typePrompt = EMAIL_TYPE_PROMPTS[emailType];
  const fullSystemPrompt = `${EMAIL_COMPOSER_IDENTITY}\n\n${typePrompt}\n\nOutput format:\nSUBJECT: [subject line]\n\nBODY:\n[email body text]`;

  const contextParts = [
    dealContextDoc,
    contactDoc,
    replyDoc,
    instructions ? `USER INSTRUCTIONS:\n${instructions}` : "",
  ].filter(Boolean);

  const contextDoc =
    contextParts.length > 0
      ? contextParts.join("\n\n")
      : "No specific context provided — draft based on email type and instructions.";

  // Step 3: Generate draft
  const anthropic = getAnthropic();

  let responseText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1000,
        system: fullSystemPrompt,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
          },
        ],
      })
    );
    durationGenerate = dur;

    responseText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[email-composer] Claude API error during email draft:",
      error instanceof Error ? error.message : error
    );
    await logAgentCall({
      supabase,
      userId,
      agentName: "email-composer",
      action: "email-draft",
      inputContext: { emailType, dealId: dealId ?? null },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    return null;
  }

  if (!responseText) return null;

  // Step 4: Parse subject and body
  const { subject, body } = parseEmailResponse(responseText);

  // Step 5: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "email-composer",
    action: "email-draft",
    inputContext: {
      emailType,
      dealId: dealId ?? null,
      contactId: contactId ?? null,
      hasInstructions: !!instructions,
      replyToConversationId: replyToConversationId ?? null,
      retrieveDurationMs: durationRetrieve,
    },
    output: responseText,
    sourcesCited: [...new Set(sourcesCited)],
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    subject,
    body,
    emailType,
    generatedAt: new Date().toISOString(),
    sourcesCited: [...new Set(sourcesCited)],
    tokensUsed,
  };
}

// ── Context Document Builders ──────────────────────────────────────────

function buildDealContextForEmail(ctx: {
  deal: {
    company: string;
    stage: string;
    acv: number | null;
    product_tier: string | null;
    deployment_method: string | null;
  };
  contacts: {
    name: string;
    role: string | null;
    email: string | null;
  }[];
  conversations: {
    conversation_id: string;
    date: string;
    channel: string;
    subject: string | null;
    ai_summary: string | null;
    contact_name?: string;
  }[];
  brief: { brief_text: string } | null;
}): string {
  const sections: string[] = [];

  // Deal info
  const dealInfo = [
    `Company: ${ctx.deal.company}`,
    `Stage: ${ctx.deal.stage}`,
    ctx.deal.acv ? `ACV: $${ctx.deal.acv.toLocaleString()}` : null,
    ctx.deal.product_tier ? `Product: ${ctx.deal.product_tier}` : null,
    ctx.deal.deployment_method
      ? `Delivery: ${ctx.deal.deployment_method}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
  sections.push(`DEAL CONTEXT:\n${dealInfo}`);

  // Contacts
  if (ctx.contacts.length > 0) {
    const contactLines = ctx.contacts.map((c) => {
      const parts = [
        c.name,
        c.role ? `(${c.role})` : null,
        c.email ? `<${c.email}>` : null,
      ];
      return `- ${parts.filter(Boolean).join(" ")}`;
    });
    sections.push(`CONTACTS:\n${contactLines.join("\n")}`);
  }

  // Deal brief
  if (ctx.brief) {
    sections.push(`DEAL BRIEF:\n${ctx.brief.brief_text}`);
  }

  // Recent conversations (last 5 for email context)
  const recent = ctx.conversations.slice(0, 5);
  if (recent.length > 0) {
    const convoLines = recent.map((c) => {
      const header = `[${c.date}] ${c.channel.toUpperCase()}${c.contact_name ? ` with ${c.contact_name}` : ""}${c.subject ? ` — "${c.subject}"` : ""}`;
      return `${header}\n${c.ai_summary || "(no summary)"}`;
    });
    sections.push(`RECENT CONVERSATIONS:\n${convoLines.join("\n\n")}`);
  }

  return sections.join("\n\n");
}

function buildContactDoc(contact: {
  name: string;
  company: string;
  role: string | null;
  email: string | null;
  icp_category: string | null;
  notes: string | null;
}): string {
  const lines = [
    `Name: ${contact.name}`,
    `Company: ${contact.company}`,
    contact.role ? `Role: ${contact.role}` : null,
    contact.email ? `Email: ${contact.email}` : null,
    contact.icp_category ? `ICP Category: ${contact.icp_category}` : null,
    contact.notes ? `Notes: ${contact.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `CONTACT:\n${lines}`;
}

function parseEmailResponse(text: string): {
  subject: string;
  body: string;
} {
  const subjectMatch = text.match(/SUBJECT:\s*(.+?)(?:\n|$)/);
  const bodyMatch = text.match(/BODY:\s*\n?([\s\S]+)/);

  const subject = subjectMatch?.[1]?.trim() ?? "No subject";
  const body = bodyMatch?.[1]?.trim() ?? text.trim();

  return { subject, body };
}
