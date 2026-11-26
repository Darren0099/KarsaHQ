import Link from 'next/link'
import { ArrowDown, ArrowUpRight, Banknote, CalendarDays, ChartNoAxesCombined, LayoutDashboard, UsersRound } from 'lucide-react'

const modules=[
  {icon:UsersRound,title:'Data karyawan',description:'Simpan profil, riwayat kerja dan kontrak. HR bisa mengakses dokumen dari profil yang sama.'},
  {icon:ChartNoAxesCombined,title:'Analitik SDM',description:'Pantau pergantian karyawan, kehadiran, dan kontrak yang mendekati tanggal berakhir.'},
  {icon:Banknote,title:'Penggajian',description:'Hitung gaji dari kehadiran, lembur disetujui, tunjangan dan potongan. Tinjau sebelum menerbitkan slip.'}
]

export default function Landing() {
  return <div className="landing">
    <header className="landing-nav">
      <Link className="landing-brand" href="/"><span className="mark"><i/><i/><i/></span>Karsa<strong>HQ</strong></Link>
      <nav aria-label="Navigasi situs"><a href="#fitur">Fitur</a><a href="#alur">Cara kerja</a></nav>
      <div className="landing-actions"><Link href="/login">Masuk</Link><Link className="landing-cta" href="/register">Daftar <ArrowUpRight size={16}/></Link></div>
    </header>
    <main className="landing-main">
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>Kelola tim.<br/>Pahami datanya.</h1>
          <p>Satukan profil karyawan, absensi, kontrak, dan slip gaji dalam satu sistem HR.</p>
          <div className="landing-actions"><Link className="landing-cta" href="/login">Masuk ke KarsaHQ <ArrowUpRight size={17}/></Link><a href="#fitur">Jelajahi fitur <ArrowDown size={15}/></a></div>
        </div>
        <div className="landing-visual" aria-label="Ilustrasi tampilan dashboard KarsaHQ">
          <div className="landing-orbit" aria-hidden="true"/>
          <div className="landing-product">
            <div className="product-top"><span>Karsa<strong>HQ</strong></span><div><LayoutDashboard size={14}/> Dashboard</div><div><UsersRound size={14}/> Karyawan</div></div>
            <div className="product-title"><span>Operasional SDM</span><strong>Ringkasan tim</strong></div>
            <div className="product-metrics">
              <div><UsersRound size={16}/><span>Karyawan aktif</span><strong>48</strong></div>
              <div><CalendarDays size={16}/><span>Kontrak segera berakhir</span><strong>4</strong></div>
            </div>
            <div className="product-chart"><b>Kehadiran mingguan</b><div>{[59,76,67,90,82,93,72].map((height,index)=><i key={index} style={{height:height+'%'}}/>)}</div></div>
            <div className="product-payment"><Banknote size={18}/><span>Slip gaji</span><b>Terbit</b></div>
          </div>
        </div>
      </section>
      <section id="fitur" className="landing-section">
        <h2>Perangkat untuk kerja HR sehari-hari</h2>
        <div className="landing-features">{modules.map(({icon:Icon,title,description})=><article key={title}><Icon size={24}/><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>
      <section id="alur" className="landing-section landing-flow">
        <div><h2>Dari absensi ke slip gaji</h2><p>Catat kehadiran, tinjau pengajuan lembur, dan hitung gaji bulanan. Setelah HR menerbitkan slip, karyawan bisa membuka slip miliknya.</p></div>
        <Link className="landing-cta" href="/login">Buka KarsaHQ <ArrowUpRight size={17}/></Link>
      </section>
    </main>
    <footer className="landing-footer"><span>KarsaHQ</span><Link href="/login">Masuk</Link></footer>
  </div>
}
