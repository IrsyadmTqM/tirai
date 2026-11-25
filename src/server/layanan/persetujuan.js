// Persetujuan (consent) donatur per tujuan. Mencabut izin langsung berakibat:
// - kontak_bukti: kontak dihapus dari database.
// - nama_di_catatan: nama tidak lagi dikirim ke bendahara pada catatan
//   donasi dan daftar donatur.

import { TUJUAN_PERSETUJUAN } from '../../bersama/label.js';
import { dalamTransaksi } from '../db/index.js';

export const TUJUAN = Object.keys(TUJUAN_PERSETUJUAN);

export function bacaPersetujuan(db, donaturId) {
  const tersimpan = Object.fromEntries(
    db
      .prepare('SELECT tujuan, diberikan, diubah_pada FROM persetujuan WHERE donatur_id = ?')
      .all(donaturId)
      .map((b) => [b.tujuan, b]),
  );
  return TUJUAN.map((tujuan) => ({
    tujuan,
    ...TUJUAN_PERSETUJUAN[tujuan],
    // Tanpa catatan berarti belum pernah diberikan.
    diberikan: tersimpan[tujuan]?.diberikan === 1,
    diubah_pada: tersimpan[tujuan]?.diubah_pada ?? null,
  }));
}

export function adaPersetujuan(db, donaturId, tujuan) {
  return Boolean(
    db
      .prepare('SELECT 1 FROM persetujuan WHERE donatur_id = ? AND tujuan = ? AND diberikan = 1')
      .get(donaturId, tujuan),
  );
}

// Mengembalikan daftar akibat yang terjadi, untuk ditampilkan ke pengguna.
export function ubahPersetujuan(db, donaturId, tujuan, diberikan) {
  return dalamTransaksi(db, () => {
    db.prepare(
      `INSERT INTO persetujuan (donatur_id, tujuan, diberikan, diubah_pada) VALUES (?, ?, ?, ?)
       ON CONFLICT (donatur_id, tujuan) DO UPDATE SET diberikan = excluded.diberikan, diubah_pada = excluded.diubah_pada`,
    ).run(donaturId, tujuan, diberikan ? 1 : 0, new Date().toISOString());

    const akibat = [];
    if (tujuan === 'kontak_bukti' && !diberikan) {
      const hasil = db.prepare('UPDATE donatur SET kontak = NULL WHERE id = ? AND kontak IS NOT NULL').run(donaturId);
      if (hasil.changes) akibat.push('kontak_dihapus');
    }
    return akibat;
  });
}
