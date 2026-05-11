import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendIcon?: string;
  variant?: 'default' | 'error' | 'warning';
}

const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  icon, 
  trend, 
  trendIcon = 'trending_up', 
  variant = 'default' 
}) => {
  const getColors = () => {
    switch (variant) {
      case 'error':
        return { text: 'text-error', bg: 'bg-error/10', icon: 'text-error', border: 'border-error/30' };
      case 'warning':
        return { text: 'text-amber-600', bg: 'bg-amber-100', icon: 'text-amber-600', border: 'border-amber-200' };
      default:
        return { text: 'text-on-surface-variant', bg: 'bg-surface-container', icon: 'text-primary', border: 'border-outline-variant' };
    }
  };

  const colors = getColors();

  return (
    <div className={`bg-surface-container-lowest border rounded-xl p-6 flex flex-col justify-between relative overflow-hidden ${colors.border}`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className={`font-label-uppercase text-label-uppercase uppercase tracking-wider mb-1 ${colors.text}`}>
            {label}
          </p>
          <h3 className="font-headline-md text-headline-md text-on-surface">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <span className={`material-symbols-outlined text-[24px] ${colors.icon}`}>
            {icon}
          </span>
        </div>
      </div>

      {trend && (
        <div className={`flex items-center gap-1 relative z-10 ${
          variant === 'error' ? 'text-error' : variant === 'warning' ? 'text-amber-600' : 'text-secondary'
        }`}>
          <span className="material-symbols-outlined text-[16px]">{trendIcon}</span>
          <span className="font-body-sm text-body-sm">{trend}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
