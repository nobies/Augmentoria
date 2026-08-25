import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../i18n';
import { useCollectionMedia } from '../hooks/useCollectionMedia';
import { useIsAdmin, lockAdmin } from '../lib/adminAccess';
import HeroAdmin from '../components/admin/HeroAdmin';
import AdminGate from '../components/AdminGate';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t, lang, toggle } = useLang();
  const media = useCollectionMedia('auth');
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [askCode, setAskCode] = useState(false);
  const [idx, setIdx] = useState(0);

  const slides = media.images.filter((i) => i.active);
  const showSlide = media.settings.enabled && slides.length > 0;

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [idx, slides.length]);

  const requestAdmin = () => {
    if (isAdmin) setOpen(true);
    else setAskCode(true);
  };
  const requestRef = useRef(requestAdmin);
  requestRef.current = requestAdmin;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        requestRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!media.settings.enabled || slides.length < 2) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % slides.length), media.settings.interval * 1000);
    return () => clearInterval(timer);
  }, [media.settings.enabled, media.settings.interval, slides.length]);

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <aside className="grain vignette relative hidden w-[46%] flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="hero-fallback absolute inset-0 z-0" />

        {showSlide && (
          <div className="absolute inset-0 z-[1]" style={{ opacity: media.settings.opacity }}>
            <AnimatePresence>
              <motion.img
                key={slides[idx % slides.length]?.url}
                src={slides[idx % slides.length]?.url}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: 'easeInOut' }}
                className="animate-kenburns absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>
          </div>
        )}

        <Link to="/" className="font-display relative z-10 text-lg font-black tracking-[0.35em]">
          AUGMENTORIA
        </Link>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-md"
          >
            <p className="font-display text-3xl leading-snug font-black text-balance">{t('hero_headline')}</p>
            <p className="mt-6 text-xs leading-relaxed tracking-[0.18em] text-muted uppercase">{t('hero_sub')}</p>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <p className="text-[11px] tracking-widest text-muted/60 uppercase">© 2026 Augmentoria</p>
          {isAdmin ? (
            <button
              onClick={() => setOpen(true)}
              className="rounded-full border border-line bg-bg/60 p-2.5 text-muted backdrop-blur transition-all duration-300 hover:border-accent hover:text-accent"
              aria-label="Side image settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <span />
          )}
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-5 lg:px-12">
          <Link to="/" className="font-display text-base font-black tracking-[0.35em] lg:hidden">
            AUGMENTORIA
          </Link>
          <span className="hidden lg:block" />
          <button
            onClick={toggle}
            className="rounded-full border border-line px-3 py-1 text-xs font-medium tracking-widest text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {lang === 'en' ? 'عربي' : 'EN'}
          </button>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">{children}</div>
      </main>

      <AnimatePresence>
        {open && (
          <HeroAdmin
            images={media.images}
            settings={media.settings}
            titleKey="side_title"
            onClose={() => setOpen(false)}
            onLock={() => {
              lockAdmin();
              setOpen(false);
            }}
            onAdd={media.addFiles}
            onRemove={media.remove}
            onToggle={media.toggleActive}
            onSettings={media.updateSettings}
          />
        )}
        {askCode && (
          <AdminGate
            onSuccess={() => {
              setAskCode(false);
              setOpen(true);
            }}
            onClose={() => setAskCode(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
