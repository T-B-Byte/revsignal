import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createNoteSchema = z.object({
  category: z.enum([
    "institutional_context",
    "stakeholder_insight",
    "decision_log",
    "political_dynamic",
    "meeting_debrief",
    "strategic_observation",
    "competitive_insight",
    "relationship_note",
  ] as const),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
  related_stakeholder_id: z.string().uuid().optional(),
  related_deal_id: z.string().uuid().optional(),
  source: z.string().max(500).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

/**
 * GET /api/strategic-notes
 * List strategic notes with optional filters.
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
  const category = searchParams.get("category");
  const stakeholderId = searchParams.get("stakeholder_id");
  const dealId = searchParams.get("deal_id");
  const search = searchParams.get("search");
  const limit = searchParams.get("limit");

  let query = supabase
    .from("strategic_notes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  if (stakeholderId) {
    query = query.eq("related_stakeholder_id", stakeholderId);
  }

  if (dealId) {
    query = query.eq("related_deal_id", dealId);
  }

  if (search) {
    // Strip characters that could cause tsquery syntax errors
    const sanitized = search.replace(/[!|&():*<>\\'"]/g, "").trim();
    if (sanitized) {
      query = query.textSearch("search_vector", sanitized, {
        type: "websearch",
        config: "english",
      });
    }
  }

  if (limit) {
    const n = Number(limit);
    if (Number.isFinite(n) && n > 0 && n <= 200) {
      query = query.limit(n);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/strategic-notes] GET failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch strategic notes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ notes: data });
}

/**
 * POST /api/strategic-notes
 * Create a new strategic note.
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

  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("strategic_notes")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("[api/strategic-notes] POST failed:", error.message);
    return NextResponse.json(
      { error: "Failed to create strategic note" },
      { status: 500 }
    );
  }

  return NextResponse.json({ note: data }, { status: 201 });
}
