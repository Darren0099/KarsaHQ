import { Pool } from '@neondatabase/serverless'
import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins'

export const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 })

export function makeAuth(provision = false) {
  const host = process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'http://localhost:3000')
  return betterAuth({
    database: db,
    baseURL: host,
    secret: process.env.BETTER_AUTH_SECRET,
    appName: 'KarsaHQ',
    emailAndPassword: { enabled: true, disableSignUp: !provision, minPasswordLength: 12 },
    rateLimit: { storage: 'database', window: 60, max: 40, customRules: { '/sign-in/email': {window: 60, max: 6}, '/two-factor/verify-totp': {window: 60, max: 6} } },
    disabledPaths: ['/two-factor/disable', '/two-factor/send-otp', '/two-factor/verify-otp'],
    plugins: [twoFactor({ issuer: 'KarsaHQ', totpOptions: {digits: 6, period: 30} })],
    session: {
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
      additionalFields: {mfaVerified:{type:'boolean',defaultValue:false,input:false}}
    },
    databaseHooks: {
      session: {create: {before: async (session, context) => ({
        data:{...session,mfaVerified:context?.path==='/two-factor/verify-totp'||context?.path==='/two-factor/verify-backup-code'}
      })}}
    }
  })
}

type Auth = ReturnType<typeof makeAuth>
let instance: Auth | undefined
export function getAuth() {
  return instance ??= makeAuth()
}
