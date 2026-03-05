import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tradeshow, TradeshowTarget, TradeshowContact } from "@/types/database";

interface RouteContext {
  params: Promise<{ tradeshowId: string }>;
}

/**
 * GET /api/tradeshows/:tradeshowId
 *
 * Returns the tradeshow with all targets and contacts.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { tradeshowId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch tradeshow
  const { data: tradeshow, error: tradeshowError } = await supabase
    .from("tradeshows")
    .select("*")
    .eq("tradeshow_id", tradeshowId)
    .eq("user_id", user.id)
    .single();

  if (tradeshowError || !tradeshow) {
    return NextResponse.json(
      { error: "Tradeshow not found." },
      { status: 404 }
    );
  }

  // Fetch targets and contacts in parallel
  const [targetsResult, contactsResult] = await Promise.all([
    supabase
      .from("tradeshow_targets")
      .select("*")
      .eq("tradeshow_id", tradeshowId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("tradeshow_contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
  ]);

  const targets = (targetsResult.data as TradeshowTarget[]) || [];
  const allContacts = (contactsResult.data as TradeshowContact[]) || [];

  // Filter contacts to only those belonging to this tradeshow's targets
  const targetIds = new Set(targets.map((t) => t.target_id));
  const contacts = allContacts.filter((c) => targetIds.has(c.target_id));

  return NextResponse.json({
    tradeshow: tradeshow as Tradeshow,
    targets,
    contacts,
  });
}

/**
 * DELETE /api/tradeshows/:tradeshowId
 *
 * Deletes a tradeshow and all its targets/contacts (cascading).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { tradeshowId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("tradeshows")
    .delete()
    .eq("tradeshow_id", tradeshowId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete tradeshow." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
