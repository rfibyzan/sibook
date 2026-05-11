import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Book } from '../lib/types';

interface RestockItem {
  id: string;
  title: string;
  isbn: string;
  quantity: number;
}

const StockInPage: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useNotification();
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [cart, setCart] = useState<RestockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .order('title', { ascending: true });
    if (data) setAvailableBooks(data);
  };

  const addToCart = (book: Book) => {
    const existing = cart.find(item => item.id === book.id);
    if (existing) {
      setCart(cart.map(item => item.id === book.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { id: book.id, title: book.title, isbn: book.isbn, quantity: 1 }]);
    }
    setSearchTerm('');
  };

  const updateQuantity = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setCart(cart.map(item => item.id === id ? { ...item, quantity: newQty } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleRestock = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);

    // 1. Simpan Header Transaksi (Tipe 'in')
    const { data: transData, error: transError } = await (supabase
      .from('transactions') as any)
      .insert({
        type: 'in',
        user_id: user?.id || null,
        total_amount: 0, 
        invoice_number: `RST-${Date.now()}`
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
      unit_price: 0
    }));

    const { error: itemsError } = await (supabase
      .from('transaction_items') as any)
      .insert(itemsToInsert as any);

    if (itemsError) {
      showAlert('Gagal simpan detail: ' + itemsError.message, 'error');
    } else {
      showAlert('Berhasil menambah stok buku!', 'success');
      setCart([]);
      fetchBooks();
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
          <h2 className="font-display-lg text-display-lg text-primary">Stok Masuk (Restock)</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Tambah jumlah stok buku dari pengiriman baru.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Search */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
            <h3 className="font-title-sm text-on-surface mb-4">Cari Buku untuk Direstock</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input 
                className="w-full pl-12 pr-4 h-14 bg-surface border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="Judul Buku atau ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              {searchTerm && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-20 overflow-hidden">
                  {filteredBooks.map(book => (
                    <button 
                      key={book.id}
                      onClick={() => addToCart(book)}
                      className="w-full p-4 text-left hover:bg-primary/5 border-b border-outline-variant last:border-0 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-on-surface">{book.title}</p>
                        <p className="text-xs text-secondary">{book.isbn} • Stok Sekarang: {book.stock}</p>
                      </div>
                      <span className="material-symbols-outlined text-primary">add_circle</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm min-h-[400px]">
            <h3 className="font-title-sm text-on-surface mb-6">Daftar Buku Masuk</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px]">Buku</th>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px] w-40 text-center">Jumlah Tambahan</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {cart.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <p className="font-bold text-on-surface">{item.title}</p>
                        <p className="text-xs text-secondary">{item.isbn}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center border border-outline-variant rounded-lg overflow-hidden bg-surface max-w-[120px] mx-auto">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 hover:bg-surface-container text-primary font-bold">-</button>
                          <span className="w-10 text-center font-bold text-on-surface">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 hover:bg-surface-container text-primary font-bold">+</button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => removeFromCart(item.id)} className="text-outline hover:text-error transition-colors">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-20 text-center text-secondary italic">Keranjang restock masih kosong.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm sticky top-24">
            <h3 className="font-title-sm text-on-surface mb-6 border-b border-outline-variant pb-4">Konfirmasi Restock</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-body-md">
                <span className="text-secondary">Total Item</span>
                <span className="text-on-surface font-bold">{cart.length} Judul</span>
              </div>
              <div className="flex justify-between text-body-md">
                <span className="text-secondary">Total Qty</span>
                <span className="text-on-surface font-bold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} Pcs
                </span>
              </div>
            </div>
            <button 
              disabled={cart.length === 0 || isLoading}
              onClick={handleRestock}
              className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined">inventory_2</span>
              {isLoading ? 'Memproses...' : 'Simpan Stok Masuk'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StockInPage;
