// Data sintetis untuk prototipe Tirai.
// SEMUA DATA DI SINI FIKTIF. Nama, alamat, dan kondisi dikarang untuk demo,
// tidak diambil dari jamaah atau mustahik sungguhan. Kontak memakai domain
// .test yang dicadangkan dan tidak pernah dipakai sebagai alamat nyata.
//
// Data ditulis tetap (bukan acak) supaya demo dan tes selalu sama.

// Kata sandi semua akun demo. Ini bukan rahasia: akun dan datanya sintetis,
// dan database dibuat ulang setiap server menyala.
export const KATA_SANDI_DEMO = 'tirai-demo';

// Waktu pembuatan untuk data master (donatur, mustahik, akun).
export const AWAL_DATA = '2026-03-01T02:00:00.000Z';

export const WILAYAH = [
  { id: 1, nama: 'RW 01' },
  { id: 2, nama: 'RW 02' },
  { id: 3, nama: 'RW 03' },
];

export const DONATUR = [
  { id: 1, nama: 'Ahmad Fauzi', kontak: 'ahmad.fauzi@contoh.test' },
  { id: 2, nama: 'Siti Rahmawati', kontak: 'siti.r@contoh.test' },
  { id: 3, nama: 'Budi Santoso', kontak: null },
  { id: 4, nama: 'Nur Aini', kontak: 'nuraini@contoh.test' },
  { id: 5, nama: 'Hendra Wijaya', kontak: null },
  { id: 6, nama: 'Rina Marlina', kontak: 'rina.m@contoh.test' },
  { id: 7, nama: 'Dedi Kurniawan', kontak: 'dedi.k@contoh.test' },
  { id: 8, nama: 'Laila Hasanah', kontak: null },
];

export const MUSTAHIK = [
  // RW 01
  {
    id: 1, nama: 'Sumarni', wilayah_id: 1, asnaf: 'fakir',
    alamat: 'Jl. Kenanga No. 12, RT 02/RW 01, Kel. Sukamaju',
    kondisi: 'Lansia, tinggal sendiri, tanpa penghasilan tetap',
  },
  {
    id: 2, nama: 'Ujang Supriatna', wilayah_id: 1, asnaf: 'miskin',
    alamat: 'Gg. Melati No. 5, RT 04/RW 01, Kel. Sukamaju',
    kondisi: 'Buruh harian lepas, tiga anak usia sekolah',
  },
  {
    id: 3, nama: 'Wartini', wilayah_id: 1, asnaf: 'gharim',
    alamat: 'Jl. Kenanga No. 31, RT 01/RW 01, Kel. Sukamaju',
    kondisi: 'Berutang untuk biaya berobat suami',
  },
  // RW 02
  {
    id: 4, nama: 'Asep Saepudin', wilayah_id: 2, asnaf: 'miskin',
    alamat: 'Jl. Flamboyan No. 8, RT 03/RW 02, Kel. Sukamaju',
    kondisi: 'Pascaoperasi, belum bisa bekerja',
  },
  {
    id: 5, nama: 'Juwariyah', wilayah_id: 2, asnaf: 'fakir',
    alamat: 'Gg. Anggrek No. 2, RT 01/RW 02, Kel. Sukamaju',
    kondisi: 'Janda, merawat cucu yatim',
  },
  {
    id: 6, nama: 'Kevin Pratama', wilayah_id: 2, asnaf: 'mualaf',
    alamat: 'Jl. Flamboyan No. 19, RT 05/RW 02, Kel. Sukamaju',
    kondisi: 'Mualaf, sedang mengikuti pembinaan',
  },
  // RW 03 (sengaja belum punya amil lapangan)
  {
    id: 7, nama: 'Tarsih', wilayah_id: 3, asnaf: 'miskin',
    alamat: 'Jl. Cempaka No. 4, RT 02/RW 03, Kel. Sukamaju',
    kondisi: 'Pedagang kecil, modal usaha habis',
  },
  {
    id: 8, nama: 'Darmo', wilayah_id: 3, asnaf: 'fakir',
    alamat: 'Gg. Dahlia No. 11, RT 03/RW 03, Kel. Sukamaju',
    kondisi: 'Lansia dengan penyakit menahun',
  },
  {
    id: 9, nama: 'Yuyun Yuningsih', wilayah_id: 3, asnaf: 'miskin',
    alamat: 'Jl. Cempaka No. 27, RT 01/RW 03, Kel. Sukamaju',
    kondisi: null,
  },
];

// NIK sintetis: 16 digit berpola 00000000000000xx, jelas bukan NIK sungguhan.
// NIK ini tidak disimpan; yang masuk database hanya HMAC-nya.
export const nikSintetis = (idMustahik) => String(idMustahik).padStart(16, '0');

