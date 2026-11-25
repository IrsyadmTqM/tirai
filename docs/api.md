# Dokumentasi API Tirai

Semua endpoint ada di bawah `/api`, menerima dan menjawab JSON. Sesi memakai cookie `tirai_sesi` (HttpOnly, SameSite=Strict, Secure di produksi) yang dipasang oleh `POST /api/masuk`.

Kode jawaban umum:

| Kode | Arti |
| --- | --- |
| 200, 201, 204 | Berhasil |
| 400 | Masukan tidak valid. Pesan ada di `error` |
| 401 | Belum masuk atau sesi kedaluwarsa |
| 403 | Peran tidak punya hak, atau permintaan dari situs lain |
| 404 | Tidak ditemukan |
| 422 | Masukan valid tetapi melanggar aturan (misalnya saldo tidak cukup) |
| 429 | Terlalu banyak percobaan masuk |

Semua jawaban API memakai `Cache-Control: no-store`. Permintaan pengubah data (POST, PATCH, DELETE) dengan header `Origin` dari situs lain ditolak 403.

## Hak akses per endpoint

Diuji otomatis di `tests/rbac.test.js` (daftar di `tests/matriks-rbac.js`).

| Endpoint | Admin | Bendahara | Amil | Pemilik data |
| --- | --- | --- | --- | --- |
| `GET /api/buku-kas` | ringkas | ya | wilayahnya | tidak |
| `GET /api/ringkasan` | ya | ya | tidak | tidak |
| `GET /api/donatur` | tidak | nama saja | tidak | tidak |
| `GET /api/donasi` | tidak | ya | tidak | tidak |
| `POST /api/donasi` | tidak | ya | tidak | tidak |
| `POST /api/penyaluran` | tidak | ya | tidak | tidak |
| `GET /api/mustahik` | tidak | tanpa alamat dan kondisi | wilayahnya | tidak |
| `POST /api/mustahik` | tidak | tidak | di wilayahnya | tidak |
| `GET /api/pengguna` | ya | tidak | tidak | tidak |
| `GET /api/wilayah` | ya | tidak | tidak | tidak |
| `PATCH /api/pengguna/:id` | ya | tidak | tidak | tidak |
| `GET /api/audit` | ya | tidak | tidak | tidak |

## Autentikasi

### `POST /api/masuk`

Badan: `{ "nama_pengguna": "bendahara", "kata_sandi": "tirai-demo" }`

Jawaban 200: `{ "pengguna": { "id", "nama_pengguna", "peran", "nama_peran", "wilayah" } }` dan cookie sesi. Gagal: 401 dengan pesan yang sama untuk nama tak terdaftar dan kata sandi salah. Setelah 5 kali gagal untuk satu nama pengguna dalam 15 menit: 429.

### `POST /api/keluar`

Menghapus sesi di server dan cookie. Jawaban 204.

### `GET /api/saya`

Jawaban: `{ "pengguna": {...} }` atau `{ "pengguna": null }` bila belum masuk.

## Buku kas dan keuangan

### `GET /api/buku-kas`

Buku kas penyaluran yang sudah disaring menurut peran.

```json
{
  "peran": "amil",
  "wilayah": { "id": 1, "nama": "RW 01" },
  "kolom": ["tanggal", "wilayah", "nama", "asnaf", "alamat", "kondisi", "jenis_dana", "nominal"],
  "baris": [
    { "id": 1, "tanggal": "2026-03-18", "wilayah": "RW 01", "nama": "Sumarni", "asnaf": "fakir",
      "alamat": "Jl. Kenanga No. 12, ...", "kondisi": "Lansia, ...", "jenis_dana": "zakat_fitrah",
      "nominal": null, "tertutup": ["nominal"] }
  ],
  "ringkasan": null
}
```

Kolom yang tercantum di `tertutup` bernilai `null`: server tidak mengirim nilai aslinya. Admin dan bendahara juga mendapat `ringkasan` (lihat di bawah).

### `GET /api/ringkasan`

