import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Book } from '../lib/types';

const LowStockPanel: React.FC = () => {
  const [lowStockBooks, setLowStockBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLowStock = async () => {
      const { data } = await supabase
        .from('books')
        .select('*')
        .lt('stock', 10)
        .order('stock', { ascending: true })
        .limit(5);

      if (data) setLowStockBooks(data);
      setLoading(false);
    };

    fetchLowStock();
  }, []);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-stack-loose shadow-sm h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-title-sm text-title-sm text-on-surface">Peringatan Stok</h3>
        <span className="material-symbols-outlined text-outline">notifications</span>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-4 text-secondary">Memeriksa stok...</p>
        ) : lowStockBooks.length > 0 ? (
          lowStockBooks.map((book) => (
            <div key={book.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-low/50 hover:bg-surface-container transition-colors cursor-pointer border border-transparent hover:border-outline-variant">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                book.stock === 0 ? 'bg-error-container text-on-error-container' : 'bg-warning-container text-on-warning-container'
              }`}>
                <span className="material-symbols-outlined">{book.stock === 0 ? 'error' : 'warning'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-body-md text-on-surface font-semibold truncate">{book.title}</p>
                <p className="font-body-sm text-body-sm text-secondary">Tersisa {book.stock} item</p>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px]">chevron_right</span>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-outline text-4xl mb-2">check_circle</span>
            <p className="text-secondary">Semua stok aman!</p>
          </div>
        )}
      </div>

      <button className="w-full mt-8 py-2 border border-outline-variant rounded-full font-label-uppercase text-label-uppercase text-primary hover:bg-primary/5 transition-colors uppercase tracking-wider">
        Lihat Semua Laporan
      </button>
    </div>
  );
};

export default LowStockPanel;
