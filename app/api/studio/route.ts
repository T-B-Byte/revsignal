import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const PROJECT_TYPES = [
  "battlecard",
  "one_pager",
  "proposal",
  "competitive_analysis",
  "contract_analysis",
  "freeform",
] as const;

const createSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(PROJECT_TYPES).default("freeform"),
  description: z.string().max(2000).optional(),
});

/**
 * GET /api/studio
 * List user's studio projects, newest first.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("studio_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[api/studio] GET error:", error.message);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/studio
 * Create a new studio project with a linked coaching thread.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Create the coaching thread that powers the Strategist chat for this project
  const { data: thread, error: threadError } = await supabase
    .from("coaching_threads")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      contact_name: null,
      contact_role: null,
      company: null,
    })
    .select()
    .single();

  if (threadError) {
    console.error("[api/studio] thread create error:", threadError.message);
    return NextResponse.json({ error: "Failed to create project thread" }, { status: 500 });
  }

  const { data: project, error } = await supabase
    .from("studio_projects")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      type: parsed.data.type,
      description: parsed.data.description ?? null,
      thread_id: thread.thread_id,
      output_json: [],
    })
    .select()
    .single();

  if (error) {
    console.error("[api/studio] POST error:", error.message);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json(project, { status: 201 });
}
