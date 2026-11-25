// Masuk, keluar, dan profil pengguna yang sedang masuk.

import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { catat } from '../audit.js';
import { cariAkun, bacaWilayah } from '../data/orang.js';
import { cocokkanSandi, hashSandi } from '../keamanan/sandi.js';
import { buatSesi, hapusCookieSesi, hapusSesi, pasangCookieSesi } from '../keamanan/sesi.js';
import { NAMA_PERAN } from '../../bersama/label.js';

const BATAS_GAGAL = 5;
const JENDELA_MS = 15 * 60 * 1000;

export function profil(db, pengguna) {
  return {
    id: pengguna.id,
    nama_pengguna: pengguna.nama_pengguna,
    peran: pengguna.peran,
    nama_peran: NAMA_PERAN[pengguna.peran],
    wilayah: pengguna.wilayah_id ? bacaWilayah(db, pengguna.wilayah_id) : null,
  };
}

export function ruteAutentikasi({ db, opsi }) {
  const r = Router();

  // Penghitung gagal masuk per nama pengguna, di memori.
  const gagal = new Map();
  let hashPengganti;

  const terkunci = (nama) => {
    const c = gagal.get(nama);
    if (!c) return false;
    if (Date.now() - c.mulai > JENDELA_MS) {
      gagal.delete(nama);
      return false;
    }
    return c.jumlah >= BATAS_GAGAL;
  };

  const catatGagal = (nama) => {
    if (gagal.size > 10000) gagal.clear();
    const c = gagal.get(nama) ?? { jumlah: 0, mulai: Date.now() };
    c.jumlah += 1;
    gagal.set(nama, c);
  };

  r.post('/masuk', async (req, res) => {
    const nama = typeof req.body?.nama_pengguna === 'string' ? req.body.nama_pengguna.trim().toLowerCase() : '';
    const sandi = typeof req.body?.kata_sandi === 'string' ? req.body.kata_sandi : '';
    if (!nama || !sandi || nama.length > 64 || sandi.length > 200) {
      return res.status(400).json({ error: 'Isi nama pengguna dan kata sandi' });
    }
    if (terkunci(nama)) {
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' });
    }

    const akun = cariAkun(db, nama);
    // Nama yang tidak terdaftar tetap diperiksa terhadap hash pengganti,
    // supaya lama proses tidak membocorkan nama mana yang terdaftar.
    hashPengganti ??= await hashSandi(randomBytes(16).toString('hex'));
    const cocok = await cocokkanSandi(sandi, akun?.kata_sandi_hash ?? hashPengganti);

    if (!akun || !cocok) {
      catatGagal(nama);
      // Nama yang dicoba dan kata sandinya tidak dicatat.
      catat(db, { pengguna: akun, aksi: 'gagal_masuk', objek: 'sesi' });
      return res.status(401).json({ error: 'Nama pengguna atau kata sandi salah' });
    }

    gagal.delete(nama);
    const token = buatSesi(db, akun.id);
    catat(db, { pengguna: akun, aksi: 'masuk', objek: 'sesi' });
    pasangCookieSesi(res, token, { aman: opsi.cookieAman });
    const lengkap = db.prepare('SELECT id, nama_pengguna, peran, wilayah_id FROM pengguna WHERE id = ?').get(akun.id);
    res.json({ pengguna: profil(db, lengkap) });
  });

  r.post('/keluar', (req, res) => {
    if (req.pengguna) catat(db, { pengguna: req.pengguna, aksi: 'keluar', objek: 'sesi' });
    hapusSesi(db, req.tokenSesi);
    hapusCookieSesi(res, { aman: opsi.cookieAman });
    res.status(204).end();
  });

  r.get('/saya', (req, res) => {
    res.json({ pengguna: req.pengguna ? profil(db, req.pengguna) : null });
  });

  return r;
}
