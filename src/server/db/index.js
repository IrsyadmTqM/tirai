// Akses database SQLite memakai modul node:sqlite bawaan Node.js
// (tanpa paket native yang perlu dikompilasi).

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { hashSandi } from '../keamanan/sandi.js';
import * as data from './data-sintetis.js';

const SKEMA = fs.readFileSync(new URL('./skema.sql', import.meta.url), 'utf8');

export const TABEL = ['wilayah', 'donatur', 'mustahik', 'pengguna', 'sesi', 'donasi', 'penyaluran'];

// Lokasi berkas database: DB_PATH dari .env, atau data/tirai.db di akar proyek.
export function lokasiDatabase() {
  if (process.env.DB_PATH) return path.resolve(process.env.DB_PATH);
  return path.resolve(import.meta.dirname, '../../../data/tirai.db');
}

export function bukaDatabase(lokasi = ':memory:') {
  if (lokasi !== ':memory:') fs.mkdirSync(path.dirname(lokasi), { recursive: true });
  const db = new DatabaseSync(lokasi);
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

export function terapkanSkema(db) {
  db.exec(SKEMA);
}

export function dalamTransaksi(db, kerja) {
  db.exec('BEGIN');
  try {
    const hasil = kerja();
    db.exec('COMMIT');
    return hasil;
  } catch (galat) {
    db.exec('ROLLBACK');
    throw galat;
  }
}

export async function isiDataSintetis(db) {
  // Hash dihitung di luar transaksi karena scrypt berjalan asinkron.
  // Tiap akun mendapat salt acak sendiri walaupun kata sandinya sama.
  const hashSandiAkun = await Promise.all(data.PENGGUNA.map(() => hashSandi(data.KATA_SANDI_DEMO)));

  dalamTransaksi(db, () => {
    const tambahWilayah = db.prepare('INSERT INTO wilayah (id, nama) VALUES (?, ?)');
    for (const w of data.WILAYAH) tambahWilayah.run(w.id, w.nama);

    const tambahDonatur = db.prepare(
      'INSERT INTO donatur (id, nama, kontak, dibuat_pada) VALUES (?, ?, ?, ?)',
    );
    for (const d of data.DONATUR) tambahDonatur.run(d.id, d.nama, d.kontak, data.AWAL_DATA);

    const tambahMustahik = db.prepare(
      `INSERT INTO mustahik (id, nama, alamat, kondisi, asnaf, wilayah_id, nik_hmac, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    );
    for (const m of data.MUSTAHIK) {
      tambahMustahik.run(m.id, m.nama, m.alamat, m.kondisi, m.asnaf, m.wilayah_id, data.AWAL_DATA);
    }

    const tambahPengguna = db.prepare(
      `INSERT INTO pengguna
         (id, nama_pengguna, kata_sandi_hash, peran, wilayah_id, donatur_id, mustahik_id, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    data.PENGGUNA.forEach((p, i) => {
      tambahPengguna.run(
        p.id,
        p.nama_pengguna,
        hashSandiAkun[i],
        p.peran,
        p.wilayah_id ?? null,
        p.donatur_id ?? null,
        p.mustahik_id ?? null,
        data.AWAL_DATA,
      );
    });

    const tambahDonasi = db.prepare(
      `INSERT INTO donasi (id, donatur_id, jenis, nominal, tanggal, dicatat_oleh, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const d of data.DONASI) {
      tambahDonasi.run(d.id, d.donatur_id, d.jenis, d.nominal, d.tanggal, data.ID_BENDAHARA, waktuCatat(d.tanggal));
    }

    const tambahPenyaluran = db.prepare(
      `INSERT INTO penyaluran (id, mustahik_id, jenis_dana, nominal, tanggal, dicatat_oleh, dibuat_pada)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const p of data.PENYALURAN) {
      tambahPenyaluran.run(p.id, p.mustahik_id, p.jenis_dana, p.nominal, p.tanggal, data.ID_BENDAHARA, waktuCatat(p.tanggal));
    }
  });
}

// Transaksi sintetis dianggap dicatat pukul 10.00 WIB pada tanggalnya.
function waktuCatat(tanggal) {
  return `${tanggal}T03:00:00.000Z`;
}

// Membuat database baru berisi skema dan data sintetis.
// Untuk berkas, isi lama dihapus dulu: database ini memang dibuat ulang
// setiap server menyala dan hanya berisi data sintetis.
export async function buatDatabaseSintetis(lokasi = ':memory:') {
  if (lokasi !== ':memory:') hapusBerkasDatabase(lokasi);
  const db = bukaDatabase(lokasi);
  terapkanSkema(db);
  await isiDataSintetis(db);
  return db;
}

function hapusBerkasDatabase(lokasi) {
  if (path.extname(lokasi) !== '.db') {
    throw new Error(`Lokasi database harus berakhiran .db, diterima: ${lokasi}`);
  }
  for (const akhiran of ['', '-wal', '-shm', '-journal']) {
    fs.rmSync(lokasi + akhiran, { force: true });
  }
}

export function hitungBaris(db) {
  return Object.fromEntries(
    TABEL.map((t) => [t, db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n]),
  );
}
