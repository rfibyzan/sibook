-- ============================================
-- SIBOOK Dummy Data Seed (Skema Indonesia)
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Bersihkan data lama (Opsional - Hati-hati!)
-- DELETE FROM detail_keluar;
-- DELETE FROM detail_masuk;
-- DELETE FROM transaksi_keluar;
-- DELETE FROM transaksi_masuk;
-- DELETE FROM buku;
-- DELETE FROM kategori;
-- DELETE FROM rak;
-- DELETE FROM supplier;

-- 2. Isi Kategori
INSERT INTO kategori (nama_kategori, deskripsi) VALUES
('Fiction', 'Novel, cerpen, dan karya imajinatif lainnya'),
('Non-Fiction', 'Buku berdasarkan fakta dan informasi nyata'),
('Science', 'Ilmu pengetahuan alam dan teknologi'),
('Business', 'Ekonomi, manajemen, dan pengembangan diri'),
('Comics', 'Manga, manhua, dan novel grafis');

-- 3. Isi Lokasi Rak
INSERT INTO rak (kode_rak, seksi, kapasitas) VALUES
('A1', 'S1', 50),
('A2', 'S2', 50),
('B2', 'S1', 100),
('C3', 'S1', 75),
('D4', 'S1', 200);

-- 4. Isi Supplier
INSERT INTO supplier (nama, telepon, alamat, email) VALUES
('Gramedia Pustaka Utama', '021-53650110', 'Jakarta Pusat', 'info@gramedia.com'),
('Penerbit Erlangga', '021-8711521', 'Jakarta Timur', 'cs@erlangga.co.id'),
('Mizan Publishing', '022-7834310', 'Bandung', 'info@mizan.com');

-- 5. Isi Buku (Berbagai variasi stok)
INSERT INTO buku (isbn, judul, pengarang, penerbit, id_kategori, id_rak, stok_saat_ini, stok_minimum, harga_jual) 
SELECT 
  '978-602-03-3160-7', 'Laut Bercerita', 'Leila S. Chudori', 'Gramedia Pustaka Utama', k.id, r.id, 25, 5, 115000
FROM kategori k, rak r WHERE k.nama_kategori = 'Fiction' AND r.kode_rak = 'A1' AND r.seksi = 'S1' LIMIT 1;

INSERT INTO buku (isbn, judul, pengarang, penerbit, id_kategori, id_rak, stok_saat_ini, stok_minimum, harga_jual) 
SELECT 
  '978-0-141-03614-4', '1984', 'George Orwell', 'Penguin Books', k.id, r.id, 3, 5, 95000
FROM kategori k, rak r WHERE k.nama_kategori = 'Fiction' AND r.kode_rak = 'A2' AND r.seksi = 'S2' LIMIT 1;

INSERT INTO buku (isbn, judul, pengarang, penerbit, id_kategori, id_rak, stok_saat_ini, stok_minimum, harga_jual) 
SELECT 
  '978-602-06-3317-6', 'Atomic Habits', 'James Clear', 'Gramedia Pustaka Utama', k.id, r.id, 50, 10, 128000
FROM kategori k, rak r WHERE k.nama_kategori = 'Business' AND r.kode_rak = 'B2' AND r.seksi = 'S1' LIMIT 1;

INSERT INTO buku (isbn, judul, pengarang, penerbit, id_kategori, id_rak, stok_saat_ini, stok_minimum, harga_jual) 
SELECT 
  '978-602-424-694-5', 'Sapiens', 'Yuval Noah Harari', 'Kepustakaan Populer Gramedia', k.id, r.id, 0, 5, 155000
FROM kategori k, rak r WHERE k.nama_kategori = 'Non-Fiction' AND r.kode_rak = 'C3' AND r.seksi = 'S1' LIMIT 1;

INSERT INTO buku (isbn, judul, pengarang, penerbit, id_kategori, id_rak, stok_saat_ini, stok_minimum, harga_jual) 
SELECT 
  '978-1-449-33181-8', 'Learning React', 'Alex Banks', 'O''Reilly Media', k.id, r.id, 8, 3, 350000
FROM kategori k, rak r WHERE k.nama_kategori = 'Science' AND r.kode_rak = 'D4' AND r.seksi = 'S1' LIMIT 1;

-- 6. Contoh Transaksi Keluar (Header)
INSERT INTO transaksi_keluar (total_item, total_harga, catatan) VALUES
(2, 230000, 'Penjualan buku Fiction'),
(1, 128000, 'Penjualan buku Business');

-- 7. Detail Transaksi Keluar
INSERT INTO detail_keluar (id_transaksi_keluar, id_buku, jumlah_keluar, harga_jual)
SELECT tk.id, b.id, 2, b.harga_jual 
FROM transaksi_keluar tk, buku b 
WHERE tk.catatan = 'Penjualan buku Fiction' AND b.judul = 'Laut Bercerita' LIMIT 1;

INSERT INTO detail_keluar (id_transaksi_keluar, id_buku, jumlah_keluar, harga_jual)
SELECT tk.id, b.id, 1, b.harga_jual 
FROM transaksi_keluar tk, buku b 
WHERE tk.catatan = 'Penjualan buku Business' AND b.judul = 'Atomic Habits' LIMIT 1;
