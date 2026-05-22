import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import type { Rak } from '../lib/types';
import Pagination from '../components/Pagination';

interface RakWithBuku extends Rak {
  buku?: { stok_saat_ini: number }[];
}

const LocationsPage: React.FC = () => {
  const { showAlert, showConfirm } = useNotification();
  const [locations, setLocations] = useState<RakWithBuku[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ kode_rak: '', seksi: '', kapasitas: 0 });
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLocations = locations.filter(loc => 
    loc.kode_rak.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.seksi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
  const currentLocations = filteredLocations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rak')
      .select('*, buku(stok_saat_ini)')
      .order('kode_rak', { ascending: true });
    if (data) setLocations(data as RakWithBuku[]);
    setLoading(false);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = editingLocationId
      ? await (supabase.from('rak') as any).update(newLocation as any).eq('id', editingLocationId)
      : await (supabase.from('rak') as any).insert([newLocation] as any);

    if (!error) {
      setIsModalOpen(false);
      setEditingLocationId(null);
      setNewLocation({ kode_rak: '', seksi: '', kapasitas: 0 });
      showAlert(editingLocationId ? 'Lokasi rak berhasil diperbarui!' : 'Lokasi rak berhasil ditambahkan!', 'success');
      fetchLocations();
    } else {
      const msg = error.message.includes('unique constraint') || error.message.includes('already exists')
        ? `Kode rak "${newLocation.kode_rak}" sudah digunakan. Silakan gunakan kode lain.`
        : error.message;
      showAlert('Gagal menyimpan lokasi: ' + msg, 'error');
    }
  };

  const handleEditClick = (loc: Rak) => {
    setEditingLocationId(loc.id);
    setNewLocation({ kode_rak: loc.kode_rak, seksi: loc.seksi, kapasitas: loc.kapasitas });
    setIsModalOpen(true);
  };

  const deleteLocation = (id: string) => {
    showConfirm({
      title: 'Hapus Lokasi Rak',
      message: 'Apakah Anda yakin ingin menghapus lokasi rak ini? Buku yang terdaftar di rak ini akan disesuaikan.',
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('rak').delete().eq('id', id);
        if (!error) {
          showAlert('Lokasi rak berhasil dihapus!', 'success');
          fetchLocations();
        } else {
          showAlert('Gagal menghapus lokasi: ' + error.message, 'error');
        }
      }
    });
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">Manajemen Lokasi Rak</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Kelola tata letak rak penyimpanan buku untuk memudahkan pencarian stok.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          Tambah Rak
        </button>
      </div>

      {/* Search Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary">search</span>
          <input 
            type="text" 
            placeholder="Cari rak berdasarkan kode atau seksi..." 
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
        ) : currentLocations.map((loc) => {
          const totalStock = loc.buku ? loc.buku.reduce((sum, b) => sum + (b.stok_saat_ini || 0), 0) : 0;
          const percentage = loc.kapasitas > 0 ? Math.min(100, Math.round((totalStock / loc.kapasitas) * 100)) : 0;
          
          let progressColor = 'bg-gradient-to-r from-primary to-secondary';
          let statusText = 'Aktif / Normal';
          let statusColor = 'text-primary';
          let statusIcon = 'check_circle';

          if (percentage >= 100) {
            progressColor = 'bg-gradient-to-r from-error to-red-600';
            statusText = 'Penuh';
            statusColor = 'text-error';
            statusIcon = 'warning';
          } else if (percentage >= 80) {
            progressColor = 'bg-gradient-to-r from-warning to-amber-500';
            statusText = 'Hampir Penuh';
            statusColor = 'text-warning';
            statusIcon = 'info';
          } else if (totalStock === 0) {
            progressColor = 'bg-outline-variant';
            statusText = 'Kosong';
            statusColor = 'text-secondary opacity-60';
            statusIcon = 'circle_notifications';
          }

          return (
            <div key={loc.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">shelves</span>
                    </div>
                    <div>
                      <p className="font-title-sm text-on-surface leading-none">{loc.kode_rak}</p>
                      <p className="text-[11px] text-secondary uppercase tracking-wider mt-1">Seksi {loc.seksi}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditClick(loc)}
                      className="text-outline hover:text-primary"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button 
                      onClick={() => deleteLocation(loc.id)}
                      className="text-outline hover:text-error"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[11px] font-label-uppercase text-secondary mb-1">
                      <span>Kapasitas ({percentage}%)</span>
                      <span>{totalStock} / {loc.kapasitas} Buku</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${progressColor} transition-all duration-500 ease-out`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-outline-variant flex justify-between items-center">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>{statusText}</span>
                <span className={`material-symbols-outlined ${statusColor} text-[16px]`}>{statusIcon}</span>
              </div>
            </div>
          );
        })}
        {!loading && currentLocations.length === 0 && (
          <div className="col-span-full py-20 text-center text-secondary bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant">
            {locations.length === 0 
              ? 'Belum ada data rak. Klik "Tambah Rak" untuk memulai.' 
              : 'Tidak ada lokasi rak yang sesuai dengan pencarian.'}
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
            <h3 className="font-headline-sm text-on-surface mb-6">{editingLocationId ? 'Edit Lokasi Rak' : 'Tambah Rak Baru'}</h3>
            <form onSubmit={handleAddLocation} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Kode Rak</label>
                  <input 
                    type="text" required placeholder="Masukkan kode rak..."
                    value={newLocation.kode_rak}
                    onChange={(e) => setNewLocation({...newLocation, kode_rak: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Seksi</label>
                  <input 
                    type="text" required placeholder="Masukkan seksi..."
                    value={newLocation.seksi}
                    onChange={(e) => setNewLocation({...newLocation, seksi: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Kapasitas Maksimal</label>
                <input 
                  type="number" required
                  value={newLocation.kapasitas || ''}
                  onChange={(e) => setNewLocation({...newLocation, kapasitas: parseInt(e.target.value) || 0})}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  placeholder="Jumlah buku"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingLocationId(null); }}
                  className="flex-1 py-3 border border-outline-variant rounded-full font-bold text-on-surface hover:bg-surface-container transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all"
                >
                  {editingLocationId ? 'Perbarui' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LocationsPage;
