# Tirai: aplikasi ZISWAF privacy-first

Tugas besar mata kuliah ICT dan Islam (Teknik Informatika), Topik D: Perancangan Aplikasi Privacy-First Berbasis Prinsip Digital Amanah. Tim 3 orang. Berkas ini adalah acuan kerja untuk Claude Code. Baca seluruhnya sebelum menulis kode.

## Cara kerja yang diminta

- Stack sudah diputuskan tim (lihat "Keputusan yang sudah diambil"). Jangan menggantinya tanpa persetujuan.
- Buat rencana dan kerangka proyek dulu, lalu minta persetujuan sebelum menulis kode fitur.
- Kerjakan per langkah kecil, jalankan, dan tunjukkan hasilnya. Jangan menumpuk banyak fitur sekaligus.
- Jangan mengarang. Ini aturan integritas dari dosen: pemalsuan rujukan ayat atau hadis dan klaim hasil uji yang fiktif membuat seluruh kelompok mendapat nilai E.
  - Jangan menulis teks ayat, nomor ayat, atau hadis dari ingatan sebagai fakta. Tandai `[VERIFIKASI]` sampai manusia mengecek ke sumber asli.
  - Jangan menulis angka hasil uji yang tidak benar-benar dijalankan. Simpan log hasil uji di repositori.
  - Jangan menyebut sesuatu "E2EE" kalau bukan E2EE (lihat bagian Enkripsi).
- Hanya data sintetis. Jangan pernah memakai data jamaah atau mustahik sungguhan. Repositori akan publik.
- Jangan commit rahasia: kunci master, `.env`, kredensial. Sediakan `.env.example`.
- Penggunaan AI wajib dilaporkan di lembar pernyataan kontribusi. Catat ringkas apa yang dibantu AI di `docs/pernyataan-ai.md`.

## Keputusan yang sudah diambil

- Nama aplikasi: Tirai (sebelumnya AmanahZ).
- Tampilan: React + Vite, animasi dengan Motion. JavaScript biasa, bukan TypeScript.
- Server: Node.js + Express. Satu aplikasi: Express menyajikan API dan hasil build React.
- Database: SQLite.
- Tes: Vitest + Supertest.
- Prototipe utama dijalankan di laptop. Deploy online opsional (rencana: Render paket gratis, data sintetis diisi ulang setiap server menyala). GitHub Pages tidak bisa menjalankan server, jadi tidak dipakai untuk aplikasi utuh.

## Luaran yang dinilai

Bobot: fungsionalitas dan kualitas teknis 35%, integrasi etika dan syariah 30%, laporan 20%, presentasi 15%.

1. Prototipe yang berjalan tanpa runtime error.
2. Repositori GitHub atau GitLab dengan README (cara instal), arsitektur, dan dokumentasi API.
3. Laporan ilmiah format IEEE, 8 sampai 12 halaman.
4. Video demo 7 sampai 10 menit, minimal 1080p.

Milestone: proposal minggu 9, progress review minggu 12, pengumpulan final minggu 15. Fitur inti harus jalan sebelum minggu 12.

## Gagasan inti

Aplikasi web pengelolaan ZISWAF (zakat, infak, sedekah, wakaf) untuk satu masjid atau lembaga amil. Prinsipnya: kumpulkan data seperlunya, kunci yang sensitif, batasi akses menurut peran, catat setiap akses, dan beri pemilik data kendali atas datanya.

Rumusan masalah:
1. Bagaimana merancang sistem ZISWAF dengan Privacy by Design sehingga hanya data yang diperlukan yang dikumpulkan?
2. Bagaimana enkripsi dan RBAC mencegah akses tanpa hak, dari luar maupun dari pengguna internal?
3. Bagaimana dasbor transparansi memberi pengguna hak melihat, mengekspor, dan menghapus datanya?
4. Bagaimana setiap fitur dipertanggungjawabkan secara syariah?

## Peran dan matriks hak akses (RBAC)

Akses mulai dari nol, lalu ditambah hanya jika peran itu memerlukannya.

