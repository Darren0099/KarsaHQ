import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { db, getAuth } from '../../../../lib/auth'
import { employeeInput } from '../../../../../../packages/core/workspace'
import { assessLocation } from '../../../../../../packages/core/attendance'

const latitude = z.number().min(-90).max(90)
const longitude = z.number().min(-180).max(180)
const actions = z.discriminatedUnion('action',[
  z.object({action:z.literal('employee.add'),employee:employeeInput}),
  z.object({action:z.literal('employee.invite'),employee:z.uuid()}),
  z.object({action:z.literal('request.add'),employee:z.uuid().optional(),type:z.enum(['Cuti tahunan','Lembur','Koreksi absensi','Izin','Pengunduran diri']),date:z.iso.date(),endDate:z.iso.date().optional(),reason:z.string().trim().max(1000).optional(),letter:z.string().max(2796204).optional()}),
  z.object({action:z.literal('request.decide'),id:z.uuid(),status:z.enum(['Disetujui','Ditolak'])}),
  z.object({action:z.literal('attendance.record'),event:z.enum(['Masuk','Pulang']),latitude,longitude,accuracy:z.number().min(0).max(100000)}),
  z.object({action:z.literal('office.configure'),latitude,longitude,radius:z.number().int().min(20).max(5000)})
])
const fail = (status:number, message:string) => Response.json({error:message},{status})
class WorkflowError extends Error { constructor(readonly status:number,message:string){super(message)} }

