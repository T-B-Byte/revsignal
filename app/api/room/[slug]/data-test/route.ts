import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendDataTestNotification,
  sendDataTestConfirmation,
} from "@/lib/sendgrid";
import {
  buildDataTestNotificationEmail,
  buildDataTestConfirmationEmail,
} from "@/lib/email-templates";

const limiter = rateLimit({ interval: 60_000 });

const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

const MAX_DOMAINS = 500;

const dataTestSchema = z.object({
  password: z.string().min(1).max(200),
  domains: z
    .array(z.string().max(253).regex(domainRegex, "Invalid domain format"))
    .min(1)
    .max(MAX_DOMAINS),
  scope: z.enum(["personas_intent", "full_schema"]).default("personas_intent"),
  prospect_name: z.string().max(200).optional(),
  prospect_email: z.string().email().max(200).optional(),
  prospect_company: z.string().max(200).optional(),
});

/**
 * POST /api/room/[slug]/data-test — Submit a data test request
 * Public endpoint. Prospects upload domains (max 500) for a limited data test.
 * Standard scope (personas_intent) is auto-approved.
 * Full schema scope requires Tina's approval.
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
    const { success } = limiter.check(10, `room:${slug}:data-test:${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = dataTestSchema.safeParse(body);
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
      .select("room_id, user_id, company_id, password_hash, status, expires_at")
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      return NextResponse.json({ error: "This room has expired" }, { status: 410 });
    }

    const valid = await bcrypt.compare(parsed.data.password, room.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Deduplicate and normalize domains
    const uniqueDomains = [...new Set(parsed.data.domains.map((d) => d.toLowerCase().trim()))];

    // Determine initial status based on scope
    const initialStatus =
      parsed.data.scope === "full_schema" ? "pending_approval" : "domains_uploaded";

    const { data: test, error: insertError } = await supabase
      .from("deal_room_data_tests")
      .insert({
        room_id: room.room_id,
        user_id: room.user_id,
        company_id: room.company_id,
        scope: parsed.data.scope,
        status: initialStatus,
        uploaded_domains: uniqueDomains,
        domain_count: uniqueDomains.length,
        approval_requested_at:
          parsed.data.scope === "full_schema" ? new Date().toISOString() : null,
        prospect_name: parsed.data.prospect_name || null,
        prospect_email: parsed.data.prospect_email || null,
        prospect_company: parsed.data.prospect_company || null,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30-day expiry
      })
      .select("test_id, status, domain_count, scope")
      .single();

    if (insertError) {
      console.error("Data test insert error:", insertError.message);
      return NextResponse.json({ error: "Failed to submit data test" }, { status: 500 });
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
          sendDataTestNotification(
            ownerEmail,
            companyName,
            test.domain_count,
            parsed.data.scope,
            buildDataTestNotificationEmail({
              companyName,
              roomSlug: slug,
              scope: parsed.data.scope,
              domainCount: test.domain_count,
              domains: uniqueDomains,
              prospectName: parsed.data.prospect_name ?? null,
              prospectEmail: parsed.data.prospect_email ?? null,
              prospectCompany: parsed.data.prospect_company ?? null,
              testId: test.test_id,
            })
          )
        );
      } else {
        console.error(
          "[data-test] No owner email found for user_id:",
          room.user_id
        );
      }

      if (parsed.data.prospect_email && ownerEmail) {
        emailTasks.push(
          sendDataTestConfirmation(
            parsed.data.prospect_email,
            ownerEmail,
            buildDataTestConfirmationEmail({
              prospectName: parsed.data.prospect_name ?? null,
              scope: parsed.data.scope,
              domainCount: test.domain_count,
            })
          )
        );
      }

      const results = await Promise.allSettled(emailTasks);
      for (const r of results) {
        if (r.status === "rejected") {
          console.error("[data-test] Email send rejected:", r.reason);
        } else if (
          r.value &&
          typeof r.value === "object" &&
          "success" in r.value &&
          !(r.value as { success: boolean }).success
        ) {
          console.error(
            "[data-test] Email send failed:",
            (r.value as { error?: string }).error
          );
        }
      }
    } catch (notifyError) {
      console.error(
        "[data-test] Notification pipeline error:",
        notifyError instanceof Error ? notifyError.message : notifyError
      );
    }

    return NextResponse.json({ test }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
