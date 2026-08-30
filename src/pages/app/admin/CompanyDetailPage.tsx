import { Link, useParams } from 'react-router-dom';
import { useLang } from '../../../i18n';
import { actions, clientLogoSrc, useAppState } from '../../../lib/store';
import type { CustomRole } from '../../../lib/store';
import { ALL_PERMS, ROLE_KEY } from '../../../lib/rbac';
import { useAuth } from '../../../context/AuthContext';
import { FadeIn, LogoChip } from '../../../components/ui/bits';

export default function CompanyDetailPage() {
  const { t, lang } = useLang();
  const { id } = useParams();
  const { user } = useAuth();
  const state = useAppState();
  const company = state.companies.find((c) => c.id === id);
  const isSuper = user.roleId === 'super_admin';

  if (!company || !isSuper) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-4xl font-black text-muted/30">404</p>
        <Link to="/app/admin/companies" className="mt-4 inline-block text-sm text-accent hover:underline">
          ← {t('admin_companies')}
        </Link>
      </div>
    );
  }

  const members = state.members.filter((m) => m.companyId === company.id);
  const projects = state.projects.filter((p) => p.companyId === company.id);
  const clients = state.clients.filter((c) => c.companyId === company.id);
  const roles: CustomRole[] = state.customRoles.filter((r) => r.companyId === company.id);
  const commentsCount = state.comments.filter((cm) => projects.some((p) => p.id === cm.projectId)).length;
  const sessionsCount = state.sessions.filter((s) => projects.some((p) => p.id === s.projectId)).length;
  const suspended = company.status === 'suspended';

  const stats = [
    { label: t('members_count'), value: `${members.filter((m) => m.status === 'active').length}/${members.length}` },
    { label: t('projects_count'), value: String(projects.length) },
    { label: lang === 'ar' ? 'ملاحظات' : 'Comments', value: String(commentsCount) },
    { label: t('nav_sessions'), value: String(sessionsCount) }
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center gap-2 pb-3 text-xs text-muted">
          <Link to="/app/admin/companies" className="transition-colors hover:text-accent">{t('admin_companies')}</Link>
          <span className="text-muted/40">/</span>
          <span className="text-ink/80">{company.name}</span>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-6">
          <LogoChip name={company.name} logo={company.logoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-black lg:text-2xl">{company.name}</h1>
            <p className="mt-0.5 text-xs text-muted" dir="ltr">{company.tagline || `Since ${company.createdAt}`}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${suspended ? 'border-red-400/30 bg-red-400/10 text-red-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'}`}>
            {suspended ? t('m_status_suspended') : t('m_status_active')}
          </span>
          <button
            onClick={() => actions.setCompanyStatus(company.id, suspended ? 'active' : 'suspended', user.id)}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
              suspended ? 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10' : 'border-orange-400/40 text-orange-300 hover:bg-orange-400/10'
            }`}
          >
            {suspended ? `▶ ${t('comp_activate')}` : `⏸ ${t('comp_suspend')}`}
          </button>
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-surface p-4 text-center">
              <p className="font-display text-2xl font-black text-accent">{s.value}</p>
              <p className="mt-1 text-[10px] tracking-wider text-muted uppercase">{s.label}</p>
            </div>
          ))}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
            <p className="font-display text-2xl font-black uppercase text-accent">{t(`plan_${company.plan}`)}</p>
            <p className="mt-1 text-[10px] tracking-wider text-muted uppercase">
              {company.planRenewsAt ? `${t('comp_renews')} ${company.planRenewsAt}` : t('comp_plan')}
            </p>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-5 xl:grid-cols-2">
        <FadeIn delay={0.1}>
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-display mb-4 flex items-center gap-2 text-xs font-bold tracking-widest text-muted uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {t('admin_members')} ({members.length})
            </h3>
            <div className="space-y-1.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-line/60 px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dim text-[9px] font-bold text-bg">
                    {m.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">
                      {m.name}
                      {m.status === 'suspended' && <span className="ms-2 rounded border border-red-400/30 px-1 text-[8px] font-bold uppercase text-red-300">{t('m_status_suspended')}</span>}
                    </p>
                    <p className="truncate text-[10px] text-muted" dir="ltr">{m.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[9px] font-semibold text-muted">
                    {m.customRoleId ? roles.find((r) => r.id === m.customRoleId)?.name ?? '—' : t(ROLE_KEY[m.roleId] as never)}
                  </span>
                </div>
              ))}
              {members.length === 0 && <p className="py-6 text-center text-xs text-muted">—</p>}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className="space-y-5">
            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="font-display mb-4 flex items-center gap-2 text-xs font-bold tracking-widest text-muted uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t('nav_projects')} ({projects.length})
              </h3>
              <div className="space-y-1.5">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/app/projects/${p.id}`}
                    className="flex items-center gap-3 rounded-lg border border-line/60 px-3 py-2 transition-colors hover:border-accent/50"
                  >
                    <LogoChip name={p.client} logo={clientLogoSrc(clients.find((c) => c.id === p.clientId))} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">{p.name}</span>
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent">{p.currentVersion}</span>
                  </Link>
                ))}
                {projects.length === 0 && <p className="py-6 text-center text-xs text-muted">—</p>}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="font-display mb-4 flex items-center gap-2 text-xs font-bold tracking-widest text-muted uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {lang === 'ar' ? 'المسميات المخصصة' : 'Custom roles'} ({roles.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span key={r.id} className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">
                    {r.name} · {r.perms.length}/{ALL_PERMS.length}
                  </span>
                ))}
                {roles.length === 0 && <p className="text-xs text-muted">{lang === 'ar' ? 'مفيش مسميات مخصصة' : 'No custom roles yet'}</p>}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-5">
              <h3 className="font-display mb-4 flex items-center gap-2 text-xs font-bold tracking-widest text-muted uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t('prj_filter_client')} ({clients.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {clients.map((cl) => (
                  <span key={cl.id} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[10px] text-muted">
                    <img src={clientLogoSrc(cl)} alt="" className="h-3.5 w-3.5 rounded-sm" />{cl.name}
                  </span>
                ))}
                {clients.length === 0 && <p className="text-xs text-muted">—</p>}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
