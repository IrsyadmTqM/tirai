// Audit log. Bukti lulus: tiap aksi sensitif tercatat, catatan tidak bisa
// diubah atau dihapus, dan isinya tidak memuat data pribadi asli.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { DONATUR, KATA_SANDI_DEMO, MUSTAHIK, nikSintetis } from '../src/server/db/data-sintetis.js';
import { masukSebagai, siapkanApp } from './bantuan.js';

const semuaLog = (db) => db.prepare('SELECT * FROM audit_log ORDER BY id').all().map((b) => ({ ...b }));
const logSejak = (db, id) => semuaLog(db).filter((b) => b.id > id);
const idTerakhir = (db) => db.prepare('SELECT COALESCE(MAX(id), 0) AS n FROM audit_log').get().n;

describe('audit log hanya bisa ditambah', () => {
  let db;
  beforeAll(async () => {
    ({ db } = await siapkanApp());
    db.prepare(
      `INSERT INTO audit_log (waktu, aksi, objek, saluran) VALUES ('2026-11-25T00:00:00Z', 'baca', 'buku_kas', 'aplikasi')`,
    ).run();
  });

  it('UPDATE ditolak oleh trigger database', () => {
    expect(() => db.prepare("UPDATE audit_log SET aksi = 'ubah'").run()).toThrow(/hanya bisa ditambah/);
  });

  it('DELETE ditolak oleh trigger database', () => {
    expect(() => db.prepare('DELETE FROM audit_log').run()).toThrow(/hanya bisa ditambah/);
  });

  it('kolom tidak menerima teks bebas', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO audit_log (waktu, aksi, objek, saluran) VALUES ('2026-11-25T00:00:00Z', 'membaca alamat Sumarni', 'buku_kas', 'aplikasi')`,
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it('aplikasi tidak menyediakan endpoint untuk mengubah atau menghapus catatan', async () => {
    const { app } = await siapkanApp();
    const admin = await masukSebagai(app, 'admin');
    expect((await admin.delete('/api/audit/1')).status).toBe(404);
    expect((await admin.patch('/api/audit/1').send({ aksi: 'baca' })).status).toBe(404);
    expect((await admin.delete('/api/audit')).status).toBe(404);
  });
});

describe('aksi sensitif tercatat', () => {
  let app;
  let db;
  beforeAll(async () => {
    ({ app, db } = await siapkanApp());
  });

  it('masuk berhasil dan gagal tercatat, tanpa nama dan kata sandi yang dicoba', async () => {
    const awal = idTerakhir(db);
    await request(app).post('/api/masuk').send({ nama_pengguna: 'bendahara', kata_sandi: 'salah-ketik-rahasia' });
    await request(app).post('/api/masuk').send({ nama_pengguna: 'nama-asing', kata_sandi: 'x' });
    await request(app).post('/api/masuk').send({ nama_pengguna: 'bendahara', kata_sandi: KATA_SANDI_DEMO });
    const log = logSejak(db, awal);
    expect(log.map((l) => l.aksi)).toEqual(['gagal_masuk', 'gagal_masuk', 'masuk']);
    expect(log[0].pengguna_id).toBe(2);
    expect(log[1].pengguna_id).toBeNull();
    expect(JSON.stringify(log)).not.toMatch(/salah-ketik-rahasia|nama-asing/);
  });

  it('bendahara membaca buku kas: 1 catatan umum + 1 per mustahik yang namanya terlihat', async () => {
    const bendahara = await masukSebagai(app, 'bendahara');
    const awal = idTerakhir(db);
    await bendahara.get('/api/buku-kas');
    const log = logSejak(db, awal);
    expect(log.filter((l) => l.objek === 'buku_kas')).toHaveLength(1);
    const orang = log.filter((l) => l.objek === 'mustahik');
    const penerima = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(orang.map((l) => l.subjek_id))).toEqual(penerima);
    expect(orang.every((l) => l.peran === 'bendahara' && l.aksi === 'baca')).toBe(true);
  });

  it('amil RW 01 membaca buku kas: hanya mustahik RW 01 yang tercatat', async () => {
    const amil = await masukSebagai(app, 'amil-rw01');
    const awal = idTerakhir(db);
    await amil.get('/api/buku-kas');
    const orang = logSejak(db, awal).filter((l) => l.objek === 'mustahik');
    expect(orang.map((l) => l.subjek_id).sort()).toEqual([1, 2, 3]);
  });

  it('admin membaca buku kas: tidak ada mustahik yang tercatat terbuka', async () => {
    const admin = await masukSebagai(app, 'admin');
    const awal = idTerakhir(db);
    await admin.get('/api/buku-kas');
    const log = logSejak(db, awal);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ objek: 'buku_kas', subjek_id: null });
  });

  it('pencatatan donasi, penyaluran, mustahik baru, dan perubahan peran tercatat', async () => {
    const bendahara = await masukSebagai(app, 'bendahara');
    const amil = await masukSebagai(app, 'amil-rw01');
    const admin = await masukSebagai(app, 'admin');
    const awal = idTerakhir(db);
    await bendahara.post('/api/donasi').send({ donatur_id: 3, jenis: 'infak', nominal: 10000, tanggal: '2026-11-20' });
    await bendahara.post('/api/penyaluran').send({ mustahik_id: 4, jenis_dana: 'infak', nominal: 10000, tanggal: '2026-11-21' });
    const baru = await amil
      .post('/api/mustahik')
      .send({ nama: 'Penerima Baru', alamat: 'Jl. Baru No. 1, RW 01', asnaf: 'miskin', nik: '0000000000000555' });
    await admin.patch('/api/pengguna/4').send({ peran: 'amil', wilayah_id: 3 });
    const log = logSejak(db, awal).map((l) => [l.peran, l.aksi, l.objek, l.subjek_jenis, l.subjek_id]);
    expect(log).toEqual([
      ['bendahara', 'buat', 'donasi', 'donatur', 3],
      ['bendahara', 'buat', 'penyaluran', 'mustahik', 4],
      ['amil', 'buat', 'mustahik', 'mustahik', baru.body.id],
      ['admin', 'ubah', 'pengguna', 'pengguna', 4],
    ]);
  });

  it('membaca audit log juga tercatat', async () => {
    const admin = await masukSebagai(app, 'admin');
    const awal = idTerakhir(db);
    const res = await admin.get('/api/audit?batas=5');
    expect(res.status).toBe(200);
    expect(res.body.log.length).toBeLessThanOrEqual(5);
    expect(logSejak(db, awal)).toEqual([expect.objectContaining({ aksi: 'baca', objek: 'audit_log', peran: 'admin' })]);
  });

  it('peragaan beranda tercatat dengan saluran "peragaan" dan catatannya dikirim balik', async () => {
    const awal = idTerakhir(db);
    const res = await request(app).get('/api/peragaan/buku-kas?peran=amil');
    const log = logSejak(db, awal);
    expect(log.length).toBeGreaterThan(0);
    expect(log.every((l) => l.saluran === 'peragaan')).toBe(true);
    expect(res.body.log.map((l) => l.id)).toEqual(log.map((l) => l.id));
  });

  it('seluruh isi audit log tidak memuat data pribadi asli', () => {
    const isi = JSON.stringify(semuaLog(db));
    const pribadi = [
      ...MUSTAHIK.flatMap((m) => [m.nama, m.alamat, m.kondisi, nikSintetis(m.id)]),
      ...DONATUR.flatMap((d) => [d.nama, d.kontak]),
      KATA_SANDI_DEMO,
      'Penerima Baru',
    ].filter(Boolean);
    for (const nilai of pribadi) expect(isi, `bocor: ${nilai}`).not.toContain(nilai);
  });
});
