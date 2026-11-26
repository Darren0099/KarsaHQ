import { createHash } from 'node:crypto'
import { z } from 'zod'
import { db, getProvisioningAuth } from '../../../../lib/auth'

const input = z.object({ token:z.string().regex(/^[a-zA-Z0-9_-]{43}$/), email:z.email().max(254), password:z.string().min(12).max(128) })
const failure = (status:number,error:string) => Response.json({error},{status})

export async function POST(request:Request) {
  if (request.headers.get('origin') !== new URL(process.env.BETTER_AUTH_URL ?? request.url).origin) return failure(403,'Origin tidak diizinkan.')
  const body=input.safeParse(await request.json().catch(()=>null))
  if (!body.success) return failure(400,'Periksa tautan, email, dan kata sandi.')
  const {token,email,password}=body.data
  const digest=createHash('sha256').update(token).digest('hex')
  const client=await db.connect()
  let createdUser:string|undefined
  try {
    await client.query('BEGIN')
    const invite=(await client.query('SELECT id,employee_id,company_id FROM hris.employee_invitations WHERE token_hash=$1',[digest])).rows[0]
    if (!invite) {
      await client.query('ROLLBACK')
      return failure(410,'Undangan tidak tersedia atau sudah kedaluwarsa.')
    }
    const lock=await client.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,1)) AS acquired',[invite.employee_id])
    if (!lock.rows[0].acquired) {
      await client.query('ROLLBACK')
      return failure(409,'Aktivasi sedang diproses. Coba lagi sebentar.')
    }
    const entry=(await client.query('SELECT e.name FROM hris.employee_invitations i JOIN hris.employees e ON e.id=i.employee_id AND e.company_id=i.company_id WHERE i.id=$1 AND i.used_at IS NULL AND i.expires_at>now() AND NOT EXISTS (SELECT 1 FROM hris.memberships m WHERE m.employee_id=i.employee_id)',[invite.id])).rows[0]
    if (!entry) {
      await client.query('ROLLBACK')
      return failure(410,'Undangan tidak tersedia atau sudah kedaluwarsa.')
    }
    const signup=await getProvisioningAuth().api.signUpEmail({body:{name:entry.name,email,password}})
    createdUser=signup.user.id
    await client.query("INSERT INTO hris.memberships(user_id,company_id,role,employee_id) VALUES ($1,$2,'employee',$3)",[createdUser,invite.company_id,invite.employee_id])
    await client.query('UPDATE hris.employee_invitations SET used_at=now() WHERE id=$1',[invite.id])
    await client.query("INSERT INTO hris.audit_logs(company_id,actor_id,action,entity_id) VALUES ($1,$2,'employee.invite.accepted',$3)",[invite.company_id,createdUser,invite.employee_id])
    await client.query('COMMIT')
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}})
  } catch {
    await client.query('ROLLBACK')
    if (createdUser) await client.query('DELETE FROM public."user" WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM hris.memberships WHERE user_id=$1)',[createdUser]).catch(()=>undefined)
    return failure(409,'Akun belum bisa diaktifkan. Periksa ketersediaan email dan coba lagi.')
  } finally { client.release() }
}
