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

  const formatNumber = (num: number | string) => {
    const value = num.toString().replace(/\D/g, '');
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumber = (str: string) => {
    return Math.max(1, parseInt(str.replace(/\./g, '')) || 0);
  };

  const updateQuantity = (id: string, newQty: number) => {
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
                            <p className="font-bold text-on-surface text-sm">{book.title}</p>
                            <p className="text-[11px] text-secondary">{book.isbn} • Stok: {book.stock}</p>
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
                    <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest w-48 text-center">Jumlah</th>
                    <th className="px-8 py-4 w-16 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {cart.map(item => (
                    <tr key={item.id} className="hover:bg-surface-container-low/20 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-bold text-on-surface">{item.title}</p>
                        <p className="text-xs text-secondary">{item.isbn}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center border border-outline-variant rounded-xl bg-surface-container-low max-w-[140px] mx-auto px-2">
                          <input 
                            type="text"
                            className="w-full h-10 bg-transparent text-center font-bold text-on-surface outline-none"
                            value={formatNumber(item.quantity)}
                            onChange={(e) => updateQuantity(item.id, parseNumber(e.target.value))}
                          />
                          <span className="text-[10px] text-secondary font-bold ml-1">PCS</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-outline hover:bg-error/10 hover:text-error rounded-full transition-all">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-32 text-center">
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
          <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] p-8 shadow-sm sticky top-24">
            <h3 className="font-title-sm text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">verified</span>
              Konfirmasi Restock
            </h3>
            <div className="space-y-4 mb-8">
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
