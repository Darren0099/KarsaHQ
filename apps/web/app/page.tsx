import Link from 'next/link'
import { ArrowDown, ArrowUpRight, Banknote, CalendarDays, ChartNoAxesCombined, ClipboardCheck, FolderOpen, LockKeyhole, MapPin, ScanLine, UsersRound } from 'lucide-react'
import Reveal from './reveal'
import FeatureCard from './feature-card'
import TechnologyStrip from './technology-strip'
import LandingFaq from './landing-faq'

const modules=[
  {icon:UsersRound,title:'Direktori karyawan',description:'Temukan profil, riwayat jabatan, kontrak, dan dokumen di tempat yang sama.'},
  {icon:MapPin,title:'Kehadiran dengan GPS',description:'Catat jam masuk dan pulang, lalu tinjau apakah lokasi sesuai area kerja.'},
  {icon:ClipboardCheck,title:'Cuti dan lembur',description:'Tinjau pengajuan dan lihat status persetujuan setiap permintaan.'},
  {icon:ChartNoAxesCombined,title:'Analitik SDM',description:'Pantau jumlah karyawan aktif, turnover, dan kontrak yang mendekati tanggal akhir.'},
  {icon:Banknote,title:'Penggajian dan slip',description:'Hitung gaji dari kehadiran, lembur yang disetujui, tunjangan, dan potongan.'},
  {icon:LockKeyhole,title:'Akses dan audit',description:'Gunakan 2FA dan tinjau catatan perubahan untuk aktivitas administratif.'}
]

const questions=[
  ['Siapa yang bisa membuat akun staf?','Admin HR dapat membuat undangan sekali pakai dari profil karyawan. Staf menggunakan undangan itu saat mendaftar.'],
  ['Siapa yang dapat membuka dokumen karyawan?','Dokumen terpusat dapat dibuka oleh admin HR. Staf dapat membuka slip gaji yang diterbitkan untuk profilnya sendiri.'],
  ['Bagaimana slip gaji dibuat?','Admin HR memilih karyawan dan periode, mengisi komponen gaji, meninjau hasil, lalu menerbitkan slip yang bisa dicetak atau disimpan sebagai PDF.'],
  ['Apakah tarif pajak dihitung otomatis?','KarsaHQ menghitung nominal potongan dari tarif yang dimasukkan HR. Tarif PPh 21 TER dan BPJS belum dihitung otomatis.']
]

function Brand() {
  return <Link className="landing-brand" href="/"><span className="mark"><i/><i/><i/></span>Karsa<strong>HQ</strong></Link>
}

const phoneScreenshot: string | null = null

