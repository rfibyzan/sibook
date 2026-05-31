import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesChartProps {
  data: { day: string; val: number }[];
  chartType: 'transactions' | 'revenue';
  setChartType: (type: 'transactions' | 'revenue') => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  dateError: string;
}

const SalesChart: React.FC<SalesChartProps> = ({ 
  data, 
  chartType, 
  setChartType, 
  startDate, 
  setStartDate, 
  endDate, 
  setEndDate,
  dateError 
}) => {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-[32px] p-8 shadow-sm flex flex-col min-h-0 h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="font-title-lg text-on-surface">Tren Statistik</h3>
          <p className="text-body-sm text-secondary">Visualisasi Performa Anda</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Chart Type Toggle */}
          <div className="flex bg-surface-container rounded-full p-1 border border-outline-variant/30">
            <button
              onClick={() => setChartType('transactions')}
              className={`px-4 py-1.5 rounded-full text-body-sm font-bold transition-all ${
                chartType === 'transactions' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Transaksi
            </button>
            <button
              onClick={() => setChartType('revenue')}
              className={`px-4 py-1.5 rounded-full text-body-sm font-bold transition-all ${
                chartType === 'revenue' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Pendapatan
            </button>
          </div>
          
          {/* Date Range Picker */}
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded-xl px-3 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary transition-all"
            />
            <span className="text-secondary">-</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded-xl px-3 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>
      
      {dateError && (
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-body-sm font-medium">
          {dateError}
        </div>
      )}

      <div className="w-full mt-6" style={{ height: '350px' }}>
        {data.length === 0 && !dateError ? (
           <div className="h-full flex items-center justify-center text-secondary italic">
             Tidak ada data untuk rentang waktu ini.
           </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: chartType === 'revenue' ? 20 : -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartType === 'revenue' ? "#059669" : "#00236f"} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={chartType === 'revenue' ? "#059669" : "#00236f"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#c5c5d3" opacity={0.3} />
              <XAxis 
                dataKey="day" 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#5c5f60', fontSize: 11, fontFamily: 'Inter' }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: '#5c5f60', fontSize: 11, fontFamily: 'Inter' }}
                allowDecimals={false}
                tickFormatter={(val) => 
                  chartType === 'revenue' 
                    ? `Rp ${val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val}`
                    : val
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
                  chartType === 'revenue' ? `Rp ${Number(value).toLocaleString('id-ID')}` : `${value} Transaksi`, 
                  chartType === 'revenue' ? 'Pendapatan' : 'Total Transaksi'
                ]}
                labelStyle={{ fontWeight: 'bold', color: '#1a1b21', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="val" 
                stroke={chartType === 'revenue' ? "#059669" : "#00236f"} 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorSales)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SalesChart;

