// Enkripsi kolom di penyimpanan. Bukti lulus: kolom sensitif yang dibaca
// langsung dari database berupa ciphertext, bukan teks asli.

import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buatDatabaseSintetis } from '../src/server/db/index.js';
import { DONATUR, MUSTAHIK, nikSintetis } from '../src/server/db/data-sintetis.js';
import { Brankas } from '../src/server/keamanan/brankas.js';
import { bukaBungkusKunci, dekripsi, enkripsi, hmacNik, muatKunci } from '../src/server/keamanan/kripto.js';
import { kunciUji, masukSebagai, siapkanApp } from './bantuan.js';

const kunci32 = () => muatKunci({}).master;

describe('primitif AES-256-GCM', () => {
  it('dekripsi mengembalikan teks asli', () => {
    const k = kunci32();
    expect(dekripsi(k, enkripsi(k, 'Jl. Kenanga No. 12', 'mustahik.alamat'), 'mustahik.alamat')).toBe('Jl. Kenanga No. 12');
  });

  it('teks yang sama menghasilkan ciphertext berbeda (IV acak)', () => {
    const k = kunci32();
    expect(enkripsi(k, 'Sumarni', 'mustahik.nama')).not.toBe(enkripsi(k, 'Sumarni', 'mustahik.nama'));
  });

  it('menolak ciphertext yang diubah satu karakter', () => {
    const k = kunci32();
    const c = enkripsi(k, 'Sumarni', 'mustahik.nama');
    const tengah = Math.floor(c.length / 2);
    const rusak = c.slice(0, tengah) + (c[tengah] === 'A' ? 'B' : 'A') + c.slice(tengah + 1);
    expect(() => dekripsi(k, rusak, 'mustahik.nama')).toThrow();
  });

  it('menolak ciphertext yang dipindah ke kolom lain (AAD)', () => {
    const k = kunci32();
    const c = enkripsi(k, 'Sumarni', 'mustahik.nama');
    expect(() => dekripsi(k, c, 'mustahik.alamat')).toThrow();
  });

  it('menolak kunci yang salah', () => {
    const c = enkripsi(kunci32(), 'Sumarni', 'mustahik.nama');
    expect(() => dekripsi(kunci32(), c, 'mustahik.nama')).toThrow();
  });
});

describe('kunci dari variabel lingkungan', () => {
  const b64 = (isi) => Buffer.alloc(32, isi).toString('base64');

  it('membaca kunci 32 byte base64', () => {
    const k = muatKunci({ MASTER_KEY: b64(1), NIK_HMAC_KEY: b64(2) });
    expect(k.master.length).toBe(32);
    expect(k.sementara).toEqual([]);
  });

  it('menolak kunci yang panjangnya salah', () => {
    expect(() => muatKunci({ MASTER_KEY: 'pendek', NIK_HMAC_KEY: b64(2) })).toThrow(/32 byte/);
  });

  it('menolak kunci master yang sama dengan kunci HMAC', () => {
    expect(() => muatKunci({ MASTER_KEY: b64(7), NIK_HMAC_KEY: b64(7) })).toThrow(/berbeda/);
  });

  it('memakai kunci sementara bila tidak diisi, dan melaporkannya', () => {
    expect(muatKunci({}).sementara).toEqual(['MASTER_KEY', 'NIK_HMAC_KEY']);
  });
});

