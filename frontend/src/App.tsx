import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BookManagementPage from './pages/BookManagementPage';
import StockInPage from './pages/StockInPage';
import StockOutPage from './pages/StockOutPage';
import CategoriesPage from './pages/CategoriesPage';
import LocationsPage from './pages/LocationsPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import SuppliersPage from './pages/SuppliersPage';

// Protected Route: redirect to /login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
          <p className="mt-4 font-body-md text-secondary">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Role-based Protected Route: redirect to /dashboard if role not allowed
function RoleProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { session, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
          <p className="mt-4 font-body-md text-secondary">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  const userRole = profile?.role || 'Staff Gudang';
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/books" element={<RoleProtectedRoute allowedRoles={['Owner', 'Manager', 'Staff Gudang']}><BookManagementPage /></RoleProtectedRoute>} />
      <Route path="/stock-in" element={<RoleProtectedRoute allowedRoles={['Owner', 'Manager', 'Staff Gudang']}><StockInPage /></RoleProtectedRoute>} />
      <Route path="/stock-out" element={<RoleProtectedRoute allowedRoles={['Owner', 'Manager', 'Kasir']}><StockOutPage /></RoleProtectedRoute>} />
      <Route path="/categories" element={<RoleProtectedRoute allowedRoles={['Owner', 'Manager', 'Staff Gudang']}><CategoriesPage /></RoleProtectedRoute>} />
      <Route path="/locations" element={<RoleProtectedRoute allowedRoles={['Owner', 'Manager', 'Staff Gudang']}><LocationsPage /></RoleProtectedRoute>} />
      <Route path="/suppliers" element={<RoleProtectedRoute allowedRoles={['Owner', 'Manager', 'Staff Gudang']}><SuppliersPage /></RoleProtectedRoute>} />
      <Route path="/users" element={<RoleProtectedRoute allowedRoles={['Owner', 'Manager']}><UsersPage /></RoleProtectedRoute>} />
      <Route path="/reports" element={<RoleProtectedRoute allowedRoles={['Owner', 'Manager', 'Staff Gudang', 'Kasir']}><ReportsPage /></RoleProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
