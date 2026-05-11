import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Book } from '../lib/types';

interface SaleItem {
  id: string; // book id
  isbn: string;
  title: string;
  quantity: number;
  price: number;
}

const StockOutPage: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useNotification();
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .gt('stock', 0) // Hanya tampilkan yang ada stoknya
      .order('title', { ascending: true });
    if (data) setAvailableBooks(data);
  };

  const addToCart = (book: Book) => {
    const existing = cart.find(item => item.id === book.id);
    if (existing) {
      if (existing.quantity >= book.stock) {
        showAlert('Stok tidak mencukupi untuk item ini.', 'warning');
        return;
      }
      setCart(cart.map(item => item.id === book.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { id: book.id, isbn: book.isbn, title: book.title, quantity: 1, price: book.price }]);
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

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);

    // 1. Simpan Header Transaksi
    const { data: transData, error: transError } = await (supabase
      .from('transactions') as any)
      .insert({
        type: 'out',
        user_id: user?.id || null,
        total_amount: total,
        invoice_number: `TRS-${Date.now()}`
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
      transaction_id: (transData as any).id,
      book_id: item.id,
      quantity: item.quantity,
      unit_price: item.price
    }));

    const { error: itemsError } = await (supabase
      .from('transaction_items') as any)
      .insert(itemsToInsert as any);

    if (itemsError) {
      showAlert('Gagal simpan detail: ' + itemsError.message, 'error');
    } else {
      showAlert('Transaksi Berhasil! Stok database telah diperbarui.', 'success');
      setCart([]);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 5000);
      fetchBooks(); // Refresh stok
    }
    
    setIsLoading(false);
  };

  const filteredBooks = availableBooks.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 space-y-gutter">
          {/* Search Section */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-title-sm text-on-surface mb-4">Cari & Tambah Buku</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input 
                className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Ketik Judul Buku atau ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              {searchTerm && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-10 overflow-hidden">
                  {filteredBooks.length > 0 ? filteredBooks.map(book => (
                    <button 
                      key={book.id}
                      onClick={() => addToCart(book)}
                      className="w-full p-4 text-left hover:bg-primary/5 border-b border-outline-variant last:border-0 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-on-surface">{book.title}</p>
                        <p className="text-xs text-secondary">{book.isbn} • Stok: {book.stock}</p>
                      </div>
                      <p className="font-data-tabular text-primary font-bold">Rp {book.price.toLocaleString()}</p>
                    </button>
                  )) : (
                    <p className="p-4 text-center text-secondary">Buku tidak ditemukan atau stok habis.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm min-h-[300px]">
            <h3 className="font-title-sm text-on-surface mb-6">Keranjang Belanja</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low border-b border-outline-variant text-left">
                  <tr>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px]">Item</th>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px] w-40 text-center">Jumlah</th>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px] text-right">Harga</th>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px] text-right">Subtotal</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {cart.map(item => {
                    const original = availableBooks.find(b => b.id === item.id);
                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low/30">
                        <td className="px-4 py-4">
                          <p className="font-bold text-on-surface">{item.title}</p>
                          <p className="text-xs text-secondary">{item.isbn}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center border border-outline-variant rounded-xl bg-surface-container-low max-w-[140px] mx-auto px-2">
                            <input 
                              type="text"
                              className="w-full h-10 bg-transparent text-center font-bold text-on-surface outline-none"
                              value={formatNumber(item.quantity)}
                              onChange={(e) => updateQuantity(item.id, parseNumber(e.target.value, original?.stock || 0))}
                            />
                            <span className="text-[10px] text-secondary font-bold ml-1">PCS</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-data-tabular text-on-surface">Rp {item.price.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right font-data-tabular text-on-surface font-bold">Rp {(item.quantity * item.price).toLocaleString()}</td>
                        <td className="px-4 py-4 text-center">
                          <button onClick={() => removeFromCart(item.id)} className="text-outline hover:text-error transition-colors"><span className="material-symbols-outlined">delete</span></button>
                        </td>
                      </tr>
                    );
                  })}
                  {cart.length === 0 && (
                    <tr><td colSpan={5} className="py-20 text-center text-secondary italic">Keranjang masih kosong...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="space-y-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm sticky top-24">
            <h3 className="font-title-sm text-on-surface mb-6 border-b border-outline-variant pb-4">Ringkasan Pembayaran</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-body-md"><span className="text-secondary">Subtotal</span><span className="text-on-surface font-medium">Rp {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-body-md"><span className="text-secondary">PPN (11%)</span><span className="text-on-surface font-medium">Rp {tax.toLocaleString()}</span></div>
              <div className="h-px bg-outline-variant my-4"></div>
              <div className="flex justify-between items-center"><span className="font-bold text-on-surface">TOTAL</span><span className="font-headline-md text-primary font-bold">Rp {total.toLocaleString()}</span></div>
            </div>
            <button 
              disabled={cart.length === 0 || isLoading}
              onClick={handleCheckout}
              className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined">payments</span>
              {isLoading ? 'Memproses...' : 'Selesaikan Transaksi'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StockOutPage;
