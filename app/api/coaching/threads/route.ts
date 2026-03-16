import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createThreadSchema = z.object({
  title: z.string().min(1).max(200),
  contact_name: z.string().min(1).max(200).optional(),
  contact_role: z.string().max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  contact_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  ma_entity_id: z.string().uuid().optional(),
  prospect_id: z.string().uuid().optional(),
  meeting_note_id: z.string().uuid().optional(),
});

/**
 * GET /api/coaching/threads
 * List user's coaching threads, sorted by most recent activity.
 * Includes deal info and open follow-up counts.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch threads with linked deal info
  const { data: threads, error } = await supabase
    .from("coaching_threads")
    .select(`
      *,
      deals:deal_id (deal_id, company, stage)
    `)
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("[api/coaching/threads] GET error:", error.message);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }

  // Fetch open follow-up counts per thread in one query
  const threadIds = (threads || []).map((t) => t.thread_id);
  let followUpCounts: Record<string, { count: number; has_overdue: boolean }> = {};

  if (threadIds.length > 0) {
    const { data: followUps } = await supabase
      .from("thread_follow_ups")
      .select("thread_id, due_date")
      .eq("user_id", user.id)
      .eq("status", "open")
      .in("thread_id", threadIds);

    if (followUps) {
      const today = new Date().toISOString().split("T")[0];
      for (const fu of followUps) {
        if (!followUpCounts[fu.thread_id]) {
          followUpCounts[fu.thread_id] = { count: 0, has_overdue: false };
        }
        followUpCounts[fu.thread_id].count++;
        if (fu.due_date && fu.due_date < today) {
          followUpCounts[fu.thread_id].has_overdue = true;
        }
      }
    }
  }

  // Merge follow-up data into threads
  const enriched = (threads || []).map((t) => ({
    ...t,
    open_follow_up_count: followUpCounts[t.thread_id]?.count ?? 0,
    has_overdue: followUpCounts[t.thread_id]?.has_overdue ?? false,
  }));

  return NextResponse.json(enriched);
}

/**
 * POST /api/coaching/threads
 * Create a new coaching thread, optionally linked to a deal.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createThreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // If deal_id provided, verify it belongs to the user
  if (parsed.data.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", parsed.data.deal_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
  }

  // If ma_entity_id provided, verify it belongs to the user
  if (parsed.data.ma_entity_id) {
    const { data: entity } = await supabase
      .from("ma_entities")
      .select("entity_id")
      .eq("entity_id", parsed.data.ma_entity_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }
  }

  // If prospect_id provided, verify it belongs to the user
  if (parsed.data.prospect_id) {
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id")
      .eq("id", parsed.data.prospect_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }
  }

  // If meeting_note_id provided, verify it belongs to the user
  if (parsed.data.meeting_note_id) {
    const { data: meeting } = await supabase
      .from("meeting_notes")
      .select("note_id")
      .eq("note_id", parsed.data.meeting_note_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
  }

  // Check for duplicate threads (same contact_name + company, case-insensitive)
  if (parsed.data.contact_name && parsed.data.company) {
    const { data: existing } = await supabase
      .from("coaching_threads")
      .select("thread_id, title, contact_name, company")
      .eq("user_id", user.id)
      .ilike("contact_name", parsed.data.contact_name)
      .ilike("company", parsed.data.company)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: `A thread for "${existing.contact_name}" at "${existing.company}" already exists.`,
          duplicate: true,
          existing_thread_id: existing.thread_id,
        },
        { status: 409 }
      );
    }
  }

  const { data: thread, error } = await supabase
    .from("coaching_threads")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      contact_name: parsed.data.contact_name ?? null,
      contact_role: parsed.data.contact_role ?? null,
      company: parsed.data.company ?? null,
      contact_id: parsed.data.contact_id ?? null,
      deal_id: parsed.data.deal_id ?? null,
      ma_entity_id: parsed.data.ma_entity_id ?? null,
      prospect_id: parsed.data.prospect_id ?? null,
      meeting_note_id: parsed.data.meeting_note_id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/coaching/threads] POST error:", error.message);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }

  return NextResponse.json(thread, { status: 201 });
}
