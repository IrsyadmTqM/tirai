// Mustahik, akun pengguna, dan wilayah.

import { Router } from 'express';
import { ASNAF } from '../../bersama/label.js';
import { catat, catatUntukBanyak } from '../audit.js';
import { dalamTransaksi } from '../db/index.js';
import {
  bacaPengguna,
  bacaWilayah,
  daftarMustahik,
  daftarPengguna,
  daftarWilayah,
  mustahikAktifDiWilayah,
  nikTerdaftar,
  tambahMustahik,
  ubahPeran,
} from '../data/orang.js';
import { normalkanNik } from '../keamanan/kripto.js';
import { kirimEkspor, paketEkspor } from '../layanan/data-pribadi.js';
import { ajukanHapus, permintaanTerakhir } from '../layanan/penghapusan.js';
import { boleh } from '../keamanan/kebijakan.js';
import { wajib } from '../keamanan/middleware.js';
import * as v from '../validasi.js';

const PERAN_STAF = ['admin', 'bendahara', 'amil'];

export function ruteOrang({ db, brankas }) {
  const r = Router();

  const catatBacaMustahik = (pengguna, daftar) =>
    catatUntukBanyak(db, {
      pengguna,
      aksi: 'baca',
      objek: 'mustahik',
      subjekJenis: 'mustahik',
      subjekIds: daftar.map((m) => m.id),
    });

  r.get('/mustahik', wajib('mustahik:baca_wilayah', 'mustahik:baca_terbatas'), (req, res) => {
    const p = req.pengguna;
    if (boleh(p.peran, 'mustahik:baca_wilayah')) {
      // Amil: data lengkap, hanya wilayahnya.
      const mustahik = daftarMustahik(db, brankas, { wilayahId: p.wilayah_id, buka: ['nama', 'alamat', 'kondisi'] });
      catatBacaMustahik(p, mustahik);
      return res.json({ mustahik });
    }
    // Bendahara: hanya nama yang didekripsi; alamat dan kondisi tidak.
    const mustahik = daftarMustahik(db, brankas, { buka: ['nama'] }).map(({ id, nama, asnaf, wilayah }) => ({
      id,
      nama,
      asnaf,
      wilayah,
    }));
    catatBacaMustahik(p, mustahik);
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
    catat(db, { pengguna: req.pengguna, aksi: 'buat', objek: 'mustahik', subjek: { jenis: 'mustahik', id } });
    res.status(201).json({ id });
  });

  // Hak mustahik yang tidak punya akun dijalankan lewat amil wilayahnya.
  // Mustahik di wilayah lain dijawab 404, bukan 403, supaya keberadaannya
  // tidak terbaca.
  const subjekMustahikWilayah = (req) => {
    const id = v.idDariJalur(req.params.id);
    if (!mustahikAktifDiWilayah(db, id, req.pengguna.wilayah_id)) {
      throw new v.GalatPermintaan('Mustahik tidak ditemukan di wilayah Anda', 404);
    }
    return { jenis: 'mustahik', id };
  };

  r.get('/mustahik/:id/ekspor', wajib('mustahik:ekspor_wilayah'), (req, res) => {
    const subjek = subjekMustahikWilayah(req);
    const format = v.pilihan(req.query.format ?? 'json', 'Format', ['json', 'csv']);
    catat(db, { pengguna: req.pengguna, aksi: 'ekspor', objek: 'mustahik', subjek });
    kirimEkspor(res, paketEkspor(db, brankas, subjek), format, `data-mustahik-${subjek.id}`);
  });

  r.post('/mustahik/:id/hapus', wajib('mustahik:hapus_wilayah'), (req, res) => {
    const subjek = subjekMustahikWilayah(req);
    const id = ajukanHapus(db, { subjek, diajukanPeran: 'amil' });
    catat(db, { pengguna: req.pengguna, aksi: 'buat', objek: 'permintaan', subjek });
    res.status(201).json({ id, permintaan_hapus: permintaanTerakhir(db, subjek) });
  });

  r.get('/pengguna', wajib('pengguna:kelola'), (req, res) => {
    catat(db, { pengguna: req.pengguna, aksi: 'baca', objek: 'pengguna' });
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
    catat(db, { pengguna: req.pengguna, aksi: 'ubah', objek: 'pengguna', subjek: { jenis: 'pengguna', id } });
    res.json({ pengguna: bacaPengguna(db, id) });
  });

  return r;
}
