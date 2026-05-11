# SIBOOK Backend (Supabase)

Folder ini berisi seluruh konfigurasi dan definisi database untuk sistem SIBOOK.

## Struktur Folder
- `/supabase/migrations/`: Berisi file SQL untuk membangun skema database.
  - `00_initial_schema.sql`: Skrip utama untuk membuat tabel, trigger, dan kebijakan keamanan (RLS).
- `/docs/`: Dokumentasi teknis backend.
  - `db_types.ts`: Referensi tipe data TypeScript yang dihasilkan dari database.

## Cara Sinkronisasi Database
Jika Anda ingin membangun ulang database di Supabase:
1. Copy isi dari `supabase/migrations/00_initial_schema.sql`.
2. Jalankan di **Supabase SQL Editor**.

## Catatan Arsitektur
Sistem ini menggunakan **Supabase** sebagai *Backend-as-a-Service*. Logika bisnis utama (seperti pengurangan stok otomatis) diletakkan langsung di dalam database menggunakan **PostgreSQL Triggers** untuk memastikan integritas data.
