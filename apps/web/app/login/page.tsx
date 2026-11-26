'use client'

import {createAuthClient} from 'better-auth/react'
import {twoFactorClient} from 'better-auth/client/plugins'
import {ArrowRight, KeyRound, ShieldCheck} from 'lucide-react'
import QRCode from 'qrcode'
import {useEffect, useState} from 'react'
import type {FormEvent} from 'react'

const auth = createAuthClient({plugins:[twoFactorClient()]})
type Step = 'login'|'otp'|'enroll'|'setup'|'invite'

export default function Login() {
  const [step,setStep] = useState<Step>('login')
  const [inviteToken,setInviteToken] = useState('')
  const [qr,setQr] = useState('')
  const [uri,setUri] = useState('')
  const [codes,setCodes] = useState<string[]>([])
  const [recovery,setRecovery] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [info,setInfo] = useState('')

  useEffect(()=>{
    const invite = new URLSearchParams(window.location.hash.slice(1)).get('invite')
    if (invite) {setInviteToken(invite);setStep('invite');window.history.replaceState(null,'',window.location.pathname)}
    else if (new URLSearchParams(window.location.search).has('setup')) setStep('setup')
    else void auth.getSession().then(({data})=>{if(data?.user && !data.user.twoFactorEnabled) setStep('enroll')})
  },[])

  async function beginEnrollment(password:string) {
    const {data,error} = await auth.twoFactor.enable({password})
    if (error || !data || data.method!=='totp') throw new Error('Aktivasi 2FA gagal. Periksa kata sandi.')
    setUri(data.totpURI)
    setQr(await QRCode.toDataURL(data.totpURI,{width:200,margin:2}))
    setCodes(data.backupCodes)
    setStep('enroll')
  }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    const fields = new FormData(event.currentTarget)
    const value = (field:string) => String(fields.get(field)??'')
    try {
      if (step==='invite') {
        const response = await fetch('/api/v1/invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:inviteToken,email:value('email'),password:value('password')})})
        const result = await response.json().catch(()=>null)
        if (!response.ok) throw new Error(result?.error??'Undangan belum dapat digunakan.')
        setInviteToken('')
        setStep('login')
        setInfo('Akun berhasil dibuat. Masuk untuk mengaktifkan 2FA.')
      } else if (step==='setup') {
        const response = await fetch('/api/v1/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(fields))})
        const result = await response.json().catch(()=>null)
        if (!response.ok) throw new Error(result?.error??'Pengaturan awal tidak tersedia.')
        setStep('login')
        setInfo('Workspace berhasil dibuat. Masuk untuk mengaktifkan 2FA.')
      } else if (step==='login') {
        const {data,error} = await auth.signIn.email({email:value('email'),password:value('password')})
        if (error || !data) throw new Error('Gagal masuk. Periksa email dan kata sandi, atau coba lagi beberapa saat.')
        if ('twoFactorRedirect' in data && data.twoFactorRedirect) setStep('otp')
        else if ('user' in data && data.user.twoFactorEnabled) window.location.assign('/')
        else {setStep('enroll');await beginEnrollment(value('password'))}
      } else if (step==='enroll' && !qr) {
        await beginEnrollment(value('password'))
      } else {
        const code = value('code').trim()
        const result = recovery ? await auth.twoFactor.verifyBackupCode({code}) : await auth.twoFactor.verifyTotp({code})
        if (result.error) throw new Error('Kode tidak valid atau kedaluwarsa.')
        window.location.assign('/')
      }
    } catch (err) {setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.')}
    finally {setBusy(false)}
  }
  const title = step==='invite'?'Aktifkan akun staf':step==='setup'?'Buat workspace':step==='enroll'?'Aktifkan 2FA':step==='otp'?'Verifikasi akses':'Masuk ke KarsaHQ'
  return <main className="login-shell">
    <section className="login-aside"><div className="brand"><span className="mark"><i/><i/><i/></span>Karsa<span>HQ</span></div><div className="morph" aria-hidden="true"><i/><i/><i/><span><ShieldCheck size={52} strokeWidth={1.35}/></span></div><div><h2>Ruang kerja HR</h2><p>Kelola karyawan, kehadiran, dan pengajuan dalam satu workspace.</p></div></section>
    <section className="login-content"><div className="login-box" key={step}>
      <span className="metric-icon">{step==='login'?<KeyRound size={19}/>:<ShieldCheck size={19}/>}</span>
      <h1>{title}</h1>
      {step==='otp' && <p>{recovery?'Masukkan salah satu kode pemulihan.':'Masukkan kode dari aplikasi autentikator.'}</p>}
      {step==='enroll' && <p>{qr?'Pindai QR dengan aplikasi autentikator, lalu simpan kode pemulihan di tempat aman.':'Konfirmasi kata sandi untuk membuat QR autentikator.'}</p>}
      {info && <p className="login-feedback" role="status">{info}</p>}
      {qr && step==='enroll' && <div className="enrollment"><img width="152" height="152" src={qr} alt="QR untuk aplikasi autentikator"/><details><summary>Kunci manual</summary><code>{new URL(uri).searchParams.get('secret')}</code></details><details><summary>Kode pemulihan</summary><ul>{codes.map(code=><li key={code}><code>{code}</code></li>)}</ul></details></div>}
      <form key={step+(qr?'qr':'')} onSubmit={submit}>
        {step==='setup' && <><label>Kunci pengaturan<input className="field" type="password" name="token" required autoComplete="off"/></label><label>Nama perusahaan<input className="field" name="company" required maxLength={100}/></label><label>Nama admin<input className="field" name="name" required maxLength={100}/></label></>}
        {(step==='login'||step==='setup'||step==='invite') && <label>Email<input className="field" type="email" name="email" required autoComplete="username"/></label>}
        {(step==='login'||step==='setup'||step==='invite'||(step==='enroll'&&!qr)) && <label>Kata sandi<input className="field" type="password" name="password" required minLength={step==='setup'||step==='invite'?12:undefined} autoComplete={step==='setup'||step==='invite'?'new-password':'current-password'}/></label>}
        {(step==='otp'||(step==='enroll'&&qr)) && <label>{recovery?'Kode pemulihan':'Kode verifikasi'}<input key={String(recovery)} className="field" name="code" inputMode={recovery?'text':'numeric'} pattern={recovery?undefined:'[0-9]{6}'} maxLength={recovery?32:6} required autoComplete="one-time-code"/></label>}
        {error && <p className="login-feedback" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy?'Memproses…':step==='login'?'Masuk':step==='setup'?'Buat workspace':step==='invite'?'Aktifkan akun':step==='enroll'&&!qr?'Buat QR':'Verifikasi'}<ArrowRight size={16}/></button>
      </form>
      {step==='otp' && <button className="text-button" onClick={()=>{setRecovery(!recovery);setError('')}}>{recovery?'Pakai aplikasi autentikator':'Pakai kode pemulihan'}</button>}
      {step!=='login' && <button className="text-button" onClick={async()=>{await auth.signOut();window.location.assign('/login')}}>Kembali ke masuk</button>}
    </div></section>
  </main>
}
