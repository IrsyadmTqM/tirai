// Buku kas penyaluran. Menggambar apa adanya data dari server: sel yang
// tercantum di "tertutup" tidak punya nilai (server tidak mengirimnya), jadi
// yang digambar hanya tirai hitam.

import { LABEL_ASNAF, LABEL_JENIS } from '../../bersama/label.js';
import { rupiah, tanggal } from '../lib/format.js';
import AngkaBerputar from './AngkaBerputar.jsx';
import SelTirai from './SelTirai.jsx';

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

export default function BukuKas({ data, keterangan }) {
  const totalKeluar = data.ringkasan?.total.keluar;
  return (
    <div className="buku-kas-gulir" tabIndex={0} role="region" aria-label="Buku kas penyaluran, bisa digeser">
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
          {data.baris.map((b, i) => (
            <tr key={b.id}>
              {data.kolom.map((k, j) => (
                <td key={k} className={`kolom-${k}`}>
                  <SelTirai tertutup={b.tertutup.includes(k)} isi={isiSel(k, b[k])} jeda={i * 0.018 + j * 0.03} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={data.kolom.length - 1}>
              Jumlah disalurkan
            </th>
            <td className="kolom-nominal">
              {totalKeluar === undefined ? (
                <SelTirai tertutup isi={null} />
              ) : (
                <AngkaBerputar nilai={totalKeluar} />
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
