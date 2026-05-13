# 📚 SIBOOK (Sistem Inventory Bookstore)

SIBOOK adalah sistem manajemen inventaris modern yang dirancang khusus untuk toko buku. Aplikasi ini memungkinkan pengelolaan stok, transaksi masuk/keluar, kategori, lokasi penyimpanan, hingga laporan analitik secara real-time.

![SIBOOK Banner](https://img.shields.io/badge/SIBOOK-Inventory_Management-blue?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase)

## ✨ Fitur Utama

-   **🚀 Dashboard Interaktif**: Visualisasi data stok, tren penjualan, dan ringkasan inventaris.
-   **📦 Manajemen Buku**: CRUD (Create, Read, Update, Delete) data buku dengan detail lengkap (ISBN, Penulis, Penerbit, Harga, dll).
-   **📥 Manajemen Stok**: Pelacakan transaksi **Stock In** dan **Stock Out** secara akurat.
-   **🏷️ Kategorisasi & Lokasi**: Pengelompokan buku berdasarkan kategori dan lokasi penyimpanan fisik di rak.
-   **👥 Manajemen Pengguna**: Sistem Role-Based Access Control (RBAC) untuk Owner, Manager, dan Staff/Kasir.
-   **📊 Laporan & Analitik**: Generasi laporan transaksi dan stok untuk pengambilan keputusan.
-   **🌓 Dark Mode & UI Modern**: Antarmuka yang bersih, responsif, dan mendukung mode gelap.
-   **⚡ Real-time Updates**: Integrasi Supabase untuk sinkronisasi data instan.

## 🛠️ Tech Stack

### Frontend
-   **React 19** (Vite)
-   **TypeScript**
-   **Tailwind CSS** (Styling)
-   **React Router DOM** (Routing)
-   **React Easy Crop** (Profile Image Processing)

### Backend & Database
-   **Supabase** (Database, Auth, Storage)
-   **PostgreSQL** (Triggers & Functions untuk otomatisasi stok)
-   **Row Level Security (RLS)** (Keamanan data di level database)

## 📁 Struktur Proyek

```text
sibook/
├── frontend/           # Aplikasi React (UI & Logika Bisnis)
│   ├── src/
│   │   ├── components/ # Komponen UI Reusable
│   │   ├── context/    # State Management (Auth, Notification)
│   │   ├── pages/      # Halaman Utama Aplikasi
│   │   └── services/   # Integrasi API Supabase
│   └── vercel.json     # Konfigurasi Deployment Vercel
├── backend/            # Konfigurasi Database & Dokumentasi
│   ├── supabase/       # Migrasi SQL & Skema
│   └── docs/           # Referensi Tipe Data & Dokumentasi Teknis
└── README.md           # Dokumentasi Utama
```

## 🚀 Memulai (Local Setup)

### 1. Prasyarat
- Node.js (v18 atau lebih baru)
- Akun Supabase

### 2. Kloning Repositori
```bash
git clone https://github.com/rfibyzan/sibook.git
cd sibook
```

### 3. Setup Frontend
```bash
cd frontend
npm install
```

Buat file `.env` di folder `frontend/` dan isi dengan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://nqrsmaoquiczigluytwe.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnNtYW9xdWljemlnbHV5dHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDM5NDMsImV4cCI6MjA5NDA3OTk0M30.6sbAr9btd2IVzOfMohRpuBo_I_vUYCYZlNWY-e6XhI4
```

Jalankan aplikasi:
```bash
npm run dev
```

### 4. Setup Backend (Supabase)
1. Buka dashboard Supabase Anda.
2. Salin isi dari `backend/supabase/migrations/00_initial_schema.sql`.
3. Jalankan skrip tersebut di **SQL Editor** Supabase untuk membangun tabel, trigger, dan kebijakan keamanan.

## 🛡️ Keamanan & Otomatisasi
- **Stok Otomatis**: Pengurangan dan penambahan stok dikelola langsung oleh database trigger di PostgreSQL, meminimalkan kesalahan perhitungan di level aplikasi.
- **RBAC**: Akses menu dan data dibatasi berdasarkan role user menggunakan Supabase Auth dan kebijakan RLS.

## 📄 Lisensi
Proyek ini dilisensikan di bawah [MIT License](LICENSE).

---
Dibuat dengan ❤️ oleh tim SIBOOK.
