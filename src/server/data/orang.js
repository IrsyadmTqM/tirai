// Akses data orang: donatur, mustahik, dan akun pengguna.

// Hanya donatur yang mengizinkan namanya terlihat di catatan donasi.
export function daftarDonatur(db) {
  return db
    .prepare(
      `SELECT d.id, d.nama FROM donatur d
       JOIN persetujuan p ON p.donatur_id = d.id AND p.tujuan = 'nama_di_catatan' AND p.diberikan = 1
       ORDER BY d.nama`,
    )
    .all()
    .map((b) => ({ ...b }));
}

export function bacaKunciDonatur(db, id) {
  return db.prepare('SELECT kunci_id FROM donatur WHERE id = ?').get(id)?.kunci_id ?? null;
}

export function ubahKontak(db, brankas, id, kontak) {
  const kunciId = bacaKunciDonatur(db, id);
  db.prepare('UPDATE donatur SET kontak = ? WHERE id = ?').run(brankas.enkripsi(kunciId, kontak, 'donatur.kontak'), id);
}

export function adaDonatur(db, id) {
  return Boolean(db.prepare('SELECT 1 FROM donatur WHERE id = ?').get(id));
}

export const KOLOM_TERENKRIPSI_MUSTAHIK = ['nama', 'alamat', 'kondisi'];

// Daftar mustahik. Hanya kolom terenkripsi yang disebut di "buka" yang
// didekripsi; kolom terenkripsi lain tidak ikut dikembalikan.
export function daftarMustahik(db, brankas, { wilayahId, buka = [] } = {}) {
  const sql = `SELECT m.id, m.nama, m.alamat, m.kondisi, m.asnaf, m.wilayah_id, m.kunci_id, w.nama AS wilayah
               FROM mustahik m JOIN wilayah w ON w.id = m.wilayah_id
               WHERE m.dianonimkan_pada IS NULL ${wilayahId ? 'AND m.wilayah_id = ?' : ''}
               ORDER BY w.nama, m.id`;
  const stmt = db.prepare(sql);
  return (wilayahId ? stmt.all(wilayahId) : stmt.all()).map((b) => {
    const hasil = { id: b.id, asnaf: b.asnaf, wilayah_id: b.wilayah_id, wilayah: b.wilayah };
    for (const kolom of buka) hasil[kolom] = brankas.dekripsi(b.kunci_id, b[kolom], `mustahik.${kolom}`);
    return hasil;
  });
}

// Hanya mustahik yang datanya belum dihapus.
export function adaMustahik(db, id) {
  return Boolean(db.prepare('SELECT 1 FROM mustahik WHERE id = ? AND dianonimkan_pada IS NULL').get(id));
}

export function mustahikAktifDiWilayah(db, id, wilayahId) {
  return Boolean(
    db.prepare('SELECT 1 FROM mustahik WHERE id = ? AND wilayah_id = ? AND dianonimkan_pada IS NULL').get(id, wilayahId),
  );
}

export function nikTerdaftar(db, nikHmac) {
  return Boolean(db.prepare('SELECT 1 FROM mustahik WHERE nik_hmac = ?').get(nikHmac));
}

export function tambahMustahik(db, brankas, { nama, alamat, kondisi, asnaf, wilayahId, nikHmac }) {
  const kunciId = brankas.buatKunciPemilik();
  const hasil = db
    .prepare(
      `INSERT INTO mustahik (nama, alamat, kondisi, asnaf, wilayah_id, nik_hmac, kunci_id, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      brankas.enkripsi(kunciId, nama, 'mustahik.nama'),
      brankas.enkripsi(kunciId, alamat, 'mustahik.alamat'),
      brankas.enkripsi(kunciId, kondisi, 'mustahik.kondisi'),
      asnaf,
      wilayahId,
      nikHmac,
      kunciId,
      new Date().toISOString(),
    );
  return Number(hasil.lastInsertRowid);
}

export function cariAkun(db, namaPengguna) {
  const baris = db
    .prepare('SELECT id, nama_pengguna, kata_sandi_hash, peran FROM pengguna WHERE nama_pengguna = ?')
    .get(namaPengguna);
  return baris ? { ...baris } : null;
}

export function cariAkunMenurutPeran(db, peran, wilayahId = null) {
  const baris = db
    .prepare(
      `SELECT id, nama_pengguna, peran, wilayah_id, donatur_id, mustahik_id FROM pengguna
       WHERE peran = ? AND (? IS NULL OR wilayah_id = ?) ORDER BY id LIMIT 1`,
    )
    .get(peran, wilayahId, wilayahId);
  return baris ? { ...baris } : null;
}

export function daftarPengguna(db) {
  return db
    .prepare(
      `SELECT p.id, p.nama_pengguna, p.peran, p.wilayah_id, w.nama AS wilayah
       FROM pengguna p LEFT JOIN wilayah w ON w.id = p.wilayah_id
       ORDER BY p.id`,
    )
    .all()
    .map((b) => ({ ...b }));
}

export function bacaPengguna(db, id) {
  const baris = db.prepare('SELECT id, nama_pengguna, peran, wilayah_id FROM pengguna WHERE id = ?').get(id);
  return baris ? { ...baris } : null;
}

export function ubahPeran(db, id, { peran, wilayahId }) {
  db.prepare('UPDATE pengguna SET peran = ?, wilayah_id = ? WHERE id = ?').run(peran, wilayahId, id);
}

export function daftarWilayah(db) {
  return db.prepare('SELECT id, nama FROM wilayah ORDER BY nama').all().map((b) => ({ ...b }));
}

export function bacaWilayah(db, id) {
  const baris = db.prepare('SELECT id, nama FROM wilayah WHERE id = ?').get(id);
  return baris ? { ...baris } : null;
}
