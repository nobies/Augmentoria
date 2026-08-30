import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useAppState, STATUS_CLASS, STATUS_LABEL, visibleProjects } from '../../lib/store';
import type { ProjectStatus } from '../../lib/store';
import { CountUp, FadeIn, LogoChip, brandColor } from '../../components/ui/bits';
import { clientLogoUrl } from '../../lib/clients';
import NewProjectModal from '../../components/NewProjectModal';
import { useNavigate } from 'react-router-dom';

const STAT_ICONS: Record<string, string> = {
  dash_stat_active: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  dash_stat_wait_review: 'M15 12H3m12 0l-4-4m4 4l-4 4M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  dash_stat_wait_client: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  dash_stat_approved: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
};

const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-orange-400 to-red-500',
  'from-fuchsia-400 to-purple-600',
  'from-accent to-accent-dim'
];

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useLang();
  const pulse = status === 'review' || status === 'changes';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[status]}`}>
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {t(STATUS_LABEL[status] as never)}
    </span>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLang();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const state = useAppState();
  const [newOpen, setNewOpen] = useState(false);
  const memberMap = new Map(state.members.map((m) => [m.id, m]));

  const projects = visibleProjects(state, user);
  const active = projects.filter((p) => p.status !== 'approved' && !p.archived);
  const waitReview = projects.filter((p) => (p.status === 'review' || p.status === 'changes') && !p.archived);
  const waitClient = projects.filter((p) => p.status === 'review' && !p.archived);
  const approved = projects.filter((p) => p.status === 'approved');

  const stats = [
    { label: 'dash_stat_active', value: active.length },
    { label: 'dash_stat_wait_review', value: waitReview.length },
    { label: 'dash_stat_wait_client', value: waitClient.length },
    { label: 'dash_stat_approved', value: approved.length }
  ];

  const attention = [...waitReview].sort((a, b) => (b.versions[0]?.open ?? 0) - (a.versions[0]?.open ?? 0));

  const activity = projects.filter((p) => !p.archived).flatMap((p) => p.activity.map((a) => ({ ...a, project: p.name })));

  return (
    <div className="space-y-8">
      <FadeIn className="relative">
        <div className="pointer-events-none absolute -top-16 start-0 h-48 w-96 rounded-full bg-accent/6 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-black lg:text-3xl">
              {t('dash_greeting')}, <span className="text-accent">{user.name.split(' ')[0]}</span> 👋
            </h1>
            <p className="mt-2 text-sm text-muted">{t('dash_sub')}</p>
          </div>
          {can('projects.create') && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setNewOpen(true)}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-bg transition-shadow duration-300 hover:shadow-[0_0_28px_rgba(var(--glow-rgb),0.4)]"
            >
              + {t('dash_new_project')}
            </motion.button>
          )}
        </div>
      </FadeIn>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <FadeIn key={s.label} delay={i * 0.08}>
            <div className="group relative overflow-hidden rounded-xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-accent/5 blur-2xl transition-all duration-500 group-hover:bg-accent/10" />
              <div className="flex items-start justify-between">
                <p className="font-display text-3xl font-black text-accent">
                  <CountUp to={s.value} />
                </p>
                <span className="rounded-lg bg-bg p-2 text-muted transition-colors group-hover:text-accent">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={STAT_ICONS[s.label]} />
                  </svg>
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{t(s.label as never)}</p>
            </div>
          </FadeIn>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{t('dash_recent_projects')}</h2>
            <Link to="/app/projects" className="text-xs text-muted transition-colors hover:text-accent">
              {t('dash_view_all')} →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.slice(0, 4).map((p, i) => {
              const v = p.versions[0];
              const total = (v?.open ?? 0) + (v?.resolved ?? 0);
              const pct = total ? Math.round(((v?.resolved ?? 0) / total) * 100) : 100;
              return (
                <FadeIn key={p.id} delay={i * 0.07}>
                  <Link
                    to={`/app/projects/${p.id}`}
                    className="group relative block overflow-hidden rounded-xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start gap-3">
                      <LogoChip name={p.client} logo={p.clientLogo ?? clientLogoUrl(p.client)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-muted">{p.client}</p>
                        <h3 className="font-display truncate font-bold transition-colors group-hover:text-accent">{p.name}</h3>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-line">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-accent-dim to-accent"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                      <span>
                        <span className="font-mono">{p.currentVersion}</span> ·{' '}
                        {total ? (
                          <>
                            <span className="text-orange-300">{v?.open}</span> {t('prj_open_notes')}
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                      <div className="flex -space-x-2 rtl:space-x-reverse">
                        {p.memberIds.slice(0, 3).map((mid, mi) => {
                          const m = memberMap.get(mid);
                          if (!m) return null;
                          return m.avatar ? (
                            <img
                              key={mid}
                              src={m.avatar}
                              alt={m.name}
                              title={m.name}
                              className="h-6 w-6 rounded-full border-2 border-surface object-cover"
                            />
                          ) : (
                            <span
                              key={mid}
                              title={m.name}
                              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-gradient-to-br text-[9px] font-bold text-white ${
                                AVATAR_GRADIENTS[(mi + p.client.length) % AVATAR_GRADIENTS.length]
                              }`}
                            >
                              {m.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <FadeIn delay={0.1}>
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="font-display mb-4 flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
                <span className="text-orange-300">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {t('dash_needs_attention')}
              </h2>
              <ul className="space-y-2">
                {attention.map((p, i) => {
                  const open = p.versions[0]?.open ?? 0;
                  return (
                    <motion.li key={p.id} initial={{ opacity: 0, x: lang === 'ar' ? 14 : -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07 }}>
                      <Link to={`/app/projects/${p.id}`} className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition-all hover:border-line hover:bg-bg">
                        <LogoChip name={p.client} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.client} — {p.name}</p>
                          <p className="text-[11px] text-muted">
                            {open > 0 ? (
                              <span className="text-orange-300">● {open} {t('prj_open_notes')}</span>
                            ) : (
                              t(STATUS_LABEL[p.status] as never)
                            )}{' '}
                            · <span className="font-mono">{p.currentVersion}</span>
                          </p>
                        </div>
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.18}>
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="font-display mb-4 text-sm font-bold tracking-wide uppercase">{t('dash_activity')}</h2>
              <div className="relative space-y-5 ps-1">
                <span className="absolute inset-y-1 start-[3.5px] w-px bg-line" />
                {activity.slice(0, 7).map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.06 }}
                    className="relative flex gap-3 ps-5 text-xs"
                  >
                    <span
                      className="absolute start-0 top-1 h-2 w-2 rounded-full ring-4 ring-surface"
                      style={{ backgroundColor: brandColor(a.project) }}
                    />
                    <div className="min-w-0">
                      <p className="leading-relaxed">
                        <span className="font-medium">{a.project}</span> <span className="text-muted">{lang === 'ar' ? a.textAr : a.textEn}</span>
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted/50">{a.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>

      <AnimatePresence>{newOpen && <NewProjectModal creatorId={user.id} onClose={() => setNewOpen(false)} onCreated={(id) => navigate(`/app/projects/${id}`)} />}</AnimatePresence>
    </div>
  );
}
