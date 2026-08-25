import { useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { useEscape } from '../../lib/useEscape';
import { useAuth } from '../../context/AuthContext';
import { actions, useAppState, STATUS_LABEL, clientLogoSrc } from '../../lib/store';
import type { ProjectStatus } from '../../lib/store';
import { ROLE_KEY } from '../../lib/rbac';
import { FadeIn, LogoChip } from '../../components/ui/bits';
import { useProjectAssets, formatSize } from '../../lib/assets';
import { StatusBadge } from './DashboardPage';
import UploadVersionModal from '../../components/UploadVersionModal';
import { FREEFRAME_REVIEW_ENABLED, proReviewPath } from '../../lib/freeframe';

const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-orange-400 to-red-500',
  'from-fuchsia-400 to-purple-600',
  'from-accent to-accent-dim'
];

export default function ProjectDetailPage() {
  const { t, lang } = useLang();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const state = useAppState();
  const memberMap = new Map(state.members.map((m) => [m.id, m]));
  const project = state.projects.find((p) => p.id === id);
  const client = state.clients.find((c) => c.id === project?.clientId || c.name === project?.client);
  const [tab, setTab] = useState<'overview' | 'versions' | 'sessions' | 'team' | 'assets'>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newVersionOpen, setNewVersionOpen] = useState(false);
  const [uploadVersionOpen, setUploadVersionOpen] = useState(false);
  const [sessionVersion, setSessionVersion] = useState<string | null>(null);

  if (!project) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-4xl font-black text-muted/30">404</p>
        <Link to="/app/projects" className="mt-4 inline-block text-sm text-accent hover:underline">
          ← {t('nav_projects')}
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: 'overview' as const, label: t('prj_overview_tab') },
    { key: 'versions' as const, label: t('prj_versions') },
    { key: 'sessions' as const, label: t('nav_sessions') },
    ...(can('team.manage') ? [{ key: 'team' as const, label: t('prj_team') }] : []),
    ...(can('versions.upload') ? [{ key: 'assets' as const, label: t('prj_assets_tab') }] : [])
  ];

  const latest = project.versions[0];
  const team = project.memberIds.map((mid) => memberMap.get(mid)).filter(Boolean);
  const activeSession = state.sessions.find((session) => session.projectId === project.id && !session.endedAt);

  const startReviewSession = (version = project.currentVersion) => {
    actions.startSession(project.id, version, user.id);
    navigate(`/studio/review/${project.id}/${version}`);
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center gap-2 pb-3 text-xs text-muted">
          <Link to="/app/projects" className="transition-colors hover:text-accent">
            {t('nav_projects')}
          </Link>
          <span className="text-muted/40">/</span>
          {client && (
            <>
              <Link to={`/app/clients/${client.id}`} className="transition-colors hover:text-accent">
                {client.name}
              </Link>
              <span className="text-muted/40">/</span>
            </>
          )}
          <span className="text-ink/80">{project.name}</span>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="relative overflow-hidden rounded-2xl border border-line">
          {project.thumbnail ? (
            <img src={project.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="hero-fallback absolute inset-0" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />

          <div className="relative flex flex-wrap items-end gap-5 p-6 pt-28 lg:p-8 lg:pt-44">
            <LogoChip name={project.client} logo={project.clientLogo ?? clientLogoSrc(client)} size="lg" />
            <div className="min-w-0 flex-1">
              {client ? (
                <Link to={`/app/clients/${client.id}`} className="text-[11px] font-semibold tracking-[0.2em] text-white/70 uppercase transition-colors hover:text-accent">
                  {project.client} ↗
                </Link>
              ) : (
                <p className="text-[11px] tracking-[0.2em] text-white/70 uppercase">{project.client}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-black text-white drop-shadow-lg lg:text-4xl">{project.name}</h1>
                <StatusBadge status={project.status} />
                {project.archived && (
                  <span className="rounded border border-white/25 px-2 py-0.5 text-[10px] uppercase text-white/70">{lang === 'ar' ? 'مؤرشف' : 'archived'}</span>
                )}
              </div>
              {client?.description && <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/60">{client.description}</p>}
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border-b border-line">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${tab === tb.key ? 'text-accent' : 'text-muted hover:text-ink'}`}
            >
              {tb.label}
              {tab === tb.key && (
                <motion.span layoutId="tab-ink" className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" transition={{ type: 'spring', damping: 32, stiffness: 400 }} />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1">
          {can('projects.edit') && (
            <button
              type="button"
              onClick={() => (activeSession ? navigate(`/studio/review/${project.id}/${activeSession.version}`) : startReviewSession())}
              className="rounded-full border border-emerald-400/50 px-4 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-400/10"
            >
              {activeSession ? `● ${lang === 'ar' ? 'ادخل الجلسة' : 'Join live session'}` : `● ${lang === 'ar' ? 'ابدأ جلسة جديدة' : 'New review session'}`}
            </button>
          )}
          {can('versions.upload') && (
            <Link
              to={`/studio/editor/${project.id}/${project.currentVersion}`}
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              ✂ {lang === 'ar' ? 'مونتاج الفيديو' : 'Video editor'}
            </Link>
          )}
          {can('projects.edit') && (
            <>
              <button
                onClick={() => actions.setProjectArchived(project.id, !project.archived)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                  project.archived
                    ? 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10'
                    : 'border-line text-muted hover:border-orange-300 hover:text-orange-300'
                }`}
              >
                {project.archived ? `↩ ${t('prj_restore')}` : `📦 ${t('prj_archive')}`}
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
              >
                ✎ {t('prj_edit_btn')}
              </button>
            </>
          )}
          {can('versions.upload') && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setUploadVersionOpen(true)}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-bold text-bg transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
            >
              ↑ {t('prj_upload_version')}
            </motion.button>
          )}
          {latest && can('reports.export') && (
            <Link
              to={`/app/reports/${project.id}/${latest.v}`}
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              📄 {t('page_reports')}
            </Link>
          )}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t('prj_versions'), value: `${project.currentVersion} · ${project.versions.length}`, accent: false },
            { label: t('prj_open_notes'), value: String(latest?.open ?? 0), accent: (latest?.open ?? 0) > 0 },
            { label: t('prj_due'), value: project.due, accent: false },
            { label: t('prj_team'), value: String(team.length), accent: false }
          ].map((c, i) => (
            <FadeIn key={c.label} delay={i * 0.07}>
              <div className="group rounded-xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
                <p className="text-[11px] tracking-wider text-muted uppercase">{c.label}</p>
                <p className={`font-display mt-2.5 text-xl font-bold ${c.accent ? 'text-orange-300' : ''}`} dir={c.accent ? undefined : 'ltr'}>
                  {c.value}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      {tab === 'versions' && (
        <div className="space-y-4">
          {can('versions.upload') && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">
                {lang === 'ar' ? 'كل نسخة ليها فيديو مستقل ولينك ريفيو ولينك مقارنة.' : 'Each version has its own video, review link and compare link.'}
              </p>
              <button
                onClick={() => setNewVersionOpen(true)}
                className="rounded-full border border-dashed border-line px-5 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
              >
                + {t('ver_new')}
              </button>
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-line bg-bg">
          <table className="w-full text-sm">
            <thead className="bg-surface text-[11px] tracking-wider text-muted uppercase">
              <tr>
                <th className="px-5 py-3.5 text-start font-medium">Version</th>
                <th className="hidden px-5 py-3.5 text-start font-medium sm:table-cell">Date</th>
                <th className="px-5 py-3.5 text-start font-medium">Status</th>
                <th className="px-5 py-3.5 text-start font-medium">Open</th>
                <th className="hidden px-5 py-3.5 text-start font-medium sm:table-cell">Resolved</th>
                <th className="px-5 py-3.5 text-end font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {project.versions.map((v, i) => (
                <motion.tr
                  key={v.v}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="group transition-colors hover:bg-surface"
                >
                  <td className="px-5 py-3.5">
                    <span className="flex h-7 w-9 items-center justify-center rounded-md bg-accent/10 font-mono text-[11px] font-black text-accent">{v.v}</span>
                  </td>
                  <td className="hidden px-5 py-3.5 font-mono text-xs text-muted sm:table-cell" dir="ltr">
                    {v.date}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={v.status} />
                  </td>
                  <td className={`px-5 py-3.5 tabular-nums ${v.open > 0 ? 'font-bold text-orange-300' : 'text-muted'}`}>
                    {v.open > 0 && <span className="me-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-300 align-middle" />}
                    {v.open}
                  </td>
                  <td className="hidden px-5 py-3.5 tabular-nums text-muted sm:table-cell">{v.resolved}</td>
                  <td className="px-5 py-3.5 text-end">
                    <div className="inline-flex items-center gap-1.5 opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      {v.v !== project.currentVersion && (
                        <Link
                          to={`/studio/compare/${project.id}/${v.v}/${project.currentVersion}`}
                          title={t('cmp_title')}
                          className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                        >
                          ⇄ Compare
                        </Link>
                      )}
                      <Link
                        to={`/studio/review/${project.id}/${v.v}`}
                        className="inline-flex items-center gap-1 rounded-full border border-accent/50 px-3.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
                      >
                        Review
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rtl:rotate-180">
                          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                      {FREEFRAME_REVIEW_ENABLED && (
                        <Link
                          to={proReviewPath(project.id, v.v)}
                          className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/45 bg-fuchsia-400/5 px-3.5 py-1.5 text-xs font-bold text-fuchsia-300 transition-colors hover:bg-fuchsia-400/10"
                        >
                          ◈ Pro Review
                        </Link>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="space-y-3">
          {can('projects.edit') && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4">
              <div>
                <p className="text-sm font-bold text-ink">{lang === 'ar' ? 'جلسة Review مباشرة' : 'Live review session'}</p>
                <p className="mt-1 text-xs text-muted">
                  {lang === 'ar' ? 'اختر النسخة وابدأ؛ هتدخل الـReview والجلسة هتظهر Live لكل المشاركين.' : 'Choose a version and start; the review opens live for every participant.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select value={sessionVersion ?? project.currentVersion} onChange={(event) => setSessionVersion(event.target.value)} className="rounded-full border border-line bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent">
                  {project.versions.map((row) => <option key={row.v} value={row.v}>{row.v}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => startReviewSession(sessionVersion ?? project.currentVersion)}
                  className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-bg hover:bg-emerald-300"
                >
                  ● {lang === 'ar' ? 'ابدأ الآن' : 'Start now'}
                </button>
              </div>
            </div>
          )}
          {state.sessions.filter((s) => s.projectId === project.id).length === 0 ? (
            <p className="rounded-xl border border-dashed border-line py-10 text-center text-xs text-muted">
              {lang === 'ar' ? 'مفيش جلسات بعد. اختار النسخة واضغط «ابدأ الآن».' : 'No sessions yet. Choose a version and press “Start now”.'}
            </p>
          ) : (
            state.sessions
              .filter((s) => s.projectId === project.id)
              .map((s, i) => {
                const host = memberMap.get(s.hostId);
                const comments = state.comments.filter((c) => c.projectId === s.projectId && c.version === s.version && c.createdAt >= s.startedAt && (!s.endedAt || c.createdAt <= s.endedAt));
                const resolved = comments.filter((c) => c.resolved).length;
                return (
                  <FadeIn key={s.id} delay={i * 0.05}>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-surface p-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.endedAt ? 'bg-line text-muted' : 'bg-red-400/15 text-red-300'}`}>
                          {s.endedAt ? '🎬' : <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">
                            {t('nav_sessions')} · <span className="font-mono text-accent">{s.version}</span>
                            {!s.endedAt && <span className="ms-2 rounded-full bg-red-400/15 px-2 py-0.5 text-[9px] font-bold text-red-300">LIVE</span>}
                          </p>
                          <p className="font-mono text-[10px] text-muted" dir="ltr">
                            {s.startedAt}{s.endedAt ? ` → ${s.endedAt}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.participants.map((pid2) => {
                          const m = memberMap.get(pid2);
                          if (!m) return null;
                          return m.avatar ? (
                            <img key={pid2} src={m.avatar} alt={m.name} title={m.name} className="h-7 w-7 rounded-full object-cover ring-2 ring-surface" />
                          ) : (
                            <span key={pid2} title={m.name} className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[9px] font-bold text-accent ring-2 ring-surface">
                              {m.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                            </span>
                          );
                        })}
                        <span className="text-[11px] text-muted">· {host?.name}</span>
                      </div>

                      <div className="ms-auto flex items-center gap-4 text-[11px] text-muted">
                        <span><b className="text-ink/85">{comments.length}</b> {t('prj_open_notes')}</span>
                        <span><b className="text-emerald-300">{resolved}</b> {t('rv_resolved')}</span>
                        {s.endedAt ? null : (
                          <button
                            onClick={() => actions.endSession(s.id)}
                            className="rounded-full border border-red-400/40 px-3 py-1 text-[10px] font-bold text-red-300 transition-colors hover:bg-red-400/10"
                          >
                            ⏹ {t('ses_end')}
                          </button>
                        )}
                      </div>
                    </div>
                  </FadeIn>
                );
              })
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="space-y-4">
          {can('team.manage') && (
            <button
              onClick={() => setAddMemberOpen(true)}
              className="rounded-full border border-dashed border-line px-5 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              + {t('prj_add_member')}
            </button>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m, i) =>
              m ? (
                <FadeIn key={m.id} delay={i * 0.06}>
                  <div className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-accent/30" />
                    ) : (
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-lg ${AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]}`}>
                        {m.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold transition-colors group-hover:text-accent">{m.name}</p>
                      <p className="text-[11px] text-muted">{t(ROLE_KEY[m.roleId] as never)}</p>
                    </div>
                    {can('team.manage') && m.id !== user.id && (
                      <button
                        onClick={() => actions.removeTeamMember(project.id, m.id)}
                        title={t('prj_remove_member')}
                        className="rounded-md border border-line p-1.5 text-[11px] text-muted opacity-0 transition-all group-hover:opacity-100 hover:border-red-400 hover:text-red-400"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </FadeIn>
              ) : null
            )}
          </div>
        </div>
      )}

      {tab === 'assets' && <AssetsTab projectId={project.id} versions={project.versions.map((row) => row.v)} currentVersion={project.currentVersion} />}

      <FadeIn delay={0.1}>
        <div className="rounded-xl border border-line bg-surface p-5">
          <h3 className="font-display mb-5 flex items-center gap-2 text-xs font-bold tracking-widest text-muted uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t('dash_activity')}
          </h3>
          <div className="relative space-y-5">
            <span className="absolute inset-y-1 start-[3.5px] w-px bg-line" />
            {project.activity.map((a, i) => (
              <div key={i} className="relative flex items-baseline gap-3 ps-6 text-xs">
                <span className="absolute start-0 top-1 h-2 w-2 rounded-full bg-accent ring-4 ring-surface" />
                <span className="shrink-0 font-mono text-[10px] text-muted/60">{a.time}</span>
                <span className="leading-relaxed text-muted">{lang === 'ar' ? a.textAr : a.textEn}</span>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {project.status === 'changes' && latest && latest.open > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-400/30 bg-orange-400/10 px-5 py-4 text-orange-300">
          <p className="text-sm font-medium">
            {t('st_changes')} — {latest.open} {t('prj_open_notes')} ({latest.v})
          </p>
          <Link to={`/studio/review/${project.id}/${latest.v}`} className="rounded-full border border-current px-4 py-1.5 text-xs font-bold transition-transform hover:scale-105">
            {t('page_reviews')} →
          </Link>
        </div>
      )}

      <AnimatePresence>{editOpen && <EditModal project={project} onClose={() => setEditOpen(false)} onDeleted={() => navigate('/app/projects')} />}</AnimatePresence>
      <AnimatePresence>{addMemberOpen && <AddMemberModal projectId={project.id} existingIds={project.memberIds} onClose={() => setAddMemberOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{newVersionOpen && <NewVersionModal projectId={project.id} prevVersion={project.currentVersion} openNotes={latest?.open ?? 0} onClose={() => setNewVersionOpen(false)} />}</AnimatePresence>
      <AnimatePresence>
        {uploadVersionOpen && (
          <UploadVersionModal
            projectId={project.id}
            prevVersion={project.currentVersion}
            openNotes={state.comments.filter((comment) => comment.projectId === project.id && comment.version === project.currentVersion && !comment.resolved).length}
            onClose={() => setUploadVersionOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewVersionModal({ projectId, prevVersion, openNotes, onClose }: { projectId: string; prevVersion: string; openNotes: number; onClose: () => void }) {
  const { t, lang } = useLang();
  useEscape(onClose);
  const navigate = useNavigate();
  const [carry, setCarry] = useState(openNotes > 0);
  const num = parseInt(prevVersion.replace(/\D/g, ''), 10) || 0;
  const nextV = `V${String(num + 1).padStart(2, '0')}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = actions.addVersion(projectId, { carryOpen: carry && openNotes > 0 });
    onClose();
    if (res?.version) navigate(`/studio/review/${projectId}/${res.version}`);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-7 shadow-2xl"
      >
        <h2 className="font-display mb-1 text-lg font-bold">+ {t('ver_new')}</h2>
        <p className="mb-5 text-xs text-muted">
          {lang === 'ar' ? 'هتتنشأ نسخة' : 'Creating'} <span className="font-mono font-bold text-accent">{nextV}</span>
          {lang === 'ar' ? ' بعد' : ' after'} <span className="font-mono">{prevVersion}</span>
        </p>
        <form onSubmit={submit} className="space-y-4">
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${carry ? 'border-accent/50 bg-accent/5' : 'border-line'}`}>
            <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} disabled={openNotes === 0} className="mt-0.5 accent-accent" />
            <span className="text-sm">
              <b>{lang === 'ar' ? 'نقل الملاحظات المفتوحة' : 'Carry forward open comments'}</b>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                {openNotes > 0
                  ? lang === 'ar'
                    ? `${openNotes} ملاحظة مفتوحة من ${prevVersion} هتتنقل للنسخة الجديدة تلقائيًا.`
                    : `${openNotes} open note(s) from ${prevVersion} will move to ${nextV}.`
                  : lang === 'ar'
                    ? 'مفيش ملاحظات مفتوحة في النسخة الحالية.'
                    : 'No open comments on the current version.'}
              </span>
            </span>
          </label>
          <button type="submit" className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim">
            {lang === 'ar' ? 'إنشاء + فتح الريفيو' : 'Create & open review'}
          </button>
        </form>
      </motion.div>
    </>
  );
}

function EditModal({ project, onClose, onDeleted }: { project: { id: string; name: string; client: string; due: string; status: ProjectStatus }; onClose: () => void; onDeleted: () => void }) {
  const { t } = useLang();
  useEscape(onClose);
  const state = useAppState();
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [clientId, setClientId] = useState(state.clients.find((c) => c.name === project.client)?.id ?? state.clients[0]?.id ?? '');
  const [due, setDue] = useState(project.due === '—' ? '' : project.due);
  const [status, setStatus] = useState<ProjectStatus>(project.status);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const rec = state.clients.find((c) => c.id === clientId);
    actions.updateProject(project.id, {
      name: name.trim(),
      client: rec?.name ?? project.client,
      clientId: rec?.id,
      due: due || '—',
      status
    });
    onClose();
  };

  const cls = 'w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent';

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-7 shadow-2xl"
      >
        <h2 className="font-display mb-5 text-lg font-bold">{t('prj_edit_btn')}</h2>
        <form onSubmit={submit} className="space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('m_name')} className={cls} />
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={cls}>
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} dir="ltr" className={cls} />
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={cls}>
            {(['editing', 'review', 'changes', 'approved'] as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {t(STATUS_LABEL[s] as never)}
              </option>
            ))}
          </select>
          <button type="submit" className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim">
            {t('set_save')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(t('m_remove_confirm'))) {
                actions.deleteProject(project.id);
                onDeleted();
                navigate('/app/projects');
              }
            }}
            className="w-full rounded-full border border-line py-2.5 text-xs text-muted transition-colors hover:border-red-400 hover:text-red-400"
          >
            🗑 {t('pb_reset')}
          </button>
        </form>
      </motion.div>
    </>
  );
}

function AddMemberModal({ projectId, existingIds, onClose }: { projectId: string; existingIds: string[]; onClose: () => void }) {  const { t } = useLang();
  const state = useAppState();
  const available = state.members.filter((m) => !existingIds.includes(m.id));

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[70] max-h-[70vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <h2 className="font-display mb-4 text-lg font-bold">+ {t('prj_add_member')}</h2>
        {available.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">—</p>
        ) : (
          <div className="space-y-2">
            {available.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  actions.addTeamMember(projectId, m.id);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-start transition-all hover:border-accent/60 hover:bg-bg"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dim text-xs font-bold text-bg">
                  {m.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{m.name}</span>
                  <span className="block truncate text-[11px] text-muted" dir="ltr">{m.email}</span>
                </span>
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                  {t(ROLE_KEY[m.roleId] as never)}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}

function AssetsTab({ projectId, versions, currentVersion }: { projectId: string; versions: string[]; currentVersion: string }) {
  const { t, lang } = useLang();
  const { can } = useAuth();
  const navigate = useNavigate();
  const { assets, add, remove, updateNote, assignToVersion } = useProjectAssets(projectId);
  const [dragOver, setDragOver] = useState(false);
  const [details, setDetails] = useState<string | null>(null);
  const [targetVersion, setTargetVersion] = useState(currentVersion);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canUpload = can('versions.upload');
  const detailAsset = assets.find((a) => a.id === details) ?? null;

  if (!canUpload) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        <p className="text-sm text-muted">{lang === 'ar' ? 'معندكش صلاحية إدارة الأصول.' : "You don't have asset management permission."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
        <div>
          <p className="text-sm font-bold">{lang === 'ar' ? 'استخدم الملفات اللي رفعتها' : 'Use your uploaded assets'}</p>
          <p className="mt-1 text-xs text-muted">{lang === 'ar' ? 'عيّن فيديو للنسخة والـReview، ضيفه للمونتاج، أو اختار فيديوهين للمقارنة.' : 'Assign a video to a review version, add it to the editor, or select two videos to compare.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={targetVersion} onChange={(event) => setTargetVersion(event.target.value)} className="rounded-full border border-line bg-bg px-3 py-2 font-mono text-xs outline-none focus:border-accent">
            {versions.map((version) => <option key={version} value={version}>{version}</option>)}
          </select>
          <button
            type="button"
            disabled={compareIds.length !== 2}
            onClick={() => navigate(`/studio/asset-compare/${projectId}/${compareIds[0]}/${compareIds[1]}`)}
            className="rounded-full border border-accent/40 px-4 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            ⇄ {lang === 'ar' ? `قارن (${compareIds.length}/2)` : `Compare (${compareIds.length}/2)`}
          </button>
          <button type="button" onClick={() => navigate(`/studio/editor/${projectId}/${targetVersion}`)} className="rounded-full bg-accent px-4 py-2 text-xs font-black text-bg">
            ✂ {lang === 'ar' ? 'افتح المونتاج' : 'Open editor'}
          </button>
        </div>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void add(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-accent bg-accent/5' : 'border-line hover:border-muted'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void add(e.target.files);
            e.target.value = '';
          }}
        />
        <svg className="mx-auto mb-3 text-muted" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0L7 9m5-5l5 5" />
          <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        <p className="text-sm text-muted">
          {lang === 'ar' ? 'اسحب ملفات هنا أو اضغط — صور، فيديو، صوت، مستندات' : 'Drop files here or click — images, video, audio, docs'}
        </p>
      </div>

      {assets.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted">{lang === 'ar' ? 'مفيش أصول لسه.' : 'No assets yet.'}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <AnimatePresence>
            {assets.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className={`group overflow-hidden rounded-xl border bg-surface text-start transition-all duration-300 hover:-translate-y-0.5 ${compareIds.includes(a.id) ? 'border-accent ring-2 ring-accent/20' : 'border-line hover:border-accent/50'}`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetails(a.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setDetails(a.id);
                  }}
                  className="relative block aspect-video w-full overflow-hidden bg-black/40 text-start"
                >
                  {a.isImage ? (
                    <img src={a.url} alt={a.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : a.isVideo ? (
                    <video src={a.url} className="absolute inset-0 h-full w-full object-cover" muted preload="metadata" />
                  ) : (
                    <div className="hero-fallback absolute inset-0 flex items-center justify-center">
                      <svg className="text-muted" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                        <path d="M14 2v6h6" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                    <a
                      href={a.url}
                      download={a.name}
                      title="Download"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-full border border-white/30 p-2 text-white transition-colors hover:border-accent hover:text-accent"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                      </svg>
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(a.id);
                      }}
                      title={t('prj_remove_member')}
                      className="rounded-full border border-white/30 p-2 text-white transition-colors hover:border-red-400 hover:text-red-400"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-medium" title={a.name}>
                    {a.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted">{formatSize(a.size)}</p>
                  {a.isVideo && (
                    <div className="mt-3 grid gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await assignToVersion(a.id, targetVersion);
                          setAssignedId(a.id);
                        }}
                        className="rounded-md border border-emerald-400/35 px-2 py-1.5 text-[10px] font-bold text-emerald-300 hover:bg-emerald-400/10"
                      >
                        {assignedId === a.id ? '✓ ' : '▶ '}{lang === 'ar' ? `استخدم في Review ${targetVersion}` : `Use in Review ${targetVersion}`}
                      </button>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button type="button" onClick={() => navigate(`/studio/editor/${projectId}/${targetVersion}?asset=${a.id}`)} className="rounded-md border border-line px-2 py-1.5 text-[10px] text-muted hover:border-accent hover:text-accent">✂ {lang === 'ar' ? 'مونتاج' : 'Edit'}</button>
                        <button
                          type="button"
                          onClick={() => setCompareIds((current) => current.includes(a.id) ? current.filter((id) => id !== a.id) : current.length < 2 ? [...current, a.id] : [current[1], a.id])}
                          className="rounded-md border border-line px-2 py-1.5 text-[10px] text-muted hover:border-accent hover:text-accent"
                        >
                          {compareIds.includes(a.id) ? '✓ ' : '+ '}{lang === 'ar' ? 'مقارنة' : 'Compare'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {detailAsset && (
          <AssetDetailsModal
            asset={detailAsset}
            onClose={() => setDetails(null)}
            onNote={(note) => void updateNote(detailAsset.id, note)}
            onDelete={() => {
              void remove(detailAsset.id);
              setDetails(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AssetDetailsModal({
  asset,
  onClose,
  onNote,
  onDelete
}: {
  asset: { url: string; name: string; type: string; size: number; note?: string; isImage: boolean; isVideo: boolean; createdAt: number };
  onClose: () => void;
  onNote: (note: string) => void;
  onDelete: () => void;
}) {
  const { t, lang } = useLang();
  const [note, setNote] = useState(asset.note ?? '');
  const [saved, setSaved] = useState(false);

  const meta: [string, string][] = [
    [t('ast_type'), asset.type],
    [t('ast_size'), formatSize(asset.size)],
    [t('ast_added'), new Date(asset.createdAt).toLocaleString()]
  ];

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[80] max-h-[88vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {asset.isImage ? (
            <img src={asset.url} alt={asset.name} className="absolute inset-0 h-full w-full object-contain" />
          ) : asset.isVideo ? (
            <video src={asset.url} controls className="absolute inset-0 h-full w-full" />
          ) : (
            <div className="hero-fallback absolute inset-0 flex items-center justify-center">
              <svg className="text-muted" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
          )}
          <button onClick={onClose} className="absolute end-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur transition-colors hover:text-accent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display truncate text-lg font-bold" title={asset.name}>
                {asset.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted">
                {meta.map(([k, val]) => (
                  <span key={k}>
                    <span className="text-muted/60 uppercase">{k}: </span>
                    <span className="font-mono text-ink/80" dir="ltr">
                      {val}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <a
              href={asset.url}
              download={asset.name}
              className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download
            </a>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] tracking-wider text-muted uppercase">{t('ast_note')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t('ast_note_ph')}
              className="w-full resize-none rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={() => {
                  onNote(note);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 1500);
                }}
                className="rounded-full bg-accent px-5 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-dim"
              >
                {saved ? t('set_saved_ok') : t('set_save')}
              </button>
              <button
                onClick={onDelete}
                className="rounded-full border border-line px-4 py-2 text-xs text-muted transition-colors hover:border-red-400 hover:text-red-400"
              >
                🗑 {lang === 'ar' ? 'حذف الأصل' : 'Delete asset'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
