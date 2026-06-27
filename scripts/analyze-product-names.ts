import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { generateProductName } from '../src/modules/products/utils/nameGenerator';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const args = process.argv.slice(2);
  const writeMode = args.includes('--write');

  console.log(`Starting product name analysis (${writeMode ? 'WRITE mode' : 'DRY RUN mode'})...`);

  // 1. Fetch fiber codes
  const { data: fiberCodes, error: fcError } = await supabase
    .from('c_kody_vlakna')
    .select('id, nazev');
  
  if (fcError) {
    console.error("Error fetching fiber codes:", fcError.message);
    process.exit(1);
  }

  // 2. Fetch all products
  const { data: products, error: prodError } = await supabase
    .from('produkty')
    .select('id, sku, nazev, kategorie_id, specifikace')
    .order('sku');

  if (prodError) {
    console.error("Error fetching products:", prodError.message);
    process.exit(1);
  }

  console.log(`Fetched ${products.length} products. Analyzing names...`);

  let mismatchCount = 0;
  let successCount = 0;
  const updates: Array<{ id: string; sku: string; oldName: string; newName: string }> = [];

  for (const product of products) {
    const specs = product.specifikace || {};
    const generatedName = generateProductName(specs, product.kategorie_id, fiberCodes || []);

    if (!generatedName || generatedName === product.kategorie_id) {
      continue;
    }

    if (product.nazev !== generatedName) {
      mismatchCount++;
      updates.push({
        id: product.id,
        sku: product.sku,
        oldName: product.nazev,
        newName: generatedName
      });
    } else {
      successCount++;
    }
  }

  console.log("\n--- Analysis Summary ---");
  console.log(`Total analyzed products: ${products.length}`);
  console.log(`Matching names: ${successCount}`);
  console.log(`Mismatched names: ${mismatchCount}`);

  if (mismatchCount > 0) {
    console.log("\nMismatched Products Detail:");
    updates.forEach((u, index) => {
      console.log(`[${index + 1}] SKU: ${u.sku}`);
      console.log(`    Current: "${u.oldName}"`);
      console.log(`    Gen:     "${u.newName}"`);
    });

    if (writeMode) {
      console.log(`\nUpdating ${mismatchCount} products in the database...`);
      for (const u of updates) {
        const { error } = await supabase
          .from('produkty')
          .update({ nazev: u.newName })
          .eq('id', u.id);
        
        if (error) {
          console.error(`❌ Failed to update product ${u.sku}:`, error.message);
        } else {
          console.log(`✅ Updated product ${u.sku}`);
        }
      }
      console.log("\nSynchronization complete!");
    } else {
      console.log("\nRun with '--write' flag to apply these changes to the database.");
    }
  } else {
    console.log("\nAll product names are completely up-to-date with current methodology!");
  }
}

run();
