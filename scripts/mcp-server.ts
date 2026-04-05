/**
 * RevSignal MCP Server
 *
 * Gives Claude Code read-only access to Supabase data:
 * deals, threads, conversations, tasks, contacts, pipeline state.
 *
 * Usage:
 *   npx tsx scripts/mcp-server.ts
 *
 * Configure in .claude/settings.json under mcpServers.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from project root (supports running from any directory)
config({ path: resolve(import.meta.dirname ?? __dirname, "..", ".env.local") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import * as z from "zod/v4";

// ---------- Supabase (service role, bypasses RLS) ----------

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ---------- Helpers ----------

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function textResult(data: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

// ---------- MCP Server ----------

const server = new McpServer({
  name: "revsignal",
  version: "1.0.0",
});

// ---- list_deals ----

server.registerTool(
  "list_deals",
  {
    description:
      "List all deals in the pipeline. Returns company, stage, ACV, win probability, contacts, last activity, and close date. Optionally filter by stage or company name.",
    inputSchema: {
      stage: z.string().optional().describe("Filter by stage (e.g. 'lead', 'discovery', 'proposal'). Comma-separated for multiple."),
      company: z.string().optional().describe("Filter by company name (case-insensitive partial match)"),
    },
  },
  async ({ stage, company }) => {
    let query = supabase
      .from("deals")
      .select("deal_id, company, stage, acv, win_probability, contacts, close_date, notes, last_activity_date, deployment_method, product_tier, created_date")
      .order("last_activity_date", { ascending: false });

    if (stage) {
      const stages = stage.split(",").map((s) => s.trim());
      query = query.in("stage", stages);
    }
    if (company) {
      query = query.ilike("company", `%${company}%`);
    }

    const { data, error } = await query;
    if (error) return textResult({ error: error.message });
    return textResult({ deals: data, count: data?.length ?? 0 });
  }
);

// ---- get_deal ----

server.registerTool(
  "get_deal",
  {
    description:
      "Get full context for a single deal: deal record, linked threads with briefs, recent conversations (summaries), action items, contacts, and the latest deal brief.",
    inputSchema: {
      deal_id: z.string().describe("The deal UUID"),
    },
  },
  async ({ deal_id }) => {
    const [dealRes, threadsRes, convsRes, actionsRes, briefRes] = await Promise.all([
      supabase.from("deals").select("*").eq("deal_id", deal_id).single(),
      supabase
        .from("coaching_threads")
        .select("thread_id, title, company, thread_brief, last_message_at, message_count, participants, is_archived")
        .eq("deal_id", deal_id)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("conversations")
        .select("conversation_id, date, channel, subject, ai_summary, contact_id")
        .eq("deal_id", deal_id)
        .order("date", { ascending: false })
        .limit(20),
      supabase
        .from("action_items")
        .select("item_id, description, owner, due_date, status, escalation_level")
        .eq("deal_id", deal_id)
        .in("status", ["pending", "overdue"])
        .order("due_date", { ascending: true }),
      supabase
        .from("deal_briefs")
        .select("brief_text, last_updated")
        .eq("deal_id", deal_id)
        .order("last_updated", { ascending: false })
        .limit(1),
    ]);

    if (dealRes.error) return textResult({ error: dealRes.error.message });

    return textResult({
      deal: dealRes.data,
      threads: threadsRes.data ?? [],
      conversations: convsRes.data ?? [],
      open_action_items: actionsRes.data ?? [],
      latest_brief: briefRes.data?.[0] ?? null,
    });
  }
);

// ---- list_threads ----

server.registerTool(
  "list_threads",
  {
    description:
      "List recent coaching threads with briefs and metadata. Optionally filter by company or deal_id.",
    inputSchema: {
      company: z.string().optional().describe("Filter by company name (case-insensitive partial match)"),
      deal_id: z.string().optional().describe("Filter by linked deal UUID"),
      include_archived: z.boolean().optional().describe("Include archived threads (default: false)"),
      limit: z.number().optional().describe("Max threads to return (default: 30)"),
    },
  },
  async ({ company, deal_id, include_archived, limit: lim }) => {
    let query = supabase
      .from("coaching_threads")
      .select("thread_id, title, company, contact_name, deal_id, thread_brief, last_message_at, message_count, participants, is_archived")
      .order("last_message_at", { ascending: false })
      .limit(lim ?? 30);

    if (!include_archived) {
      query = query.eq("is_archived", false);
    }
    if (company) {
      query = query.ilike("company", `%${company}%`);
    }
    if (deal_id) {
      query = query.eq("deal_id", deal_id);
    }

    const { data, error } = await query;
    if (error) return textResult({ error: error.message });
    return textResult({ threads: data, count: data?.length ?? 0 });
  }
);

// ---- get_thread ----

server.registerTool(
  "get_thread",
  {
    description:
      "Get a coaching thread with its last 30 messages, open follow-ups, and participants.",
    inputSchema: {
      thread_id: z.string().describe("The thread UUID"),
      message_limit: z.number().optional().describe("Number of recent messages to include (default: 30)"),
    },
  },
  async ({ thread_id, message_limit }) => {
    const [threadRes, msgsRes, fuRes] = await Promise.all([
      supabase.from("coaching_threads").select("*").eq("thread_id", thread_id).single(),
      supabase
        .from("coaching_conversations")
        .select("conversation_id, role, content, interaction_type, created_at")
        .eq("thread_id", thread_id)
        .order("created_at", { ascending: false })
        .limit(message_limit ?? 30),
      supabase
        .from("thread_follow_ups")
        .select("follow_up_id, description, due_date, status, created_at")
        .eq("thread_id", thread_id)
        .eq("status", "open")
        .order("due_date", { ascending: true }),
    ]);

    if (threadRes.error) return textResult({ error: threadRes.error.message });

    return textResult({
      thread: threadRes.data,
      messages: (msgsRes.data ?? []).reverse(),
      open_follow_ups: fuRes.data ?? [],
    });
  }
);

// ---- list_tasks ----

server.registerTool(
  "list_tasks",
  {
    description:
      "Unified view of all open tasks across three systems: thread follow-ups, user tasks, and action items. Returns them merged and sorted by due date.",
    inputSchema: {
      deal_id: z.string().optional().describe("Filter by deal UUID"),
      include_completed: z.boolean().optional().describe("Include completed tasks from the last 7 days (default: false)"),
    },
  },
  async ({ deal_id, include_completed }) => {
    const todayStr = today();

    // Fetch from all three task tables in parallel
    const [fuRes, utRes, aiRes] = await Promise.all([
      // Thread follow-ups (join thread for deal_id)
      supabase
        .from("thread_follow_ups")
        .select("follow_up_id, description, due_date, status, created_at, thread_id, coaching_threads(deal_id, company, title)")
        .eq("status", "open"),
      // User tasks
      supabase
        .from("user_tasks")
        .select("task_id, description, due_date, status, source_message_id, created_at")
        .eq("status", "open"),
      // Action items
      supabase
        .from("action_items")
        .select("item_id, description, owner, due_date, status, escalation_level, deal_id, created_at")
        .in("status", ["pending", "overdue"]),
    ]);

    type UnifiedTask = {
      id: string;
      description: string;
      due_date: string | null;
      source: "follow_up" | "user_task" | "action_item";
      deal_id: string | null;
      company: string | null;
      thread_title: string | null;
      owner: string | null;
      escalation: string | null;
      is_overdue: boolean;
      created_at: string;
    };

    const tasks: UnifiedTask[] = [];

    // Thread follow-ups
    for (const fu of fuRes.data ?? []) {
      const thread = fu.coaching_threads as { deal_id: string | null; company: string | null; title: string | null } | null;
      if (deal_id && thread?.deal_id !== deal_id) continue;
      tasks.push({
        id: fu.follow_up_id,
        description: fu.description,
        due_date: fu.due_date,
        source: "follow_up",
        deal_id: thread?.deal_id ?? null,
        company: thread?.company ?? null,
        thread_title: thread?.title ?? null,
        owner: "me",
        escalation: null,
        is_overdue: !!fu.due_date && fu.due_date < todayStr,
        created_at: fu.created_at,
      });
    }

    // User tasks
    for (const ut of utRes.data ?? []) {
      if (deal_id) continue; // user_tasks currently have no deal_id column
      tasks.push({
        id: ut.task_id,
        description: ut.description,
        due_date: ut.due_date,
        source: "user_task",
        deal_id: null,
        company: null,
        thread_title: null,
        owner: "me",
        escalation: null,
        is_overdue: !!ut.due_date && ut.due_date < todayStr,
        created_at: ut.created_at,
      });
    }

    // Action items
    for (const ai of aiRes.data ?? []) {
      if (deal_id && ai.deal_id !== deal_id) continue;
      tasks.push({
        id: ai.item_id,
        description: ai.description,
        due_date: ai.due_date,
        source: "action_item",
        deal_id: ai.deal_id,
        company: null,
        thread_title: null,
        owner: ai.owner,
        escalation: ai.escalation_level,
        is_overdue: !!ai.due_date && ai.due_date < todayStr,
        created_at: ai.created_at,
      });
    }

    // Sort: overdue first, then by due date (nulls last)
    tasks.sort((a, b) => {
      if (a.is_overdue !== b.is_overdue) return a.is_overdue ? -1 : 1;
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return b.created_at.localeCompare(a.created_at);
    });

    const overdue = tasks.filter((t) => t.is_overdue);
    const upcoming = tasks.filter((t) => !t.is_overdue);

    return textResult({
      overdue_count: overdue.length,
      total_open: tasks.length,
      tasks,
    });
  }
);

// ---- search_conversations ----

server.registerTool(
  "search_conversations",
  {
    description:
      "Full-text search across coaching conversation messages. Returns matching messages with thread context.",
    inputSchema: {
      query: z.string().describe("Search text (case-insensitive)"),
      limit: z.number().optional().describe("Max results (default: 20)"),
    },
  },
  async ({ query, limit: lim }) => {
    const { data, error } = await supabase
      .from("coaching_conversations")
      .select("conversation_id, thread_id, role, content, created_at, coaching_threads(title, company, deal_id)")
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(lim ?? 20);

    if (error) return textResult({ error: error.message });

    return textResult({
      results: data?.map((m) => ({
        conversation_id: m.conversation_id,
        thread_id: m.thread_id,
        thread_title: (m.coaching_threads as { title: string } | null)?.title ?? null,
        company: (m.coaching_threads as { company: string } | null)?.company ?? null,
        role: m.role,
        content: m.content.length > 500 ? m.content.slice(0, 500) + "..." : m.content,
        created_at: m.created_at,
      })),
      count: data?.length ?? 0,
    });
  }
);

// ---- get_pipeline_summary ----

server.registerTool(
  "get_pipeline_summary",
  {
    description:
      "Quick pipeline snapshot: deals by stage, total weighted ACV, overdue tasks, recent activity. Good for getting a quick read on pipeline health.",
    inputSchema: {},
  },
  async () => {
    const todayStr = today();

    const [dealsRes, overdueAIRes, overdueFURes, recentThreadsRes] = await Promise.all([
      supabase
        .from("deals")
        .select("deal_id, company, stage, acv, win_probability, last_activity_date, close_date")
        .not("stage", "in", "(closed_won,closed_lost)")
        .order("last_activity_date", { ascending: false }),
      supabase
        .from("action_items")
        .select("item_id, description, deal_id, due_date")
        .in("status", ["pending", "overdue"])
        .lt("due_date", todayStr),
      supabase
        .from("thread_follow_ups")
        .select("follow_up_id, description, due_date, thread_id")
        .eq("status", "open")
        .lt("due_date", todayStr),
      supabase
        .from("coaching_threads")
        .select("thread_id, title, company, last_message_at")
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false })
        .limit(5),
    ]);

    const deals = dealsRes.data ?? [];

    // Group by stage
    const byStage: Record<string, { count: number; companies: string[]; total_acv: number; weighted_acv: number }> = {};
    for (const d of deals) {
      if (!byStage[d.stage]) {
        byStage[d.stage] = { count: 0, companies: [], total_acv: 0, weighted_acv: 0 };
      }
      byStage[d.stage].count++;
      byStage[d.stage].companies.push(d.company);
      byStage[d.stage].total_acv += d.acv ?? 0;
      byStage[d.stage].weighted_acv += (d.acv ?? 0) * (d.win_probability / 100);
    }

    const totalWeightedACV = deals.reduce((sum, d) => sum + (d.acv ?? 0) * (d.win_probability / 100), 0);
    const totalACV = deals.reduce((sum, d) => sum + (d.acv ?? 0), 0);

    // Stale deals (7+ days no activity)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const staleDeals = deals.filter((d) => d.last_activity_date < sevenDaysAgo);

    return textResult({
      active_deals: deals.length,
      total_acv: totalACV,
      weighted_pipeline: Math.round(totalWeightedACV),
      by_stage: byStage,
      stale_deals: staleDeals.map((d) => ({ company: d.company, stage: d.stage, last_activity: d.last_activity_date })),
      overdue_tasks: {
        action_items: overdueAIRes.data?.length ?? 0,
        follow_ups: overdueFURes.data?.length ?? 0,
      },
      recent_threads: recentThreadsRes.data ?? [],
    });
  }
);

// ---------- Start ----------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server is running via stdio - no console output needed
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