describe('isi database mentah', () => {
  let db;
  let kunci;
  beforeAll(async () => {
    ({ db, kunci } = await siapkanApp());
  });

  it('nama, alamat, dan kondisi mustahik tersimpan sebagai ciphertext', () => {
    const baris = db.prepare('SELECT nama, alamat, kondisi FROM mustahik').all();
    const mentah = JSON.stringify(baris);
    for (const m of MUSTAHIK) {
      expect(mentah).not.toContain(m.nama);
      expect(mentah).not.toContain(m.alamat);
      if (m.kondisi) expect(mentah).not.toContain(m.kondisi);
    }
    for (const b of baris) {
      expect(b.nama).toMatch(/^v1:/);
      expect(b.alamat).toMatch(/^v1:/);
    }
  });

  it('kontak donatur tersimpan sebagai ciphertext', () => {
    const mentah = JSON.stringify(db.prepare('SELECT kontak FROM donatur').all());
    for (const d of DONATUR.filter((x) => x.kontak)) expect(mentah).not.toContain(d.kontak);
  });

  it('seluruh berkas database di disk tidak memuat teks asli kolom terenkripsi', async () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tirai-uji-'));
    const lokasi = path.join(folder, 'uji.db');
    const dbBerkas = await buatDatabaseSintetis(lokasi, kunciUji());
    dbBerkas.close();
    const isi = fs.readFileSync(lokasi).toString('utf8');
    fs.rmSync(folder, { recursive: true, force: true });
    for (const m of MUSTAHIK) {
      expect(isi).not.toContain(m.nama);
      expect(isi).not.toContain(m.alamat);
    }
    for (const d of DONATUR.filter((x) => x.kontak)) expect(isi).not.toContain(d.kontak);
    // Pembanding: nama donatur memang tidak dienkripsi (hanya RBAC), jadi terlihat.
    expect(isi).toContain(DONATUR[0].nama);
  });

  it('kunci data tersimpan terbungkus dan hanya bisa dibuka dengan kunci master', () => {
    const { kunci_terbungkus } = db.prepare('SELECT kunci_terbungkus FROM kunci_data LIMIT 1').get();
    expect(kunci_terbungkus).toMatch(/^v1:/);
    expect(bukaBungkusKunci(kunci.master, kunci_terbungkus)).toHaveLength(32);
    expect(() => bukaBungkusKunci(muatKunci({}).master, kunci_terbungkus)).toThrow();
  });

  it('NIK tidak tersimpan; yang ada hanya HMAC 64 karakter heksadesimal', () => {
    const penanda = db.prepare('SELECT nik_hmac FROM mustahik').all().map((b) => b.nik_hmac);
    for (const p of penanda) expect(p).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(penanda)).not.toContain(nikSintetis(1));
    // HMAC berkunci: tanpa kunci yang sama, NIK tidak bisa dicocokkan dengan menebak.
    expect(hmacNik(muatKunci({}).nik, nikSintetis(1))).not.toBe(penanda[0]);
  });

  it('database menolak teks biasa di kolom terenkripsi', () => {
    expect(() =>
      db
        .prepare(
          `INSERT INTO mustahik (nama, alamat, asnaf, wilayah_id, dibuat_pada)
           VALUES ('Nama Asli', 'Alamat Asli', 'miskin', 1, '2026-11-25')`,
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it('kunci yang dimusnahkan membuat ciphertext tidak bisa dibuka lagi', () => {
    const brankas = new Brankas(db, kunci);
    const { nama, kunci_id } = db.prepare('SELECT nama, kunci_id FROM mustahik WHERE id = 9').get();
    expect(brankas.dekripsi(kunci_id, nama, 'mustahik.nama')).toBe(MUSTAHIK[8].nama);
    db.prepare(
      `UPDATE mustahik SET nama = NULL, alamat = NULL, kondisi = NULL, nik_hmac = NULL, kunci_id = NULL,
         dianonimkan_pada = '2026-11-25T00:00:00Z' WHERE id = 9`,
    ).run();
    brankas.musnahkan(kunci_id);
    expect(() => brankas.dekripsi(kunci_id, nama, 'mustahik.nama')).toThrow(/dimusnahkan/);
  });
});

describe('dekripsi hanya untuk yang boleh dilihat', () => {
  it('buku kas untuk admin tidak mendekripsi apa pun; untuk bendahara hanya nama', async () => {
    const { app } = await siapkanApp();
    const hitung = vi.spyOn(app.locals.brankas, 'dekripsi');

    await (await masukSebagai(app, 'admin')).get('/api/buku-kas');
    expect(hitung).not.toHaveBeenCalled();

    await (await masukSebagai(app, 'bendahara')).get('/api/buku-kas');
    const aad = new Set(hitung.mock.calls.map((c) => c[2]));
    expect([...aad]).toEqual(['mustahik.nama']);
  });
});

describe('pendaftaran mustahik oleh amil', () => {
  let app;
  let db;
  let amil;
  beforeAll(async () => {
    ({ app, db } = await siapkanApp());
    amil = await masukSebagai(app, 'amil-rw01');
  });

  const baru = { nama: 'Rukmini', alamat: 'Gg. Mawar No. 3, RT 02/RW 01', asnaf: 'fakir', nik: '0000000000000777' };

  it('tersimpan terenkripsi di wilayah amil itu dan terbaca kembali olehnya', async () => {
    const res = await amil.post('/api/mustahik').send(baru);
    expect(res.status).toBe(201);
    const mentah = db.prepare('SELECT * FROM mustahik WHERE id = ?').get(res.body.id);
    expect(mentah.wilayah_id).toBe(1);
    expect(JSON.stringify(mentah)).not.toContain('Rukmini');
    expect(JSON.stringify(mentah)).not.toContain(baru.nik);
    const daftar = await amil.get('/api/mustahik');
    expect(daftar.body.mustahik.find((m) => m.id === res.body.id)).toMatchObject({ nama: 'Rukmini', alamat: baru.alamat });
  });

  it('NIK yang sudah terdaftar, di wilayah mana pun, ditolak 409', async () => {
    const amil2 = await masukSebagai(app, 'amil-rw02');
    const res = await amil2.post('/api/mustahik').send({ ...baru, nama: 'Orang Lain', nik: nikSintetis(1) });
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).not.toMatch(/RW 0/);
  });

  it('NIK yang bukan 16 angka ditolak 400', async () => {
    expect((await amil.post('/api/mustahik').send({ ...baru, nik: '12345' })).status).toBe(400);
  });
});
