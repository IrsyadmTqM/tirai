-- Skema database Tirai (SQLite).
-- Setiap kolom wajib punya alasan tertulis di inventaris.js. Tes otomatis
-- menolak kolom yang tidak punya alasan (prinsip minimisasi data).
--
-- Kolom yang ditandai [ENKRIPSI] disimpan sebagai ciphertext AES-256-GCM
-- berawalan "v1:". CHECK di bawah menolak teks biasa masuk ke kolom itu,
-- sehingga kelalaian kode tidak bisa diam-diam menyimpan data asli.
-- Semua data yang diisi ke tabel ini sintetis.
--
-- Tabel donatur, mustahik, dan pengguna memakai AUTOINCREMENT supaya nomor
-- yang pernah dipakai tidak diberikan lagi ke orang lain. Audit log merujuk
-- orang lewat nomor ini, jadi nomor tidak boleh berpindah pemilik.

CREATE TABLE wilayah (
  id    INTEGER PRIMARY KEY,
  nama  TEXT NOT NULL UNIQUE
) STRICT;

-- Kunci data per pemilik data, terbungkus kunci master (envelope
-- encryption). Kunci master sendiri tidak pernah disimpan di database.
CREATE TABLE kunci_data (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  kunci_terbungkus  TEXT NOT NULL CHECK (kunci_terbungkus LIKE 'v1:%'),
  dibuat_pada       TEXT NOT NULL
) STRICT;

CREATE TABLE donatur (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nama         TEXT NOT NULL,
  kontak       TEXT CHECK (kontak IS NULL OR kontak LIKE 'v1:%'),  -- opsional [ENKRIPSI]
  kunci_id     INTEGER NOT NULL UNIQUE REFERENCES kunci_data(id),
  dibuat_pada  TEXT NOT NULL
) STRICT;

CREATE TABLE mustahik (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nama         TEXT NOT NULL CHECK (nama LIKE 'v1:%'),                 -- [ENKRIPSI]
  alamat       TEXT NOT NULL CHECK (alamat LIKE 'v1:%'),               -- [ENKRIPSI]
  kondisi      TEXT CHECK (kondisi IS NULL OR kondisi LIKE 'v1:%'),    -- catatan singkat [ENKRIPSI]
  asnaf        TEXT NOT NULL CHECK (asnaf IN (
                 'fakir', 'miskin', 'amil', 'mualaf',
                 'riqab', 'gharim', 'fisabilillah', 'ibnu_sabil')),
  wilayah_id   INTEGER NOT NULL REFERENCES wilayah(id),
  nik_hmac     TEXT UNIQUE CHECK (nik_hmac IS NULL OR length(nik_hmac) = 64),  -- HMAC-SHA256, bukan NIK
  kunci_id     INTEGER UNIQUE REFERENCES kunci_data(id),
  dibuat_pada  TEXT NOT NULL
) STRICT;

CREATE TABLE pengguna (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- Sesi masuk. Yang disimpan hanya hash SHA-256 dari token; token aslinya
-- hanya ada di cookie browser. Bocornya database tidak membocorkan sesi.
CREATE TABLE sesi (
  token_hash        TEXT PRIMARY KEY,
  pengguna_id       INTEGER NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
  kedaluwarsa_pada  TEXT NOT NULL
) STRICT;

-- Audit log: siapa, kapan, aksi apa, atas data siapa.
-- - Hanya bisa ditambah. Trigger di bawah menolak UPDATE dan DELETE,
--   termasuk dari luar aplikasi.
-- - Tidak ada kolom teks bebas: semua kolom berupa angka atau pilihan
--   tetap (CHECK), jadi data pribadi asli tidak mungkin tercatat di sini.
--   Orang dirujuk lewat nomor (subjek_id), bukan nama.
-- - Tidak memakai foreign key, supaya catatan tetap ada setelah data
--   orangnya dihapus.
CREATE TABLE audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu         TEXT NOT NULL,
  pengguna_id   INTEGER,
  peran         TEXT CHECK (peran IS NULL OR peran IN ('admin', 'bendahara', 'amil', 'pemilik')),
  aksi          TEXT NOT NULL CHECK (aksi IN (
                  'baca', 'buat', 'ubah', 'ekspor', 'hapus', 'masuk', 'gagal_masuk', 'keluar')),
  objek         TEXT NOT NULL CHECK (objek IN (
                  'buku_kas', 'mustahik', 'donatur', 'donasi', 'penyaluran', 'pengguna',
                  'audit_log', 'sesi', 'persetujuan', 'permintaan', 'catatan')),
  subjek_jenis  TEXT CHECK (subjek_jenis IS NULL OR subjek_jenis IN ('donatur', 'mustahik', 'pengguna')),
  subjek_id     INTEGER,
  saluran       TEXT NOT NULL CHECK (saluran IN ('aplikasi', 'peragaan')),
  CHECK ((subjek_jenis IS NULL) = (subjek_id IS NULL))
) STRICT;

CREATE TRIGGER audit_log_tolak_ubah BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit log hanya bisa ditambah');
END;

CREATE TRIGGER audit_log_tolak_hapus BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit log hanya bisa ditambah');
END;

CREATE INDEX idx_audit_subjek ON audit_log(subjek_jenis, subjek_id);
CREATE INDEX idx_mustahik_wilayah ON mustahik(wilayah_id);
CREATE INDEX idx_donasi_donatur ON donasi(donatur_id);
CREATE INDEX idx_penyaluran_mustahik ON penyaluran(mustahik_id);
