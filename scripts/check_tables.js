import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envFile = process.argv[2] === '--local' ? '.env.docker.local' : '.env.local';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(`Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in ${envFile}`);
  process.exit(1);
}

console.log(`Using environment: ${envFile} (URL: ${supabaseUrl})`);
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log('Checking projekty_planovani...');
  const { data: projData, error: projError } = await supabase
    .from('projekty_planovani')
    .select('id')
    .limit(1);

  if (projError) {
    console.error('projekty_planovani error:', projError.message || projError);
  } else {
    console.log('projekty_planovani exists! Data:', projData);
  }

  console.log('Checking milniky...');
  const { data: milData, error: milError } = await supabase
    .from('milniky')
    .select('id')
    .limit(1);

  if (milError) {
    console.error('milniky error:', milError.message || milError);
  } else {
    console.log('milniky exists! Data:', milData);
  }
}

check();
