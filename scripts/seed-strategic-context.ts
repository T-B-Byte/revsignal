/**
 * Seed script: Strategic context — stakeholders & foundational strategic notes
 *
 * Populates:
 *   - `stakeholders` table with pharosIQ leadership and key internal contacts
 *   - `strategic_notes` table with foundational DaaS business context
 *
 * Usage:
 *   npx tsx scripts/seed-strategic-context.ts
 *   npx tsx scripts/seed-strategic-context.ts --user-id <uuid>
 *   npx tsx scripts/seed-strategic-context.ts --dry-run
 */

import { getAdminClient, getUserId } from "./lib/supabase";

// ---------------------------------------------------------------------------
// Stakeholder data
// ---------------------------------------------------------------------------

interface StakeholderSeed {
  name: string;
  role: string;
  organization: string;
  is_internal: boolean;
  relationship: string;
  communication_style: string | null;
  sensitivities: string | null;
  motivations: string | null;
  influence_level: number;
  notes: string | null;
  tags: string[];
}

function buildStakeholders(): StakeholderSeed[] {
  return [
    {
      name: "Jeff Rokuskie",
      role: "CEO",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "sponsor",
      communication_style:
        "Direct, concise. Prefers executive summaries. Finance-oriented — lead with revenue math and valuation impact. Respects preparation and data-backed arguments.",
      sensitivities:
        "Wants to sell the company this year. Speed-to-revenue directly impacts valuation. Don't waste his time with unfocused proposals.",
      motivations:
        "Maximize company valuation for sale. Wants to see DaaS revenue materialize fast as proof of data asset value beyond services.",
      influence_level: 5,
      notes:
        "Key relationship. Built trust during KickFire days. He brought Tina in specifically for DaaS monetization.",
      tags: ["c-suite", "decision-maker", "sponsor"],
    },
    {
      name: "Ben Luck",
      role: "Chief Data Scientist",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "champion",
      communication_style:
        "Technical, thoughtful. Appreciates data-driven discussions. Wants to understand the 'why' behind data requests. Responsive via Slack and email.",
      sensitivities:
        "Protective of data quality and science team's bandwidth. Don't position DaaS work as replacing existing data products.",
      motivations:
        "Wants to see the data used in innovative ways. Excited about new revenue streams that validate the data asset's market value.",
      influence_level: 4,
      notes:
        "Critical ally for data access, API design, and sample data generation. Owns the data pipeline.",
      tags: ["technical", "data-access", "champion"],
    },
    {
      name: "Marty Fettig",
      role: "EVP Sales",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "neutral",
      communication_style:
        "Sales-minded, relationship-driven. Competitive. Responds well to pipeline metrics and win stories. Prefers quick calls over long emails.",
      sensitivities:
        "Protect his team's deals and relationships. DaaS must be positioned as additive to his pipeline, not competitive. Don't approach his accounts without coordination.",
      motivations:
        "Hitting sales targets. If DaaS deals close, he benefits. Needs to see how DaaS doesn't cannibalize or complicate existing service deals.",
      influence_level: 4,
      notes:
        "Relationship requires care. Frame DaaS as expanding the pie, not taking slices. Coordinate on any overlap between DaaS prospects and existing service accounts.",
      tags: ["sales-leadership", "coordination-required"],
    },
    {
      name: "Chris Vriavas",
      role: "CSO (Chief Strategy Officer)",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "neutral",
      communication_style:
        "Strategic, big-picture thinker. Appreciates frameworks and market positioning. Prefers structured presentations over ad-hoc updates.",
      sensitivities:
        "Responsible for overall company strategy. DaaS needs to fit within his strategic vision. Don't go around him on strategic decisions.",
      motivations:
        "Company growth and market positioning. Interested in how DaaS diversifies revenue and makes pharosIQ more attractive to acquirers.",
      influence_level: 4,
      notes:
        "Important strategic ally. Keep him informed on market positioning and competitive landscape for DaaS.",
      tags: ["c-suite", "strategy"],
    },
  ];
}

// ---------------------------------------------------------------------------
// Strategic notes data
// ---------------------------------------------------------------------------

interface StrategicNoteSeed {
  category: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
}

