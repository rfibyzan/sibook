import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  detail_masuk: { jumlah_masuk: number; harga_beli: number; id_buku: string }[];
}

interface TransaksiKeluarRecord {
  id: string;
  id_user: string | null;
  total_item: number;
  total_harga: number;
  catatan: string | null;
  dibuat_pada: string;
  tanggal_keluar: string;
  detail_keluar: { jumlah_keluar: number; harga_jual: number; id_buku: string }[];
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
  catatan: string | null;
};

interface BestSellerRecord {
  id_buku: string;
  judul: string;
  pengarang: string;
  jumlah_terjual: number;
  total_nominal: number;
}

interface InventoryRecord {
  id: string;
  isbn: string;
  judul: string;
  pengarang: string;
  stok_saat_ini: number;
  stok_minimum: number;
  harga_jual: number;
  id_kategori: string | null;
}

interface CategoryRecord {
  id: string;
  nama_kategori: string;
}

const ReportsPage: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'stats' | 'transactions' | 'inventory'>('stats');
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [rawCombinedRecords, setRawCombinedRecords] = useState<CombinedRecord[]>([]);
  const [rawBooks, setRawBooks] = useState<InventoryRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBooksSold: 0,
    totalBooksRestocked: 0,
    outCount: 0,
    inCount: 0
  });

  // Raw transactions for date-specific aggregations
  const [rawKeluarRecords, setRawKeluarRecords] = useState<TransaksiKeluarRecord[]>([]);
  
  // Tab 2 (Transactions) Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionType, setTransactionType] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Tab 3 (Inventory) Filter States
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatus, setStockStatus] = useState<'all' | 'aman' | 'kritis' | 'habis'>('all');

  // Chart & Display Metric States
  const [chartMetric, setChartMetric] = useState<'revenue' | 'volume'>('revenue');
  const [showAllBestSellers, setShowAllBestSellers] = useState(false);

  // Map for rapid lookup
  const [bookMap, setBookMap] = useState<Record<string, { judul: string; pengarang: string; harga_jual: number }>>({});
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);

    try {
      // Fetch all needed resources in parallel for extreme speed
      const [profilesRes, categoriesRes, booksRes, masukRes, keluarRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name'),
        supabase.from('kategori').select('id, nama_kategori'),
        supabase.from('buku').select('id, isbn, judul, pengarang, stok_saat_ini, stok_minimum, harga_jual, id_kategori'),
        supabase.from('transaksi_masuk').select('*, supplier (nama), detail_masuk (jumlah_masuk, harga_beli, id_buku)').order('dibuat_pada', { ascending: false }),
        supabase.from('transaksi_keluar').select('*, detail_keluar (jumlah_keluar, harga_jual, id_buku)').order('dibuat_pada', { ascending: false })
      ]);

      const profileMap: Record<string, string> = {};
      (profilesRes.data || []).forEach((p: any) => {
        if (p.id && p.full_name) profileMap[p.id] = p.full_name;
      });

      const catMap: Record<string, string> = {};
      (categoriesRes.data || []).forEach((c: any) => {
        if (c.id && c.nama_kategori) catMap[c.id] = c.nama_kategori;
      });
      setCategoryMap(catMap);
      setCategories((categoriesRes.data || []) as CategoryRecord[]);

      const bMap: Record<string, { judul: string; pengarang: string; harga_jual: number }> = {};
      (booksRes.data || []).forEach((b: any) => {
        bMap[b.id] = {
          judul: b.judul,
          pengarang: b.pengarang,
          harga_jual: b.harga_jual
        };
      });
      setBookMap(bMap);
      setRawBooks((booksRes.data || []) as InventoryRecord[]);

      const masukRecords = (masukRes.data || []) as unknown as TransaksiMasukRecord[];
      const keluarRecords = (keluarRes.data || []) as unknown as TransaksiKeluarRecord[];
      setRawKeluarRecords(keluarRecords);

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
          totalAmount: amount,
          catatan: t.catatan
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
          totalAmount: amount,
          catatan: t.catatan
        };
      });

      // Combine and sort by date descending
      const all = [...masukCombined, ...keluarCombined].sort(
        (a, b) => new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime()
      );

      setRawCombinedRecords(all);
      setStats({
        totalRevenue: revenue,
        totalBooksSold: soldQty,
        totalBooksRestocked: restockQty,
        outCount: keluarRecords.length,
        inCount: masukRecords.length
      });

    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Dynamic Filtering & Calculations (React side for instant responsive changes) ---

  // 1. Filtered Transaction Records for Tab 2
  const filteredCombinedRecords = useMemo(() => {
    return rawCombinedRecords.filter(record => {
      // Text Search
      if (searchTerm.trim() !== '') {
        const search = searchTerm.toLowerCase();
        const matchesLabel = record.label.toLowerCase().includes(search);
        const matchesUser = record.user.toLowerCase().includes(search);
        const matchesCatatan = record.catatan?.toLowerCase().includes(search) || false;
        
        if (!matchesLabel && !matchesUser && !matchesCatatan) {
          return false;
        }
      }

      // Transaction Type
      if (transactionType !== 'all' && record.type !== transactionType) {
        return false;
      }

      // Date Filters (based on actual business date: 'date')
      const recDate = new Date(record.date.split('T')[0]);
      
      if (startDate) {
        const start = new Date(startDate);
        if (recDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        if (recDate > end) return false;
      }

      return true;
    });
  }, [rawCombinedRecords, searchTerm, transactionType, startDate, endDate]);

  // Pagination derived from filtered results so paging respects filters
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredCombinedRecords.length / itemsPerPage)), [filteredCombinedRecords.length, itemsPerPage]);
  const currentRecords = useMemo(() => filteredCombinedRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredCombinedRecords, currentPage, itemsPerPage]);

  // 2. Filtered Inventory Records for Tab 3
  const filteredBooks = useMemo(() => {
    return rawBooks.filter(book => {
      // Text Search
      if (inventorySearch.trim() !== '') {
        const search = inventorySearch.toLowerCase();
        const matchesTitle = book.judul.toLowerCase().includes(search);
        const matchesIsbn = book.isbn.toLowerCase().includes(search);
        const matchesAuthor = book.pengarang.toLowerCase().includes(search);
        
        if (!matchesTitle && !matchesIsbn && !matchesAuthor) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && book.id_kategori !== selectedCategory) {
        return false;
      }

      // Stock status filter
      if (stockStatus !== 'all') {
        const isOutOfStock = book.stok_saat_ini === 0;
        const isLowStock = book.stok_saat_ini <= book.stok_minimum && book.stok_saat_ini > 0;
        
        if (stockStatus === 'habis' && !isOutOfStock) return false;
        if (stockStatus === 'kritis' && !isLowStock) return false;
        if (stockStatus === 'aman' && (isLowStock || isOutOfStock)) return false;
      }

      return true;
    });
  }, [rawBooks, inventorySearch, selectedCategory, stockStatus]);

  // 3. Best-Selling Books calculated based on the active date range!
  const filteredBestSellers = useMemo(() => {
    const salesByBook: Record<string, { judul: string; pengarang: string; qty: number; amount: number }> = {};
    
    rawKeluarRecords.forEach(t => {
      // Filter out of date range if filters are active
      const txDate = new Date(t.tanggal_keluar.split('T')[0]);
      if (startDate) {
        const start = new Date(startDate);
        if (txDate < start) return;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (txDate > end) return;
      }

      t.detail_keluar?.forEach(d => {
        const bookInfo = bookMap[d.id_buku] || { judul: 'Buku Tidak Dikenal', pengarang: 'Tidak Diketahui', harga_jual: 0 };
        const qty = d.jumlah_keluar || 0;
        const price = d.harga_jual || bookInfo.harga_jual || 0;
        const amount = qty * price;
        
        if (!salesByBook[d.id_buku]) {
          salesByBook[d.id_buku] = {
            judul: bookInfo.judul,
            pengarang: bookInfo.pengarang,
            qty: 0,
            amount: 0
          };
        }
        salesByBook[d.id_buku].qty += qty;
        salesByBook[d.id_buku].amount += amount;
      });
    });

    return Object.entries(salesByBook).map(([id_buku, s]) => ({
      id_buku,
      judul: s.judul,
      pengarang: s.pengarang,
      jumlah_terjual: s.qty,
      total_nominal: s.amount
    })).sort((a, b) => b.jumlah_terjual - a.jumlah_terjual);
  }, [rawKeluarRecords, bookMap, startDate, endDate]);

  const bestSellersToShow = useMemo(() => {
    return showAllBestSellers ? filteredBestSellers.slice(0, 10) : filteredBestSellers.slice(0, 5);
  }, [filteredBestSellers, showAllBestSellers]);

  // 4. Sales Trend Chart Data (grouped daily, based on date range)
  const chartData = useMemo(() => {
    // Collect all sales (transactions keluar) within the date range
    const dailyData: Record<string, { dateStr: string; revenue: number; volume: number }> = {};
    
    rawKeluarRecords.forEach(t => {
      // Apply date range filters
      const txDateStr = t.tanggal_keluar.split('T')[0];
      const txDate = new Date(txDateStr);
      if (startDate) {
        const start = new Date(startDate);
        if (txDate < start) return;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (txDate > end) return;
      }

      if (!dailyData[txDateStr]) {
        dailyData[txDateStr] = {
          dateStr: txDateStr,
          revenue: 0,
          volume: 0
        };
      }
      
      const qty = t.detail_keluar?.reduce((sum, d) => sum + (d.jumlah_keluar || 0), 0) || 0;
      const amount = t.total_harga || t.detail_keluar?.reduce((sum, d) => sum + (d.jumlah_keluar * d.harga_jual || 0), 0) || 0;

      dailyData[txDateStr].revenue += amount;
      dailyData[txDateStr].volume += qty;
    });

    const sorted = Object.values(dailyData).sort(
      (a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()
    );

    // If empty and date range is selected, add endpoints for visual neatness
    if (sorted.length === 0) {
      return [];
    }

    return sorted.map(d => {
      const dateObj = new Date(d.dateStr);
      const label = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      return {
        ...d,
        label
      };
    });
  }, [rawKeluarRecords, startDate, endDate]);

  // --- Filter Helpers ---

  const setTodayRange = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const setLast7DaysRange = () => {
    const today = new Date();
    const last7 = new Date();
    last7.setDate(today.getDate() - 6);
    setStartDate(last7.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const setThisMonthRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTransactionType('all');
    setStartDate('');
    setEndDate('');
  };

  // --- CSV Export Helper ---
  const exportToCSV = () => {
    const headers = ['Nomor Referensi', 'Tanggal Transaksi', 'Tipe', 'Dikerjakan Oleh', 'Total Item (Qty)', 'Total Nominal (Rp)', 'Catatan'];
    
    const rows = filteredCombinedRecords.map(trans => [
      trans.label,
      new Date(trans.dibuat_pada).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
      trans.type === 'keluar' ? 'Penjualan' : 'Restock',
      trans.user,
      trans.totalQty,
      trans.totalAmount,
      trans.catatan || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const strVal = String(val === null || val === undefined ? '' : val);
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Transaksi_SIBOOK_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Tab Renders ---

  const renderStatsTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        {/* Sales Chart Section */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-[32px] p-8 shadow-sm flex flex-col min-h-[420px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="font-title-lg text-on-surface">Tren Performa Penjualan</h3>
              <p className="text-body-sm text-secondary">Visualisasi tren transaksi keluar</p>
            </div>
            
            {/* Metric Switcher */}
            <div className="flex bg-surface-container rounded-full p-1 border border-outline-variant/30">
              <button
                onClick={() => setChartMetric('revenue')}
                className={`px-4 py-1.5 rounded-full text-body-sm font-bold transition-all ${
                  chartMetric === 'revenue' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Pendapatan
              </button>
              <button
                onClick={() => setChartMetric('volume')}
                className={`px-4 py-1.5 rounded-full text-body-sm font-bold transition-all ${
                  chartMetric === 'volume' 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                Buku Terjual
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[280px]">
            {chartData.length === 0 ? (
              <div className="text-center text-secondary italic">
                <span className="material-symbols-outlined text-4xl mb-2 text-outline-variant">analytics</span>
                <p>Tidak ada transaksi penjualan dalam rentang waktu ini untuk grafik.</p>
              </div>
            ) : (
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00236f" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#00236f" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#c5c5d3" opacity={0.3} />
                    <XAxis 
                      dataKey="label" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#5c5f60', fontSize: 11, fontFamily: 'Inter' }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#5c5f60', fontSize: 11, fontFamily: 'Inter' }}
                      tickFormatter={(val) => 
                        chartMetric === 'revenue' 
                          ? `Rp ${val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val}`
                          : `${val} pcs`
                      }
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: '#c5c5d3', 
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        fontFamily: 'Inter',
                        fontSize: '12px'
                      }}
                      formatter={(value: any) => [
                        chartMetric === 'revenue' 
                          ? `Rp ${Number(value).toLocaleString('id-ID')}` 
                          : `${value} pcs`, 
                        chartMetric === 'revenue' ? 'Pendapatan' : 'Buku Terjual'
                      ]}
                      labelStyle={{ fontWeight: 'bold', color: '#1a1b21', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={chartMetric === 'revenue' ? 'revenue' : 'volume'} 
                      stroke={chartMetric === 'revenue' ? '#00236f' : '#f59e0b'} 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill={`url(#${chartMetric === 'revenue' ? 'colorRevenue' : 'colorVolume'})`} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Best Sellers Card */}
        <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-[32px] p-8 shadow-sm flex flex-col min-h-[420px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-title-lg text-on-surface">Buku Terlaris</h3>
              <p className="text-body-sm text-secondary">Berdasarkan volume terjual</p>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-secondary px-2.5 py-1 bg-surface-container rounded-full">
              Top {showAllBestSellers ? '10' : '5'}
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-3">
            {bestSellersToShow.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-secondary italic text-center">
                <span className="material-symbols-outlined text-4xl mb-2 text-outline-variant">shopping_cart_off</span>
                <p>Belum ada penjualan untuk periode ini.</p>
              </div>
            ) : (
              bestSellersToShow.map((book, idx) => (
                <div key={book.id_buku} className="flex items-center gap-3 p-3 hover:bg-primary/[0.02] rounded-2xl transition-all border border-transparent hover:border-outline-variant/30">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    idx === 0 
                      ? 'bg-amber-100 text-amber-800' 
                      : idx === 1 
                      ? 'bg-slate-100 text-slate-700' 
                      : idx === 2 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-surface-container text-secondary'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-on-surface text-[13px] truncate" title={book.judul}>
                      {book.judul}
                    </h4>
                    <p className="text-secondary text-[11px] truncate">{book.pengarang}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="bg-primary-fixed text-primary px-2 py-0.5 rounded text-[10px] font-bold block mb-0.5 w-fit ml-auto">
                      {book.jumlah_terjual} pcs
                    </span>
                    <span className="text-body-sm font-semibold text-on-surface text-[12px]">
                      Rp {book.total_nominal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {filteredBestSellers.length > 5 && (
            <button
              onClick={() => setShowAllBestSellers(!showAllBestSellers)}
              className="mt-4 border-t border-outline-variant pt-4 w-full text-center text-primary font-bold text-body-sm hover:text-primary-fixed-dim transition-colors flex items-center justify-center gap-1"
            >
              {showAllBestSellers ? (
                <>
                  Tampilkan Sedikit
                  <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
                </>
              ) : (
                <>
                  Tampilkan Semua (Top 10)
                  <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTransactionsTab = () => {
    return (
      <>
        {/* Filter Panel */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 mb-6 flex flex-col gap-4 no-print shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-secondary">Pencarian</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-lg">search</span>
                <input
                  type="text"
                  placeholder="Cari Ref / User / Catatan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-secondary">Tipe Transaksi</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-all appearance-none"
              >
                <option value="all">Semua Tipe</option>
                <option value="masuk">Restock (Stok Masuk)</option>
                <option value="keluar">Penjualan (Stok Keluar)</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-secondary">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-secondary">Tanggal Selesai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Quick Date Filters and Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-body-sm text-secondary font-medium mr-1">Pintasan:</span>
              <button
                onClick={setTodayRange}
                className="bg-surface-container text-secondary hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg text-body-sm transition-all font-medium"
              >
                Hari Ini
              </button>
              <button
                onClick={setLast7DaysRange}
                className="bg-surface-container text-secondary hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg text-body-sm transition-all font-medium"
              >
                7 Hari
              </button>
              <button
                onClick={setThisMonthRange}
                className="bg-surface-container text-secondary hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg text-body-sm transition-all font-medium"
              >
                Bulan Ini
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={exportToCSV}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-xl text-body-md font-bold transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                Ekspor CSV
              </button>
              <button
                onClick={handleResetFilters}
                className="bg-surface-container-high text-on-surface hover:bg-surface-container px-4 py-2 rounded-xl text-body-md font-bold transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">restart_alt</span>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div id="print-area" className="bg-surface-container-lowest border border-outline-variant rounded-[32px] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-outline-variant flex justify-between items-center">
            <div>
              <h3 className="font-title-lg text-on-surface">Riwayat Transaksi</h3>
              <p className="text-body-sm text-secondary mt-1">Gabungan data stok masuk dan keluar</p>
            </div>
            <span className="text-body-sm text-secondary">{filteredCombinedRecords.length} Transaksi terfilter</span>
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
                {filteredCombinedRecords.map((trans) => (
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
                {filteredCombinedRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-secondary italic">
                      Tidak ada data riwayat transaksi yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderInventoryTab = () => {
    return (
      <>
        {/* Inventory Filters */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 mb-6 flex flex-col gap-4 no-print shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-secondary">Pencarian Buku</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-secondary text-lg">search</span>
                <input
                  type="text"
                  placeholder="Cari Judul / ISBN / Pengarang..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-secondary">Kategori</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-all appearance-none"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nama_kategori}</option>
                ))}
              </select>
            </div>

            {/* Stock Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-widest text-secondary">Status Stok</label>
              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as any)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-all appearance-none"
              >
                <option value="all">Semua Status</option>
                <option value="aman">Stok Aman (Di atas minimum)</option>
                <option value="kritis">Stok Kritis (Di bawah/Sama dengan Minimum)</option>
                <option value="habis">Habis (Stok 0)</option>
              </select>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end pt-2 border-t border-outline-variant">
            <button
              onClick={() => {
                setInventorySearch('');
                setSelectedCategory('all');
                setStockStatus('all');
              }}
              className="bg-surface-container-high text-on-surface hover:bg-surface-container px-4 py-2 rounded-xl text-body-md font-bold transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">restart_alt</span>
              Reset Filter
            </button>
          </div>
        </div>

        {/* Inventory Status Table */}
        <div id="print-area" className="bg-surface-container-lowest border border-outline-variant rounded-[32px] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-outline-variant flex justify-between items-center">
            <div>
              <h3 className="font-title-lg text-on-surface">Kondisi Stok Buku Aktual</h3>
              <p className="text-body-sm text-secondary mt-1">Laporan stok real-time seluruh inventori</p>
            </div>
            <span className="text-body-sm text-secondary">{filteredBooks.length} Judul Buku</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">ISBN</th>
                  <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">JUDUL BUKU</th>
                  <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest">KATEGORI</th>
                  <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-right">HARGA JUAL</th>
                  <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-center">STOK</th>
                  <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-center">STOK MIN.</th>
                  <th className="px-8 py-4 font-label-uppercase text-secondary text-[11px] tracking-widest text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredBooks.map((book) => {
                  const isOutOfStock = book.stok_saat_ini === 0;
                  const isLowStock = book.stok_saat_ini <= book.stok_minimum && book.stok_saat_ini > 0;
                  
                  return (
                    <tr key={book.id} className="hover:bg-primary/[0.02] transition-colors">
                      <td className="px-8 py-5 font-mono text-[13px] text-secondary">
                        {book.isbn}
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-bold text-on-surface text-[14px]">
                          {book.judul}
                        </div>
                        <div className="text-secondary text-[12px]">
                          {book.pengarang}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-body-sm text-on-surface-variant">
                        {book.id_kategori ? (categoryMap[book.id_kategori] || 'Lainnya') : 'Lainnya'}
                      </td>
                      <td className="px-8 py-5 text-right font-data-tabular text-on-surface">
                        Rp {book.harga_jual.toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-center font-data-tabular font-bold text-on-surface">
                        {book.stok_saat_ini} pcs
                      </td>
                      <td className="px-8 py-5 text-center font-data-tabular text-secondary">
                        {book.stok_minimum} pcs
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-block text-center min-w-[75px] ${
                          isOutOfStock 
                            ? 'bg-rose-100 text-rose-700' 
                            : isLowStock 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isOutOfStock ? 'Habis' : isLowStock ? 'Kritis' : 'Aman'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredBooks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center text-secondary italic">
                      Tidak ada data inventori buku yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  return (
    <Layout>
      {/* Printable Title Block */}
      <div className="hidden print:block mb-8">
        <h1 className="text-[28px] font-bold text-primary font-headline-md leading-tight">SIBOOK - Laporan Analitis & Inventaris</h1>
        <p className="text-body-sm text-secondary mt-1">
          Dicetak pada: {new Date().toLocaleString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </p>
        <div className="border-b-2 border-primary mt-4"></div>
      </div>

      {/* Screen Title Block */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 no-print">
        <div>
          <h2 className="font-display-lg text-display-lg text-primary">Laporan Terpadu</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Analisis performa, riwayat transaksi stok, dan pemantauan inventori buku.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-surface-container-high text-on-surface px-6 py-3 rounded-full font-bold shadow-sm hover:bg-surface-container transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">print</span>
          Cetak Halaman Ini
        </button>
      </div>

      {/* Quick Summary Cards (Visible across all tabs on screen, hides during print if needed) */}
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

      {/* Tab Navigation */}
      <div className="flex border-b border-outline-variant mb-6 no-print">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-6 py-3 font-title-sm text-body-md border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'stats'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">trending_up</span>
          Tren & Statistik
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-3 font-title-sm text-body-md border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          Riwayat Transaksi
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 font-title-sm text-body-md border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">inventory_2</span>
          Inventori Buku
        </button>
      </div>

      {/* Main Tab Canvas */}
      {loading ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] p-24 flex items-center justify-center shadow-sm">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
            <p className="mt-4 font-body-md text-secondary font-medium">Memproses data laporan premium...</p>
          </div>
        </div>
      ) : (
        <div className="mb-10">
          {/* Print Title helper that labels what we're printing */}
          <div className="hidden print:block mb-4">
            <h2 className="text-xl font-bold text-on-surface">
              {activeTab === 'stats' && 'Laporan Tren & Statistik Penjualan'}
              {activeTab === 'transactions' && 'Laporan Riwayat Transaksi Stok'}
              {activeTab === 'inventory' && 'Laporan Kondisi Stok Inventori'}
            </h2>
          </div>
          
          {activeTab === 'stats' && renderStatsTab()}
          {activeTab === 'transactions' && renderTransactionsTab()}
          {activeTab === 'inventory' && renderInventoryTab()}
        </div>
      )}
    </Layout>
  );
};

export default ReportsPage;
