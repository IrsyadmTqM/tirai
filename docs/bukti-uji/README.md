# Bukti uji

Semua angka di bawah berasal dari log yang tersimpan di folder ini. Log terakhir: [`langkah-8-tes.log`](langkah-8-tes.log) (`npm test`, 10 berkas tes, 264 lulus, 0 gagal).

Tabel mengikuti bagian "Pengujian dan bukti" di CLAUDE.md.

| Yang diuji | Cara | Hasil apa adanya | Bukti |
| --- | --- | --- | --- |
| Enkripsi di penyimpanan | Membaca tabel langsung dari berkas database (`npm run db:lihat`), dan tes yang membaca seluruh byte berkas `.db` di disk | Nama, alamat, kondisi mustahik dan kontak donatur berupa `v1:...` (ciphertext). Teks aslinya tidak ditemukan di berkas. Nama donatur memang tidak dienkripsi (hanya RBAC, sesuai inventaris) | [`langkah-3-isi-database.txt`](langkah-3-isi-database.txt), `tests/enkripsi.test.js` |
| RBAC | Tes otomatis setiap kondisi (tanpa sesi, admin, bendahara, amil, pemilik data) terhadap setiap endpoint yang dilindungi | 26 endpoint x 5 kondisi = 130 kasus: 26 harapan 401, 74 harapan 403, 30 harapan diizinkan. 130 lulus, 0 gagal. Ditambah tes yang mencari teks asli data sintetis di seluruh jawaban server per peran | `tests/rbac.test.js`, `tests/matriks-rbac.js`, `tests/penyaringan.test.js`, [`langkah-8-tes.log`](langkah-8-tes.log) |
| Audit log | Menjalankan aksi sensitif lalu membaca tabel `audit_log` | Setiap aksi tercatat (masuk, gagal masuk, baca per orang, buat, ubah, ekspor, hapus). UPDATE dan DELETE ditolak trigger. Tidak ada nama, alamat, kondisi, kontak, NIK, atau kata sandi sintetis di seluruh isi log | `tests/audit.test.js`, [`langkah-4-dasbor-admin.png`](langkah-4-dasbor-admin.png) |
| Ekspor dan hapus | Ekspor JSON/CSV, lalu hapus akun uji lewat permintaan yang disetujui admin | Berkas ekspor memuat data, transaksi, persetujuan, catatan terenkripsi, dan riwayat akses. Setelah dihapus: baris donatur, akun, sesi, dan kunci data hilang; ciphertext lama gagal dibuka; catatan keuangan tetap ada tanpa identitas | `tests/data-saya.test.js`, [`langkah-6-contoh-ekspor.json`](langkah-6-contoh-ekspor.json), [`langkah-6-dasbor-admin.png`](langkah-6-dasbor-admin.png) |
| Keamanan web dasar | Tes otomatis dan pemeriksaan di browser | SQL injection lewat formulir masuk tidak membuka akses (semua kueri memakai parameter). Isian berisi skrip dikembalikan sebagai teks JSON dan tidak dijalankan di browser. Permintaan pengubah data dari situs lain ditolak 403. Header CSP, X-Frame-Options, nosniff terpasang. **OWASP ZAP belum dijalankan**; ini tugas tim berikutnya | `tests/autentikasi.test.js`, [`langkah-8-cek-xss-browser.txt`](langkah-8-cek-xss-browser.txt) |
| Minimisasi | Daftar field per jenis data | Setiap kolom di setiap tabel punya alasan tertulis. Tes gagal bila ada kolom tanpa alasan (diuji dengan sengaja menambah kolom `tanggal_lahir`: tes gagal). Tidak ada kolom untuk foto KTP, GPS, daftar kontak, atau NIK utuh | [`../inventaris-data.md`](../inventaris-data.md), `tests/database.test.js` |
| E2EE terbatas | Menangkap badan permintaan di browser dan membaca tabel di disk | Badan permintaan dan isi tabel tidak memuat teks catatan maupun kata sandi catatan. Kata sandi salah ditolak, kata sandi benar membuka isi yang sama | `tests/catatan-e2ee.test.js`, [`langkah-8-catatan-pribadi.png`](langkah-8-catatan-pribadi.png) |
| Tampilan | Playwright: reduced-motion, keyboard, target sentuh, konsol | Tidak ada animasi yang berjalan saat reduced-motion; tombol peran bisa dipakai dengan keyboard; tidak ada target sentuh di bawah 44px; konsol bersih | [`langkah-5-gerak.mp4`](langkah-5-gerak.mp4), tangkapan layar `langkah-5-*` |

Uji mutasi (memastikan tes bisa gagal), dijalankan selama pengerjaan:

- Langkah 1: menambah kolom tanpa alasan membuat 1 tes minimisasi gagal.
- Langkah 2: membuka alamat untuk bendahara dan melepas pemeriksaan hak `GET /api/donasi` membuat 6 tes gagal.

Skrip pemeriksaan di browser ada di [`scripts/bukti-browser/`](../../scripts/bukti-browser/).
