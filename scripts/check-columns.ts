import { Client } from 'pg'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'postgres',
  password: 'postgres',
  port: 54322,
})

async function run() {
  await client.connect()
  const { rows } = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'produkty'
  `)
  console.log('Columns in table "produkty":')
  rows.forEach(r => console.log(`- ${r.column_name}: ${r.data_type}`))
  await client.end()
}

run().catch(console.error)
