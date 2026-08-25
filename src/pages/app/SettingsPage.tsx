import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { ROLE_KEY, ROLE_PERMS } from '../../lib/rbac';
import { FadeIn } from '../../components/ui/bits';
import { THEMES, applyTheme, currentThemeId } from '../../lib/theme';
import { fileToDataUrl } from '../../lib/image';

export default function SettingsPage() {
  const { t, lang } = useLang();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [title, setTitle] = useState(user.title ?? '');
  const [savedP, setSavedP] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [savedW, setSavedW] = useState(false);
  const [themeId, setThemeId] = useState(currentThemeId());

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    updateProfile({ name: name.trim(), email: email.trim(), title: title.trim() });
    setSavedP(true);
    setTimeout(() => setSavedP(false), 1800);
  };

  const savePassword = (e: FormEvent) => {
    e.preventDefault();
    if (!pw1 || pw1 !== pw2) return;
    setPw1('');
    setPw2('');
    setSavedW(true);
    setTimeout(() => setSavedW(false), 1800);
  };

  const cls =
    'w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-accent focus:shadow-[0_0_0_3px_rgba(var(--glow-rgb),0.1)]';

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <FadeIn>
        <div className="flex items-center gap-5 rounded-2xl border border-line bg-surface p-6">
          <div className="relative">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-16 w-16 rounded-full object-cover shadow-[0_0_28px_rgba(var(--glow-rgb),0.3)] ring-2 ring-accent/40" />
            ) : (
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dim text-xl font-black text-bg shadow-[0_0_28px_rgba(var(--glow-rgb),0.3)]"
              >
                {user.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
              </motion.div>
            )}
            <label className="absolute -bottom-1 -end-1 cursor-pointer rounded-full border border-line bg-bg p-1.5 text-muted transition-colors hover:border-accent hover:text-accent" title={t('set_photo')}>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) updateProfile({ avatar: await fileToDataUrl(f, 192) });
                  e.target.value = '';
                }}
              />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </label>
          </div>
          <div>
            <h1 className="font-display text-lg font-bold">{user.name}</h1>
            <p className="text-xs text-muted">{user.title} · {t(ROLE_KEY[user.roleId] as never)}</p>
            <p className="mt-0.5 text-xs text-muted/60" dir="ltr">{user.email}</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display mb-2 text-sm font-bold tracking-wide uppercase">{t('set_profile')}</h2>
          <div>
            <label className="mb-1.5 block text-[11px] tracking-wider text-muted uppercase">{t('m_name')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={cls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] tracking-wider text-muted uppercase">{t('m_email')}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className={cls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] tracking-wider text-muted uppercase">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={cls} />
          </div>
          <button className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-dim">
            {savedP ? t('set_saved_ok') : t('set_save')}
          </button>
        </form>
      </FadeIn>

      <FadeIn delay={0.14}>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display mb-4 text-sm font-bold tracking-wide uppercase">{t('theme_title')}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {THEMES.map((th) => (
              <button
                key={th.id}
                onClick={() => {
                  applyTheme(th.id);
                  setThemeId(th.id);
                }}
                className={`group flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 ${
                  themeId === th.id ? 'border-accent bg-accent/5' : 'border-line hover:border-muted'
                }`}
              >
                <span
                  className={`h-9 w-9 rounded-full shadow-inner ${themeId === th.id ? 'ring-2 ring-offset-2 ring-offset-surface' : ''}`}
                  style={{
                    background: `linear-gradient(135deg, ${th.accent}, ${th.dim})`,
                    ...(themeId === th.id ? ({ ['--tw-ring-color']: th.accent } as React.CSSProperties) : {})
                  }}
                />
                <span className={`text-[10px] font-medium ${themeId === th.id ? 'text-accent' : 'text-muted'}`}>{th.label}</span>
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.18}>
        <form onSubmit={savePassword} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display mb-2 text-sm font-bold tracking-wide uppercase">{t('set_password')}</h2>
          <input type="password" placeholder={t('set_current_pw')} className={cls} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder={t('set_new_pw')} className={cls} />
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={t('auth_confirm')} className={cls} />
          </div>
          {pw1 && pw2 && pw1 !== pw2 && <p className="text-xs text-red-400">{t('gate_err')}</p>}
          <button disabled={!pw1 || pw1 !== pw2} className="rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-40">
            {savedW ? t('set_saved_ok') : t('set_save')}
          </button>
        </form>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="mb-1 text-[11px] tracking-wider text-muted uppercase">{t('set_my_role')}</p>
          <p className="font-display mb-5 text-base font-bold text-accent">{t(ROLE_KEY[user.roleId] as never)}</p>
          <p className="mb-3 text-[11px] tracking-wider text-muted uppercase">{t('set_my_perms')}</p>
          <div className="flex flex-wrap gap-2">
            {[...ROLE_PERMS[user.roleId], ...(user.extraPerms ?? [])]
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .map((p) => (
                <span key={p} className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
                  {t(`perm_${p.replace('.', '_')}` as never)}
                </span>
              ))}
          </div>
          <p className="mt-4 text-[10px] text-muted/50">
            {lang === 'ar' ? 'الصلاحيات دي بتتحكم في الأزرار والصفحات اللي بتشوفها.' : 'These permissions control the buttons and pages you see.'}
          </p>
        </div>
      </FadeIn>

      {!ROLE_PERMS[user.roleId].includes('projects.create') && (
        <p className="text-center text-xs text-muted/50">
          {lang === 'ar' ? 'ملحوظة: معندكش صلاحية إنشاء مشاريع — الزرار مش هيظهرلك في صفحة المشاريع.' : "Note: you can't create projects — the button stays hidden."}
        </p>
      )}
    </div>
  );
}
