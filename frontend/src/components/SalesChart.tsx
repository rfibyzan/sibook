import React from 'react';

interface SalesChartProps {
  data: { day: string; val: number; height: string; highlight?: boolean }[];
}

const SalesChart: React.FC<SalesChartProps> = ({ data }) => {
  return (
    <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-title-sm text-title-sm text-on-surface">Sales Trend (Last 7 Days)</h3>
        <button className="font-body-sm text-body-sm text-secondary border border-outline-variant px-3 py-1 rounded-lg hover:bg-surface-container transition-colors">Export</button>
      </div>
      <div className="flex-1 relative min-h-[240px] flex items-end justify-between gap-2 pt-8 pb-6 border-b border-outline-variant px-2">
        <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-on-surface-variant font-label-uppercase text-label-uppercase text-right pr-2">
          <span>150</span>
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div className="w-full flex justify-around items-end h-full pl-8">
          {data.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 w-full">
              <div
                className={`w-full max-w-[40px] rounded-t-lg transition-colors cursor-pointer relative group ${
                  item.highlight ? 'bg-primary-container shadow-sm hover:bg-primary' : 'bg-primary-container/20 hover:bg-primary-container'
                }`}
                style={{ height: item.height }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded-lg font-body-sm text-body-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.val}
                </div>
              </div>
              <span className="font-label-uppercase text-label-uppercase text-on-surface-variant">{item.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SalesChart;
