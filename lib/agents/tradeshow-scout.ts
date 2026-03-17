/**
 * Tradeshow Scout — Tradeshow sponsor analysis agent.
 *
 * Responsibilities:
 *  - Extract sponsors from a tradeshow sponsor page URL or pasted HTML
 *  - Classify each sponsor against pharosIQ's ICPs
 *  - Generate pitch angles, priority tiers, and Bombora differentiation angles
 *  - Research best contacts for high-priority targets (on-demand)
 *
 * Rules:
 *  - Every call uses RAG retrieval first (tradeshow context)
 *  - Never invents company details or contacts
 *  - Flags competitors and existing pipeline overlaps
 *  - Sources all factual claims
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import { retrieveTradeshowContext } from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";
import { TINA_VOICE_RULES } from "./voice";
import type {
  TradeshowTarget,
  TradeshowContact,
  TradeshowPriority,
  Deal,
  Prospect,
  CompetitiveIntel,
} from "@/types/database";

// ── System Prompts ─────────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a data extraction specialist. Analyze the HTML from a tradeshow sponsor page and extract a structured list of all sponsors with their sponsorship tiers.

Extract:
1. Every sponsor company name
2. Their sponsorship tier (Title, Platinum, Gold, Silver, Bronze, Digital, Supporting, or whatever tiers the event uses)
3. Any additional metadata visible (booth number, description, category)

Return your response as a JSON array. Each entry:
{
  "company": "Company Name",
  "tier": "Gold",
  "notes": "Any additional context from the page"
}

RULES:
- Extract EVERY sponsor, not just the top tiers.
- If the tier is unclear, use "Unknown".
- Normalize company names (remove "Inc.", "LLC", trailing punctuation).
- Do NOT invent companies. Only extract what is actually on the page.
- Return valid JSON only. No markdown fencing, no explanation outside the JSON.`;

const ANALYSIS_PROMPT = `You are the Tradeshow Scout, a sub-agent of RevSignal, a personal DaaS sales command center.

YOUR MISSION: Analyze every sponsor at this tradeshow as a potential buyer of pharosIQ's first-party intent data. Your output directly determines who Tina walks up to, who she has a strong conversation with, and who she avoids pitching.

ABOUT PHAROSIQ'S DATA ASSET

pharosIQ provides:
- First-party, permission-based intent data (NOT co-op, NOT scraped, NOT bidstream)
- Contact-level precision (identifies WHO is engaging, not just which company)
- 270M+ contacts across 25M+ global companies
- 650+ product intent categories
- Rooftop-level geographic precision
- Down-funnel buying signals from owned content ecosystem (expert newsletters, 500K+ curated content assets, 133M+ professional contacts)
- Delivery: API, flat file, cloud delivery, platform integration, or embedded/OEM

ICP CATEGORIES AND DEAL SIZES

Match each sponsor to the most appropriate category:

| ICP Category | Why They Buy | Deal Size Range |
|---|---|---|
| ABM Platforms | Need intent signals for account targeting. pharosIQ replaces or supplements Bombora co-op data with first-party, contact-level precision. | $200K-$500K |
| Sales Intelligence | Need intent data to enrich contact databases and identify in-market buyers | $100K-$300K |
| CRM/MAP Platforms | Want native intent data as a platform feature (OEM/embed) | $500K-$2M |
| Ad Tech / DSPs | Need B2B intent audiences for programmatic targeting | $100K-$250K |
| Data Enrichment | Want to add intent signals to their enrichment offering | $200K-$500K |
| Content Syndication | Layer intent signals on lead delivery for better targeting | $100K-$200K |
| Conversation Intelligence | Pre-conversation intent context makes their deal intelligence more powerful | $100K-$200K |
| Recruiting/HR Tech | Hiring intent signals identify companies about to scale teams | $100K-$300K |
| Financial Services | Alternative data for investment decisions and risk assessment | $200K-$500K |

If a company doesn't fit any ICP category, classify as "Outside ICP" and assign Priority 3.

KNOWN COMPETITORS (FLAG THESE)

These companies compete with pharosIQ. Do NOT pitch them. Mark as Priority 3 (competitive intel, listen only):
- Intentsify
- Demand Science / DemandScience
- Anteriad
- Bombora (direct competitor in intent data)
- TechTarget / Informa TechTarget (owns Priority Engine)
- ZoomInfo (if attending)

For competitors: note what to observe at their booth (pricing, positioning, new features, customer testimonials).

THE BOMBORA ANGLE

Many martech companies already buy intent data from Bombora. This is GOOD for pharosIQ because:
- Bombora = co-op model, account-level only, shared across all members
- pharosIQ = first-party, contact-level, exclusive signals from owned content ecosystem
- Pitch: "complementary, not replacement" (different signal source, higher precision, exclusive data)
- If a company already uses Bombora, they're a PROVEN BUYER of intent data. Easier to sell to, not harder.

Note which companies likely use Bombora and craft the specific Bombora differentiation angle for each.

PRIORITY ASSIGNMENT

Assign each sponsor ONE priority:

Priority 1: Walk Up (Green)
Requirements (ALL must be true):
- Strong ICP fit (the company clearly needs or already buys intent data)
- Estimated ACV >= $100K
- Clear decision-maker likely attending or identifiable
- Not a competitor

Priority 2: Strong Conversation (Blue)
Requirements (ANY of these):
- Moderate ICP fit (could buy, but not obvious)
- Expanding into areas where intent data adds value
- New leadership that might be evaluating data partnerships
- Known company but unclear who to talk to

Priority 3: Competitive Intel / Listen Only (Gray)
Assign when:
- Direct competitor (always Priority 3)
- Company straddles partner/competitor line
- Outside ICP (no clear data licensing fit)
- Too small or too early stage for meaningful deal

WHAT TO PRODUCE

For EACH sponsor, produce:

1. Company: Name exactly as listed
2. Sponsorship Tier: From the page
3. What They Do: 1-2 sentences. Focus on their product.
4. ICP Category: Best fit from the table above, or "Outside ICP"
5. ICP Fit Strength: Strong / Moderate / Weak
6. Estimated ACV: Dollar figure based on ICP deal size range (use midpoint unless justified otherwise)
7. Priority: priority_1_walk_up, priority_2_strong_conversation, or priority_3_competitive_intel
8. Priority Rationale: 1 sentence explaining WHY this priority level
9. Pitch Angle: 2-3 sentences. The specific value proposition for THIS company. Not generic.
10. Bombora Angle: If they likely use Bombora, the specific differentiation pitch. Null if not applicable.
11. Is Competitor: true/false
12. Competitor Notes: If competitor, what to observe at their booth

Return as a JSON array. Each entry:
{
  "company": "string",
  "sponsorship_tier": "string",
  "company_description": "string",
  "icp_category": "string",
  "icp_fit_strength": "Strong|Moderate|Weak",
  "estimated_acv": number,
  "priority": "priority_1_walk_up|priority_2_strong_conversation|priority_3_competitive_intel",
  "priority_rationale": "string",
  "pitch_angle": "string",
  "bombora_angle": "string|null",
  "is_competitor": boolean,
  "competitor_notes": "string|null"
}

CRITICAL RULES
- Do NOT invent companies. Only analyze the sponsors provided.
- Do NOT invent specific people or contact details. Contact research happens in a separate step.
- If you don't know what a company does, say "Research needed" rather than guessing.
- Be specific in pitch angles. "They could use intent data" is useless. WHY this company, what gap does it fill in THEIR product.
- Return valid JSON only.

VOICE RULES FOR pitch_angle AND bombora_angle FIELDS
Tina uses these verbatim in live conversations. Apply these rules to every pitch_angle and bombora_angle string:

${TINA_VOICE_RULES}`;

const CONTACT_RESEARCH_PROMPT = `You are the Tradeshow Scout's contact research specialist. Identify the best 2-4 people to talk to at a target company for a B2B intent data partnership.

The buyer at each company is typically one of:
- VP/SVP/Head of Partnerships or Business Development (owns data licensing deals)
- VP/SVP/CPO of Product (approves data integrations into the platform)
- VP/SVP of Data or Data Science (evaluates data quality and technical fit)
- Head of Strategy or Corporate Development (M&A, strategic partnerships)
- VP/SVP Sales or Marketing (understands the revenue impact of better data)

The best contacts are people who BOTH understand data AND have budget authority or influence over partnership decisions.

For each contact, produce:

1. Name: Full name if identifiable. If not, provide the role/title to search for.
2. Title: Current title
3. Why This Person: 1 sentence on why they're the right person for a data licensing conversation
4. LinkedIn URL: If constructable, provide it. Otherwise null.
5. Approach Strategy: 1-2 sentences on how to approach them. Be specific to their role.

Return as a JSON array:
{
  "name": "string",
  "title": "string",
  "why_this_person": "string",
  "linkedin_url": "string|null",
  "approach_strategy": "string"
}

RULES:
- Prefer real names found through research. If uncertain, describe the ROLE to find.
- NEVER fabricate LinkedIn URLs. If not confident, set to null.
- NEVER invent job titles or tenure. If uncertain, note "verify current title."
- Note if someone has a Bombora or intent data background (they'll understand faster).`;

// ── Types ──────────────────────────────────────────────────────────────

export interface ExtractedSponsor {
  company: string;
  tier: string;
  notes: string | null;
}

interface AnalyzedTarget {
  company: string;
  sponsorship_tier: string;
  company_description: string;
  icp_category: string;
  icp_fit_strength: string;
  estimated_acv: number;
  priority: TradeshowPriority;
  priority_rationale: string;
  pitch_angle: string;
  bombora_angle: string | null;
  is_competitor: boolean;
  competitor_notes: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Validate a URL from AI output — only allow http/https to prevent XSS. */
