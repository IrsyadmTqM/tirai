// Audit log untuk admin. Hanya ada endpoint baca: aplikasi tidak
// menyediakan cara mengubah atau menghapus catatan.

import { Router } from 'express';
import { bacaAudit, catat } from '../audit.js';
import { wajib } from '../keamanan/middleware.js';

export function ruteAudit({ db }) {
  const r = Router();

  r.get('/audit', wajib('audit:baca'), (req, res) => {
    const batas = Math.min(Math.max(Number.parseInt(req.query.batas, 10) || 200, 1), 500);
    // Membaca audit log juga dicatat.
    catat(db, { pengguna: req.pengguna, aksi: 'baca', objek: 'audit_log' });
    res.json({ log: bacaAudit(db, { batas }) });
  });

  return r;
}
