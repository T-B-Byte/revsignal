/**
 * Prospect Scout — Research and discovery agent.
 *
 * Responsibilities:
 *  - Research specific companies (generate research notes, suggest contacts)
 *  - Analyze companies from URLs (fetch site, assess DaaS fit)
 *  - Suggest new prospect targets based on pipeline gaps and ICP analysis
 *  - Pre-compute and store fit analysis on every prospect record
 *
 * Rules:
 *  - Every call uses RAG retrieval first
 *  - Never invents company details, contacts, or financials
 *  - Clearly labels what is known vs. what is inferred/suggested
 *  - Sources all factual claims
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import {
  retrieveProspects,
  retrievePipelineContext,
} from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";
import type { Deal, Prospect, FitScore, SuggestedContact } from "@/types/database";

// ── System Prompts ─────────────────────────────────────────────────────

const PROSPECT_SCOUT_IDENTITY = `You are the Prospect Scout — a sub-agent of RevSignal, a personal DaaS sales command center.

Your job: find and research companies that could buy pharosIQ's first-party intent data as a DaaS offering. You help fill the pipeline with qualified prospects.

Key context:
- Product: pharosIQ's proprietary first-party intent data (270M+ contacts, 650+ intent categories)
- Delivery: API, flat file, cloud delivery, platform integration, or embedded/OEM
- Target ACV: ~$100K average, range $50K-$500K depending on integration depth
- ICP categories: ABM Platforms, Sales Intelligence, Marketing Automation, Data Enrichment, CRM Platforms, CDPs, RevOps Platforms, Ad Tech / DSPs, Market Research / Analytics

Your personality:
- Analytical and thorough, but concise.
- When researching a company, focus on WHY they would buy intent data, not generic company descriptions.
- Identify the business case: what product gap does our data fill? Who is the buyer?

Critical rules:
- NEVER invent company financials, employee counts, or specific contact details.
- If you don't have information, say "Research needed" — don't guess.
- Clearly distinguish between facts from the database and your analytical inferences.
- Always suggest a specific next action.`;

const PROSPECT_RESEARCH_PROMPT = `${PROSPECT_SCOUT_IDENTITY}

Research the target company described below. Return your analysis in TWO parts:

PART 1: A JSON block (fenced with \`\`\`json) containing structured fit data:
\`\`\`json
{
  "fit_score": "strong" | "moderate" | "weak" | "not_a_fit",
  "icp_category": "Best ICP category name or null",
  "estimated_acv": null or number (annual contract value estimate in USD),
  "why_they_buy": "1-2 sentence summary of the core business case",
  "suggested_contacts": [
    { "title": "VP Data Partnerships", "why_they_care": "reason", "approach": "how to approach" }
  ],
  "next_action": "The single most important thing to do next",
  "website": "company website URL if known, otherwise null"
}
\`\`\`

PART 2: A narrative research analysis with these sections:

## Company Assessment
[Why would this company buy pharosIQ's intent data? What product or service gap does it fill?]

## ICP Fit
[Which ICP category fits best and why. Explain the fit score from the JSON above.]

## Suggested Contacts
[Expand on each contact from the JSON — why target them, what messaging to use.]

## Estimated ACV Range
[Reasoning behind the number. If insufficient data, explain what's missing.]

## Next Action
[Expand on the action from the JSON above.]

Be specific. Generic "they could use data" analysis is useless. Why THIS company, why NOW.`;

const URL_ANALYSIS_PROMPT = `${PROSPECT_SCOUT_IDENTITY}

You are analyzing a company based on their website content. The user has provided a URL and you have been given the cleaned HTML from that site.

From the website content and your knowledge, determine:
1. What the company does
2. Whether they would benefit from embedding pharosIQ's first-party intent data
3. The specific business case for a DaaS partnership

Return your analysis in TWO parts:

PART 1: A JSON block (fenced with \`\`\`json) containing structured fit data:
\`\`\`json
{
  "company_name": "Extracted company name",
  "fit_score": "strong" | "moderate" | "weak" | "not_a_fit",
  "icp_category": "Best ICP category name or null",
  "estimated_acv": null or number (annual contract value estimate in USD),
  "why_they_buy": "1-2 sentence summary of the core business case",
  "suggested_contacts": [
    { "title": "VP Data Partnerships", "why_they_care": "reason", "approach": "how to approach" }
  ],
  "next_action": "The single most important thing to do next"
}
\`\`\`

PART 2: Narrative research analysis:

## Company Assessment
[What they do and why they'd buy pharosIQ intent data. Be specific about the product gap.]

## ICP Fit
[Category and reasoning. Explain the fit score.]

## Suggested Contacts
[Roles to target with approach strategy.]

## Estimated ACV Range
[Reasoning. If the website doesn't reveal enough about company size, say so.]

## Next Action
[Clear, specific action.]

Focus on signals from their website — product pages, integrations, data partnerships, customer segments — that indicate intent data would strengthen their offering.`;

const PROSPECT_SUGGESTION_PROMPT = `${PROSPECT_SCOUT_IDENTITY}

Analyze the current pipeline and suggest where to focus prospecting efforts.

For each suggestion, provide:
- ICP category to focus on
- Why this category is a gap (based on pipeline data)
- Types of companies to target
- Estimated ACV range for this category
- Specific characteristics to look for

Also note:
- Which pipeline segments are healthy (don't need more prospects)
- Overall pipeline health assessment
- Revenue pacing context

Structure:
## Pipeline Gap Analysis
[Overview of which ICP categories are covered vs. missing]

## Prospecting Priorities
[Ranked list of 2-4 ICP categories or company types to focus on]

## Pipeline Health Note
[One paragraph on overall pipeline state and prospecting urgency]`;

// ── Result Types ───────────────────────────────────────────────────────

export interface ProspectResearchResult {
  prospectId: string | null;
  company: string;
  researchNotes: string;
  icpCategory: string | null;
  nextAction: string;
  fitScore: FitScore | null;
  fitAnalysis: string | null;
  whyTheyBuy: string | null;
  suggestedContacts: SuggestedContact[];
  estimatedAcv: number | null;
  website: string | null;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

/** Structured data extracted from Claude's JSON block */
interface ParsedFitData {
  fit_score: FitScore | null;
  icp_category: string | null;
  estimated_acv: number | null;
  why_they_buy: string | null;
  suggested_contacts: SuggestedContact[];
  next_action: string | null;
  website: string | null;
  company_name?: string | null;
}

