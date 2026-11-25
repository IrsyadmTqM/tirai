# Tirai

Aplikasi web pengelolaan ZISWAF (zakat, infak, sedekah, wakaf) untuk satu masjid atau lembaga amil, dirancang dengan prinsip privacy-first: kumpulkan data seperlunya, kunci yang sensitif, batasi akses menurut peran, catat setiap akses, dan beri pemilik data kendali atas datanya.

Tugas besar mata kuliah ICT dan Islam, Topik D: Perancangan Aplikasi Privacy-First Berbasis Prinsip Digital Amanah.

> Semua data di repositori ini sintetis. Tidak ada data jamaah atau mustahik sungguhan.

## Status

Langkah 6 (dasbor Data saya dan dasbor tiap peran) selesai. Fitur dikerjakan bertahap, lihat [Rencana](#rencana).

## Kebutuhan

- Node.js 22.13 atau lebih baru (memakai modul `node:sqlite` bawaan)
- npm

## Instalasi

```bash
git clone <url-repositori>
cd tirai
npm install
cp .env.example .env
```

Isi `MASTER_KEY` dan `NIK_HMAC_KEY` di `.env` dengan dua kunci acak yang berbeda. Jalankan perintah ini dua kali, sekali untuk tiap kunci:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Kalau dibiarkan kosong, server tetap berjalan dengan kunci sementara di memori (cukup untuk mencoba, karena database dibuat ulang setiap server menyala).

## Menjalankan

Mode pengembangan (server di port 3000, tampilan di port 5173 dengan muat ulang otomatis):

```bash
npm run dev
```

Buka http://localhost:5173.

Mode produksi (satu server menyajikan API dan tampilan):

```bash
npm run build
npm start
```

Buka http://localhost:3000.

Menjalankan tes:

```bash
npm test
```

## Database dan data sintetis

Setiap server menyala, database `data/tirai.db` dihapus lalu dibuat ulang dengan skema dan data sintetis. Perubahan dari aplikasi hilang saat server dimulai ulang. Lokasi berkas bisa diganti lewat `DB_PATH` di `.env`.

Membuat ulang database tanpa menjalankan server:

```bash
npm run db:reset
```

Melihat isi mentah setiap tabel langsung dari berkas database:

```bash
npm run db:lihat
```

Memperbarui [docs/inventaris-data.md](docs/inventaris-data.md) setelah mengubah `src/server/db/inventaris.js`:

```bash
npm run docs:inventaris
```

Akun demo (semua data sintetis, kata sandi semua akun: `tirai-demo`). Masuk lewat halaman `/masuk`.

| Nama pengguna | Peran |
| --- | --- |
| `admin` | Admin |
| `bendahara` | Bendahara |
| `amil-rw01` | Amil lapangan RW 01 |
| `amil-rw02` | Amil lapangan RW 02 |
| `donatur-01` | Pemilik data (donatur Ahmad Fauzi) |
| `donatur-02` | Pemilik data (donatur Siti Rahmawati) |

## Arsitektur singkat

```
Browser (React)  --HTTPS-->  Express (API, RBAC, enkripsi, audit log)  -->  SQLite
```

- `src/web/`: tampilan React (Vite).
- `src/server/`: server Express.
- `src/server/db/`: skema SQLite, inventaris data (alasan tiap kolom), data sintetis.
- `src/server/keamanan/`: hash kata sandi, sesi, kebijakan RBAC, middleware keamanan.
- `src/server/rute/`: endpoint API.
- `src/bersama/`: label yang dipakai server dan tampilan.
- `scripts/`: perintah bantu untuk database dan dokumentasi.
- `tests/`: tes otomatis (Vitest + Supertest).
- `docs/`: arsitektur, dokumentasi API, pernyataan penggunaan AI, bukti uji.

Penjelasan lengkap ada di [docs/arsitektur.md](docs/arsitektur.md). Daftar endpoint dan hak aksesnya ada di [docs/api.md](docs/api.md).

## Mode peragaan

Beranda menampilkan buku kas peragaan: pengunjung memilih peran dan melihat data persis seperti yang dikirim server untuk peran itu, tanpa masuk. Mode ini hanya pantas untuk data sintetis. Untuk pemasangan dengan data sungguhan, matikan dengan `MODE_PERAGAAN=mati` di `.env`.

## Rencana

0. Kerangka proyek (selesai)
1. Skema database dan data sintetis (selesai)
2. Login dan RBAC (selesai)
3. Enkripsi kolom (AES-256-GCM, envelope encryption) (selesai)
4. Audit log append-only (selesai)
5. Beranda buku kas interaktif (selesai)
6. Dasbor "Data saya": lihat, riwayat akses, ekspor, hapus (selesai)
7. Consent
8. E2EE terbatas (opsional)

## Lisensi

MIT
