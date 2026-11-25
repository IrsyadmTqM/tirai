// Buku kas penyaluran. Menggambar apa adanya data dari server: sel yang
// tercantum di "tertutup" tidak punya nilai (server tidak mengirimnya), jadi
// yang digambar hanya bar hitam.

import { LABEL_ASNAF, LABEL_JENIS } from '../../bersama/label.js';
import { rupiah, tanggal } from '../lib/format.js';

export const JUDUL_KOLOM = {
  tanggal: 'Tanggal',
  wilayah: 'Wilayah',
  nama: 'Penerima',
  asnaf: 'Asnaf',
  alamat: 'Alamat',
  kondisi: 'Kondisi',
  jenis_dana: 'Dana',
  nominal: 'Nominal (Rp)',
};

export function isiSel(kolom, nilai) {
  if (nilai === null || nilai === undefined) return '–';
  switch (kolom) {
    case 'tanggal':
      return tanggal(nilai);
    case 'asnaf':
      return LABEL_ASNAF[nilai] ?? nilai;
    case 'jenis_dana':
      return LABEL_JENIS[nilai] ?? nilai;
    case 'nominal':
      return rupiah(nilai);
    default:
      return nilai;
  }
}

export function SelTertutup() {
  return (
    <span className="tirai-sel">
      <span className="tersamar">ditutup untuk peran ini</span>
    </span>
  );
}

export default function BukuKas({ data, keterangan }) {
  return (
    <div className="buku-kas-gulir">
      <table className="buku-kas">
        {keterangan && <caption>{keterangan}</caption>}
        <thead>
          <tr>
            {data.kolom.map((k) => (
              <th key={k} scope="col" className={`kolom-${k}`}>
                {JUDUL_KOLOM[k]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.baris.map((b) => (
            <tr key={b.id}>
              {data.kolom.map((k) => (
                <td key={k} className={`kolom-${k}`}>
                  {b.tertutup.includes(k) ? <SelTertutup /> : isiSel(k, b[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
