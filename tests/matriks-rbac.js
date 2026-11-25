// Daftar endpoint yang dilindungi dan peran yang boleh memakainya.
// Diturunkan dari matriks hak akses di CLAUDE.md. Badan permintaan untuk
// endpoint pengubah data dibuat aman diulang (tidak merusak data uji lain).

export const ENDPOINT = [
  { metode: 'get', jalur: '/api/buku-kas', boleh: ['admin', 'bendahara', 'amil'] },
  { metode: 'get', jalur: '/api/ringkasan', boleh: ['admin', 'bendahara'] },
  { metode: 'get', jalur: '/api/donatur', boleh: ['bendahara'] },
  { metode: 'get', jalur: '/api/donasi', boleh: ['bendahara'] },
  {
    metode: 'post',
    jalur: '/api/donasi',
    body: { donatur_id: null, jenis: 'infak', nominal: 1000, tanggal: '2026-11-01' },
    boleh: ['bendahara'],
  },
  {
    metode: 'post',
    jalur: '/api/penyaluran',
    body: { mustahik_id: 2, jenis_dana: 'infak', nominal: 1000, tanggal: '2026-11-01' },
    boleh: ['bendahara'],
  },
  { metode: 'get', jalur: '/api/mustahik', boleh: ['bendahara', 'amil'] },
  {
    metode: 'post',
    jalur: '/api/mustahik',
    body: { nama: 'Penerima Uji', alamat: 'Jl. Uji No. 1, RW 01', asnaf: 'miskin', nik: '0000000000009999' },
    boleh: ['amil'],
  },
  { metode: 'get', jalur: '/api/pengguna', boleh: ['admin'] },
  { metode: 'get', jalur: '/api/wilayah', boleh: ['admin'] },
  { metode: 'get', jalur: '/api/audit', boleh: ['admin'] },
  {
    metode: 'patch',
    jalur: '/api/pengguna/4',
    body: { peran: 'amil', wilayah_id: 2 },
    boleh: ['admin'],
  },
  { metode: 'get', jalur: '/api/mustahik/1/ekspor', boleh: ['amil'] },
  { metode: 'post', jalur: '/api/mustahik/2/hapus', boleh: ['amil'] },
  { metode: 'get', jalur: '/api/data-saya', boleh: ['pemilik'] },
  { metode: 'get', jalur: '/api/data-saya/riwayat', boleh: ['pemilik'] },
  { metode: 'get', jalur: '/api/data-saya/ekspor?format=csv', boleh: ['pemilik'] },
  { metode: 'get', jalur: '/api/data-saya/persetujuan', boleh: ['pemilik'] },
  {
    metode: 'put',
    jalur: '/api/data-saya/persetujuan/nama_di_catatan',
    body: { diberikan: true },
    boleh: ['pemilik'],
  },
  { metode: 'put', jalur: '/api/data-saya/kontak', body: { kontak: 'baru@contoh.test' }, boleh: ['pemilik'] },
  { metode: 'post', jalur: '/api/data-saya/hapus', boleh: ['pemilik'] },
  { metode: 'get', jalur: '/api/permintaan', boleh: ['admin'] },
  // Permintaan nomor 1 dibuat oleh baris di atas; ditolak supaya akun uji tetap ada.
  { metode: 'post', jalur: '/api/permintaan/1/proses', body: { keputusan: 'tolak' }, boleh: ['admin'] },
];
