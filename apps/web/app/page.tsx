import Link from 'next/link'
import { ArrowDown, ArrowUpRight, Banknote, CalendarDays, ChartNoAxesCombined, ClipboardCheck, FolderOpen, LayoutDashboard, LockKeyhole, MapPin, ScanLine, UsersRound } from 'lucide-react'
import Reveal from './reveal'

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

function AttendancePreview() {
  return <div className="product-chart"><b>Kehadiran mingguan</b><div>{[59,76,67,90,82,93,72].map((height,index)=><i key={index} style={{height:height+'%'}}/>)}</div></div>
}

export default function Landing() {
  return <div className="landing landing-editorial">
    <Reveal/>
    <header className="landing-nav">
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
      <section id="fitur" className="landing-section">
        <div className="landing-section-head" data-reveal><h2>Fitur untuk setiap hari kerja.</h2><p>Dari pendataan karyawan sampai penerbitan slip bulanan.</p></div>
        <div className="landing-features">{modules.map(({icon:Icon,title,description})=><article key={title} data-reveal><Icon size={24}/><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>
      <section id="manfaat" className="landing-section landing-split landing-benefits" data-reveal>
        <div><h2>Data yang rapi, keputusan yang jelas.</h2><p>Lihat konteks sebelum menentukan tindak lanjut, dari kontrak yang akan berakhir hingga komponen yang membentuk gaji.</p></div>
        <ul className="landing-list"><li><FolderOpen/><div><b>Satu profil per karyawan</b><p>Teruskan pekerjaan tanpa mencari dokumen di banyak tempat.</p></div></li><li><CalendarDays/><div><b>Prioritas kontrak terlihat</b><p>Tinjau tanggal akhir dan status kerja sebelum mengambil keputusan.</p></div></li><li><ScanLine/><div><b>Perubahan bisa ditelusuri</b><p>Periksa jejak aktivitas HR lewat audit log.</p></div></li></ul>
      </section>
      <section id="alur" className="landing-section">
        <div className="landing-section-head" data-reveal><h2>Dari data awal ke slip gaji.</h2><p>Tiga langkah untuk menjalankan satu siklus penggajian.</p></div>
        <ol className="landing-steps">{[
          ['Siapkan profil','Lengkapi nama, jabatan, tanggal mulai, dan kontrak.'],
          ['Catat dan tinjau','Kehadiran tercatat lewat absensi GPS. HR meninjau pengajuan lembur.'],
          ['Hitung dan terbitkan','Periksa gaji bersih, lalu terbitkan slip untuk karyawan.']
        ].map(([title,copy],index)=><li key={title} data-reveal><span>{index+1}</span><h3>{title}</h3><p>{copy}</p></li>)}</ol>
      </section>
      <section id="dashboard-preview" className="landing-section landing-split landing-preview" data-reveal>
        <div><h2>Kenali dashboard sebelum mulai.</h2><p>Pindah modul lewat tab di bagian atas. Lihat pengajuan, kontrak, kehadiran, atau slip di panel yang sama.</p><Link className="landing-cta" href="/dashboard">Buka dashboard <ArrowUpRight size={16}/></Link></div>
        <div className="landing-product" aria-label="Ilustrasi tampilan dashboard KarsaHQ">
          <div className="product-top"><span>Karsa<strong>HQ</strong></span><div><LayoutDashboard size={14}/> Dashboard</div><div><UsersRound size={14}/> Karyawan</div></div>
          <div className="product-title"><span>Operasional SDM</span><strong>Ringkasan tim</strong></div>
          <AttendancePreview/>
          <div className="product-payment"><Banknote size={18}/><span>Slip gaji</span><b>Terbit</b></div>
        </div>
      </section>
      <section id="akses" className="landing-section">
        <div className="landing-section-head" data-reveal><h2>Akses sesuai peran.</h2><p>Masuk dengan verifikasi dua langkah. Setiap pengguna melihat data yang sesuai dengan aksesnya.</p></div>
        <div className="landing-features">{[
          ['Admin HR','Kelola profil, dokumen, pengajuan, dan penerbitan slip.'],
          ['Karyawan','Catat absensi dan buka slip yang diterbitkan untuk akunmu.'],
          ['Data perusahaan','Data operasional dipisahkan berdasarkan perusahaan.']
        ].map(([title,copy])=><article key={title} data-reveal><LockKeyhole size={21}/><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>
      <section id="faq" className="landing-section landing-split landing-faq">
        <div data-reveal><h2>Pertanyaan yang sering muncul.</h2></div>
        <div>{questions.map(([question,answer])=><details key={question} data-reveal><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>
      <section className="landing-section landing-flow" data-reveal>
        <div><h2>Siap mulai?</h2><p>Masuk dengan akun yang sudah ada atau daftar dengan undangan HR.</p></div>
        <div className="landing-actions"><Link href="/login">Masuk</Link><Link className="landing-cta" href="/register">Daftar <ArrowUpRight size={17}/></Link></div>
      </section>
    </main>
    <footer className="landing-footer"><Brand/><div className="landing-actions"><a href="#fitur">Fitur</a><a href="#faq">FAQ</a><Link href="/login">Masuk</Link></div></footer>
  </div>
}
