import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for admin bypass

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importProducts() {
  const filePath = path.resolve(process.cwd(), 'data_imports/01_produkty_template.json');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  let products;
  
  try {
    products = JSON.parse(rawData);
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return;
  }

  console.log(`Found ${products.length} products to import. Starting import...`);

  for (const product of products) {
    // Remove the _comment field as it's not in the DB schema
    const { _comment, ...productData } = product;

    const { data, error } = await supabase
      .from('produkty')
      .upsert(productData, { onConflict: 'sku' }) // Updates if SKU exists
      .select();

    if (error) {
      console.error(`❌ Failed to import SKU: ${productData.sku}`, error.message);
    } else {
      console.log(`✅ Successfully imported SKU: ${productData.sku}`);
    }
  }
  
  console.log('Import finished.');
}

importProducts();
