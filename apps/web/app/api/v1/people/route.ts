import { z } from 'zod'
import { db, getAuth } from '../../../../lib/auth'
import { departments } from '../../../../../../packages/core/workspace'
import { calculatePay } from '../../../../../../packages/core/payroll'

const periodSchema=z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/)
const money=z.coerce.number().int().min(0).max(100_000_000)
const nullableDate=z.union([z.iso.date(),z.literal('')]).transform(value=>value||null)
const employee=z.uuid()
const actions=z.discriminatedUnion('action',[
  z.object({action:z.literal('profile'),employee,name:z.string().trim().min(2).max(120),role:z.string().trim().min(2).max(120),department:z.enum(departments),email:z.union([z.email(),z.literal('')]),started:nullableDate,ended:nullableDate,contract:nullableDate,type:z.enum(['','Tetap','Kontrak','Magang'])}),
  z.object({action:z.literal('history'),employee,date:z.iso.date(),role:z.string().trim().min(2).max(120),department:z.enum(departments),note:z.string().trim().min(2).max(300)}),
  z.object({action:z.literal('document'),employee,name:z.string().trim().min(1).max(120),content:z.string().max(2796204)}),
  z.object({action:z.enum(['preview','publish']),employee,period:periodSchema,base:money,fixed:money,perAttendance:money,perOvertime:money,deductions:money,taxBasisPoints:z.coerce.number().int().min(0).max(10000)})
])
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}})
class PeopleError extends Error {constructor(readonly status:number,message:string){super(message)}}

