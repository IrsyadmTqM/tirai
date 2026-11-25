import { describe, it, expect, beforeAll } from 'vitest';
import {
  TABEL,
  bukaDatabase,
  buatDatabaseSintetis,
  hitungBaris,
  terapkanSkema,
} from '../src/server/db/index.js';
import { INVENTARIS } from '../src/server/db/inventaris.js';
import * as data from '../src/server/db/data-sintetis.js';
import { cocokkanSandi } from '../src/server/keamanan/sandi.js';

function daftarTabel(db) {
  return db
    .prepare(
      `SELECT name, strict FROM pragma_table_list
       WHERE schema = 'main' AND type = 'table' AND name NOT LIKE 'sqlite_%'`,
    )
    .all();
}

function daftarKolom(db, tabel) {
  return db.prepare('SELECT name FROM pragma_table_info(?)').all(tabel).map((k) => k.name);
}

describe('skema dan minimisasi data', () => {
  const db = bukaDatabase();
  terapkanSkema(db);

  it('membuat tepat tabel yang tercatat di inventaris', () => {
    const nama = daftarTabel(db).map((t) => t.name).sort();
    expect(nama).toEqual([...TABEL].sort());
    expect(Object.keys(INVENTARIS).sort()).toEqual([...TABEL].sort());
  });

  it('semua tabel STRICT, sehingga tipe kolom ditegakkan', () => {
    for (const t of daftarTabel(db)) expect(t.strict, t.name).toBe(1);
  });

  it.each(TABEL)('setiap kolom tabel %s punya alasan tertulis', (tabel) => {
    const kolom = daftarKolom(db, tabel);
    for (const k of kolom) {
      expect(INVENTARIS[tabel][k]?.alasan, `${tabel}.${k} tanpa alasan`).toMatch(/\S/);
    }
    // Sebaliknya: inventaris tidak boleh mencatat kolom yang tidak ada.
    expect(Object.keys(INVENTARIS[tabel]).sort()).toEqual([...kolom].sort());
  });

  it('tidak ada kolom untuk data yang sengaja tidak dikumpulkan', () => {
    const terlarang = new Set(['ktp', 'foto', 'gps', 'lokasi', 'latitude', 'longitude', 'lat', 'lng', 'telepon']);
    for (const tabel of TABEL) {
      for (const k of daftarKolom(db, tabel)) {
        const kata = k.split('_');
        expect(kata.some((w) => terlarang.has(w)), `${tabel}.${k}`).toBe(false);
        // NIK hanya boleh muncul sebagai HMAC, tidak pernah utuh.
        if (kata.includes('nik')) expect(k, `${tabel}.${k}`).toBe('nik_hmac');
      }
    }
  });
});

