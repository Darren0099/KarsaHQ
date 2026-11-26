# KarsaHQ

HRIS Next.js dan TypeScript dengan database Neon PostgreSQL. Dashboard mencakup direktori karyawan, departemen, pengajuan cuti/lembur/koreksi absensi, persetujuan, rekap CSV, absensi GPS, dan audit log. Profil menyimpan masa kerja, kontrak, riwayat, dan lampiran PDF dengan akses admin HR. Penggajian mendukung pratinjau, penerbitan per orang per bulan, dan cetak slip. Tarif pajak diisi manual sebagai parameter, lalu sistem menghitung potongan nominal. Perhitungan ini belum menerapkan aturan PPh 21 TER atau BPJS.

## Menjalankan aplikasi

1. Gunakan Node.js 22+ dan jalankan `npm ci`.
2. Salin `.env.example` ke `.env` dan isi koneksi Neon, URL aplikasi, secret Better Auth, dan kunci pengaturan awal. Gunakan token acak minimal 32 karakter.
3. Jalankan migrasi dari root repository dengan `node --env-file=.env --import tsx scripts/migrate.ts`. Gunakan koneksi direct melalui `DIRECT_URL` untuk migrasi.
4. Next.js membaca env lokal dari direktori `apps/web`. Untuk pengembangan, jalankan `node --env-file=.env node_modules/next/dist/bin/next dev apps/web`.
5. Buka `/login?setup=1` untuk membuat perusahaan dan akun admin pertama. Masukkan `BOOTSTRAP_TOKEN` dan pilih sendiri kata sandi. Masuk, pindai QR dengan autentikator, masukkan kode, lalu simpan recovery codes. Pengaturan awal ditutup setelah workspace dibuat.

## Vercel

Hubungkan root repo. Atur `DATABASE_URL` (pooled), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, dan `BOOTSTRAP_TOKEN` untuk production. Hapus token bootstrap setelah workspace dibuat. Buat database/cabang terpisah saat mengaktifkan preview dengan autentikasi. Jalankan migrasi secara terpisah sebelum rilis.

## Operasional HR

- Dashboard dan API memerlukan sesi yang berhasil diverifikasi dengan TOTP atau kode pemulihan. Akun layanan HRIS berdiri sendiri.
- Database menegakkan RLS berdasarkan perusahaan pada tabel operasional. Hak akses dan scope juga diperiksa di server.
- Catatan audit ditulis bersama mutasi dalam transaksi dan bersifat append-only. UI menampilkan 100 peristiwa terkini. Audit menghindari penyimpanan salinan koordinat absensi.
- Absensi menggunakan waktu server di zona WIB dan izin lokasi browser. Admin dapat mengatur area kantor. Lokasi di luar radius atau kurang akurat disimpan dengan status untuk ditinjau. Satu masuk dan satu pulang per akun per hari. Nilai kehadiran menggunakan jumlah akun workspace.
- Saat ini setup web membuat admin pertama. Admin dapat membuat tautan undangan sekali pakai lewat profil karyawan, berlaku 48 jam. Akun staf dapat mencatat absensi sendiri setelah mengaktifkan 2FA. Persetujuan masih satu tahap. Shift, selfie, saldo cuti, audit atas pembacaan, dan log formal autentikasi berada di luar rilis awal.

Halaman utama ada di `/`. Dashboard yang memerlukan 2FA ada di `/dashboard`. Setelah slip terbit, staf yang ditautkan ke profil karyawan dapat membuka slipnya dari menu Penggajian.