// ── Fit Data Extraction ─────────────────────────────────────────────

const VALID_FIT_SCORES: FitScore[] = ["strong", "moderate", "weak", "not_a_fit"];

/** Extract structured JSON from Claude's response text. */
function parseFitData(text: string): ParsedFitData {
  const defaults: ParsedFitData = {
    fit_score: null,
    icp_category: null,
    estimated_acv: null,
    why_they_buy: null,
    suggested_contacts: [],
    next_action: null,
    website: null,
    company_name: null,
  };

  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) return defaults;

  try {
    const parsed = JSON.parse(jsonMatch[1].trim());
    return {
      fit_score: VALID_FIT_SCORES.includes(parsed.fit_score) ? parsed.fit_score : null,
      icp_category: typeof parsed.icp_category === "string" ? parsed.icp_category : null,
      estimated_acv: typeof parsed.estimated_acv === "number" && parsed.estimated_acv > 0 ? parsed.estimated_acv : null,
      why_they_buy: typeof parsed.why_they_buy === "string" ? parsed.why_they_buy : null,
      suggested_contacts: Array.isArray(parsed.suggested_contacts)
        ? parsed.suggested_contacts
            .filter((c: Record<string, unknown>) => typeof c.title === "string")
            .map((c: Record<string, unknown>) => ({
              title: String(c.title),
              why_they_care: typeof c.why_they_care === "string" ? c.why_they_care : "",
              approach: typeof c.approach === "string" ? c.approach : "",
            }))
        : [],
      next_action: typeof parsed.next_action === "string" ? parsed.next_action : null,
      website: typeof parsed.website === "string" ? parsed.website : null,
      company_name: typeof parsed.company_name === "string" ? parsed.company_name : null,
    };
  } catch {
    console.warn("[prospect-scout] Failed to parse fit JSON from Claude response");
    return defaults;
  }
}

