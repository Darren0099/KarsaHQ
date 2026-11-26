import { db } from '../../../lib/auth'

export async function GET() {
  let ready = false
  if (process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET) {
    try {
      const {rows} = await db.query("SELECT to_regclass('hris.employee_invitations') IS NOT NULL AND to_regclass('hris.salary_slips') IS NOT NULL AND to_regclass('public.session') IS NOT NULL AS ready")
      ready = rows[0]?.ready === true
    } catch { }
  }
  return Response.json({status:ready?'ok':'unavailable'},{status:ready?200:503,headers:{'Cache-Control':'no-store'}})
}
