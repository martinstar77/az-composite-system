import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("=== USER PROFILES AND ROLES ===");
  const { data, error } = await supabase
    .from('profily_uzivatelu')
    .select('*');

  if (error) {
    console.error("Error reading profiles:", error.message);
  } else {
    console.log("Profiles in DB:", JSON.stringify(data, null, 2));
  }
}

run();
