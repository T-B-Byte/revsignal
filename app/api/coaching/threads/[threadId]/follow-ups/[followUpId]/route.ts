import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const updateFollowUpSchema = z.object({
  status: z.enum(["completed", "dismissed"]),
});

type RouteContext = { params: Promise<{ threadId: string; followUpId: string }> };

/**
 * PATCH /api/coaching/threads/[threadId]/follow-ups/[followUpId]
 * Mark a follow-up as completed or dismissed.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { threadId, followUpId } = await context.params;

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

  const parsed = updateFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
  };
  if (parsed.data.status === "completed") {
    updateData.completed_at = new Date().toISOString();
  }

  const { data: followUp, error } = await supabase
    .from("thread_follow_ups")
    .update(updateData)
    .eq("follow_up_id", followUpId)
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/coaching/follow-ups] PATCH error:", error.message);
    return NextResponse.json({ error: "Failed to update follow-up" }, { status: 500 });
  }

  if (!followUp) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }

  return NextResponse.json(followUp);
}
