import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { THEMES, currentThemeId, applyTheme } from '../../lib/theme';

export default function ThemePicker() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(currentThemeId());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (id: string) => {
    applyTheme(id);
    setActive(id);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full p-2 text-muted transition-colors hover:text-accent"
        aria-label={t('theme_title')}
        title={t('theme_title')}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3a9 9 0 100 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01a1.5 1.5 0 011.11-2.49H16a5 5 0 005-5c0-4.42-4.03-8-9-8z" strokeLinecap="round" />
          <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 top-10 z-50 w-52 rounded-xl border border-line bg-surface p-3 shadow-2xl"
          >
            <p className="mb-2.5 px-1 text-[10px] font-bold tracking-widest text-muted/70 uppercase">{t('theme_title')}</p>
            <div className="grid grid-cols-6 gap-2">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => pick(th.id)}
                  title={th.label}
                  aria-label={th.label}
                  className={`group relative flex h-8 w-8 items-center justify-center rounded-lg transition-transform hover:scale-110 ${
                    active === th.id ? 'ring-2 ring-offset-2 ring-offset-surface' : ''
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${th.accent}, ${th.dim})`,
                    ...(active === th.id ? ({ ['--tw-ring-color']: th.accent } as React.CSSProperties) : {})
                  }}
                >
                  {active === th.id && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
