# Arsitektur Tirai

Dokumen ini diperbarui setiap langkah selesai. Bagian yang belum dibangun ditandai "rencana".

## Komponen

| Komponen | Teknologi | Peran |
| --- | --- | --- |
| Tampilan | React + Vite, Motion | Antarmuka pengguna. Tidak pernah dipercaya untuk keputusan akses |
| Server | Node.js + Express | API, pemeriksaan RBAC, enkripsi dan dekripsi kolom, pencatatan audit log |
| Database | SQLite (`node:sqlite`) | Penyimpanan. Kolom sensitif disimpan sebagai ciphertext AES-256-GCM |
| Kunci | Variabel lingkungan (`.env`), di luar database | Kunci master (pembungkus kunci data) dan kunci HMAC NIK |

Pada mode produksi, Express juga menyajikan hasil build React dari folder `dist/`, sehingga aplikasi cukup dijalankan sebagai satu proses.

## Prinsip

- Semua keputusan akses diambil di server. Tampilan hanya menampilkan apa yang dikirim server.
- Data yang tidak boleh dilihat suatu peran tidak dikirim ke browser sama sekali, bukan sekadar disembunyikan dengan CSS.

## Database (langkah 1)

Berkas skema: [`src/server/db/skema.sql`](../src/server/db/skema.sql). Alasan tiap kolom: [inventaris-data.md](inventaris-data.md).

```mermaid
erDiagram
  wilayah ||--o{ mustahik : "berada di"
  wilayah |o--o{ pengguna : "tugas amil"
  donatur |o--o{ donasi : "memberi"
  donatur |o--o| pengguna : "akun pemilik data"
  mustahik |o--o| pengguna : "akun pemilik data"
  mustahik ||--o{ penyaluran : "menerima"
  pengguna ||--o{ donasi : "mencatat"
  pengguna ||--o{ penyaluran : "mencatat"
```

| Tabel | Isi |
| --- | --- |
| `wilayah` | Pembagian wilayah tugas amil lapangan (misalnya RW) |
| `donatur` | Nama donatur dan kontak opsional |
| `mustahik` | Penerima: nama, alamat, kondisi, asnaf, wilayah, penanda duplikat NIK |
| `pengguna` | Akun masuk: peran, wilayah (khusus amil), tautan ke data milik sendiri (khusus pemilik data) |
| `donasi` | Dana masuk per jenis ZISWAF |
| `penyaluran` | Dana keluar ke mustahik |

Keputusan teknis:

- Driver: modul `node:sqlite` bawaan Node.js (perlu Node 22.13 atau lebih baru). Tidak perlu paket native yang dikompilasi, jadi pemasangan di laptop anggota tim tidak bergantung pada alat build. Modul ini masih berlabel eksperimental di Node 22, dan peringatannya disembunyikan dengan `--disable-warning=ExperimentalWarning`.
- Semua tabel `STRICT`: SQLite menolak nilai yang tipenya tidak cocok, misalnya teks di kolom nominal.
- Aturan penting ditegakkan di database, tidak hanya di kode: kategori asnaf dan jenis dana dibatasi `CHECK`, nominal harus positif, amil wajib punya wilayah, akun pemilik data wajib tertaut ke tepat satu donatur atau mustahik, dan penanda NIK unik.
- Database dibuat ulang dengan data sintetis setiap server menyala (`data/tirai.db`, tidak masuk git). Perubahan dari aplikasi hilang saat server dimulai ulang. Ini disengaja untuk prototipe dan demo online.
- Donasi boleh tanpa donatur (`donatur_id` kosong) untuk donatur yang memilih tanpa nama.
- `nik_hmac` berisi HMAC dari NIK, bukan NIK (lihat bagian Enkripsi kolom).
- Kata sandi akun disimpan sebagai hash scrypt (modul `crypto` bawaan Node.js) dengan salt acak per akun.

Hal yang perlu dikonfirmasi ke pengurus atau dosen:

- Kategori asnaf memakai delapan golongan penerima zakat (rujukan yang biasa dikutip: QS. At-Taubah: 60 [VERIFIKASI]).
- Wakaf tidak disalurkan langsung ke mustahik di prototipe ini. Ini penyederhanaan.
- Zakat fitrah dicatat dalam rupiah saja, belum dalam bentuk beras.
- Masa simpan tiap data belum ditetapkan. Kolom `dibuat_pada` disiapkan sebagai dasar perhitungannya.