function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
}

/** Truncate HTML for DB storage (cap at 200KB). */
function truncateHtml(html: string, maxBytes = 200_000): string {
  return html.length > maxBytes ? html.slice(0, maxBytes) : html;
}

interface ResearchedContact {
  name: string;
  title: string;
  why_this_person: string;
  linkedin_url: string | null;
  approach_strategy: string;
}

// ── Step 1: Extract Sponsors ───────────────────────────────────────────

/**
 * Fetch the sponsor page HTML and extract sponsors via Claude.
 */
export async function extractSponsorsFromUrl(
  supabase: SupabaseClient,
  userId: string,
  url: string
): Promise<{ sponsors: ExtractedSponsor[]; rawHtml: string; tokensUsed: number }> {
  // Validate URL scheme to prevent SSRF
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only HTTP/HTTPS URLs are allowed");
  }
  // Block internal/private network ranges
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.") ||
    hostname.startsWith("192.168.") ||
    hostname === "169.254.169.254" ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Internal URLs are not allowed");
  }

  // Fetch the page HTML
  let rawHtml: string;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RevSignal/1.0)",
      },
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    rawHtml = await response.text();
  } catch (error) {
    throw new Error(
      `Failed to fetch sponsor page. Verify the URL is accessible.`
    );
  }

  return extractSponsorsFromHtml(supabase, userId, rawHtml);
}

