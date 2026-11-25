// Penghapusan data pribadi atas permintaan.
//
// Usulan awal (perlu keputusan tim dan dosen, karena hak hapus berhadapan
// dengan kewajiban pembukuan zakat):
// - Identitas dihapus: nama, kontak, alamat, kondisi, penanda NIK, akun,
//   dan sesi. Kunci data pemiliknya dimusnahkan, jadi ciphertext lama yang
//   mungkin tersisa tidak bisa dibuka lagi.
// - Catatan keuangan dipertahankan tanpa identitas: donasi menjadi donasi
//   tanpa nama; penyaluran tetap ada dengan asnaf dan wilayah penerimanya.
// - Audit log tidak dihapus. Isinya memang hanya nomor, bukan nama.

import { dalamTransaksi } from '../db/index.js';
import { GalatPermintaan } from '../validasi.js';

export function ajukanHapus(db, { subjek, diajukanPeran }) {
  try {
    const hasil = db
      .prepare(
        `INSERT INTO permintaan_hapus (subjek_jenis, subjek_id, diajukan_peran, diajukan_pada, status)
         VALUES (?, ?, ?, ?, 'menunggu')`,
      )
      .run(subjek.jenis, subjek.id, diajukanPeran, new Date().toISOString());
    return Number(hasil.lastInsertRowid);
  } catch (galat) {
    if (/UNIQUE/.test(galat.message)) throw new GalatPermintaan('Sudah ada permintaan hapus yang menunggu diproses', 409);
    throw galat;
  }
}

const bentuk = (b) => ({
  id: b.id,
  subjek: { jenis: b.subjek_jenis, id: b.subjek_id },
  diajukan_peran: b.diajukan_peran,
  diajukan_pada: b.diajukan_pada,
  status: b.status,
  diproses_pada: b.diproses_pada,
});

export function daftarPermintaan(db) {
  return db
    .prepare("SELECT * FROM permintaan_hapus ORDER BY status = 'menunggu' DESC, id DESC")
    .all()
    .map(bentuk);
}

export function permintaanTerakhir(db, subjek) {
  const b = db
    .prepare('SELECT * FROM permintaan_hapus WHERE subjek_jenis = ? AND subjek_id = ? ORDER BY id DESC LIMIT 1')
    .get(subjek.jenis, subjek.id);
  return b ? bentuk(b) : null;
}

function anonimkanDonatur(db, brankas, id) {
  const d = db.prepare('SELECT kunci_id FROM donatur WHERE id = ?').get(id);
  if (!d) return;
  db.prepare('UPDATE donasi SET donatur_id = NULL WHERE donatur_id = ?').run(id);
  db.prepare('DELETE FROM persetujuan WHERE donatur_id = ?').run(id);
  db.prepare('DELETE FROM pengguna WHERE donatur_id = ?').run(id); // sesi ikut terhapus (ON DELETE CASCADE)
  db.prepare('DELETE FROM donatur WHERE id = ?').run(id);
  brankas.musnahkan(d.kunci_id);
}

function anonimkanMustahik(db, brankas, id) {
  const m = db.prepare('SELECT kunci_id FROM mustahik WHERE id = ? AND dianonimkan_pada IS NULL').get(id);
  if (!m) return;
  db.prepare('DELETE FROM pengguna WHERE mustahik_id = ?').run(id);
  db.prepare(
    `UPDATE mustahik SET nama = NULL, alamat = NULL, kondisi = NULL, nik_hmac = NULL, kunci_id = NULL,
       dianonimkan_pada = ? WHERE id = ?`,
  ).run(new Date().toISOString(), id);
  brankas.musnahkan(m.kunci_id);
}

export function prosesPermintaan(db, brankas, id, keputusan) {
  return dalamTransaksi(db, () => {
    const p = db.prepare('SELECT * FROM permintaan_hapus WHERE id = ?').get(id);
    if (!p) throw new GalatPermintaan('Permintaan tidak ditemukan', 404);
    if (p.status !== 'menunggu') throw new GalatPermintaan('Permintaan ini sudah diproses', 409);
    if (keputusan === 'setujui') {
      if (p.subjek_jenis === 'donatur') anonimkanDonatur(db, brankas, p.subjek_id);
      else anonimkanMustahik(db, brankas, p.subjek_id);
    }
    db.prepare('UPDATE permintaan_hapus SET status = ?, diproses_pada = ? WHERE id = ?').run(
      keputusan === 'setujui' ? 'disetujui' : 'ditolak',
      new Date().toISOString(),
      id,
    );
    return bentuk(db.prepare('SELECT * FROM permintaan_hapus WHERE id = ?').get(id));
  });
}
