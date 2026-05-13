# ⚙️ SIBOOK Backend (Supabase)

Repositori ini berisi seluruh konfigurasi backend, skema database, dan logika database untuk sistem SIBOOK. Kami menggunakan **Supabase** sebagai Backend-as-a-Service (BaaS).

## 🗄️ Skema Database

Sistem database menggunakan PostgreSQL dengan tabel-tabel utama berikut:

-   **`categories`**: Menyimpan kategori buku (contoh: Fiction, Sci-Fi).
-   **`locations`**: Kode rak dan section untuk penyimpanan fisik buku.
-   **`suppliers`**: Data pemasok buku untuk transaksi stok masuk.
-   **`books`**: Data buku utama, termasuk detail stok dan referensi lokasi/kategori.
-   **`transactions`**: Header transaksi untuk mencatat tipe (in/out), user, dan supplier.
-   **`transaction_items`**: Detail item buku yang terlibat dalam satu transaksi.

## ⚡ Otomatisasi dengan Database Triggers

Untuk memastikan integritas data dan performa tinggi, pengurangan/penambahan stok dilakukan secara otomatis di sisi server menggunakan PostgreSQL Trigger:

-   **`update_book_stock()`**: Fungsi ini otomatis berjalan setiap kali ada baris baru ditambahkan ke tabel `transaction_items`.
    -   Jika transaksi bertipe `in`, stok buku akan bertambah.
    -   Jika transaksi bertipe `out`, stok buku akan berkurang.

## 🔐 Keamanan (Row Level Security)

Keamanan data diatur secara ketat menggunakan **Supabase RLS Policies**:
-   Hanya pengguna yang terautentikasi (`authenticated`) yang dapat membaca, menambah, atau memperbarui data.
-   Kebijakan diatur di setiap tabel untuk memastikan isolasi data yang aman.

## 🚀 Cara Instalasi Database

1.  Buka [Supabase Dashboard](https://app.supabase.com/).
2.  Pilih proyek Anda.
3.  Buka menu **SQL Editor**.
4.  Buat query baru dan tempelkan isi dari file `supabase/migrations/00_initial_schema.sql`.
5.  Klik **Run**.

## 📂 Dokumentasi Tambahan
-   `/docs/db_types.ts`: Definisi tipe data TypeScript untuk integrasi frontend.
-   `/supabase/migrations/`: Riwayat perubahan skema database.

---
Lihat [README utama](../README.md) untuk dokumentasi lengkap sistem.
