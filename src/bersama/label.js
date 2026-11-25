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

export const NAMA_PERAN = {
  admin: 'Admin',
  bendahara: 'Bendahara',
  amil: 'Amil lapangan',
  pemilik: 'Pemilik data',
};
