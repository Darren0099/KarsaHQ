import { timingSafeEqual, createHash } from 'node:crypto'
import { z } from 'zod'
import { db, makeAuth } from '../../../../lib/auth'

const input = z.object({
  token: z.string().max(256),
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  password: z.string().min(12).max(128),
  company: z.string().trim().min(2).max(100)
})
const digest = (value:string) => createHash('sha256').update(value).digest()

export async function POST(request:Request) {
  const secret = process.env.BOOTSTRAP_TOKEN
  if (!secret || secret.length < 32) return new Response(null,{status:404})
  if (request.headers.get('origin') !== new URL(process.env.BETTER_AUTH_URL ?? request.url).origin) return new Response(null,{status:403})
  const body = input.safeParse(await request.json().catch(()=>null))
  if (!body.success) return Response.json({error:'Periksa data akun dan perusahaan.'},{status:400})
  const {token,name,email,password,company} = body.data
  if (!timingSafeEqual(digest(secret),digest(token))) return Response.json({error:'Kunci pengaturan tidak valid.'},{status:403})
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const lock = await client.query('SELECT pg_try_advisory_xact_lock(491098321) AS acquired')
    if (!lock.rows[0].acquired) {
      await client.query('ROLLBACK')
      return Response.json({error:'Pengaturan sedang berlangsung. Coba lagi sebentar.'},{status:409})
    }
    const result = await client.query('SELECT 1 FROM hris.memberships LIMIT 1')
    if (result.rowCount) {
      await client.query('ROLLBACK')
      return Response.json({error:'Workspace sudah dibuat.'},{status:409})
    }
    const signup = await makeAuth(true).api.signUpEmail({body:{name,email,password}})
    const tenant = await client.query('INSERT INTO hris.companies(name) VALUES ($1) RETURNING id',[company])
    const companyId = tenant.rows[0].id
    await client.query('INSERT INTO hris.memberships(user_id,company_id,role) VALUES ($1,$2,$3)',[signup.user.id,companyId,'admin'])
    await client.query('INSERT INTO hris.audit_logs(company_id,actor_id,action,entity_id) VALUES ($1::uuid,$2,$3,$1::uuid::text)',[companyId,signup.user.id,'workspace.created'])
    await client.query('COMMIT')
    return Response.json({ok:true})
  } catch {
    await client.query('ROLLBACK')
    return Response.json({error:'Akun belum bisa dibuat. Periksa ketersediaan email dan coba lagi.'},{status:500})
  } finally { client.release() }
}
