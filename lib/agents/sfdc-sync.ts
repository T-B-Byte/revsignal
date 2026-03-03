/**
 * SFDC Sync Agent — Prepares Salesforce sync payloads and detects conflicts.
 *
 * Responsibilities:
 *  - Generate structured sync payloads for deals (what to push to SFDC)
 *  - Detect conflicts between local RevSignal data and SFDC data
 *  - Flag conflicts for user resolution (never auto-resolve)
 *
 * Note: Actual SFDC API calls come in the integration phase.
 * This agent only prepares data and detects conflicts.
 *
 * Rules:
 *  - Never auto-advances deal stages
 *  - Flags all conflicts for user resolution
 *  - Maps RevSignal fields to SFDC field names
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import { retrieveDealContext } from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";
import type { DealStage } from "@/types/database";

// ── SFDC Field Mapping ─────────────────────────────────────────────────

const STAGE_MAP: Record<DealStage, string> = {
  lead: "Prospecting",
  qualified: "Qualification",
  discovery: "Needs Analysis",
  poc_trial: "Value Proposition",
  proposal: "Proposal/Price Quote",
  negotiation: "Negotiation/Review",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

interface FieldMapping {
  revSignalField: string;
  sfdcObject: string;
  sfdcField: string;
}

const FIELD_MAPPINGS: FieldMapping[] = [
  { revSignalField: "company", sfdcObject: "Account", sfdcField: "Name" },
  {
    revSignalField: "stage",
    sfdcObject: "Opportunity",
    sfdcField: "StageName",
  },
  { revSignalField: "acv", sfdcObject: "Opportunity", sfdcField: "Amount" },
  {
    revSignalField: "close_date",
    sfdcObject: "Opportunity",
    sfdcField: "CloseDate",
  },
  {
    revSignalField: "win_probability",
    sfdcObject: "Opportunity",
    sfdcField: "Probability",
  },
  {
    revSignalField: "notes",
    sfdcObject: "Opportunity",
    sfdcField: "Description",
  },
];

// ── System Prompt ──────────────────────────────────────────────────────

const SFDC_SYNC_IDENTITY = `You are the SFDC Sync Agent — a sub-agent of RevSignal, a personal DaaS sales command center.

Your job: analyze data conflicts between RevSignal and Salesforce. You help the user decide which data is correct when the two systems disagree.

Critical rules:
- NEVER auto-resolve conflicts. Present both values and recommend which is more likely correct.
- Base recommendations on conversation history and timestamps — newer data from conversations is more likely accurate.
- Flag any conflicts that could affect deal stage, pricing, or close dates as HIGH PRIORITY.
- Be precise about which system has which value and why one might be more current.`;

const CONFLICT_ANALYSIS_PROMPT = `${SFDC_SYNC_IDENTITY}

Analyze the data conflicts between RevSignal and Salesforce for this deal. For each conflict:

## Conflicts Found

For each conflicting field:
- **Field**: [field name]
- **RevSignal value**: [value]
- **Salesforce value**: [value]
- **Recommendation**: [which value to keep and why]
- **Priority**: [HIGH if it affects stage/pricing/dates, NORMAL otherwise]

## Summary
[One paragraph: how many conflicts, which are most important, overall recommendation]

Be specific. Reference conversation dates when they support which value is more current.`;

// ── Result Types ───────────────────────────────────────────────────────

export interface SyncField {
  revSignalField: string;
  sfdcField: string;
  sfdcObject: string;
  value: string | number | null;
}

export interface SyncActivity {
  type: string;
  subject: string;
  date: string;
  description: string;
}

export interface SyncPayload {
  dealId: string;
  company: string;
  sfdcOpportunityId: string | null;
  fields: SyncField[];
  activities: SyncActivity[];
  generatedAt: string;
}

export interface SyncConflict {
  field: string;
  localValue: string | number | null;
  sfdcValue: string | number | null;
  priority: "high" | "normal";
}

export interface ReconciliationResult {
  conflicts: SyncConflict[];
  analysis: string;
  generatedAt: string;
  tokensUsed: number;
}

// ── Sync Payload Preparation ─────────────────────────────────────────

/**
 * Prepare a structured sync payload for a deal.
 * Maps RevSignal fields to SFDC field names. No Claude call needed — deterministic mapping.
 */
