import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Buku } from '../lib/types';
import { useNavigate } from 'react-router-dom';

const LowStockPanel: React.FC = () => {
  const [lowStockBooks, setLowStockBooks] = useState<Buku[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const fetchLowStock = async () => {
      const { data } = await supabase
        .from('buku')
        .select('*')
        .lte('stok_saat_ini', 5)
        .order('stok_saat_ini', { ascending: true })
        .limit(15);

      if (!mounted) return;
      if (data) setLowStockBooks(data as Buku[]);
      setLoading(false);
    };

    fetchLowStock();

    const applyRowChange = (type: 'INSERT' | 'UPDATE' | 'DELETE', row: any) => {
      console.debug('[LowStockPanel] applyRowChange', type, row);
      if (!row) return;
      setLowStockBooks(prev => {
        const id = row.id as string;
        const withinThreshold = typeof row.stok_saat_ini === 'number' ? row.stok_saat_ini <= 5 : false;

        if (type === 'DELETE') return prev.filter(b => b.id !== id);

        const exists = prev.find(b => b.id === id);
        if (exists) {
          if (!withinThreshold) return prev.filter(b => b.id !== id);
          return prev.map(b => (b.id === id ? row : b)).sort((a, b) => a.stok_saat_ini - b.stok_saat_ini).slice(0, 15);
        } else {
          if (withinThreshold) return [row, ...prev].sort((a, b) => a.stok_saat_ini - b.stok_saat_ini).slice(0, 15);
          return prev;
        }
      });
    };

    const channel = supabase.channel('realtime-buku')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'buku' },
        (payload) => {
          console.debug('[LowStockPanel] INSERT payload', payload);
          applyRowChange('INSERT', payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'buku' },
        (payload) => {
          console.debug('[LowStockPanel] UPDATE payload', payload);
          applyRowChange('UPDATE', payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'buku' },
        (payload) => {
          console.debug('[LowStockPanel] DELETE payload', payload);
          applyRowChange('DELETE', payload.old);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const shouldScroll = lowStockBooks.length > 5;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] p-8 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="font-title-lg text-on-surface">Peringatan Stok</h3>
          <p className="text-body-sm text-secondary">Buku dengan stok rendah</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-warning-container flex items-center justify-center">
          <span className="material-symbols-outlined text-on-warning-container">warning</span>
        </div>
      </div>

      <div
        className={`space-y-2.5 pr-1 flex-1 min-h-0 custom-scrollbar ${shouldScroll ? 'overflow-y-auto' : 'overflow-y-visible'}`}
        style={shouldScroll ? { maxHeight: '380px' } : undefined}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
          </div>
        ) : lowStockBooks.length > 0 ? (
          lowStockBooks.map((book) => (
            <div key={book.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/50 border border-transparent hover:border-outline-variant transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                book.stok_saat_ini === 0 ? 'bg-error-container text-on-error-container' : 'bg-warning-container text-on-warning-container'
              }`}>
                <span className="material-symbols-outlined text-[20px]">{book.stok_saat_ini === 0 ? 'error' : 'warning'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-body-md text-on-surface font-semibold truncate leading-tight">{book.judul}</p>
                <p className="font-body-sm text-body-sm text-secondary">Tersisa {book.stok_saat_ini} item</p>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-outline text-4xl mb-2">check_circle</span>
            <p className="text-secondary">Semua stok aman!</p>
          </div>
        )}
      </div>

      <button 
        onClick={() => navigate('/reports')}
        className="w-full mt-4 py-2.5 border border-outline-variant rounded-full font-label-uppercase text-label-uppercase text-primary hover:bg-primary/5 transition-colors uppercase tracking-wider shrink-0">
        Lihat Semua Laporan
      </button>
    </div>
  );
};

export default LowStockPanel;
