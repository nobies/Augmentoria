import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS, ROLE_KEY, ROLE_PERMS } from '../lib/rbac';

interface Props {
  mode: 'signin' | 'signup';
}

export default function AuthPage({ mode }: Props) {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const { loginAs } = useAuth();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  const requestedPath = (location.state as { from?: unknown } | null)?.from;
  const destination = typeof requestedPath === 'string' && requestedPath.startsWith('/') ? requestedPath : '/app';

  const go = (id: string) => {
    const ok = loginAs(id);
    setLoading(true);
    if (!ok) {
      setAuthError(t('auth_account_disabled'));
      setLoading(false);
      return;
    }
    navigate(destination, { replace: true });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (isSignup) {
      setAuthError(t('auth_backend_pending'));
      return;
    }

    const data = new FormData(e.currentTarget as HTMLFormElement);
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    const demoUser = DEMO_USERS.find((candidate) => candidate.email.toLowerCase() === email);

    if (!demoUser) {
      setAuthError(t('auth_demo_error'));
      return;
    }

    go(demoUser.id);
  };

  const quickLogin = (id: string) => {
    setAuthError(null);
    go(id);
  };

  const inputCls =
    'w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted/60 outline-none transition-all duration-300 focus:border-accent focus:shadow-[0_0_0_3px_rgba(var(--glow-rgb),0.12)]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md"
    >
      <h1 className="font-display text-3xl font-black lg:text-4xl">
        {isSignup ? t('auth_welcome_new') : t('auth_welcome_back')}
      </h1>
      <p className="mt-3 text-sm text-muted">{isSignup ? t('auth_sub_signup') : t('auth_sub_signin')}</p>

      <div className="mt-8 grid grid-cols-2 rounded-full border border-line p-1">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            onClick={() => navigate(m === 'signin' ? '/login' : '/register')}
            className={`relative rounded-full py-2.5 text-sm font-semibold transition-colors duration-300 ${
              mode === m ? 'text-bg' : 'text-muted hover:text-ink'
            }`}
          >
            {mode === m && (
              <motion.span
                layoutId="auth-tab"
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              />
            )}
            <span className="relative z-10">{m === 'signin' ? t('auth_signin') : t('auth_signup')}</span>
      </button>

        ))}
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        {isSignup && (
          <input name="name" type="text" required placeholder={t('auth_name')} autoComplete="name" className={inputCls} />
        )}
        <input name="email" type="email" required placeholder={t('auth_email')} autoComplete="email" className={inputCls} />
        <input
          name="password"
          type="password"
          required
          placeholder={t('auth_password')}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          minLength={6}
          className={inputCls}
        />
        {isSignup && <input name="confirmPassword" type="password" required placeholder={t('auth_confirm')} minLength={6} className={inputCls} />}

        {!isSignup && (
          <div className="flex items-center justify-between text-xs">
            <label className="flex cursor-pointer items-center gap-2 text-muted select-none">
              <input type="checkbox" defaultChecked className="accent-accent" />
              {t('auth_remember')}
            </label>
            <a href="#forgot" className="text-muted transition-colors hover:text-accent">
              {t('auth_forgot')}
            </a>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent py-3.5 text-sm font-bold tracking-wide text-bg transition-all duration-300 hover:bg-accent-dim hover:shadow-[0_0_32px_rgba(var(--glow-rgb),0.4)] disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />
          ) : isSignup ? (
            t('auth_submit_signup')
          ) : (
            t('auth_submit_signin')
          )}
        </button>

        {authError && (
          <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-200">
            {authError}
          </p>
        )}

      </form>

      <div className="my-7 flex items-center gap-4 text-[10px] tracking-[0.3em] text-muted/60 uppercase">
        <span className="h-px flex-1 bg-line" />
        {t('auth_or')}
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={() => setAuthError(t('auth_backend_pending'))}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-line py-3 text-sm font-medium text-ink/90 transition-all duration-300 hover:border-accent hover:text-accent"
      >
        <svg width="17" height="17" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 01-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.82z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.46 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0012 24z" />
          <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 010-4.56V6.62H1.29a12 12 0 000 10.76l3.98-3.1z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 001.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
        </svg>
        {t('auth_google')}
      </button>

      {isSignup ? (
        <p className="mt-6 text-center text-xs leading-relaxed text-muted">{t('auth_terms')}</p>
      ) : null}

      <div className="mt-8 rounded-xl border border-line bg-surface/60 p-4">
        <p className="mb-3 text-center text-[10px] font-bold tracking-widest text-muted/70 uppercase">
          {lang === 'ar' ? 'تجربة سريعة بأدوار مختلفة' : 'Quick demo — sign in as'}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {DEMO_USERS.filter((u) => u.id !== 'u-sa' || true).map((u) => (
            <button
              key={u.id}
              onClick={() => quickLogin(u.id)}
              title={u.email}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                ROLE_PERMS[u.roleId].includes('companies.manage')
                  ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
                  : 'border-line text-muted hover:border-accent hover:text-accent'
              }`}
            >
              {t(ROLE_KEY[u.roleId] as never)}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        {isSignup ? t('auth_to_signin_q') : t('auth_to_signup_q')}{' '}
        <Link to={isSignup ? '/login' : '/register'} className="font-semibold text-accent hover:underline">
          {isSignup ? t('auth_signin') : t('auth_signup')}
        </Link>
      </p>
    </motion.div>
  );
}
