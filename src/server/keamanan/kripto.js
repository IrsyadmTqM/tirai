// Enkripsi kolom dan penanda NIK. Hanya memakai modul crypto bawaan Node.js
// (OpenSSL). Tidak ada algoritma buatan sendiri.
//
// - Kolom sensitif: AES-256-GCM, IV acak 12 byte per nilai, tag 16 byte.
//   AAD berisi nama tabel dan kolom, sehingga ciphertext tidak bisa
//   dipindah ke kolom lain tanpa ketahuan.
// - Envelope encryption: tiap pemilik data punya kunci data 32 byte sendiri.
//   Kunci data disimpan di database dalam keadaan terbungkus (dienkripsi
//   AES-256-GCM dengan kunci master). Kunci master tidak pernah masuk
//   database; asalnya dari variabel lingkungan MASTER_KEY.
// - NIK: tidak disimpan. Yang disimpan HMAC-SHA256 berkunci (NIK_HMAC_KEY),
//   cukup untuk mendeteksi penerima ganda.

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const ALGORITMA = 'aes-256-gcm';
const PANJANG_IV = 12;
const PANJANG_TAG = 16;
const PANJANG_KUNCI = 32;
const AWALAN = 'v1:';
const AAD_BUNGKUS = 'tirai:kunci-data';

export function enkripsi(kunci, teks, aad) {
  const iv = randomBytes(PANJANG_IV);
  const cipher = createCipheriv(ALGORITMA, kunci, iv, { authTagLength: PANJANG_TAG });
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const isi = Buffer.concat([cipher.update(teks, 'utf8'), cipher.final()]);
  return AWALAN + Buffer.concat([iv, cipher.getAuthTag(), isi]).toString('base64');
}

// Gagal (melempar galat) bila kunci salah, AAD berbeda, atau ciphertext
// diubah walau satu bit.
export function dekripsi(kunci, paket, aad) {
  if (typeof paket !== 'string' || !paket.startsWith(AWALAN)) throw new Error('Format ciphertext tidak dikenal');
  const data = Buffer.from(paket.slice(AWALAN.length), 'base64');
  if (data.length < PANJANG_IV + PANJANG_TAG) throw new Error('Ciphertext terlalu pendek');
  const iv = data.subarray(0, PANJANG_IV);
  const tag = data.subarray(PANJANG_IV, PANJANG_IV + PANJANG_TAG);
  const decipher = createDecipheriv(ALGORITMA, kunci, iv, { authTagLength: PANJANG_TAG });
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(PANJANG_IV + PANJANG_TAG)), decipher.final()]).toString('utf8');
}

export function buatKunciData() {
  return randomBytes(PANJANG_KUNCI);
}

export function bungkusKunci(master, kunciData) {
  return enkripsi(master, kunciData.toString('base64'), AAD_BUNGKUS);
}

export function bukaBungkusKunci(master, terbungkus) {
  return Buffer.from(dekripsi(master, terbungkus, AAD_BUNGKUS), 'base64');
}

export function normalkanNik(nik) {
  return typeof nik === 'string' ? nik.replace(/\s+/g, '') : '';
}

export function hmacNik(kunciNik, nik) {
  return createHmac('sha256', kunciNik).update(normalkanNik(nik), 'utf8').digest('hex');
}

function bacaKunciBase64(nilai, nama) {
  const kunci = Buffer.from(nilai, 'base64');
  if (kunci.length !== PANJANG_KUNCI) {
    throw new Error(`${nama} harus 32 byte dalam base64 (lihat .env.example)`);
  }
  return kunci;
}

// Memuat kunci dari variabel lingkungan. Bila tidak diisi, dibuat kunci
// sementara di memori: cukup untuk prototipe karena database juga dibuat
// ulang setiap server menyala, tetapi data tidak bisa dibuka lagi setelah
// server berhenti.
export function muatKunci(env = process.env) {
  const sementara = [];
  const ambil = (nama) => {
    if (env[nama]) return bacaKunciBase64(env[nama], nama);
    sementara.push(nama);
    return randomBytes(PANJANG_KUNCI);
  };
  const master = ambil('MASTER_KEY');
  const nik = ambil('NIK_HMAC_KEY');
  if (master.equals(nik)) throw new Error('MASTER_KEY dan NIK_HMAC_KEY harus berbeda');
  return { master, nik, sementara };
}
