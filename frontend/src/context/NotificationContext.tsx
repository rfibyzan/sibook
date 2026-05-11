import React, { createContext, useContext, useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  type?: 'danger' | 'primary';
}

interface NotificationContextType {
  showAlert: (message: string, type?: NotificationType) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<{ message: string; type: NotificationType; id: number } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const showAlert = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now();
    setAlert({ message, type, id });
    
    // Timer otomatis tutup
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

  return (
    <NotificationContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Global Alert (Toast) */}
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

      {/* Global Confirm Modal */}
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
