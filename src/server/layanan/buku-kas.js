// Menyusun buku kas penyaluran sesuai peran pengguna.

import { bacaBukuKasLengkap, hitungRingkasan } from '../data/keuangan.js';
import { bacaWilayah } from '../data/orang.js';
import { KOLOM_BUKU_KAS, boleh, saringBukuKas } from '../keamanan/kebijakan.js';

// "terbuka" (id mustahik yang identitasnya terlihat) dikembalikan terpisah
// untuk audit log dan tidak boleh ikut dikirim ke browser.
export function susunBukuKas(db, pengguna) {
  const { baris, terbuka } = saringBukuKas(pengguna, bacaBukuKasLengkap(db));
  const tampilan = {
    peran: pengguna.peran,
    wilayah: pengguna.wilayah_id ? bacaWilayah(db, pengguna.wilayah_id) : null,
    kolom: KOLOM_BUKU_KAS,
    baris,
    ringkasan: boleh(pengguna.peran, 'ringkasan:baca') ? hitungRingkasan(db) : null,
  };
  return { tampilan, terbuka };
}