async function handle(request:Request) {
  const session=await getAuth().api.getSession({headers:request.headers})
  if(!session?.user.twoFactorEnabled||!session.session.mfaVerified) return reply({error:'Masuk dengan 2FA.'},401)
  const url=new URL(request.url)
  const write=request.method==='POST'
  if(write && request.headers.get('origin')!==new URL(process.env.BETTER_AUTH_URL??request.url).origin) return reply({error:'Origin tidak diizinkan.'},403)
  const body=write?actions.safeParse(await request.json().catch(()=>null)):null
  if(body&&!body.success) return reply({error:'Periksa kembali data yang diisi.'},400)
  const input=body?.data
  const connection=await db.connect()
  try {
    await connection.query('BEGIN')
    const member=(await connection.query('SELECT m.company_id,m.role,m.employee_id,c.name AS company FROM hris.memberships m JOIN hris.companies c ON c.id=m.company_id WHERE m.user_id=$1',[session.user.id])).rows[0]
    if(!member || (write&&member.role!=='admin')) throw new PeopleError(403,'Akses dibatasi.')
    const admin=member.role==='admin'
    const tenant=member.company_id
    const attendanceUser=input&&(input.action==='publish'||input.action==='preview')?(await connection.query('SELECT user_id FROM hris.memberships WHERE company_id=$1 AND employee_id=$2',[tenant,input.employee])).rows[0]?.user_id??null:null
    await connection.query('SET LOCAL ROLE karsahq_app')
    await connection.query("SELECT set_config('app.company_id',$1,true)",[tenant])
    const audit=(action:string,id:string,data:unknown)=>connection.query('INSERT INTO hris.audit_logs(company_id,actor_id,action,entity_id,after_data) VALUES ($1,$2,$3,$4,$5)',[tenant,session.user.id,action,id,data])
    let result:unknown
    if(input) {
      const person=(await connection.query('SELECT id,name,role,department FROM hris.employees WHERE id=$1',[input.employee])).rows[0]
      if(!person) throw new PeopleError(404,'Karyawan tidak ditemukan.')
      if(input.action==='profile') {
        if(input.ended&&(!input.started||input.ended<input.started)||input.contract&&input.started&&input.contract<input.started) throw new PeopleError(400,'Periksa urutan tanggal kepegawaian.')
        await connection.query('UPDATE hris.employees SET name=$2,role=$3,department=$4,work_email=$5,started_on=$6,ended_on=$7,contract_ends_on=$8,contract_type=$9 WHERE id=$1',[person.id,input.name,input.role,input.department,input.email||null,input.started,input.ended,input.contract,input.type||null])
        await audit('employee.profile',person.id,{contract_type:input.type||null})
      } else if(input.action==='history') {
        await connection.query('INSERT INTO hris.employment_records(company_id,employee_id,effective_on,role,department,note) VALUES ($1,$2,$3,$4,$5,$6)',[tenant,person.id,input.date,input.role,input.department,input.note])
        await audit('employee.history',person.id,{effective_on:input.date})
      } else if(input.action==='document') {
        const bytes=Buffer.from(input.content,'base64')
        if (!/\.pdf$/i.test(input.name)||bytes.length>2097152||bytes.subarray(0,5).toString()!=='%PDF-') throw new PeopleError(400,'Unggah PDF hingga 2 MB.')
        const file=(await connection.query('INSERT INTO hris.employee_files(company_id,employee_id,name,content) VALUES ($1,$2,$3,$4) RETURNING id',[tenant,person.id,input.name,bytes])).rows[0]
        await audit('employee.document',person.id,{document_id:file.id})
      } else {
        const month=input.period+'-01'
        const counts=(await connection.query(`SELECT
          (SELECT count(DISTINCT work_date)::int FROM hris.attendance WHERE user_id=$1 AND event='Masuk' AND review='Dalam area' AND work_date >= $3::date AND work_date < $3::date + interval '1 month') AS attendance,
          (SELECT count(DISTINCT work_date)::int FROM hris.requests WHERE employee_id=$2 AND type='Lembur' AND status='Disetujui' AND work_date >= $3::date AND work_date < $3::date + interval '1 month') AS overtime`,[attendanceUser,person.id,month])).rows[0]
        const {base,fixed,perAttendance,perOvertime,deductions,taxBasisPoints}=input
        const pay=calculatePay({base,fixed,perAttendance,perOvertime,deductions,taxBasisPoints},counts.attendance,counts.overtime)
        const snapshot={...pay,name:person.name,role:person.role,company:member.company}
        if(input.action==='publish') {
          if(pay.net<0) throw new PeopleError(400,'Total potongan melebihi pendapatan.')
          const slip=(await connection.query('INSERT INTO hris.salary_slips(company_id,employee_id,period,snapshot) VALUES ($1,$2,$3,$4) RETURNING id',[tenant,person.id,month,snapshot])).rows[0]
          await audit('payroll.publish',slip.id,{employee_id:person.id,period:input.period})
        }
        result=snapshot
      }
    } else if(url.searchParams.has('file')) {
      if(!admin) throw new PeopleError(403,'Dokumen hanya tersedia untuk admin HR.')
      const id=employee.safeParse(url.searchParams.get('file'))
      if(!id.success) throw new PeopleError(404,'Dokumen tidak ditemukan.')
      const file=(await connection.query('SELECT name,content FROM hris.employee_files WHERE id=$1',[id.data])).rows[0]
      if(!file) throw new PeopleError(404,'Dokumen tidak ditemukan.')
      await audit('employee.download',id.data,null)
      await connection.query('COMMIT')
      const filename=String(file.name).replace(/[^a-zA-Z0-9_. -]/g,'_')
      return new Response(Uint8Array.from(file.content),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="'+filename+'"','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}})
    } else {
      const id=employee.safeParse(url.searchParams.get('employee'))
      const profile=id.success&&admin?(await connection.query('SELECT id,name,role,department,work_email,started_on::text,ended_on::text,contract_ends_on::text,contract_type FROM hris.employees WHERE id=$1',[id.data])).rows[0]:null
      const history=profile?(await connection.query('SELECT id,effective_on::text,role,department,note FROM hris.employment_records WHERE employee_id=$1 ORDER BY effective_on DESC,id',[profile.id])).rows:[]
      const files=profile?(await connection.query('SELECT id,name FROM hris.employee_files WHERE employee_id=$1 ORDER BY added_at DESC',[profile.id])).rows:[]
      const slips=(await connection.query('SELECT id,period::text,snapshot,issued_at FROM hris.salary_slips WHERE ($1 OR employee_id=$2) ORDER BY period DESC,issued_at DESC',[admin,member.employee_id])).rows
      const metrics=admin?(await connection.query(`
        WITH dates AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS today, date_trunc('month',now() AT TIME ZONE 'Asia/Jakarta')::date AS month)
        SELECT count(*) FILTER (WHERE (started_on IS NULL OR started_on<=today) AND (ended_on IS NULL OR ended_on>today))::int AS active,
          count(*) FILTER (WHERE ended_on BETWEEN month AND today)::int AS departures,
          count(*) FILTER (WHERE started_on < month AND (ended_on IS NULL OR ended_on>=month))::int AS opening,
          count(*) FILTER (WHERE started_on<=today AND (ended_on IS NULL OR ended_on>today))::int AS closing,
          count(*) FILTER (WHERE started_on IS NULL)::int AS missing_dates,
          count(*) FILTER (WHERE contract_ends_on BETWEEN today AND today+30 AND (ended_on IS NULL OR ended_on>today))::int AS expiring,
          count(*) FILTER (WHERE contract_ends_on < today AND (ended_on IS NULL OR ended_on>today))::int AS expired,
          (SELECT count(*)::int FROM hris.attendance WHERE event='Masuk' AND review='Dalam area' AND work_date>=date_trunc('month',now() AT TIME ZONE 'Asia/Jakarta')::date) AS checkins
        FROM hris.employees CROSS JOIN dates`)).rows[0]:null
      result={profile,history,files,slips,metrics}
    }
    await connection.query('COMMIT')
    return reply(result??{ok:true})
  } catch(error) {
    await connection.query('ROLLBACK').catch(()=>undefined)
    if(error instanceof PeopleError) return reply({error:error.message},error.status)
    if((error as {code?:string}).code==='23505') return reply({error:'Slip periode ini sudah diterbitkan.'},409)
    console.error('People endpoint failed',{code:(error as {code?:string}).code})
    return reply({error:'Data tidak bisa diproses saat ini.'},500)
  } finally {connection.release()}
}

export const GET=handle
export const POST=handle
