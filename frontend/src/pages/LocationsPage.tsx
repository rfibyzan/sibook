import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useNotification } from '../context/NotificationContext';
import type { Location } from '../lib/types';

const LocationsPage: React.FC = () => {
  const { showAlert, showConfirm } = useNotification();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({ rack_code: '', section: '', capacity: 0 });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('rack_code', { ascending: true });
    if (data) setLocations(data);
    setLoading(false);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('locations')
      .insert([newLocation]);

    if (!error) {
      setIsModalOpen(false);
      setNewLocation({ rack_code: '', section: '', capacity: 0 });
      showAlert('Lokasi rak berhasil ditambahkan!', 'success');
      fetchLocations();
    } else {
      showAlert('Gagal menambah lokasi: ' + error.message, 'error');
    }
  };

  const deleteLocation = (id: string) => {
    showConfirm({
      title: 'Hapus Lokasi',
      message: 'Hapus rak ini dari sistem? Pastikan tidak ada buku yang terdaftar di rak ini.',
      confirmText: 'Ya, Hapus',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (!error) {
          showAlert('Lokasi berhasil dihapus', 'success');
          fetchLocations();
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
          <h2 className="font-display-lg text-display-lg text-primary">Manajemen Lokasi Rak</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Kelola area penyimpanan dan kapasitas rak buku Anda.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">add_location</span>
          Tambah Rak
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
          </div>
        ) : locations.map((loc) => (
          <div key={loc.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-all group">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">shelves</span>
                </div>
                <div>
                  <p className="font-title-sm text-on-surface leading-none">{loc.rack_code}</p>
                  <p className="text-[11px] text-secondary uppercase tracking-wider">Seksi {loc.section}</p>
                </div>
              </div>
              <button 
                onClick={() => deleteLocation(loc.id)}
                className="text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] font-label-uppercase text-secondary mb-1">
                  <span>Kapasitas</span>
                  <span>{loc.capacity} Buku</span>
                </div>
                <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-secondary w-full opacity-30"></div>
                </div>
              </div>
              <div className="pt-2 border-t border-outline-variant flex justify-between items-center">
                <span className="text-[10px] text-outline italic">Status: Aktif</span>
                <span className="material-symbols-outlined text-green-500 text-[16px]">check_circle</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && locations.length === 0 && (
          <div className="col-span-full py-20 text-center text-secondary bg-surface-container-low rounded-3xl border-2 border-dashed border-outline-variant">
            Belum ada data rak. Klik "Tambah Rak" untuk memulai.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <h3 className="font-headline-sm text-on-surface mb-6">Tambah Rak Baru</h3>
            <form onSubmit={handleAddLocation} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Kode Rak</label>
                  <input 
                    type="text" required placeholder="A1, B2..."
                    value={newLocation.rack_code}
                    onChange={(e) => setNewLocation({...newLocation, rack_code: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Seksi</label>
                  <input 
                    type="text" required placeholder="S1, S2..."
                    value={newLocation.section}
                    onChange={(e) => setNewLocation({...newLocation, section: e.target.value})}
                    className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-uppercase text-secondary text-[11px] uppercase tracking-wider">Kapasitas Maksimal</label>
                <input 
                  type="number" required
                  value={newLocation.capacity}
                  onChange={(e) => setNewLocation({...newLocation, capacity: parseInt(e.target.value)})}
                  className="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface focus:border-primary outline-none"
                  placeholder="Jumlah buku"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-outline-variant rounded-full font-bold text-on-surface hover:bg-surface-container transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-primary/90 transition-all"
                >
                  Simpan Rak
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
