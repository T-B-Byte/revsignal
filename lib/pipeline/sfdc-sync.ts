/**
 * Salesforce Bi-Directional Sync Pipeline
 *
 * Pulls changes from SFDC and pushes local changes back.
 * Detects conflicts and flags them for user resolution.
 *
 * Used by: api/cron/sfdc-sync (hourly)
 */

import { SupabaseClient } from "@supabase/supabase-js";
import * as sfdc from "@/lib/integrations/salesforce";
import {
  prepareSyncPayload,
  reconcileSyncConflicts,
} from "@/lib/agents/sfdc-sync";
import type { Deal, DealStage } from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────

export interface SyncResult {
  pullResults: PullResult;
  pushResults: PushResult;
  conflicts: ConflictRecord[];
  errors: string[];
}

export interface PullResult {
  accountsUpdated: number;
  contactsUpdated: number;
  opportunitiesUpdated: number;
  newRecords: number;
}

export interface PushResult {
  activitiesLogged: number;
  opportunitiesUpdated: number;
  recordsCreated: number;
}

export interface ConflictRecord {
  dealId: string;
  company: string;
  field: string;
  localValue: string | number | null;
  sfdcValue: string | number | null;
  priority: "high" | "normal";
}

// ── SFDC Stage Mapping ────────────────────────────────────────────────

const SFDC_TO_LOCAL_STAGE: Record<string, DealStage> = {
  "Prospecting": "lead",
  "Qualification": "qualified",
  "Needs Analysis": "discovery",
  "Demo Scheduled": "demo_booked",
  "Value Proposition": "discovery",
  "Perception Analysis": "poc_trial",
  "Proposal/Price Quote": "proposal",
  "Negotiation/Review": "negotiation",
  "Closed Won": "closed_won",
  "Closed Lost": "closed_lost",
};

