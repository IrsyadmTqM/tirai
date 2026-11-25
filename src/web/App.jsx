import { useEffect, useState } from 'react';

// Langkah 0: halaman kerangka. Hanya memastikan React dan server tersambung.
export default function App() {
  const [server, setServer] = useState('memeriksa…');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setServer(d.status === 'ok' ? 'tersambung' : 'tidak normal'))
      .catch(() => setServer('tidak tersambung'));
  }, []);

  return (
    <main className="lembar">
      <h1>Tirai</h1>
      <p>Pengelolaan zakat, infak, sedekah, dan wakaf yang menjaga data jamaah dan mustahik.</p>
      <p className="keterangan">
        Kerangka proyek. Status server: <strong>{server}</strong>
      </p>
    </main>
  );
}
