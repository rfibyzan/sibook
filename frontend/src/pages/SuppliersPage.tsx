import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import type { Supplier } from '../lib/types';
import Pagination from '../components/Pagination';

const SuppliersPage: React.FC = () => {
  const { showAlert, showConfirm } = useNotification();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ nama: '', telepon: '', alamat: '', email: '' });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredSuppliers = suppliers.filter(sup => 
    sup.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sup.telepon && sup.telepon.includes(searchTerm)) ||
    (sup.email && sup.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (sup.alamat && sup.alamat.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const currentSuppliers = filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('supplier')
      .select('*')
      .order('nama', { ascending: true });
    if (data) setSuppliers(data as Supplier[]);
    setLoading(false);
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = editingSupplierId
      ? await (supabase.from('supplier') as any).update(newSupplier as any).eq('id', editingSupplierId)
      : await (supabase.from('supplier') as any).insert([newSupplier] as any);

    if (!error) {
      setIsModalOpen(false);
      setEditingSupplierId(null);
      setNewSupplier({ nama: '', telepon: '', alamat: '', email: '' });
      showAlert(editingSupplierId ? 'Supplier berhasil diperbarui!' : 'Supplier berhasil ditambahkan!', 'success');
      fetchSuppliers();
    } else {
      showAlert('Gagal menyimpan supplier: ' + error.message, 'error');
    }
  };

  const handleEditClick = (sup: Supplier) => {
    setEditingSupplierId(sup.id);
    setNewSupplier({ 
      nama: sup.nama, 
      telepon: sup.telepon || '', 
      alamat: sup.alamat || '', 
      email: sup.email || '' 
    });
    setIsModalOpen(true);
  };

  const deleteSupplier = (id: string) => {
    showConfirm({
      title: 'Hapus Supplier',
      message: 'Apakah Anda yakin ingin menghapus supplier ini? Pilihan supplier pada riwayat transaksi masuk mungkin menjadi kosong.',
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('supplier').delete().eq('id', id);
        if (!error) {
          showAlert('Supplier berhasil dihapus', 'success');
          fetchSuppliers();
        } else {
          showAlert('Gagal menghapus supplier: ' + error.message, 'error');
        }
      }
    });
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">Manajemen Supplier</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Kelola data pemasok atau penerbit untuk pengadaan stok buku masuk.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Tambah Supplier
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">search</span>
          <input 
            type="text" 
            placeholder="Cari supplier berdasarkan nama, telepon, email, atau alamat..." 
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
        ) : currentSuppliers.map((sup) => (
          <div key={sup.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">local_shipping</span>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditClick(sup)}
                    className="text-outline hover:text-primary"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button 
                    onClick={() => deleteSupplier(sup.id)}
                    className="text-outline hover:text-error"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
              <h3 className="font-title-lg text-on-surface mb-3 font-bold">{sup.nama}</h3>
              
              <div className="space-y-1.5 text-body-sm text-secondary font-medium">
                {sup.telepon && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-outline">phone</span>
                    <span>{sup.telepon}</span>
                  </div>
                )}
                {sup.email && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-outline">mail</span>
                    <span>{sup.email}</span>
                  </div>
                )}
                {sup.alamat && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-outline">location_on</span>
                    <span className="line-clamp-1">{sup.alamat}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && currentSuppliers.length === 0 && (
          <div className="col-span-full py-20 text-center text-secondary bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant">
            {suppliers.length === 0 
              ? 'Belum ada data supplier. Klik "Tambah Supplier" untuk memulai.' 
              : 'Tidak ada supplier yang sesuai dengan pencarian.'}
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="mt-6 rounded-[32px] overflow-hidden border border-outline-variant">
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <h3 className="font-headline-sm text-on-surface mb-6">{editingSupplierId ? 'Edit Supplier' : 'Tambah Supplier Baru'}</h3>
            <form onSubmit={handleAddSupplier} className="space-y-6">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Nama Pemasok / Penerbit</label>
                <input 
                  type="text" required
                  value={newSupplier.nama}
                  onChange={(e) => setNewSupplier({...newSupplier, nama: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  placeholder="Masukkan nama supplier..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Telepon</label>
                  <input 
                    type="text"
                    value={newSupplier.telepon}
                    onChange={(e) => setNewSupplier({...newSupplier, telepon: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                    placeholder="No. telepon..."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Email</label>
                  <input 
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                    placeholder="Alamat email..."
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Alamat Lengkap</label>
                <textarea 
                  rows={3}
                  value={newSupplier.alamat}
                  onChange={(e) => setNewSupplier({...newSupplier, alamat: e.target.value})}
                  className="w-full p-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  placeholder="Alamat fisik supplier..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingSupplierId(null); }}
                  className="flex-1 py-3 border border-outline-variant rounded-full font-bold text-on-surface hover:bg-surface-container transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all"
                >
                  {editingSupplierId ? 'Perbarui' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SuppliersPage;
