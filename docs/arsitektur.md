# Arsitektur Tirai

Dokumen ini diperbarui setiap langkah selesai. Bagian yang belum dibangun ditandai "rencana".

## Komponen

| Komponen | Teknologi | Peran |
| --- | --- | --- |
| Tampilan | React + Vite, Motion | Antarmuka pengguna. Tidak pernah dipercaya untuk keputusan akses |
| Server | Node.js + Express | API, pemeriksaan RBAC, enkripsi dan dekripsi kolom, pencatatan audit log |
| Database | SQLite | Penyimpanan. Kolom sensitif disimpan sebagai ciphertext (rencana) |
| Kunci | Variabel lingkungan (`.env`), di luar database | Kunci master dan kunci HMAC NIK (rencana) |

Pada mode produksi, Express juga menyajikan hasil build React dari folder `dist/`, sehingga aplikasi cukup dijalankan sebagai satu proses.

## Prinsip

- Semua keputusan akses diambil di server. Tampilan hanya menampilkan apa yang dikirim server.
- Data yang tidak boleh dilihat suatu peran tidak dikirim ke browser sama sekali, bukan sekadar disembunyikan dengan CSS.

## Rencana lanjutan

- Envelope encryption: tiap pemilik data punya kunci data sendiri yang dibungkus kunci master. Penghapusan data pribadi dapat dilakukan dengan memusnahkan kunci data (crypto-shredding), sementara catatan keuangan tetap tersimpan tanpa identitas. Usulan ini perlu keputusan tim dan dosen.
- Audit log append-only, dikunci juga di level database dengan trigger yang menolak UPDATE dan DELETE.
