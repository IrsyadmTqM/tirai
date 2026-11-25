// Mustahik, akun pengguna, dan wilayah.

import { Router } from 'express';
import { bacaPengguna, bacaWilayah, daftarMustahik, daftarPengguna, daftarWilayah, ubahPeran } from '../data/orang.js';
import { boleh } from '../keamanan/kebijakan.js';
import { wajib } from '../keamanan/middleware.js';
import * as v from '../validasi.js';

const PERAN_STAF = ['admin', 'bendahara', 'amil'];

export function ruteOrang({ db }) {
  const r = Router();

  r.get('/mustahik', wajib('mustahik:baca_wilayah', 'mustahik:baca_terbatas'), (req, res) => {
    const p = req.pengguna;
    if (boleh(p.peran, 'mustahik:baca_wilayah')) {
      // Amil: data lengkap, hanya wilayahnya.
      return res.json({ mustahik: daftarMustahik(db, { wilayahId: p.wilayah_id }) });
    }
    // Bendahara: tanpa alamat dan kondisi.
    const mustahik = daftarMustahik(db).map((m) => ({
      id: m.id,
      nama: m.nama,
      asnaf: m.asnaf,
      wilayah: m.wilayah,
    }));
    res.json({ mustahik });
  });

  r.get('/pengguna', wajib('pengguna:kelola'), (req, res) => {
    res.json({ pengguna: daftarPengguna(db) });
  });

  r.get('/wilayah', wajib('pengguna:kelola'), (req, res) => {
    res.json({ wilayah: daftarWilayah(db) });
  });

  // Mengubah peran akun staf. Akun pemilik data tidak bisa diubah menjadi
  // staf (dan sebaliknya), dan admin tidak bisa mengubah perannya sendiri.
  r.patch('/pengguna/:id', wajib('pengguna:kelola'), (req, res) => {
    const id = v.idDariJalur(req.params.id);
    const sasaran = bacaPengguna(db, id);
    if (!sasaran) return res.status(404).json({ error: 'Akun tidak ditemukan' });
    if (sasaran.id === req.pengguna.id) throw new v.GalatPermintaan('Tidak bisa mengubah peran sendiri');
    if (!PERAN_STAF.includes(sasaran.peran)) throw new v.GalatPermintaan('Hanya akun staf yang bisa diubah perannya');

    const peran = v.pilihan(req.body?.peran, 'Peran', PERAN_STAF);
    let wilayahId = null;
    if (peran === 'amil') {
      wilayahId = v.bilanganBulat(req.body?.wilayah_id, 'Wilayah');
      if (!bacaWilayah(db, wilayahId)) throw new v.GalatPermintaan('Wilayah tidak ditemukan');
    }
    ubahPeran(db, id, { peran, wilayahId });
    res.json({ pengguna: bacaPengguna(db, id) });
  });

  return r;
}
