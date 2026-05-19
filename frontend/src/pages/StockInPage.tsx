import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Buku, Supplier } from '../lib/types';

interface RestockItem {
  id: string;
  judul: string;
  isbn: string;
  quantity: number;
  harga_beli: number;
}

const StockInPage: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useNotification();
  const [availableBooks, setAvailableBooks] = useState<Buku[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cart, setCart] = useState<RestockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [noPo, setNoPo] = useState('');
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    fetchBooks();
    fetchSuppliers();
  }, []);

  const fetchBooks = async () => {
    const { data } = await supabase
      .from('buku')
      .select('*')
      .order('judul', { ascending: true });
    if (data) setAvailableBooks(data as Buku[]);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('supplier')
      .select('*')
      .order('nama', { ascending: true });
    if (data) setSuppliers(data as Supplier[]);
  };

  const addToCart = (book: Buku) => {
    const existing = cart.find(item => item.id === book.id);
    if (existing) {
      setCart(cart.map(item => item.id === book.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { id: book.id, judul: book.judul, isbn: book.isbn, quantity: 1, harga_beli: 0 }]);
    }
    setSearchTerm('');
  };

  const formatNumber = (num: number | string) => {
    const value = num.toString().replace(/\D/g, '');
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumber = (str: string) => {
    return Math.max(1, parseInt(str.replace(/\./g, '')) || 0);
  };

  const parsePrice = (str: string) => {
    return parseInt(str.replace(/\./g, '')) || 0;
  };

  const updateQuantity = (id: string, newQty: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, quantity: newQty } : item));
  };

  const updateHargaBeli = (id: string, harga: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, harga_beli: harga } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleRestock = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);

    // === VALIDASI KAPASITAS RAK ===
    // 1. Ambil data rak dengan buku-bukunya
    const { data: rakData } = await supabase
      .from('rak')
      .select('*, buku(id, stok_saat_ini)');

    if (rakData) {
      // 2. Hitung total stok per rak saat ini
      const rakMap: Record<string, { kode_rak: string; kapasitas: number; currentStock: number }> = {};
      (rakData as any[]).forEach((r: any) => {
        const totalStock = (r.buku || []).reduce((sum: number, b: any) => sum + (b.stok_saat_ini || 0), 0);
        rakMap[r.id] = { kode_rak: r.kode_rak, kapasitas: r.kapasitas, currentStock: totalStock };
      });

      // 3. Hitung tambahan per rak dari keranjang restock
      const addedPerRak: Record<string, number> = {};
      for (const item of cart) {
        const book = availableBooks.find(b => b.id === item.id);
        if (book?.id_rak) {
          addedPerRak[book.id_rak] = (addedPerRak[book.id_rak] || 0) + item.quantity;
        }
      }

      // 4. Cek apakah ada rak yang melebihi kapasitas
      for (const [rakId, addedQty] of Object.entries(addedPerRak)) {
        const rak = rakMap[rakId];
        if (rak) {
          const newTotal = rak.currentStock + addedQty;
          if (newTotal > rak.kapasitas) {
            const sisa = Math.max(0, rak.kapasitas - rak.currentStock);
            showAlert(
              `Rak ${rak.kode_rak} akan melebihi kapasitas! ` +
              `Kapasitas: ${rak.kapasitas}, Terisi: ${rak.currentStock}, ` +
              `Sisa ruang: ${sisa} buku. ` +
              `Anda mencoba menambah ${addedQty} buku.`,
              'error'
            );
            setIsLoading(false);
            return;
          }
        }
      }

      // 5. Cek buku tanpa rak
      const booksWithoutRack = cart.filter(item => {
        const book = availableBooks.find(b => b.id === item.id);
        return !book?.id_rak;
      });
      if (booksWithoutRack.length > 0) {
        const titles = booksWithoutRack.map(b => `"${b.judul}"`).join(', ');
        showAlert(`Buku ${titles} belum memiliki lokasi rak! Silakan atur rak di Manajemen Buku terlebih dahulu.`, 'error');
        setIsLoading(false);
        return;
      }
    }

    // === SIMPAN TRANSAKSI ===
    // 1. Simpan Header Transaksi Masuk
    const { data: transData, error: transError } = await (supabase
      .from('transaksi_masuk') as any)
      .insert({
        id_supplier: selectedSupplierId || null,
        id_user: user?.id || null,
        no_po: noPo || null,
        catatan: catatan || null,
        total_item: 0
      } as any)
      .select()
      .single();

    if (transError) {
      showAlert('Gagal simpan transaksi: ' + transError.message, 'error');
      setIsLoading(false);
      return;
    }

    // 2. Simpan Detail Items
    const itemsToInsert = cart.map(item => ({
      id_transaksi_masuk: (transData as any).id,
      id_buku: item.id,
      jumlah_masuk: item.quantity,
      harga_beli: item.harga_beli
    }));

    const { error: itemsError } = await (supabase
      .from('detail_masuk') as any)
      .insert(itemsToInsert as any);

    if (itemsError) {
      showAlert('Gagal simpan detail: ' + itemsError.message, 'error');
    } else {
      showAlert('Berhasil menambah stok buku!', 'success');
      setCart([]);
      setNoPo('');
      setCatatan('');
      setSelectedSupplierId('');
      fetchBooks();
    }
    setIsLoading(false);
  };

  const filteredBooks = availableBooks.filter(b => 
    b.judul.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.isbn.includes(searchTerm)
  ).slice(0, 5);

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">Stok Masuk (Restock)</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Tambah jumlah stok buku dari pengiriman baru.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            {/* Search Header Area */}
            <div className="p-8 border-b border-outline-variant bg-surface-container-low/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-title-md text-on-surface">Daftar Buku Masuk</h3>
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                  <input 
                    className="w-full pl-12 pr-4 h-12 bg-surface border border-outline-variant rounded-full focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    placeholder="Cari Judul atau ISBN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  
                  {searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-20 overflow-hidden">
                      {filteredBooks.map(book => (
                        <button 
                          key={book.id}
                          onClick={() => addToCart(book)}
                          className="w-full p-4 text-left hover:bg-primary/5 border-b border-outline-variant last:border-0 flex justify-between items-center transition-colors"
                        >
                          <div>
                            <p className="font-bold text-on-surface text-sm">{book.judul}</p>
                            <p className="text-[11px] text-secondary">{book.isbn} • Stok: {book.stok_saat_ini}</p>
                          </div>
                          <span className="material-symbols-outlined text-primary">add_circle</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0">
                  <tr>
                    <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">Buku</th>
                    <th className="px-4 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest w-36 text-center">Jumlah</th>
                    <th className="px-4 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest w-40 text-right">Harga Beli (Rp)</th>
                    <th className="px-4 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest w-40 text-right">Sub Total</th>
                    <th className="px-4 py-4 w-16 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {cart.map(item => (
                    <tr key={item.id} className="hover:bg-surface-container-low/20 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-bold text-on-surface">{item.judul}</p>
                        <p className="text-xs text-secondary">{item.isbn}</p>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex items-center justify-center border border-outline-variant rounded-xl bg-surface-container-low max-w-[120px] mx-auto px-2">
                          <input 
                            type="text"
                            className="w-full h-10 bg-transparent text-center font-bold text-on-surface outline-none"
                            value={formatNumber(item.quantity)}
                            onChange={(e) => updateQuantity(item.id, parseNumber(e.target.value))}
                          />
                          <span className="text-[10px] text-secondary font-bold ml-1">PCS</span>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <input 
                          type="text"
                          className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-xl text-right font-mono text-on-surface outline-none focus:border-primary"
                          value={formatNumber(item.harga_beli)}
                          onChange={(e) => updateHargaBeli(item.id, parsePrice(e.target.value))}
                        />
                      </td>
                      <td className="px-4 py-6 text-right font-data-tabular text-on-surface font-bold">
                        Rp {(item.quantity * item.harga_beli).toLocaleString()}
                      </td>
                      <td className="px-4 py-6 text-right">
                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-outline hover:bg-error/10 hover:text-error rounded-full transition-all">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-secondary opacity-50">
                          <span className="material-symbols-outlined text-5xl">inventory</span>
                          <p className="text-sm italic">Keranjang restock masih kosong.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] p-8 shadow-sm sticky top-24 space-y-6">
            <h3 className="font-title-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">verified</span>
              Konfirmasi Restock
            </h3>

            {/* Supplier Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-label-uppercase text-secondary tracking-wider uppercase">Supplier</label>
              <select 
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
              >
                <option value="">-- Pilih Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>

            {/* No PO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-label-uppercase text-secondary tracking-wider uppercase">No. PO</label>
              <input 
                type="text"
                value={noPo}
                onChange={(e) => setNoPo(e.target.value)}
                className="w-full h-10 px-3 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                placeholder="Nomor Purchase Order..."
              />
            </div>

            {/* Catatan */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-label-uppercase text-secondary tracking-wider uppercase">Catatan</label>
              <textarea 
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full p-3 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                placeholder="Catatan tambahan..."
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-2xl">
                <span className="text-xs font-label-uppercase text-secondary tracking-wider">Total Item</span>
                <span className="text-on-surface font-bold">{cart.length} Judul</span>
              </div>
              <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-2xl">
                <span className="text-xs font-label-uppercase text-secondary tracking-wider">Total Qty</span>
                <span className="text-on-surface font-bold text-primary">
                  {formatNumber(cart.reduce((sum, item) => sum + item.quantity, 0))} Pcs
                </span>
              </div>
              <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-2xl">
                <span className="text-xs font-label-uppercase text-secondary tracking-wider">Total Biaya</span>
                <span className="text-on-surface font-bold text-primary">
                  Rp {cart.reduce((sum, item) => sum + (item.quantity * item.harga_beli), 0).toLocaleString()}
                </span>
              </div>
            </div>
            <button 
              disabled={cart.length === 0 || isLoading}
              onClick={handleRestock}
              className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
              {isLoading ? 'Memproses...' : 'Simpan Stok Masuk'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StockInPage;
