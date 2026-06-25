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

async function check() {
  console.log("=== CHECKING ROLES ===");
  const { data: roles, error: rolesErr } = await supabase.from('c_role_uzivatelu').select('*');
  console.log("Roles count:", roles?.length, rolesErr || "");
  console.log("Roles:", roles);

  console.log("\n=== CHECKING PERMISSIONS ===");
  const { data: perms, error: permsErr } = await supabase.from('c_opravneni').select('*');
  console.log("Permissions count:", perms?.length, permsErr || "");
  console.log("Permissions:", perms ? perms.slice(0, 5) : null);

  console.log("\n=== CHECKING MATRIX ===");
  const { data: matrix, error: matrixErr } = await supabase.from('role_opravneni').select('*');
  console.log("Matrix count:", matrix?.length, matrixErr || "");
  console.log("Matrix:", matrix ? matrix.slice(0, 5) : null);
}

check();
