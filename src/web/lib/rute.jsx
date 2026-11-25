// Perutean sederhana dengan History API: /, /masuk, /dasbor.
// Server (Express dan Vite) mengembalikan index.html untuk semua jalur.

import { useEffect, useState } from 'react';

const PERISTIWA = 'tirai:pindah';

export function pindah(jalur) {
  if (jalur === location.pathname) return;
  history.pushState(null, '', jalur);
  window.dispatchEvent(new Event(PERISTIWA));
  window.scrollTo(0, 0);
}

export function useJalur() {
  const [jalur, setJalur] = useState(location.pathname);
  useEffect(() => {
    const perbarui = () => setJalur(location.pathname);
    window.addEventListener('popstate', perbarui);
    window.addEventListener(PERISTIWA, perbarui);
    return () => {
      window.removeEventListener('popstate', perbarui);
      window.removeEventListener(PERISTIWA, perbarui);
    };
  }, []);
  return jalur;
}

// Tautan yang berpindah halaman tanpa memuat ulang.
export function Tautan({ ke, children, ...lain }) {
  return (
    <a
      href={ke}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        pindah(ke);
      }}
      {...lain}
    >
      {children}
    </a>
  );
}
