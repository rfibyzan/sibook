import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import type { Kategori } from '../lib/types';

const CategoriesPage: React.FC = () => {
  const { showAlert, showConfirm, broadcastNotification } = useNotification();
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ nama_kategori: '', deskripsi: '' });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = categories.filter(cat => 
    cat.nama_kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.deskripsi && cat.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('kategori')
      .select('*')
      .order('nama_kategori', { ascending: true });
    if (data) setCategories(data as Kategori[]);
    setLoading(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = editingCategoryId
      ? await (supabase.from('kategori') as any).update(newCategory as any).eq('id', editingCategoryId)
      : await (supabase.from('kategori') as any).insert([newCategory] as any);

    if (!error) {
      setIsModalOpen(false);
      setEditingCategoryId(null);
      setNewCategory({ nama_kategori: '', deskripsi: '' });
      showAlert(editingCategoryId ? 'Kategori berhasil diperbarui!' : 'Kategori berhasil ditambahkan!', 'success');
      
      const actionName = editingCategoryId ? 'memperbarui' : 'menambahkan';
      const titleName = editingCategoryId ? 'Kategori Diperbarui' : 'Kategori Baru';
      broadcastNotification(
        titleName,
        `${profile?.full_name || 'Admin'} (${profile?.role || 'User'}) ${actionName} kategori "${newCategory.nama_kategori}"`,
        'info'
      );

      fetchCategories();
    } else {
      showAlert('Gagal menyimpan kategori: ' + error.message, 'error');
    }
  };

  const handleEditClick = (cat: Kategori) => {
    setEditingCategoryId(cat.id);
    setNewCategory({ nama_kategori: cat.nama_kategori, deskripsi: cat.deskripsi || '' });
    setIsModalOpen(true);
  };

  const deleteCategory = (id: string) => {
    showConfirm({
      title: 'Hapus Kategori',
      message: 'Apakah Anda yakin ingin menghapus kategori ini? Buku dengan kategori ini mungkin perlu disesuaikan.',
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('kategori').delete().eq('id', id);
        if (!error) {
          showAlert('Kategori dihapus', 'success');
          
          const deletedCat = categories.find(c => c.id === id);
          if (deletedCat) {
            broadcastNotification(
              'Kategori Dihapus',
              `${profile?.full_name || 'Admin'} (${profile?.role || 'User'}) menghapus kategori "${deletedCat.nama_kategori}"`,
              'warning'
            );
          }

          fetchCategories();
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
          <h2 className="font-display-lg text-display-lg text-primary">Manajemen Kategori</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Kelola pengelompokan buku dalam inventaris Anda.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Tambah Kategori
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">search</span>
          <input 
            type="text" 
            placeholder="Cari kategori berdasarkan nama atau deskripsi..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
          </div>
        ) : filteredCategories.map((cat) => (
          <div key={cat.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">category</span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEditClick(cat)}
                  className="text-outline hover:text-primary"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button 
                  onClick={() => deleteCategory(cat.id)}
                  className="text-outline hover:text-error"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
            <h3 className="font-title-lg text-on-surface mb-2">{cat.nama_kategori}</h3>
            <p className="font-body-sm text-secondary line-clamp-2 min-h-[40px]">
              {cat.deskripsi || 'Tidak ada deskripsi.'}
            </p>
          </div>
        ))}
        {!loading && filteredCategories.length === 0 && (
          <div className="col-span-full py-20 text-center text-secondary bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant">
            {categories.length === 0 
              ? 'Belum ada kategori. Klik "Tambah Kategori" untuk memulai.' 
              : 'Tidak ada kategori yang sesuai dengan pencarian.'}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <h3 className="font-headline-sm text-on-surface mb-6">{editingCategoryId ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>
            <form onSubmit={handleAddCategory} className="space-y-6">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Nama Kategori</label>
                <input 
                  type="text" required
                  value={newCategory.nama_kategori}
                  onChange={(e) => setNewCategory({...newCategory, nama_kategori: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  placeholder="Masukkan nama kategori..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Deskripsi</label>
                <textarea 
                  rows={3}
                  value={newCategory.deskripsi}
                  onChange={(e) => setNewCategory({...newCategory, deskripsi: e.target.value})}
                  className="w-full p-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  placeholder="Penjelasan singkat kategori ini..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingCategoryId(null); }}
                  className="flex-1 py-3 border border-outline-variant rounded-full font-bold text-on-surface hover:bg-surface-container transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all"
                >
                  {editingCategoryId ? 'Perbarui' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CategoriesPage;
