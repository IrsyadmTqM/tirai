# Skrip pemeriksaan di browser

Skrip Playwright yang dipakai untuk menghasilkan tangkapan layar dan pemeriksaan di `docs/bukti-uji/`. Skrip ini tidak termasuk `npm test` karena butuh Chromium.

Cara menjalankan:

1. Pasang Playwright sekali: `npm install --no-save playwright` lalu `npx playwright install chromium`.
2. Jalankan aplikasi mode produksi: `npm run build` lalu `npm start`.
3. Di terminal lain, jalankan satu skrip dengan folder keluaran sebagai argumen, misalnya `node scripts/bukti-browser/cek-xss.cjs /tmp/bukti`.

| Skrip | Yang diperiksa |
| --- | --- |
| `tangkap-beranda.cjs` | Beranda per peran (desktop dan ponsel), konsol bersih |
| `cek-gerak-aksesibilitas.cjs` | Tanpa animasi saat reduced-motion, fokus keyboard, target sentuh minimal 44px, video peragaan |
| `alur-dasbor.cjs` | Alur bendahara, pemilik data (unduh, ajukan hapus), amil, admin (setujui) |
| `alur-persetujuan.cjs` | Mencabut dan memberi izin, akibatnya pada kontak |
| `alur-catatan-e2ee.cjs` | Badan permintaan dan isi database hanya ciphertext; kata sandi salah ditolak |
| `cek-xss.cjs` | Isian berisi skrip tidak dijalankan di dasbor amil |

Database dibuat ulang setiap server menyala, jadi jalankan ulang server sebelum mengulang skrip alur.
