/**
 * Runs schema.sql and seed.sql against Supabase using the Management API.
 * Usage: node scripts/run-schema.mjs
 *
 * Requires SUPABASE_ACCESS_TOKEN from https://app.supabase.com/account/tokens
 * OR falls back to executing via the service role + pg_query if available.
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const PROJECT_REF = 'lctepzkxanfdgopgflo'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjdGVwempreGFuZmRnb3BnZmxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg2NjgyNywiZXhwIjoyMDg5NDQyODI3fQ.LaLi4QFsMI3fd1uwFNl45ud6fkEnLb9FREalmcrSUNI'

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN // from https://app.supabase.com/account/tokens

async function runViaManagementAPI(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  const body = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(body))
  return body
}

async function runViaRPC(sql) {
  // Try executing via Supabase's built-in pg_catalog or a custom exec function
  const res = await fetch(
    `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    }
  )
  const body = await res.text()
  if (!res.ok) throw new Error(body)
  return body
}

// Split SQL into statements that can be run individually
function splitStatements(sql) {
  // Remove comments, split on semicolons but preserve function bodies
  const statements = []
  let current = ''
  let depth = 0  // track $$ dollar quoting

  const lines = sql.split('\n')
  for (const line of lines) {
    const stripped = line.trim()
    if (stripped.startsWith('--')) continue  // skip comment lines

    // Count $$ markers to track dollar-quoted strings
    const dollarMatches = (line.match(/\$\$/g) || []).length
    depth += dollarMatches % 2

    current += line + '\n'

    if (depth === 0 && stripped.endsWith(';')) {
      const stmt = current.trim()
      if (stmt && stmt !== ';') statements.push(stmt)
      current = ''
    }
  }
  if (current.trim()) statements.push(current.trim())
  return statements.filter(s => s.length > 1)
}

async function main() {
  console.log('🔥 OUTRAGE Content Engine — Schema Setup\n')

  if (!ACCESS_TOKEN) {
    console.log('❌ SUPABASE_ACCESS_TOKEN not set.\n')
    console.log('To run automatically:')
    console.log('  1. Go to: https://app.supabase.com/account/tokens')
    console.log('  2. Create a new access token')
    console.log('  3. Run: SUPABASE_ACCESS_TOKEN=your-token node scripts/run-schema.mjs\n')
    console.log('Alternatively, copy supabase/schema.sql and supabase/seed.sql')
    console.log('into your Supabase Dashboard → SQL Editor and run them.\n')
    console.log(`Dashboard: https://app.supabase.com/project/${PROJECT_REF}/sql/new`)
    return
  }

  const schemaSQL = readFileSync(join(ROOT, 'supabase/schema.sql'), 'utf8')
  const seedSQL = readFileSync(join(ROOT, 'supabase/seed.sql'), 'utf8')

  console.log('📋 Running schema.sql...')
  try {
    await runViaManagementAPI(schemaSQL)
    console.log('✅ schema.sql complete\n')
  } catch (err) {
    console.error('❌ schema.sql failed:', err.message)
    return
  }

  console.log('🌱 Running seed.sql...')
  try {
    await runViaManagementAPI(seedSQL)
    console.log('✅ seed.sql complete\n')
  } catch (err) {
    console.error('❌ seed.sql failed:', err.message)
    return
  }

  console.log('🎉 Database ready! Run: npm run dev')
}

main()
