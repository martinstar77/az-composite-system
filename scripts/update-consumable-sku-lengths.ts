/**
 * update-consumable-sku-lengths.ts
 *
 * Migrační skript: Přidá délku role (-R{délka}) do SKU existujících rolí (tkaniny i spotřební materiály).
 *
 * Problém: SKU generátor dosud ignoroval délku role u všech produktů prodávaných v rolích.
 *   Starý formát: WF-CF-160-T22-3K-SYT45-100-E       (šíře 100cm, bez délky)
 *   Nový formát:  WF-CF-160-T22-3K-SYT45-100-E-R100  (+ délka role 100m)
 *
 * Skript:
 *   1. Najde všechny produkty v rolích (kategorie 'vyztuzne_materialy' s typem balení 'role'
 *      a 'consumables' s podkategoriemi BF, RF, PP, PP-PTFE, BC, FM, ST, FT, FCH), kde specs.delka_m existuje
 *   2. Zkontroluje konflikty (SKU uniqueness)
 *   3. Aktualizuje SKU a vytiskne přehled změn pro audit
 *
 * Spuštění:
 *   DB_PASSWORD="vaše-heslo" npx tsx scripts/update-consumable-sku-lengths.ts
 *
 * Přidejte --dry-run pro simulaci bez změn v DB:
 *   DB_PASSWORD="xxx" npx tsx scripts/update-consumable-sku-lengths.ts --dry-run
 *
 * Přidejte --local pro lokální DB:
 *   npx tsx scripts/update-consumable-sku-lengths.ts --local [--dry-run]
 */

import { Client } from 'pg'

const password = process.env.DB_PASSWORD
const isDryRun = process.argv.includes('--dry-run')
const isLocal = process.argv.includes('--local')

if (!password && !isLocal) {
  console.error('❌ ERROR: Nastavte proměnnou prostředí DB_PASSWORD.')
  console.error('   Produkce: DB_PASSWORD="heslo" npx tsx scripts/update-consumable-sku-lengths.ts [--dry-run]')
  console.error('   Lokálně:  npx tsx scripts/update-consumable-sku-lengths.ts --local [--dry-run]')
  process.exit(1)
}

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
      password: password,
      port: 6543,
      ssl: { rejectUnauthorized: false }
    })


