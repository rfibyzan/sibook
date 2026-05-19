import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Buku } from '../lib/types';

interface SaleItem {
  id: string; // book id
  isbn: string;
  judul: string;
  quantity: number;
  harga_jual: number;
}

const StockOutPage: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useNotification();
  const [availableBooks, setAvailableBooks] = useState<Buku[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const { data } = await supabase
      .from('buku')
      .select('*')
      .gt('stok_saat_ini', 0)
      .order('judul', { ascending: true });
    if (data) setAvailableBooks(data as Buku[]);
  };

  const addToCart = (book: Buku) => {
    const existing = cart.find(item => item.id === book.id);
    if (existing) {
      if (existing.quantity >= book.stok_saat_ini) {
        showAlert('Stok tidak mencukupi untuk item ini.', 'warning');
        return;
      }
      setCart(cart.map(item => item.id === book.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { id: book.id, isbn: book.isbn, judul: book.judul, quantity: 1, harga_jual: book.harga_jual }]);
    }
    setSearchTerm('');
  };

  const formatNumber = (num: number | string) => {
    const value = num.toString().replace(/\D/g, '');
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumber = (str: string, max: number) => {
    let val = parseInt(str.replace(/\./g, '')) || 0;
    if (val > max) {
      showAlert(`Maksimal stok tersedia: ${max} pcs`, 'warning');
      return max;
    }
    return Math.max(1, val);
  };

  const updateQuantity = (id: string, newQty: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, quantity: newQty } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.harga_jual), 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);

    // 1. Simpan Header Transaksi Keluar
    const { data: transData, error: transError } = await (supabase
      .from('transaksi_keluar') as any)
      .insert({
        id_user: user?.id || null,
        total_item: 0,
        total_harga: 0,
        catatan: catatan || null
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
      id_transaksi_keluar: (transData as any).id,
      id_buku: item.id,
      jumlah_keluar: item.quantity,
      harga_jual: item.harga_jual
    }));

    const { error: itemsError } = await (supabase
      .from('detail_keluar') as any)
      .insert(itemsToInsert as any);

    if (itemsError) {
      showAlert('Gagal simpan detail: ' + itemsError.message, 'error');
    } else {
      showAlert('Transaksi Berhasil! Stok database telah diperbarui.', 'success');
      setCart([]);
      setCatatan('');
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 5000);
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
          <h2 className="font-display-lg text-display-lg text-primary">Stok Keluar (Penjualan)</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Catat penjualan buku. Stok akan berkurang otomatis di database.
          </p>
        </div>
      </div>

      {isSuccess && (
        <div className="mb-6 bg-green-500 text-white p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <span className="material-symbols-outlined">check_circle</span>
          <span className="font-title-sm">Transaksi Berhasil! Stok database telah diperbarui.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            {/* Search Header Area */}
            <div className="p-8 border-b border-outline-variant bg-surface-container-low/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-title-md text-on-surface">Keranjang Belanja</h3>
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                  <input 
                    className="w-full pl-12 pr-4 h-12 bg-surface border border-outline-variant rounded-full focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    placeholder="Cari & Tambah Buku..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  
                  {searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-20 overflow-hidden">
                      {filteredBooks.length > 0 ? filteredBooks.map(book => (
                        <button 
                          key={book.id}
                          onClick={() => addToCart(book)}
                          className="w-full p-4 text-left hover:bg-primary/5 border-b border-outline-variant last:border-0 flex justify-between items-center transition-colors"
                        >
                          <div>
                            <p className="font-bold text-on-surface text-sm">{book.judul}</p>
                            <p className="text-[11px] text-secondary">{book.isbn} • Stok: {book.stok_saat_ini}</p>
                          </div>
                          <p className="font-data-tabular text-primary font-bold text-sm">Rp {book.harga_jual.toLocaleString()}</p>
                        </button>
                      )) : (
                        <div className="p-4 text-center text-secondary text-sm italic">Buku tidak ditemukan</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cart Table Area */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0">
                  <tr>
                    <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">Item</th>
                    <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest w-40 text-center">Jumlah</th>
                    <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-right">Harga</th>
                    <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-right">Subtotal</th>
                    <th className="px-8 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {cart.map(item => {
                    const original = availableBooks.find(b => b.id === item.id);
                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/20 transition-colors">
                        <td className="px-8 py-6">
                          <p className="font-bold text-on-surface">{item.judul}</p>
                          <p className="text-xs text-secondary">{item.isbn}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center border border-outline-variant rounded-xl bg-surface-container-low max-w-[140px] mx-auto px-2">
                            <input 
                              type="text"
                              className="w-full h-10 bg-transparent text-center font-bold text-on-surface outline-none"
                              value={formatNumber(item.quantity)}
                              onChange={(e) => updateQuantity(item.id, parseNumber(e.target.value, original?.stok_saat_ini || 0))}
                            />
                            <span className="text-[10px] text-secondary font-bold ml-1">PCS</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right font-data-tabular text-on-surface">Rp {item.harga_jual.toLocaleString()}</td>
                        <td className="px-8 py-6 text-right font-data-tabular text-on-surface font-bold">Rp {(item.quantity * item.harga_jual).toLocaleString()}</td>
                        <td className="px-8 py-6 text-center">
                          <button onClick={() => removeFromCart(item.id)} className="p-2 text-outline hover:bg-error/10 hover:text-error rounded-full transition-all">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-secondary opacity-50">
                          <span className="material-symbols-outlined text-5xl">shopping_cart_checkout</span>
                          <p className="text-sm italic">Keranjang masih kosong...</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payment Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] p-8 shadow-sm sticky top-24">
            <h3 className="font-title-sm text-on-surface mb-6 flex items-center gap-2 border-b border-outline-variant pb-4">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              Ringkasan Pembayaran
            </h3>

            {/* Catatan */}
            <div className="flex flex-col gap-1.5 mb-6">
              <label className="text-[10px] font-label-uppercase text-secondary tracking-wider uppercase">Catatan</label>
              <textarea 
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full p-3 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                placeholder="Catatan tambahan..."
              />
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-secondary">Subtotal</span>
                <span className="text-on-surface font-medium">Rp {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-secondary">PPN (11%)</span>
                <span className="text-on-surface font-medium">Rp {tax.toLocaleString()}</span>
              </div>
              <div className="h-px bg-outline-variant my-4"></div>
              <div className="bg-primary/5 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-label-uppercase text-primary tracking-widest font-bold">TOTAL BAYAR</span>
                </div>
                <div className="text-2xl font-bold text-primary tracking-tight">
                  Rp {total.toLocaleString()}
                </div>
              </div>
            </div>
            <button 
              disabled={cart.length === 0 || isLoading}
              onClick={handleCheckout}
              className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[20px]">payments</span>
              {isLoading ? 'Memproses...' : 'Selesaikan Transaksi'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StockOutPage;
