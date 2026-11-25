// Catatan pribadi yang dienkripsi di browser (E2EE terbatas).
// Memakai Web Crypto API bawaan browser:
// - Kunci diturunkan dari kata sandi catatan dengan PBKDF2-SHA256.
//   Jumlah iterasi 600.000 mengikuti angka di OWASP Password Storage Cheat
//   Sheet untuk PBKDF2-HMAC-SHA256; cek ulang ke sumbernya sebelum dikutip.
// - Isi dienkripsi AES-256-GCM dengan IV acak 12 byte.
// Kata sandi catatan dan kunci tidak pernah dikirim ke server. Server hanya
// menerima isi terenkripsi, IV, salt, dan jumlah iterasi.

export const ITERASI = 600_000;

const kode = new TextEncoder();
const urai = new TextDecoder();

const keBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const dariBase64 = (teks) => Uint8Array.from(atob(teks), (c) => c.charCodeAt(0));

export function tersedia() {
  return Boolean(globalThis.crypto?.subtle);
}

async function turunkanKunci(sandi, salt, iterasi) {
  const bahan = await crypto.subtle.importKey('raw', kode.encode(sandi.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iterasi },
    bahan,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function kunciCatatan(teks, sandi, iterasi = ITERASI) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const kunci = await turunkanKunci(sandi, salt, iterasi);
  const isi = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kunci, kode.encode(teks));
  return { isi: keBase64(isi), iv: keBase64(iv), salt: keBase64(salt), iterasi };
}

// Melempar galat bila kata sandi salah atau isi diubah.
export async function bukaCatatan(paket, sandi) {
  const kunci = await turunkanKunci(sandi, dariBase64(paket.salt), paket.iterasi);
  const teks = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: dariBase64(paket.iv) }, kunci, dariBase64(paket.isi));
  return urai.decode(teks);
}
