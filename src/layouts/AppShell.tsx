import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { ROLE_KEY, DEMO_USERS } from '../lib/rbac';
import type { Perm } from '../lib/rbac';
import { actions, useAppState } from '../lib/store';
import type { AppNotification } from '../lib/store';
import { GoldMark } from '../components/ui/bits';
import ThemePicker from '../components/ui/ThemePicker';

type NavItem = { to: string; key: string; icon: string; end?: boolean; perm?: Perm; clientOnly?: boolean; hideForClient?: boolean };

const NAV: NavItem[] = [
  { to: '/app', end: true, key: 'nav_home', icon: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10' },
  {
    to: '/app/projects',
    key: 'nav_projects',
    hideForClient: true,
    icon: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z'
  },
  { to: '/app/my-projects', key: 'nav_client_portal', clientOnly: true, icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { to: '/app/clients', key: 'nav_clients', perm: 'clients.manage', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/app/reviews', key: 'nav_reviews', icon: 'M8 10h8M8 14h5m-8 6l2.5-3H18a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v9a2 2 0 002 2h1z' },
  { to: '/app/reports', key: 'nav_reports', perm: 'reports.export', icon: 'M9 17v-6m3 6V7m3 10v-4M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z' }
];

const ADMIN_NAV = [
  { to: '/app/admin/companies', key: 'admin_companies', perm: 'companies.manage' as Perm, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to: '/app/admin/roles', key: 'admin_roles', perm: 'roles.assign' as Perm, icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.5-3a7.5 7.5 0 01-.1 1.2l2 1.6a.6.6 0 01.14.77l-1.92 3.32a.6.6 0 01-.73.26l-2.36-.95c-.62.47-1.3.86-2.03 1.16l-.36 2.51a.6.6 0 01-.59.51h-3.84a.6.6 0 01-.59-.51l-.36-2.51a7.57 7.57 0 01-2.03-1.16l-2.36.95a.6.6 0 01-.73-.26L2.06 15.8a.6.6 0 01.13-.78l2-1.6A7.55 7.55 0 014.1 12c0-.41.04-.81.1-1.2l-2-1.61a.6.6 0 01-.14-.77l1.92-3.32a.6.6 0 01.73-.27l2.36.95c.62-.47 1.3-.87 2.03-1.16l.36-2.51a.6.6 0 01.59-.51h3.84c.29 0 .54.21.59.5l.36 2.52c.73.29 1.41.68 2.03 1.16l2.36-.95a.6.6 0 01.73.26l1.92 3.33a.6.6 0 01-.13.77l-2 1.6c.06.39.1.79.1 1.2z' },
  { to: '/app/admin/members', key: 'admin_members', perm: 'members.manage' as Perm, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
] satisfies NavItem[];

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
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const state = useAppState();
  const notifications = state.notifications.filter((n) => n.userId === user.id).slice(0, 20);
  const unread = notifications.filter((n) => !n.read).length;

  const openNotification = (n: AppNotification) => {
    actions.markNotificationRead(n.id);
    setNotifOpen(false);
    if (n.commentId && n.version) {
      navigate(`/studio/review/${n.projectId}/${n.version}?comment=${n.commentId}`);
    } else {
      navigate(`/app/projects/${n.projectId}`);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
    } catch {
      // Sidebar preference is optional and must not block navigation.
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
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
          {NAV.filter((n) => (!n.perm || can(n.perm)) && (!n.clientOnly || user.roleId === 'client') && (!n.hideForClient || user.roleId !== 'client')).map((n) => (
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

          {ADMIN_NAV.some((item) => can(item.perm)) && (
            <>
              {!collapsed && (
                <p className="px-3 pt-5 pb-2 text-[10px] font-bold tracking-[0.2em] text-muted/50 uppercase">
                  {t('nav_admin')}
                </p>
              )}
              {collapsed && <div className="mx-3 border-t border-line pt-4" />}
              {ADMIN_NAV.filter((item) => can(item.perm)).map((n) => (
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

          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((o) => !o)}
                aria-label={t('nav_notifications')}
                title={t('nav_notifications')}
                className="relative flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-black text-bg">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    className="absolute end-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
                  >
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <p className="text-sm font-bold">{t('nav_notifications')}</p>
                      {unread > 0 && (
                        <button onClick={() => actions.markAllNotificationsRead(user.id)} className="text-[10px] font-semibold text-accent hover:underline">
                          {t('notif_mark_all')}
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto p-1.5">
                      {notifications.length === 0 && (
                        <p className="px-3 py-8 text-center text-xs text-muted">{t('notif_empty')}</p>
                      )}
                      {notifications.map((n) => {
                        const project = state.projects.find((pr) => pr.id === n.projectId);
                        return (
                          <button
                            key={n.id}
                            onClick={() => openNotification(n)}
                            className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-start transition-colors ${
                              n.read ? 'text-muted hover:bg-bg' : 'bg-accent/[0.06] text-ink hover:bg-accent/10'
                            }`}
                          >
                            <span className="line-clamp-2 w-full text-xs leading-relaxed">
                              {!n.read && <span className="me-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />}
                              {lang === 'ar' ? n.textAr : n.textEn}
                            </span>
                            <span className="text-[10px] text-muted/70">
                              {project?.name ?? '—'} {n.version ? `· ${n.version}` : ''} · {n.createdAt.slice(11)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ThemePicker />
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
                aria-label={lang === 'ar' ? 'فتح قائمة الحساب' : 'Open account menu'}
                title={lang === 'ar' ? 'قائمة الحساب' : 'Account menu'}
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
                          onClick={() => {
                            loginAs(u.id);
                            setMenuOpen(false);
                          }}
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
