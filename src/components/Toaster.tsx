import { useEffect } from 'react';
import { useLang } from '../i18n';
import { dismissToast, toast as pushToast, useToasts } from '../lib/toast';

export default function Toaster() {
  const toasts = useToasts();
  const { t } = useLang();

  useEffect(() => {
    const onPersistenceError = () => pushToast({
      id: 'persistence-error',
      tone: 'danger',
      durationMs: 9000,
      message: t('toast_persistence_error')
    });
    window.addEventListener('augmentoria:persistence-error', onPersistenceError);
    return () => window.removeEventListener('augmentoria:persistence-error', onPersistenceError);
  }, [t]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
            toast.tone === 'danger'
              ? 'border-red-400/40 bg-red-950/85 text-red-100'
              : toast.tone === 'success'
                ? 'border-emerald-400/40 bg-emerald-950/85 text-emerald-100'
                : 'border-line bg-surface/95 text-ink'
          }`}
        >
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{toast.message}</p>
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={() => {
                toast.onAction?.();
                dismissToast(toast.id);
              }}
              className="shrink-0 rounded-full border border-accent/60 px-3 py-1 text-[11px] font-bold text-accent transition-colors hover:bg-accent/10"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label={t('toast_dismiss')}
            className="shrink-0 text-muted transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
