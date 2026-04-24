/**
 * One-off: swap surgeengine.app -> atlasiq.pharosiq.com in deal_rooms.audience_dashboard_url.
 * Run: npx tsx scripts/migrate-surgeengine-urls.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from('deal_rooms')
    .select('room_id, slug, audience_dashboard_url')
    .ilike('audience_dashboard_url', '%surgeengine.app%');

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No rows to update.');
    return;
  }

  console.log(`Found ${data.length} row(s):`);
  for (const row of data) {
    const newUrl = row.audience_dashboard_url.replace(
      /https:\/\/surgeengine\.app/g,
      'https://atlasiq.pharosiq.com',
    );
    console.log(`  ${row.slug}: ${row.audience_dashboard_url} -> ${newUrl}`);
    const { error: updateError } = await supabase
      .from('deal_rooms')
      .update({ audience_dashboard_url: newUrl })
      .eq('room_id', row.room_id);
    if (updateError) {
      console.error(`    Failed: ${updateError.message}`);
    }
  }
  console.log('Done.');
}

main();