const LOCAL_TO_SFDC_STAGE: Record<DealStage, string> = {
  conversation: "Initial Contact",
  lead: "Prospecting",
  qualified: "Qualification",
  discovery: "Needs Analysis",
  demo_booked: "Demo Scheduled",
  poc_trial: "Perception Analysis",
  proposal: "Proposal/Price Quote",
  negotiation: "Negotiation/Review",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

// ── Pull: SFDC → RevSignal ──────────────────────────────────────────

/**
 * Pull changes from Salesforce and update local records.
 * Matches SFDC Opportunities to local deals by sfdc_opportunity_id.
 */
export async function pullFromSalesforce(
  supabase: SupabaseClient,
  userId: string,
  options: { since?: string } = {}
): Promise<PullResult & { conflicts: ConflictRecord[]; errors: string[] }> {
  const result: PullResult = {
    accountsUpdated: 0,
    contactsUpdated: 0,
    opportunitiesUpdated: 0,
    newRecords: 0,
  };
  const conflicts: ConflictRecord[] = [];
  const errors: string[] = [];

  // Pull updated opportunities
  const oppsResult = await sfdc.getOpportunities(supabase, userId, {
    modifiedSince: options.since,
    limit: 100,
  });

  if (oppsResult.source === "manual") {
    errors.push(oppsResult.error ?? "Salesforce not connected");
    return { ...result, conflicts, errors };
  }

  // Get all local deals with SFDC IDs for matching
  const { data: localDeals } = await supabase
    .from("deals")
    .select("*")
    .eq("user_id", userId)
    .not("sfdc_opportunity_id", "is", null);

  const dealsBySfdcId = new Map(
    ((localDeals as Deal[]) ?? []).map((d) => [d.sfdc_opportunity_id!, d])
  );

  for (const opp of oppsResult.data) {
    try {
      const localDeal = dealsBySfdcId.get(opp.Id);

      if (localDeal) {
        // Existing deal — check for conflicts before updating
        const sfdcStage = SFDC_TO_LOCAL_STAGE[opp.StageName] ?? localDeal.stage;

        // Detect conflicts
        if (
          sfdcStage !== localDeal.stage &&
          localDeal.stage !== SFDC_TO_LOCAL_STAGE[opp.StageName]
        ) {
          conflicts.push({
            dealId: localDeal.deal_id,
            company: localDeal.company,
            field: "stage",
            localValue: localDeal.stage,
            sfdcValue: opp.StageName,
            priority: "high",
          });
        }

        if (opp.Amount !== null && opp.Amount !== localDeal.acv) {
          conflicts.push({
            dealId: localDeal.deal_id,
            company: localDeal.company,
            field: "acv",
            localValue: localDeal.acv,
            sfdcValue: opp.Amount,
            priority: "high",
          });
        }

        // Update non-conflicting fields
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        // Only auto-update if no stage conflict
        if (!conflicts.some((c) => c.dealId === localDeal.deal_id && c.field === "stage")) {
          if (sfdcStage !== localDeal.stage) {
            updates.stage = sfdcStage;
          }
        }

        if (opp.CloseDate && opp.CloseDate !== localDeal.close_date) {
          updates.close_date = opp.CloseDate;
        }

        if (opp.Probability !== null) {
          updates.win_probability = opp.Probability;
        }

        if (Object.keys(updates).length > 1) {
          await supabase
            .from("deals")
            .update(updates)
            .eq("deal_id", localDeal.deal_id)
            .eq("user_id", userId);
          result.opportunitiesUpdated++;
        }
      }
      // New opportunities from SFDC are not auto-created as deals.
      // The Strategist suggests them — user must confirm.
    } catch (error) {
      errors.push(
        `Opp ${opp.Id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Pull updated contacts
  const contactsResult = await sfdc.getContacts(supabase, userId, {
    modifiedSince: options.since,
    limit: 100,
  });

  if (contactsResult.source === "sfdc") {
    for (const sfdcContact of contactsResult.data) {
      try {
        const { data: localContact } = await supabase
          .from("contacts")
          .select("contact_id")
          .eq("user_id", userId)
          .eq("sfdc_contact_id", sfdcContact.Id)
          .maybeSingle();

        if (localContact) {
          await supabase
            .from("contacts")
            .update({
              name: `${sfdcContact.FirstName ?? ""} ${sfdcContact.LastName}`.trim(),
              role: sfdcContact.Title,
              email: sfdcContact.Email,
              phone: sfdcContact.Phone,
              updated_at: new Date().toISOString(),
            })
            .eq("contact_id", localContact.contact_id)
            .eq("user_id", userId);
          result.contactsUpdated++;
        }
      } catch (error) {
        errors.push(
          `Contact ${sfdcContact.Id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  return { ...result, conflicts, errors };
}

// ── Push: RevSignal → SFDC ──────────────────────────────────────────

/**
 * Push local changes to Salesforce.
 * Syncs deal stage/amount updates and logs activities.
 */
export async function pushToSalesforce(
  supabase: SupabaseClient,
  userId: string
): Promise<PushResult & { errors: string[] }> {
  const result: PushResult = {
    activitiesLogged: 0,
    opportunitiesUpdated: 0,
    recordsCreated: 0,
  };
  const errors: string[] = [];

  // Find deals with SFDC IDs that have been updated locally
  const { data: dealsToSync } = await supabase
    .from("deals")
    .select("*")
    .eq("user_id", userId)
    .not("sfdc_opportunity_id", "is", null);

  if (!dealsToSync || dealsToSync.length === 0) {
    return { ...result, errors };
  }

  for (const deal of dealsToSync as Deal[]) {
    if (!deal.sfdc_opportunity_id) continue;

    try {
      // Prepare sync payload using the SFDC Sync Agent
      const payload = await prepareSyncPayload(supabase, userId, deal.deal_id);
      if (!payload) continue;

      // Update opportunity stage and amount
      const sfdcStage = LOCAL_TO_SFDC_STAGE[deal.stage];
      const updateFields: Record<string, string | number | boolean | null> = {};

      if (sfdcStage) updateFields.StageName = sfdcStage;
      if (deal.acv !== null) updateFields.Amount = deal.acv;
      if (deal.close_date) updateFields.CloseDate = deal.close_date;

      if (Object.keys(updateFields).length > 0) {
        const updateResult = await sfdc.updateRecord(
          supabase,
          userId,
          "Opportunity",
          deal.sfdc_opportunity_id,
          updateFields
        );

        if (updateResult.source === "sfdc" && updateResult.data.updated) {
          result.opportunitiesUpdated++;
        }
      }

      // Log recent activities (conversations since last sync)
      for (const activity of payload.activities) {
        const logResult = await sfdc.logActivity(supabase, userId, {
          subject: activity.subject,
          description: activity.description,
          whatId: deal.sfdc_opportunity_id,
          activityDate: activity.date,
        });

        if (logResult.source === "sfdc" && logResult.data) {
          result.activitiesLogged++;
        }
      }
    } catch (error) {
      errors.push(
        `Deal ${deal.company}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return { ...result, errors };
}

// ── Full Sync ────────────────────────────────────────────────────────

/**
 * Run a full bi-directional sync: pull first, then push.
 * Pull-first ensures we have the latest SFDC state before pushing.
 */
export async function runFullSync(
  supabase: SupabaseClient,
  userId: string,
  options: { since?: string } = {}
): Promise<SyncResult> {
  const pullResults = await pullFromSalesforce(supabase, userId, options);
  const pushResults = await pushToSalesforce(supabase, userId);

  // Use SFDC Sync Agent for conflict analysis if any conflicts found
  if (pullResults.conflicts.length > 0) {
    for (const conflict of pullResults.conflicts) {
      try {
        await reconcileSyncConflicts(supabase, userId, conflict.dealId, {
          [conflict.field]: conflict.sfdcValue,
        });
      } catch {
        // Conflict analysis failure is non-fatal
      }
    }
  }

  // Log sync activity
  await supabase.from("agent_logs").insert({
    user_id: userId,
    agent_name: "sfdc-sync",
    action: "bi_directional_sync",
    input_context: {
      since: options.since,
      pullResults: {
        opportunitiesUpdated: pullResults.opportunitiesUpdated,
        contactsUpdated: pullResults.contactsUpdated,
      },
      pushResults: {
        opportunitiesUpdated: pushResults.opportunitiesUpdated,
        activitiesLogged: pushResults.activitiesLogged,
      },
      conflicts: pullResults.conflicts.length,
    },
    output: `Pull: ${pullResults.opportunitiesUpdated} opps, ${pullResults.contactsUpdated} contacts. Push: ${pushResults.opportunitiesUpdated} opps, ${pushResults.activitiesLogged} activities. Conflicts: ${pullResults.conflicts.length}`,
    sources_cited: [],
    tokens_used: null,
  });

  return {
    pullResults,
    pushResults,
    conflicts: pullResults.conflicts,
    errors: [...pullResults.errors, ...pushResults.errors],
  };
}
