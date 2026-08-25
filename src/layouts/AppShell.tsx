import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { ROLE_KEY, DEMO_USERS } from '../lib/rbac';
import { GoldMark } from '../components/ui/bits';
import ThemePicker from '../components/ui/ThemePicker';

const NAV = [
  { to: '/app', end: true, key: 'nav_home', icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10' },
  {
    to: '/app/projects',
    key: 'nav_projects',
    icon: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z'
  },
  { to: '/app/clients', key: 'nav_clients', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/app/reviews', key: 'nav_reviews', icon: 'M8 10h8M8 14h5m-8 6l2.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v9a2 2 0 002 2h1z' },
  { to: '/app/reports', key: 'nav_reports', icon: 'M9 17v-6m3 6V7m3 10v-4M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z' },
  { to: '/app/team', key: 'nav_team', perm: 'team.manage' as const, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' }
];

const ADMIN_NAV = [
  { to: '/app/admin/companies', key: 'admin_companies', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/app/admin/members', key: 'admin_members', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
];

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, toggle } = useLang();
  const { user, can, loginAs, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  const avatarImg = user.avatar;

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <aside
        className={`fixed inset-y-0 start-0 z-40 flex flex-col border-e border-line bg-surface transition-all duration-300 lg:static ${
          collapsed ? 'w-[68px]' : 'w-60'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:translate-x-0 rtl:lg:translate-x-0'}`}
      >
        <div className={`flex h-14 items-center gap-2.5 border-b border-line px-4 ${collapsed ? 'justify-center px-0' : ''}`}>
          <GoldMark size={26} />
          {!collapsed && (
            <NavLink to="/" className="font-display text-sm font-black tracking-[0.22em]">
              AUGMENTORIA
            </NavLink>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              title={t(n.key as never)}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                  isActive ? 'text-accent' : 'text-muted hover:bg-bg hover:text-ink'
                } ${collapsed ? 'justify-center px-0' : ''} hover:ps-4`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-accent/10"
                      transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                    />
                  )}
                  <Icon path={n.icon} className="relative z-10 shrink-0" />
                  {!collapsed && <span className="relative z-10">{t(n.key as never)}</span>}
                </>
              )}
            </NavLink>
          ))}

          {can('members.manage') && (
            <>
              {!collapsed && (
                <p className="px-3 pt-5 pb-2 text-[10px] font-bold tracking-[0.2em] text-muted/50 uppercase">
                  {t('nav_admin')}
                </p>
              )}
              {collapsed && <div className="mx-3 border-t border-line pt-4" />}
              {ADMIN_NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  title={t(n.key as never)}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                      isActive ? 'text-accent' : 'text-muted hover:bg-bg hover:text-ink'
                    } ${collapsed ? 'justify-center px-0' : ''} hover:ps-4`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-accent/10" transition={{ type: 'spring', damping: 30, stiffness: 350 }} />
                      )}
                      <Icon path={n.icon} className="relative z-10 shrink-0" />
                      {!collapsed && <span className="relative z-10">{t(n.key as never)}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden items-center justify-center border-t border-line py-3 text-muted transition-colors hover:text-accent lg:flex"
          aria-label="Collapse sidebar"
        >
          <motion.span animate={{ rotate: collapsed ? 180 : 0 }}>
            <Icon path="M15 19l-7-7 7-7" />
          </motion.span>
        </button>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-line bg-bg/85 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button className="text-muted transition-colors hover:text-ink lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu">
              <Icon path="M4 6h16M4 12h16M4 18h16" />
            </button>

            <div className="relative hidden md:block">
              <svg
                className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted/60"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                placeholder={t('common_search')}
                className="w-72 rounded-full border border-line bg-surface ps-9 pe-4 py-1.5 text-sm outline-none transition-colors placeholder:text-muted/50 focus:border-accent focus:shadow-[0_0_0_3px_rgba(var(--glow-rgb),0.08)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemePicker />
            <button
              className="group relative rounded-full p-2 text-muted transition-colors hover:text-accent"
              aria-label={t('common_notifications')}
            >
              <Icon path="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
            </button>
            <button
              onClick={toggle}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium tracking-widest text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
            <div className="relative" ref={menuRef}>
              <motion.button
                whileHover={{ scale: 1.08 }}
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-dim text-xs font-bold text-bg shadow-[0_0_16px_rgba(var(--glow-rgb),0.25)]"
              >
                {avatarImg ? <img src={avatarImg} alt="" className="h-full w-full object-cover" /> : initials}
              </motion.button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="absolute end-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
                  >
                    <div className="border-b border-line px-4 py-3">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted" dir="ltr">{user.email}</p>
                      <span className="mt-2 inline-block rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                        {t(ROLE_KEY[user.roleId] as never)}
                      </span>
                    </div>
                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate('/app/settings');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-bg hover:text-ink"
                      >
                        <Icon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        {t('menu_profile')}
                      </button>
                    </div>
                    <div className="border-t border-line p-2">
                      <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold tracking-widest text-muted/60 uppercase">{t('menu_view_as')}</p>
                      {DEMO_USERS.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => loginAs(u.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                            u.id === user.id ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-bg hover:text-ink'
                          }`}
                        >
                          {u.name}
                          <span className="text-[9px] uppercase opacity-70">{t(ROLE_KEY[u.roleId] as never)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-line p-1.5">
                      <button
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                          navigate('/login');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-400/10"
                      >
                        <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        {t('menu_logout')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
