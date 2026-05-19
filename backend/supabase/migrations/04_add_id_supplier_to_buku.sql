-- ============================================
-- SIBOOK Migration 04: Tambah id_supplier ke tabel buku
-- Jalankan di Supabase SQL Editor
-- ============================================

ALTER TABLE buku 
ADD COLUMN id_supplier UUID REFERENCES supplier(id) ON DELETE SET NULL;
