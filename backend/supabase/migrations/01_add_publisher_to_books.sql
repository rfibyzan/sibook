-- Migration to add publisher column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS publisher TEXT;