`{ "perJenis": [{ "jenis", "masuk", "keluar", "saldo" }], "total": { "masuk", "keluar", "saldo" } }`. Nominal dalam rupiah.

### `GET /api/donatur`

`{ "donatur": [{ "id", "nama" }] }`. Tanpa kontak.

### `GET /api/donasi`

`{ "donasi": [{ "id", "tanggal", "jenis", "nominal", "donatur" }] }`. `donatur` bernilai `null` untuk donasi tanpa nama.

### `POST /api/donasi`

Badan: `{ "donatur_id": 1 | null, "jenis": "zakat_fitrah|zakat_mal|infak|sedekah|wakaf", "nominal": 50000, "tanggal": "2026-11-20" }`. Nominal bilangan bulat positif. Tanggal tidak boleh di masa depan. Jawaban 201: `{ "id" }`.

### `POST /api/penyaluran`

Badan: `{ "mustahik_id": 1, "jenis_dana": "zakat_fitrah|zakat_mal|infak|sedekah", "nominal": 150000, "tanggal": "2026-11-20" }`. Ditolak 422 bila melebihi saldo jenis dana itu. Jawaban 201: `{ "id" }`.

## Orang dan akun

### `GET /api/mustahik`

Amil: `{ "mustahik": [{ "id", "nama", "alamat", "kondisi", "asnaf", "wilayah_id", "wilayah" }] }`, hanya wilayahnya. Bendahara: `{ "mustahik": [{ "id", "nama", "asnaf", "wilayah" }] }`.

### `POST /api/mustahik`

Hanya amil, untuk wilayahnya sendiri. Badan: `{ "nama", "alamat", "kondisi" (opsional), "asnaf", "nik" }`. NIK harus 16 angka. NIK tidak disimpan: server hanya menyimpan HMAC-nya. Nama, alamat, dan kondisi disimpan terenkripsi. Jawaban 201: `{ "id" }`. NIK yang sudah terdaftar: 409.

### `GET /api/pengguna`

`{ "pengguna": [{ "id", "nama_pengguna", "peran", "wilayah_id", "wilayah" }] }`.

### `GET /api/wilayah`

`{ "wilayah": [{ "id", "nama" }] }`.

### `PATCH /api/pengguna/:id`

Badan: `{ "peran": "admin|bendahara|amil", "wilayah_id": 2 }` (`wilayah_id` wajib untuk amil). Hanya untuk akun staf, dan admin tidak bisa mengubah perannya sendiri. Perubahan berlaku pada permintaan berikutnya, termasuk sesi yang sedang berjalan.

## Audit log

### `GET /api/audit?batas=200`

Hanya admin. Catatan terbaru di atas, `batas` 1 sampai 500.

```json
{ "log": [ { "id": 41, "waktu": "2026-11-25T10:00:00.000Z", "pelaku": "bendahara", "peran": "bendahara",
             "aksi": "baca", "objek": "mustahik", "subjek": { "jenis": "mustahik", "id": 3 }, "saluran": "aplikasi" } ] }
```

Membaca audit log juga dicatat. Tidak ada endpoint untuk mengubah atau menghapus catatan.

Endpoint yang mencatat ke audit log: masuk (berhasil dan gagal), keluar, `GET /api/buku-kas`, `GET /api/donatur`, `GET /api/donasi`, `GET /api/mustahik`, `GET /api/pengguna`, `GET /api/audit`, semua endpoint pengubah data, dan peragaan beranda.

## Peragaan beranda

### `GET /api/peragaan/buku-kas?peran=admin|bendahara|amil`

Tanpa masuk. Menjawab buku kas persis seperti `GET /api/buku-kas` untuk akun demo peran itu (amil: RW 01), ditambah `"peragaan": true` dan `"log"`: catatan audit log yang baru dibuat oleh akses ini (saluran `peragaan`). Hanya untuk data sintetis. Dimatikan dengan `MODE_PERAGAAN=mati`, setelah itu menjawab 404.
