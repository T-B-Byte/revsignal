import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COLUMNS = [
  "checks",
  "acvs",
  "leads",
  "intros",
  "stages",
  "decisions",
  "cpl_values",
] as const;

// GET — return current state + realtime credentials
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("daas_framework_state")
    .select("checks, acvs, leads, intros, stages, decisions, cpl_values")
    .eq("id", "default")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to load state" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...data,
    _realtime: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  });
}

// PATCH — merge partial state updates
export async function PATCH(request: NextRequest) {
  const body = await request.json();

  // Only allow known columns
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const col of COLUMNS) {
    if (body[col] !== undefined) {
      update[col] = body[col];
    }
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "No valid columns" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("daas_framework_state")
    .update(update)
    .eq("id", "default");

  if (error) {
    return NextResponse.json(
      { error: "Failed to save state" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
