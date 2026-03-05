import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createDeckSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
});

/**
 * GET /api/flashcards
 * List all flashcard decks for the current user.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/flashcards] GET failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch decks" }, { status: 500 });
  }

  return NextResponse.json({ decks: data });
}

/**
 * POST /api/flashcards
 * Create a new flashcard deck.
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

  const parsed = createDeckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("flashcard_decks")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      icon: parsed.data.icon ?? "cards",
      color: parsed.data.color ?? "blue",
    })
    .select()
    .single();

  if (error) {
    console.error("[api/flashcards] POST failed:", error.message);
    return NextResponse.json({ error: "Failed to create deck" }, { status: 500 });
  }

  return NextResponse.json({ deck: data }, { status: 201 });
}