function buildStrategicNotes(): StrategicNoteSeed[] {
  return [
    {
      category: "institutional_context",
      title: "pharosIQ Revenue Structure",
      content:
        "pharosIQ generates ~$60M in revenue, primarily from B2B intent data services. $11M profit, no debt, ~1,373 employees. The company is a merger of MRP and CONTENTgine (March 2024). Current revenue is predominantly services-based (managed campaigns, content syndication). DaaS licensing is a new revenue line that diversifies the model and potentially commands higher valuation multiples from acquirers.",
      source: "seed_data",
      tags: ["revenue", "company-structure", "foundational"],
    },
    {
      category: "strategic_observation",
      title: "DaaS Valuation Multiplier Effect",
      content:
        "Data-as-a-Service businesses trade at 6-10x revenue multiples vs. 2-4x for services companies. Every dollar of recurring DaaS revenue pharosIQ generates improves the blended valuation multiple. For a company exploring a sale, demonstrating a growing DaaS line is high-leverage: even $1M in DaaS ARR could meaningfully move the needle on total company valuation.",
      source: "seed_data",
      tags: ["valuation", "strategy", "foundational"],
    },
    {
      category: "competitive_insight",
      title: "Intent Data Market Positioning",
      content:
        "The intent data market is dominated by Bombora (co-op model) and TechTarget (publisher-based). pharosIQ's differentiation: first-party data from proprietary content engagement + contact-level precision (not just account-level). Most competitors sell account-level signals. Contact-level data is the premium tier. Key competitors for DaaS: Bombora, TechTarget, G2 (review-based intent), Demandbase (platform-embedded), ZoomInfo (enrichment + intent).",
      source: "seed_data",
      tags: ["competitive", "positioning", "foundational"],
    },
    {
      category: "strategic_observation",
      title: "DaaS Pricing Framework",
      content:
        "Based on KickFire OEM deal precedent, DaaS licensing deals typically range $150K-$500K annually. Pricing levers: data volume (contacts/records), refresh frequency, exclusivity terms, geographic coverage, intent category depth. Entry deals should target $150K-$200K to reduce friction, with expansion paths to $300K+ through additional categories or geographies. Avoid sub-$100K deals that don't justify the integration effort.",
      source: "seed_data",
      tags: ["pricing", "strategy", "foundational"],
    },
    {
      category: "relationship_note",
      title: "Internal Stakeholder Dynamics",
      content:
        "Jeff (CEO) is the sponsor — he hired Tina specifically for DaaS monetization and is aligned on the vision. Ben (Chief Data Scientist) is the technical champion — controls data access and API design. Marty (EVP Sales) is neutral — needs to see DaaS as additive to his pipeline, not competitive. Chris (CSO) is the strategic gatekeeper — DaaS must fit his overall company narrative. Key dynamic: Marty's buy-in is essential for avoiding internal friction on account overlap. Frame all DaaS work as expanding total addressable market, not redirecting existing pipeline.",
      source: "seed_data",
      tags: ["internal", "stakeholders", "foundational"],
    },
    {
      category: "institutional_context",
      title: "Sale Timeline Urgency",
      content:
        "Jeff wants to sell the company this year. This creates urgency: every month of demonstrated DaaS traction improves the narrative for acquirers. The goal is to show a credible, growing DaaS revenue line — even early-stage deals and a healthy pipeline tell a valuation story. Speed matters more than perfection. Get deals closed, get revenue on the board, let the numbers speak.",
      source: "seed_data",
      tags: ["urgency", "timeline", "foundational"],
    },
    {
      category: "strategic_observation",
      title: "First 90 Days Priorities",
      content:
        "Tina's first 90 days should focus on: (1) Data access and sample generation with Ben's team, (2) Build 3-5 prospect conversations to validate pricing and packaging, (3) Close at least one letter of intent or pilot agreement, (4) Establish internal credibility by showing pipeline without stepping on existing deals. The playbook tracks all 12 workstreams but the first 30 days should heavily weight data access, ICP validation, and initial outreach.",
      source: "seed_data",
      tags: ["onboarding", "priorities", "foundational"],
    },
  ];
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seedStrategicContext(): Promise<number> {
  const isDryRun = process.argv.includes("--dry-run");
  const userId = getUserId();
  const supabase = getAdminClient();

  console.log(
    `[seed-strategic-context] ${isDryRun ? "DRY RUN — " : ""}Seeding stakeholders and strategic notes...`
  );

  let totalRecords = 0;

  // --- Stakeholders ---
  const stakeholders = buildStakeholders();
  console.log(`  Stakeholders: ${stakeholders.length} records`);

  if (!isDryRun) {
    const stakeholderRows = stakeholders.map((s) => ({
      ...s,
      user_id: userId,
    }));

    const { error: sError, data: sData } = await supabase
      .from("stakeholders")
      .upsert(stakeholderRows, {
        onConflict: "user_id,name,organization",
        ignoreDuplicates: false,
      })
      .select("stakeholder_id");

    if (sError) {
      console.error(
        "  [stakeholders] Upsert failed:",
        sError.message
      );
    } else {
      const count = sData?.length ?? 0;
      console.log(`  [stakeholders] Upserted ${count} records`);
      totalRecords += count;
    }
  } else {
    for (const s of stakeholders) {
      console.log(`    [DRY] ${s.name} (${s.role}, ${s.organization})`);
    }
    totalRecords += stakeholders.length;
  }

  // --- Strategic Notes ---
  const notes = buildStrategicNotes();
  console.log(`  Strategic Notes: ${notes.length} records`);

  if (!isDryRun) {
    const noteRows = notes.map((n) => ({
      ...n,
      user_id: userId,
    }));

    // Use insert — no unique constraint on notes, so duplicates on re-run are possible.
    // Check for existing notes with same title to avoid duplication.
    for (const row of noteRows) {
      const { data: existing } = await supabase
        .from("strategic_notes")
        .select("note_id")
        .eq("user_id", userId)
        .eq("title", row.title)
        .maybeSingle();

      if (existing) {
        // Update existing note
        const { error: uError } = await supabase
          .from("strategic_notes")
          .update({
            category: row.category,
            content: row.content,
            source: row.source,
            tags: row.tags,
          })
          .eq("note_id", existing.note_id);

        if (uError) {
          console.error(`  [notes] Update failed for "${row.title}":`, uError.message);
        } else {
          console.log(`  [notes] Updated: ${row.title}`);
          totalRecords++;
        }
      } else {
        const { error: iError } = await supabase
          .from("strategic_notes")
          .insert(row);

        if (iError) {
          console.error(`  [notes] Insert failed for "${row.title}":`, iError.message);
        } else {
          console.log(`  [notes] Inserted: ${row.title}`);
          totalRecords++;
        }
      }
    }
  } else {
    for (const n of notes) {
      console.log(`    [DRY] ${n.title} (${n.category})`);
    }
    totalRecords += notes.length;
  }

  console.log(
    `[seed-strategic-context] ${isDryRun ? "Would seed" : "Seeded"} ${totalRecords} total records`
  );

  return totalRecords;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

if (require.main === module) {
  seedStrategicContext()
    .then((count) => {
      console.log(`\n[seed-strategic-context] Done. ${count} records.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("\n[seed-strategic-context] Failed:", err);
      process.exit(1);
    });
}
