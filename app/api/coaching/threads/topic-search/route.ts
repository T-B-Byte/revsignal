import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type TopicType = "deal" | "prospect" | "project" | "ma_entity";

export interface TopicResult {
  id: string;
  type: TopicType;
  title: string;
  subtitle?: string;
}

/**
 * GET /api/coaching/threads/topic-search?q=search_term
 * Search across deals, prospects, projects, and M&A entities for linking to a thread.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 1) {
    return NextResponse.json({ topics: [] });
  }

  const pattern = `%${query}%`;
  const results: TopicResult[] = [];

  // Search deals
  const { data: deals } = await supabase
    .from("deals")
    .select("deal_id, company, stage")
    .eq("user_id", user.id)
    .ilike("company", pattern)
    .limit(5);

  if (deals) {
    for (const d of deals) {
      results.push({
        id: d.deal_id,
        type: "deal",
        title: d.company,
        subtitle: d.stage.replace(/_/g, " "),
      });
    }
  }

  // Search prospects
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, company, icp_category, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .ilike("company", pattern)
    .limit(5);

  if (prospects) {
    for (const p of prospects) {
      results.push({
        id: p.id,
        type: "prospect",
        title: p.company,
        subtitle: p.icp_category ?? "Prospect",
      });
    }
  }

  // Search projects
  const { data: projects } = await supabase
    .from("projects")
    .select("project_id, name, status, category")
    .eq("user_id", user.id)
    .ilike("name", pattern)
    .limit(5);

  if (projects) {
    for (const pr of projects) {
      results.push({
        id: pr.project_id,
        type: "project",
        title: pr.name,
        subtitle: pr.category ?? pr.status,
      });
    }
  }

  // Search M&A entities
  const { data: maEntities } = await supabase
    .from("ma_entities")
    .select("entity_id, company, entity_type, stage")
    .eq("user_id", user.id)
    .ilike("company", pattern)
    .limit(5);

  if (maEntities) {
    for (const m of maEntities) {
      results.push({
        id: m.entity_id,
        type: "ma_entity",
        title: m.company,
        subtitle: `${m.entity_type} · ${m.stage.replace(/_/g, " ")}`,
      });
    }
  }

  return NextResponse.json({ topics: results });
}
