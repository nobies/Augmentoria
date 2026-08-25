import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import HeroAdmin from './admin/HeroAdmin';
import PageBuilderPanel from './admin/PageBuilderPanel';
import AdminGate from './AdminGate';
import { useIsAdmin, lockAdmin } from '../lib/adminAccess';
import { useCollectionMedia } from '../hooks/useCollectionMedia';

export default function HeroAdminLauncher() {
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [askCode, setAskCode] = useState(false);
  const media = useCollectionMedia('hero');

  const requestRef = useRef<(which: 'hero' | 'builder') => void>(() => {});
  requestRef.current = (which) => {
    if (isAdmin) {
      if (which === 'hero') setOpen(true);
      else setBuilderOpen(true);
    } else setAskCode(true);
  };

  useEffect(() => {
    const check = () => {
      if (window.location.hash === '#admin') requestRef.current('hero');
    };
    check();
    window.addEventListener('hashchange', check);
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        requestRef.current('hero');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('hashchange', check);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const close = () => {
    setOpen(false);
    if (window.location.hash === '#admin') history.replaceState(null, '', ' ');
  };

  return (
    <>
      {isAdmin && (
        <div className="fixed bottom-5 end-5 z-[60] flex flex-col gap-2">
          <button
            onClick={() => requestRef.current('builder')}
            className="rounded-full border border-line bg-bg/80 p-3 text-muted backdrop-blur transition-all duration-300 hover:border-accent hover:text-accent hover:shadow-[0_0_20px_rgba(var(--glow-rgb),0.25)]"
            aria-label="Landing sections builder"
            title="Sections builder"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setOpen(true)}
            className="rounded-full border border-line bg-bg/80 p-3 text-muted backdrop-blur transition-all duration-300 hover:border-accent hover:text-accent hover:shadow-[0_0_20px_rgba(var(--glow-rgb),0.25)]"
            aria-label="Hero background settings"
            title="Background studio"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <HeroAdmin
            images={media.images}
            settings={media.settings}
            onClose={close}
            onAdd={media.addFiles}
            onRemove={media.remove}
            onToggle={media.toggleActive}
            onSettings={media.updateSettings}
            onLock={() => {
              lockAdmin();
              close();
            }}
          />
        )}
        {builderOpen && <PageBuilderPanel onClose={() => setBuilderOpen(false)} />}
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
    </>
  );
}
