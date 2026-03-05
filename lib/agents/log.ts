/**
 * Agent Logging — Audit trail for all agent actions.
 *
 * Every agent call writes to the agent_logs table with:
 *  - agent_name, action, input context, output, sources cited
 *  - tokens used and duration for cost tracking
 */

import { SupabaseClient } from "@supabase/supabase-js";

export type AgentName =
  | "strategist"
  | "prospect-scout"
  | "follow-up-enforcer"
  | "call-analyst"
  | "competitive-watcher"
  | "email-composer"
  | "sfdc-sync"
  | "summarizer"
  | "tradeshow-scout";

export interface LogAgentCallParams {
  supabase: SupabaseClient;
  userId: string;
  agentName: AgentName;
  action: string;
  inputContext?: Record<string, unknown>;
  output: string;
  sourcesCited?: string[];
  tokensUsed?: number;
  durationMs?: number;
}

/**
 * Log an agent action to the agent_logs table.
 * Non-blocking — errors are logged but don't throw.
 */
export async function logAgentCall(params: LogAgentCallParams): Promise<void> {
  const {
    supabase,
    userId,
    agentName,
    action,
    inputContext,
    output,
    sourcesCited,
    tokensUsed,
    durationMs,
  } = params;

  const { error } = await supabase.from("agent_logs").insert({
    user_id: userId,
    agent_name: agentName,
    action,
    input_context: inputContext ?? null,
    output,
    sources_cited: sourcesCited ?? [],
    tokens_used: tokensUsed ?? null,
    duration_ms: durationMs ?? null,
    timestamp: new Date().toISOString(),
  });

  if (error) {
    console.error(
      `[agents/log] Failed to log ${agentName}/${action}:`,
      error.message
    );
  }
}

/**
 * Helper to measure duration of an async operation.
 * Returns [result, durationMs].
 */
export async function timed<T>(
  fn: () => Promise<T>
): Promise<[T, number]> {
  const start = Date.now();
  const result = await fn();
  return [result, Date.now() - start];
}
