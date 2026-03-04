import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

type RouteContext = { params: Promise<{ id: string }> };

const updateNudgeSchema = z.object({
  status: z.enum(["pending", "shown", "dismissed", "acted_on"] as const),
});

/**
 * PATCH /api/nudges/:id
 * Update nudge status (shown, dismissed, acted_on).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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

  const parsed = updateNudgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
  };

  if (parsed.data.status === "shown") {
    updateData.shown_at = now;
  } else if (parsed.data.status === "dismissed") {
    updateData.dismissed_at = now;
  }

  const { data, error } = await supabase
    .from("nudges")
    .update(updateData)
    .eq("nudge_id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/nudges/:id] PATCH failed:", error.message);
    return NextResponse.json(
      { error: "Failed to update nudge" },
      { status: 500 }
    );
  }

  return NextResponse.json({ nudge: data });
}
