import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../i18n';

export default function Navbar() {
  const { t, lang, toggle } = useLang();
  const navigate = useNavigate();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#about', label: t('nav_product') },
    { href: '#features', label: t('nav_workflow') },
    { href: '#cta', label: t('nav_pricing') }
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        solid ? 'bg-bg/85 backdrop-blur-md border-b border-line' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link to="/" className="font-display text-lg font-black tracking-[0.35em] text-ink">
          AUGMENTORIA
        </Link>

        <ul className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-sm tracking-wide text-muted transition-colors duration-300 hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="rounded-full border border-line px-3 py-1 text-xs font-medium tracking-widest text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
            aria-label="Switch language"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={lang}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {lang === 'en' ? 'عربي' : 'EN'}
              </motion.span>
            </AnimatePresence>
          </button>

          <button
            onClick={() => navigate('/login')}
            className="hidden text-sm text-muted transition-colors hover:text-ink md:block"
          >
            {t('nav_signin')}
          </button>

          <button
            onClick={() => navigate('/register')}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition-all duration-300 hover:bg-accent-dim hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
          >
            {t('nav_cta')}
          </button>

          <button
            className="flex flex-col gap-1.5 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <span className="h-px w-6 bg-ink" />
            <span className="h-px w-6 bg-ink" />
            <span className="h-px w-6 bg-ink" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-line bg-bg/95 backdrop-blur-md md:hidden"
          >
            <ul className="space-y-1 px-6 py-4">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block py-2 text-sm text-muted hover:text-ink"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate('/login');
                  }}
                  className="block py-2 text-sm text-accent"
                >
                  {t('nav_signin')}
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
