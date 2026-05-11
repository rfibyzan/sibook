-- ============================================
-- SIBOOK Database Schema
-- Jalankan script ini di Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- ============================================

-- 1. Tabel Kategori Buku
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel Lokasi Rak
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_code TEXT NOT NULL,
  section TEXT NOT NULL,
  capacity INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabel Supplier / Pemasok
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabel Buku
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  stock INT DEFAULT 0,
  price INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabel Transaksi (Header)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invoice_number TEXT,
  notes TEXT,
  total_amount INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabel Detail Item Transaksi
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  unit_price INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRIGGER: Auto-update stock saat transaksi
-- ============================================

CREATE OR REPLACE FUNCTION update_book_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT type FROM transactions WHERE id = NEW.transaction_id) = 'in' THEN
    UPDATE books SET stock = stock + NEW.quantity WHERE id = NEW.book_id;
  ELSE
    UPDATE books SET stock = stock - NEW.quantity WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_transaction_item_insert ON transaction_items;
CREATE TRIGGER on_transaction_item_insert
  AFTER INSERT ON transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION update_book_stock();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- Policy: Semua authenticated user bisa baca semua data
CREATE POLICY "Allow authenticated read" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON transaction_items FOR SELECT TO authenticated USING (true);

-- Policy: Semua authenticated user bisa insert/update/delete
CREATE POLICY "Allow authenticated insert" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON locations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON locations FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON suppliers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON books FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON books FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON books FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON transactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON transaction_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON transaction_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON transaction_items FOR DELETE TO authenticated USING (true);

-- ============================================
-- SEED DATA (Data Contoh)
-- ============================================

INSERT INTO categories (name, description) VALUES
  ('Fiction', 'Novel, Cerpen, dan Prosa'),
  ('Non-Fiction', 'Buku Ilmu Pengetahuan'),
  ('Sci-Fi', 'Science Fiction and Fantasy'),
  ('Biography', 'Kisah Hidup Tokoh'),
  ('Self-Help', 'Pengembangan Diri');

INSERT INTO locations (rack_code, section, capacity) VALUES
  ('A1', 'S1', 100),
  ('A1', 'S2', 100),
  ('A2', 'S1', 120),
  ('B1', 'S1', 80),
  ('B2', 'S1', 150);

INSERT INTO suppliers (name, contact, address) VALUES
  ('Gramedia Pustaka Utama', '021-53650110', 'Jakarta Pusat'),
  ('Penerbit Erlangga', '021-8711521', 'Jakarta Timur'),
  ('Mizan Publishing', '022-7834310', 'Bandung');

INSERT INTO books (isbn, title, author, category_id, location_id, stock, price) VALUES
  ('978-0141182551', '1984', 'George Orwell',
    (SELECT id FROM categories WHERE name = 'Fiction'),
    (SELECT id FROM locations WHERE rack_code = 'A1' AND section = 'S1'),
    24, 89000),
  ('978-0743273565', 'The Great Gatsby', 'F. Scott Fitzgerald',
    (SELECT id FROM categories WHERE name = 'Fiction'),
    (SELECT id FROM locations WHERE rack_code = 'B2' AND section = 'S1'),
    3, 75000),
  ('978-0061120084', 'To Kill a Mockingbird', 'Harper Lee',
    (SELECT id FROM categories WHERE name = 'Fiction'),
    (SELECT id FROM locations WHERE rack_code = 'A2' AND section = 'S1'),
    0, 95000),
  ('978-0735211292', 'Atomic Habits', 'James Clear',
    (SELECT id FROM categories WHERE name = 'Self-Help'),
    (SELECT id FROM locations WHERE rack_code = 'B1' AND section = 'S1'),
    15, 110000),
  ('978-0525559474', 'The Midnight Library', 'Matt Haig',
    (SELECT id FROM categories WHERE name = 'Fiction'),
    (SELECT id FROM locations WHERE rack_code = 'A1' AND section = 'S2'),
    2, 98000);
