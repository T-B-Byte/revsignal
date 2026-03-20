import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scanIntentStack } from "@/lib/intel/intent-stack-detector";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// 20 scans per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const bodySchema = z.object({
  url: z
    .string()
    .min(1)
    .max(2000)
    .refine(
      (val) => {
        try {
          const parsed = new URL(val);
          return parsed.protocol === "https:" || parsed.protocol === "http:";
        } catch {
          return false;
        }
      },
      { message: "Must be a valid HTTP or HTTPS URL" }
    ),
});

/**
 * POST /api/intel/intent-stack-scan
 *
 * Scans a website for ABM and intent data platform tags to infer
 * whether the company is likely consuming Bombora (or competing) intent data.
 *
 * Auth: Requires authenticated user.
 * Rate limit: 20 requests per user per hour.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success: withinLimit } = limiter.check(
    20,
    `intent-scan:${user.id}`
  );
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Provide a valid URL." },
      { status: 400 }
    );
  }

  try {
    const result = await scanIntentStack(body.url);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    // Surface user-friendly errors for common failures
    if (message.includes("Failed to fetch URL")) {
      return NextResponse.json(
        { error: `Could not reach that URL. ${message}` },
        { status: 502 }
      );
    }
    if (message.includes("Internal URLs")) {
      return NextResponse.json(
        { error: "Internal/private URLs are not allowed." },
        { status: 400 }
      );
    }
    if (message.includes("Invalid URL")) {
      return NextResponse.json(
        { error: "Invalid URL format." },
        { status: 400 }
      );
    }
    if (message.includes("timed out") || message.includes("aborted")) {
      return NextResponse.json(
        { error: "Request timed out. The site may be slow or blocking automated requests." },
        { status: 504 }
      );
    }

    console.error(
      "[api/intel/intent-stack-scan] Scan failed:",
      message
    );
    return NextResponse.json(
      { error: "Scan failed. Please try again." },
      { status: 500 }
    );
  }
}
