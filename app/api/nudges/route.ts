import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createNudgeSchema = z.object({
  priority: z.enum(["low", "medium", "high", "critical"] as const),
  title: z.string().min(1).max(500),
  message: z.string().min(1).max(2000),
  action_url: z.string().max(500).startsWith("/").optional(),
  source_agent: z.string().max(100).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  expires_at: z.string().optional(),
});

/**
 * GET /api/nudges
 * List nudges, defaulting to pending status.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") ?? "pending";
  const priority = searchParams.get("priority");
  const limit = searchParams.get("limit");

  let query = supabase
    .from("nudges")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", status)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (priority) {
    query = query.eq("priority", priority);
  }

  if (limit) {
    const n = Number(limit);
    if (Number.isFinite(n) && n > 0 && n <= 100) {
      query = query.limit(n);
    }
  } else {
    query = query.limit(10);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/nudges] GET failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch nudges" },
      { status: 500 }
    );
  }

  return NextResponse.json({ nudges: data });
}

/**
 * POST /api/nudges
 * Create a nudge (used by agents and cron jobs).
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

  const parsed = createNudgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("nudges")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("[api/nudges] POST failed:", error.message);
    return NextResponse.json(
      { error: "Failed to create nudge" },
      { status: 500 }
    );
  }

  return NextResponse.json({ nudge: data }, { status: 201 });
}