## Login dan RBAC (langkah 2)

Alur satu permintaan:

```
Browser --cookie tirai_sesi--> kenaliPengguna --> wajib(hak) --> rute --> saring menurut peran --> JSON
                                (sesi -> akun)      (401/403)              (kebijakan.js)
```

- Kebijakan hak akses ada di satu berkas: [`src/server/keamanan/kebijakan.js`](../src/server/keamanan/kebijakan.js). Setiap peran mulai dari nol hak, lalu ditambah hanya yang tertulis.
- Ada dua lapis pemeriksaan. Lapis pertama, `wajib(...)`, menentukan apakah peran boleh memanggil endpoint (401 tanpa sesi, 403 tanpa hak). Lapis kedua menyaring isi jawaban: kolom yang tidak boleh dilihat diganti `null` dan dicatat di `tertutup`, sehingga nilai aslinya tidak pernah dikirim ke browser.
- Peran dibaca ulang dari database pada setiap permintaan, jadi perubahan peran oleh admin langsung berlaku.
- Sesi: token acak 32 byte di cookie HttpOnly dan SameSite=Strict, berlaku 8 jam. Database hanya menyimpan hash SHA-256 token.
- Masuk: nama tak terdaftar dan kata sandi salah mendapat jawaban yang sama, dan lama prosesnya disamakan dengan memeriksa hash pengganti. Setelah 5 kali gagal dalam 15 menit, nama pengguna itu dikunci sementara (429). Penghitungnya disimpan di memori, jadi hilang saat server dimulai ulang.
- CSRF: cookie SameSite=Strict, ditambah penolakan permintaan pengubah data yang header `Origin`-nya dari situs lain.
- Header keamanan: Content-Security-Policy `default-src 'self'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`. Jawaban API memakai `Cache-Control: no-store`.
- Semua kueri SQL memakai parameter (`?`), tidak pernah menyambung teks masukan ke dalam SQL.

Peragaan di beranda (`/api/peragaan/buku-kas`) memakai fungsi penyaring yang sama dengan akun sungguhan, tetapi tanpa masuk. Ini sengaja dibuat untuk demo dengan data sintetis dan harus dimatikan (`MODE_PERAGAAN=mati`) pada pemasangan dengan data sungguhan.

Daftar endpoint dan hak aksesnya: [api.md](api.md).

## Enkripsi kolom (langkah 3)

```
MASTER_KEY (.env, di luar database)
   │ membungkus (AES-256-GCM)
   ▼
kunci_data: satu kunci 32 byte per donatur dan per mustahik (tersimpan terbungkus)
   │ mengenkripsi (AES-256-GCM, IV acak, AAD = "tabel.kolom")
   ▼
donatur.kontak, mustahik.nama, mustahik.alamat, mustahik.kondisi  →  "v1:<base64(iv|tag|ciphertext)>"
```

- Kode: [`src/server/keamanan/kripto.js`](../src/server/keamanan/kripto.js) (primitif) dan [`brankas.js`](../src/server/keamanan/brankas.js) (pengelola kunci data). Hanya memakai modul `crypto` bawaan Node.js.
- AAD berisi nama tabel dan kolom. Ciphertext alamat yang dipindah ke kolom nama akan gagal dibuka.
- Database menolak teks biasa di kolom terenkripsi lewat `CHECK (kolom LIKE 'v1:%')`. Kelalaian kode tidak bisa diam-diam menyimpan data asli.
- Dekripsi hanya untuk sel yang lolos RBAC. Buku kas untuk admin tidak mendekripsi apa pun, dan untuk bendahara hanya nama. Ini dibuktikan oleh tes.
- NIK tidak disimpan. Server menghitung HMAC-SHA256 dengan `NIK_HMAC_KEY`, menyimpannya di `nik_hmac` (unik), lalu membuang NIK. Pendaftaran NIK yang sama ditolak 409 tanpa menyebut wilayah tempat NIK itu terdaftar.
- Memusnahkan kunci data membuat ciphertext pemiliknya tidak bisa dibuka lagi. Ini dasar penghapusan di langkah 6.
- `PRAGMA secure_delete = ON`: isi yang dihapus ditimpa nol di berkas database.

Batasan yang perlu ditulis jujur di laporan:

