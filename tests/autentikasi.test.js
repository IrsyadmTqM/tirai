import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { KATA_SANDI_DEMO } from '../src/server/db/data-sintetis.js';
import { masukSebagai, siapkanApp } from './bantuan.js';

describe('masuk dan sesi', () => {
  let app;
  let db;
  beforeAll(async () => {
    ({ app, db } = await siapkanApp());
  });

  it('masuk berhasil memasang cookie HttpOnly dan SameSite=Strict', async () => {
    const res = await request(app).post('/api/masuk').send({ nama_pengguna: 'bendahara', kata_sandi: KATA_SANDI_DEMO });
    expect(res.status).toBe(200);
    expect(res.body.pengguna).toMatchObject({ nama_pengguna: 'bendahara', peran: 'bendahara' });
    expect(JSON.stringify(res.body)).not.toMatch(/scrypt|kata_sandi/);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/tirai_sesi=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it('database hanya menyimpan hash token sesi, bukan token aslinya', async () => {
    const res = await request(app).post('/api/masuk').send({ nama_pengguna: 'admin', kata_sandi: KATA_SANDI_DEMO });
    const token = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
    const disimpan = db.prepare('SELECT token_hash FROM sesi').all().map((s) => s.token_hash);
    expect(disimpan.length).toBeGreaterThan(0);
    expect(disimpan).not.toContain(token);
    for (const h of disimpan) expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('kata sandi salah dan nama tak terdaftar mendapat jawaban yang sama', async () => {
    const salah = await request(app).post('/api/masuk').send({ nama_pengguna: 'amil-rw02', kata_sandi: 'keliru' });
    const takAda = await request(app).post('/api/masuk').send({ nama_pengguna: 'tidak-ada', kata_sandi: 'keliru' });
    expect(salah.status).toBe(401);
    expect(takAda.status).toBe(401);
    expect(salah.body).toEqual(takAda.body);
  });

  it('masukan kosong atau bukan teks ditolak 400', async () => {
    expect((await request(app).post('/api/masuk').send({})).status).toBe(400);
    expect((await request(app).post('/api/masuk').send({ nama_pengguna: ['admin'], kata_sandi: 1 })).status).toBe(400);
  });

  it('setelah 5 kali gagal, percobaan berikutnya ditolak 429 walau kata sandinya benar', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/masuk').send({ nama_pengguna: 'donatur-02', kata_sandi: `tebak-${i}` });
      expect(res.status).toBe(401);
    }
    const res = await request(app).post('/api/masuk').send({ nama_pengguna: 'donatur-02', kata_sandi: KATA_SANDI_DEMO });
    expect(res.status).toBe(429);
  });

  it('keluar menghapus sesi di server', async () => {
    const agen = await masukSebagai(app, 'bendahara');
    expect((await agen.get('/api/buku-kas')).status).toBe(200);
    expect((await agen.post('/api/keluar')).status).toBe(204);
    expect((await agen.get('/api/buku-kas')).status).toBe(401);
  });

  it('sesi yang kedaluwarsa ditolak', async () => {
    const agen = await masukSebagai(app, 'bendahara');
    db.prepare("UPDATE sesi SET kedaluwarsa_pada = '2000-01-01T00:00:00.000Z'").run();
    expect((await agen.get('/api/buku-kas')).status).toBe(401);
  });

  it('GET /api/saya tanpa sesi menjawab pengguna null', async () => {
    const res = await request(app).get('/api/saya');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pengguna: null });
  });
});

describe('perlindungan web dasar', () => {
  let app;
  beforeAll(async () => {
    ({ app } = await siapkanApp());
  });

  it('memasang header keamanan dan melarang cache untuk API', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(res.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('menolak permintaan pengubah data dari situs lain (CSRF)', async () => {
    const agen = await masukSebagai(app, 'bendahara');
    const res = await agen
      .post('/api/donasi')
      .set('Origin', 'https://situs-jahat.test')
      .send({ jenis: 'infak', nominal: 1000, tanggal: '2026-11-01' });
    expect(res.status).toBe(403);
  });

  it('JSON rusak dijawab 400 tanpa membocorkan rincian server', async () => {
    const res = await request(app).post('/api/masuk').set('Content-Type', 'application/json').send('{"rusak":');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at |node_modules|SyntaxError/);
  });

  it('upaya SQL injection lewat nama pengguna tidak membuka akses', async () => {
    const res = await request(app)
      .post('/api/masuk')
      .send({ nama_pengguna: "admin' OR '1'='1", kata_sandi: "' OR '1'='1" });
    expect(res.status).toBe(401);
  });
});
