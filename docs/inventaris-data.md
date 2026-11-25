# Inventaris data Tirai

Berkas ini dibuat otomatis oleh `npm run docs:inventaris` dari
`src/server/db/inventaris.js`. Jangan diedit langsung.

Setiap kolom di database punya alasan tertulis. Tes otomatis
(`tests/database.test.js`) gagal bila ada kolom tanpa alasan.
Kolom perlindungan berisi rancangan akhir: RBAC aktif mulai langkah 2,
enkripsi kolom mulai langkah 3.

## wilayah

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `id` | Penanda baris | - |
| `nama` | Membagi tugas amil lapangan per wilayah (misalnya RW) | - |

## kunci_data

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `id` | Penanda baris | - |
| `kunci_terbungkus` | Kunci data milik satu pemilik data, untuk membuka kolom terenkripsinya | Dibungkus AES-256-GCM dengan kunci master yang disimpan di luar database |
| `dibuat_pada` | Dasar rotasi kunci | - |

## donatur

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `id` | Penanda baris | - |
| `nama` | Bukti donasi atas nama donatur | RBAC |
| `kontak` | Opsional: mengirim bukti donasi bila donatur memintanya | Enkripsi kolom, RBAC |
| `kunci_id` | Menunjuk kunci data milik donatur ini | Tidak dikirim ke browser |
| `dibuat_pada` | Dasar menghitung masa simpan data | RBAC |

## mustahik

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `id` | Penanda baris | - |
| `nama` | Menyalurkan bantuan kepada orang yang tepat | Enkripsi kolom, RBAC wilayah |
| `alamat` | Verifikasi dan pengantaran bantuan oleh amil wilayah | Enkripsi kolom, hanya amil wilayahnya |
| `kondisi` | Catatan singkat alasan penyaluran | Enkripsi kolom, hanya amil wilayahnya |
| `asnaf` | Menentukan hak penerima menurut kategori asnaf | RBAC |
| `wilayah_id` | Membatasi akses amil hanya pada wilayahnya | RBAC |
| `nik_hmac` | Mencegah penerima ganda tanpa menyimpan NIK utuh | HMAC berkunci, NIK asli tidak disimpan |
| `kunci_id` | Menunjuk kunci data milik mustahik ini | Tidak dikirim ke browser |
| `dibuat_pada` | Dasar menghitung masa simpan data | RBAC |

## pengguna

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `id` | Penanda baris | - |
| `nama_pengguna` | Identitas untuk masuk | RBAC |
| `kata_sandi_hash` | Memeriksa kata sandi saat masuk | Hash scrypt dengan salt, kata sandi asli tidak disimpan |
| `peran` | Menentukan hak akses (RBAC) | Hanya admin yang mengubah |
| `wilayah_id` | Wilayah tugas amil lapangan | Hanya admin yang mengubah |
| `donatur_id` | Menautkan akun pemilik data ke data donaturnya | RBAC |
| `mustahik_id` | Menautkan akun pemilik data ke data mustahiknya, bila mustahik punya akun | RBAC |
| `dibuat_pada` | Dasar menghitung masa simpan data | RBAC |

## sesi

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `token_hash` | Mengenali pengguna yang sudah masuk | Hanya hash SHA-256, token asli hanya di cookie HttpOnly |
| `pengguna_id` | Pemilik sesi | Tidak dikirim ke browser |
| `kedaluwarsa_pada` | Sesi berakhir otomatis setelah 8 jam | - |

## audit_log

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `id` | Penanda baris dan urutan catatan | Hanya bisa ditambah |
| `waktu` | Kapan akses terjadi | Hanya bisa ditambah |
| `pengguna_id` | Siapa yang mengakses (akun staf atau pemilik data) | Hanya admin yang melihat; pemilik data hanya melihat perannya |
| `peran` | Peran pelaku saat akses, untuk riwayat akses pemilik data | Hanya bisa ditambah |
| `aksi` | Jenis aksi: baca, buat, ubah, ekspor, hapus, masuk | Pilihan tetap, bukan teks bebas |
| `objek` | Jenis data yang diakses | Pilihan tetap, bukan teks bebas |
| `subjek_jenis` | Data siapa yang diakses: donatur, mustahik, atau akun | Pilihan tetap |
| `subjek_id` | Nomor orang yang datanya diakses, tanpa nama | Nomor saja, bukan data pribadi asli |
| `saluran` | Membedakan akses dari aplikasi dan dari peragaan beranda | Pilihan tetap |

## donasi

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `id` | Penanda baris | - |
| `donatur_id` | Menautkan donasi ke donatur. Kosong bila donatur memilih tanpa nama | RBAC |
| `jenis` | Pembukuan per jenis dana ZISWAF | RBAC |
| `nominal` | Pembukuan dan laporan keuangan | RBAC |
| `tanggal` | Pembukuan dan laporan keuangan | RBAC |
| `dicatat_oleh` | Akuntabilitas: siapa yang mencatat transaksi | RBAC |
| `dibuat_pada` | Dasar menghitung masa simpan data | RBAC |

## penyaluran

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `id` | Penanda baris | - |
| `mustahik_id` | Menautkan penyaluran ke penerima | RBAC |
| `jenis_dana` | Pembukuan per jenis dana ZISWAF | RBAC |
| `nominal` | Pembukuan dan laporan keuangan | RBAC |
| `tanggal` | Pembukuan dan laporan keuangan | RBAC |
| `dicatat_oleh` | Akuntabilitas: siapa yang mencatat transaksi | RBAC |
| `dibuat_pada` | Dasar menghitung masa simpan data | RBAC |

## Tidak dikumpulkan

| Data | Alasan |
| --- | --- |
| NIK utuh | Cukup penanda duplikat berupa HMAC |
| Foto KTP | Tidak ada kebutuhan |
| Lokasi GPS | Tidak ada kebutuhan |
| Daftar kontak telepon | Tidak ada kebutuhan |