export async function prepareSyncPayload(
  supabase: SupabaseClient,
  userId: string,
  dealId: string
): Promise<SyncPayload | null> {
  // Step 1: RAG retrieval
  const [dealContext, durationRetrieve] = await timed(() =>
    retrieveDealContext(supabase, userId, dealId)
  );

  if (!dealContext) return null;

  const { deal, conversations } = dealContext;

  // Step 2: Map fields (deterministic)
  const fields: SyncField[] = FIELD_MAPPINGS.map((mapping) => {
    let value: string | number | null = null;

    switch (mapping.revSignalField) {
      case "company":
        value = deal.company;
        break;
      case "stage":
        value = STAGE_MAP[deal.stage] ?? deal.stage;
        break;
      case "acv":
        value = deal.acv;
        break;
      case "close_date":
        value = deal.close_date;
        break;
      case "win_probability":
        value = deal.win_probability;
        break;
      case "notes":
        value = deal.notes;
        break;
    }

    return {
      revSignalField: mapping.revSignalField,
      sfdcField: mapping.sfdcField,
      sfdcObject: mapping.sfdcObject,
      value,
    };
  });

  // Step 3: Collect recent conversations as activities
  const activities: SyncActivity[] = conversations.slice(0, 10).map((c) => ({
    type: c.channel === "call" || c.channel === "teams" ? "Call" : "Email",
    subject: c.subject || `${c.channel} conversation`,
    date: c.date,
    description: c.ai_summary || "(no summary available)",
  }));

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "sfdc-sync",
    action: "prepare-sync-payload",
    inputContext: {
      dealId,
      company: deal.company,
      stage: deal.stage,
      fieldCount: fields.length,
      activityCount: activities.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: `Sync payload prepared: ${fields.length} fields, ${activities.length} activities`,
    sourcesCited: conversations.map((c) => c.conversation_id),
    durationMs: durationRetrieve,
  });

  return {
    dealId,
    company: deal.company,
    sfdcOpportunityId: deal.sfdc_opportunity_id ?? null,
    fields,
    activities,
    generatedAt: new Date().toISOString(),
  };
}

// ── Conflict Reconciliation ──────────────────────────────────────────

/**
 * Detect and analyze conflicts between local RevSignal data and SFDC data.
 * Uses Claude to recommend which values to keep.
 */
