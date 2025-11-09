'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-hide after duration (default 5s)
    const duration = toast.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = {
    success: {
      icon: CheckCircle,
      className: 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800',
      iconClassName: 'text-green-600 dark:text-green-400',
      titleClassName: 'text-green-900 dark:text-green-100',
    },
    error: {
      icon: XCircle,
      className: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800',
      iconClassName: 'text-red-600 dark:text-red-400',
      titleClassName: 'text-red-900 dark:text-red-100',
    },
    warning: {
      icon: AlertCircle,
      className: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800',
      iconClassName: 'text-yellow-600 dark:text-yellow-400',
      titleClassName: 'text-yellow-900 dark:text-yellow-100',
    },
    info: {
      icon: Info,
      className: 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800',
      iconClassName: 'text-blue-600 dark:text-blue-400',
      titleClassName: 'text-blue-900 dark:text-blue-100',
    },
  };

  const { icon: Icon, className, iconClassName, titleClassName } = config[toast.type];

  return (
    <div
      className={`flex items-start p-4 rounded-lg border shadow-lg ${className} animate-fade-in`}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${iconClassName} flex-shrink-0 mt-0.5`} />
      <div className="ml-3 flex-1">
        <p className={`text-sm font-semibold ${titleClassName}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
