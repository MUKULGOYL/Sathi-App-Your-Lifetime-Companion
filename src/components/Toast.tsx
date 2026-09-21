import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-24 right-4 sm:right-8 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            className={`pointer-events-auto p-4 sm:p-5 rounded-2xl border-2 shadow-lg flex items-center justify-between gap-4 transition-all ${
              isError
                ? 'bg-[#FDE8E8] text-[#8B0000] border-[#C62828]'
                : isSuccess
                ? 'bg-[#E6F4F5] text-[#064E56] border-[#0E7C86]'
                : 'bg-[#FFF4DC] text-[#0F2A33] border-[#F4A300]'
            }`}
          >
            <div className="flex items-center gap-3">
              {isSuccess && <CheckCircle2 className="w-6 h-6 shrink-0" aria-hidden="true" />}
              {isError && <AlertCircle className="w-6 h-6 shrink-0" aria-hidden="true" />}
              {!isSuccess && !isError && <Info className="w-6 h-6 shrink-0" aria-hidden="true" />}
              <span className="font-semibold text-lg">{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-current cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
