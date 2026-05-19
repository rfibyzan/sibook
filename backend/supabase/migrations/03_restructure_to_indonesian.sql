-- ============================================
-- SIBOOK Migration 03: Restrukturisasi ke Bahasa Indonesia
-- Jalankan di Supabase SQL Editor
-- ============================================

-- ============================================
-- BAGIAN 1: BUAT TABEL-TABEL BARU
-- ============================================

-- 1. Tabel Kategori
CREATE TABLE IF NOT EXISTS kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kategori TEXT NOT NULL,
  deskripsi TEXT,
  dibuat_pada TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel Supplier / Pemasok
CREATE TABLE IF NOT EXISTS supplier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  telepon TEXT,
  alamat TEXT,
  email TEXT,
  dibuat_pada TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabel Rak Penyimpanan
CREATE TABLE IF NOT EXISTS rak (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_rak TEXT UNIQUE NOT NULL,
  seksi TEXT NOT NULL,
  kapasitas INT DEFAULT 100,
  dibuat_pada TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabel Buku
CREATE TABLE IF NOT EXISTS buku (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn TEXT UNIQUE NOT NULL,
  judul TEXT NOT NULL,
  pengarang TEXT NOT NULL,
  penerbit TEXT,
  id_kategori UUID REFERENCES kategori(id) ON DELETE SET NULL,
  id_rak UUID REFERENCES rak(id) ON DELETE SET NULL,
  harga_jual INT DEFAULT 0,
  stok_saat_ini INT DEFAULT 0,
  stok_minimum INT DEFAULT 5,
  dibuat_pada TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabel Transaksi Masuk (Stock In)
CREATE TABLE IF NOT EXISTS transaksi_masuk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_supplier UUID REFERENCES supplier(id) ON DELETE SET NULL,
  id_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tanggal_masuk DATE DEFAULT CURRENT_DATE,
  no_po TEXT,
  total_item INT DEFAULT 0,
  catatan TEXT,
  dibuat_pada TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabel Transaksi Keluar (Stock Out)
CREATE TABLE IF NOT EXISTS transaksi_keluar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tanggal_keluar DATE DEFAULT CURRENT_DATE,
  total_item INT DEFAULT 0,
  total_harga INT DEFAULT 0,
  catatan TEXT,
  dibuat_pada TIMESTAMPTZ DEFAULT now()
);

-- 7. Tabel Detail Masuk
CREATE TABLE IF NOT EXISTS detail_masuk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_transaksi_masuk UUID NOT NULL REFERENCES transaksi_masuk(id) ON DELETE CASCADE,
  id_buku UUID NOT NULL REFERENCES buku(id) ON DELETE CASCADE,
  jumlah_masuk INT NOT NULL DEFAULT 1,
  harga_beli INT DEFAULT 0,
  sub_total INT GENERATED ALWAYS AS (jumlah_masuk * harga_beli) STORED,
  dibuat_pada TIMESTAMPTZ DEFAULT now()
);

-- 8. Tabel Detail Keluar
CREATE TABLE IF NOT EXISTS detail_keluar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_transaksi_keluar UUID NOT NULL REFERENCES transaksi_keluar(id) ON DELETE CASCADE,
  id_buku UUID NOT NULL REFERENCES buku(id) ON DELETE CASCADE,
  jumlah_keluar INT NOT NULL DEFAULT 1,
  harga_jual INT DEFAULT 0,
  sub_total INT GENERATED ALWAYS AS (jumlah_keluar * harga_jual) STORED,
  dibuat_pada TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- BAGIAN 2: MIGRASI DATA DARI TABEL LAMA
-- ============================================

-- Migrasi Kategori
INSERT INTO kategori (id, nama_kategori, deskripsi, dibuat_pada)
SELECT id, name, description, created_at FROM categories
ON CONFLICT (id) DO NOTHING;

-- Migrasi Supplier
INSERT INTO supplier (id, nama, telepon, alamat, dibuat_pada)
SELECT id, name, contact, address, created_at FROM suppliers
ON CONFLICT (id) DO NOTHING;

-- Migrasi Rak
INSERT INTO rak (id, kode_rak, seksi, kapasitas, dibuat_pada)
SELECT id, rack_code, section, capacity, created_at FROM locations
ON CONFLICT (id) DO NOTHING;

-- Migrasi Buku
INSERT INTO buku (id, isbn, judul, pengarang, penerbit, id_kategori, id_rak, harga_jual, stok_saat_ini, stok_minimum, dibuat_pada)
SELECT id, isbn, title, author, publisher, category_id, location_id, price, stock, 5, created_at FROM books
ON CONFLICT (id) DO NOTHING;

-- Migrasi Transaksi Masuk
INSERT INTO transaksi_masuk (id, id_supplier, id_user, tanggal_masuk, no_po, catatan, dibuat_pada)
SELECT id, supplier_id, user_id, created_at::date, invoice_number, notes, created_at
FROM transactions WHERE type = 'in'
ON CONFLICT (id) DO NOTHING;

