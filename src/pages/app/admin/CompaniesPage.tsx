import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../../i18n';
import { actions, useAppState } from '../../../lib/store';
import type { Company, PlanType } from '../../../lib/store';
import { FadeIn, LogoChip, brandColor } from '../../../components/ui/bits';
import { toast } from '../../../lib/toast';
import { useAuth } from '../../../context/AuthContext';

const PLAN_BADGE: Record<PlanType, string> = {
  trial: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  monthly: 'border-accent/40 bg-accent/10 text-accent',
  yearly: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
};

export default function CompaniesPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const state = useAppState();
  const [editOpen, setEditOpen] = useState<Company | 'new' | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black">{t('admin_companies')}</h1>
          <p className="mt-1.5 text-xs text-muted">{state.companies.length} {lang === 'ar' ? 'استوديو' : 'studios'} · SaaS</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setEditOpen('new')}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-bg transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
        >
          + {t('btn_add_company')}
        </motion.button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {state.companies.map((c, i) => {
          const members = state.members.filter((m) => m.companyId === c.id);
          const activeMembers = members.filter((m) => m.status === 'active').length;
          const projects = state.projects.filter((p) => p.companyId === c.id);
          const suspended = c.status === 'suspended';
          const seatsPct = c.maxMembers ? Math.min(100, Math.round((members.length / c.maxMembers) * 100)) : 0;
          return (
            <FadeIn key={c.id} delay={i * 0.06}>
              <div className={`group flex h-full flex-col rounded-xl border bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 ${suspended ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3">
                  <LogoChip name={c.name} logo={c.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display truncate font-bold transition-colors group-hover:text-accent">{c.name}</h3>
                    <p className="font-mono text-[10px] text-muted/60" dir="ltr">{c.createdAt}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${suspended ? 'border-red-400/30 bg-red-400/10 text-red-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'}`}>
                    {suspended ? t('m_status_suspended') : t('m_status_active')}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${PLAN_BADGE[c.plan]}`}>{t(`plan_${c.plan}`)}</span>
                  {c.planRenewsAt && (
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] text-muted" dir="ltr">
                      ↻ {c.planRenewsAt}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-bg py-2 ring-1 ring-line">
                    <p className="font-display text-lg font-black text-accent">{members.length}{c.maxMembers ? `/${c.maxMembers}` : ''}</p>
                    <p className="text-[9px] tracking-wider text-muted uppercase">{t('comp_seats')}</p>
                  </div>
                  <div className="rounded-lg bg-bg py-2 ring-1 ring-line">
                    <p className="font-display text-lg font-black" style={{ color: brandColor(c.name) }}>{projects.length}</p>
                    <p className="text-[9px] tracking-wider text-muted uppercase">{t('projects_count')}</p>
                  </div>
                </div>

                {c.maxMembers && (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${seatsPct}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${seatsPct >= 100 ? 'bg-red-400' : 'bg-gradient-to-r from-accent-dim to-accent'}`}
                    />
                  </div>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                  <Link
                    to={`/app/admin/companies/${c.id}`}
                    className="rounded-full border border-accent/50 px-3.5 py-1.5 text-[11px] font-bold text-accent transition-colors hover:bg-accent/10"
                  >
                    {t('comp_open')} →
                  </Link>
                  <button onClick={() => setEditOpen(c)} className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent">
                    ✎
                  </button>
                  <button
                    onClick={() => actions.setCompanyStatus(c.id, suspended ? 'active' : 'suspended', user.id)}
                    className={`rounded-md border border-line px-2.5 py-1.5 text-[11px] transition-colors ${
                      suspended ? 'text-muted hover:border-emerald-400 hover:text-emerald-300' : 'text-muted hover:border-orange-300 hover:text-orange-300'
                    }`}
                  >
                    {suspended ? '▶' : '⏸'}
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(lang === 'ar' ? `مسح "${c.name}" وكل بياناته (أعضاء، مشاريع، عملاء)?` : `Delete "${c.name}" and ALL its data (members, projects, clients)?`)) return;
                      if (actions.removeCompany(c.id, user.id)) toast({ message: `${c.name} — deleted`, tone: 'danger', actionLabel: t('toast_dismiss') });
                      else toast({ message: lang === 'ar' ? 'مش ممكن تمسح آخر استوديو' : "Can't delete the last studio", tone: 'danger' });
                    }}
                    className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-red-400 hover:text-red-400"
                  >
                    🗑
                  </button>
                  <span className="ms-auto text-[10px] text-muted/60">{activeMembers}/{members.length} 👤</span>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>

      <AnimatePresence>{editOpen && <CompanyModal actorId={user.id} company={editOpen === 'new' ? null : editOpen} onClose={() => setEditOpen(null)} />}</AnimatePresence>
    </div>
  );
}

function CompanyModal({ actorId, company, onClose }: { actorId: string; company: Company | null; onClose: () => void }) {
  const { t, lang } = useLang();
  const [name, setName] = useState(company?.name ?? '');
  const [plan, setPlan] = useState<PlanType>(company?.plan ?? 'trial');
  const [renews, setRenews] = useState(company?.planRenewsAt ?? '');
  const [maxMembers, setMaxMembers] = useState(company?.maxMembers?.toString() ?? '');
  const [tagline, setTagline] = useState(company?.tagline ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company && !name.trim()) return;
    const patch = {
      ...(name.trim() ? { name: name.trim() } : {}),
      plan,
      planStartedAt: company?.planStartedAt ?? new Date().toISOString().slice(0, 10),
      planRenewsAt: renews || undefined,
      maxMembers: maxMembers ? Number(maxMembers) : undefined,
      tagline: tagline || undefined
    };
    if (company) actions.updateCompanyInfo(company.id, patch, actorId);
    else actions.addCompany(name.trim(), patch, actorId);
    onClose();
  };

  const cls = 'w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent';

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-2xl border border-line bg-surface p-7 shadow-2xl"
      >
        <h2 className="font-display text-lg font-bold">{company ? `${t('comp_edit')} — ${company.name}` : t('btn_add_company')}</h2>
        {!company && <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('ph_company_name')} className={cls} />}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] tracking-wider text-muted uppercase">{t('comp_plan')}</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value as PlanType)} className={cls}>
              <option value="trial">{t('plan_trial')}</option>
              <option value="monthly">{t('plan_monthly')}</option>
              <option value="yearly">{t('plan_yearly')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] tracking-wider text-muted uppercase">{t('comp_renews')}</label>
            <input type="date" value={renews} onChange={(e) => setRenews(e.target.value)} dir="ltr" className={cls} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] tracking-wider text-muted uppercase">{t('comp_max_members')}</label>
          <input type="number" min={1} value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} placeholder={lang === 'ar' ? 'بدون حد' : 'unlimited'} className={cls} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] tracking-wider text-muted uppercase">{t('set_tagline')}</label>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={cls} />
        </div>
        <button type="submit" disabled={!company && !name.trim()} className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40">
          {t('set_save')}
        </button>
      </motion.form>
    </>
  );
}