async function workspace(request:Request, write:boolean) {
  if (write && request.headers.get('origin') !== new URL(process.env.BETTER_AUTH_URL ?? request.url).origin) return fail(403,'Origin tidak diizinkan.')
  const session = await getAuth().api.getSession({ headers:request.headers })
  if (!session?.user.twoFactorEnabled || !session.session.mfaVerified) return fail(401,'Masuk dengan verifikasi dua langkah.')
  const body = write ? actions.safeParse(await request.json().catch(()=>null)) : null
  if (body && !body.success) return fail(400,'Data tidak valid.')
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const member = (await client.query('SELECT m.company_id,m.role,m.employee_id,c.name,c.latitude,c.longitude,c.radius_m FROM hris.memberships m JOIN hris.companies c ON c.id=m.company_id WHERE m.user_id=$1',[session.user.id])).rows[0]
    if (!member) throw new WorkflowError(403,'Akun belum memiliki workspace.')
    const args = body?.data
    const admin = member.role==='admin'
    if (args && !['attendance.record','request.add'].includes(args.action) && !admin) throw new WorkflowError(403,'Aksi membutuhkan akses admin.')
    const tenant = member.company_id
    const members = admin && !args ? Number((await client.query('SELECT count(*) AS count FROM hris.memberships WHERE company_id=$1',[tenant])).rows[0].count) : 1
    let officeBefore: unknown
    let officeAfter: unknown
    if (args?.action==='office.configure') {
      officeBefore = (await client.query('SELECT latitude,longitude,radius_m FROM hris.companies WHERE id=$1 FOR UPDATE',[tenant])).rows[0]
      officeAfter = (await client.query('UPDATE hris.companies SET latitude=$2,longitude=$3,radius_m=$4 WHERE id=$1 RETURNING latitude,longitude,radius_m',[tenant,args.latitude,args.longitude,args.radius])).rows[0]
    }
    if (args?.action==='employee.invite') {
      const lock = await client.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,1)) AS acquired',[args.employee])
      if (!lock.rows[0].acquired) throw new WorkflowError(409,'Undangan sedang diproses. Coba lagi sebentar.')
      const assigned=(await client.query('SELECT 1 FROM hris.memberships WHERE company_id=$1 AND employee_id=$2',[tenant,args.employee])).rowCount
      if (assigned) throw new WorkflowError(409,'Karyawan sudah memiliki akun.')
    }
    await client.query('SET LOCAL ROLE karsahq_app')
    await client.query("SELECT set_config('app.company_id',$1,true)",[tenant])
    const audit = (action:string,id:string,before:unknown,after:unknown) => client.query('INSERT INTO hris.audit_logs(company_id,actor_id,action,entity_id,before_data,after_data) VALUES ($1,$2,$3,$4,$5,$6)',[tenant,session.user.id,action,id,before,after])
    let result:unknown
    if (args?.action==='employee.add') {
      const {name,role,department}=args.employee
      const item=(await client.query('INSERT INTO hris.employees(company_id,name,role,department) VALUES ($1,$2,$3,$4) RETURNING id,name,role,department',[tenant,name,role,department])).rows[0]
      await audit(args.action,item.id,null,item)
    }
    if (args?.action==='employee.invite') {
      const token = randomBytes(32).toString('base64url')
      const tokenHash=createHash('sha256').update(token).digest('hex')
      await client.query('UPDATE hris.employee_invitations SET expires_at=now() WHERE employee_id=$1 AND used_at IS NULL AND expires_at>now()',[args.employee])
      const item=(await client.query('INSERT INTO hris.employee_invitations(company_id,employee_id,token_hash) SELECT $1,id,$3 FROM hris.employees WHERE id=$2 RETURNING id',[tenant,args.employee,tokenHash])).rows[0]
      if (!item) throw new WorkflowError(404,'Karyawan tidak ditemukan.')
      await audit(args.action,args.employee,null,{invitation_id:item.id})
      result={token}
    }
    if (args?.action==='request.add') {
      const employeeId = admin ? args.employee : member.employee_id
      if (!employeeId) throw new WorkflowError(403,'Akun belum terhubung ke profil karyawan.')
      if (!admin && (args.type==='Koreksi absensi'||!args.reason)) throw new WorkflowError(400,'Pilih jenis pengajuan dan isi alasan.')
      if (args.endDate && (!['Cuti tahunan','Izin'].includes(args.type)||args.endDate<args.date)) throw new WorkflowError(400,'Periksa tanggal akhir pengajuan.')
      const letter = args.type==='Pengunduran diri' && args.letter ? Buffer.from(args.letter,'base64') : null
      if (args.type==='Pengunduran diri' && (!letter||letter.length>2097152||letter.subarray(0,5).toString()!=='%PDF-')) throw new WorkflowError(400,'Lampirkan surat pengunduran diri dalam format PDF hingga 2 MB.')
      const item=(await client.query('INSERT INTO hris.requests(company_id,employee_id,type,work_date,end_date,reason,resignation_letter) SELECT $1,id,$3,$4,$5,$6,$7 FROM hris.employees WHERE id=$2 RETURNING id,employee_id,type,work_date,status',[tenant,employeeId,args.type,args.date,args.endDate??null,args.reason||null,letter])).rows[0]
      if (!item) throw new WorkflowError(404,'Karyawan tidak ditemukan.')
      await audit(args.action,item.id,null,item)
    }
    if (args?.action==='request.decide') {
      const item=(await client.query("UPDATE hris.requests SET status=$2 WHERE id=$1 AND status='Menunggu' RETURNING id,status",[args.id,args.status])).rows[0]
      if (!item) throw new WorkflowError(409,'Pengajuan sudah ditinjau atau tidak ditemukan.')
      await audit(args.action,item.id,{status:'Menunggu'},{status:item.status})
    }
    if (args?.action==='attendance.record') {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[String(tenant)+':'+session.user.id])
      const workDate="(transaction_timestamp() AT TIME ZONE 'Asia/Jakarta')::date"
      if (args.event==='Pulang' && !(await client.query("SELECT 1 FROM hris.attendance WHERE user_id=$1 AND event='Masuk' AND work_date="+workDate,[session.user.id])).rowCount) throw new WorkflowError(409,'Catat jam masuk terlebih dahulu.')
      const {distance,review} = assessLocation(args,member)
      const item=(await client.query('INSERT INTO hris.attendance(company_id,user_id,work_date,event,latitude,longitude,accuracy_m,distance_m,review) VALUES ($1,$2,'+workDate+',$3,$4,$5,$6,$7,$8) RETURNING id,event,review,recorded_at,distance_m',[tenant,session.user.id,args.event,args.latitude,args.longitude,args.accuracy,distance,review])).rows[0]
      await audit(args.action,item.id,null,{event:item.event,review:item.review})
      result=item
    }
    if (args?.action==='office.configure') await audit(args.action,tenant,officeBefore,officeAfter)
    const documentId = new URL(request.url).searchParams.get('letter')
    if (!args && documentId) {
      const parsed=z.uuid().safeParse(documentId)
      if (!parsed.success) throw new WorkflowError(404,'Surat tidak ditemukan.')
      const row=(await client.query('SELECT resignation_letter FROM hris.requests WHERE id=$1 AND resignation_letter IS NOT NULL AND ($2 OR employee_id=$3)',[parsed.data,admin,member.employee_id])).rows[0]
      if (!row) throw new WorkflowError(404,'Surat tidak ditemukan.')
      await audit('request.letter.download',parsed.data,null,null)
      await client.query('COMMIT')
      return new Response(Uint8Array.from(row.resignation_letter),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="surat-pengunduran-diri.pdf"','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}})
    }
    if (!args) {
      const staff = admin ? (await client.query('SELECT id,name,role,department FROM hris.employees ORDER BY created_at DESC,id')).rows : []
      const approvals = (await client.query('SELECT r.id,e.name,r.type,r.work_date::text AS date,r.status,r.end_date::text AS end_date,r.reason,(r.resignation_letter IS NOT NULL) AS has_letter FROM hris.requests r JOIN hris.employees e ON e.id=r.employee_id WHERE ($1 OR r.employee_id=$2) ORDER BY r.created_at DESC,r.id',[admin,member.employee_id])).rows
      const audit = admin ? (await client.query('SELECT id,actor_id,action,entity_id,created_at FROM hris.audit_logs ORDER BY created_at DESC,id LIMIT 100')).rows : []
      const attendance = (await client.query('SELECT id,event,review,recorded_at,distance_m FROM hris.attendance WHERE user_id=$1 ORDER BY recorded_at DESC,id LIMIT 30',[session.user.id])).rows
      const presence:Record<string,number>={}
      if (admin) {
        const series=(await client.query("SELECT work_date::text AS date,count(*)::int AS count FROM hris.attendance WHERE event='Masuk' AND work_date >= current_date - 35 GROUP BY work_date")).rows
        for (const day of series) presence[day.date]=Math.min(100,Math.round(day.count*100/members))
      }
      result={staff,approvals,audit,attendance,presence,company:member.name,role:member.role,user:session.user.name}
    }
    await client.query('COMMIT')
    return Response.json(result??{ok:true},{headers:{'Cache-Control':'no-store'}})
  } catch (error) {
    await client.query('ROLLBACK')
    if (error instanceof WorkflowError) return fail(error.status,error.message)
    if ((error as {code?:string}).code==='23505') return fail(409,'Catatan serupa sudah tersimpan.')
    console.error('KarsaHQ workspace transaction failed',{code:(error as {code?:string}).code})
    return fail(500,'Data workspace belum bisa diproses.')
  } finally { client.release() }
}
export const GET = (request:Request) => workspace(request,false)
export const POST = (request:Request) => workspace(request,true)