-- Migrasi Transaksi Keluar
INSERT INTO transaksi_keluar (id, id_user, tanggal_keluar, total_harga, catatan, dibuat_pada)
SELECT id, user_id, created_at::date, total_amount, notes, created_at
FROM transactions WHERE type = 'out'
ON CONFLICT (id) DO NOTHING;

-- Migrasi Detail Masuk
INSERT INTO detail_masuk (id, id_transaksi_masuk, id_buku, jumlah_masuk, harga_beli, dibuat_pada)
SELECT ti.id, ti.transaction_id, ti.book_id, ti.quantity, ti.unit_price, ti.created_at
FROM transaction_items ti
JOIN transactions t ON ti.transaction_id = t.id
WHERE t.type = 'in'
ON CONFLICT (id) DO NOTHING;

-- Migrasi Detail Keluar
INSERT INTO detail_keluar (id, id_transaksi_keluar, id_buku, jumlah_keluar, harga_jual, dibuat_pada)
SELECT ti.id, ti.transaction_id, ti.book_id, ti.quantity, ti.unit_price, ti.created_at
FROM transaction_items ti
JOIN transactions t ON ti.transaction_id = t.id
WHERE t.type = 'out'
ON CONFLICT (id) DO NOTHING;

-- Update total_item pada transaksi masuk
UPDATE transaksi_masuk tm
SET total_item = (
  SELECT COALESCE(SUM(jumlah_masuk), 0)
  FROM detail_masuk dm WHERE dm.id_transaksi_masuk = tm.id
);

-- Update total_item dan total_harga pada transaksi keluar
UPDATE transaksi_keluar tk
SET
  total_item = (SELECT COALESCE(SUM(jumlah_keluar), 0) FROM detail_keluar dk WHERE dk.id_transaksi_keluar = tk.id),
  total_harga = (SELECT COALESCE(SUM(sub_total), 0) FROM detail_keluar dk WHERE dk.id_transaksi_keluar = tk.id);

-- ============================================
-- BAGIAN 3: TRIGGER AUTO-UPDATE STOK
-- ============================================

-- Drop trigger lama jika ada
DROP TRIGGER IF EXISTS on_transaction_item_insert ON transaction_items;

-- Trigger untuk detail_masuk → tambah stok
CREATE OR REPLACE FUNCTION tambah_stok_buku()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE buku SET stok_saat_ini = stok_saat_ini + NEW.jumlah_masuk WHERE id = NEW.id_buku;
  -- Update total_item pada header transaksi
  UPDATE transaksi_masuk SET total_item = total_item + NEW.jumlah_masuk WHERE id = NEW.id_transaksi_masuk;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_detail_masuk_insert ON detail_masuk;
CREATE TRIGGER on_detail_masuk_insert
  AFTER INSERT ON detail_masuk
  FOR EACH ROW
  EXECUTE FUNCTION tambah_stok_buku();

-- Trigger untuk detail_keluar → kurangi stok
CREATE OR REPLACE FUNCTION kurangi_stok_buku()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE buku SET stok_saat_ini = stok_saat_ini - NEW.jumlah_keluar WHERE id = NEW.id_buku;
  -- Update total_item dan total_harga pada header transaksi
  UPDATE transaksi_keluar
  SET
    total_item = total_item + NEW.jumlah_keluar,
    total_harga = total_harga + NEW.sub_total
  WHERE id = NEW.id_transaksi_keluar;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_detail_keluar_insert ON detail_keluar;
CREATE TRIGGER on_detail_keluar_insert
  AFTER INSERT ON detail_keluar
  FOR EACH ROW
  EXECUTE FUNCTION kurangi_stok_buku();

-- ============================================
-- BAGIAN 4: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE rak ENABLE ROW LEVEL SECURITY;
ALTER TABLE buku ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_keluar ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DO $$ 
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['kategori','supplier','rak','buku','transaksi_masuk','transaksi_keluar','detail_masuk','detail_keluar']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated read" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated delete" ON %I', tbl);
  END LOOP;
END $$;

-- Buat policy baru
CREATE POLICY "Allow authenticated read" ON kategori FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON kategori FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON kategori FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON kategori FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON supplier FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON supplier FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON supplier FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON supplier FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON rak FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON rak FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON rak FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON rak FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON buku FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON buku FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON buku FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON buku FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON transaksi_masuk FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON transaksi_masuk FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON transaksi_masuk FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON transaksi_masuk FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON transaksi_keluar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON transaksi_keluar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON transaksi_keluar FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON transaksi_keluar FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON detail_masuk FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON detail_masuk FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON detail_masuk FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON detail_masuk FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON detail_keluar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON detail_keluar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON detail_keluar FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON detail_keluar FOR DELETE TO authenticated USING (true);

-- ============================================
-- BAGIAN 5: HAPUS TABEL LAMA
-- ============================================

DROP TABLE IF EXISTS transaction_items CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
