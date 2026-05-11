import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { createClient } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  role: string;
  updated_at: string;
}

const UsersPage: React.FC = () => {
  const { showAlert, showConfirm } = useNotification();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'Staff'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    
    if (data) setProfiles(data);
    if (error) showAlert('Gagal mengambil data user: ' + error.message, 'error');
    setLoading(false);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Create a temporary client to avoid signing out the admin
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      // 2. Sign up the new user
      const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
        email: newStaff.email,
        password: newStaff.password,
        options: {
          data: {
            full_name: newStaff.full_name,
            role: newStaff.role
          }
        }
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        showAlert('Staf baru berhasil didaftarkan! Pastikan Anda telah menambahkan trigger di Supabase untuk sinkronisasi profil.', 'success');
        setIsAddModalOpen(false);
        setNewStaff({ full_name: '', email: '', password: '', role: 'Staff' });
        
        // Tunggu sebentar agar trigger selesai memproses sebelum refresh
        setTimeout(() => fetchProfiles(), 1500);
      }
    } catch (error: any) {
      showAlert('Gagal menambah staf: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUser = (id: string, name: string) => {
    showConfirm({
      title: 'Hapus Staf',
      message: `Hapus "${name}"? Staf ini tidak akan bisa login lagi ke sistem SIBOOK.`,
      confirmText: 'Ya, Hapus Total',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        // Tambahkan .select() untuk memverifikasi apakah baris benar-benar terhapus
        const { data, error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', id)
          .select();
        
        if (error) {
          showAlert('Gagal menghapus: ' + error.message, 'error');
        } else if (!data || data.length === 0) {
          showAlert('Gagal menghapus: Anda tidak memiliki izin (RLS) atau user tidak ditemukan.', 'error');
        } else {
          showAlert('User dan akses login berhasil dihapus.', 'success');
          fetchProfiles();
        }
        setLoading(false);
      }
    });
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">Manajemen Staf</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Lihat dan kelola anggota tim SIBOOK Anda.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">person_add</span>
            Tambah Staf
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">STAF</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">JABATAN (ROLE)</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">TERAKHIR AKTIF</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                  </td>
                </tr>
              ) : profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-primary/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <img 
                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=random`} 
                        alt={profile.full_name}
                        className="w-10 h-10 rounded-full border border-outline-variant object-cover"
                      />
                      <div>
                        <p className="font-title-md text-on-surface leading-none mb-1">{profile.full_name || 'Tanpa Nama'}</p>
                        <p className="text-[11px] text-outline font-medium tracking-wide uppercase">ID: {profile.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                      profile.role === 'Owner' ? 'bg-error/10 text-error border-error/20' :
                      profile.role === 'Manager' ? 'bg-primary/10 text-primary border-primary/20' :
                      'bg-secondary/10 text-secondary border-secondary/20'
                    }`}>
                      {profile.role || 'Staff'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-body-sm text-on-surface-variant">
                      {profile.updated_at ? new Date(profile.updated_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : '-'}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => deleteUser(profile.id, profile.full_name)}
                      className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-full transition-all"
                    >
                      <span className="material-symbols-outlined">delete_forever</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && profiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-secondary italic">
                    Belum ada data staf yang terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-primary/5 border border-primary/10 rounded-2xl p-6 flex gap-4 items-center">
        <span className="material-symbols-outlined text-primary text-[32px]">info</span>
        <div>
          <h4 className="font-title-md text-primary mb-1">Pusat Keamanan Staf</h4>
          <p className="font-body-sm text-secondary leading-relaxed">
            Halaman ini menampilkan profil publik staf Anda. Untuk menambah atau mengubah hak akses login (Email/Password), 
            silakan gunakan menu <b>Authentication</b> pada Dashboard Supabase Anda.
          </p>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-sm text-on-surface">Tambah Staf Baru</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-surface-container rounded-full text-secondary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Nama Lengkap</label>
                <input 
                  type="text" required placeholder="Contoh: Budi Santoso"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Email Work</label>
                <input 
                  type="email" required placeholder="email@sibook.com"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Password Sementara</label>
                <input 
                  type="password" required minLength={6} placeholder="Min. 6 karakter"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Jabatan / Role</label>
                <select 
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none cursor-pointer"
                >
                  <option value="Staff">Staff</option>
                  <option value="Kasir">Kasir</option>
                  <option value="Manager">Manager</option>
                  <option value="Owner">Owner</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3.5 border border-outline-variant rounded-full font-bold text-on-surface hover:bg-surface-container transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">how_to_reg</span>}
                  Daftarkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default UsersPage;