export async function reconcileSyncConflicts(
  supabase: SupabaseClient,
  userId: string,
  dealId: string,
  sfdcData: Record<string, string | number | null>
): Promise<ReconciliationResult | null> {
  // Step 1: RAG retrieval
  const [dealContext, durationRetrieve] = await timed(() =>
    retrieveDealContext(supabase, userId, dealId)
  );

  if (!dealContext) return null;

  const { deal } = dealContext;

  // Step 2: Detect conflicts (deterministic comparison)
  const conflicts: SyncConflict[] = [];

  const comparisons: {
    field: string;
    local: string | number | null;
    sfdc: string | number | null;
    isHighPriority: boolean;
  }[] = [
    {
      field: "stage",
      local: STAGE_MAP[deal.stage] ?? deal.stage,
      sfdc: sfdcData.StageName ?? null,
      isHighPriority: true,
    },
    {
      field: "acv",
      local: deal.acv,
      sfdc: sfdcData.Amount ?? null,
      isHighPriority: true,
    },
    {
      field: "close_date",
      local: deal.close_date,
      sfdc: sfdcData.CloseDate ?? null,
      isHighPriority: true,
    },
    {
      field: "win_probability",
      local: deal.win_probability,
      sfdc: sfdcData.Probability ?? null,
      isHighPriority: false,
    },
    {
      field: "notes",
      local: deal.notes,
      sfdc: sfdcData.Description ?? null,
      isHighPriority: false,
    },
  ];

  for (const comp of comparisons) {
    // Treat null and 0 as equivalent to avoid false positive conflicts
    const localNorm = comp.local === 0 ? null : comp.local;
    const sfdcNorm = comp.sfdc === 0 ? null : comp.sfdc;
    const localStr = localNorm?.toString() ?? "";
    const sfdcStr = sfdcNorm?.toString() ?? "";

    if (localStr !== sfdcStr && (localStr || sfdcStr)) {
      conflicts.push({
        field: comp.field,
        localValue: comp.local,
        sfdcValue: comp.sfdc,
        priority: comp.isHighPriority ? "high" : "normal",
      });
    }
  }

  if (conflicts.length === 0) {
    const noConflictResult: ReconciliationResult = {
      conflicts: [],
      analysis: "No conflicts detected. RevSignal and Salesforce data are in sync.",
      generatedAt: new Date().toISOString(),
      tokensUsed: 0,
    };

    await logAgentCall({
      supabase,
      userId,
      agentName: "sfdc-sync",
      action: "reconcile-conflicts",
      inputContext: {
        dealId,
        company: deal.company,
        conflictsFound: 0,
      },
      output: noConflictResult.analysis,
      sourcesCited: [],
      durationMs: durationRetrieve,
    });

    return noConflictResult;
  }

  // Step 3: Call Claude for conflict analysis
  const contextDoc = buildConflictContextDoc(dealContext, conflicts, sfdcData);
  const anthropic = getAnthropic();

  let analysisText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: CONFLICT_ANALYSIS_PROMPT,
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
        : "Failed to analyze conflicts.";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[sfdc-sync] Claude API error during conflict reconciliation:",
      error instanceof Error ? error.message : error
    );
    await logAgentCall({
      supabase,
      userId,
      agentName: "sfdc-sync",
      action: "reconcile-conflicts",
      inputContext: { dealId, conflictsFound: conflicts.length },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    return null;
  }

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "sfdc-sync",
    action: "reconcile-conflicts",
    inputContext: {
      dealId,
      company: deal.company,
      conflictsFound: conflicts.length,
      highPriority: conflicts.filter((c) => c.priority === "high").length,
      retrieveDurationMs: durationRetrieve,
    },
    output: analysisText,
    sourcesCited: dealContext.conversations.map((c) => c.conversation_id),
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    conflicts,
    analysis: analysisText,
    generatedAt: new Date().toISOString(),
    tokensUsed,
  };
}

// ── Context Document Builders ──────────────────────────────────────────

function buildConflictContextDoc(
  ctx: {
    deal: { company: string; stage: string; last_activity_date: string };
    conversations: { date: string; channel: string; ai_summary: string | null }[];
    brief: { brief_text: string } | null;
  },
  conflicts: SyncConflict[],
  sfdcData: Record<string, string | number | null>
): string {
  const sections: string[] = [];

  sections.push(
    `DEAL: ${ctx.deal.company}\nStage: ${ctx.deal.stage}\nLast activity: ${ctx.deal.last_activity_date}`
  );

  // Conflicts
  const conflictLines = conflicts.map(
    (c) =>
      `- ${c.field} [${c.priority.toUpperCase()}]: RevSignal="${c.localValue}" vs SFDC="${c.sfdcValue}"`
  );
  sections.push(`CONFLICTS (${conflicts.length}):\n${conflictLines.join("\n")}`);

  // SFDC data snapshot
  const sfdcLines = Object.entries(sfdcData)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `- ${k}: ${v}`);
  if (sfdcLines.length > 0) {
    sections.push(`SFDC DATA SNAPSHOT:\n${sfdcLines.join("\n")}`);
  }

  // Deal brief for context
  if (ctx.brief) {
    sections.push(`DEAL BRIEF:\n${ctx.brief.brief_text}`);
  }

  // Recent conversations (help determine what's most current)
  const recent = ctx.conversations.slice(0, 5);
  if (recent.length > 0) {
    const convoLines = recent.map(
      (c) =>
        `- [${c.date}] ${c.channel}: ${c.ai_summary || "(no summary)"}`
    );
    sections.push(`RECENT CONVERSATIONS:\n${convoLines.join("\n")}`);
  }

  return sections.join("\n\n");
}
