/**
 * One-time script: Convert Leadscale and Informa TechTarget deals to prospects,
 * then delete the deals.
 *
 * Usage: npx tsx scripts/convert-deals-to-prospects.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COMPANIES_TO_CONVERT = ["Leadscale", "Informa TechTarget"];

async function main() {
  // Find the deals
  const { data: deals, error: fetchError } = await supabase
    .from("deals")
    .select("*")
    .in("company", COMPANIES_TO_CONVERT);

  if (fetchError) {
    console.error("Failed to fetch deals:", fetchError.message);
    process.exit(1);
  }

  if (!deals || deals.length === 0) {
    // Try case-insensitive search
    const { data: allDeals } = await supabase
      .from("deals")
      .select("deal_id, company, acv, notes, contacts, user_id, deployment_method, product_tier");
    
    console.log("No exact matches. All deals in DB:");
    allDeals?.forEach((d) => console.log(`  - "${d.company}" (${d.deal_id})`));
    process.exit(1);
  }

  console.log(`Found ${deals.length} deals to convert:\n`);

  for (const deal of deals) {
    console.log(`Converting: ${deal.company} (deal_id: ${deal.deal_id})`);
    console.log(`  ACV: ${deal.acv ?? "none"}, Stage: ${deal.stage}, Notes: ${deal.notes?.slice(0, 80) ?? "none"}`);

    // Create prospect from deal data
    const { data: prospect, error: insertError } = await supabase
      .from("prospects")
      .insert({
        user_id: deal.user_id,
        company: deal.company,
        estimated_acv: deal.acv,
        contacts: deal.contacts ?? [],
        research_notes: deal.notes,
        source: "converted_from_deal",
        last_researched_date: new Date().toISOString(),
      })
      .select("id, company")
      .single();

    if (insertError) {
      console.error(`  ERROR creating prospect: ${insertError.message}`);
      continue;
    }

    console.log(`  Created prospect: ${prospect.id}`);

    // Delete the deal
    const { error: deleteError } = await supabase
      .from("deals")
      .delete()
      .eq("deal_id", deal.deal_id);

    if (deleteError) {
      console.error(`  ERROR deleting deal: ${deleteError.message}`);
      continue;
    }

    console.log(`  Deleted deal: ${deal.deal_id}`);
    console.log();
  }

  console.log("Done.");
}

main();
