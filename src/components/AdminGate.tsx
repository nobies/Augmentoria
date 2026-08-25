import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../i18n';
import { unlockAdmin } from '../lib/adminAccess';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AdminGate({ onSuccess, onClose }: Props) {
  const { t } = useLang();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockAdmin(code)) {
      onSuccess();
    } else {
      setError(true);
      setCode('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0, x: error ? [0, -8, 8, -5, 5, 0] : 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="fixed top-1/2 left-1/2 z-[81] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-8 shadow-2xl"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="font-display text-lg font-bold">{t('gate_title')}</h2>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('gate_ph')}
            className={`w-full rounded-lg border bg-bg px-4 py-3 text-center text-sm tracking-widest outline-none transition-all ${
              error ? 'border-red-500' : 'border-line focus:border-accent'
            }`}
          />
          {error && <p className="text-center text-xs text-red-400">{t('gate_err')}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim"
          >
            {t('gate_btn')}
          </button>
        </form>
      </motion.div>
    </>
  );
}
