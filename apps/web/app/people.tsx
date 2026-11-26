'use client'

import {useEffect,useState} from 'react'
import type {FormEvent,ReactNode} from 'react'
import type {Employee} from '../../../packages/core/workspace'
import {departments} from '../../../packages/core/workspace'
import type {calculatePay} from '../../../packages/core/payroll'

type Pay=ReturnType<typeof calculatePay>&{name:string;role:string;company:string}
type Slip={id:string;period:string;snapshot:Pay}
type Profile=Employee&{work_email:string|null;started_on:string|null;ended_on:string|null;contract_ends_on:string|null;contract_type:string|null}
type PeopleData={
  profile:Profile|null;
  history:{id:string;effective_on:string;role:string;department:string;note:string}[];
  files:{id:string;name:string}[];
  slips:Slip[];
  metrics:{active:number;departures:number;opening:number;closing:number;missing_dates:number;expiring:number;expired:number;checkins:number}|null
}
const rupiah=(n:number)=>'Rp '+n.toLocaleString('id-ID')
async function send(body:Record<string,unknown>) {
  const response=await fetch('/api/v1/people',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const result=await response.json()
  if(!response.ok) throw new Error(result.error??'Perubahan gagal disimpan.')
  return result
}
function usePeople(employee?:string) {
  const [data,setData]=useState<PeopleData>()
  const [error,setError]=useState('')
  const [version,reload]=useState(0)
  useEffect(()=>{
    const controller=new AbortController()
    const path='/api/v1/people'+(employee?'?employee='+encodeURIComponent(employee):'')
    fetch(path,{signal:controller.signal}).then(async response=>{
      const result=await response.json()
      if(!response.ok) throw new Error(result.error??'Data belum tersedia.')
      setData(result);setError('')
    }).catch(err=>{if(!controller.signal.aborted)setError(err.message)})
    return ()=>controller.abort()
  },[employee,version])
  return {data,error,reload:()=>reload(value=>value+1)}
}
function Field({label,children}:{label:string;children:ReactNode}) {
  return <label className="people-field"><span>{label}</span>{children}</label>
}
function Department({value}:{value:string}) {
  return <select className="field" name="department" defaultValue={value}>{departments.map(item=><option key={item}>{item}</option>)}</select>
}

export function EmployeeRecords({employee,onSaved}:{employee:Employee;onSaved:()=>void}) {
  const {data,error,reload}=usePeople(employee.id)
  const [tab,setTab]=useState<'Profil'|'Riwayat'|'Dokumen'>('Profil')
  const [message,setMessage]=useState('')
  const [saving,setSaving]=useState(false)
  async function submit(event:FormEvent<HTMLFormElement>,action:string) {
    event.preventDefault()
    const form=event.currentTarget
    const fields=new FormData(form)
    setSaving(true);setMessage('')
    try {
      let payload:Record<string,unknown>=Object.fromEntries(fields)
      if(action==='document') {
        const file=fields.get('file')
        if(!(file instanceof File)||file.size===0||file.size>2097152) throw new Error('Pilih PDF hingga 2 MB.')
        const bytes=new Uint8Array(await file.arrayBuffer())
        let binary=''
        for(let index=0;index<bytes.length;index+=16384) binary+=String.fromCharCode(...bytes.subarray(index,index+16384))
        payload={name:file.name,content:btoa(binary)}
      }
      await send({action,employee:employee.id,...payload})
      if(action!=='profile') form.reset()
      if(action==='profile') onSaved()
      reload();setMessage('Perubahan tersimpan.')
    } catch(err) {setMessage(err instanceof Error?err.message:'Penyimpanan gagal.')}
    finally {setSaving(false)}
  }
  const profile=data?.profile
  return <div className="people-area">
    <div className="people-tabs" role="group" aria-label="Bagian profil">{(['Profil','Riwayat','Dokumen'] as const).map(item=><button className="secondary" aria-pressed={tab===item} key={item} onClick={()=>{setTab(item);setMessage('')}}>{item}</button>)}</div>
    {error&&<p role="alert">{error}</p>}
    {!data&&!error&&<p role="status">Memuat data karyawan…</p>}
    {tab==='Profil'&&profile&&<form className="people-form" onSubmit={event=>void submit(event,'profile')}>
      <Field label="Nama"><input className="field" name="name" defaultValue={profile.name} required maxLength={120}/></Field>
      <Field label="Email kerja"><input className="field" name="email" type="email" defaultValue={profile.work_email??''}/></Field>
      <Field label="Jabatan"><input className="field" name="role" defaultValue={profile.role} required maxLength={120}/></Field>
      <Field label="Departemen"><Department value={profile.department}/></Field>
      <Field label="Tanggal mulai"><input className="field" name="started" type="date" defaultValue={profile.started_on??''}/></Field>
      <Field label="Tanggal keluar"><input className="field" name="ended" type="date" defaultValue={profile.ended_on??''}/></Field>
      <Field label="Jenis kontrak"><select className="field" name="type" defaultValue={profile.contract_type??''}><option value="">Belum dicatat</option><option>Tetap</option><option>Kontrak</option><option>Magang</option></select></Field>
      <Field label="Kontrak berakhir"><input className="field" name="contract" type="date" defaultValue={profile.contract_ends_on??''}/></Field>
      <button className="primary" disabled={saving}>Simpan profil</button>
    </form>}
    {tab==='Riwayat'&&profile&&<>
      <ul className="people-list">{data.history.map(item=><li key={item.id}><b>{item.role} · {item.department}</b><p>{item.effective_on} · {item.note}</p></li>)}</ul>
      {!data.history.length&&<p>Belum ada riwayat kerja.</p>}
      <form className="people-form" onSubmit={event=>void submit(event,'history')}>
        <Field label="Tanggal efektif"><input className="field" name="date" type="date" required/></Field>
        <Field label="Jabatan"><input className="field" name="role" defaultValue={profile.role} required maxLength={120}/></Field>
        <Field label="Departemen"><Department value={profile.department}/></Field>
        <Field label="Catatan perubahan"><input className="field" name="note" required maxLength={300}/></Field>
        <button className="primary" disabled={saving}>Tambah riwayat</button>
      </form>
    </>}
    {tab==='Dokumen'&&profile&&<>
      <ul className="people-list">{data.files.map(file=><li key={file.id}><a href={'/api/v1/people?file='+file.id}>{file.name}</a></li>)}</ul>
      {!data.files.length&&<p>Belum ada dokumen.</p>}
      <form className="people-form" onSubmit={event=>void submit(event,'document')}>
        <Field label="Kontrak atau dokumen PDF (maks. 2 MB)"><input className="field" name="file" type="file" accept="application/pdf,.pdf" required/></Field>
        <button className="primary" disabled={saving}>Unggah PDF</button>
      </form>
    </>}
    {message&&<p role="status">{message}</p>}
  </div>
}

export function PeopleAnalytics() {
  const {data,error}=usePeople()
  if(!data?.metrics) return <p role={error?'alert':'status'}>{error||'Memuat analitik SDM…'}</p>
  const m=data.metrics
  const average=(m.opening+m.closing)/2
  const turnover=m.missing_dates||!average?'—':(m.departures/average*100).toLocaleString('id-ID',{maximumFractionDigits:1})+'%'
  return <section className="people-area" aria-label="Analitik SDM">
    <div className="metrics">{[
      ['Karyawan aktif',m.active],
      ['Turnover bulan ini',turnover],
      ['Absensi masuk dalam area',m.checkins],
      ['Kontrak berakhir ≤30 hari',m.expiring],
      ['Kontrak lewat tanggal akhir',m.expired],
      ['Karyawan keluar bulan ini',m.departures]
    ].map(([title,value])=><div className="card metric" key={title}><p>{title}</p><strong>{value}</strong></div>)}</div>
    <p>{m.missing_dates?m.missing_dates+' profil belum memiliki tanggal mulai. Isi tanggal tersebut untuk menghitung turnover.':'Turnover = jumlah keluar bulan ini ÷ rata-rata jumlah karyawan awal bulan dan hari ini.'}</p>
  </section>
}

const amounts=[
  ['base','Gaji pokok'],
  ['fixed','Tunjangan tetap'],
  ['perAttendance','Tunjangan per hari hadir'],
  ['perOvertime','Tambahan per hari lembur disetujui'],
  ['deductions','Potongan lainnya']
] as const

function PayDetails({pay}:{pay:Pay}) {
  return <dl className="pay-details">
    {[
      ['Gaji pokok',rupiah(pay.base)],
      ['Tunjangan tetap',rupiah(pay.fixed)],
      ['Hari hadir dalam area',pay.attendance+' hari · '+rupiah(pay.attendancePay)],
      ['Lembur disetujui',pay.overtime+' hari · '+rupiah(pay.overtimePay)],
      ['Gaji bruto',rupiah(pay.gross)],
      ['Potongan pajak ('+(pay.taxBasisPoints/100).toLocaleString('id-ID')+'%)',rupiah(pay.tax)],
      ['Potongan lainnya',rupiah(pay.deductions)],
      ['Gaji bersih',rupiah(pay.net)]
    ].map(([title,value])=><div key={title}><dt>{title}</dt><dd>{value}</dd></div>)}
  </dl>
}

export function Payroll({employees,admin}:{employees:Employee[];admin:boolean}) {
  const {data,error,reload}=usePeople()
  const [draft,setDraft]=useState<{input:Record<string,unknown>;pay:Pay}>()
  const [selected,setSelected]=useState<Slip>()
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  async function preview(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true);setMessage('')
    const input:Record<string,unknown>=Object.fromEntries(new FormData(event.currentTarget))
    input.taxBasisPoints=Math.round(Number(input.tax)*100)
    try {setDraft({input,pay:await send({...input,action:'preview'})})}
    catch(err) {setMessage(err instanceof Error?err.message:'Gagal menghitung.')}
    finally {setBusy(false)}
  }
  async function publish() {
    if(!draft) return
    setBusy(true);setMessage('')
    try {await send({...draft.input,action:'publish'});setDraft(undefined);reload();setMessage('Slip gaji diterbitkan.')}
    catch(err) {setMessage(err instanceof Error?err.message:'Gagal menerbitkan slip.')}
    finally {setBusy(false)}
  }
  return <div className="people-area">
    {admin&&<section className="card people-card">
      <h2>Hitung gaji per periode</h2>
      <p>Kehadiran masuk dalam area dan lembur disetujui dihitung per hari. Isi tarif tunjangan, potongan, dan persentase pajak yang digunakan untuk perhitungan.</p>
      <form className="people-form" onSubmit={preview} onChange={()=>setDraft(undefined)}>
        <Field label="Karyawan"><select name="employee" className="field" required><option value="">Pilih karyawan</option>{employees.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Periode"><input className="field" name="period" type="month" required/></Field>
        {amounts.map(([name,label])=><Field key={name} label={label+' (Rp)'}><input className="field" name={name} type="number" min="0" max="100000000" step="1" defaultValue={name==='base'?undefined:0} required/></Field>)}
        <Field label="Tarif potongan pajak (%)"><input className="field" name="tax" type="number" min="0" max="100" step=".01" defaultValue="0" required/></Field>
        <button className="primary" disabled={busy||!employees.length}>Hitung gaji</button>
      </form>
      {draft&&<div className="pay-preview"><h2>Pratinjau · {draft.pay.name}</h2><PayDetails pay={draft.pay}/><button className="primary" disabled={busy||draft.pay.net<0} onClick={()=>void publish()}>Terbitkan slip</button></div>}
      {message&&<p role="status">{message}</p>}
    </section>}
    <section className="card people-card">
      <h2>Slip gaji terbit</h2>
      {error&&<p role="alert">{error}</p>}
      {data?.slips.length===0&&<p>Belum ada slip gaji.</p>}
      {data?.slips.map(slip=><button className="list-part" key={slip.id} onClick={()=>setSelected(slip)}>{slip.snapshot.name} · {slip.period.slice(0,7)} <span>{rupiah(slip.snapshot.net)}</span></button>)}
      {selected&&<div className="pay-preview"><article id="print-slip"><h2>Slip gaji · {selected.period.slice(0,7)}</h2><p>{selected.snapshot.company}</p><p>{selected.snapshot.name} · {selected.snapshot.role}</p><PayDetails pay={selected.snapshot}/></article><div className="actions"><button className="secondary" onClick={()=>setSelected(undefined)}>Tutup slip</button><button className="primary" onClick={()=>window.print()}>Cetak / simpan PDF</button></div></div>}
    </section>
  </div>
}
