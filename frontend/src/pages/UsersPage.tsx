import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';

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

  const deleteUser = (id: string, name: string) => {
    showConfirm({
      title: 'Hapus Akses User',
      message: `Apakah Anda yakin ingin menghapus profil "${name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) {
          showAlert('Profil user berhasil dihapus dari sistem.', 'success');
          fetchProfiles();
        } else {
          showAlert('Gagal menghapus: ' + error.message, 'error');
        }
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
            onClick={() => showAlert('Fitur Tambah User Baru dilakukan melalui Dashboard Supabase (Auth) untuk keamanan.', 'info')}
            className="bg-surface-container-high text-on-surface px-6 py-3 rounded-full font-bold shadow-sm hover:bg-surface-container transition-all flex items-center gap-2"
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
    </Layout>
  );
};

export default UsersPage;
