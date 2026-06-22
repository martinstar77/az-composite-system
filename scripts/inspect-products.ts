import { Client } from 'pg'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const password = process.env.DB_PASSWORD
const isLocal = process.argv.includes('--local')

const client = isLocal
  ? new Client({
      user: 'postgres',
      host: '127.0.0.1',
      database: 'postgres',
      password: 'postgres',
      port: 54322,
    })
  : new Client({
      user: 'postgres.natwtoqreniqupbvulso',
      host: 'aws-0-eu-west-1.pooler.supabase.com',
      database: 'postgres',
      password: password || process.env.SUPABASE_DB_PASSWORD, // fallback
      port: 6543,
      ssl: { rejectUnauthorized: false }
    })

async function run() {
  await client.connect()
  console.log('✅ Connected to DB.')

  const { rows } = await client.query(`
    SELECT id, sku, nazev, kategorie_id, specifikace
    FROM produkty
    WHERE deleted_at IS NULL
  `)

  console.log(`Total active products: ${rows.length}`)

  const categories = new Set<string>()
  const subcategories = new Set<string>()
  const rollProducts: any[] = []

  for (const row of rows) {
    categories.add(row.kategorie_id)
    const specs = row.specifikace || {}
    if (specs.podkategorie) {
      subcategories.add(specs.podkategorie)
    }

    const isRoll = 
      specs.typ_baleni === 'role' || 
      specs.jednotka_baleni === 'role' ||
      row.sku.startsWith('ST-') || 
      row.sku.startsWith('FT-') ||
      specs.podkategorie === 'BF' ||
      specs.podkategorie === 'RF' ||
      specs.podkategorie === 'PP' ||
      specs.podkategorie === 'PP-PTFE' ||
      specs.podkategorie === 'BC' ||
      specs.podkategorie === 'FM' ||
      (specs.podkategorie === 'FCH' && (specs.podtyp_fch === 'TAPE' || specs.podtyp_fch === 'SPRL' || specs.podtyp_fch === 'OMEGA' || specs.podtyp_fch === 'TTUBE'))

    if (isRoll || specs.delka_m != null) {
      rollProducts.push({
        id: row.id,
        sku: row.sku,
        nazev: row.nazev,
        kategorie_id: row.kategorie_id,
        podkategorie: specs.podkategorie,
        delka_m: specs.delka_m,
        typ_baleni: specs.typ_baleni,
        specs
      })
    }
  }

  console.log('Categories present:', Array.from(categories))
  console.log('Subcategories present:', Array.from(subcategories))
  console.log(`Roll or length-bearing products: ${rollProducts.length}`)
  console.log('\nSample roll products:')
  rollProducts.slice(0, 30).forEach(p => {
    console.log(`- SKU: ${p.sku} | Name: ${p.nazev} | Cat: ${p.kategorie_id} | Podcat: ${p.podkategorie} | Len: ${p.delka_m} | Pack: ${p.typ_baleni}`)
  })

  await client.end()
}

run().catch(console.error)
