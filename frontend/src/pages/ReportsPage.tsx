import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { supabase } from '../lib/supabase';

interface TransactionRecord {
  id: string;
  invoice_number: string;
  type: string;
  total_amount: number;
  created_at: string;
  profiles: { full_name: string } | null;
}

const ReportsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outCount: 0,
    inCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    
    // Fetch transactions with profile info
    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles (full_name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setTransactions(data as any);
      
      // Calculate simple stats
      const outTrans = data.filter(t => t.type === 'out');
      const inTrans = data.filter(t => t.type === 'in');
      const revenue = outTrans.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      
      setStats({
        totalRevenue: revenue,
        outCount: outTrans.length,
        inCount: inTrans.length
      });
    }
    
    setLoading(false);
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">Laporan Penjualan</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Analisis performa stok masuk dan stok keluar.
          </p>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-surface-container-high text-on-surface px-6 py-3 rounded-full font-bold shadow-sm hover:bg-surface-container transition-all flex items-center gap-2 no-print"
        >
          <span className="material-symbols-outlined">print</span>
          Cetak Laporan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 no-print">
        <StatCard 
          label="Total Pendapatan" 
          value={`Rp ${stats.totalRevenue.toLocaleString()}`} 
          icon="payments" 
          trend="Total Penjualan Kotor"
        />
        <StatCard 
          label="Buku Terjual" 
          value={stats.outCount.toString()} 
          icon="shopping_cart_checkout" 
          trend="Total Transaksi Keluar"
        />
        <StatCard 
          label="Stok Masuk" 
          value={stats.inCount.toString()} 
          icon="library_add" 
          trend="Total Transaksi Masuk"
        />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-title-lg text-on-surface">Riwayat Transaksi Terkini</h3>
          <span className="text-body-sm text-secondary">{transactions.length} Transaksi tercatat</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">INVOICE</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">TANGGAL</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">TIPE</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">DIKERJAKAN OLEH</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-right">TOTAL NOMINAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                  </td>
                </tr>
              ) : transactions.map((trans) => (
                <tr key={trans.id} className="hover:bg-primary/[0.02] transition-colors">
                  <td className="px-8 py-5 font-bold text-primary font-mono text-[13px]">
                    {trans.invoice_number}
                  </td>
                  <td className="px-8 py-5 text-body-sm text-on-surface-variant">
                    {new Date(trans.created_at).toLocaleString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      trans.type === 'out' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {trans.type === 'out' ? 'Penjualan' : 'Restock'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-body-sm text-on-surface-variant">
                    {trans.profiles?.full_name || 'System / Admin'}
                  </td>
                  <td className="px-8 py-5 text-right font-data-tabular font-bold text-on-surface">
                    Rp {trans.total_amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-secondary italic">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;
