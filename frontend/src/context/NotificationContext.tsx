import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  type?: 'danger' | 'primary';
}

export interface AppNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  time: string;
  rawTime: string;
  isRead: boolean;
}

interface NotificationContextType {
  showAlert: (message: string, type?: NotificationType) => void;
  showConfirm: (options: ConfirmOptions) => void;
  notifications: AppNotification[];
  unreadCount: number;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<{ message: string; type: NotificationType; id: number } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { session } = useAuth();

  const showAlert = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setAlert({ message, type, id });
    
    setTimeout(() => {
      setAlert(current => current?.id === id ? null : current);
    }, 3000);
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirm(options);
  }, []);

  const handleConfirm = async () => {
    if (confirm) {
      const result = confirm.onConfirm();
      if (result instanceof Promise) {
        await result;
      }
      setConfirm(null);
    }
  };

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    return date.toLocaleDateString('id-ID');
  };

  useEffect(() => {
    if (!session) return;

    let mounted = true;
    const fetchInitialActivities = async () => {
      try {
        const { data: masukData } = await supabase
          .from('transaksi_masuk')
          .select('id, total_item, dibuat_pada, detail_masuk(buku(judul))')
          .order('dibuat_pada', { ascending: false })
          .limit(5);

        const { data: keluarData } = await supabase
          .from('transaksi_keluar')
          .select('id, total_item, dibuat_pada, detail_keluar(buku(judul))')
          .order('dibuat_pada', { ascending: false })
          .limit(5);

        const items: AppNotification[] = [];

        (masukData || []).forEach((row: any) => {
          const judulBukuArray = row.detail_masuk?.map((d: any) => d.buku?.judul).filter(Boolean) || [];
          const judulText = judulBukuArray.length > 0 ? ` (${judulBukuArray.join(', ')})` : '';
          items.push({
            id: row.id,
            type: 'success',
            title: 'Buku Ditambahkan',
            message: `${row.total_item} item ditambahkan ke stok${judulText}`,
            time: getTimeAgo(row.dibuat_pada),
            rawTime: row.dibuat_pada,
            isRead: true, // initial load is considered read, or you could logic otherwise
          });
        });

        (keluarData || []).forEach((row: any) => {
          const judulBukuArray = row.detail_keluar?.map((d: any) => d.buku?.judul).filter(Boolean) || [];
          const judulText = judulBukuArray.length > 0 ? ` (${judulBukuArray.join(', ')})` : '';
          items.push({
            id: row.id,
            type: 'warning',
            title: 'Buku Dikeluarkan',
            message: `${row.total_item} item dikeluarkan dari stok${judulText}`,
            time: getTimeAgo(row.dibuat_pada),
            rawTime: row.dibuat_pada,
            isRead: true,
          });
        });

        items.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime());
        if (mounted) {
          setNotifications(items.slice(0, 10));
        }
      } catch (error) {
        console.error('Error fetching activities', error);
      }
    };

    fetchInitialActivities();

    const masukChannel = supabase.channel('realtime-transaksi-masuk')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transaksi_masuk' },
        (payload) => {
          const newId = payload.new.id as string;
          const totalItem = payload.new.total_item as number;
          
          setTimeout(async () => {
            const { data } = await supabase
              .from('transaksi_masuk')
              .select('detail_masuk(buku(judul))')
              .eq('id', newId)
              .single();
              
            const judulBukuArray = (data as any)?.detail_masuk?.map((d: any) => d.buku?.judul).filter(Boolean) || [];
            const judulText = judulBukuArray.length > 0 ? ` (${judulBukuArray.join(', ')})` : '';

            const newNotif: AppNotification = {
              id: newId,
              type: 'success',
              title: 'Buku Ditambahkan',
              message: `${totalItem} item ditambahkan ke stok${judulText}`,
              time: 'Baru saja',
              rawTime: payload.new.dibuat_pada,
              isRead: false,
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 10));
            setUnreadCount(prev => prev + 1);
            showAlert(`${totalItem} buku baru saja ditambahkan ke stok.${judulText}`, 'success');
          }, 1000);
        }
      )
      .subscribe();

    const keluarChannel = supabase.channel('realtime-transaksi-keluar')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transaksi_keluar' },
        (payload) => {
          const newId = payload.new.id as string;
          const totalItem = payload.new.total_item as number;
          
          setTimeout(async () => {
            const { data } = await supabase
              .from('transaksi_keluar')
              .select('detail_keluar(buku(judul))')
              .eq('id', newId)
              .single();
              
            const judulBukuArray = (data as any)?.detail_keluar?.map((d: any) => d.buku?.judul).filter(Boolean) || [];
            const judulText = judulBukuArray.length > 0 ? ` (${judulBukuArray.join(', ')})` : '';

            const newNotif: AppNotification = {
              id: newId,
              type: 'warning',
              title: 'Buku Dikeluarkan',
              message: `${totalItem} item dikeluarkan dari stok${judulText}`,
              time: 'Baru saja',
              rawTime: payload.new.dibuat_pada,
              isRead: false,
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 10));
            setUnreadCount(prev => prev + 1);
            showAlert(`${totalItem} buku baru saja dikeluarkan dari stok.${judulText}`, 'warning');
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(masukChannel);
      supabase.removeChannel(keluarChannel);
    };
  }, [showAlert, session]);

  return (
    <NotificationContext.Provider value={{ showAlert, showConfirm, notifications, unreadCount, markAllAsRead }}>
      {children}

      {alert && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border ${
            alert.type === 'success' ? 'bg-green-600 border-green-500 text-white' :
            alert.type === 'error' ? 'bg-error border-error-container text-white' :
            alert.type === 'warning' ? 'bg-amber-500 border-amber-400 text-white' :
            'bg-inverse-surface border-outline text-inverse-on-surface'
          }`}>
            <span className="material-symbols-outlined text-[20px]">
              {alert.type === 'success' ? 'check_circle' : alert.type === 'error' ? 'error' : 'info'}
            </span>
            <span className="font-title-sm">{alert.message}</span>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest w-full max-w-[360px] rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
                confirm.type === 'danger' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
              }`}>
                <span className="material-symbols-outlined text-[32px]">
                  {confirm.type === 'danger' ? 'delete_forever' : 'help'}
                </span>
              </div>
              <h3 className="font-headline-sm text-on-surface mb-2">{confirm.title}</h3>
              <p className="font-body-md text-secondary mb-8 leading-relaxed">{confirm.message}</p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setConfirm(null)}
                  className="flex-1 py-3.5 rounded-full border border-outline-variant font-title-sm text-on-surface hover:bg-surface-container transition-colors"
                >
                  {confirm.cancelText || 'Batal'}
                </button>
                <button 
                  onClick={handleConfirm}
                  className={`flex-1 py-3.5 rounded-full font-bold text-white shadow-lg transition-all active:scale-95 ${
                    confirm.type === 'danger' ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {confirm.confirmText || 'Ya, Lanjutkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
