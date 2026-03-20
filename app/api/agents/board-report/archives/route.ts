import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const saveArchiveSchema = z.object({
  week_number: z.number().int().min(1),
  title: z.string().min(1).max(500),
  subtitle: z.string().max(500).default(""),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      enabled: z.boolean(),
    })
  ),
  tokens_used: z.number().int().min(0).default(0),
  generated_at: z.string(),
});

/**
 * GET /api/agents/board-report/archives
 *
 * List all archived board reports for the current user, newest first.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: archives, error } = await supabase
    .from("board_report_archives")
    .select("id, week_number, title, subtitle, sections, tokens_used, generated_at, created_at")
    .eq("user_id", user.id)
    .order("week_number", { ascending: false })
    .limit(52);

  if (error) {
    console.error("[api/board-report/archives] GET error:", error.message);
    return NextResponse.json({ error: "Failed to fetch archives" }, { status: 500 });
  }

  return NextResponse.json(archives || []);
}

/**
 * POST /api/agents/board-report/archives
 *
 * Save (or update) a board report to the archive.
 * Upserts by user_id + week_number so manual saves don't duplicate cron entries.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = saveArchiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: archive, error } = await supabase
    .from("board_report_archives")
    .upsert(
      {
        user_id: user.id,
        week_number: parsed.data.week_number,
        title: parsed.data.title,
        subtitle: parsed.data.subtitle,
        sections: parsed.data.sections,
        tokens_used: parsed.data.tokens_used,
        generated_at: parsed.data.generated_at,
      },
      { onConflict: "user_id,week_number" }
    )
    .select()
    .single();

  if (error) {
    console.error("[api/board-report/archives] POST error:", error.message);
    return NextResponse.json({ error: "Failed to save archive" }, { status: 500 });
  }

  return NextResponse.json(archive, { status: 201 });
}
