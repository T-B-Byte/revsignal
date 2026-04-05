import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/coaching/landing-brief
 *
 * Returns the most recent morning briefing for the authenticated user.
 * Unlike /api/agents/briefing (today-only), this returns the latest
 * briefing regardless of date, with a staleness flag so the UI can
 * offer a refresh.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Fetch the most recent briefing (not just today's)
  const { data: briefing, error } = await supabase
    .from("daily_briefings")
    .select("briefing_id, briefing_date, content, edited_content, generated_at, section_notes")
    .eq("user_id", user.id)
    .order("briefing_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[api/coaching/landing-brief] DB error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (!briefing) {
    return NextResponse.json({ briefing: null, isStale: true });
  }

  const content = briefing.edited_content || briefing.content;
  const isStale = briefing.briefing_date !== today;

  if (!content) {
    return NextResponse.json({ briefing: null, isStale: true });
  }

  // Parse markdown sections into structured data for compact display
  const sections = parseBriefingSections(content);

  return NextResponse.json({
    briefing: content,
    briefingId: briefing.briefing_id,
    briefingDate: briefing.briefing_date,
    generatedAt: briefing.generated_at,
    isStale,
    sections,
    sectionNotes: briefing.section_notes ?? {},
  });
}

/**
 * Parses the briefing markdown into named sections.
 * Returns a map of section key -> content string.
 */
function parseBriefingSections(
  markdown: string
): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = markdown.split("\n");
  let currentKey = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)/);
    if (heading) {
      // Save previous section
      if (currentKey) {
        sections[currentKey] = currentLines.join("\n").trim();
      }
      currentKey = heading[1].trim();
      currentLines = [];
    } else if (currentKey) {
      currentLines.push(line);
    }
  }

  // Save last section
  if (currentKey) {
    sections[currentKey] = currentLines.join("\n").trim();
  }

  return sections;
}
