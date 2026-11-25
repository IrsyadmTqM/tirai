// Peragaan di beranda: pengunjung memilih peran dan melihat buku kas
// persis seperti yang dikirim server untuk peran itu. Penyaringan memakai
// kebijakan RBAC yang sama dengan akun sungguhan.
//
// Karena pengunjung bisa memilih peran tanpa masuk, mode ini hanya pantas
// untuk data sintetis. Pada pemasangan sungguhan, matikan dengan
// MODE_PERAGAAN=mati di .env.

import { Router } from 'express';
import { cariAkunMenurutPeran } from '../data/orang.js';
import { catatAksesBukuKas, susunBukuKas } from '../layanan/buku-kas.js';
import * as v from '../validasi.js';

export const PERAN_PERAGAAN = ['admin', 'bendahara', 'amil'];

export function rutePeragaan({ db, brankas, opsi }) {
  const r = Router();

  r.get('/peragaan/buku-kas', (req, res) => {
    if (!opsi.peragaan) return res.status(404).json({ error: 'Mode peragaan dimatikan' });
    const peran = v.pilihan(req.query.peran, 'Peran', PERAN_PERAGAAN);
    const akun = cariAkunMenurutPeran(db, peran);
    if (!akun) return res.status(404).json({ error: 'Akun peragaan tidak ada' });
    const { tampilan, terbuka } = susunBukuKas(db, brankas, akun);
    // Akses peragaan juga dicatat, dengan saluran "peragaan". Catatannya
    // dikirim balik supaya beranda bisa menampilkan baris audit log yang
    // baru masuk.
    const log = catatAksesBukuKas(db, akun, terbuka, 'peragaan');
    res.json({ ...tampilan, peragaan: true, log });
  });

  return r;
}
