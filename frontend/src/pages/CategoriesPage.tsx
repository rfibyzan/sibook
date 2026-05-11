import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import type { Category } from '../lib/types';

const CategoriesPage: React.FC = () => {
  const { showAlert, showConfirm } = useNotification();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (data) setCategories(data);
    setLoading(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = editingCategoryId
      ? await (supabase.from('categories') as any).update(newCategory as any).eq('id', editingCategoryId)
      : await (supabase.from('categories') as any).insert([newCategory] as any);

    if (!error) {
      setIsModalOpen(false);
      setEditingCategoryId(null);
      setNewCategory({ name: '', description: '' });
      showAlert(editingCategoryId ? 'Kategori berhasil diperbarui!' : 'Kategori berhasil ditambahkan!', 'success');
      fetchCategories();
    } else {
      showAlert('Gagal menyimpan kategori: ' + error.message, 'error');
    }
  };

  const handleEditClick = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setNewCategory({ name: cat.name, description: cat.description || '' });
    setIsModalOpen(true);
  };

  const deleteCategory = (id: string) => {
    showConfirm({
      title: 'Hapus Kategori',
      message: 'Apakah Anda yakin ingin menghapus kategori ini? Buku dengan kategori ini mungkin perlu disesuaikan.',
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) {
          showAlert('Kategori dihapus', 'success');
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
          </div>
        ) : categories.map((cat) => (
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
            <h3 className="font-title-lg text-on-surface mb-2">{cat.name}</h3>
            <p className="font-body-sm text-secondary line-clamp-2 min-h-[40px]">
              {cat.description || 'Tidak ada deskripsi.'}
            </p>
          </div>
        ))}
        {!loading && categories.length === 0 && (
          <div className="col-span-full py-20 text-center text-secondary bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant">
            Belum ada kategori. Klik "Tambah Kategori" untuk memulai.
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
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  placeholder="Misal: Sejarah, Religi..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Deskripsi</label>
                <textarea 
                  rows={3}
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
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
