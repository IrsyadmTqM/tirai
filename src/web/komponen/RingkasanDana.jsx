// Ringkasan dana masuk, disalurkan, dan saldo. Angkanya berputar ke nilai
// baru setiap kali berubah (misalnya setelah bendahara mencatat donasi).
// Bila ringkasan tidak boleh dilihat, yang tampil hanya tirai.

import AngkaBerputar from './AngkaBerputar.jsx';
import SelTirai from './SelTirai.jsx';

export default function RingkasanDana({ ringkasan }) {
  const baris = [
    ['Dana masuk', ringkasan?.total.masuk],
    ['Disalurkan', ringkasan?.total.keluar],
    ['Saldo', ringkasan?.total.saldo],
  ];
  return (
    <dl className="ringkasan-dana">
      {baris.map(([label, nilai]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            <span className="mata-uang">Rp</span>{' '}
            {nilai === undefined ? <SelTirai tertutup isi={null} /> : <AngkaBerputar nilai={nilai} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
