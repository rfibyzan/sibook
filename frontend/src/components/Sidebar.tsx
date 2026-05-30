import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const userRole = profile?.role || 'Staff Gudang';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard', roles: ['Owner', 'Manager', 'Staff Gudang', 'Kasir'] },
    { name: 'Manajemen Buku', path: '/books', icon: 'menu_book', roles: ['Owner', 'Manager'] },
    { name: 'Stok Masuk', path: '/stock-in', icon: 'login', roles: ['Owner', 'Manager', 'Staff Gudang'] },
    { name: 'Stok Keluar', path: '/stock-out', icon: 'logout', roles: ['Owner', 'Manager', 'Kasir'] },
    { name: 'Kategori Buku', path: '/categories', icon: 'category', roles: ['Owner', 'Manager'] },
    { name: 'Supplier', path: '/suppliers', icon: 'local_shipping', roles: ['Owner', 'Manager'] },
    { name: 'Lokasi Rak', path: '/locations', icon: 'grid_view', roles: ['Owner', 'Manager', 'Staff Gudang'] },
    { name: 'Laporan', path: '/reports', icon: 'assessment', roles: ['Owner', 'Manager'] },
    { name: 'Manajemen Staf', path: '/users', icon: 'group', roles: ['Owner', 'Manager'] },
    { name: 'Pengaturan', path: '/settings', icon: 'settings', roles: ['Owner', 'Manager', 'Staff Gudang', 'Kasir'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-surface dark:bg-inverse-surface text-primary dark:text-inverse-primary font-body-md text-body-md h-screen w-64 fixed left-0 top-0 border-r border-outline-variant dark:border-outline flex flex-col py-6 z-20">
      <div className="px-6 mb-8 flex items-center gap-3">
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed">SIBOOK</h1>
          <p className="font-body-sm text-body-sm text-secondary">System Inventory Book</p>
        </div>
      </div>
      <ul className="flex-1 px-4 space-y-1">
        {filteredMenu.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer active:opacity-80 ${
                isActive(item.path)
                  ? 'text-primary dark:text-primary-fixed font-bold border-r-4 border-primary dark:border-primary-fixed bg-primary-container/10'
                  : 'text-secondary dark:text-secondary-fixed-dim hover:text-primary dark:hover:text-primary-fixed hover:bg-surface-container-high dark:hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined" style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;
