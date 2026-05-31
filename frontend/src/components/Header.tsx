import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import TransactionDetailModal from './TransactionDetailModal';

const pageInfo = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
    color: 'bg-primary/10 text-primary',
    description: 'Halaman utama yang menampilkan ringkasan inventaris, statistik real-time, grafik tren transaksi/pendapatan, dan peringatan stok rendah.',
    features: ['Statistik total buku, stok kritis & habis', 'Grafik tren transaksi & pendapatan', 'Panel peringatan stok rendah']
  },
  {
    name: 'Manajemen Buku',
    path: '/books',
    icon: 'menu_book',
    color: 'bg-tertiary/10 text-tertiary',
    description: 'Kelola seluruh katalog buku di inventaris. Tambah, edit, dan hapus data buku beserta detail lengkapnya.',
    features: ['CRUD data buku lengkap', 'Filter & pencarian buku', 'Relasi kategori, rak, & supplier']
  },
  {
    name: 'Stok Masuk',
    path: '/stock-in',
    icon: 'login',
    color: 'bg-success/10 text-success',
    description: 'Catat penerimaan buku baru dari supplier. Setiap transaksi masuk akan otomatis menambah stok buku.',
    features: ['Input transaksi penerimaan', 'Multi-item per transaksi', 'Otomatis update stok buku']
  },
  {
    name: 'Stok Keluar',
    path: '/stock-out',
    icon: 'logout',
    color: 'bg-error/10 text-error',
    description: 'Catat penjualan atau pengeluaran buku. Setiap transaksi keluar akan otomatis mengurangi stok buku.',
    features: ['Input transaksi penjualan', 'Kalkulasi harga otomatis', 'Otomatis update stok buku']
  },
  {
    name: 'Kategori Buku',
    path: '/categories',
    icon: 'category',
    color: 'bg-secondary/10 text-secondary',
    description: 'Kelola kategori untuk mengorganisir buku berdasarkan genre, jenis, atau klasifikasi tertentu.',
    features: ['Tambah & edit kategori', 'Deskripsi kategori', 'Digunakan di manajemen buku']
  },
  {
    name: 'Supplier',
    path: '/suppliers',
    icon: 'local_shipping',
    color: 'bg-warning/10 text-warning',
    description: 'Kelola data supplier atau penerbit yang menyuplai buku ke inventaris Anda.',
    features: ['Data kontak supplier', 'Alamat & email supplier', 'Relasi dengan stok masuk']
  },
  {
    name: 'Lokasi Rak',
    path: '/locations',
    icon: 'grid_view',
    color: 'bg-info/10 text-info',
    description: 'Kelola lokasi penyimpanan buku berdasarkan kode rak, seksi, dan kapasitas.',
    features: ['Kode rak & seksi', 'Kapasitas per rak', 'Relasi dengan data buku']
  },
  {
    name: 'Laporan',
    path: '/reports',
    icon: 'assessment',
    color: 'bg-primary/10 text-primary',
    description: 'Lihat laporan lengkap transaksi masuk & keluar, analisis stok, dan ringkasan performa inventaris.',
    features: ['Laporan transaksi masuk & keluar', 'Filter berdasarkan tanggal', 'Detail per transaksi']
  },
  {
    name: 'Manajemen Staf',
    path: '/users',
    icon: 'group',
    color: 'bg-error/10 text-error',
    description: 'Kelola akun staf SIBOOK. Tambah user baru, ubah jabatan, atau hapus akun staf.',
    features: ['Tambah & hapus staf', 'Pengaturan role/jabatan', 'Hanya Owner & Manager']
  },
  {
    name: 'Pengaturan',
    path: '/settings',
    icon: 'settings',
    color: 'bg-secondary/10 text-secondary',
    description: 'Atur profil akun Anda seperti nama, foto profil, dan preferensi sistem.',
    features: ['Edit profil & nama', 'Ubah foto profil', 'Pengaturan akun']
  },
];

