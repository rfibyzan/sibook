import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
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
  markAsRead: (id: string) => void;
  broadcastNotification: (title: string, message: string, type?: NotificationType) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<{ message: string; type: NotificationType; id: number } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { session, profile } = useAuth();
  
  // Track processed IDs to prevent double notifications in React Strict Mode
  const processedIds = useRef<Set<string>>(new Set());

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

  const getReadNotifs = useCallback(() => {
    if (!session?.user?.id) return new Set<string>();
    const str = localStorage.getItem(`read_notifs_${session.user.id}`);
    return str ? new Set<string>(JSON.parse(str)) : new Set<string>();
  }, [session?.user?.id]);

  const saveReadNotifs = useCallback((set: Set<string>) => {
    if (!session?.user?.id) return;
    const arr = Array.from(set).slice(-100); // keep max 100
    localStorage.setItem(`read_notifs_${session.user.id}`, JSON.stringify(arr));
  }, [session?.user?.id]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const readSet = getReadNotifs();
      prev.forEach(n => readSet.add(n.id));
      saveReadNotifs(readSet);
      return prev.map(n => ({ ...n, isRead: true }));
    });
    setUnreadCount(0);
  }, [getReadNotifs, saveReadNotifs]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      let isUnread = false;
      const newNotifications = prev.map(n => {
        if (n.id === id) {
          if (!n.isRead) isUnread = true;
          return { ...n, isRead: true };
        }
        return n;
      });
      if (isUnread) {
        setUnreadCount(count => Math.max(0, count - 1));
        const readSet = getReadNotifs();
        readSet.add(id);
        saveReadNotifs(readSet);
      }
      return newNotifications;
    });
  }, [getReadNotifs, saveReadNotifs]);

  const broadcastNotification = useCallback(async (title: string, message: string, type: NotificationType = 'info') => {
    if (!session?.user) return;
    
    await supabase.channel('app-notifications').send({
      type: 'broadcast',
      event: 'app-change',
      payload: {
        senderId: session.user.id,
        title,
        message,
        type
      }
    });
  }, [session]);

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
          .select('id, id_user, total_item, dibuat_pada, detail_masuk(jumlah_masuk, buku(judul))')
          .order('dibuat_pada', { ascending: false })
          .limit(5);

        const { data: keluarData } = await supabase
          .from('transaksi_keluar')
          .select('id, id_user, total_item, dibuat_pada, detail_keluar(jumlah_keluar, buku(judul))')
          .order('dibuat_pada', { ascending: false })
          .limit(5);

        const items: AppNotification[] = [];
        const readNotifs = getReadNotifs();
        let unread = 0;

        (masukData || []).forEach((row: any) => {
          const judulBukuArray = row.detail_masuk?.map((d: any) => d.buku?.judul).filter(Boolean) || [];
          const judulText = judulBukuArray.length > 0 ? ` (${judulBukuArray.join(', ')})` : '';
          const calculatedTotal = row.detail_masuk?.reduce((sum: number, d: any) => sum + (d.jumlah_masuk || 0), 0) || row.total_item;
          
          const isSender = row.id_user === session.user.id;
          const isRead = isSender || readNotifs.has(row.id);
          if (!isRead) unread++;

          items.push({
            id: row.id,
            type: 'success',
            title: 'Stok Masuk',
            message: `${calculatedTotal} pcs stok ditambahkan${judulText}`,
            time: getTimeAgo(row.dibuat_pada),
            rawTime: row.dibuat_pada,
            isRead: isRead,
          });
        });

        (keluarData || []).forEach((row: any) => {
          const judulBukuArray = row.detail_keluar?.map((d: any) => d.buku?.judul).filter(Boolean) || [];
          const judulText = judulBukuArray.length > 0 ? ` (${judulBukuArray.join(', ')})` : '';
          const calculatedTotal = row.detail_keluar?.reduce((sum: number, d: any) => sum + (d.jumlah_keluar || 0), 0) || row.total_item;
          
          const isSender = row.id_user === session.user.id;
          const isRead = isSender || readNotifs.has(row.id);
          if (!isRead) unread++;

          items.push({
            id: row.id,
            type: 'warning',
            title: 'Stok Keluar',
            message: `${calculatedTotal} pcs stok dikeluarkan${judulText}`,
            time: getTimeAgo(row.dibuat_pada),
            rawTime: row.dibuat_pada,
            isRead: isRead,
          });
        });

        items.sort((a, b) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime());
        if (mounted) {
          setNotifications(items.slice(0, 10));
          setUnreadCount(unread);
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
          if (processedIds.current.has(newId)) return;
          processedIds.current.add(newId);
          
          const totalItem = payload.new.total_item as number;
          
          setTimeout(async () => {
            const { data } = await supabase
              .from('transaksi_masuk')
              .select('detail_masuk(jumlah_masuk, buku(judul))')
              .eq('id', newId)
              .single();
              
            const judulBukuArray = (data as any)?.detail_masuk?.map((d: any) => d.buku?.judul).filter(Boolean) || [];
            const judulText = judulBukuArray.length > 0 ? ` (${judulBukuArray.join(', ')})` : '';
            const calculatedTotal = (data as any)?.detail_masuk?.reduce((sum: number, d: any) => sum + (d.jumlah_masuk || 0), 0) || totalItem;

            const isSender = payload.new.id_user === session?.user?.id;

            const newNotif: AppNotification = {
              id: newId,
              type: 'success',
              title: 'Stok Masuk',
              message: `${calculatedTotal} pcs stok ditambahkan${judulText}`,
              time: 'Baru saja',
              rawTime: payload.new.dibuat_pada,
              isRead: isSender,
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 10));
            if (!isSender) {
              setUnreadCount(prev => prev + 1);
              showAlert(`${calculatedTotal} pcs stok baru saja ditambahkan.${judulText}`, 'success');
            }
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
          if (processedIds.current.has(newId)) return;
          processedIds.current.add(newId);
          
          const totalItem = payload.new.total_item as number;
          
          setTimeout(async () => {
            const { data } = await supabase
              .from('transaksi_keluar')
              .select('detail_keluar(jumlah_keluar, buku(judul))')
              .eq('id', newId)
              .single();
              
            const judulBukuArray = (data as any)?.detail_keluar?.map((d: any) => d.buku?.judul).filter(Boolean) || [];
            const judulText = judulBukuArray.length > 0 ? ` (${judulBukuArray.join(', ')})` : '';
            const calculatedTotal = (data as any)?.detail_keluar?.reduce((sum: number, d: any) => sum + (d.jumlah_keluar || 0), 0) || totalItem;

            const isSender = payload.new.id_user === session?.user?.id;

            const newNotif: AppNotification = {
              id: newId,
              type: 'warning',
              title: 'Stok Keluar',
              message: `${calculatedTotal} pcs stok dikeluarkan${judulText}`,
              time: 'Baru saja',
              rawTime: payload.new.dibuat_pada,
              isRead: isSender,
            };
            setNotifications(prev => [newNotif, ...prev].slice(0, 10));
            if (!isSender) {
              setUnreadCount(prev => prev + 1);
              showAlert(`${calculatedTotal} pcs stok baru saja dikeluarkan.${judulText}`, 'warning');
            }
          }, 1000);
        }
      )
      .subscribe();

    const broadcastChannel = supabase.channel('app-notifications')
      .on('broadcast', { event: 'app-change' }, (payload) => {
        const data = payload.payload;
        // Broadcasts don't have a unique ID by default, let's just use the timestamp they send
        // or a random ID if not provided, but we can prevent double process by checking the message
        // Actually, let's just allow it or use a simple debounce/tracker for broadcasts
        if (data.senderId !== session.user.id) {
          const notifId = data.title + data.message + data.time; // rough uniqueness
          if (processedIds.current.has(notifId)) return;
          processedIds.current.add(notifId);
          
          const newNotif: AppNotification = {
            id: Date.now().toString() + Math.random().toString(),
            type: data.type,
            title: data.title,
            message: data.message,
            time: 'Baru saja',
            rawTime: new Date().toISOString(),
            isRead: false,
          };
          setNotifications(prev => [newNotif, ...prev].slice(0, 15));
          setUnreadCount(prev => prev + 1);
          showAlert(data.message, data.type);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(masukChannel);
      supabase.removeChannel(keluarChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [showAlert, session]);

  return (
    <NotificationContext.Provider value={{ showAlert, showConfirm, notifications, unreadCount, markAllAsRead, markAsRead, broadcastNotification }}>
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