async function run() {
  console.log(`\n🔄 AZ-Composites: Aktualizace SKU pro všechny role (Tkaniny + Consumables)`)
  console.log(`   Režim: ${isDryRun ? '🔍 DRY RUN (žádné změny v DB)' : '✏️  ŽIVÝ RUN (zapisuje do DB)'}`)
  console.log('─'.repeat(70))

  await client.connect()
  console.log('✅ Připojeno k databázi.\n')

  // 1. Načti všechny kandidáty na role
  const { rows } = await client.query<{
    id: string
    sku: string
    nazev: string
    kategorie_id: string
    specifikace: any
  }>(`
    SELECT id, sku, nazev, kategorie_id, specifikace
    FROM produkty
    WHERE deleted_at IS NULL
      AND (
        (kategorie_id = 'vyztuzne_materialy' AND specifikace->>'typ_baleni' = 'role')
        OR (kategorie_id = 'consumables' AND specifikace->>'podkategorie' IN ('BF', 'RF', 'PP', 'PP-PTFE', 'BC', 'FM', 'ST', 'FT', 'FCH'))
      )
    ORDER BY kategorie_id, specifikace->>'podkategorie', sku
  `)

  console.log(`📦 Nalezeno ${rows.length} roll-based produktů ke kontrole.\n`)

  const changes: Array<{ id: string; oldSku: string; newSku: string; nazev: string }> = []
  const skipped: Array<{ sku: string; reason: string }> = []

  for (const row of rows) {
    const specs = row.specifikace || {}
    const delkaM: number | null = specs.delka_m != null ? parseFloat(specs.delka_m) : null

    // Přeskoč produkty bez délky v specs
    if (delkaM === null || isNaN(delkaM) || delkaM <= 0) {
      skipped.push({ sku: row.sku, reason: `Chybí delka_m ve specifikace (${JSON.stringify(specs)})` })
      continue
    }

    const roundedLen = Math.round(delkaM)
    const rSuffix = `-R${roundedLen}`

    // Přeskoč produkty, které už mají délkový suffix (např. -R50, -R100 atd.)
    // Použijeme regex k ověření, zda sku končí na -R{delkaM} (případně s -COPY-)
    const suffixRegex = new RegExp(`-R${roundedLen}$`)
    if (suffixRegex.test(row.sku) || (row.sku.includes('-R') && /\-R\d+/.test(row.sku))) {
      skipped.push({ sku: row.sku, reason: `SKU již obsahuje odpovídající nebo jiný -R délkový suffix, přeskakuji` })
      continue
    }

    // Přeskoč COPY klony (ty budou mít -COPY-XXXX suffix) - vyžadují ruční kontrolu
    if (row.sku.includes('-COPY-')) {
      skipped.push({ sku: row.sku, reason: 'Klon produktu (-COPY-), přeskakuji — aktualizujte ručně' })
      continue
    }

    const newSku = row.sku + rSuffix
    changes.push({ id: row.id, oldSku: row.sku, newSku, nazev: row.nazev })
  }

  // 2. Zobraz plánované změny
  if (changes.length > 0) {
    console.log('📋 Plánované aktualizace SKU:')
    console.log('─'.repeat(70))
    for (const change of changes) {
      console.log(`  ${change.oldSku.padEnd(35)} →  ${change.newSku}`)
      console.log(`  ${' '.repeat(35)}    ${change.nazev}`)
      console.log()
    }
  }

  if (skipped.length > 0) {
    console.log('⏭️  Přeskočené produkty:')
    console.log('─'.repeat(70))
    for (const s of skipped) {
      console.log(`  ⚠  ${s.sku.padEnd(35)}: ${s.reason}`)
    }
    console.log()
  }

  if (changes.length === 0) {
    console.log('✅ Žádné produkty nevyžadují aktualizaci. Hotovo.')
    await client.end()
    return
  }

  // 3. Zkontroluj konflikty (nová SKU nesmí existovat)
  console.log('🔍 Kontrola konfliktů SKU...')
  const newSkus = changes.map(c => c.newSku)
  const { rows: conflicts } = await client.query(
    `SELECT sku FROM produkty WHERE sku = ANY($1) AND deleted_at IS NULL`,
    [newSkus]
  )

  if (conflicts.length > 0) {
    console.error('\n❌ KONFLIKT: Následující nová SKU již existují v databázi:')
    conflicts.forEach(c => console.error(`   ${c.sku}`))
    console.error('\nSkript přerušen. Vyřešte konflikty ručně a spusťte znovu.')
    await client.end()
    process.exit(1)
  }
  console.log('✅ Žádné konflikty.\n')

  if (isDryRun) {
    console.log('🔍 DRY RUN dokončen — žádné změny nebyly provedeny.')
    console.log(`   Spusťte bez --dry-run pro skutečnou aktualizaci ${changes.length} produktů.`)
    await client.end()
    return
  }

  // 4. Proveď aktualizace
  console.log(`✏️  Aktualizuji ${changes.length} produktů...`)
  let updated = 0
  for (const change of changes) {
    await client.query(
      `UPDATE produkty SET sku = $1, aktualizovano_at = NOW() WHERE id = $2`,
      [change.newSku, change.id]
    )
    updated++
    console.log(`  ✅ [${updated}/${changes.length}] ${change.oldSku} → ${change.newSku}`)
  }

  console.log('\n🎉 Migrace dokončena!')
  console.log(`   Aktualizováno: ${updated} produktů`)
  console.log(`   Přeskočeno:    ${skipped.length} produktů`)
  console.log('\n⚠️  NEZAPOMEŇTE: Spusťte stejný skript také na produkční DB (bez --dry-run).')

  await client.end()
}

run().catch(err => {
  console.error('❌ Neočekávaná chyba:', err)
  process.exit(1)
})
