-- Skema database Tirai (SQLite).
-- Setiap kolom wajib punya alasan tertulis di inventaris.js. Tes otomatis
-- menolak kolom yang tidak punya alasan (prinsip minimisasi data).
--
-- Langkah 1: kolom sensitif masih teks biasa. Mulai langkah 3, kolom yang
-- ditandai [ENKRIPSI] disimpan sebagai ciphertext AES-256-GCM.
-- Semua data yang diisi ke tabel ini sintetis.

CREATE TABLE wilayah (
  id    INTEGER PRIMARY KEY,
  nama  TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE donatur (
  id           INTEGER PRIMARY KEY,
  nama         TEXT NOT NULL,
  kontak       TEXT,                 -- opsional [ENKRIPSI]
  dibuat_pada  TEXT NOT NULL
) STRICT;

CREATE TABLE mustahik (
  id           INTEGER PRIMARY KEY,
  nama         TEXT NOT NULL,        -- [ENKRIPSI]
  alamat       TEXT NOT NULL,        -- [ENKRIPSI]
  kondisi      TEXT,                 -- catatan singkat [ENKRIPSI]
  asnaf        TEXT NOT NULL CHECK (asnaf IN (
                 'fakir', 'miskin', 'amil', 'mualaf',
                 'riqab', 'gharim', 'fisabilillah', 'ibnu_sabil')),
  wilayah_id   INTEGER NOT NULL REFERENCES wilayah(id),
  nik_hmac     TEXT UNIQUE,          -- penanda duplikat, diisi mulai langkah 3
  dibuat_pada  TEXT NOT NULL
) STRICT;

CREATE TABLE pengguna (
  id               INTEGER PRIMARY KEY,
  nama_pengguna    TEXT NOT NULL UNIQUE,
  kata_sandi_hash  TEXT NOT NULL,
  peran            TEXT NOT NULL CHECK (peran IN ('admin', 'bendahara', 'amil', 'pemilik')),
  wilayah_id       INTEGER REFERENCES wilayah(id),
  donatur_id       INTEGER UNIQUE REFERENCES donatur(id),
  mustahik_id      INTEGER UNIQUE REFERENCES mustahik(id),
  dibuat_pada      TEXT NOT NULL,
  -- Amil wajib punya wilayah, peran lain tidak boleh.
  CHECK ((peran = 'amil') = (wilayah_id IS NOT NULL)),
  -- Akun pemilik data wajib tertaut ke tepat satu donatur atau mustahik.
  CHECK ((peran = 'pemilik') = (donatur_id IS NOT NULL OR mustahik_id IS NOT NULL)),
  CHECK (donatur_id IS NULL OR mustahik_id IS NULL)
) STRICT;

CREATE TABLE donasi (
  id            INTEGER PRIMARY KEY,
  donatur_id    INTEGER REFERENCES donatur(id),  -- NULL: donatur tanpa nama (hamba Allah)
  jenis         TEXT NOT NULL CHECK (jenis IN (
                  'zakat_fitrah', 'zakat_mal', 'infak', 'sedekah', 'wakaf')),
  nominal       INTEGER NOT NULL CHECK (nominal > 0),  -- rupiah
  tanggal       TEXT NOT NULL,
  dicatat_oleh  INTEGER NOT NULL REFERENCES pengguna(id),
  dibuat_pada   TEXT NOT NULL
) STRICT;

CREATE TABLE penyaluran (
  id            INTEGER PRIMARY KEY,
  mustahik_id   INTEGER NOT NULL REFERENCES mustahik(id),
  -- Wakaf tidak disalurkan langsung ke mustahik di prototipe ini
  -- (penyederhanaan, perlu dikonfirmasi ke pengurus).
  jenis_dana    TEXT NOT NULL CHECK (jenis_dana IN (
                  'zakat_fitrah', 'zakat_mal', 'infak', 'sedekah')),
  nominal       INTEGER NOT NULL CHECK (nominal > 0),  -- rupiah
  tanggal       TEXT NOT NULL,
  dicatat_oleh  INTEGER NOT NULL REFERENCES pengguna(id),
  dibuat_pada   TEXT NOT NULL
) STRICT;

CREATE INDEX idx_mustahik_wilayah ON mustahik(wilayah_id);
CREATE INDEX idx_donasi_donatur ON donasi(donatur_id);
CREATE INDEX idx_penyaluran_mustahik ON penyaluran(mustahik_id);
