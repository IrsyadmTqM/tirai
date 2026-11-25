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

## donatur

| Kolom | Alasan | Perlindungan |
| --- | --- | --- |
| `id` | Penanda baris | - |
| `nama` | Bukti donasi atas nama donatur | RBAC |
| `kontak` | Opsional: mengirim bukti donasi bila donatur memintanya | Enkripsi kolom, RBAC |
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
