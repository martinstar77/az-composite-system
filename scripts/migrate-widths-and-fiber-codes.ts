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

// Static mapping for name generation inside the script
const MATERIAL_NAMES: Record<string, string> = {
  CF: "Carbon",
  GF: "Glass",
  AF: "Aramid",
  BIOF: "Bio Flax",
  BIOH: "Bio Hemp",
  OF: "Other",
  HF: "Hybrid"
};

const FORM_NAMES: Record<string, string> = {
  WF: "Fibre Fabric",
  UD: "UD Tape",
  BIAX: "Biaxial Fabric",
  MAT: "Fibre Mat"
};

const WEAVE_NAMES: Record<string, string> = {
  P: "Plain",
  T22: "Twill 2/2",
  T44: "Twill 4/4",
  NP: "Needle punched",
  EM: "Emulsion",
  PB: "Powder binder",
  ST: "Stitched",
  "090": "0/90°",
  "45": "±45°"
};

const FIBER_CODES: Record<string, string> = {
  syt45: "SYT45",
  syt45s: "SYT45S",
  tc33: "TC33",
  hts40: "HTS40",
  h2550: "H2550",
  af1000: "AF1000",
  af3000: "AF3000",
  as4: "AS4",
  tr30s: "TR30S"
};

const QUALITY_TIERS: Record<string, string> = {
  E: "Economy",
  V: "Visual",
  I: "Industry"
};

function generateName(specs: any): string {
  let materialStr = "";
  if (specs.materiál === "HF") {
    const mat1 = MATERIAL_NAMES[specs.material1] || "";
    const mat2 = MATERIAL_NAMES[specs.material2] || "";
    materialStr = mat1 && mat2 ? `${mat1} / ${mat2} Hybrid` : "Hybrid";
  } else {
    materialStr = MATERIAL_NAMES[specs.materiál] || "";
  }

  const formStr = FORM_NAMES[specs.typ] || "Fabric";
  const baseName = materialStr ? `${materialStr} ${formStr}` : formStr;

  const weightStr = specs.gramáž ? `${specs.gramáž}g/m2` : "";
  const towStr = specs.vlákno && specs.vlákno !== "NA" ? specs.vlákno : "";
  const weaveStr = WEAVE_NAMES[specs.vazba] || specs.vazba || "";
  const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : "";

  function getFiberCodeLabel(codeId: string) {
    if (!codeId || codeId.toLowerCase() === "na") return "";
    return FIBER_CODES[codeId.toLowerCase()] || codeId.toUpperCase();
  }

  let fiberCodeStr = "";
  if (specs.materiál === "HF") {
    const fc1 = getFiberCodeLabel(specs.kod_vlakna1);
    const fc2 = getFiberCodeLabel(specs.kod_vlakna2);
    fiberCodeStr = fc1 && fc2 ? `${fc1} / ${fc2}` : (fc1 || fc2 || "");
  } else {
    fiberCodeStr = getFiberCodeLabel(specs.kód_vlákna);
  }

  const useStr = QUALITY_TIERS[specs.použití] || "";

  const nameParts = [baseName, weightStr, towStr, weaveStr, widthStr].filter(Boolean);
  let fullName = nameParts.join(" ");

  const fiberParts = [fiberCodeStr, useStr].filter(Boolean);
  if (fiberParts.length > 0) {
    fullName += ` – ${fiberParts.join(" ")}`; // Uses long en-dash
  }

  return fullName;
}

function getDefaultFiberCode(material: string): string {
  if (material === "CF") return "syt45";
  if (material === "GF") return "tc33";
  if (material === "AF") return "af1000";
  return "tc33";
}

async function run() {
  console.log("Starting width and fiber code data migration...");

  // 1. Fetch all products in reinforcements category
  const { data: products, error } = await supabase
    .from('produkty')
    .select('*')
    .eq('kategorie_id', 'vyztuzne_materialy')
    .is('deleted_at', null);

  if (error) {
    console.error("Error fetching products:", error.message);
    process.exit(1);
  }

  console.log(`Found ${products?.length || 0} products to migrate.`);

  if (!products || products.length === 0) {
    console.log("No products to migrate.");
    process.exit(0);
  }

  for (const product of products) {
    const specs = product.specifikace || {};
    
    // Convert width: sirka_m -> sirka_cm (m * 100)
    let widthCm = 100;
    if (specs.sirka_cm !== undefined) {
      widthCm = parseInt(specs.sirka_cm) || 100;
    } else if (specs.sirka_m !== undefined) {
      widthCm = Math.round(parseFloat(specs.sirka_m) * 100);
      delete specs.sirka_m;
    }
    specs.sirka_cm = widthCm;

    // Convert brand/producer to Fiber Codes
    if (specs.materiál === "HF") {
      const mat1 = specs.material1 || "CF";
      const mat2 = specs.material2 || "AF";
      specs.kod_vlakna1 = specs.kod_vlakna1 || getDefaultFiberCode(mat1);
      specs.kod_vlakna2 = specs.kod_vlakna2 || getDefaultFiberCode(mat2);
      specs.kódy_vláken_složení = [specs.kod_vlakna1, specs.kod_vlakna2];
    } else {
      const mat = specs.materiál || "CF";
      specs.kód_vlákna = specs.kód_vlákna || getDefaultFiberCode(mat);
    }

    // Generate new SKU
    let newSku = product.sku;
    const fabForm = specs.typ || "WF";
    const fabMat = specs.materiál || "CF";
    const fabWeight = specs.gramáž || "200";
    const fabTow = specs.vlákno || "3K";
    const fabWeave = specs.vazba || "T22";
    const fabUse = specs.použití || "E";

    if (fabMat === "HF") {
      const mat1 = specs.material1 || "CF";
      const mat2 = specs.material2 || "AF";
      const fc1 = specs.kod_vlakna1.toUpperCase();
      const fc2 = specs.kod_vlakna2.toUpperCase();
      newSku = `${fabForm}-${mat1}${mat2}-${fabWeight}-${fabTow}-${fabWeave}-${widthCm}-${fc1}${fc2}-${fabUse}`;
    } else {
      const fc = specs.kód_vlákna.toUpperCase();
      newSku = `${fabForm}-${fabMat}-${fabWeight}-${fabTow}-${fabWeave}-${widthCm}-${fc}-${fabUse}`;
    }

    // Generate new Name
    const newName = generateName(specs);

    console.log(`Migrating ID ${product.id}:`);
    console.log(`  Old SKU: ${product.sku} -> New SKU: ${newSku}`);
    console.log(`  Old Name: ${product.nazev}`);
    console.log(`  New Name: ${newName}`);

    // Update product record
    const { error: updateError } = await supabase
      .from('produkty')
      .update({
        sku: newSku,
        nazev: newName,
        specifikace: specs
      })
      .eq('id', product.id);

    if (updateError) {
      console.error(`Error updating product ${product.id}:`, updateError.message);
    } else {
      console.log(`✅ Product ${product.id} successfully updated.`);
    }
  }

  console.log("🎉 Data migration completed!");
}

run();
