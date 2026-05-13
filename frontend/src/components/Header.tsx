import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Header: React.FC = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { signOut, user, profile } = useAuth();
  const { showConfirm } = useNotification();
  const navigate = useNavigate();

  const notifications = [
    { id: 1, title: 'Stok Kritis!', message: '"The Midnight Library" sisa 2 item.', time: '5 menit lalu', type: 'error' },
    { id: 2, title: 'Stok Masuk Baru', message: '50 item "Laut Bercerita" telah diterima.', time: '1 jam lalu', type: 'success' },
    { id: 3, title: 'Batas Minimum', message: '"Atomic Habits" mendekati batas minimum.', time: '3 jam lalu', type: 'warning' },
  ];

  const handleSignOut = () => {
    showConfirm({
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari sistem SIBOOK?',
      confirmText: 'Ya, Keluar',
      type: 'danger',
      onConfirm: async () => {
        await signOut();
        navigate('/login');
      }
    });
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin User';
  const avatarUrl = profile?.avatar_url || "https://ui-avatars.com/api/?name=" + (displayName) + "&background=random";

  return (
    <header className="h-16 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="font-title-lg text-title-lg text-on-surface m-0">Inventory Dashboard</h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors relative"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border border-surface"></span>
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                <p className="font-title-sm text-on-surface">Notifikasi</p>
                <button className="text-primary text-xs hover:underline">Tandai semua dibaca</button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-4 border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors cursor-pointer">
                    <div className="flex gap-3">
                      <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                        notif.type === 'error' ? 'bg-error' : notif.type === 'warning' ? 'bg-warning' : 'bg-primary'
                      }`}></div>
                      <div className="flex-1">
                        <p className="font-title-sm text-[13px] text-on-surface mb-0.5">{notif.title}</p>
                        <p className="font-body-sm text-[12px] text-secondary leading-tight">{notif.message}</p>
                        <p className="text-[10px] text-outline mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors">
          <span className="material-symbols-outlined">help_outline</span>
        </button>

        <div className="h-8 w-px bg-outline-variant mx-2"></div>

        {/* User Profile Info - Link to Settings */}
        <Link to="/settings" className="flex items-center gap-3 cursor-pointer group px-2 py-1 rounded-lg hover:bg-surface-container transition-colors">
          <img 
            alt="User Avatar" 
            className="w-8 h-8 rounded-full border border-outline-variant group-hover:border-primary transition-colors object-cover" 
            src={avatarUrl} 
          />
          <div className="hidden lg:block text-left">
            <p className="font-title-sm text-[13px] text-on-surface group-hover:text-primary transition-colors leading-none mb-1 truncate max-w-[120px]">
              {displayName}
            </p>
            <p className="text-[11px] text-secondary leading-none uppercase tracking-tighter">
              {profile?.role || 'Staff / Kasir'}
            </p>
          </div>
        </Link>

        {/* Logout Button */}
        <button 
          onClick={handleSignOut} 
          className="ml-2 p-2 hover:bg-error/10 hover:text-error rounded-lg text-secondary transition-colors group"
          title="Logout"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

    </header>
  );
};

export default Header;
