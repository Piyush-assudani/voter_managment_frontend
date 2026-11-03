'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

// Global dispatcher function that works anywhere (components, hooks, event callbacks)
export const toast = {
  success: (message: string, duration = 3500) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message, type: 'success', duration }
      }));
    }
  },
  error: (message: string, duration = 5000) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message, type: 'error', duration }
      }));
    }
  },
  warning: (message: string, duration = 4000) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message, type: 'warning', duration }
      }));
    }
  },
  info: (message: string, duration = 3000) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message, type: 'info', duration }
      }));
    }
  }
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    // Expose toast helper globally to window for convenience
    if (typeof window !== 'undefined') {
      (window as unknown as { toast: typeof toast }).toast = toast;
    }

    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type: ToastType; duration?: number }>;
      if (!customEvent.detail || !customEvent.detail.message) return;

      const newToast: ToastMessage = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        message: customEvent.detail.message,
        type: customEvent.detail.type || 'info',
        duration: customEvent.detail.duration || 4000,
      };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Keep at most 4 toasts to prevent screen crowding

      setTimeout(() => {
        removeToast(newToast.id);
      }, newToast.duration);
    };

    window.addEventListener('app-toast', handleToastEvent);
    return () => {
      window.removeEventListener('app-toast', handleToastEvent);
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-[999999] top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 flex flex-col gap-2 pointer-events-none transition-all duration-300"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-4 fade-in ${
              isSuccess
                ? 'bg-emerald-950/90 border-emerald-600/50 text-emerald-100 shadow-emerald-950/40'
                : isError
                ? 'bg-rose-950/90 border-rose-600/50 text-rose-100 shadow-rose-950/40'
                : isWarning
                ? 'bg-amber-950/90 border-amber-600/50 text-amber-100 shadow-amber-950/40'
                : 'bg-slate-900/90 border-slate-700/60 text-slate-100 shadow-black/40'
            }`}
            style={{ wordBreak: 'break-word' }}
          >
            <div className="flex-shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="flex-1 text-sm font-medium leading-snug">
              {t.message}
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 p-1 -mr-1 -mt-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity hover:bg-white/10"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
