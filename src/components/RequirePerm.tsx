import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../i18n';
import type { Perm } from '../lib/rbac';

export function NoAccess() {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/30 bg-red-400/10 text-red-300">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="font-display text-xl font-bold">{t('no_access_title')}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">{t('no_access_body')}</p>
      <Link to="/app" className="mt-6 rounded-full border border-line px-5 py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent">
        ← {t('nav_home')}
      </Link>
    </div>
  );
}

export function RequirePerm({ perm, children }: { perm: Perm; children: ReactNode }) {
  const { can } = useAuth();
  return <>{can(perm) ? children : <NoAccess />}</>;
}
