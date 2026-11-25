// Akses data keuangan: buku kas penyaluran, donasi, ringkasan.
// Fungsi di sini mengembalikan data lengkap. Penyaringan menurut peran
// dilakukan di keamanan/kebijakan.js sebelum dikirim ke browser.

import { JENIS_DONASI } from '../../bersama/label.js';

// Kolom nama, alamat, dan kondisi masih berupa ciphertext. Didekripsi
// belakangan, hanya untuk sel yang boleh dilihat.
export function bacaBukuKasLengkap(db) {
  return db
    .prepare(
      `SELECT p.id, p.tanggal, p.jenis_dana, p.nominal,
              m.id AS mustahik_id, m.nama, m.alamat, m.kondisi, m.asnaf, m.kunci_id, m.dianonimkan_pada,
              w.id AS wilayah_id, w.nama AS wilayah
       FROM penyaluran p
       JOIN mustahik m ON m.id = p.mustahik_id
       JOIN wilayah w ON w.id = m.wilayah_id
       ORDER BY p.tanggal, p.id`,
    )
    .all()
    .map((b) => ({ ...b }));
}

export function hitungRingkasan(db) {
  const jumlahPer = (sql) => Object.fromEntries(db.prepare(sql).all().map((b) => [b.jenis, b.total]));
  const masuk = jumlahPer('SELECT jenis, SUM(nominal) AS total FROM donasi GROUP BY jenis');
  const keluar = jumlahPer('SELECT jenis_dana AS jenis, SUM(nominal) AS total FROM penyaluran GROUP BY jenis_dana');

  const perJenis = JENIS_DONASI.map((jenis) => ({
    jenis,
    masuk: masuk[jenis] ?? 0,
    keluar: keluar[jenis] ?? 0,
    saldo: (masuk[jenis] ?? 0) - (keluar[jenis] ?? 0),
  }));
  const total = perJenis.reduce(
    (t, j) => ({ masuk: t.masuk + j.masuk, keluar: t.keluar + j.keluar, saldo: t.saldo + j.saldo }),
    { masuk: 0, keluar: 0, saldo: 0 },
  );
  return { perJenis, total };
}

export function saldoJenis(db, jenis) {
  const masuk = db.prepare('SELECT COALESCE(SUM(nominal), 0) AS n FROM donasi WHERE jenis = ?').get(jenis).n;
  const keluar = db.prepare('SELECT COALESCE(SUM(nominal), 0) AS n FROM penyaluran WHERE jenis_dana = ?').get(jenis).n;
  return masuk - keluar;
}

// Nama donatur hanya ikut bila donatur itu mengizinkan namanya terlihat di
// catatan donasi. Tanpa izin, baris tampil seperti donasi tanpa nama.
export function daftarDonasi(db) {
  return db
    .prepare(
      `SELECT d.id, d.tanggal, d.jenis, d.nominal,
              CASE WHEN p.donatur_id IS NOT NULL THEN d.donatur_id END AS donatur_id,
              CASE WHEN p.donatur_id IS NOT NULL THEN t.nama END AS nama_donatur
       FROM donasi d
       LEFT JOIN donatur t ON t.id = d.donatur_id
       LEFT JOIN persetujuan p
         ON p.donatur_id = d.donatur_id AND p.tujuan = 'nama_di_catatan' AND p.diberikan = 1
       ORDER BY d.tanggal DESC, d.id DESC`,
    )
    .all()
    .map((b) => ({ ...b }));
}

export function tambahDonasi(db, { donaturId, jenis, nominal, tanggal, dicatatOleh }) {
  const hasil = db
    .prepare(
      `INSERT INTO donasi (donatur_id, jenis, nominal, tanggal, dicatat_oleh, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(donaturId, jenis, nominal, tanggal, dicatatOleh, new Date().toISOString());
  return Number(hasil.lastInsertRowid);
}

export function tambahPenyaluran(db, { mustahikId, jenisDana, nominal, tanggal, dicatatOleh }) {
  const hasil = db
    .prepare(
      `INSERT INTO penyaluran (mustahik_id, jenis_dana, nominal, tanggal, dicatat_oleh, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(mustahikId, jenisDana, nominal, tanggal, dicatatOleh, new Date().toISOString());
  return Number(hasil.lastInsertRowid);
}
