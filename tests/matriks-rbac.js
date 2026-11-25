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
  { metode: 'get', jalur: '/api/pengguna', boleh: ['admin'] },
  { metode: 'get', jalur: '/api/wilayah', boleh: ['admin'] },
  {
    metode: 'patch',
    jalur: '/api/pengguna/4',
    body: { peran: 'amil', wilayah_id: 2 },
    boleh: ['admin'],
  },
];
