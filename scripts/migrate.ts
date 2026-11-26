import { readFile } from 'node:fs/promises'
import { getMigrations } from 'better-auth/db/migration'
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL

async function main() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) throw new Error('Set DATABASE_URL and BETTER_AUTH_SECRET.')
  const { db, makeAuth } = await import('../apps/web/lib/auth')
  try {
    const auth = makeAuth()
    const context = await auth.$context
    const migrations = await getMigrations(context.options)
    await migrations.runMigrations()
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(await readFile('db/migrations/001_workspace.sql','utf8'))
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally { client.release() }
    console.log('KarsaHQ database migrated.')
  } finally { await db.end() }
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
