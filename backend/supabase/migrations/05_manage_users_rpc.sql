-- ============================================
-- SIBOOK Migration 05: RPC Manajemen User & Role
-- Jalankan di Supabase SQL Editor
-- ============================================

-- 1. Fungsi untuk Update Role secara aman (Auth Metadata + Profile Table)
CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Ambil role dari user yang memanggil fungsi ini (auth.uid())
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  -- Validasi keamanan: hanya Owner atau Manager yang boleh mengubah role
  IF caller_role NOT IN ('Owner', 'Manager') THEN
    RAISE EXCEPTION 'Unauthorized: Hanya Owner atau Manager yang dapat mengubah jabatan.';
  END IF;

  -- A. Perbarui tabel public.profiles
  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = target_user_id;

  -- B. Perbarui raw_user_meta_data di tabel auth.users
  UPDATE auth.users
  SET raw_user_meta_data = 
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fungsi untuk Hapus User secara total (Auth + Profile Table)
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Ambil role dari user yang memanggil fungsi ini
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  
  -- Validasi keamanan: hanya Owner atau Manager yang boleh menghapus user
  IF caller_role NOT IN ('Owner', 'Manager') THEN
    RAISE EXCEPTION 'Unauthorized: Hanya Owner atau Manager yang dapat menghapus staf.';
  END IF;

  -- A. Hapus dari tabel public.profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- B. Hapus dari tabel auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