- Server yang sedang berjalan memegang kunci master di memori. Enkripsi kolom melindungi berkas database dan cadangannya yang bocor, bukan server yang sudah dikuasai penyerang. Ini bukan E2EE.
- Kunci data terbungkus disimpan di database yang sama. Cadangan lama yang berisi kunci terbungkus masih bisa dibuka oleh siapa pun yang juga memegang kunci master. Pemusnahan kunci hanya berlaku untuk database yang sedang dipakai.
- Panjang ciphertext mengikuti panjang teks asli. Nama pendek menghasilkan ciphertext pendek.
- Nama donatur tidak dienkripsi, sesuai inventaris data (cukup RBAC). Ini bisa diubah bila tim menilai perlu.
- Bila `MASTER_KEY` kosong, server memakai kunci sementara di memori. Ini cukup untuk prototipe karena database dibuat ulang setiap server menyala. Pada pemasangan sungguhan, kunci wajib diisi dan sebaiknya disimpan di pengelola rahasia, bukan berkas `.env`.

## Audit log (langkah 4)

Tabel `audit_log` mencatat siapa (akun dan peran), kapan, aksi (baca, buat, ubah, ekspor, hapus, masuk, gagal masuk, keluar), jenis data, dan data siapa (nomor donatur, mustahik, atau akun).

- Hanya bisa ditambah. Dua trigger database menolak `UPDATE` dan `DELETE`, termasuk dari luar aplikasi. Aplikasi juga tidak punya endpoint untuk mengubah atau menghapus catatan.
- Tidak memuat data pribadi asli, dan hal ini dijamin oleh skema: semua kolom berupa angka atau pilihan tetap yang dibatasi `CHECK`, tanpa kolom teks bebas. Orang dirujuk lewat nomor. Tes juga mencari semua nama, alamat, kondisi, kontak, NIK, dan kata sandi sintetis di seluruh isi log.
- Membaca daftar dicatat per orang. Bendahara yang membuka buku kas menghasilkan satu catatan umum ditambah satu catatan untuk tiap mustahik yang namanya terlihat. Amil hanya menghasilkan catatan untuk mustahik di wilayahnya. Admin tidak menghasilkan catatan per orang karena tidak melihat identitas siapa pun. Dengan cara ini riwayat akses tiap pemilik data (langkah 6) bisa disusun dari log.
- Gagal masuk dicatat tanpa nama pengguna yang dicoba dan tanpa kata sandinya.
- Membaca audit log juga dicatat.
- Akses dari peragaan beranda dicatat dengan saluran `peragaan`, supaya bisa dibedakan dari akses akun sungguhan.
- Tidak memakai foreign key, sehingga catatan tetap ada setelah data orangnya dihapus. Nomor donatur, mustahik, dan akun memakai `AUTOINCREMENT`, jadi nomor lama tidak pernah berpindah ke orang lain.

Batasan: pemilik berkas database (misalnya admin server) tetap bisa menghapus berkasnya atau mematikan trigger dengan akses langsung ke SQLite. Trigger mencegah perubahan lewat aplikasi dan kelalaian, bukan penyerang yang menguasai server. Untuk itu diperlukan penyimpanan log terpisah atau rantai hash, dan ini di luar cakupan prototipe.

## Tampilan beranda (langkah 5)

- Buku kas peragaan: pengunjung memilih peran (Admin, Bendahara, Amil lapangan RW 01). Setiap pergantian memanggil `GET /api/peragaan/buku-kas`, jadi yang tergambar adalah jawaban server untuk peran itu. Sel yang ditutup tidak punya nilai di browser.
- Gerak yang dipakai, masing-masing dengan makna:
  - Tirai menutup sel dari kiri saat peran diganti dan tersibak ke kanan saat peran boleh melihat. Lebar bar dipertahankan supaya tabel tidak melompat.
  - Angka ringkasan berputar seperti penghitung mekanis saat nilainya muncul atau berubah.
  - Catatan audit log yang baru dibuat server meluncur masuk di panel "Catatan akses".
  - Bagian "Cara Tirai menjaga data": garis alur terisi mengikuti scroll, dan tiap tahap (minimisasi, enkripsi, RBAC, audit log) bergerak saat masuk layar.
