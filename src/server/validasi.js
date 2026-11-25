// Pemeriksaan masukan dari browser. Semua masukan dianggap tidak tepercaya.

export class GalatPermintaan extends Error {
  constructor(pesan, status = 400) {
    super(pesan);
    this.status = status;
  }
}

export function teks(nilai, nama, { min = 1, maks = 200, boleh_kosong = false } = {}) {
  if ((nilai === undefined || nilai === null || nilai === '') && boleh_kosong) return null;
  if (typeof nilai !== 'string') throw new GalatPermintaan(`${nama} wajib diisi`);
  const bersih = nilai.trim();
  if (bersih.length < min) throw new GalatPermintaan(`${nama} wajib diisi`);
  if (bersih.length > maks) throw new GalatPermintaan(`${nama} paling banyak ${maks} karakter`);
  return bersih;
}

export function bilanganBulat(nilai, nama, { min = 1, maks = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof nilai !== 'number' || !Number.isInteger(nilai)) {
    throw new GalatPermintaan(`${nama} harus bilangan bulat`);
  }
  if (nilai < min || nilai > maks) throw new GalatPermintaan(`${nama} di luar batas`);
  return nilai;
}

export function pilihan(nilai, nama, daftar) {
  if (!daftar.includes(nilai)) throw new GalatPermintaan(`${nama} tidak dikenal`);
  return nilai;
}

// Tanggal YYYY-MM-DD yang benar-benar ada dan tidak di masa depan.
export function tanggal(nilai, nama) {
  if (typeof nilai !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(nilai)) {
    throw new GalatPermintaan(`${nama} harus berformat TTTT-BB-HH`);
  }
  const d = new Date(`${nilai}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== nilai) {
    throw new GalatPermintaan(`${nama} tidak valid`);
  }
  if (nilai > new Date().toISOString().slice(0, 10)) {
    throw new GalatPermintaan(`${nama} tidak boleh di masa depan`);
  }
  return nilai;
}

export function idDariJalur(nilai) {
  const id = Number(nilai);
  if (!Number.isInteger(id) || id < 1) throw new GalatPermintaan('Nomor tidak valid');
  return id;
}
