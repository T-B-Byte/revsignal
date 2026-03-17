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

const PROJECT_STATUSES = ["draft", "in_progress", "complete"] as const;

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(PROJECT_TYPES).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  description: z.string().max(2000).nullable().optional(),
  output_json: z.array(z.record(z.string(), z.unknown())).optional(),
});

type RouteContext = { params: Promise<{ projectId: string }> };

function isValidUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/**
 * GET /api/studio/[projectId]
 * Fetch a single studio project including its thread messages.
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { projectId } = await ctx.params;
  if (!isValidUuid(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project, error } = await supabase
    .from("studio_projects")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

/**
 * PATCH /api/studio/[projectId]
 * Update project fields (title, status, output_json, etc.).
 */
export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { projectId } = await ctx.params;
  if (!isValidUuid(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("studio_projects")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("studio_projects")
    .update(parsed.data)
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/studio/[projectId]] PATCH error:", error.message);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/studio/[projectId]
 * Delete a project (thread_id set null via FK, thread itself is preserved for history).
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { projectId } = await ctx.params;
  if (!isValidUuid(projectId)) {
    return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("studio_projects")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/studio/[projectId]] DELETE error:", error.message);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