- `prefers-reduced-motion`: `MotionGlobalConfig.skipAnimations` membuat semua animasi Motion langsung selesai, animasi teks acak langsung menampilkan hasil akhir, garis alur tampil penuh, dan transisi CSS dimatikan. Diperiksa otomatis dengan Playwright (tidak ada transform yang masih berjalan setelah peran diganti).
- Aksesibilitas: fokus keyboard terlihat (garis biru tinta 3px), tombol peran memakai `aria-pressed`, sel tertutup punya teks "ditutup untuk peran ini" untuk pembaca layar, semua target sentuh minimal 44px (diperiksa otomatis), tabel bisa digeser di layar sempit.
- Kontras warna teks terhadap putih, dihitung dengan rumus WCAG: tinta `#1C2630` sekitar 15:1, tinta lembut `#46525E` sekitar 8:1, hijau masjid `#0F5E4B` sekitar 7,7:1, biru tinta `#24408E` sekitar 9,5:1, merah garis `#B3372E` sekitar 6:1. Semuanya di atas 4,5:1.
- Content-Security-Policy `default-src 'self'` tetap berlaku: tidak ada skrip atau gaya dari luar, dan konsol browser bersih saat diuji.

Bukti: tangkapan layar dan video di `docs/bukti-uji/langkah-5-*`.

## Dasbor Data saya dan penghapusan (langkah 6)

Pemilik data (donatur dengan akun) membuka dasbor "Data saya":

- Data tersimpan: setiap field beserta alasan pengumpulan dan perlindungannya. Teks alasan diambil langsung dari [`inventaris.js`](../src/server/db/inventaris.js), sumber yang sama dengan tes minimisasi.
- Riwayat akses: disusun dari audit log. Pelaku hanya ditampilkan sebagai peran ("Bendahara membaca data Anda"), tanpa nama akun staf.
- Unduh: JSON dan CSV, berisi data, transaksi, dan riwayat akses. Ekspor dicatat di audit log. CSV menetralkan nilai yang diawali `=`, `+`, `-`, atau `@` supaya tidak dijalankan sebagai rumus oleh aplikasi lembar kerja.
- Hapus: pemilik mengajukan permintaan, admin memprosesnya. Paling banyak satu permintaan yang menunggu untuk tiap orang (dijaga indeks unik parsial).

Mustahik yang tidak punya akun menjalankan hak yang sama lewat amil wilayahnya: amil bisa mengunduh data penerima di wilayahnya dan mengajukan penghapusan atas nama penerima. Mustahik di wilayah lain dijawab 404, sehingga keberadaannya tidak terbaca. Semua tindakan ini tercatat di audit log.

Admin memproses permintaan tanpa melihat nama: orang ditampilkan sebagai nomor (`donatur #1`, `mustahik #2`).

Bila permintaan disetujui (usulan awal, perlu keputusan tim dan dosen):

| Data | Donatur | Mustahik |
| --- | --- | --- |
| Identitas (nama, kontak, alamat, kondisi) | baris donatur dihapus | kolom dikosongkan, baris ditandai `dianonimkan_pada` |
| Penanda NIK | tidak ada | dikosongkan |
| Kunci data | dimusnahkan | dimusnahkan |
| Akun dan sesi | dihapus | dihapus bila ada |
| Catatan keuangan | donasi tetap ada sebagai donasi tanpa nama | penyaluran tetap ada dengan asnaf dan wilayah |
| Audit log | tetap ada (isinya hanya nomor) | tetap ada |

Alasan mustahik dianonimkan, bukan dihapus barisnya: laporan penyaluran zakat per asnaf tetap bisa disusun setelah identitas penerima dihapus. Database menjaga keadaan ini dengan `CHECK`: baris yang dianonimkan wajib tidak punya identitas sama sekali, dan baris aktif wajib punya nama, alamat, dan kunci.

Dasbor peran lain:

- Bendahara: ringkasan dana (angka berputar ke nilai baru setelah mencatat), formulir catat donasi dan penyaluran, buku kas, donasi terbaru.
- Amil: daftar penerima di wilayahnya dengan tombol unduh dan ajukan hapus, formulir pendaftaran penerima baru (NIK hanya untuk penanda), buku kas.
- Admin: ringkasan, permintaan hapus, akun dan peran, audit log, buku kas ringkas.

Setiap aksi memunculkan konfirmasi singkat di bawah layar (`role="status"`), dan aksi yang tidak bisa dibatalkan (hapus) meminta konfirmasi dua langkah.

