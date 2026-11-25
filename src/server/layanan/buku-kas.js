// Menyusun buku kas penyaluran sesuai peran pengguna.

import { catat, catatUntukBanyak } from '../audit.js';
import { bacaBukuKasLengkap, hitungRingkasan } from '../data/keuangan.js';
import { KOLOM_TERENKRIPSI_MUSTAHIK, bacaWilayah } from '../data/orang.js';
import { KOLOM_BUKU_KAS, boleh, saringBukuKas } from '../keamanan/kebijakan.js';

// Satu catatan "baca buku_kas", ditambah satu catatan "baca mustahik" untuk
// tiap mustahik yang identitasnya ikut terlihat oleh peran itu.
export function catatAksesBukuKas(db, pengguna, terbuka, saluran = 'aplikasi') {
  const umum = catat(db, { pengguna, aksi: 'baca', objek: 'buku_kas', saluran });
  const perOrang = catatUntukBanyak(db, {
    pengguna,
    aksi: 'baca',
    objek: 'mustahik',
    subjekJenis: 'mustahik',
    subjekIds: terbuka,
    saluran,
  });
  return [umum, ...perOrang];
}

// "terbuka" (id mustahik yang identitasnya terlihat) dikembalikan terpisah
// untuk audit log dan tidak boleh ikut dikirim ke browser.
export function susunBukuKas(db, brankas, pengguna) {
  const bukaNilai = (b, kolom) =>
    KOLOM_TERENKRIPSI_MUSTAHIK.includes(kolom) ? brankas.dekripsi(b.kunci_id, b[kolom], `mustahik.${kolom}`) : b[kolom];

  const { baris, terbuka } = saringBukuKas(pengguna, bacaBukuKasLengkap(db), bukaNilai);
  const tampilan = {
    peran: pengguna.peran,
    wilayah: pengguna.wilayah_id ? bacaWilayah(db, pengguna.wilayah_id) : null,
    kolom: KOLOM_BUKU_KAS,
    baris,
    ringkasan: boleh(pengguna.peran, 'ringkasan:baca') ? hitungRingkasan(db) : null,
  };
  return { tampilan, terbuka };
}