const Header: React.FC = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const { signOut, user, profile } = useAuth();
  const { showConfirm, notifications, unreadCount, markAllAsRead, markAsRead } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedTxType, setSelectedTxType] = useState<'masuk' | 'keluar'>('masuk');

  // Normalize user's roles (supports combined roles like "Staff Gudang / Kasir")
  const userRoles = (profile?.role || 'Staff Gudang').split('/').map(r => r.trim());

  // Role map should match Sidebar menu roles so About shows only accessible pages
  const rolesMap: Record<string, string[]> = {
    Dashboard: ['Owner', 'Manager', 'Staff Gudang', 'Kasir'],
    'Manajemen Buku': ['Owner', 'Manager', 'Staff Gudang'],
    'Stok Masuk': ['Owner', 'Manager', 'Staff Gudang'],
    'Stok Keluar': ['Owner', 'Manager', 'Kasir'],
    'Kategori Buku': ['Owner', 'Manager', 'Staff Gudang'],
    Supplier: ['Owner', 'Manager', 'Staff Gudang'],
    'Lokasi Rak': ['Owner', 'Manager', 'Staff Gudang'],
    Laporan: ['Owner', 'Manager', 'Staff Gudang', 'Kasir'],
    'Manajemen Staf': ['Owner', 'Manager'],
    Pengaturan: ['Owner', 'Manager', 'Staff Gudang', 'Kasir'],
  };

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

  const handleNotifClick = () => {
    setIsNotifOpen(!isNotifOpen);
    if (isAboutOpen) setIsAboutOpen(false);
  };

  const handleAboutClick = () => {
    setIsAboutOpen(!isAboutOpen);
    if (isNotifOpen) setIsNotifOpen(false);
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin User';
  const avatarUrl = profile?.avatar_url || "https://ui-avatars.com/api/?name=" + (displayName) + "&background=random";

  const filteredPages = pageInfo.filter(page => {
    const allowed = rolesMap[page.name];
    if (!allowed) return true;
    return allowed.some(r => userRoles.includes(r));
  });

  return (
    <>
    <header className="h-16 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="font-title-lg text-title-lg text-on-surface m-0">Inventory Dashboard</h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell (moved) */}
        <div className="relative">
          <button 
            onClick={handleNotifClick}
            className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors relative"
            title="Notifikasi"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 flex h-3 w-3 items-center justify-center bg-error text-white text-[9px] rounded-full font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                <p className="font-title-sm text-on-surface">Notifikasi</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                  className="text-primary text-xs hover:underline"
                >
                  Tandai semua dibaca
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => {
                    const isTransaction = notif.title === 'Stok Masuk' || notif.title === 'Stok Keluar';
                    const txType = notif.title === 'Stok Keluar' ? 'keluar' : 'masuk';

                    return (
                      <div 
                        key={`${notif.type}-${notif.id}`} 
                        onClick={() => {
                          markAsRead(notif.id);
                          if (isTransaction) {
                            setSelectedTxId(notif.id);
                            setSelectedTxType(txType);
                            setIsNotifOpen(false);
                          }
                        }}
                        className={`p-4 border-b border-outline-variant last:border-0 transition-colors ${isTransaction ? 'cursor-pointer hover:bg-surface-container-low' : ''} ${!notif.isRead ? 'bg-primary/[0.08] border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                            notif.type === 'error' ? 'bg-error' : notif.type === 'warning' ? 'bg-warning' : 'bg-primary'
                          }`}></div>
                          <div className="flex-1">
                            <p className={`font-title-sm text-[13px] text-on-surface mb-0.5 ${!notif.isRead ? 'font-bold' : ''}`}>{notif.title}</p>
                            <p className="font-body-sm text-[12px] text-secondary leading-tight">{notif.message}</p>
                            <p className="text-[10px] text-outline mt-1">{notif.time}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-secondary italic text-sm">
                    Tidak ada aktivitas terbaru
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-outline-variant mx-2"></div>

        {/* About / Help Button (moved) */}
        <div className="relative">
          <button 
            onClick={handleAboutClick}
            className={`p-2 rounded-full transition-colors relative ${isAboutOpen ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface-variant'}`}
            title="Tentang SIBOOK"
          >
            <span className="material-symbols-outlined">help</span>
          </button>
        </div>

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
              {profile?.role || 'Staff Gudang / Kasir'}
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

    {/* About SIBOOK Modal */}
    {isAboutOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsAboutOpen(false)}>
        <div 
          className="bg-surface-container-lowest w-full max-w-3xl max-h-[85vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="p-8 pb-4 border-b border-outline-variant bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-on-surface">Tentang SIBOOK</h3>
                  <p className="text-body-sm text-secondary mt-0.5">System Inventory Book — Panduan Fitur</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAboutOpen(false)}
                className="p-2 hover:bg-surface-container rounded-full text-secondary transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-8 pt-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPages.map((page) => {
                const isCurrent = location.pathname === page.path;
                return (
                  <div 
                    key={page.path}
                    className={`rounded-2xl border p-5 transition-all cursor-pointer group hover:shadow-md ${
                      isCurrent 
                        ? 'border-primary bg-primary/[0.04] shadow-sm' 
                        : 'border-outline-variant hover:border-primary/30'
                    }`}
                    onClick={() => {
                      navigate(page.path);
                      setIsAboutOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-xl ${page.color} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-[20px]">{page.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-title-sm text-on-surface group-hover:text-primary transition-colors">{page.name}</h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Aktif</span>
                          )}
                        </div>
                        <p className="text-body-sm text-secondary mt-1 leading-relaxed">{page.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 ml-12">
                      {page.features.map((feat, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-surface-container text-[11px] text-secondary font-medium">
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="mt-6 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/50 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">info</span>
              <p className="text-body-sm text-secondary">
                Akses fitur tergantung pada role Anda. Hubungi Owner atau Manager untuk mengubah hak akses.
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {selectedTxId && (
      <TransactionDetailModal
        transactionId={selectedTxId}
        type={selectedTxType}
        onClose={() => setSelectedTxId(null)}
      />
    )}
    </>
  );
};

export default Header;