export default function Landing() {
  return <div className="landing landing-editorial landing-deck">
    <Reveal/>
    <header id="atas" className="landing-nav">
      <Brand/>
      <nav aria-label="Navigasi situs"><a href="#fitur">Fitur</a><a href="#manfaat">Manfaat</a><a href="#alur">Cara kerja</a><a href="#faq">FAQ</a></nav>
      <div className="landing-actions"><Link href="/login">Masuk</Link><Link className="landing-cta" href="/register">Daftar <ArrowUpRight size={16}/></Link></div>
    </header>
    <main className="landing-main">
      <section className="landing-hero">
        <div className="landing-decoration float-a" aria-hidden="true"><FolderOpen size={23}/><b>Kontrak karyawan</b><span>Dokumen tersimpan</span></div>
        <div className="landing-decoration float-b" aria-hidden="true"><MapPin size={23}/><b>Absensi masuk</b><span>Dalam area kerja</span></div>
        <div className="landing-decoration float-c" aria-hidden="true"><Banknote size={24}/><b>Slip gaji</b><span>Siap diakses</span></div>
        <div className="landing-copy">
          <h1>Kelola orang.<br/><em>Pahami datanya.</em></h1>
          <p>KarsaHQ menyatukan data karyawan, kehadiran, dan penggajian agar HR bisa bekerja dari satu tempat.</p>
          <div className="landing-actions"><Link className="landing-cta" href="/login">Masuk ke KarsaHQ <ArrowUpRight size={17}/></Link><a href="#fitur">Jelajahi fitur <ArrowDown size={15}/></a></div>
        </div>
      </section>
      <TechnologyStrip/>
      <section id="fitur" className="landing-section">
        <div className="landing-section-head" data-reveal><h2>Fitur untuk setiap hari kerja.</h2><p>Dari pendataan karyawan sampai penerbitan slip bulanan.</p></div>
        <div className="landing-feature-grid">{modules.map(({icon:Icon,title,description})=><FeatureCard key={title} title={title} description={description} icon={<Icon size={24}/>}/>)}</div>
      </section>
      <section id="manfaat" className="landing-section landing-benefits">
        <div className="benefits-heading" data-reveal><h2>Data yang rapi, keputusan yang jelas.</h2><p>Temukan informasi yang dibutuhkan sebelum menentukan tindak lanjut.</p></div>
        <div className="benefits-grid">{[
          {Icon:FolderOpen,title:'Satu profil per karyawan',label:'Riwayat kerja dan kontrak',text:'Temukan dokumen dan riwayat kerja dari profil yang sama.'},
          {Icon:CalendarDays,title:'Prioritas kontrak terlihat',label:'Kontrak berakhir',text:'Pantau tanggal akhir kontrak dan tentukan yang perlu ditinjau.'},
          {Icon:ScanLine,title:'Perubahan bisa ditelusuri',label:'Aktivitas HR',text:'Lihat siapa yang mengubah data dan kapan perubahan terjadi.'}
        ].map(({Icon,title,label,text})=><article className="benefits-card" key={title} data-reveal>
          <div className="benefits-art" aria-hidden="true"><Icon size={58} strokeWidth={1.35}/><span>{label}</span></div>
          <div className="benefits-caption"><h3>{title}</h3><p>{text}</p></div>
        </article>)}</div>
      </section>
      <section id="alur" className="landing-section landing-split landing-workflow">
        <div data-reveal>
          <h2>Jam masuk pagi ini, kok bisa sampai ke slip gaji?</h2><p>Ikuti bagaimana data yang dicatat setiap hari menjadi dasar hitung gaji bulanan.</p>
          <ol className="landing-steps">{[
            ['Siapkan profil','Lengkapi nama, jabatan, tanggal mulai, dan kontrak.'],
            ['Catat dan tinjau','Kehadiran tercatat lewat absensi GPS. HR meninjau pengajuan lembur.'],
            ['Hitung dan terbitkan','Periksa gaji bersih, lalu terbitkan slip untuk karyawan.']
          ].map(([title,copy],index)=><li key={title} data-reveal><span>{index+1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol>
        </div>
        <div id="dashboard-preview" className="landing-workflow-visual" data-reveal>
          <figure className="landing-phone" aria-label="Bingkai HP untuk tangkapan layar KarsaHQ">
            <div className="landing-phone-screen">
              {phoneScreenshot && <img src={phoneScreenshot} alt="KarsaHQ di ponsel" width={390} height={844}/>}
            </div>
          </figure>
          <Link className="landing-cta" href="/dashboard">Buka dashboard <ArrowUpRight size={16}/></Link>
        </div>
      </section>
      <section id="akses" className="landing-section landing-access">
        <div className="access-hero" data-reveal>
          <div><h2>Akses sesuai peran.</h2><p>Masuk dengan verifikasi dua langkah. Setiap pengguna melihat data yang sesuai dengan aksesnya.</p><Link className="landing-cta" href="/login">Masuk ke KarsaHQ <ArrowUpRight size={16}/></Link></div>
          <div className="access-art" aria-hidden="true"><LockKeyhole size={75} strokeWidth={1.3}/></div>
        </div>
        <div className="landing-feature-grid">{[
          ['Admin HR','Kelola profil, dokumen, pengajuan, dan penerbitan slip.'],
          ['Karyawan','Catat absensi dan buka slip yang diterbitkan untuk akunmu.'],
          ['Data perusahaan','Data operasional dipisahkan berdasarkan perusahaan.']
        ].map(([title,copy])=><FeatureCard key={title} title={title} description={copy} icon={<LockKeyhole size={24}/>}/>)}</div>
      </section>
      <section id="faq" className="landing-section landing-split landing-faq">
        <div data-reveal><h2>Pertanyaan yang sering muncul.</h2></div>
        <LandingFaq questions={questions}/>
      </section>
      <section className="landing-section landing-flow" data-reveal>
        <div><h2>Kerja HR lebih ringan.<br/><em>Tim tahu langkah berikutnya.</em></h2><p>Masuk dengan akunmu atau daftar dengan undangan dari HR.</p></div>
        <div className="landing-actions"><Link href="/login">Masuk</Link><Link className="landing-cta" href="/register">Daftar <ArrowUpRight size={17}/></Link></div>
      </section>
    </main>
    <footer className="landing-footer" data-reveal>
      <a className="footer-wordmark" href="/" aria-label="KarsaHQ, kembali ke beranda"><span>Karsa</span><span>HQ</span></a>
      <div className="footer-meta">
        <span>© 2026 KarsaHQ</span>
        <nav aria-label="Navigasi footer"><a href="#fitur">Fitur</a><a href="#alur">Cara kerja</a><a href="#akses">Akses</a><a href="#faq">FAQ</a></nav>
        <a href="#atas">Ke atas ↑</a>
      </div>
    </footer>
  </div>
}
