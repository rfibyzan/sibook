import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { supabase } from '../lib/supabase';
import Pagination from '../components/Pagination';

interface TransaksiMasukRecord {
  id: string;
  id_user: string | null;
  no_po: string | null;
  total_item: number;
  catatan: string | null;
  dibuat_pada: string;
  tanggal_masuk: string;
  supplier: { nama: string } | null;
  detail_masuk: { jumlah_masuk: number; harga_beli: number }[];
}

interface TransaksiKeluarRecord {
  id: string;
  id_user: string | null;
  total_item: number;
  total_harga: number;
  catatan: string | null;
  dibuat_pada: string;
  tanggal_keluar: string;
  detail_keluar: { jumlah_keluar: number; harga_jual: number }[];
}

type CombinedRecord = {
  id: string;
  type: 'masuk' | 'keluar';
  date: string;
  dibuat_pada: string;
  label: string;
  user: string;
  totalQty: number;
  totalAmount: number;
};

const ReportsPage: React.FC = () => {
  const [combinedRecords, setCombinedRecords] = useState<CombinedRecord[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBooksSold: 0,
    totalBooksRestocked: 0,
    outCount: 0,
    inCount: 0
  });
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(combinedRecords.length / itemsPerPage);
  const currentRecords = combinedRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);

    // Fetch profiles untuk mapping id_user -> nama
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');

    const profileMap: Record<string, string> = {};
    (profilesData || []).forEach((p: any) => {
      if (p.id && p.full_name) profileMap[p.id] = p.full_name;
    });

    // Fetch transaksi masuk
    const { data: masukData, error: masukError } = await (supabase
      .from('transaksi_masuk') as any)
      .select(`
        *,
        supplier (nama),
        detail_masuk (jumlah_masuk, harga_beli)
      `)
      .order('dibuat_pada', { ascending: false });

    if (masukError) console.error('Error fetching transaksi masuk:', masukError);

    // Fetch transaksi keluar
    const { data: keluarData, error: keluarError } = await (supabase
      .from('transaksi_keluar') as any)
      .select(`
        *,
        detail_keluar (jumlah_keluar, harga_jual)
      `)
      .order('dibuat_pada', { ascending: false });

    if (keluarError) console.error('Error fetching transaksi keluar:', keluarError);

    const masukRecords = (masukData || []) as unknown as TransaksiMasukRecord[];
    const keluarRecords = (keluarData || []) as unknown as TransaksiKeluarRecord[];

    let revenue = 0;
    let soldQty = 0;
    let restockQty = 0;

    // Process masuk
    const masukCombined: CombinedRecord[] = masukRecords.map(t => {
      const qty = t.detail_masuk?.reduce((sum, d) => sum + (d.jumlah_masuk || 0), 0) || 0;
      const amount = t.detail_masuk?.reduce((sum, d) => sum + (d.jumlah_masuk * d.harga_beli || 0), 0) || 0;
      restockQty += qty;
      return {
        id: t.id,
        type: 'masuk' as const,
        date: t.tanggal_masuk,
        dibuat_pada: t.dibuat_pada,
        label: t.no_po || `RST-${t.id.slice(0, 8)}`,
        user: t.id_user ? (profileMap[t.id_user] || 'User') : 'System',
        totalQty: qty,
        totalAmount: amount
      };
    });

    // Process keluar
    const keluarCombined: CombinedRecord[] = keluarRecords.map(t => {
      const qty = t.detail_keluar?.reduce((sum, d) => sum + (d.jumlah_keluar || 0), 0) || 0;
      const amount = t.total_harga || t.detail_keluar?.reduce((sum, d) => sum + (d.jumlah_keluar * d.harga_jual || 0), 0) || 0;
      revenue += amount;
      soldQty += qty;
      return {
        id: t.id,
        type: 'keluar' as const,
        date: t.tanggal_keluar,
        dibuat_pada: t.dibuat_pada,
        label: `TRS-${t.id.slice(0, 8)}`,
        user: t.id_user ? (profileMap[t.id_user] || 'User') : 'System',
        totalQty: qty,
        totalAmount: amount
      };
    });

    // Combine and sort by date descending
    const all = [...masukCombined, ...keluarCombined].sort(
      (a, b) => new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime()
    );

    setCombinedRecords(all);
    setStats({
      totalRevenue: revenue,
      totalBooksSold: soldQty,
      totalBooksRestocked: restockQty,
      outCount: keluarRecords.length,
      inCount: masukRecords.length
    });

    setLoading(false);
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">Laporan Transaksi</h2>
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
          value={stats.totalBooksSold.toString()}
          icon="shopping_cart_checkout"
          trend={`${stats.outCount} Transaksi Keluar`}
        />
        <StatCard
          label="Stok Masuk"
          value={stats.totalBooksRestocked.toString()}
          icon="library_add"
          trend={`${stats.inCount} Transaksi Masuk`}
        />
      </div>

      <div id="print-area" className="bg-surface-container-lowest border border-outline-variant rounded-[32px] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-title-lg text-on-surface">Riwayat Transaksi Terkini</h3>
          <span className="text-body-sm text-secondary">{combinedRecords.length} Transaksi tercatat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">NO. REF</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">TANGGAL</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">TIPE</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">DIKERJAKAN OLEH</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-center">QTY</th>
                <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-right">TOTAL NOMINAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                  </td>
                </tr>
              ) : currentRecords.map((trans) => (
                <tr key={trans.id} className="hover:bg-primary/[0.02] transition-colors">
                  <td className="px-8 py-5 font-bold text-primary font-mono text-[13px]">
                    {trans.label}
                  </td>
                  <td className="px-8 py-5 text-body-sm text-on-surface-variant">
                    {new Date(trans.dibuat_pada).toLocaleString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${trans.type === 'keluar' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {trans.type === 'keluar' ? 'Penjualan' : 'Restock'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-body-sm text-on-surface-variant">
                    {trans.user}
                  </td>
                  <td className="px-8 py-5 text-center font-data-tabular text-on-surface">
                    {trans.totalQty} pcs
                  </td>
                  <td className="px-8 py-5 text-right font-data-tabular font-bold text-on-surface">
                    Rp {trans.totalAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {!loading && currentRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-secondary italic">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalPages > 1 && (
          <div className="no-print">
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReportsPage;