describe('batasan integritas di database', () => {
  let db;
  beforeAll(async () => {
    db = await buatDatabaseSintetis();
  });

  const waktu = data.AWAL_DATA;
  const tambahMustahik = (wilayah, asnaf = 'miskin', nik = null) =>
    db
      .prepare(
        `INSERT INTO mustahik (nama, alamat, asnaf, wilayah_id, nik_hmac, dibuat_pada)
         VALUES ('Uji', 'Alamat uji', ?, ?, ?, ?)`,
      )
      .run(asnaf, wilayah, nik, waktu);
  const tambahPengguna = (nama, peran, { wilayah = null, donatur = null, mustahik = null } = {}) =>
    db
      .prepare(
        `INSERT INTO pengguna
           (nama_pengguna, kata_sandi_hash, peran, wilayah_id, donatur_id, mustahik_id, dibuat_pada)
         VALUES (?, 'scrypt$uji', ?, ?, ?, ?, ?)`,
      )
      .run(nama, peran, wilayah, donatur, mustahik, waktu);

  it('menolak mustahik di wilayah yang tidak ada (foreign key)', () => {
    expect(() => tambahMustahik(999)).toThrow(/FOREIGN KEY/);
  });

  it('menolak asnaf di luar delapan kategori', () => {
    expect(() => tambahMustahik(1, 'pengemis')).toThrow(/CHECK/);
  });

  it('menolak nominal nol atau negatif', () => {
    const sql = `INSERT INTO donasi (jenis, nominal, tanggal, dicatat_oleh, dibuat_pada)
                 VALUES ('infak', ?, '2026-11-25', 2, ?)`;
    expect(() => db.prepare(sql).run(0, waktu)).toThrow(/CHECK/);
    expect(() => db.prepare(sql).run(-5000, waktu)).toThrow(/CHECK/);
  });

  it('menolak teks di kolom angka (STRICT)', () => {
    const sql = `INSERT INTO donasi (jenis, nominal, tanggal, dicatat_oleh, dibuat_pada)
                 VALUES ('infak', 'seratus ribu', '2026-11-25', 2, ?)`;
    expect(() => db.prepare(sql).run(waktu)).toThrow(/cannot store TEXT value in INTEGER column/);
  });

  it('amil wajib punya wilayah, peran lain tidak boleh', () => {
    expect(() => tambahPengguna('amil-tanpa-wilayah', 'amil')).toThrow(/CHECK/);
    expect(() => tambahPengguna('admin-berwilayah', 'admin', { wilayah: 1 })).toThrow(/CHECK/);
  });

  it('akun pemilik data wajib tertaut ke tepat satu donatur atau mustahik', () => {
    expect(() => tambahPengguna('pemilik-yatim', 'pemilik')).toThrow(/CHECK/);
    expect(() => tambahPengguna('pemilik-ganda', 'pemilik', { donatur: 3, mustahik: 1 })).toThrow(/CHECK/);
    expect(() => tambahPengguna('bendahara-tertaut', 'bendahara', { donatur: 3 })).toThrow(/CHECK/);
  });

  it('menolak penanda NIK yang sama untuk dua mustahik (cegah penerima ganda)', () => {
    tambahMustahik(1, 'miskin', 'hmac-uji-sama');
    expect(() => tambahMustahik(2, 'miskin', 'hmac-uji-sama')).toThrow(/UNIQUE/);
  });
});

describe('data sintetis', () => {
  let db;
  beforeAll(async () => {
    db = await buatDatabaseSintetis();
  });

  it('jumlah baris sesuai data sumber', () => {
    expect(hitungBaris(db)).toEqual({
      wilayah: data.WILAYAH.length,
      donatur: data.DONATUR.length,
      mustahik: data.MUSTAHIK.length,
      pengguna: data.PENGGUNA.length,
      donasi: data.DONASI.length,
      penyaluran: data.PENYALURAN.length,
    });
  });

  it('kontak donatur hanya memakai domain .test yang dicadangkan', () => {
    const kontak = db.prepare('SELECT kontak FROM donatur WHERE kontak IS NOT NULL').all();
    expect(kontak.length).toBeGreaterThan(0);
    for (const { kontak: k } of kontak) expect(k).toMatch(/@contoh\.test$/);
  });

  it('ada akun untuk setiap peran', () => {
    const peran = db.prepare('SELECT peran, COUNT(*) AS n FROM pengguna GROUP BY peran ORDER BY peran').all();
    expect(peran.map((p) => [p.peran, p.n])).toEqual([
      ['admin', 1],
      ['amil', 2],
      ['bendahara', 1],
      ['pemilik', 2],
    ]);
  });

  it('kata sandi tidak disimpan dalam bentuk asli', async () => {
    const akun = db.prepare('SELECT kata_sandi_hash AS h FROM pengguna').all();
    for (const { h } of akun) {
      expect(h).not.toContain(data.KATA_SANDI_DEMO);
      expect(h).toMatch(/^scrypt\$32768\$8\$3\$/);
    }
    // Salt acak: hash tiap akun berbeda walaupun kata sandinya sama.
    expect(new Set(akun.map((a) => a.h)).size).toBe(akun.length);

    expect(await cocokkanSandi(data.KATA_SANDI_DEMO, akun[0].h)).toBe(true);
    expect(await cocokkanSandi('tebakan-salah', akun[0].h)).toBe(false);
  });

  it('penyaluran tiap jenis dana tidak melebihi dana yang masuk', () => {
    const saldo = db
      .prepare(
        `SELECT p.jenis_dana AS jenis,
                (SELECT SUM(nominal) FROM donasi d WHERE d.jenis = p.jenis_dana) AS masuk,
                SUM(p.nominal) AS keluar
         FROM penyaluran p GROUP BY p.jenis_dana`,
      )
      .all();
    expect(saldo.length).toBeGreaterThan(0);
    for (const s of saldo) expect(s.keluar, s.jenis).toBeLessThanOrEqual(s.masuk);
  });
});