/**
 * Extract sponsors from raw HTML content (for manual paste fallback).
 */
export async function extractSponsorsFromHtml(
  supabase: SupabaseClient,
  userId: string,
  rawHtml: string
): Promise<{ sponsors: ExtractedSponsor[]; rawHtml: string; tokensUsed: number }> {
  // Strip script, style, and head tags to reduce noise
  const cleanedHtml = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .slice(0, 100_000); // Truncate to 100K chars

  const anthropic = getAnthropic();

  const [response, durationMs] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extract all sponsors from this tradeshow sponsor page HTML:\n\n${cleanedHtml}`,
        },
      ],
    })
  );

  const text =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "[]";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  // Parse JSON from response
  let sponsors: ExtractedSponsor[];
  try {
    const parsed = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    sponsors = Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("[tradeshow-scout] Failed to parse sponsor extraction JSON");
    sponsors = [];
  }

  await logAgentCall({
    supabase,
    userId,
    agentName: "tradeshow-scout",
    action: "extract-sponsors",
    inputContext: { htmlLength: rawHtml.length, cleanedLength: cleanedHtml.length },
    output: `Extracted ${sponsors.length} sponsors`,
    sourcesCited: [],
    tokensUsed,
    durationMs,
  });

  return { sponsors, rawHtml, tokensUsed };
}

// ── Step 2: Analyze Tradeshow ──────────────────────────────────────────

/**
 * Analyze all sponsors at a tradeshow against pharosIQ's ICPs.
 * Writes results to tradeshow_targets table.
 */
export async function analyzeTradeshow(
  supabase: SupabaseClient,
  userId: string,
  tradeshowId: string,
  sponsors: ExtractedSponsor[]
): Promise<{ targets: TradeshowTarget[]; tokensUsed: number }> {
  // RAG retrieval — get pipeline context for overlap detection
  const [context, contextDurationMs] = await timed(() =>
    retrieveTradeshowContext(supabase, userId)
  );

  // Build context document
  const contextDoc = buildAnalysisContextDoc(sponsors, context);

  const anthropic = getAnthropic();

  const [response, generateDurationMs] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: ANALYSIS_PROMPT,
      messages: [
        {
          role: "user",
          content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
        },
      ],
    })
  );

  const text =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "[]";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  // Parse analysis results
  let analyzed: AnalyzedTarget[];
  try {
    const parsed = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    analyzed = Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("[tradeshow-scout] Failed to parse analysis JSON");
    analyzed = [];
  }

  // Check for existing deals/prospects to flag overlaps
  const dealMap = new Map(context.activeDeals.map((d) => [d.company.toLowerCase(), d]));
  const prospectMap = new Map(context.prospects.map((p) => [p.company.toLowerCase(), p]));

  // Write targets to DB
  const targetRows = analyzed.map((a, i) => {
    const existingDeal = dealMap.get(a.company.toLowerCase());
    const existingProspect = prospectMap.get(a.company.toLowerCase());

    return {
      tradeshow_id: tradeshowId,
      user_id: userId,
      company: a.company,
      sponsorship_tier: a.sponsorship_tier || null,
      company_description: a.company_description || null,
      icp_category: a.icp_category || null,
      icp_fit_strength: a.icp_fit_strength || null,
      estimated_acv: a.estimated_acv || null,
      priority: a.priority || null,
      priority_rationale: a.priority_rationale || null,
      pitch_angle: a.pitch_angle || null,
      is_competitor: a.is_competitor || false,
      competitor_notes: a.competitor_notes || null,
      bombora_angle: a.bombora_angle || null,
      existing_deal_id: existingDeal?.deal_id || null,
      existing_prospect_id: existingProspect?.id || null,
      sort_order: i,
    };
  });

  const { data: insertedTargets, error: insertError } = await supabase
    .from("tradeshow_targets")
    .insert(targetRows)
    .select("*");

  if (insertError) {
    console.error("[tradeshow-scout] Error inserting targets:", insertError.message);
    throw new Error("Failed to save analysis results");
  }

  const targets = (insertedTargets as TradeshowTarget[]) || [];

  // Update tradeshow with summary stats
  const totalPipeline = analyzed.reduce(
    (sum, a) => sum + (a.is_competitor ? 0 : a.estimated_acv || 0),
    0
  );

  await supabase
    .from("tradeshows")
    .update({
      total_sponsors: analyzed.length,
      total_estimated_pipeline: totalPipeline,
    })
    .eq("tradeshow_id", tradeshowId)
    .eq("user_id", userId);

  await logAgentCall({
    supabase,
    userId,
    agentName: "tradeshow-scout",
    action: "analyze-tradeshow",
    inputContext: {
      tradeshowId,
      sponsorCount: sponsors.length,
      contextDurationMs,
    },
    output: `Analyzed ${analyzed.length} sponsors. P1: ${analyzed.filter((a) => a.priority === "priority_1_walk_up").length}, P2: ${analyzed.filter((a) => a.priority === "priority_2_strong_conversation").length}, P3: ${analyzed.filter((a) => a.priority === "priority_3_competitive_intel").length}. Total pipeline: $${totalPipeline.toLocaleString()}`,
    sourcesCited: [],
    tokensUsed,
    durationMs: contextDurationMs + generateDurationMs,
  });

  return { targets, tokensUsed };
}

// ── Step 3: Research Contacts (on-demand) ──────────────────────────────

/**
 * Research best contacts for a specific tradeshow target.
 * Called on-demand when the user clicks "Research Contacts".
 */
export async function researchTargetContacts(
  supabase: SupabaseClient,
  userId: string,
  target: TradeshowTarget
): Promise<TradeshowContact[]> {
  // Update research status to researching
  await supabase
    .from("tradeshow_targets")
    .update({ research_status: "researching" })
    .eq("target_id", target.target_id)
    .eq("user_id", userId);

  const anthropic = getAnthropic();

  const contextDoc = `TARGET COMPANY: ${target.company}
What They Do: ${target.company_description || "Unknown"}
ICP Category: ${target.icp_category || "Unknown"}
Pitch Angle: ${target.pitch_angle || "Unknown"}
Bombora Angle: ${target.bombora_angle || "N/A"}`;

  let contacts: ResearchedContact[];
  let tokensUsed: number;
  let durationMs: number;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: CONTACT_RESEARCH_PROMPT,
        messages: [
          {
            role: "user",
            content: `Research the best contacts to approach at this company for a B2B intent data partnership:\n\n${contextDoc}`,
          },
        ],
      })
    );
    durationMs = dur;

    const text =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "[]";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    try {
      const parsed = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
      contacts = Array.isArray(parsed) ? parsed : [];
    } catch {
      console.error("[tradeshow-scout] Failed to parse contact research JSON");
      contacts = [];
    }
  } catch (error) {
    console.error(
      "[tradeshow-scout] Claude API error during contact research:",
      error instanceof Error ? error.message : error
    );

    await supabase
      .from("tradeshow_targets")
      .update({ research_status: "error" })
      .eq("target_id", target.target_id)
      .eq("user_id", userId);

    await logAgentCall({
      supabase,
      userId,
      agentName: "tradeshow-scout",
      action: "research-contacts",
      inputContext: { targetId: target.target_id, company: target.company },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });

    return [];
  }

  // Write contacts to DB (sanitize AI-generated URLs)
  const contactRows = contacts.map((c, i) => ({
    target_id: target.target_id,
    user_id: userId,
    name: c.name,
    title: c.title || null,
    why_this_person: c.why_this_person || null,
    linkedin_url: sanitizeUrl(c.linkedin_url),
    approach_strategy: c.approach_strategy || null,
    sort_order: i,
  }));

  const { data: insertedContacts, error: insertError } = await supabase
    .from("tradeshow_contacts")
    .insert(contactRows)
    .select("*");

  if (insertError) {
    console.error("[tradeshow-scout] Error inserting contacts:", insertError.message);
    await supabase
      .from("tradeshow_targets")
      .update({ research_status: "error" })
      .eq("target_id", target.target_id)
      .eq("user_id", userId);
    return [];
  }

  // Update target research status
  await supabase
    .from("tradeshow_targets")
    .update({ research_status: "complete" })
    .eq("target_id", target.target_id)
    .eq("user_id", userId);

  await logAgentCall({
    supabase,
    userId,
    agentName: "tradeshow-scout",
    action: "research-contacts",
    inputContext: { targetId: target.target_id, company: target.company },
    output: `Found ${contacts.length} contacts for ${target.company}`,
    sourcesCited: [],
    tokensUsed,
    durationMs,
  });

  return (insertedContacts as TradeshowContact[]) || [];
}

// ── Orchestrator ───────────────────────────────────────────────────────

/**
 * Run the full tradeshow analysis pipeline (Steps 1 + 2).
 * Step 3 (contact research) is on-demand.
 */
export async function runFullTradeshowAnalysis(
  supabase: SupabaseClient,
  userId: string,
  tradeshowId: string,
  name: string,
  sponsorPageUrl: string
): Promise<void> {
  try {
    // Update status to analyzing
    await supabase
      .from("tradeshows")
      .update({ status: "analyzing" })
      .eq("tradeshow_id", tradeshowId)
      .eq("user_id", userId);

    // Step 1: Extract sponsors
    const { sponsors, rawHtml, tokensUsed: extractTokens } =
      await extractSponsorsFromUrl(supabase, userId, sponsorPageUrl);

    if (sponsors.length === 0) {
      await supabase
        .from("tradeshows")
        .update({
          status: "error",
          analysis_summary: "No sponsors found on the page. Try pasting the HTML directly.",
          raw_html: truncateHtml(rawHtml),
        })
        .eq("tradeshow_id", tradeshowId)
        .eq("user_id", userId);
      return;
    }

    // Store raw HTML and update to partial
    await supabase
      .from("tradeshows")
      .update({
        status: "partial",
        raw_html: truncateHtml(rawHtml),
        total_sponsors: sponsors.length,
      })
      .eq("tradeshow_id", tradeshowId)
      .eq("user_id", userId);

    // Step 2: Analyze all sponsors
    const { tokensUsed: analyzeTokens } = await analyzeTradeshow(
      supabase,
      userId,
      tradeshowId,
      sponsors
    );

    // Update status to complete
    await supabase
      .from("tradeshows")
      .update({
        status: "complete",
        tokens_used: extractTokens + analyzeTokens,
        analyzed_at: new Date().toISOString(),
        analysis_summary: `Analyzed ${sponsors.length} sponsors from ${name}.`,
      })
      .eq("tradeshow_id", tradeshowId)
      .eq("user_id", userId);
  } catch (error) {
    console.error("[tradeshow-scout] Full analysis failed:", error);

    await supabase
      .from("tradeshows")
      .update({
        status: "error",
        analysis_summary: "Analysis failed. Please try again or paste the HTML directly.",
      })
      .eq("tradeshow_id", tradeshowId)
      .eq("user_id", userId);
  }
}

// ── Context Document Builders ──────────────────────────────────────────

function buildAnalysisContextDoc(
  sponsors: ExtractedSponsor[],
  context: {
    activeDeals: Deal[];
    prospects: Prospect[];
    competitiveIntel: CompetitiveIntel[];
  }
): string {
  const sections: string[] = [];

  // Sponsor list
  const sponsorLines = sponsors.map(
    (s) => `- ${s.company} (${s.tier})${s.notes ? ` — ${s.notes}` : ""}`
  );
  sections.push(
    `SPONSORS TO ANALYZE (${sponsors.length} total):\n${sponsorLines.join("\n")}`
  );

  // Active deals (for overlap detection)
  if (context.activeDeals.length > 0) {
    const dealLines = context.activeDeals.map(
      (d) => `- ${d.company} (${d.stage}, ACV: ${d.acv ? "$" + d.acv.toLocaleString() : "TBD"})`
    );
    sections.push(
      `EXISTING PIPELINE (${context.activeDeals.length} active deals):\n${dealLines.join("\n")}\n\nIf any sponsor matches an active deal, note the overlap.`
    );
  }

  // Existing prospects
  if (context.prospects.length > 0) {
    const prospectLines = context.prospects.slice(0, 30).map(
      (p) => `- ${p.company} (${p.icp_category || "uncategorized"})`
    );
    sections.push(
      `EXISTING PROSPECTS (${context.prospects.length} total, showing first 30):\n${prospectLines.join("\n")}`
    );
  }

  // Competitive intel
  if (context.competitiveIntel.length > 0) {
    const competitors = [...new Set(context.competitiveIntel.map((c) => c.competitor))];
    sections.push(
      `KNOWN COMPETITORS IN DATABASE: ${competitors.join(", ")}`
    );
  }

  return sections.join("\n\n");
}
