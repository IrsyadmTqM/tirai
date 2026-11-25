// Kebijakan hak akses (RBAC). Satu-satunya tempat yang menentukan apa yang
// boleh dilakukan dan dilihat tiap peran. Akses mulai dari nol: hak yang
// tidak tertulis di sini berarti ditolak.
//
// Sumber: matriks hak akses di CLAUDE.md.

export const PERAN = ['admin', 'bendahara', 'amil', 'pemilik'];

export const HAK_PERAN = {
  admin: ['buku_kas:ringkas', 'ringkasan:baca', 'pengguna:kelola'],
  bendahara: [
    'buku_kas:baca',
    'ringkasan:baca',
    'donasi:baca',
    'donasi:catat',
    'donatur:baca_nama',
    'penyaluran:catat',
    'mustahik:baca_terbatas',
  ],
  amil: ['buku_kas:wilayah', 'mustahik:baca_wilayah'],
  pemilik: [],
};

export function boleh(peran, hak) {
  return HAK_PERAN[peran]?.includes(hak) ?? false;
}

// Kolom buku kas penyaluran, urut seperti tampil di layar.
export const KOLOM_BUKU_KAS = [
  'tanggal',
  'wilayah',
  'nama',
  'asnaf',
  'alamat',
  'kondisi',
  'jenis_dana',
  'nominal',
];

// Kolom yang boleh dilihat seorang pengguna pada satu baris buku kas.
function kolomTerlihat(pengguna, baris) {
  switch (pengguna.peran) {
    // Admin: tidak melihat identitas mustahik maupun nominal per baris,
    // hanya ringkasan total.
    case 'admin':
      return ['tanggal', 'jenis_dana'];
    // Bendahara: mencatat dan melihat nominal; data mustahik tanpa alamat
    // dan kondisi.
    case 'bendahara':
      return ['tanggal', 'wilayah', 'nama', 'asnaf', 'jenis_dana', 'nominal'];
    // Amil: data mustahik hanya untuk wilayahnya, tanpa nominal.
    case 'amil':
      return baris.wilayah_id === pengguna.wilayah_id
        ? ['tanggal', 'wilayah', 'nama', 'asnaf', 'alamat', 'kondisi', 'jenis_dana']
        : ['tanggal'];
    default:
      return [];
  }
}

// Menyaring baris buku kas lengkap menjadi apa yang boleh dikirim ke
// browser. Nilai yang tidak boleh dilihat diganti null dan namanya dicatat
// di "tertutup", supaya tampilan bisa menggambar bar hitam. Nilai aslinya
// tidak pernah meninggalkan server.
//
// Hasil kedua, "terbuka", berisi id mustahik yang identitasnya ikut
// terlihat. Dipakai untuk audit log, tidak dikirim ke browser.
export function saringBukuKas(pengguna, semuaBaris) {
  const terbuka = new Set();
  const baris = semuaBaris.map((b) => {
    const terlihat = new Set(kolomTerlihat(pengguna, b));
    const hasil = { id: b.id, tertutup: [] };
    for (const kolom of KOLOM_BUKU_KAS) {
      if (terlihat.has(kolom)) {
        hasil[kolom] = b[kolom];
      } else {
        hasil[kolom] = null;
        hasil.tertutup.push(kolom);
      }
    }
    if (['nama', 'alamat', 'kondisi'].some((k) => terlihat.has(k))) terbuka.add(b.mustahik_id);
    return hasil;
  });
  return { baris, terbuka: [...terbuka] };
}
