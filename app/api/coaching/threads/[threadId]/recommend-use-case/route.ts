import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ threadId: string }> };

interface ThreadExemplar {
  company: string | null;
  title: string;
  prospect_use_case: string;
}

interface DealLite {
  company: string | null;
  notes: string | null;
}

interface CompanyLite {
  name: string;
  description: string | null;
  why_they_need_us: string | null;
  recent_news: string | null;
}

const SYSTEM_PROMPT = `You are RevSignal's Strategist. You are recommending a "prospect use case" for a single company based on patterns learned from other prospects' use cases.

A prospect use case is a 2-4 sentence description of what the prospect plans to do with pharosIQ DaaS data. It captures:
- The workflow or product the data feeds into
- The primary buyer / target persona
- The strategic value to the prospect's business

Rules:
- Output 2-4 sentences. No headers, no bullets, no preamble.
- Be specific to this company's business model. Do not output a generic "use intent data for ABM". Match what THIS company actually does.
- Lean on patterns from the exemplars: how do similar companies in similar verticals describe their use cases?
- If the company is a competitor or data vendor, frame the use case as data licensing / OEM (their product enriches with pharosIQ data).
- If the company is a brand / advertiser / agency, frame around audience targeting, programmatic, or ABM.
- If the company is a martech platform, frame around enrichment, intent feeds, or workflow signals.
- Never use em dashes. Use commas, periods, colons, or parentheses.
- Never invent commitments, prices, or contacts. This is a hypothesis the user will edit.
- No hedging language ("might", "could potentially"). State the use case directly as a hypothesis.

Output only the use case text. Nothing else.`;

export async function POST(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { threadId } = await context.params;

  if (!UUID_RE.test(threadId)) {
    return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: thread, error: threadError } = await supabase
    .from("coaching_threads")
    .select(
      "thread_id, title, company, deal_id, prospect_id, project_id, ma_entity_id, prospect_use_case"
    )
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (threadError || !thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const targetCompany =
    (thread.company && thread.company.trim()) || thread.title.trim();

  if (!targetCompany) {
    return NextResponse.json(
      { error: "Thread has no company name to base a recommendation on" },
      { status: 400 }
    );
  }

  // Build optional context about the target company
  let dealContext: DealLite | null = null;
  if (thread.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("company, notes")
      .eq("deal_id", thread.deal_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (deal) {
      dealContext = {
        company: deal.company ?? null,
        notes: deal.notes ?? null,
      };
    }
  }

  let companyContext: CompanyLite | null = null;
  const { data: companyProfile } = await supabase
    .from("gtm_company_profiles")
    .select("name, description, why_they_need_us, recent_news")
    .eq("user_id", user.id)
    .ilike("name", targetCompany)
    .maybeSingle();
  if (companyProfile) {
    companyContext = {
      name: companyProfile.name,
      description: companyProfile.description ?? null,
      why_they_need_us: companyProfile.why_they_need_us ?? null,
      recent_news: companyProfile.recent_news ?? null,
    };
  }

  // Pull exemplars from other threads
  const { data: exemplarsRaw } = await supabase
    .from("coaching_threads")
    .select("title, company, prospect_use_case, updated_at")
    .eq("user_id", user.id)
    .neq("thread_id", threadId)
    .not("prospect_use_case", "is", null)
    .order("updated_at", { ascending: false })
    .limit(40);

  const exemplars: ThreadExemplar[] = (exemplarsRaw ?? [])
    .filter(
      (t): t is { title: string; company: string | null; prospect_use_case: string; updated_at: string } =>
        typeof t.prospect_use_case === "string" && t.prospect_use_case.trim().length > 0
    )
    .map((t) => ({
      title: t.title,
      company: t.company,
      prospect_use_case: t.prospect_use_case.trim(),
    }));

  const exemplarsBlock =
    exemplars.length === 0
      ? "(No prior use cases recorded yet. Generate based on the company profile alone.)"
      : exemplars
          .map((ex, i) => {
            const company = ex.company || ex.title;
            return `${i + 1}. ${company}\n   Use case: ${ex.prospect_use_case}`;
          })
          .join("\n\n");

  const targetBlock = [
    `Target company: ${targetCompany}`,
    companyContext?.description ? `Description: ${companyContext.description}` : null,
    companyContext?.why_they_need_us
      ? `Why they need us: ${companyContext.why_they_need_us}`
      : null,
    companyContext?.recent_news ? `Recent news: ${companyContext.recent_news}` : null,
    dealContext?.notes ? `Deal notes: ${dealContext.notes.slice(0, 800)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = `EXEMPLARS (use cases recorded for other prospects, learn the patterns):

${exemplarsBlock}

---

NEW PROSPECT (recommend a use case for this company, matching the patterns above):

${targetBlock}

Output only the 2-4 sentence prospect use case for ${targetCompany}.`;

  const anthropic = getAnthropic();

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    console.error("[recommend-use-case] Anthropic error:", err);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 502 }
    );
  }

  const recommendation =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text.trim()
      : "";

  if (!recommendation) {
    return NextResponse.json(
      { error: "Empty recommendation returned" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    use_case: recommendation,
    exemplars_count: exemplars.length,
    target_company: targetCompany,
  });
}
