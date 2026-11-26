import { z } from 'zod'
import { db, getAuth } from '../../../../lib/auth'
import { employeeInput } from '../../../../../../packages/core/workspace'
import { assessLocation } from '../../../../../../packages/core/attendance'

const latitude = z.number().min(-90).max(90)
const longitude = z.number().min(-180).max(180)
const actions = z.discriminatedUnion('action',[
  z.object({action:z.literal('employee.add'),employee:employeeInput}),
  z.object({action:z.literal('request.add'),employee:z.uuid(),type:z.enum(['Cuti tahunan','Lembur','Koreksi absensi']),date:z.iso.date()}),
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
    const member = (await client.query('SELECT m.company_id,m.role,c.name,c.latitude,c.longitude,c.radius_m FROM hris.memberships m JOIN hris.companies c ON c.id=m.company_id WHERE m.user_id=$1',[session.user.id])).rows[0]
    if (!member) throw new WorkflowError(403,'Akun belum memiliki workspace.')
    const args = body?.data
    const admin = member.role==='admin'
    if (args && args.action!=='attendance.record' && !admin) throw new WorkflowError(403,'Aksi membutuhkan akses admin.')
    const tenant = member.company_id
    const members = admin && !args ? Number((await client.query('SELECT count(*) AS count FROM hris.memberships WHERE company_id=$1',[tenant])).rows[0].count) : 1
    let officeBefore: unknown
    let officeAfter: unknown
    if (args?.action==='office.configure') {
      officeBefore = (await client.query('SELECT latitude,longitude,radius_m FROM hris.companies WHERE id=$1 FOR UPDATE',[tenant])).rows[0]
      officeAfter = (await client.query('UPDATE hris.companies SET latitude=$2,longitude=$3,radius_m=$4 WHERE id=$1 RETURNING latitude,longitude,radius_m',[tenant,args.latitude,args.longitude,args.radius])).rows[0]
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
    if (args?.action==='request.add') {
      const item=(await client.query('INSERT INTO hris.requests(company_id,employee_id,type,work_date) SELECT $1,id,$3,$4 FROM hris.employees WHERE id=$2 RETURNING id,employee_id,type,work_date,status',[tenant,args.employee,args.type,args.date])).rows[0]
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
    if (!args) {
      const staff = admin ? (await client.query('SELECT id,name,role,department FROM hris.employees ORDER BY created_at DESC,id')).rows : []
      const approvals = admin ? (await client.query('SELECT r.id,e.name,r.type,r.work_date::text AS date,r.status FROM hris.requests r JOIN hris.employees e ON e.id=r.employee_id ORDER BY r.created_at DESC,r.id')).rows : []
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
