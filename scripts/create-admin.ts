import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'admin@az-composites.cz';
  const password = 'AdminPassword123!';

  console.log(`Checking if user ${email} exists...`);
  
  // Create user
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // Auto-confirm email so they can log in immediately
  });

  if (error) {
    if (error.message.includes('already been registered')) {
        console.log('Admin user already exists. Forcing role upgrade to admin...');
        // Force upgrade anyway just in case
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const adminUser = existingUsers.users.find(u => u.email === email);
        if (adminUser) {
           await supabase.from('profily_uzivatelu').update({ role_id: 'admin' }).eq('id', adminUser.id);
           console.log('✅ Role forced to admin.');
        }
    } else {
        console.error('Error creating user:', error.message);
    }
  } else {
    // Upgrade the user to admin role immediately after creation (overriding the trigger's default 'manager')
    if (data.user) {
      await supabase.from('profily_uzivatelu').update({ role_id: 'admin' }).eq('id', data.user.id);
    }
    console.log('✅ Admin user created successfully and role upgraded!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
}

createAdmin();