| Data atau aksi | Admin | Bendahara | Amil lapangan | Pemilik data |
| --- | --- | --- | --- | --- |
| Kelola akun dan peran | ya | tidak | tidak | profil sendiri |
| Nominal donasi dan penyaluran | ringkasan | catat dan lihat | tidak | donasi sendiri |
| Identitas donatur (nama, kontak) | tidak | nama saja | tidak | milik sendiri |
| Data mustahik (alamat, kondisi) | tidak | tanpa alamat dan kondisi | wilayahnya saja | milik sendiri |
| Audit log | lihat semua | tidak | tidak | akses atas data sendiri |
| Proses permintaan ekspor dan hapus | ya | tidak | tidak | ajukan untuk data sendiri |

Mustahik sering tidak punya akun. Hak lihat, ekspor, dan hapus mereka dijalankan lewat amil atas permintaan mustahik, dan tetap tercatat di audit log.

## Inventaris data (minimisasi)

Setiap field harus punya alasan tertulis. Data tanpa alasan tidak diminta.

| Data | Dikumpulkan? | Alasan | Perlindungan |
| --- | --- | --- | --- |
| Nama donatur | ya | bukti donasi | RBAC |
| Kontak donatur | opsional | kirim bukti donasi | enkripsi kolom, RBAC |
| Nominal dan jenis donasi | ya | pembukuan dan laporan | RBAC |
| Nama mustahik | ya | menyalurkan bantuan | enkripsi kolom, RBAC wilayah |
| Alamat lengkap mustahik | ya, hanya amil wilayah | verifikasi dan penyaluran | enkripsi kolom, RBAC wilayah |
| Kategori penerima (asnaf) | ya | menentukan hak penerima | RBAC |
| Kondisi ekonomi atau kesehatan | catatan singkat | alasan penyaluran | enkripsi kolom, hanya amil wilayah |
| NIK | usulan: tidak disimpan utuh | cegah penerima ganda | simpan HMAC berkunci sebagai penanda duplikat (keputusan tim) |
| Foto KTP, GPS, daftar kontak telepon | tidak | tidak ada kebutuhan | tidak dikumpulkan |

Masa simpan tiap data belum ditetapkan. Itu pertanyaan terbuka untuk wawancara pengurus.

## Keamanan

- Di perjalanan: HTTPS.
- Di penyimpanan: kolom sensitif dienkripsi di level aplikasi dengan AES-256-GCM. Kunci data dibungkus kunci master (envelope encryption). Kunci master disimpan di luar database.
- Kata sandi disimpan sebagai hash dengan algoritma standar. Jangan membuat kriptografi sendiri. Pakai pustaka standar dari bahasa yang dipilih.
- E2EE: aplikasi web dengan RBAC di server perlu membaca data untuk menyaring akses, jadi E2EE penuh tidak cocok. Yang dibangun: enkripsi kolom, ditambah opsional satu fitur E2EE terbatas (catatan rahasia dienkripsi di browser dengan Web Crypto API). Dokumentasikan batasnya dengan jujur di laporan.
- Audit log: setiap baca, ubah, ekspor, dan hapus pada data sensitif dicatat (siapa, kapan, aksi, data siapa). Hanya bisa ditambah, tidak ada fitur edit atau hapus dari aplikasi. Isinya tidak memuat data pribadi dalam bentuk asli.

## Dasbor transparansi untuk pemilik data

- Data saya: semua data milik pengguna beserta tujuan pengumpulan tiap field.
- Riwayat akses: peran, waktu, jenis aksi, diambil dari audit log.
- Ekspor: JSON dan CSV. Aksinya tercatat.
- Hapus: data pribadi dihapus atau dianonimkan. Catatan keuangan yang wajib tersimpan untuk pembukuan dipertahankan tanpa identitas. Ini usulan awal, perlu keputusan tim dan dosen karena hak hapus berhadapan dengan kewajiban pembukuan zakat.
- Persetujuan (consent): lihat dan cabut per tujuan.

## Prioritas pengerjaan

Jika waktu mepet, urutan ini: (1) login dan RBAC, (2) enkripsi kolom, (3) audit log, (4) dasbor transparansi, (5) consent, (6) E2EE opsional. Tiga yang pertama sudah cukup untuk demo inti.

## Pengujian dan bukti

