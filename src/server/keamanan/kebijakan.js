// Kebijakan hak akses (RBAC). Satu-satunya tempat yang menentukan apa yang
// boleh dilakukan dan dilihat tiap peran. Akses mulai dari nol: hak yang
// tidak tertulis di sini berarti ditolak.
//
// Sumber: matriks hak akses di CLAUDE.md.

export const PERAN = ['admin', 'bendahara', 'amil', 'pemilik'];

export const HAK_PERAN = {
  admin: ['buku_kas:ringkas', 'ringkasan:baca', 'pengguna:kelola', 'audit:baca', 'permintaan:proses'],
  bendahara: [
    'buku_kas:baca',
    'ringkasan:baca',
    'donasi:baca',
    'donasi:catat',
    'donatur:baca_nama',
    'penyaluran:catat',
    'mustahik:baca_terbatas',
  ],
  amil: [
    'buku_kas:wilayah',
    'mustahik:baca_wilayah',
    'mustahik:catat_wilayah',
    'mustahik:ekspor_wilayah',
    'mustahik:hapus_wilayah',
  ],
  pemilik: ['data_saya:baca', 'data_saya:ekspor', 'data_saya:hapus', 'persetujuan:kelola'],
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
//
// bukaNilai(baris, kolom) dipanggil hanya untuk sel yang boleh dilihat.
// Untuk kolom terenkripsi, fungsi ini yang mendekripsi; jadi data yang
// tidak boleh dilihat suatu peran bahkan tidak pernah didekripsi.
export function saringBukuKas(pengguna, semuaBaris, bukaNilai = (b, k) => b[k]) {
  const terbuka = new Set();
  const baris = semuaBaris.map((b) => {
    const terlihat = new Set(kolomTerlihat(pengguna, b));
    // Penerima yang datanya sudah dihapus: tidak ada identitas untuk dibuka.
    const hasil = { id: b.id, dianonimkan: Boolean(b.dianonimkan_pada), tertutup: [] };
    for (const kolom of KOLOM_BUKU_KAS) {
      if (terlihat.has(kolom)) {
        hasil[kolom] = bukaNilai(b, kolom);
      } else {
        hasil[kolom] = null;
        hasil.tertutup.push(kolom);
      }
    }
    if (!b.dianonimkan_pada && ['nama', 'alamat', 'kondisi'].some((k) => terlihat.has(k))) terbuka.add(b.mustahik_id);
    return hasil;
  });
  return { baris, terbuka: [...terbuka] };
}
