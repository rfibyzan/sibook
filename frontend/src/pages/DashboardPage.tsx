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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // 1. Hitung Total Buku
    const { count: booksCount } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });

    // 2. Hitung Low Stock (< 5 tapi > 0)
    const { count: lowCount } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .lt('stock', 5)
      .gt('stock', 0);

    // 3. Hitung Out of Stock (0)
    const { count: outCount } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true })
      .eq('stock', 0);

    // 4. Hitung Transaksi Hari Ini
    const today = new Date().toISOString().split('T')[0];
    const { count: transCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    setMetrics({
      totalBooks: booksCount || 0,
      lowStock: lowCount || 0,
      outOfStock: outCount || 0,
      totalTransactions: transCount || 0
    });
    
    setLoading(false);
  };

  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    fetchSalesChartData();
  }, []);

  const fetchSalesChartData = async () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[d.getDay()];
      
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'out')
        .gte('created_at', dateStr + 'T00:00:00')
        .lte('created_at', dateStr + 'T23:59:59');
        
      last7Days.push({
        day: dayName,
        val: count || 0,
        height: `${Math.min((count || 0) * 10, 100)}%`, // Simulasi tinggi bar
        highlight: i === 0 // Highlight hari ini
      });
    }
    setSalesData(last7Days);
  };

  if (loading || salesData.length === 0) {
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
