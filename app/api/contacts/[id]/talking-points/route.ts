import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createTalkingPointSchema = z.object({
  content: z.string().min(1).max(500),
  thread_id: z.string().uuid().nullable().optional(),
  source: z.enum(["manual", "strategist"]).default("manual"),
  priority: z.number().int().min(0).max(999).default(0),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/contacts/[id]/talking-points
 * Fetch all talking points for a contact, open first then completed.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { id: contactId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify contact ownership
  const { data: contact } = await supabase
    .from("contacts")
    .select("contact_id")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { data: points, error } = await supabase
    .from("talking_points")
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title)
    `)
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .order("is_completed", { ascending: true })
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/contacts/talking-points] GET error:", error.message);
    return NextResponse.json({ error: "Failed to fetch talking points" }, { status: 500 });
  }

  return NextResponse.json(points || []);
}

/**
 * POST /api/contacts/[id]/talking-points
 * Create a new talking point for a contact.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { id: contactId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify contact ownership
  const { data: contact } = await supabase
    .from("contacts")
    .select("contact_id")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTalkingPointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // If thread_id provided, verify ownership
  if (parsed.data.thread_id) {
    const { data: thread } = await supabase
      .from("coaching_threads")
      .select("thread_id")
      .eq("thread_id", parsed.data.thread_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
  }

  const { data: point, error } = await supabase
    .from("talking_points")
    .insert({
      user_id: user.id,
      contact_id: contactId,
      content: parsed.data.content,
      thread_id: parsed.data.thread_id ?? null,
      source: parsed.data.source,
      priority: parsed.data.priority,
    })
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title)
    `)
    .single();

  if (error) {
    console.error("[api/contacts/talking-points] POST error:", error.message);
    return NextResponse.json({ error: "Failed to create talking point" }, { status: 500 });
  }

  return NextResponse.json(point, { status: 201 });
}
