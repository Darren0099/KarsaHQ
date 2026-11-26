import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuth } from '../lib/auth'
import Dashboard from './dashboard'

export const dynamic = "force-dynamic"

export default async function Home() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) redirect('/login')
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session?.user.twoFactorEnabled || !session.session.mfaVerified) redirect('/login')
  return <Dashboard />
}
