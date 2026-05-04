import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/Users/tinabean/Projects/revsignal/.env.local' });

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ownerIps = (process.env.OWNER_IPS ?? '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  const { data, error } = await supabase
    .from('deal_room_access_log')
    .select('log_id, room_id, ip_address, user_agent, accessed_at, pages_viewed')
    .order('accessed_at', { ascending: false });

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  const all = data ?? [];
  const prospect = all.filter((r) => !ownerIps.includes(r.ip_address ?? ''));

  if (prospect.length === 0) {
    console.log('No prospect opens recorded.');
    return;
  }

  const roomIds = [...new Set(prospect.map((r) => r.room_id))];
  const { data: rooms } = await supabase
    .from('deal_rooms')
    .select('room_id, slug, gtm_company_profiles(name)')
    .in('room_id', roomIds);
  const roomMap = new Map(
    (rooms ?? []).map((r: any) => [
      r.room_id,
      r.gtm_company_profiles?.name ?? r.slug,
    ])
  );

  console.log('=== Prospect sessions (most recent first) ===\n');
  for (const r of prospect) {
    const tabs = (r.pages_viewed ?? []) as string[];
    const uniqueTabs = [...new Set(tabs)];
    const room = roomMap.get(r.room_id) ?? r.room_id;

    console.log(`Session: ${r.accessed_at}`);
    console.log(`  Room: ${room}`);
    console.log(`  IP: ${r.ip_address}`);
    console.log(`  User-Agent: ${r.user_agent ?? '—'}`);
    console.log(`  Total tab clicks: ${tabs.length}`);
    console.log(`  Unique tabs: ${uniqueTabs.length} → ${uniqueTabs.join(', ')}`);
    if (tabs.length > 0) {
      console.log(`  Click sequence: ${tabs.join(' → ')}`);
    }
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
