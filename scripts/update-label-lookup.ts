import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

async function updateDbForEnv(envFileName: string) {
  const envPath = path.resolve(process.cwd(), envFileName);
  if (!fs.existsSync(envPath)) {
    console.log(`⚠️ Environment file ${envFileName} does not exist, skipping.`);
    return;
  }

  console.log(`\nProcessing environment file: ${envFileName}...`);
  // Load variables manually to avoid caching / collision issues
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in ${envFileName}`);
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
    
    console.log(`Connecting to: ${supabaseUrl}...`);
    const { data, error } = await supabase
      .from('c_typy_labelu')
      .update({ nazev: 'AZ label' })
      .eq('id', 'vlastni')
      .select();

    if (error) {
      console.error(`❌ Error updating lookup in ${envFileName}:`, error.message);
    } else {
      console.log(`✅ Successfully updated 'vlastni' lookup value to 'AZ label' in DB:`, data);
    }
  } catch (err: any) {
    console.error(`❌ Unexpected error for ${envFileName}:`, err.message || err);
  }
}

async function run() {
  await updateDbForEnv('.env.local');
  await updateDbForEnv('.env.docker.local');
  console.log('\nDone updating label lookups.');
}

run();
