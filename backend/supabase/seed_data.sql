-- ============================================
-- SIBOOK Dummy Data Seed
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Bersihkan data lama (Opsional - Hati-hati!)
-- DELETE FROM transaction_items;
-- DELETE FROM transactions;
-- DELETE FROM books;
-- DELETE FROM categories;
-- DELETE FROM locations;

-- 2. Isi Kategori
INSERT INTO categories (name, description) VALUES
('Fiction', 'Novel, cerpen, dan karya imajinatif lainnya'),
('Non-Fiction', 'Buku berdasarkan fakta dan informasi nyata'),
('Science', 'Ilmu pengetahuan alam dan teknologi'),
('Business', 'Ekonomi, manajemen, dan pengembangan diri'),
('Comics', 'Manga, manhua, dan novel grafis');

-- 3. Isi Lokasi Rak
INSERT INTO locations (rack_code, section, capacity) VALUES
('A1', 'S1', 50),
('A1', 'S2', 50),
('B2', 'S1', 100),
('C3', 'S1', 75),
('D4', 'S1', 200);

-- 4. Isi Buku (Berbagai variasi stok)
INSERT INTO books (isbn, title, author, category_id, location_id, stock, price) 
SELECT 
  '978-602-03-3160-7', 'Laut Bercerita', 'Leila S. Chudori', c.id, l.id, 25, 115000
FROM categories c, locations l WHERE c.name = 'Fiction' AND l.rack_code = 'A1' AND l.section = 'S1' LIMIT 1;

INSERT INTO books (isbn, title, author, category_id, location_id, stock, price) 
SELECT 
  '978-0-141-03614-4', '1984', 'George Orwell', c.id, l.id, 3, 95000
FROM categories c, locations l WHERE c.name = 'Fiction' AND l.rack_code = 'A1' AND l.section = 'S2' LIMIT 1;

INSERT INTO books (isbn, title, author, category_id, location_id, stock, price) 
SELECT 
  '978-602-06-3317-6', 'Atomic Habits', 'James Clear', c.id, l.id, 50, 128000
FROM categories c, locations l WHERE c.name = 'Business' AND l.rack_code = 'B2' AND l.section = 'S1' LIMIT 1;

INSERT INTO books (isbn, title, author, category_id, location_id, stock, price) 
SELECT 
  '978-602-424-694-5', 'Sapiens', 'Yuval Noah Harari', c.id, l.id, 0, 155000
FROM categories c, locations l WHERE c.name = 'Non-Fiction' AND l.rack_code = 'C3' AND l.section = 'S1' LIMIT 1;

INSERT INTO books (isbn, title, author, category_id, location_id, stock, price) 
SELECT 
  '978-1-449-33181-8', 'Learning React', 'Alex Banks', c.id, l.id, 8, 350000
FROM categories c, locations l WHERE c.name = 'Science' AND l.rack_code = 'D4' AND l.section = 'S1' LIMIT 1;

-- 5. Contoh Transaksi (Header)
-- Catatan: Pastikan Anda sudah punya user di auth.users jika ingin menautkan user_id
-- Untuk dummy ini kita biarkan user_id NULL atau sesuai user yang login

INSERT INTO transactions (invoice_number, type, total_amount) VALUES
('INV-2026-001', 'out', 230000),
('INV-2026-002', 'out', 128000);

-- 6. Detail Transaksi
-- Kita ambil ID buku secara dinamis
INSERT INTO transaction_items (transaction_id, book_id, quantity, unit_price)
SELECT t.id, b.id, 2, b.price 
FROM transactions t, books b 
WHERE t.invoice_number = 'INV-2026-001' AND b.title = 'Laut Bercerita' LIMIT 1;

INSERT INTO transaction_items (transaction_id, book_id, quantity, unit_price)
SELECT t.id, b.id, 1, b.price 
FROM transactions t, books b 
WHERE t.invoice_number = 'INV-2026-002' AND b.title = 'Atomic Habits' LIMIT 1;
