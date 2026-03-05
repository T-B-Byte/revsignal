import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const createConversationSchema = z.object({
  deal_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  channel: z.enum([
    "teams",
    "email",
    "call",
    "linkedin",
    "in_person",
    "manual",
    "internal",
  ] as const),
  subject: z.string().max(500).optional(),
  raw_text: z.string().min(1, "Content is required").max(50000),
  follow_up_date: z
    .string()
    .refine((v) => ISO_DATE_RE.test(v), "Invalid date format (YYYY-MM-DD)")
    .optional(),
});

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

  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  // Require at least one of deal_id or contact_id (unless internal)
  if (!parsed.data.deal_id && !parsed.data.contact_id && parsed.data.channel !== "internal") {
    return NextResponse.json(
      { error: "At least one of deal_id or contact_id is required" },
      { status: 400 }
    );
  }

  // Verify ownership of deal_id and contact_id
  if (parsed.data.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", parsed.data.deal_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
  }

  if (parsed.data.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("contact_id")
      .eq("contact_id", parsed.data.contact_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      deal_id: parsed.data.deal_id ?? null,
      contact_id: parsed.data.contact_id ?? null,
      channel: parsed.data.channel,
      subject: parsed.data.subject ?? null,
      raw_text: parsed.data.raw_text,
      follow_up_date: parsed.data.follow_up_date ?? null,
      date: now,
      action_items: [],
    })
    .select("conversation_id")
    .single();

  if (error) {
    console.error("[conversations] Insert failed:", error);
    return NextResponse.json(
      { error: "Failed to save conversation" },
      { status: 500 }
    );
  }

  // Update deal's last_activity_date if linked to a deal
  if (parsed.data.deal_id) {
    await supabase
      .from("deals")
      .update({ last_activity_date: now, updated_at: now })
      .eq("deal_id", parsed.data.deal_id)
      .eq("user_id", user.id);
  }

  return NextResponse.json(
    { conversation_id: data.conversation_id },
    { status: 201 }
  );
}