/** Strip the JSON block from Claude's response to get just the narrative. */
function stripJsonBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```\s*/, "").trim();
}

// ── URL Fetching ────────────────────────────────────────────────────

/** Validate URL and block private/internal network ranges. */
function validateExternalUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only HTTP/HTTPS URLs are allowed");
  }
  const hostname = parsed.hostname.toLowerCase();
  // Block private/internal network ranges including IPv6
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]" ||
    hostname === "[::ffff:127.0.0.1]" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname === "169.254.169.254" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    // Private range 172.16.0.0/12
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    // Block numeric-only hostnames (decimal IP bypass)
    /^\d+$/.test(hostname) ||
    // Block IPv6 brackets
    hostname.startsWith("[")
  ) {
    throw new Error("Internal URLs are not allowed");
  }
  return parsed;
}

/** Fetch and clean HTML from a URL for analysis. */
async function fetchAndCleanHtml(url: string): Promise<string> {
  validateExternalUrl(url);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "RevSignal-ProspectScout/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Strip script, style, head, nav, footer tags to focus on content
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80_000); // Cap at 80K chars for Claude context
}

export interface ProspectSuggestionResult {
  suggestions: string;
  pipelineGaps: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

// ── Prospect Research ────────────────────────────────────────────────

/**
 * Research a specific company as a potential prospect.
 * Checks for duplicates, generates research notes, upserts to prospects table.
 */
export async function runProspectResearch(
  supabase: SupabaseClient,
  userId: string,
  company: string,
  icpCategory?: string
): Promise<ProspectResearchResult | null> {
  // Step 1: RAG retrieval — check for existing data (parallel)
  const [[existingProspects, durationRetrieve1], [pipelineContext, durationRetrieve2]] =
    await Promise.all([
      timed(() => retrieveProspects(supabase, userId, { limit: 50 })),
      timed(() => retrievePipelineContext(supabase, userId)),
    ]);

  // Check if company already exists as a deal
  const existingDeal = pipelineContext.activeDeals.find(
    (d) => d.company.toLowerCase() === company.toLowerCase()
  );

  // Check if company already exists as a prospect
  const existingProspect = existingProspects.find(
    (p) => p.company.toLowerCase() === company.toLowerCase()
  );

  // Step 2: Build context document
  const contextDoc = buildResearchContextDoc(
    company,
    icpCategory ?? null,
    existingDeal ?? null,
    existingProspect ?? null,
    pipelineContext.activeDeals
  );

  // Step 3: Generate research
  const anthropic = getAnthropic();

  let researchText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: PROSPECT_RESEARCH_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
          },
        ],
      })
    );
    durationGenerate = dur;

    researchText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "Failed to generate research.";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[prospect-scout] Claude API error during prospect research:",
      error instanceof Error ? error.message : error
    );
    await logAgentCall({
      supabase,
      userId,
      agentName: "prospect-scout",
      action: "prospect-research",
      inputContext: { company, icpCategory: icpCategory ?? null },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    return null;
  }

  // Step 4: Extract structured fit data from Claude's response
  const fitData = parseFitData(researchText);
  const narrativeText = stripJsonBlock(researchText);

  // Step 5: Upsert to prospects table with fit fields
  const now = new Date().toISOString();
  const resolvedIcp = icpCategory ?? fitData.icp_category;

  const prospectFields = {
    research_notes: narrativeText,
    icp_category: resolvedIcp ?? (existingProspect?.icp_category || null),
    last_researched_date: now,
    updated_at: now,
    fit_score: fitData.fit_score,
    fit_analysis: narrativeText,
    why_they_buy: fitData.why_they_buy,
    suggested_contacts: fitData.suggested_contacts,
    next_action: fitData.next_action ?? "Review research and decide on outreach strategy.",
    estimated_acv: fitData.estimated_acv,
    website: fitData.website,
  };

  let prospectId: string | null = null;

  if (existingProspect) {
    prospectId = existingProspect.id;
    const { error: dbError } = await supabase
      .from("prospects")
      .update(prospectFields)
      .eq("id", existingProspect.id)
      .eq("user_id", userId);
    if (dbError) {
      console.error("[prospect-scout] DB update error:", dbError.message);
    }
  } else {
    const { data: inserted, error: dbError } = await supabase.from("prospects").insert({
      user_id: userId,
      company,
      source: "prospect-scout",
      contacts: [],
      ...prospectFields,
    }).select("id").single();
    if (dbError) {
      console.error("[prospect-scout] DB insert error:", dbError.message);
    }
    if (inserted) prospectId = inserted.id;
  }

  const totalRetrieveDuration = durationRetrieve1 + durationRetrieve2;

  // Step 6: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "prospect-scout",
    action: "prospect-research",
    inputContext: {
      company,
      icpCategory: icpCategory ?? null,
      existingDeal: existingDeal?.company ?? null,
      existingProspect: existingProspect?.company ?? null,
      retrieveDurationMs: totalRetrieveDuration,
    },
    output: narrativeText,
    sourcesCited: [],
    tokensUsed,
    durationMs: totalRetrieveDuration + durationGenerate,
  });

  return {
    prospectId,
    company,
    researchNotes: narrativeText,
    icpCategory: resolvedIcp,
    nextAction: fitData.next_action ?? "Review research and decide on outreach strategy.",
    fitScore: fitData.fit_score,
    fitAnalysis: narrativeText,
    whyTheyBuy: fitData.why_they_buy,
    suggestedContacts: fitData.suggested_contacts,
    estimatedAcv: fitData.estimated_acv,
    website: fitData.website,
    generatedAt: new Date().toISOString(),
    sourcesCited: [],
    tokensUsed,
  };
}

// ── Prospect Suggestions ─────────────────────────────────────────────

/**
 * Analyze pipeline gaps and suggest where to focus prospecting.
 */
export async function suggestProspects(
  supabase: SupabaseClient,
  userId: string
): Promise<ProspectSuggestionResult> {
  // Step 1: RAG retrieval (parallel)
  const [[pipelineContext, durationRetrieve1], [existingProspects, durationRetrieve2]] =
    await Promise.all([
      timed(() => retrievePipelineContext(supabase, userId)),
      timed(() => retrieveProspects(supabase, userId, { limit: 50 })),
    ]);

  // Step 2: Build context
  const contextDoc = buildSuggestionContextDoc(
    pipelineContext.activeDeals,
    pipelineContext.closedWonDeals,
    pipelineContext.closedLostDeals,
    pipelineContext.totalClosedRevenue,
    existingProspects
  );

  // Step 3: Generate suggestions
  const anthropic = getAnthropic();

  let suggestionsText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: PROSPECT_SUGGESTION_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
          },
        ],
      })
    );
    durationGenerate = dur;

    suggestionsText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "Failed to generate suggestions.";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[prospect-scout] Claude API error during prospect suggestions:",
      error instanceof Error ? error.message : error
    );
    suggestionsText = "Suggestion generation failed due to an API error.";
    tokensUsed = 0;
  }

  const totalRetrieveDuration = durationRetrieve1 + durationRetrieve2;

  // Extract pipeline gaps section
  const gapsMatch = suggestionsText.match(
    /## Pipeline Gap Analysis\s*\n([\s\S]*?)(?:\n##|$)/
  );
  const pipelineGaps = gapsMatch?.[1]?.trim() ?? "";

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "prospect-scout",
    action: "prospect-suggestions",
    inputContext: {
      activeDeals: pipelineContext.activeDeals.length,
      existingProspects: existingProspects.length,
      closedRevenue: pipelineContext.totalClosedRevenue,
      retrieveDurationMs: totalRetrieveDuration,
    },
    output: suggestionsText,
    sourcesCited: [],
    tokensUsed,
    durationMs: totalRetrieveDuration + durationGenerate,
  });

  return {
    suggestions: suggestionsText,
    pipelineGaps,
    generatedAt: new Date().toISOString(),
    sourcesCited: [],
    tokensUsed,
  };
}

// ── URL Analysis ────────────────────────────────────────────────────

/**
 * Analyze a company from their website URL.
 * Fetches the page, runs Claude analysis, creates/updates prospect with fit data.
 */
export async function analyzeCompanyFromUrl(
  supabase: SupabaseClient,
  userId: string,
  url: string
): Promise<ProspectResearchResult | null> {
  // Step 1: Fetch and clean the URL content
  let siteContent: string;
  try {
    siteContent = await fetchAndCleanHtml(url);
  } catch (error) {
    console.error("[prospect-scout] URL fetch error:", error instanceof Error ? error.message : error);
    await logAgentCall({
      supabase,
      userId,
      agentName: "prospect-scout",
      action: "url-analysis",
      inputContext: { url },
      output: `URL fetch error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    throw error;
  }

  if (siteContent.length < 100) {
    throw new Error("Page content too short to analyze. The site may require authentication or JavaScript rendering.");
  }

  // Step 2: RAG retrieval for pipeline context (parallel)
  const [[existingProspects, durationRetrieve1], [pipelineContext, durationRetrieve2]] =
    await Promise.all([
      timed(() => retrieveProspects(supabase, userId, { limit: 50 })),
      timed(() => retrievePipelineContext(supabase, userId)),
    ]);

  // Step 3: Build context with site content
  const pipelineSection = pipelineContext.activeDeals.length > 0
    ? `\nCURRENT PIPELINE (${pipelineContext.activeDeals.length} active deals):\n${pipelineContext.activeDeals.map((d) => `- ${d.company} (${d.stage}, ACV: ${d.acv ? "$" + d.acv.toLocaleString() : "TBD"})`).join("\n")}`
    : "";

  const contextDoc = `URL: ${url}\n\nWEBSITE CONTENT:\n${siteContent}\n${pipelineSection}`;

  // Step 4: Claude analysis
  const anthropic = getAnthropic();
  let analysisText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: URL_ANALYSIS_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
          },
        ],
      })
    );
    durationGenerate = dur;

    analysisText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "Failed to generate analysis.";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error("[prospect-scout] Claude API error during URL analysis:", error instanceof Error ? error.message : error);
    await logAgentCall({
      supabase,
      userId,
      agentName: "prospect-scout",
      action: "url-analysis",
      inputContext: { url },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    return null;
  }

  // Step 5: Extract structured fit data
  const fitData = parseFitData(analysisText);
  const narrativeText = stripJsonBlock(analysisText);
  // Extract company name: prefer Claude's extraction, fall back to domain
  // For "app.hubspot.com" → "hubspot", for "6sense.com" → "6sense"
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const domainParts = hostname.split(".");
  // Use second-to-last part for subdomains (app.hubspot.com → hubspot), first part for simple domains
  const domainFallback = domainParts.length > 2 ? domainParts[domainParts.length - 2] : domainParts[0];
  const companyName = fitData.company_name ?? domainFallback;

  // Step 6: Check for existing prospect by company name
  const existingProspect = existingProspects.find(
    (p) => p.company.toLowerCase() === companyName.toLowerCase()
  );

  // Step 7: Upsert prospect with all fit data
  const now = new Date().toISOString();

  const prospectFields = {
    research_notes: narrativeText,
    icp_category: fitData.icp_category,
    last_researched_date: now,
    updated_at: now,
    fit_score: fitData.fit_score,
    fit_analysis: narrativeText,
    why_they_buy: fitData.why_they_buy,
    suggested_contacts: fitData.suggested_contacts,
    next_action: fitData.next_action ?? "Review analysis and decide on outreach approach.",
    estimated_acv: fitData.estimated_acv,
    website: url,
  };

  let prospectId: string | null = null;

  if (existingProspect) {
    prospectId = existingProspect.id;
    const { error: dbError } = await supabase
      .from("prospects")
      .update(prospectFields)
      .eq("id", existingProspect.id)
      .eq("user_id", userId);
    if (dbError) {
      console.error("[prospect-scout] DB update error (URL analysis):", dbError.message);
    }
  } else {
    const { data: inserted, error: dbError } = await supabase.from("prospects").insert({
      user_id: userId,
      company: companyName,
      source: "url-analysis",
      contacts: [],
      ...prospectFields,
    }).select("id").single();
    if (dbError) {
      console.error("[prospect-scout] DB insert error (URL analysis):", dbError.message);
    }
    if (inserted) prospectId = inserted.id;
  }

  const totalRetrieveDuration = durationRetrieve1 + durationRetrieve2;

  // Step 8: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "prospect-scout",
    action: "url-analysis",
    inputContext: {
      url,
      companyName,
      existingProspect: existingProspect?.company ?? null,
      retrieveDurationMs: totalRetrieveDuration,
    },
    output: narrativeText,
    sourcesCited: [],
    tokensUsed,
    durationMs: totalRetrieveDuration + durationGenerate,
  });

  return {
    prospectId,
    company: companyName,
    researchNotes: narrativeText,
    icpCategory: fitData.icp_category,
    nextAction: fitData.next_action ?? "Review analysis and decide on outreach approach.",
    fitScore: fitData.fit_score,
    fitAnalysis: narrativeText,
    whyTheyBuy: fitData.why_they_buy,
    suggestedContacts: fitData.suggested_contacts,
    estimatedAcv: fitData.estimated_acv,
    website: url,
    generatedAt: new Date().toISOString(),
    sourcesCited: [],
    tokensUsed,
  };
}