| Yang diuji | Cara | Bukti lulus |
| --- | --- | --- |
| Enkripsi di penyimpanan | Buka tabel database langsung | Kolom sensitif berupa ciphertext |
| RBAC | Tes otomatis: setiap peran terhadap setiap endpoint | Akses terlarang ditolak (403). Catat jumlah lulus dan gagal apa adanya |
| Audit log | Jalankan aksi sensitif | Tiap aksi tercatat, tanpa data pribadi asli |
| Ekspor dan hapus | Ekspor lalu hapus akun uji | Berkas ekspor lengkap, data tak lagi terbaca |
| Keamanan web dasar | SQL injection, XSS, broken access control (misalnya OWASP ZAP) | Temuan dicatat, perbaikan dijelaskan |
| Minimisasi | Daftar field per jenis data | Setiap field punya alasan tertulis |

## Landasan syariah (semua perlu diverifikasi manusia ke sumber asli)

| Fitur | Landasan | Maqashid |
| --- | --- | --- |
| Minimisasi dan batas tujuan | kaidah "la dharar wa la dhirar" [VERIFIKASI] | Hifz al-Nafs, Hifz al-Irdh |
| RBAC dan enkripsi | QS. An-Nisa: 58; hadis "al-mustasyar mu'taman" [VERIFIKASI nomor dan derajat] | Hifz al-Irdh, Hifz al-Mal |
| Audit log | QS. Al-Hujurat: 12 (tajassus) [VERIFIKASI] | Hifz al-Irdh |
| Consent | QS. An-Nur: 27, hanya sebagai analogi, bukan dalil langsung [VERIFIKASI] | Hifz al-Irdh |
| Dasbor lihat, ekspor, hapus | QS. An-Nisa: 58 [VERIFIKASI] | Hifz al-Nafs, Hifz al-Mal |

Rujukan hukum positif: UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi. Cek pasal yang dikutip.

## Arah tampilan (masih draf, perlu iterasi dengan melihat hasil di browser)

Pemilik proyek menilai rancangan awal masih kurang bagus. Jalankan aplikasi, lihat hasilnya di browser, dan perbaiki bersama.

- Kesan: sederhana, familiar bagi masyarakat umum, profesional. Huruf kecil dan rapi. Bukan tampilan templat AI: hindari kartu ikon yang seragam, label kecil di atas setiap judul, gradasi, dan emoji.
- Satu elemen yang menonjol: halaman utama berisi "buku kas penyaluran" yang interaktif. Pilih peran (Admin, Bendahara, Amil lapangan) dan data yang tidak boleh dilihat peran itu ditutup bar hitam seperti dokumen yang disamarkan. Kolom angka diberi garis ganda merah seperti buku kas sungguhan.
- Palet: hijau masjid `#0F5E4B`, biru tinta `#24408E`, merah garis buku `#B3372E`, hijau garis kertas `#CFE0D8`, latar `#EEF2F0`, tinta `#1C2630`, putih untuk lembar.
- Huruf: Atkinson Hyperlegible, satu keluarga. Teks isi 15px, judul utama sekitar 30px, keterangan 13px. Panjang baris di bawah 80 karakter.
- Gerak: pemilik proyek ingin tampilan lebih animated, modern, dan timeless. Animasi boleh banyak dan halus, tetapi tiap gerakan harus bermakna, bukan dekorasi: tirai menutup sel saat peran diganti, angka berputar ke nilai baru, baris audit log meluncur masuk saat ada akses, alur data (teks asli, ciphertext, RBAC, log) bergerak saat bagian "Cara Tirai menjaga data" di-scroll, konfirmasi aksi muncul singkat. Semua animasi wajib mati saat `prefers-reduced-motion` aktif.
- Kualitas dasar: responsif sampai layar ponsel, fokus keyboard terlihat, kontras teks minimal 4,5:1, target sentuh minimal 44px.
- Halaman: beranda dengan buku kas, bagian "Cara Tirai menjaga data", dan dasbor "Data saya" (data tersimpan, riwayat akses, tombol ekspor, hapus, dan cabut izin).

## Struktur repositori yang diharapkan

```
README.md            cara instal, menjalankan, arsitektur
docs/                arsitektur, pernyataan-ai.md, bukti-uji/
src/                 kode aplikasi
tests/               tes RBAC, enkripsi, audit log
.env.example         tanpa rahasia
```
