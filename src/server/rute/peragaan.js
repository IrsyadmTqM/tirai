// Peragaan di beranda: pengunjung memilih peran dan melihat buku kas
// persis seperti yang dikirim server untuk peran itu. Penyaringan memakai
// kebijakan RBAC yang sama dengan akun sungguhan.
//
// Karena pengunjung bisa memilih peran tanpa masuk, mode ini hanya pantas
// untuk data sintetis. Pada pemasangan sungguhan, matikan dengan
// MODE_PERAGAAN=mati di .env.

import { Router } from 'express';
import { cariAkunMenurutPeran } from '../data/orang.js';
import { susunBukuKas } from '../layanan/buku-kas.js';
import * as v from '../validasi.js';

export const PERAN_PERAGAAN = ['admin', 'bendahara', 'amil'];

export function rutePeragaan({ db, opsi }) {
  const r = Router();

  r.get('/peragaan/buku-kas', (req, res) => {
    if (!opsi.peragaan) return res.status(404).json({ error: 'Mode peragaan dimatikan' });
    const peran = v.pilihan(req.query.peran, 'Peran', PERAN_PERAGAAN);
    const akun = cariAkunMenurutPeran(db, peran);
    if (!akun) return res.status(404).json({ error: 'Akun peragaan tidak ada' });
    const { tampilan } = susunBukuKas(db, akun);
    res.json({ ...tampilan, peragaan: true });
  });

  return r;
}
