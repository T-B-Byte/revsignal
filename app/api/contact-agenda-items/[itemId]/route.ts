import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const uuidSchema = z.string().uuid();

const updateContactAgendaItemSchema = z.object({
  description: z.string().min(1).max(1000).optional(),
  status: z.enum(["open", "covered", "carried"] as const).optional(),
  covered_in_meeting: z.uuid().nullable().optional(),
});

interface RouteContext {
  params: Promise<{ itemId: string }>;
}

/**
 * PATCH /api/contact-agenda-items/[itemId]
 * Update a contact agenda item
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { itemId } = await context.params;

  if (!uuidSchema.safeParse(itemId).success) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

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

  const parsed = updateContactAgendaItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("contact_agenda_items")
    .update(updateData)
    .eq("item_id", itemId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/contact-agenda-items] PATCH failed:", error.message);
    return NextResponse.json(
      { error: "Failed to update contact agenda item" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Contact agenda item not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ item: data });
}

/**
 * DELETE /api/contact-agenda-items/[itemId]
 * Delete a contact agenda item
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { itemId } = await context.params;

  if (!uuidSchema.safeParse(itemId).success) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("contact_agenda_items")
    .delete()
    .eq("item_id", itemId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/contact-agenda-items] DELETE failed:", error.message);
    return NextResponse.json(
      { error: "Failed to delete contact agenda item" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
