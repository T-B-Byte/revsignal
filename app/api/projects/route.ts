import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "paused", "completed"] as const).optional(),
  color: z.string().max(20).optional(),
  members: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        role: z.string().max(200).optional(),
        contact_id: z.uuid().optional(),
      })
    )
    .max(50)
    .optional(),
});

const updateProjectSchema = z.object({
  project_id: z.uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["active", "paused", "completed"] as const).optional(),
  color: z.string().max(20).optional(),
  members: z
    .array(
      z.object({
        member_id: z.uuid().optional(),
        name: z.string().min(1).max(200),
        role: z.string().max(200).optional(),
        contact_id: z.uuid().optional(),
      })
    )
    .max(50)
    .optional(),
});

const deleteProjectSchema = z.object({
  project_id: z.uuid(),
});

/**
 * GET /api/projects
 * List projects with members. Optional ?status=active
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
  const status = searchParams.get("status");

  if (status && !["active", "paused", "completed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let query = supabase
    .from("projects")
    .select("*, project_members(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/projects] GET failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }

  return NextResponse.json({ projects: data });
}

/**
 * POST /api/projects
 * Create a project with optional members
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

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "active",
      color: parsed.data.color ?? "#3b82f6",
    })
    .select()
    .single();

  if (projectError) {
    console.error("[api/projects] POST project failed:", projectError.message);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  // Add members if provided
  if (parsed.data.members && parsed.data.members.length > 0) {
    const memberRows = parsed.data.members.map((m) => ({
      project_id: project.project_id,
      user_id: user.id,
      name: m.name,
      role: m.role ?? null,
      contact_id: m.contact_id ?? null,
    }));

    const { error: membersError } = await supabase
      .from("project_members")
      .insert(memberRows);

    if (membersError) {
      console.error("[api/projects] POST members failed:", membersError.message);
    }
  }

  // Re-fetch with members
  const { data: full } = await supabase
    .from("projects")
    .select("*, project_members(*)")
    .eq("project_id", project.project_id)
    .single();

  return NextResponse.json({ project: full }, { status: 201 });
}

/**
 * PATCH /api/projects
 * Update project and optionally replace members
 */
export async function PATCH(request: NextRequest) {
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

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { project_id, members, ...updates } = parsed.data;

  // Verify ownership
  const { data: existing } = await supabase
    .from("projects")
    .select("project_id")
    .eq("project_id", project_id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Update project fields
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("projects")
      .update(updates)
      .eq("project_id", project_id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[api/projects] PATCH failed:", error.message);
      return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }
  }

  // Replace members if provided
  if (members !== undefined) {
    // Delete existing members
    await supabase
      .from("project_members")
      .delete()
      .eq("project_id", project_id)
      .eq("user_id", user.id);

    // Insert new members
    if (members.length > 0) {
      const memberRows = members.map((m) => ({
        project_id,
        user_id: user.id,
        name: m.name,
        role: m.role ?? null,
        contact_id: m.contact_id ?? null,
      }));

      const { error } = await supabase
        .from("project_members")
        .insert(memberRows);

      if (error) {
        console.error("[api/projects] PATCH members failed:", error.message);
      }
    }
  }

  // Re-fetch
  const { data: full } = await supabase
    .from("projects")
    .select("*, project_members(*)")
    .eq("project_id", project_id)
    .single();

  return NextResponse.json({ project: full });
}

/**
 * DELETE /api/projects
 * Delete a project (cascades to members)
 */
export async function DELETE(request: NextRequest) {
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

  const parsed = deleteProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("project_id", parsed.data.project_id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/projects] DELETE failed:", error.message);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
