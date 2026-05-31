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

  // Chart states
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultEndDate.getDate() - 7);

  const [salesData, setSalesData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);
  const [chartType, setChartType] = useState<'transactions' | 'revenue'>('transactions');
  const [dateError, setDateError] = useState('');

  // Initial load for metrics
  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      await fetchDashboardData();
      setLoading(false);
    };
    loadMetrics();
  }, []);

  // Effect specifically for chart data
  useEffect(() => {
    fetchSalesChartData();
  }, [startDate, endDate, chartType]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

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
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    }
  };

  const fetchSalesChartData = async () => {
    try {
      const startObj = new Date(startDate);
      const endObj = new Date(endDate);
      
      if (startObj >= endObj) {
        setDateError('Tanggal mulai harus lebih kecil dari tanggal akhir dan tidak boleh sama.');
        return;
      }
      setDateError('');

      const startStr = startDate + 'T00:00:00';
      const endStr = endDate + 'T23:59:59';

      const { data, error } = await supabase
        .from('transaksi_keluar')
        .select('dibuat_pada, total_harga, detail_keluar (jumlah_keluar, harga_jual)')
        .gte('dibuat_pada', startStr)
        .lte('dibuat_pada', endStr);

      if (error) {
        console.error('Supabase fetch error:', error);
      }

      const grouped: Record<string, number> = {};
      
      for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
        grouped[d.toISOString().split('T')[0]] = 0;
      }

      (data || []).forEach((row: any) => {
        const dateKey = row.dibuat_pada?.split('T')[0];
        if (dateKey && grouped[dateKey] !== undefined) {
          if (chartType === 'transactions') {
             grouped[dateKey] += 1;
          } else {
             let amount = row.total_harga;
             if (!amount) {
                amount = row.detail_keluar?.reduce((sum: number, item: any) => sum + ((item.jumlah_keluar || 0) * (item.harga_jual || 0)), 0) || 0;
             }
             grouped[dateKey] += amount;
          }
        }
      });

      const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const chartArray = Object.keys(grouped).sort().map(dateStr => {
         const d = new Date(dateStr);
         return {
           day: `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}`,
           val: grouped[dateStr],
         };
      });

      setSalesData(chartArray);
    } catch (error) {
      console.error('Error fetching sales chart data:', error);
    }
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-stretch min-h-0">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 h-full min-h-0">
          <SalesChart 
            data={salesData} 
            chartType={chartType}
            setChartType={setChartType}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            dateError={dateError}
          />
        </div>

        {/* Side Panel: Notifications/Low Stock Alerts */}
        <div className="lg:col-span-1 h-full min-h-0 overflow-hidden">
          <LowStockPanel />
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
