import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log("Signing in as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@az-composites.cz',
    password: 'AdminPassword123!'
  });

  if (authError) {
    console.error("Sign in failed:", authError.message);
    return;
  }

  console.log("✅ Sign in successful. User ID:", authData.user?.id);

  // Set the authorization header on the client manually just in case
  const session = authData.session;
  console.log("Token exists:", !!session?.access_token);

  console.log("\n1. Querying own profile...");
  const { data: profile, error: profileErr } = await supabase
    .from('profily_uzivatelu')
    .select('*')
    .single();
  console.log("Profile:", profile, profileErr || "");

  console.log("\n2. Querying c_role_uzivatelu...");
  const { data: roles, error: rolesErr } = await supabase
    .from('c_role_uzivatelu')
    .select('*');
  console.log("Roles count:", roles?.length, rolesErr || "");
  console.log("Roles:", roles);

  console.log("\n3. Querying c_opravneni...");
  const { data: perms, error: permsErr } = await supabase
    .from('c_opravneni')
    .select('*');
  console.log("Permissions count:", perms?.length, permsErr || "");

  console.log("\n4. Querying role_opravneni...");
  const { data: matrix, error: matrixErr } = await supabase
    .from('role_opravneni')
    .select('*');
  console.log("Matrix count:", matrix?.length, matrixErr || "");
}

run();
