// Pencatatan audit log. Satu-satunya cara aplikasi menulis ke tabel
// audit_log adalah INSERT lewat fungsi di sini. Tidak ada fungsi untuk
// mengubah atau menghapus catatan.

import { dalamTransaksi } from './db/index.js';

// pengguna: { id, peran } atau null. subjek: { jenis, id } atau null.
export function catat(db, { pengguna, aksi, objek, subjek = null, saluran = 'aplikasi' }) {
  const waktu = new Date().toISOString();
  const hasil = db
    .prepare(
      `INSERT INTO audit_log (waktu, pengguna_id, peran, aksi, objek, subjek_jenis, subjek_id, saluran)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(waktu, pengguna?.id ?? null, pengguna?.peran ?? null, aksi, objek, subjek?.jenis ?? null, subjek?.id ?? null, saluran);
  return {
    id: Number(hasil.lastInsertRowid),
    waktu,
    peran: pengguna?.peran ?? null,
    aksi,
    objek,
    subjek: subjek ? { ...subjek } : null,
    saluran,
  };
}

// Mencatat satu aksi atas banyak orang sekaligus (misalnya membaca daftar).
export function catatUntukBanyak(db, { pengguna, aksi, objek, subjekJenis, subjekIds, saluran = 'aplikasi' }) {
  return dalamTransaksi(db, () =>
    subjekIds.map((id) => catat(db, { pengguna, aksi, objek, subjek: { jenis: subjekJenis, id }, saluran })),
  );
}

// Seluruh log untuk admin, terbaru di atas.
export function bacaAudit(db, { batas = 200 } = {}) {
  return db
    .prepare(
      `SELECT a.id, a.waktu, a.peran, a.aksi, a.objek, a.subjek_jenis, a.subjek_id, a.saluran,
              p.nama_pengguna AS pelaku
       FROM audit_log a LEFT JOIN pengguna p ON p.id = a.pengguna_id
       ORDER BY a.id DESC LIMIT ?`,
    )
    .all(batas)
    .map(bentukEntri);
}

// Riwayat akses atas data satu orang, untuk pemilik data. Pelaku hanya
// ditampilkan sebagai peran, tanpa nama akun staf.
export function riwayatSubjek(db, jenis, id, { batas = 200 } = {}) {
  return db
    .prepare(
      `SELECT id, waktu, peran, aksi, objek, subjek_jenis, subjek_id, saluran
       FROM audit_log WHERE subjek_jenis = ? AND subjek_id = ?
       ORDER BY id DESC LIMIT ?`,
    )
    .all(jenis, id, batas)
    .map(bentukEntri);
}

function bentukEntri(b) {
  const entri = {
    id: b.id,
    waktu: b.waktu,
    peran: b.peran,
    aksi: b.aksi,
    objek: b.objek,
    subjek: b.subjek_jenis ? { jenis: b.subjek_jenis, id: b.subjek_id } : null,
    saluran: b.saluran,
  };
  if ('pelaku' in b) entri.pelaku = b.pelaku;
  return entri;
}
