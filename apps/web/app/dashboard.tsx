'use client'

import {Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, Bell, Building2, CalendarDays, CalendarRange, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock3, Command, LayoutDashboard, LogOut, Menu, Moon, Plus, Search, Sun, Users, X} from 'lucide-react'
import {useEffect, useState} from 'react'
import type {FormEvent} from 'react'
import {departments, employeeInput} from '../../../packages/core/workspace'
import type {Employee, Request} from '../../../packages/core/workspace'

const nav = [
  {label:'Dashboard', icon:LayoutDashboard},
  {label:'Karyawan', icon:Users},
  {label:'Organisasi', icon:Building2},
  {label:'Absensi', icon:Clock3},
  {label:'Cuti & Lembur', icon:CalendarDays},
  {label:'Persetujuan', icon:ClipboardList},
  {label:'Laporan', icon:Activity},
  {label:'Audit log', icon:ClipboardList},
]
const jakartaDay = (date:Date) => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
const dateLabel = (date:string) => new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',year:'numeric'}).format(new Date(date))
type Audit = {id:string;actor_id:string;action:string;entity_id:string;created_at:string}
type Clock = {id:string;event:string;review:string;recorded_at:string;distance_m:number|null}
type Snapshot = {staff:Employee[];approvals:Request[];audit:Audit[];attendance:Clock[];company:string;role:'admin'|'employee';user:string;presence:Record<string,number>}
const dateTimes = (date:string) => new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'medium',timeStyle:'short'}).format(new Date(date))
const actions:Record<string,string> = {'workspace.created':'Workspace dibuat','employee.add':'Karyawan ditambahkan','request.add':'Pengajuan dibuat','request.decide':'Keputusan pengajuan dicatat','attendance.record':'Absensi dicatat','office.configure':'Area kantor diubah','employee.invite':'Undangan staf dibuat','employee.invite.accepted':'Undangan staf dipakai'}
function weekFor(offset:number,presence:Record<string,number>) {
  const today = new Date(jakartaDay(new Date())+'T12:00:00Z')
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate()-(today.getUTCDay()+6)%7-offset*7)
  const dates = Array.from({length:7},(_,index)=>{const date=new Date(monday);date.setUTCDate(monday.getUTCDate()+index);return jakartaDay(date)})
  const present=dates.map(date=>presence[date]??null)
  return {label:dateLabel(dates[0])+' – '+dateLabel(dates[6]),dates,days:dates.map(date=>Number(date.slice(-2))),present,absent:present.map(value=>value===null?0:100-value)}
}
const weekdays = ['Sen','Sel','Rab','Kam','Jum','Sab','Min']
const initials = (name:string) => name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()
const normalize = (value:string) => value.toLocaleLowerCase('id-ID')

