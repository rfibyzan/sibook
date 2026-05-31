import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TransactionDetailModalProps {
  transactionId: string;
  type: 'masuk' | 'keluar';
  onClose: () => void;
}

interface DetailData {
  id: string;
  type: 'masuk' | 'keluar';
  date: string;
  dibuat_pada: string;
  label: string;
  user: string;
  totalQty: number;
  totalAmount: number;
  catatan: string | null;
  details: {
    id_buku: string;
    judul: string;
    pengarang: string;
    qty: number;
    price: number;
    subtotal: number;
  }[];
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ transactionId, type, onClose }) => {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (type === 'masuk') {
          const { data: trans } = await supabase
            .from('transaksi_masuk')
            .select(`
              *,
              supplier (nama),
              detail_masuk (
                jumlah_masuk,
                harga_beli,
                id_buku,
                buku (judul, pengarang)
              )
            `)
            .eq('id', transactionId)
            .single();

          if (trans) {
            let userId = trans.id_user;
            let userName = 'System';
            if (userId) {
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
              if (profile) userName = profile.full_name;
            }

            const qty = trans.detail_masuk?.reduce((sum: number, d: any) => sum + (d.jumlah_masuk || 0), 0) || 0;
            const amount = trans.detail_masuk?.reduce((sum: number, d: any) => sum + (d.jumlah_masuk * d.harga_beli || 0), 0) || 0;

            const details = (trans.detail_masuk || []).map((d: any) => ({
              id_buku: d.id_buku,
              judul: d.buku?.judul || 'Buku Dihapus/Tidak Dikenal',
              pengarang: d.buku?.pengarang || '-',
              qty: d.jumlah_masuk || 0,
              price: d.harga_beli || 0,
              subtotal: (d.jumlah_masuk || 0) * (d.harga_beli || 0)
            }));

            setData({
              id: trans.id,
              type: 'masuk',
              date: trans.tanggal_masuk,
              dibuat_pada: trans.dibuat_pada,
              label: trans.no_po || `RST-${trans.id.slice(0, 8)}`,
              user: userName,
              totalQty: qty,
              totalAmount: amount,
              catatan: trans.catatan,
              details
            });
          }
        } else {
          const { data: trans } = await supabase
            .from('transaksi_keluar')
            .select(`
              *,
              detail_keluar (
                jumlah_keluar,
                harga_jual,
                id_buku,
                buku (judul, pengarang)
              )
            `)
            .eq('id', transactionId)
            .single();

          if (trans) {
            let userId = trans.id_user;
            let userName = 'System';
            if (userId) {
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
              if (profile) userName = profile.full_name;
            }

            const qty = trans.detail_keluar?.reduce((sum: number, d: any) => sum + (d.jumlah_keluar || 0), 0) || 0;
            const amount = trans.total_harga || trans.detail_keluar?.reduce((sum: number, d: any) => sum + (d.jumlah_keluar * d.harga_jual || 0), 0) || 0;

            const details = (trans.detail_keluar || []).map((d: any) => ({
              id_buku: d.id_buku,
              judul: d.buku?.judul || 'Buku Dihapus/Tidak Dikenal',
              pengarang: d.buku?.pengarang || '-',
              qty: d.jumlah_keluar || 0,
              price: d.harga_jual || 0, // Fallback if no price
              subtotal: (d.jumlah_keluar || 0) * (d.harga_jual || 0)
            }));

            setData({
              id: trans.id,
              type: 'keluar',
              date: trans.tanggal_keluar,
              dibuat_pada: trans.dibuat_pada,
              label: `TRS-${trans.id.slice(0, 8)}`,
              user: userName,
              totalQty: qty,
              totalAmount: amount,
              catatan: trans.catatan,
              details
            });
          }
        }
      } catch (error) {
        console.error('Error fetching transaction details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      fetchData();
    }
  }, [transactionId, type]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-[32px] shadow-2xl p-8 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-primary text-5xl mb-4">progress_activity</span>
            <p className="text-secondary">Memuat detail transaksi...</p>
          </div>
        ) : data ? (
          <>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-headline-sm text-on-surface">Detail Transaksi {data.label}</h3>
                <p className="text-secondary text-body-md mt-1">
                  {new Date(data.dibuat_pada).toLocaleString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                  {' '} • Dikerjakan oleh {data.user}
                </p>
              </div>
              <button onClick={onClose} className="p-2 text-outline hover:bg-surface-container hover:text-on-surface rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px] tracking-widest">Judul Buku</th>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px] tracking-widest text-center">Qty</th>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px] tracking-widest text-right">Harga</th>
                    <th className="px-4 py-3 font-label-uppercase text-secondary text-[11px] tracking-widest text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {data.details.map((detail, idx) => (
                    <tr key={idx} className="hover:bg-primary/[0.02] transition-colors">
                      <td className="px-4 py-4">
                        <p className="font-bold text-on-surface text-sm">{detail.judul}</p>
                        <p className="text-xs text-secondary">{detail.pengarang}</p>
                      </td>
                      <td className="px-4 py-4 text-center font-data-tabular">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          data.type === 'keluar' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {data.type === 'keluar' ? '-' : '+'}{detail.qty}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-data-tabular text-sm">
                        Rp {detail.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-data-tabular text-sm font-bold text-on-surface">
                        Rp {detail.subtotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {data.details.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-secondary italic">
                        Tidak ada detail item yang tersimpan untuk transaksi ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {data.catatan && (
                <div className="mt-6 bg-surface-container-low p-4 rounded-2xl border border-outline-variant">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-secondary block mb-1">Catatan Transaksi:</span>
                  <p className="text-body-sm text-on-surface">{data.catatan}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-outline-variant flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-widest text-secondary">Total Item</span>
                <span className="font-title-lg text-on-surface">{data.totalQty} pcs</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[11px] font-bold uppercase tracking-widest text-secondary">Total Nominal</span>
                <span className="font-headline-sm text-primary font-bold">Rp {data.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-outline-variant text-5xl mb-4">error</span>
            <p className="text-secondary font-medium">Transaksi tidak ditemukan</p>
            <button onClick={onClose} className="mt-6 px-6 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary-fixed-dim transition-colors">
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionDetailModal;