// ── Context Document Builders ──────────────────────────────────────────

function buildResearchContextDoc(
  company: string,
  icpCategory: string | null,
  existingDeal: Deal | null,
  existingProspect: Prospect | null,
  activeDeals: Deal[]
): string {
  const sections: string[] = [];

  sections.push(`TARGET COMPANY: ${company}`);

  if (icpCategory) {
    sections.push(`SUGGESTED ICP CATEGORY: ${icpCategory}`);
  }

  if (existingDeal) {
    sections.push(
      `NOTE: This company already has an active deal (stage: ${existingDeal.stage}, ACV: ${existingDeal.acv ? "$" + existingDeal.acv.toLocaleString() : "TBD"}). Research should complement the existing deal context.`
    );
  }

  if (existingProspect) {
    sections.push(
      `EXISTING PROSPECT DATA:\n` +
        `ICP Category: ${existingProspect.icp_category || "unset"}\n` +
        `Estimated ACV: ${existingProspect.estimated_acv ? "$" + existingProspect.estimated_acv.toLocaleString() : "not estimated"}\n` +
        `Last researched: ${existingProspect.last_researched_date || "never"}\n` +
        (existingProspect.research_notes
          ? `Previous research:\n${existingProspect.research_notes}`
          : "")
    );
  }

  // Pipeline context for comparison
  if (activeDeals.length > 0) {
    const dealSummary = activeDeals.map(
      (d) => `- ${d.company} (${d.stage}, ACV: ${d.acv ? "$" + d.acv.toLocaleString() : "TBD"})`
    );
    sections.push(`CURRENT PIPELINE (${activeDeals.length} active deals):\n${dealSummary.join("\n")}`);
  }

  return sections.join("\n\n");
}

