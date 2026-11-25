// Daftar catatan audit log. Orang dirujuk dengan nomor, bukan nama:
// audit log memang tidak menyimpan data pribadi asli.

import { LABEL_AKSI, LABEL_OBJEK, NAMA_PERAN } from '../../bersama/label.js';
import { waktu } from '../lib/format.js';

const JENIS_SAMA_OBJEK = { mustahik: 'mustahik', donatur: 'donatur', pengguna: 'pengguna' };

export function kalimatAudit(l) {
  const pelaku = l.peran ? NAMA_PERAN[l.peran] : 'Akun tak dikenal';
  if (l.objek === 'sesi') return `${pelaku} ${LABEL_AKSI[l.aksi]}`;
  let subjek = '';
  if (l.subjek) {
    subjek = JENIS_SAMA_OBJEK[l.objek] === l.subjek.jenis ? ` #${l.subjek.id}` : ` (${l.subjek.jenis} #${l.subjek.id})`;
  }
  return `${pelaku} ${LABEL_AKSI[l.aksi]} ${LABEL_OBJEK[l.objek]}${subjek}`;
}

export default function DaftarAudit({ log, tampilkanPelaku = false }) {
  if (!log.length) return <p className="keterangan">Belum ada catatan.</p>;
  return (
    <ol className="daftar-audit">
      {log.map((l) => (
        <li key={l.id}>
          <span className="audit-waktu">{waktu(l.waktu)}</span>
          <span className="audit-kalimat">
            {kalimatAudit(l)}
            {tampilkanPelaku && l.pelaku && <span className="keterangan"> ({l.pelaku})</span>}
            {l.saluran === 'peragaan' && <span className="label-peragaan">peragaan</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
