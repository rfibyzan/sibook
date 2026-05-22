import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';
import Pagination from '../components/Pagination';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: string;
  updated_at: string;
}

const rolePriority: Record<string, number> = {
  'Owner': 1,
  'Manager': 2,
  'Kasir': 3,
  'Staff': 4
};

const UsersPage: React.FC = () => {
  const { showAlert, showConfirm } = useNotification();
  const { profile: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

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
      .select('*');
    
    if (data) {
      // Sort by hierarchy priority
      const sortedData = (data as UserProfile[]).sort((a, b) => {
        const priorityA = rolePriority[a.role] || 5;
        const priorityB = rolePriority[b.role] || 5;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.full_name.localeCompare(b.full_name);
      });
      setProfiles(sortedData);
    }
    if (error) showAlert('Gagal mengambil data user: ' + error.message, 'error');
    setLoading(false);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

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
        showAlert('Staf baru berhasil didaftarkan!', 'success');
        setIsAddModalOpen(false);
        setNewStaff({ full_name: '', email: '', password: '', role: 'Staff' });
        setTimeout(() => fetchProfiles(), 1500);
      }
    } catch (error: any) {
      showAlert('Gagal menambah staf: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setIsSubmitting(true);

    const { error } = await (supabase
      .from('profiles') as any)
      .update({ role: editingProfile.role })
      .eq('id', editingProfile.id);

    if (!error) {
      showAlert('Jabatan berhasil diperbarui.', 'success');
      setIsEditModalOpen(false);
      fetchProfiles();
    } else {
      showAlert('Gagal memperbarui jabatan: ' + error.message, 'error');
    }
    setIsSubmitting(false);
  };

  const deleteUser = (id: string, name: string) => {
    showConfirm({
      title: 'Hapus Staf',
      message: `Hapus "${name}"? Staf ini tidak akan bisa login lagi.`,
      confirmText: 'Ya, Hapus Total',
      type: 'danger',
      onConfirm: async () => {
        setLoading(true);
        const { data, error } = await (supabase
          .from('profiles') as any)
          .delete()
          .eq('id', id)
          .select();
        
        if (error) {
          showAlert('Gagal menghapus: ' + error.message, 'error');
        } else {
          showAlert('User berhasil dihapus.', 'success');
          fetchProfiles();
        }
        setLoading(false);
      }
    });
  };

  // RBAC Helper: Get Available Roles for Select
  const getAvailableRoles = () => {
    if (currentUser?.role === 'Owner') {
      return ['Manager', 'Kasir', 'Staff'];
    }
    if (currentUser?.role === 'Manager') {
      return ['Kasir', 'Staff'];
    }
    return [];
  };

  const canManage = (targetRole: string) => {
    if (currentUser?.role === 'Owner') return true;
    if (currentUser?.role === 'Manager' && targetRole !== 'Owner') return true;
    return false;
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesName = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || p.role === roleFilter;
    return matchesName && matchesRole;
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const currentProfiles = filteredProfiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  return (
    <Layout>
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">Manajemen Staf</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Lihat dan kelola anggota tim SIBOOK Anda.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {(currentUser?.role === 'Owner' || currentUser?.role === 'Manager') && (
            <button 
              onClick={() => {
                setNewStaff({ ...newStaff, role: getAvailableRoles()[0] || 'Staff' });
                setIsAddModalOpen(true);
              }}
              className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <span className="material-symbols-outlined">person_add</span>
              Tambah Staf
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">search</span>
          <input 
            type="text" 
            placeholder="Cari nama staf..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none transition-all"
          />
        </div>
        <div className="w-full md:w-64">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full h-12 px-4 rounded-2xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none cursor-pointer"
          >
            <option value="All">Semua Jabatan</option>
            <option value="Owner">Owner</option>
            <option value="Manager">Manager</option>
            <option value="Kasir">Kasir</option>
            <option value="Staff">Staff</option>
          </select>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">STAF</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">SEBAGAI</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                  </td>
                </tr>
              ) : currentProfiles.map((profile) => (
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
                        <p className="text-[12px] text-primary font-medium mb-1">{profile.email || '-'}</p>
                        <p className="text-[11px] text-outline font-medium tracking-wide">ID: {profile.id.slice(0, 8)}</p>
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
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {canManage(profile.role) && profile.id !== currentUser?.id && (
                        <>
                          <button 
                            onClick={() => {
                              setEditingProfile(profile);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-outline hover:text-primary hover:bg-primary/10 rounded-full transition-all"
                            title="Edit Jabatan"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button 
                            onClick={() => deleteUser(profile.id, profile.full_name)}
                            className="p-2 text-outline hover:text-error hover:bg-error/10 rounded-full transition-all"
                            title="Hapus User"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && currentProfiles.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center text-secondary italic">
                    Tidak ada staf yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalPages > 1 && (
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-[32px] shadow-2xl p-8">
            <h3 className="font-headline-sm text-on-surface mb-6">Tambah Staf Baru</h3>
            <form onSubmit={handleAddStaff} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Nama Lengkap</label>
                <input type="text" required value={newStaff.full_name} onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Email</label>
                <input type="email" required value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Password</label>
                <input type="password" required value={newStaff.password} onChange={(e) => setNewStaff({...newStaff, password: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Jabatan / Role</label>
                <select value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value})} className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary cursor-pointer">
                  {getAvailableRoles().map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3.5 border border-outline-variant rounded-full font-bold">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2">
                  {isSubmitting ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Daftarkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isEditModalOpen && editingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-[32px] shadow-2xl p-8">
            <h3 className="font-headline-sm text-on-surface mb-2">Ubah Jabatan</h3>
            <p className="text-secondary text-body-md mb-6">Mengubah jabatan untuk <b>{editingProfile.full_name}</b></p>
            <form onSubmit={handleUpdateRole} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Pilih Jabatan Baru</label>
                <select 
                  value={editingProfile.role} 
                  onChange={(e) => setEditingProfile({...editingProfile, role: e.target.value})} 
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface outline-none focus:border-primary cursor-pointer"
                >
                  {getAvailableRoles().map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3.5 border border-outline-variant rounded-full font-bold">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2">
                  {isSubmitting ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : 'Simpan Perubahan'}
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