export const PENGGUNA = [
  { id: 1, nama_pengguna: 'admin', peran: 'admin' },
  { id: 2, nama_pengguna: 'bendahara', peran: 'bendahara' },
  { id: 3, nama_pengguna: 'amil-rw01', peran: 'amil', wilayah_id: 1 },
  { id: 4, nama_pengguna: 'amil-rw02', peran: 'amil', wilayah_id: 2 },
  { id: 5, nama_pengguna: 'donatur-01', peran: 'pemilik', donatur_id: 1 },
  { id: 6, nama_pengguna: 'donatur-02', peran: 'pemilik', donatur_id: 2 },
];

// Semua transaksi dicatat oleh akun bendahara (id 2).
// donatur_id null berarti donatur memilih tanpa nama.
export const DONASI = [
  { id: 1, donatur_id: 1, jenis: 'zakat_fitrah', nominal: 200000, tanggal: '2026-03-15' },
  { id: 2, donatur_id: 2, jenis: 'zakat_fitrah', nominal: 150000, tanggal: '2026-03-16' },
  { id: 3, donatur_id: 3, jenis: 'zakat_fitrah', nominal: 100000, tanggal: '2026-03-17' },
  { id: 4, donatur_id: null, jenis: 'infak', nominal: 500000, tanggal: '2026-09-04' },
  { id: 5, donatur_id: 4, jenis: 'zakat_mal', nominal: 2500000, tanggal: '2026-09-12' },
  { id: 6, donatur_id: 1, jenis: 'infak', nominal: 250000, tanggal: '2026-09-18' },
  { id: 7, donatur_id: 5, jenis: 'sedekah', nominal: 300000, tanggal: '2026-09-25' },
  { id: 8, donatur_id: 6, jenis: 'wakaf', nominal: 1000000, tanggal: '2026-10-02' },
  { id: 9, donatur_id: 7, jenis: 'zakat_mal', nominal: 4200000, tanggal: '2026-10-09' },
  { id: 10, donatur_id: null, jenis: 'sedekah', nominal: 150000, tanggal: '2026-10-16' },
  { id: 11, donatur_id: 2, jenis: 'infak', nominal: 200000, tanggal: '2026-10-23' },
  { id: 12, donatur_id: 8, jenis: 'sedekah', nominal: 100000, tanggal: '2026-10-30' },
  { id: 13, donatur_id: 3, jenis: 'zakat_mal', nominal: 1750000, tanggal: '2026-11-06' },
  { id: 14, donatur_id: 1, jenis: 'sedekah', nominal: 125000, tanggal: '2026-11-13' },
  { id: 15, donatur_id: null, jenis: 'infak', nominal: 1000000, tanggal: '2026-11-20' },
  { id: 16, donatur_id: 4, jenis: 'infak', nominal: 300000, tanggal: '2026-11-20' },
];

export const PENYALURAN = [
  { id: 1, mustahik_id: 1, jenis_dana: 'zakat_fitrah', nominal: 150000, tanggal: '2026-03-18' },
  { id: 2, mustahik_id: 5, jenis_dana: 'zakat_fitrah', nominal: 150000, tanggal: '2026-03-18' },
  { id: 3, mustahik_id: 8, jenis_dana: 'zakat_fitrah', nominal: 150000, tanggal: '2026-03-19' },
  { id: 4, mustahik_id: 2, jenis_dana: 'zakat_mal', nominal: 750000, tanggal: '2026-09-20' },
  { id: 5, mustahik_id: 3, jenis_dana: 'zakat_mal', nominal: 1500000, tanggal: '2026-09-27' },
  { id: 6, mustahik_id: 4, jenis_dana: 'infak', nominal: 400000, tanggal: '2026-10-05' },
  { id: 7, mustahik_id: 6, jenis_dana: 'zakat_mal', nominal: 500000, tanggal: '2026-10-12' },
  { id: 8, mustahik_id: 7, jenis_dana: 'sedekah', nominal: 400000, tanggal: '2026-10-19' },
  { id: 9, mustahik_id: 1, jenis_dana: 'infak', nominal: 300000, tanggal: '2026-10-26' },
  { id: 10, mustahik_id: 9, jenis_dana: 'zakat_mal', nominal: 750000, tanggal: '2026-11-02' },
  { id: 11, mustahik_id: 5, jenis_dana: 'sedekah', nominal: 250000, tanggal: '2026-11-09' },
  { id: 12, mustahik_id: 8, jenis_dana: 'infak', nominal: 350000, tanggal: '2026-11-16' },
];

export const ID_BENDAHARA = 2;
