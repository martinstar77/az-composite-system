import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { InvoicePDF } from '../src/modules/invoicing/components/InvoicePDF';
import { vypocitejSoucty } from '../src/modules/invoicing/utils/calculations';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPdf() {
  console.log("Fetching first document...");
  const { data: doklad, error: dokladError } = await supabase
    .from('doklady')
    .select(`
      *,
      zakaznik:zakaznik_id ( * ),
      dodavatel:dodavatel_id ( * ),
      polozky:doklady_polozky ( * )
    `)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (dokladError) {
    console.error("Error fetching document:", dokladError);
    return;
  }

  if (!doklad) {
    console.log("No documents found in database. Create one first or check DB.");
    return;
  }

  console.log("Found document:", doklad.cislo, "typ:", doklad.typ);

  // Load firemni settings
  const { data: settingsData } = await supabase
    .from('firemni_nastaveni')
    .select('*')
    .eq('klic', 'profil')
    .maybeSingle();

  const firemniProfil = doklad.firemni_udaje_snapshot ?? settingsData?.hodnota;
  if (!firemniProfil) {
    console.error("Missing firemni profil settings.");
    return;
  }

  if (!doklad.firemni_udaje_snapshot) {
    doklad.firemni_udaje_snapshot = firemniProfil;
  }

  // Calculate totals and mock QR if needed
  const qrDataUri = null;

  console.log("Rendering PDF...");
  try {
    const buffer = await renderToBuffer(
      createElement(InvoicePDF, { doklad: doklad as any, qrDataUri }) as any
    );
    console.log("SUCCESS! Generated PDF buffer size:", buffer.byteLength);
  } catch (err: any) {
    console.error("ERROR rendering PDF:");
    console.error(err);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

testPdf();
