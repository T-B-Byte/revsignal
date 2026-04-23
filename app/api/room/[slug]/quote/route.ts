import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendQuoteNotification,
  sendQuoteConfirmation,
} from "@/lib/sendgrid";
import {
  buildQuoteNotificationEmail,
  buildQuoteConfirmationEmail,
} from "@/lib/email-templates";

const limiter = rateLimit({ interval: 60_000 });

const quoteSchema = z.object({
  password: z.string().min(1).max(200),
  selected_items: z
    .array(
      z.object({
        product_id: z.union([z.literal("custom"), z.string().uuid()]),
        product_name: z.string().max(200),
        tier: z.string().max(100),
        quantity: z.number().int().positive().optional(),
        unit_price: z.number().min(0),
        subtotal: z.number().min(0),
        notes: z.string().max(1000).optional(),
      })
    )
    .max(20),
  total_price: z.number().min(0).nullable(),
  prospect_name: z.string().max(200).optional(),
  prospect_email: z.string().email().max(200).optional(),
  prospect_title: z.string().max(200).optional(),
  prospect_notes: z.string().max(2000).optional(),
});

/**
 * POST /api/room/[slug]/quote — Submit a quote from the public deal room
 * Public endpoint. Uses admin client to bypass RLS for inserts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || slug.length > 100) {
      return NextResponse.json({ error: "Invalid room" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = limiter.check(10, `room:${slug}:quote:${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = quoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify room + password
    const { data: room, error } = await supabase
      .from("deal_rooms")
      .select("room_id, user_id, company_id, password_hash, status, expires_at, show_quote_builder")
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      return NextResponse.json({ error: "This room has expired" }, { status: 410 });
    }

    if (!room.show_quote_builder) {
      return NextResponse.json({ error: "Quote builder is not available" }, { status: 403 });
    }

    const valid = await bcrypt.compare(parsed.data.password, room.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Recompute total server-side to prevent client-side tampering
    const computedTotal = parsed.data.selected_items.reduce((sum, item) => sum + item.subtotal, 0);

    // Insert quote
    const { data: quote, error: insertError } = await supabase
      .from("deal_room_quotes")
      .insert({
        room_id: room.room_id,
        user_id: room.user_id,
        company_id: room.company_id,
        selected_items: parsed.data.selected_items,
        total_price: computedTotal,
        prospect_name: parsed.data.prospect_name || null,
        prospect_email: parsed.data.prospect_email || null,
        prospect_title: parsed.data.prospect_title || null,
        prospect_notes: parsed.data.prospect_notes || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select("quote_id, status, submitted_at")
      .single();

    if (insertError) {
      console.error("Quote insert error:", insertError.message);
      return NextResponse.json({ error: "Failed to submit quote" }, { status: 500 });
    }

    // Send notifications in parallel. Never block the API response on email failures.
    try {
      const [ownerResult, companyResult] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("email")
          .eq("user_id", room.user_id)
          .maybeSingle(),
        supabase
          .from("gtm_company_profiles")
          .select("name")
          .eq("company_id", room.company_id)
          .maybeSingle(),
      ]);

      const ownerEmail = ownerResult.data?.email ?? null;
      const companyName = companyResult.data?.name ?? "Deal Room";

      const emailTasks: Promise<unknown>[] = [];

      if (ownerEmail) {
        emailTasks.push(
          sendQuoteNotification(
            ownerEmail,
            companyName,
            computedTotal,
            parsed.data.selected_items.length,
            buildQuoteNotificationEmail({
              companyName,
              roomSlug: slug,
              items: parsed.data.selected_items,
              totalPrice: computedTotal,
              prospectName: parsed.data.prospect_name ?? null,
              prospectEmail: parsed.data.prospect_email ?? null,
              prospectTitle: parsed.data.prospect_title ?? null,
              prospectNotes: parsed.data.prospect_notes ?? null,
              quoteId: quote.quote_id,
            })
          )
        );
      } else {
        console.error(
          "[quote] No owner email found for user_id:",
          room.user_id
        );
      }

      if (parsed.data.prospect_email && ownerEmail) {
        emailTasks.push(
          sendQuoteConfirmation(
            parsed.data.prospect_email,
            ownerEmail,
            buildQuoteConfirmationEmail({
              prospectName: parsed.data.prospect_name ?? null,
              items: parsed.data.selected_items,
              totalPrice: computedTotal,
            })
          )
        );
      }

      const results = await Promise.allSettled(emailTasks);
      for (const r of results) {
        if (r.status === "rejected") {
          console.error("[quote] Email send rejected:", r.reason);
        } else if (
          r.value &&
          typeof r.value === "object" &&
          "success" in r.value &&
          !(r.value as { success: boolean }).success
        ) {
          console.error(
            "[quote] Email send failed:",
            (r.value as { error?: string }).error
          );
        }
      }
    } catch (notifyError) {
      console.error(
        "[quote] Notification pipeline error:",
        notifyError instanceof Error ? notifyError.message : notifyError
      );
    }

    return NextResponse.json({ quote }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
