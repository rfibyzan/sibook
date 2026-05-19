import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import SalesChart from '../components/SalesChart';
import LowStockPanel from '../components/LowStockPanel';
import { supabase } from '../lib/supabase';

const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState({
    totalBooks: 0,
    lowStock: 0,
    outOfStock: 0,
    totalTransactions: 0
  });
  const [loading, setLoading] = useState(true);

  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      // Jalankan semua fetch secara paralel untuk performa maksimal
      await Promise.all([fetchDashboardData(), fetchSalesChartData()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const fetchDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Jalankan 4 query secara PARALEL, bukan sequential
    // Menggunakan tabel baru: buku, transaksi_keluar
    const [booksRes, lowRes, outRes, transRes] = await Promise.all([
      supabase.from('buku').select('*', { count: 'exact', head: true }),
      supabase.from('buku').select('*', { count: 'exact', head: true }).lte('stok_saat_ini', 5).gt('stok_saat_ini', 0),
      supabase.from('buku').select('*', { count: 'exact', head: true }).eq('stok_saat_ini', 0),
      supabase.from('transaksi_keluar').select('*', { count: 'exact', head: true }).gte('dibuat_pada', today),
    ]);

    setMetrics({
      totalBooks: booksRes.count || 0,
      lowStock: lowRes.count || 0,
      outOfStock: outRes.count || 0,
      totalTransactions: transRes.count || 0,
    });
  };

  const fetchSalesChartData = async () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Hitung tanggal 7 hari lalu
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    const startStr = startDate.toISOString().split('T')[0] + 'T00:00:00';

    // SATU query untuk semua 7 hari, ambil dibuat_pada saja
    const { data } = await supabase
      .from('transaksi_keluar')
      .select('dibuat_pada')
      .gte('dibuat_pada', startStr);

    // Kelompokkan transaksi berdasarkan tanggal di client-side
    const countsByDate: Record<string, number> = {};
    (data || []).forEach((row: { dibuat_pada: string }) => {
      const dateKey = row.dibuat_pada.split('T')[0];
      countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
    });

    // Bangun array 7 hari terakhir
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      const count = countsByDate[dateStr] || 0;

      last7Days.push({
        day: dayName,
        val: count,
        height: `${Math.min(count * 10, 100)}%`,
        highlight: i === 0,
      });
    }
    setSalesData(last7Days);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
            <p className="mt-4 font-body-md text-secondary">Mempersiapkan data cerdas Anda...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-stack-loose">
        <h2 className="font-display-lg text-display-lg text-primary">Dashboard</h2>
        <p className="font-body-sm text-body-sm text-secondary mt-1">
          Selamat datang kembali! Berikut ringkasan inventaris Anda hari ini.
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-loose">
        <StatCard 
          label="Total Koleksi Buku" 
          value={metrics.totalBooks.toString()} 
          icon="menu_book" 
          trend="Real-time dari database"
        />
        <StatCard 
          label="Stok Kritis" 
          value={metrics.lowStock.toString()} 
          icon="warning" 
          variant="warning"
          trend="Perlu restock segera"
        />
        <StatCard 
          label="Kehabisan Stok" 
          value={metrics.outOfStock.toString()} 
          icon="error" 
          variant="error"
          trend="Aksi segera diperlukan"
        />
        <StatCard 
          label="Transaksi Hari Ini" 
          value={metrics.totalTransactions.toString()} 
          icon="receipt_long" 
          trend="Stok Masuk & Keluar"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        {/* Main Chart Section */}
        <div className="lg:col-span-2">
          <SalesChart data={salesData} />
        </div>

        {/* Side Panel: Notifications/Low Stock Alerts */}
        <div className="lg:col-span-1">
          <LowStockPanel />
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
