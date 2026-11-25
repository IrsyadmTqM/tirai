// Pemanggil API. Cookie sesi dikirim otomatis oleh browser (HttpOnly,
// tidak bisa dibaca JavaScript).

export class GalatApi extends Error {
  constructor(pesan, status) {
    super(pesan);
    this.status = status;
  }
}

export async function api(jalur, { metode = 'GET', data } = {}) {
  const res = await fetch(`/api${jalur}`, {
    method: metode,
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
    credentials: 'same-origin',
  });
  if (res.status === 204) return null;
  const isi = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new GalatApi(isi?.error ?? `Galat ${res.status}`, res.status);
  return isi;
}
