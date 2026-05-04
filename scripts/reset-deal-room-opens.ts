/**
 * One-time cleanup: delete all access log entries and reset view counts.
 * Run before the owner-preview fix goes live so counts start clean.
 */
import { getAdminClient } from "./lib/supabase";

async function main() {
  const supabase = getAdminClient();

  const { count: logCount } = await supabase
    .from("deal_room_access_log")
    .select("*", { count: "exact", head: true });

  const { count: roomCount } = await supabase
    .from("deal_rooms")
    .select("*", { count: "exact", head: true });

  console.log(`Found ${logCount ?? 0} access log entries across ${roomCount ?? 0} rooms.`);

  const { error: deleteError } = await supabase
    .from("deal_room_access_log")
    .delete()
    .neq("log_id", "00000000-0000-0000-0000-000000000000");

  if (deleteError) {
    console.error("Failed to delete access logs:", deleteError.message);
    process.exit(1);
  }

  console.log(`Deleted ${logCount ?? 0} access log entries.`);

  const { error: resetError } = await supabase
    .from("deal_rooms")
    .update({ view_count: 0, last_viewed_at: null })
    .neq("room_id", "00000000-0000-0000-0000-000000000000");

  if (resetError) {
    console.error("Failed to reset room view counts:", resetError.message);
    process.exit(1);
  }

  console.log(`Reset view_count and last_viewed_at on ${roomCount ?? 0} rooms.`);
  console.log("Done. All open counts start fresh.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
