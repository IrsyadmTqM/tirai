// Mustahik, akun pengguna, dan wilayah.

import { Router } from 'express';
import { ASNAF } from '../../bersama/label.js';
import { dalamTransaksi } from '../db/index.js';
import {
  bacaPengguna,
  bacaWilayah,
  daftarMustahik,
  daftarPengguna,
  daftarWilayah,
  nikTerdaftar,
  tambahMustahik,
  ubahPeran,
} from '../data/orang.js';
import { normalkanNik } from '../keamanan/kripto.js';
import { boleh } from '../keamanan/kebijakan.js';
import { wajib } from '../keamanan/middleware.js';
import * as v from '../validasi.js';

const PERAN_STAF = ['admin', 'bendahara', 'amil'];

export function ruteOrang({ db, brankas }) {
  const r = Router();

  r.get('/mustahik', wajib('mustahik:baca_wilayah', 'mustahik:baca_terbatas'), (req, res) => {
    const p = req.pengguna;
    if (boleh(p.peran, 'mustahik:baca_wilayah')) {
      // Amil: data lengkap, hanya wilayahnya.
      const mustahik = daftarMustahik(db, brankas, { wilayahId: p.wilayah_id, buka: ['nama', 'alamat', 'kondisi'] });
      return res.json({ mustahik });
    }
    // Bendahara: hanya nama yang didekripsi; alamat dan kondisi tidak.
    const mustahik = daftarMustahik(db, brankas, { buka: ['nama'] }).map(({ id, nama, asnaf, wilayah }) => ({
      id,
      nama,
      asnaf,
      wilayah,
    }));
    res.json({ mustahik });
  });

  // Amil mendaftarkan mustahik baru di wilayahnya. NIK hanya dipakai untuk
  // menghitung HMAC penanda duplikat, lalu dibuang.
  r.post('/mustahik', wajib('mustahik:catat_wilayah'), (req, res) => {
    const b = req.body ?? {};
    const nik = normalkanNik(b.nik);
    if (!/^\d{16}$/.test(nik)) throw new v.GalatPermintaan('NIK harus 16 angka');
    const data = {
      nama: v.teks(b.nama, 'Nama', { maks: 100 }),
      alamat: v.teks(b.alamat, 'Alamat', { maks: 200 }),
      kondisi: v.teks(b.kondisi, 'Kondisi', { maks: 200, boleh_kosong: true }),
      asnaf: v.pilihan(b.asnaf, 'Asnaf', ASNAF),
      wilayahId: req.pengguna.wilayah_id,
      nikHmac: brankas.hmacNik(nik),
    };
    // Pesan tidak menyebut di wilayah mana NIK itu terdaftar.
    if (nikTerdaftar(db, data.nikHmac)) {
      return res.status(409).json({ error: 'NIK ini sudah terdaftar sebagai penerima' });
    }
    const id = dalamTransaksi(db, () => tambahMustahik(db, brankas, data));
    res.status(201).json({ id });
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
