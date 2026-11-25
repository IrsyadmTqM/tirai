const angka = new Intl.NumberFormat('id-ID');
const tanggalPendek = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const waktuLengkap = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jakarta',
});

export const rupiah = (n) => angka.format(n);
export const tanggal = (iso) => tanggalPendek.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
export const waktu = (iso) => `${waktuLengkap.format(new Date(iso))} WIB`;
