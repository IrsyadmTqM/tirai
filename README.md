# Tirai

Aplikasi web pengelolaan ZISWAF (zakat, infak, sedekah, wakaf) untuk satu masjid atau lembaga amil, dirancang dengan prinsip privacy-first: kumpulkan data seperlunya, kunci yang sensitif, batasi akses menurut peran, catat setiap akses, dan beri pemilik data kendali atas datanya.

Tugas besar mata kuliah ICT dan Islam, Topik D: Perancangan Aplikasi Privacy-First Berbasis Prinsip Digital Amanah.

> Semua data di repositori ini sintetis. Tidak ada data jamaah atau mustahik sungguhan.

## Status

Langkah 0 (kerangka proyek) selesai. Fitur dikerjakan bertahap, lihat [Rencana](#rencana).

## Kebutuhan

- Node.js 22 atau lebih baru
- npm

## Instalasi

```bash
git clone <url-repositori>
cd tirai
npm install
cp .env.example .env
```

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

## Arsitektur singkat

```
Browser (React)  --HTTPS-->  Express (API, RBAC, enkripsi, audit log)  -->  SQLite
```

- `src/web/`: tampilan React (Vite).
- `src/server/`: server Express.
- `tests/`: tes otomatis (Vitest + Supertest).
- `docs/`: arsitektur, dokumentasi API, pernyataan penggunaan AI, bukti uji.

Penjelasan lengkap ada di [docs/arsitektur.md](docs/arsitektur.md).

## Rencana

0. Kerangka proyek (selesai)
1. Skema database dan data sintetis
2. Login dan RBAC
3. Enkripsi kolom (AES-256-GCM, envelope encryption)
4. Audit log append-only
5. Beranda buku kas interaktif
6. Dasbor "Data saya": lihat, riwayat akses, ekspor, hapus
7. Consent
8. E2EE terbatas (opsional)

## Lisensi

MIT
