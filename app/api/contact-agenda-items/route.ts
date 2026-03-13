import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createContactAgendaItemSchema = z.object({
  contact_id: z.uuid(),
  description: z.string().min(1).max(1000),
  source: z
    .enum(["manual", "strategist", "action_item"] as const)
    .optional(),
});

/**
 * GET /api/contact-agenda-items
 * List contact agenda items with optional filters: ?contact_id=UUID&status=open
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
  const contactId = searchParams.get("contact_id");
  const status = searchParams.get("status");

  // Validate contact_id if provided
  if (contactId && !z.string().uuid().safeParse(contactId).success) {
    return NextResponse.json({ error: "Invalid contact_id" }, { status: 400 });
  }

  // Validate status if provided
  const validStatuses = ["open", "covered", "carried"] as const;
  if (status && !validStatuses.includes(status as (typeof validStatuses)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let query = supabase
    .from("contact_agenda_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/contact-agenda-items] GET failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch contact agenda items" },
      { status: 500 }
    );
  }

  return NextResponse.json({ items: data });
}

/**
 * POST /api/contact-agenda-items
 * Create a new contact agenda item
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

  const parsed = createContactAgendaItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("contact_agenda_items")
    .insert({
      user_id: user.id,
      contact_id: parsed.data.contact_id,
      description: parsed.data.description,
      source: parsed.data.source ?? "manual",
    })
    .select()
    .single();

  if (error) {
    console.error("[api/contact-agenda-items] POST failed:", error.message);
    return NextResponse.json(
      { error: "Failed to create contact agenda item" },
      { status: 500 }
    );
  }

  return NextResponse.json({ item: data }, { status: 201 });
}
