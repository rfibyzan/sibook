export interface Database {
  public: {
    Tables: {
      kategori: {
        Row: {
          id: string;
          nama_kategori: string;
          deskripsi: string | null;
          dibuat_pada: string;
        };
        Insert: {
          id?: string;
          nama_kategori: string;
          deskripsi?: string | null;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          nama_kategori?: string;
          deskripsi?: string | null;
        };
      };
      supplier: {
        Row: {
          id: string;
          nama: string;
          telepon: string | null;
          alamat: string | null;
          email: string | null;
          dibuat_pada: string;
        };
        Insert: {
          id?: string;
          nama: string;
          telepon?: string | null;
          alamat?: string | null;
          email?: string | null;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          nama?: string;
          telepon?: string | null;
          alamat?: string | null;
          email?: string | null;
        };
      };
      rak: {
        Row: {
          id: string;
          kode_rak: string;
          seksi: string;
          kapasitas: number;
          dibuat_pada: string;
        };
        Insert: {
          id?: string;
          kode_rak: string;
          seksi: string;
          kapasitas?: number;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          kode_rak?: string;
          seksi?: string;
          kapasitas?: number;
        };
      };
      buku: {
        Row: {
          id: string;
          isbn: string;
          judul: string;
          pengarang: string;
          penerbit: string | null;
          id_kategori: string | null;
          id_rak: string | null;
          id_supplier: string | null;
          harga_jual: number;
          stok_saat_ini: number;
          stok_minimum: number;
          dibuat_pada: string;
        };
        Insert: {
          id?: string;
          isbn: string;
          judul: string;
          pengarang: string;
          penerbit?: string | null;
          id_kategori?: string | null;
          id_rak?: string | null;
          id_supplier?: string | null;
          harga_jual?: number;
          stok_saat_ini?: number;
          stok_minimum?: number;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          isbn?: string;
          judul?: string;
          pengarang?: string;
          penerbit?: string | null;
          id_kategori?: string | null;
          id_rak?: string | null;
          id_supplier?: string | null;
          harga_jual?: number;
          stok_saat_ini?: number;
          stok_minimum?: number;
        };
      };
      transaksi_masuk: {
        Row: {
          id: string;
          id_supplier: string | null;
          id_user: string | null;
          tanggal_masuk: string;
          no_po: string | null;
          total_item: number;
          catatan: string | null;
          dibuat_pada: string;
        };
        Insert: {
          id?: string;
          id_supplier?: string | null;
          id_user?: string | null;
          tanggal_masuk?: string;
          no_po?: string | null;
          total_item?: number;
          catatan?: string | null;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          id_supplier?: string | null;
          id_user?: string | null;
          tanggal_masuk?: string;
          no_po?: string | null;
          total_item?: number;
          catatan?: string | null;
        };
      };
      transaksi_keluar: {
        Row: {
          id: string;
          id_user: string | null;
          tanggal_keluar: string;
          total_item: number;
          total_harga: number;
          catatan: string | null;
          dibuat_pada: string;
        };
        Insert: {
          id?: string;
          id_user?: string | null;
          tanggal_keluar?: string;
          total_item?: number;
          total_harga?: number;
          catatan?: string | null;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          id_user?: string | null;
          tanggal_keluar?: string;
          total_item?: number;
          total_harga?: number;
          catatan?: string | null;
        };
      };
      detail_masuk: {
        Row: {
          id: string;
          id_transaksi_masuk: string;
          id_buku: string;
          jumlah_masuk: number;
          harga_beli: number;
          sub_total: number;
          dibuat_pada: string;
        };
        Insert: {
          id?: string;
          id_transaksi_masuk: string;
          id_buku: string;
          jumlah_masuk: number;
          harga_beli?: number;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          id_transaksi_masuk?: string;
          id_buku?: string;
          jumlah_masuk?: number;
          harga_beli?: number;
        };
      };
      detail_keluar: {
        Row: {
          id: string;
          id_transaksi_keluar: string;
          id_buku: string;
          jumlah_keluar: number;
          harga_jual: number;
          sub_total: number;
          dibuat_pada: string;
        };
        Insert: {
          id?: string;
          id_transaksi_keluar: string;
          id_buku: string;
          jumlah_keluar: number;
          harga_jual?: number;
          dibuat_pada?: string;
        };
        Update: {
          id?: string;
          id_transaksi_keluar?: string;
          id_buku?: string;
          jumlah_keluar?: number;
          harga_jual?: number;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}

export type Kategori = Database['public']['Tables']['kategori']['Row'];
export type Supplier = Database['public']['Tables']['supplier']['Row'];
export type Rak = Database['public']['Tables']['rak']['Row'];
export type Buku = Database['public']['Tables']['buku']['Row'];
export type TransaksiMasuk = Database['public']['Tables']['transaksi_masuk']['Row'];
export type TransaksiKeluar = Database['public']['Tables']['transaksi_keluar']['Row'];
export type DetailMasuk = Database['public']['Tables']['detail_masuk']['Row'];
export type DetailKeluar = Database['public']['Tables']['detail_keluar']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
