// Middleware keamanan Express.

import { boleh } from './kebijakan.js';
import { NAMA_COOKIE, bacaCookie, cariPenggunaSesi } from './sesi.js';

// Mengenali pengguna dari cookie sesi. Tanpa sesi, req.pengguna = null.
export function kenaliPengguna(db) {
  return (req, res, next) => {
    req.tokenSesi = bacaCookie(req, NAMA_COOKIE);
    req.pengguna = cariPenggunaSesi(db, req.tokenSesi);
    next();
  };
}

export function wajibMasuk(req, res, next) {
  if (!req.pengguna) return res.status(401).json({ error: 'Silakan masuk dulu' });
  next();
}

// Lolos jika peran pengguna punya salah satu hak yang disebut.
export function wajib(...hak) {
  return (req, res, next) => {
    if (!req.pengguna) return res.status(401).json({ error: 'Silakan masuk dulu' });
    if (!hak.some((h) => boleh(req.pengguna.peran, h))) {
      return res.status(403).json({ error: 'Peran Anda tidak punya akses ke data ini' });
    }
    next();
  };
}

export function headerKeamanan(req, res, next) {
  res.set({
    'Content-Security-Policy': [
      "default-src 'self'",
      "img-src 'self' data:",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  });
  next();
}

// Lapisan kedua penahan CSRF (lapisan pertama: cookie SameSite=Strict).
// Permintaan yang mengubah data dari asal (Origin) lain ditolak.
export function asalSama(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const asal = req.headers.origin;
  if (asal) {
    let hostAsal;
    try {
      hostAsal = new URL(asal).host;
    } catch {
      hostAsal = null;
    }
    if (hostAsal !== req.headers.host) {
      return res.status(403).json({ error: 'Permintaan dari situs lain ditolak' });
    }
  }
  next();
}