function buildSuggestionContextDoc(
  activeDeals: Deal[],
  closedWonDeals: Deal[],
  closedLostDeals: Deal[],
  totalClosedRevenue: number,
  existingProspects: Prospect[]
): string {
  const sections: string[] = [];

  // Revenue pacing
  const REVENUE_TARGET = 1_000_000;
  const pacing = totalClosedRevenue / REVENUE_TARGET;
  sections.push(
    `REVENUE STATUS:\n` +
      `Closed: $${totalClosedRevenue.toLocaleString()} of $${REVENUE_TARGET.toLocaleString()} (${Math.round(pacing * 100)}%)\n` +
      `Active deals: ${activeDeals.length}`
  );

  // Active deals by ICP category (if tagged on contacts)
  if (activeDeals.length > 0) {
    const dealLines = activeDeals.map(
      (d) =>
        `- ${d.company} | ${d.stage} | ACV: ${d.acv ? "$" + d.acv.toLocaleString() : "TBD"}`
    );
    sections.push(`ACTIVE DEALS:\n${dealLines.join("\n")}`);
  } else {
    sections.push("ACTIVE DEALS: None — pipeline needs filling.");
  }

  // Closed won (what worked)
  if (closedWonDeals.length > 0) {
    const wonLines = closedWonDeals.map(
      (d) => `- ${d.company} ($${(d.acv || 0).toLocaleString()})`
    );
    sections.push(`CLOSED WON (what worked):\n${wonLines.join("\n")}`);
  }

  // Closed lost (what didn't)
  if (closedLostDeals.length > 0) {
    const lostLines = closedLostDeals.map(
      (d) =>
        `- ${d.company}${d.lost_reason ? ` — ${d.lost_reason}` : ""}`
    );
    sections.push(`RECENTLY LOST (avoid similar profiles):\n${lostLines.join("\n")}`);
  }

  // Existing prospects
  if (existingProspects.length > 0) {
    const prospectLines = existingProspects.map(
      (p) =>
        `- ${p.company} (${p.icp_category || "uncategorized"})${p.last_researched_date ? ` — researched ${p.last_researched_date}` : ""}`
    );
    sections.push(
      `EXISTING PROSPECTS (${existingProspects.length}):\n${prospectLines.join("\n")}`
    );
  }

  return sections.join("\n\n");
}
