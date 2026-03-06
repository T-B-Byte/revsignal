import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/tasks
 * List all tasks for the current user, open first then done.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tasks, error } = await supabase
    .from("user_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("status", { ascending: true }) // open before done
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }

  return NextResponse.json({ tasks: tasks ?? [] });
}

const createSchema = z.object({
  description: z.string().min(1).max(2000),
  due_date: z.string().max(20).optional(),
});

/**
 * POST /api/tasks
 * Create a new task.
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const { data: task, error } = await supabase
    .from("user_tasks")
    .insert({
      user_id: user.id,
      description: parsed.data.description.trim(),
      due_date: parsed.data.due_date || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }

  return NextResponse.json({ task }, { status: 201 });
}

const updateSchema = z.object({
  task_id: z.uuid(),
  description: z.string().min(1).max(2000).optional(),
  due_date: z.string().max(20).nullable().optional(),
  status: z.enum(["open", "done"]).optional(),
});

/**
 * PATCH /api/tasks
 * Update a task (description, due_date, status).
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description.trim();
  }
  if (parsed.data.due_date !== undefined) {
    updates.due_date = parsed.data.due_date;
  }
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
    updates.completed_at =
      parsed.data.status === "done" ? new Date().toISOString() : null;
  }

  const { error } = await supabase
    .from("user_tasks")
    .update(updates)
    .eq("task_id", parsed.data.task_id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

const deleteSchema = z.object({
  task_id: z.uuid(),
});

/**
 * DELETE /api/tasks
 * Delete a task.
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_tasks")
    .delete()
    .eq("task_id", parsed.data.task_id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
