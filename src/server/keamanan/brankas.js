// Brankas kunci: mengelola kunci data per pemilik (donatur atau mustahik).
// Kunci data hanya ada dalam bentuk terbuka di memori server, sebentar,
// saat mengenkripsi atau mendekripsi.

import { buatKunciData, bukaBungkusKunci, bungkusKunci, dekripsi, enkripsi, hmacNik } from './kripto.js';

export class Brankas {
  constructor(db, kunci) {
    this.db = db;
    this.kunci = kunci;
  }

  // Membuat kunci data baru untuk satu pemilik data. Mengembalikan id baris.
  buatKunciPemilik() {
    const terbungkus = bungkusKunci(this.kunci.master, buatKunciData());
    const hasil = this.db
      .prepare('INSERT INTO kunci_data (kunci_terbungkus, dibuat_pada) VALUES (?, ?)')
      .run(terbungkus, new Date().toISOString());
    return Number(hasil.lastInsertRowid);
  }

  #kunciData(kunciId) {
    const baris = this.db.prepare('SELECT kunci_terbungkus FROM kunci_data WHERE id = ?').get(kunciId);
    if (!baris) throw new Error('Kunci data tidak ada (mungkin sudah dimusnahkan)');
    return bukaBungkusKunci(this.kunci.master, baris.kunci_terbungkus);
  }

  enkripsi(kunciId, teks, aad) {
    if (teks === null || teks === undefined) return null;
    return enkripsi(this.#kunciData(kunciId), teks, aad);
  }

  dekripsi(kunciId, paket, aad) {
    if (paket === null || paket === undefined) return null;
    return dekripsi(this.#kunciData(kunciId), paket, aad);
  }

  // Memusnahkan kunci data. Setelah ini, ciphertext milik pemilik itu tidak
  // bisa dibuka lagi walaupun masih ada di database.
  musnahkan(kunciId) {
    this.db.prepare('DELETE FROM kunci_data WHERE id = ?').run(kunciId);
  }

  hmacNik(nik) {
    return hmacNik(this.kunci.nik, nik);
  }
}