export default function Dashboard() {
  const [page,setPage] = useState('Dashboard')
  const [snapshot,setSnapshot] = useState<Snapshot>()
  const [loadError,setLoadError] = useState('')
  const [busy,setBusy] = useState(false)
  const [gps,setGps] = useState(false)
  const [invite,setInvite] = useState('')
  const [showArea,setShowArea] = useState(false)
  const staff = snapshot?.staff ?? []
  const approvals = snapshot?.approvals ?? []
  const [week,setWeek] = useState(0)
  const [day,setDay] = useState(()=> (new Date(jakartaDay(new Date())+'T12:00:00Z').getUTCDay()+6)%7)
  const [query,setQuery] = useState('')
  const [status,setStatus] = useState('Semua status')
  const [panel,setPanel] = useState<'add'|'submit'|'request'|'employee'|'search'|'alerts'|null>(null)
  const [selection,setSelection] = useState('')
  const [mobile,setMobile] = useState(false)
  const [compact,setCompact] = useState(false)
  const [dark,setDark] = useState(false)
  const [notice,setNotice] = useState('')
  const [error,setError] = useState('')

  async function refresh() {
    const response = await fetch('/api/v1/workspace',{cache:'no-store'})
    if (response.status===401) {window.location.assign('/login');return}
    if (!response.ok) throw new Error('Workspace belum bisa dimuat. Coba lagi.')
    const data:Snapshot = await response.json()
    setSnapshot(data)
    if (data.role==='employee') setPage(current=>current==='Dashboard'?'Absensi':current)
  }
  useEffect(()=>{
    setCompact(localStorage.getItem('karsahq-sidebar')==='compact')
    const theme=localStorage.getItem('karsahq-theme')
    setDark(theme===null?window.matchMedia('(prefers-color-scheme: dark)').matches:theme==='dark')
  },[])
  function toggleSidebar() {
    if (window.matchMedia('(max-width: 700px)').matches) {
      setMobile(current=>!current)
    } else {
      localStorage.setItem('karsahq-sidebar',compact?'wide':'compact')
      setCompact(!compact)
    }
  }
  function toggleTheme() {
    localStorage.setItem('karsahq-theme',dark?'light':'dark')
    setDark(!dark)
  }
  useEffect(()=>{void refresh().catch((err:Error)=>setLoadError(err.message))},[])
  async function mutate(body:Record<string,unknown>) {
    const response = await fetch('/api/v1/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    if (response.status===401) {window.location.assign('/login');throw new Error('Sesi berakhir.')}
    const result = await response.json().catch(()=>null)
    if (!response.ok) throw new Error(result?.error??'Data belum dapat disimpan.')
    try {await refresh()} catch {setLoadError('Perubahan tersimpan. Muat ulang untuk melihat data terbaru.')}
    return result
  }

  useEffect(()=>{
    function shortcut(event:KeyboardEvent) {
      if (snapshot?.role==='admin' && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setQuery('')
        setPanel('search')
      }
    }
    window.addEventListener('keydown',shortcut)
    return ()=>window.removeEventListener('keydown',shortcut)
  },[snapshot?.role])
  useEffect(()=>{
    if (!notice) return
    const timeout = window.setTimeout(()=>setNotice(''),4000)
    return ()=>window.clearTimeout(timeout)
  },[notice])

  const current = weekFor(week,snapshot?.presence??{})
  const today = jakartaDay(new Date())
  const todayPresence = snapshot?.presence[today]
  const admin = snapshot?.role==='admin'
  const pending = approvals.filter(item=>item.status==='Menunggu')
  const selected = approvals.find(item=>item.id===selection)
  const selectedEmployee = staff.find(item=>item.id===selection)
  const matches = staff.filter(item=>normalize([item.name,item.role,item.id,item.department].join(' ')).includes(normalize(query)))
  const requestRows = approvals.filter(item=>(page!=='Cuti & Lembur' || item.type!=='Koreksi absensi') && (status==='Semua status' || item.status===status))

  function go(destination:string) {
    setPage(destination)
    setPanel(null)
    setMobile(false)
    setQuery('')
    setStatus('Semua status')
    window.scrollTo(0,0)
  }
  function open(kind:NonNullable<typeof panel>,id='') {
    setError('')
    setInvite('')
    setSelection(id)
    setPanel(kind)
  }
  async function save(body:Record<string,unknown>, message:string, destination?:string) {
    setBusy(true)
    setError('')
    try {
      await mutate(body)
      if (destination) go(destination)
      else setPanel(null)
      setNotice(message)
    } catch (err) {setError(err instanceof Error?err.message:'Data belum dapat disimpan.')}
    finally {setBusy(false)}
  }
  function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = employeeInput.safeParse(Object.fromEntries(new FormData(event.currentTarget)))
    if (!result.success) {setError('Periksa nama, jabatan, dan departemen.');return}
    void save({action:'employee.add',employee:result.data},'Karyawan berhasil ditambahkan.','Karyawan')
  }
  function submitRequest(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    void save({action:'request.add',...data},'Pengajuan dikirim untuk ditinjau.')
    setStatus('Semua status')
  }
  function decide(next:'Disetujui'|'Ditolak') {
    void save({action:'request.decide',id:selection,status:next},'Pengajuan '+next.toLowerCase()+'.')
  }
  async function inviteEmployee(id:string) {
    setBusy(true)
    setError('')
    try {
      const result=await mutate({action:'employee.invite',employee:id})
      setInvite(window.location.origin+'/register#invite='+result.token)
    } catch (err) {setError(err instanceof Error?err.message:'Undangan belum dapat dibuat.')}
    finally {setBusy(false)}
  }
  function recordLocation(event:'Masuk'|'Pulang') {
    if (!navigator.geolocation) {setNotice('Perangkat ini tidak mendukung akses lokasi.');return}
    setGps(true)
    navigator.geolocation.getCurrentPosition(async ({coords})=>{
      try {
        const {latitude,longitude,accuracy}=coords
        await mutate({action:'attendance.record',event,latitude,longitude,accuracy})
        setNotice('Absensi '+event.toLowerCase()+' tercatat.')
      } catch (err) {setNotice(err instanceof Error?err.message:'Absensi belum dapat dicatat.')}
      finally {setGps(false)}
    },()=>{setGps(false);setNotice('Lokasi belum tersedia. Periksa izin lokasi dan coba lagi.')},{enableHighAccuracy:true,maximumAge:0,timeout:12000})
  }
  function setOffice(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data=new FormData(event.currentTarget)
    void save({action:'office.configure',latitude:Number(data.get('lat')),longitude:Number(data.get('lng')),radius:Number(data.get('radius'))},'Area kantor disimpan.')
  }
  function exportReport() {
    const csvCell = (field:string) => '"'+(/^[=+@\-\t\r\n]/.test(field)?"'":'')+field.replaceAll('"','""')+'"'
    const rows = [['ID','Nama','Jenis','Tanggal','Status'],...approvals.map(item=>[item.id,item.name,item.type,item.date,item.status])]
    const blob = new Blob(['\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href=url
    link.download='karsahq-pengajuan.csv'
    link.click()
    window.setTimeout(()=>URL.revokeObjectURL(url),1000)
    setNotice('Laporan pengajuan diunduh.')
  }

  function approvalTable(rows:Request[]) {
    return <div className="table-scroll"><table><thead><tr><th>Karyawan</th><th>Jenis pengajuan</th><th>Tanggal</th><th>Status</th><th><span className="sr-only">Tindakan</span></th></tr></thead><tbody>
      {rows.map((item,index)=><tr key={item.id}><td><div className="person"><span className={'initial tone'+index%4}>{initials(item.name)}</span><b>{item.name}</b></div></td><td>{item.type}</td><td>{dateLabel(item.date)}</td><td><span className={'status '+item.status.toLowerCase()}>{item.status}</span></td><td><button className="icon" aria-label={'Lihat pengajuan '+item.name} onClick={()=>open('request',item.id)}><ChevronRight size={16}/></button></td></tr>)}
    </tbody></table>{!rows.length && <p className="empty">Tidak ada pengajuan yang cocok.</p>}</div>
  }
  function chart() {
    return <section className="card attendance"><div className="card-head"><div><h2>Tren kehadiran</h2><p>Persentase kehadiran harian</p></div><label className="select-wrap"><CalendarRange size={14}/><select aria-label="Periode kehadiran" value={week} onChange={e=>{setWeek(Number(e.target.value));setDay(3)}}>{[0,1,2,3].map(index=><option key={index} value={index}>{weekFor(index,{}).label}</option>)}</select><ChevronDown size={14}/></label></div>
    <div className="legend"><span><i/> Hadir</span><span><i/> Tidak hadir</span></div>
    <div className="plot"><div className="ticks">{[100,75,50,25,0].map(tick=><span key={tick}>{tick}%</span>)}</div><div className="plot-body"><div className="grid-lines">{Array.from({length:5},(_,index)=><i key={index}/>)}</div><div className="bars">{current.present.map((value,index)=><div key={index} className="bar-group"><button className={'bar '+(index===day?'chosen':'')} onClick={()=>setDay(index)} aria-pressed={index===day} aria-label={weekdays[index]+(value!==null?', '+value+' persen hadir':', belum ada data')} title={value!==null?value+'% hadir':'Belum ada data'} style={{height:(value===null?0:value+current.absent[index])+'%'}}><span style={{height:(value??0)+'%'}}/></button></div>)}</div><div className="labels">{weekdays.map(label=><span key={label}>{label}</span>)}</div></div></div>
    <p className="chart-note">{weekdays[day]}, {dateLabel(current.dates[day])} · {current.present[day]!==null ? current.present[day]+'% hadir' : 'Belum ada data'}</p></section>
  }

  if (!snapshot) return <main><p role={loadError?'alert':'status'}>{loadError||'Memuat workspace…'}</p>{loadError&&<button className="secondary" onClick={()=>window.location.reload()}>Muat ulang</button>}</main>
  return <div className={compact?'shell compact':'shell'} data-theme={dark?'dark':'light'}>
    {mobile && <button className="overlay" aria-label="Tutup menu" onClick={()=>setMobile(false)}/>}
    <aside id="dashboard-sidebar" className={mobile?'sidebar visible':'sidebar'}>
      <button className="brand" aria-label="KarsaHQ" onClick={()=>go(admin?'Dashboard':'Absensi')}><span className="mark"><i/><i/><i/></span><span className="brand-word">Karsa<b>HQ</b></span></button>
      <nav aria-label="Navigasi utama"><p>Menu utama</p>{nav.filter(item=>admin||item.label==='Absensi').map(({label,icon:Icon},index)=><div key={label}>{index===3 && <p>Operasional</p>}{index===6 && <p>Laporan & audit</p>}<button className={page===label?'nav active':'nav'} aria-current={page===label?'page':undefined} aria-label={label} title={compact?label:undefined} onClick={()=>go(label)}><Icon size={19}/><span className="nav-label">{label}</span>{label==='Persetujuan' && pending.length>0 && <span className="count">{pending.length}</span>}</button></div>)}</nav>
      <div className="sidebar-foot"><span className="initial admin">{initials(snapshot.user)}</span><div><b>{snapshot.user}</b><small>{admin?'Admin HR':'Karyawan'}</small></div></div>
    </aside>
    <div className="content">
      <header className="top"><button className="icon sidebar-toggle" aria-label="Alihkan tampilan sidebar" aria-controls="dashboard-sidebar" title="Alihkan tampilan sidebar" onClick={toggleSidebar}><Menu size={21}/></button><div className="tools"><button className="icon theme-toggle" aria-label={dark?'Aktifkan mode terang':'Aktifkan mode malam'} title={dark?'Mode terang':'Mode malam'} onClick={toggleTheme}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button>{admin&&<button className="search" aria-label="Cari karyawan" onClick={()=>{setQuery('');open('search')}}><Search size={16}/><span>Cari karyawan</span><kbd><Command size={11}/> K</kbd></button>}{admin&&<button className="icon bell" aria-label="Pemberitahuan" onClick={()=>open('alerts')}><Bell size={18}/>{pending.length>0 && <i/>}</button>}<button className="icon" aria-label="Keluar" title="Keluar" onClick={async()=>{const response=await fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(response.ok)window.location.assign('/login');else setNotice('Gagal keluar. Coba lagi.')}}><LogOut size={18}/></button></div></header>
      <main className="workspace-page" key={page}>
        {page==='Dashboard' ? <>
          <div className="intro"><div><div className="today"><span/> {new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'full'}).format(new Date())}</div><h1>Dashboard</h1><p>Pantau kehadiran tim dan pengajuan yang perlu ditinjau.</p></div><button className="primary" onClick={()=>open('add')}><Plus size={17}/> Tambah karyawan</button></div>
          <div className="metrics">{[
            {icon:Users,title:'Karyawan aktif',value:String(staff.length).padStart(2,'0'),caption:'Terdaftar di direktori',target:'Karyawan'},
            {icon:Activity,title:'Kehadiran hari ini',value:todayPresence===undefined?'—':todayPresence+'%',caption:'Berdasarkan absensi masuk',target:'Absensi'},
            {icon:CalendarDays,title:'Cuti disetujui',value:String(approvals.filter(item=>item.type.startsWith('Cuti') && item.status==='Disetujui').length).padStart(2,'0'),caption:'Total dalam workspace',target:'Cuti & Lembur'},
            {icon:ClipboardList,title:'Menunggu persetujuan',value:String(pending.length).padStart(2,'0'),caption:'Pengajuan perlu ditinjau',target:'Persetujuan'},
          ].map(({icon:Icon,title,value,caption,target},index)=><button className={'card metric '+(index===0?'highlight':'')} key={title} onClick={()=>go(target)}><div><span className="metric-icon"><Icon size={18}/></span><ArrowUpRight size={16}/></div><p>{title}</p><strong>{value}</strong><small>{caption}</small></button>)}</div>
          <div className="middle">{chart()}<section className="card calendar"><div className="card-head"><div><h2>Kalender kerja</h2><p>Agenda minggu terpilih</p></div><div className="week-buttons"><button className="icon" aria-label="Minggu sebelumnya" disabled={week===3} onClick={()=>{setWeek(week+1);setDay(3)}}><ChevronLeft size={16}/></button><button className="icon" aria-label="Minggu berikutnya" disabled={week===0} onClick={()=>{setWeek(week-1);setDay(3)}}><ChevronRight size={16}/></button></div></div>
          <div className="week-title">{current.label}</div><div className="week">{current.days.map((date,index)=><button key={date} className={day===index?'selected':''} aria-pressed={day===index} onClick={()=>setDay(index)}><small>{weekdays[index]}</small><b>{date}</b></button>)}</div>
          <div className="agenda"><span className="agenda-icon"><CalendarDays size={17}/></span><div><b>{current.present[day]===null?'Belum ada data kehadiran':current.present[day]+'% hadir'}</b><small>{weekdays[day]+', '+dateLabel(current.dates[day])}</small></div></div>
          </section></div>
          <section className="card approvals"><div className="card-head"><div><h2>Pengajuan terbaru</h2><p>Cuti, lembur, dan koreksi absensi</p></div><button className="secondary" onClick={()=>go('Persetujuan')}>Lihat semua <ArrowRight size={15}/></button></div>{approvalTable(approvals.slice(0,4))}</section>
        </> : <>
          <div className="intro"><div><h1>{page}</h1><p>{({Karyawan:'Kelola direktori dan profil karyawan.',Organisasi:'Lihat susunan departemen dan anggota tim.',Absensi:'Tinjau ringkasan kehadiran per minggu.','Cuti & Lembur':'Tinjau status pengajuan cuti dan lembur.',Persetujuan:'Tinjau pengajuan dan catat keputusan.',Laporan:'Unduh rekap operasional HR.','Audit log':'Lihat perubahan dan aktivitas operasional di workspace.'} as Record<string,string>)[page]}</p></div>{page==='Karyawan' && <button className="primary" onClick={()=>open('add')}><Plus size={17}/> Tambah karyawan</button>}</div>
          {page==='Karyawan' && <section className="card approvals"><div className="card-head"><h2>Direktori karyawan</h2><input className="field" placeholder="Cari nama, jabatan, atau ID" aria-label="Cari direktori" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="table-scroll"><table><thead><tr><th>Nama</th><th>ID</th><th>Jabatan</th><th>Departemen</th><th><span className="sr-only">Tindakan</span></th></tr></thead><tbody>{matches.map((item,index)=><tr key={item.id}><td><div className="person"><span className={'initial tone'+index%4}>{initials(item.name)}</span><b>{item.name}</b></div></td><td>{item.id}</td><td>{item.role}</td><td>{item.department}</td><td><button className="icon" aria-label={'Profil '+item.name} onClick={()=>open('employee',item.id)}><ChevronRight size={16}/></button></td></tr>)}</tbody></table>{!matches.length && <p className="empty">Karyawan tidak ditemukan.</p>}</div></section>}
          {page==='Organisasi' && <div className="departments">{departments.map(department=><section className="card" key={department}><span className="metric-icon"><Building2 size={18}/></span><h2>{department}</h2><p>{staff.filter(item=>item.department===department).length} anggota</p>{staff.filter(item=>item.department===department).map(item=><button className="list-part" key={item.id} onClick={()=>open('employee',item.id)}>{item.name}<ChevronRight size={16}/></button>)}</section>)}</div>}
          {page==='Absensi' && <>
            <section className="card gps-card"><div className="card-head"><h2>Absensi GPS</h2>{admin&&<button className="secondary" onClick={()=>{setShowArea(!showArea);setError('')}}>Atur area kantor</button>}</div><p>Lokasi perangkat diambil saat kamu mencatat jam masuk atau pulang.</p>
            <div className="gps-controls"><button disabled={gps} className="primary" onClick={()=>recordLocation('Masuk')}>Catat masuk</button><button disabled={gps} className="secondary" onClick={()=>recordLocation('Pulang')}>Catat pulang</button>{admin&&<button className="secondary" onClick={()=>open('submit')}>Ajukan koreksi</button>}</div>
            {admin&&showArea&&<form onSubmit={setOffice}><label>Lintang<input className="field" name="lat" type="number" step="any" min="-90" max="90" required/></label><label>Bujur<input className="field" name="lng" type="number" step="any" min="-180" max="180" required/></label><label>Radius (meter)<input className="field" name="radius" type="number" min="20" max="5000" defaultValue="200" required/></label><button className="secondary" disabled={busy}>Simpan area</button>{error&&!panel&&<p role="alert">{error}</p>}</form>}
            <div className="table-scroll"><table><thead><tr><th>Catatan pribadi</th><th>Waktu server (WIB)</th><th>Validasi lokasi</th></tr></thead><tbody>{snapshot.attendance.map(item=><tr key={item.id}><td>{item.event}</td><td>{dateTimes(item.recorded_at)}</td><td>{item.review}{item.distance_m===null?'':' · '+item.distance_m+' m'}</td></tr>)}</tbody></table>{!snapshot.attendance.length&&<p className="empty">Belum ada riwayat absensi.</p>}</div>
            </section>{admin&&chart()}</>}
          {page==='Audit log' && admin && <section className="card approvals"><div className="card-head"><h2>Aktivitas terbaru</h2></div><div className="table-scroll"><table><thead><tr><th>Waktu (WIB)</th><th>Aktivitas</th><th>ID aktor</th><th>ID data</th></tr></thead><tbody>{snapshot.audit.map(item=><tr key={item.id}><td>{dateTimes(item.created_at)}</td><td>{actions[item.action]??item.action}</td><td>{item.actor_id}</td><td>{item.entity_id}</td></tr>)}</tbody></table>{!snapshot.audit.length&&<p className="empty">Belum ada aktivitas.</p>}</div></section>}
          {(page==='Persetujuan'||page==='Cuti & Lembur') && <section className="card approvals"><div className="card-head"><h2>Daftar pengajuan</h2><div className="request-tools">{page==='Cuti & Lembur' && <button className="primary" onClick={()=>open('submit')}><Plus size={17}/> Buat pengajuan</button>}<select className="field" aria-label="Filter status" value={status} onChange={e=>setStatus(e.target.value)}>{['Semua status','Menunggu','Disetujui','Ditolak'].map(item=><option key={item}>{item}</option>)}</select></div></div>{approvalTable(requestRows)}</section>}
          {page==='Laporan' && <section className="card approvals"><div className="card-head"><div><h2>Rekap pengajuan</h2><p>{approvals.length} pengajuan dalam workspace</p></div><button className="secondary" onClick={exportReport}><ArrowDownToLine size={16}/> Unduh CSV</button></div>{approvalTable(approvals)}</section>}
        </>}
        {loadError&&<p role="alert">{loadError}</p>}
        <footer>KarsaHQ <span>·</span> {snapshot.company}</footer>
      </main>
    </div>
    {panel && <Modal key={panel} onClose={()=>setPanel(null)} title={panel==='add'?'Tambah karyawan':panel==='submit'?'Buat pengajuan':panel==='request'?'Detail pengajuan':panel==='employee'?'Profil karyawan':panel==='search'?'Cari karyawan':'Pemberitahuan'}>
      {panel==='add' && <form onSubmit={add}><label>Nama lengkap<input className="field" name="name" required minLength={2} maxLength={100}/></label><label>Jabatan<input className="field" name="role" required minLength={2} maxLength={100}/></label><label>Departemen<select className="field" name="department" required>{departments.map(item=><option key={item}>{item}</option>)}</select></label>{error && <p role="alert">{error}</p>}<div className="actions"><button type="button" className="secondary" onClick={()=>setPanel(null)}>Batal</button><button className="primary" disabled={busy}>Simpan karyawan</button></div></form>}
      {panel==='submit' && <form onSubmit={submitRequest}><label>Karyawan<select className="field" name="employee" required>{staff.map(item=><option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}</select></label><label>Jenis pengajuan<select className="field" name="type" required>{(page==='Absensi'?['Koreksi absensi']:['Cuti tahunan','Lembur']).map(item=><option key={item}>{item}</option>)}</select></label><label>Tanggal<input className="field" name="date" type="date" required/></label>{error && <p role="alert">{error}</p>}<div className="actions"><button type="button" className="secondary" onClick={()=>setPanel(null)}>Batal</button><button className="primary" disabled={busy}>Kirim pengajuan</button></div></form>}
      {panel==='request' && selected && <><dl><dt>Karyawan</dt><dd>{selected.name}</dd><dt>Jenis</dt><dd>{selected.type}</dd><dt>Tanggal</dt><dd>{selected.date}</dd><dt>Status</dt><dd><span className={'status '+selected.status.toLowerCase()}>{selected.status}</span></dd></dl>{error&&<p role="alert">{error}</p>}{selected.status==='Menunggu' && <div className="actions"><button className="secondary" disabled={busy} onClick={()=>decide('Ditolak')}>Tolak</button><button className="primary" disabled={busy} onClick={()=>decide('Disetujui')}><Check size={16}/> Setujui</button></div>}</>}
      {panel==='employee' && selectedEmployee && <><dl><dt>Nama</dt><dd>{selectedEmployee.name}</dd><dt>ID</dt><dd>{selectedEmployee.id}</dd><dt>Jabatan</dt><dd>{selectedEmployee.role}</dd><dt>Departemen</dt><dd>{selectedEmployee.department}</dd></dl>
      {admin&&<div className="invite-box">{error&&<p role="alert">{error}</p>}{invite?<><p>Tautan berlaku 48 jam dan hanya bisa dipakai sekali.</p><input className="field full" value={invite} readOnly aria-label="Tautan undangan" onFocus={event=>event.currentTarget.select()}/><button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(invite);setNotice('Tautan undangan disalin.')}catch{setError('Pilih dan salin tautan secara manual.')}}}>Salin tautan</button></>:<button className="secondary" disabled={busy} onClick={()=>inviteEmployee(selectedEmployee.id)}>Buat tautan undangan</button>}</div>}</>}
      {panel==='search' && <><input className="field full" aria-label="Nama, jabatan, departemen, atau ID" placeholder="Nama, jabatan, departemen, atau ID" value={query} onChange={e=>setQuery(e.target.value)}/>{matches.map(item=><button className="list-part" key={item.id} onClick={()=>open('employee',item.id)}>{item.name}<ChevronRight size={16}/></button>)}{!matches.length && <p className="empty">Karyawan tidak ditemukan.</p>}</>}
      {panel==='alerts' && <>{pending.map(item=><button className="list-part" key={item.id} onClick={()=>open('request',item.id)}>{item.type} · {item.name}<ChevronRight size={16}/></button>)}{!pending.length && <p className="empty">Semua pengajuan sudah ditinjau.</p>}</>}
    </Modal>}
    {notice && <div className="toast" role="status"><Check size={17}/> {notice}</div>}
  </div>
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
  return <dialog className="modal" ref={node=>{if(node && !node.open) node.showModal()}} aria-labelledby="modal-title" onCancel={event=>{event.preventDefault();onClose()}} onClick={event=>{if(event.target===event.currentTarget) onClose()}}>
    <div className="modal-content"><div className="card-head"><h2 id="modal-title">{title}</h2><button className="icon" aria-label="Tutup dialog" onClick={onClose}><X size={18}/></button></div>{children}</div>
  </dialog>
}