## Persetujuan (langkah 7)

Tabel `persetujuan` menyimpan izin donatur per tujuan. Donatur melihat dan mengubahnya di dasbor Data saya. Setiap tujuan punya akibat nyata di aplikasi, bukan sekadar catatan:

| Tujuan | Bila diberikan | Bila dicabut |
| --- | --- | --- |
| `kontak_bukti`: simpan kontak untuk bukti donasi | Donatur bisa mengisi kontak (disimpan terenkripsi) | Kontak langsung dihapus dari database; mengisi kontak ditolak |
| `nama_di_catatan`: tampilkan nama di catatan donasi bendahara | Bendahara melihat nama pada catatan donasi | Nama tidak dikirim ke bendahara (donasi tampil tanpa nama), donatur hilang dari pilihan saat mencatat donasi baru, dan membaca catatan donasi tidak lagi tercatat sebagai akses atas data donatur itu |

- Perubahan izin dicatat di audit log (`ubah persetujuan`), dan penghapusan kontak akibat pencabutan dicatat terpisah (`hapus donatur`).
- `diubah_pada` menjadi bukti kapan izin terakhir diubah. Status izin ikut dalam berkas ekspor.
- Nominal donasi tetap tercatat apa pun status izinnya, karena dibutuhkan untuk pembukuan.
- Data sintetis memuat satu donatur yang mencabut izin nama, supaya akibatnya terlihat di dasbor bendahara.

Batasan dan hal terbuka:

- Persetujuan baru dibuat untuk donatur. Data mustahik dikumpulkan untuk menyalurkan bantuan, dan dasar pemrosesannya (persetujuan atau kewajiban lain) perlu dibahas tim dan dosen. Pasal UU No. 27 Tahun 2022 yang relevan perlu dicek ke naskah aslinya sebelum dikutip [VERIFIKASI].
- Analogi QS. An-Nur: 27 (meminta izin sebelum masuk) di CLAUDE.md hanya analogi, bukan dalil langsung [VERIFIKASI].

## E2EE terbatas: catatan pribadi (langkah 8)

Aplikasi ini secara keseluruhan bukan E2EE: server perlu membaca data untuk menyaring akses menurut peran (RBAC). Satu fitur dibuat E2EE terbatas, yaitu catatan pribadi donatur (misalnya perhitungan zakat mal, yang memuat rincian harta).

```
Browser donatur                                     Server
kata sandi catatan --PBKDF2-SHA256, 600.000 iterasi--> kunci AES-256 (tidak bisa diekspor)
teks catatan --AES-256-GCM, IV acak--> ciphertext  --PUT /api/data-saya/catatan-->  disimpan apa adanya
```

- Kode: [`src/web/lib/catatan-e2ee.js`](../src/web/lib/catatan-e2ee.js), memakai Web Crypto API bawaan browser.
- Kata sandi catatan terpisah dari kata sandi masuk dan tidak pernah dikirim ke server. Server menyimpan isi terenkripsi, IV, salt, dan jumlah iterasi. Tidak ada kode di server yang bisa membukanya.
- Dibuktikan dua cara: tes otomatis memakai modul browser yang sama di Node.js, dan pemeriksaan Playwright yang menangkap badan permintaan di browser. Keduanya tidak menemukan teks catatan maupun kata sandi catatan.
- Catatan ikut dalam berkas ekspor dalam bentuk terenkripsi, dan ikut terhapus bila data donatur dihapus.
- Angka 600.000 iterasi mengikuti OWASP Password Storage Cheat Sheet untuk PBKDF2-HMAC-SHA256. Cek ulang ke sumbernya sebelum dikutip.

Batasan yang perlu ditulis jujur di laporan:

- Kode JavaScript pengenkripsi dikirim oleh server yang sama. Server yang dikuasai penyerang bisa mengirim kode yang mencuri kata sandi catatan. Inilah alasan disebut E2EE terbatas.
- Server tetap tahu kapan catatan disimpan, siapa pemiliknya, dan kira-kira berapa panjangnya.
- Kekuatannya bergantung pada kata sandi catatan. Batas minimal 8 karakter hanya diperiksa di browser.
- Kata sandi catatan yang lupa tidak bisa dipulihkan oleh siapa pun.
- Web Crypto hanya tersedia di konteks aman (HTTPS atau localhost).

