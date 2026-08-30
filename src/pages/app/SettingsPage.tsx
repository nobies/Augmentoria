import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { ROLE_KEY } from '../../lib/rbac';
import type { Perm } from '../../lib/rbac';
import { actions, memberEffectivePerms, useAppState } from '../../lib/store';
import { FadeIn } from '../../components/ui/bits';
import { THEMES, applyTheme, currentThemeId } from '../../lib/theme';
import { fileToDataUrl } from '../../lib/image';

export default function SettingsPage() {
  const { t, lang } = useLang();
  const { user, can, updateProfile } = useAuth();
  const state = useAppState();
  const liveMember = state.members.find((m) => m.id === user.id);
  const customRole = state.customRoles.find((r) => r.id === liveMember?.customRoleId);
  const company = state.companies.find((c) => c.id === liveMember?.companyId);
  const myPerms = [...memberEffectivePerms(liveMember, state.customRoles)];
  const canBrand = user.roleId === 'company_admin' || can('companies.manage');
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [title, setTitle] = useState(user.title ?? '');
  const [savedP, setSavedP] = useState(false);
  const [savedB, setSavedB] = useState(false);
  const [brandName, setBrandName] = useState(company?.name ?? '');
  const [tagline, setTagline] = useState(company?.tagline ?? '');
  const [themeId, setThemeId] = useState(currentThemeId());

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    updateProfile({ name: name.trim(), email: email.trim(), title: title.trim() });
    setSavedP(true);
    setTimeout(() => setSavedP(false), 1800);
  };

  const saveBranding = (e: FormEvent) => {
    e.preventDefault();
    if (!company || !canBrand) return;
    actions.updateCompanyInfo(company.id, {
      ...(brandName.trim() ? { name: brandName.trim() } : {}),
      tagline: tagline || undefined
    }, user.id);
    setSavedB(true);
    setTimeout(() => setSavedB(false), 1800);
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

      <FadeIn delay={0.05}>
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5">
          <p className="text-[10px] font-black tracking-[0.2em] text-emerald-300 uppercase">Unified identity</p>
          <p className="mt-2 text-sm font-bold">{lang === 'ar' ? 'حساب واحد للمشروع والـReview' : 'One account for projects and review'}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {lang === 'ar'
              ? 'بياناتك ودورك وصلاحياتك هنا هي نفسها داخل الـPro Review؛ مفيش حساب أو إعدادات منفصلة لمحرك المراجعة.'
              : 'Your profile, role, and permissions here are reused by Pro Review; the review engine has no separate account or settings UI.'}
          </p>
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

      {company && canBrand && (
        <FadeIn delay={0.11}>
          <form onSubmit={saveBranding} className="space-y-4 rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-sm font-bold tracking-wide uppercase">{t('set_studio_branding')}</h2>
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-accent">{company.name}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">{t('set_studio_hint')}</p>
            <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
              <label className="group relative w-fit cursor-pointer" title={t('set_logo')}>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f && company) actions.updateCompanyInfo(company.id, { logoUrl: await fileToDataUrl(f, 192) }, user.id);
                    e.target.value = '';
                  }}
                />
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover ring-2 ring-line transition-colors group-hover:ring-accent/50" />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-line text-muted transition-colors group-hover:border-accent group-hover:text-accent">
                    ⬆
                  </span>
                )}
              </label>
              <div className="space-y-3">
                <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder={t('ph_company_name')} className={cls} />
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder={t('set_tagline')} className={cls} />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={company.brandColor ?? '#D9A441'}
                    onChange={(e) => company && actions.updateCompanyBranding(company.id, { brandColor: e.target.value }, user.id)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-bg p-1"
                    title={t('set_accent_color')}
                  />
                  <span className="text-[11px] text-muted">{t('set_accent_color')}</span>
                </div>
              </div>
            </div>
            <button className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-accent-dim">
              {savedB ? t('set_saved_ok') : t('set_save')}
            </button>
          </form>
        </FadeIn>
      )}

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

      <FadeIn delay={0.2}>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="mb-1 text-[11px] tracking-wider text-muted uppercase">{t('set_my_role')}</p>
          <p className="font-display mb-5 text-base font-bold text-accent">
            {customRole ? customRole.name : t(ROLE_KEY[user.roleId] as never)}
          </p>
          <p className="mb-3 text-[11px] tracking-wider text-muted uppercase">{t('set_my_perms')}</p>
          <div className="flex flex-wrap gap-2">
            {myPerms.map((p) => (
              <span key={p} className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent">
                {t(`perm_${p.replace('.', '_')}` as never)}
              </span>
            ))}
            {myPerms.length === 0 && (
              <span className="text-xs text-muted">{lang === 'ar' ? 'مفيش صلاحيات' : 'No permissions'}</span>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            {can('roles.assign') && (
              <a href="/app/admin/roles" className="text-[11px] text-accent hover:underline">
                {t('roles_title')} →
              </a>
            )}
          </div>
          <p className="mt-3 text-[10px] text-muted/50">
            {lang === 'ar' ? 'الصلاحيات دي بتتحكم في الأزرار والصفحات اللي بتشوفها.' : 'These permissions control the buttons and pages you see.'}
          </p>
        </div>
      </FadeIn>

      {!myPerms.includes('projects.create' as Perm) && (
        <p className="text-center text-xs text-muted/50">
          {lang === 'ar' ? 'ملحوظة: معندكش صلاحية إنشاء مشاريع — الزرار مش هيظهرلك في صفحة المشاريع.' : "Note: you can't create projects — the button stays hidden."}
        </p>
      )}
    </div>
  );
}
