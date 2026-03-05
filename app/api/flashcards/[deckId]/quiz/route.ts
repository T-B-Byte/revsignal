import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import { MASTERY_THRESHOLDS } from "@/types/database";
import type { MasteryLevel } from "@/types/database";

interface RouteContext {
  params: Promise<{ deckId: string }>;
}

const startSchema = z.object({
  action: z.literal("start"),
});

const completeSchema = z.object({
  action: z.literal("complete"),
  sessionId: z.string().uuid(),
});

function calculateMastery(timesSeen: number, timesCorrect: number): MasteryLevel {
  if (timesSeen < MASTERY_THRESHOLDS.minSeen) return "learning";
  const pct = timesCorrect / timesSeen;
  if (pct >= MASTERY_THRESHOLDS.mastered) return "mastered";
  if (pct >= MASTERY_THRESHOLDS.reviewing) return "reviewing";
  if (pct >= MASTERY_THRESHOLDS.learning) return "learning";
  return "new";
}

/**
 * POST /api/flashcards/:deckId/quiz
 * Start a quiz session.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { deckId } = await context.params;
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

  // Determine action
  const actionCheck = z.object({ action: z.string() }).safeParse(body);
  if (!actionCheck.success) {
    return NextResponse.json({ error: "Missing action field" }, { status: 400 });
  }

  if (actionCheck.data.action === "start") {
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    // Fetch all cards for the deck
    const { data: cards, error: cardsError } = await supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
      .order("sort_order")
      .order("created_at");

    if (cardsError) {
      console.error("[api/flashcards/:deckId/quiz] cards fetch failed:", cardsError.message);
      return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
    }

    if (!cards || cards.length === 0) {
      return NextResponse.json({ error: "Deck has no cards" }, { status: 400 });
    }

    // Create quiz session
    const { data: session, error: sessionError } = await supabase
      .from("quiz_sessions")
      .insert({
        deck_id: deckId,
        user_id: user.id,
        total_cards: cards.length,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("[api/flashcards/:deckId/quiz] session create failed:", sessionError.message);
      return NextResponse.json({ error: "Failed to create quiz session" }, { status: 500 });
    }

    // Shuffle cards
    const shuffled = [...cards].sort(() => Math.random() - 0.5);

    return NextResponse.json({ session, cards: shuffled }, { status: 201 });
  }

  if (actionCheck.data.action === "complete") {
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Verify session belongs to this deck and user
    const { data: sessionCheck } = await supabase
      .from("quiz_sessions")
      .select("session_id")
      .eq("session_id", parsed.data.sessionId)
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
      .eq("completed", false)
      .single();

    if (!sessionCheck) {
      return NextResponse.json({ error: "Session not found or already completed" }, { status: 404 });
    }

    // Count first-pass correct (attempt_number = 1 and is_correct = true)
    const { count: firstPassCorrect } = await supabase
      .from("quiz_responses")
      .select("*", { count: "exact", head: true })
      .eq("session_id", parsed.data.sessionId)
      .eq("attempt_number", 1)
      .eq("is_correct", true);

    // Count final correct (latest attempt per card that is correct)
    // Get all responses for this session
    const { data: allResponses } = await supabase
      .from("quiz_responses")
      .select("card_id, attempt_number, is_correct")
      .eq("session_id", parsed.data.sessionId)
      .order("attempt_number", { ascending: false });

    // Get the latest attempt per card
    const latestByCard = new Map<string, boolean>();
    for (const r of allResponses ?? []) {
      if (!latestByCard.has(r.card_id)) {
        latestByCard.set(r.card_id, r.is_correct);
      }
    }
    const finalCorrect = Array.from(latestByCard.values()).filter(Boolean).length;

    // Update session
    const { data: session, error: sessionError } = await supabase
      .from("quiz_sessions")
      .update({
        first_pass_correct: firstPassCorrect ?? 0,
        final_correct: finalCorrect,
        completed: true,
        completed_at: now,
      })
      .eq("session_id", parsed.data.sessionId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (sessionError) {
      console.error("[api/flashcards/:deckId/quiz] session complete failed:", sessionError.message);
      return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
    }

    // Update deck last_studied_at and mastery_pct
    const { data: allCards } = await supabase
      .from("flashcards")
      .select("mastery")
      .eq("deck_id", deckId)
      .eq("user_id", user.id);

    const totalCards = allCards?.length ?? 0;
    const masteredCount = allCards?.filter((c) => c.mastery === "mastered").length ?? 0;
    const masteryPct = totalCards > 0 ? (masteredCount / totalCards) * 100 : 0;

    await supabase
      .from("flashcard_decks")
      .update({
        last_studied_at: now,
        mastery_pct: Math.round(masteryPct * 100) / 100,
      })
      .eq("deck_id", deckId)
      .eq("user_id", user.id);

    return NextResponse.json({ session });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/**
 * PATCH /api/flashcards/:deckId/quiz
 * Record a quiz response and update card mastery.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { deckId } = await context.params;
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

  // For PATCH, we expect respond action fields directly
  const parsed = z.object({
    sessionId: z.string().uuid(),
    cardId: z.string().uuid(),
    attemptNumber: z.number().int().min(1).max(10),
    isCorrect: z.boolean(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Verify session belongs to this deck and user
  const { data: sessionCheck } = await supabase
    .from("quiz_sessions")
    .select("session_id")
    .eq("session_id", parsed.data.sessionId)
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .single();

  if (!sessionCheck) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Record quiz response
  const { data: response, error: responseError } = await supabase
    .from("quiz_responses")
    .insert({
      session_id: parsed.data.sessionId,
      card_id: parsed.data.cardId,
      user_id: user.id,
      attempt_number: parsed.data.attemptNumber,
      is_correct: parsed.data.isCorrect,
    })
    .select()
    .single();

  if (responseError) {
    console.error("[api/flashcards/:deckId/quiz] response insert failed:", responseError.message);
    return NextResponse.json({ error: "Failed to record response" }, { status: 500 });
  }

  // Update card stats
  const { data: card } = await supabase
    .from("flashcards")
    .select("times_seen, times_correct")
    .eq("card_id", parsed.data.cardId)
    .eq("user_id", user.id)
    .single();

  if (card) {
    const newTimesSeen = card.times_seen + 1;
    const newTimesCorrect = card.times_correct + (parsed.data.isCorrect ? 1 : 0);
    const newMastery = calculateMastery(newTimesSeen, newTimesCorrect);

    const { data: updatedCard } = await supabase
      .from("flashcards")
      .update({
        times_seen: newTimesSeen,
        times_correct: newTimesCorrect,
        mastery: newMastery,
        last_seen_at: now,
      })
      .eq("card_id", parsed.data.cardId)
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
      .select()
      .single();

    return NextResponse.json({ response, updatedCard });
  }

  return NextResponse.json({ response });
}
