// Hash kata sandi dengan scrypt dari modul crypto bawaan Node.js.
// Tidak ada kriptografi buatan sendiri: hanya memanggil pustaka standar.
//
// Parameter N=2^15, r=8, p=3 diambil dari salah satu konfigurasi setara
// untuk scrypt di OWASP Password Storage Cheat Sheet. Cek ulang ke sumbernya
// sebelum dikutip di laporan.
//
// Format tersimpan: scrypt$N$r$p$salt(base64)$hash(base64)

import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const PARAMETER = { N: 2 ** 15, r: 8, p: 3 };
const BATAS_MEMORI = 64 * 1024 * 1024;
const PANJANG_HASH = 32;
const PANJANG_SALT = 16;

export async function hashSandi(sandi) {
  const salt = randomBytes(PANJANG_SALT);
  const hash = await scryptAsync(sandi.normalize('NFKC'), salt, PANJANG_HASH, {
    ...PARAMETER,
    maxmem: BATAS_MEMORI,
  });
  const { N, r, p } = PARAMETER;
  return ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function cocokkanSandi(sandi, tersimpan) {
  const bagian = String(tersimpan).split('$');
  if (bagian.length !== 6 || bagian[0] !== 'scrypt') return false;

  const [, N, r, p, saltBase64, hashBase64] = bagian;
  const harapan = Buffer.from(hashBase64, 'base64');
  if (harapan.length !== PANJANG_HASH) return false;
  const hasil = await scryptAsync(sandi.normalize('NFKC'), Buffer.from(saltBase64, 'base64'), harapan.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: BATAS_MEMORI,
  });
  return timingSafeEqual(hasil, harapan);
}
