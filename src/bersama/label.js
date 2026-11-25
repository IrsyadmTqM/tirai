// Label tampilan yang dipakai bersama oleh server dan tampilan web.

export const JENIS_DONASI = ['zakat_fitrah', 'zakat_mal', 'infak', 'sedekah', 'wakaf'];
export const JENIS_PENYALURAN = ['zakat_fitrah', 'zakat_mal', 'infak', 'sedekah'];

export const LABEL_JENIS = {
  zakat_fitrah: 'Zakat fitrah',
  zakat_mal: 'Zakat mal',
  infak: 'Infak',
  sedekah: 'Sedekah',
  wakaf: 'Wakaf',
};

// Delapan golongan penerima zakat. Rujukan ayat ditandai [VERIFIKASI] di
// docs/arsitektur.md.
export const ASNAF = ['fakir', 'miskin', 'amil', 'mualaf', 'riqab', 'gharim', 'fisabilillah', 'ibnu_sabil'];

export const LABEL_ASNAF = {
  fakir: 'Fakir',
  miskin: 'Miskin',
  amil: 'Amil',
  mualaf: 'Mualaf',
  riqab: 'Riqab',
  gharim: 'Gharim',
  fisabilillah: 'Fisabilillah',
  ibnu_sabil: 'Ibnu sabil',
};

// Tujuan penggunaan data yang butuh persetujuan donatur. Setiap tujuan
// punya akibat nyata di aplikasi bila dicabut (lihat uraian).
export const TUJUAN_PERSETUJUAN = {
  kontak_bukti: {
    judul: 'Simpan kontak untuk bukti donasi',
    uraian:
      'Kontak Anda disimpan terenkripsi dan hanya dipakai untuk mengirim bukti donasi. Bila izin dicabut, kontak langsung dihapus dari database.',
  },
  nama_di_catatan: {
    judul: 'Tampilkan nama saya di catatan donasi bendahara',
    uraian:
      'Bendahara melihat nama Anda pada catatan donasi sebagai bukti. Bila izin dicabut, donasi Anda tampil sebagai "tanpa nama" bagi bendahara; nominalnya tetap tercatat.',
  },
};

export const LABEL_AKSI = {
  baca: 'membaca',
  buat: 'membuat',
  ubah: 'mengubah',
  ekspor: 'mengekspor',
  hapus: 'menghapus',
  masuk: 'masuk',
  gagal_masuk: 'gagal masuk',
  keluar: 'keluar',
};

export const LABEL_OBJEK = {
  buku_kas: 'buku kas',
  mustahik: 'data mustahik',
  donatur: 'data donatur',
  donasi: 'catatan donasi',
  penyaluran: 'catatan penyaluran',
  pengguna: 'akun',
  audit_log: 'audit log',
  sesi: 'sesi',
  persetujuan: 'persetujuan',
  permintaan: 'permintaan',
  catatan: 'catatan pribadi',
};

export const NAMA_PERAN = {
  admin: 'Admin',
  bendahara: 'Bendahara',
  amil: 'Amil lapangan',
  pemilik: 'Pemilik data',
};
