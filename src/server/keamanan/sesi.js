// Sesi masuk berbasis cookie.
// - Token acak 32 byte dari crypto.randomBytes, dikirim sebagai cookie
//   HttpOnly (tidak bisa dibaca JavaScript) dan SameSite=Strict (tidak ikut
//   terkirim dari situs lain, menahan CSRF).
// - Database hanya menyimpan hash SHA-256 token.

import { createHash, randomBytes } from 'node:crypto';

export const NAMA_COOKIE = 'tirai_sesi';
const UMUR_SESI_DETIK = 8 * 60 * 60;

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export function buatSesi(db, penggunaId) {
  const token = randomBytes(32).toString('base64url');
  const kedaluwarsa = new Date(Date.now() + UMUR_SESI_DETIK * 1000).toISOString();
  db.prepare('INSERT INTO sesi (token_hash, pengguna_id, kedaluwarsa_pada) VALUES (?, ?, ?)').run(
    hashToken(token),
    penggunaId,
    kedaluwarsa,
  );
  return token;
}

// Mengembalikan data pengguna pemilik sesi, atau null. Peran dibaca ulang
// dari database setiap permintaan, jadi perubahan peran langsung berlaku.
export function cariPenggunaSesi(db, token) {
  if (!token) return null;
  const baris = db
    .prepare(
      `SELECT p.id, p.nama_pengguna, p.peran, p.wilayah_id, p.donatur_id, p.mustahik_id,
              s.kedaluwarsa_pada
       FROM sesi s JOIN pengguna p ON p.id = s.pengguna_id
       WHERE s.token_hash = ?`,
    )
    .get(hashToken(token));
  if (!baris) return null;
  if (baris.kedaluwarsa_pada <= new Date().toISOString()) {
    hapusSesi(db, token);
    return null;
  }
  const { kedaluwarsa_pada, ...pengguna } = baris;
  return { ...pengguna };
}

export function hapusSesi(db, token) {
  if (token) db.prepare('DELETE FROM sesi WHERE token_hash = ?').run(hashToken(token));
}

export function bacaCookie(req, nama) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const bagian of header.split(';')) {
    const i = bagian.indexOf('=');
    if (i > 0 && bagian.slice(0, i).trim() === nama) return bagian.slice(i + 1).trim();
  }
  return null;
}

export function pasangCookieSesi(res, token, { aman }) {
  res.cookie(NAMA_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: aman,
    path: '/',
    maxAge: UMUR_SESI_DETIK * 1000,
  });
}

export function hapusCookieSesi(res, { aman }) {
  res.clearCookie(NAMA_COOKIE, { httpOnly: true, sameSite: 'strict', secure: aman, path: '/' });
}
