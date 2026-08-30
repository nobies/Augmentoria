import { useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { useEscape } from '../../lib/useEscape';
import { useAuth } from '../../context/AuthContext';
import { actions, clientLogoSrc, projectInUserScope, projectMemberships, useAppState, STATUS_LABEL, visibleClients } from '../../lib/store';
import type { ProjectAccessPolicy, ProjectMemberRole, ProjectStatus, ReviewSession } from '../../lib/store';
import { ROLE_KEY } from '../../lib/rbac';
import { FadeIn, LogoChip } from '../../components/ui/bits';
import { useProjectAssets, formatSize, detectAssetCategory } from '../../lib/assets';
import type { AssetCategory } from '../../lib/idb';
import { toast } from '../../lib/toast';
import { mediaStorage } from '../../lib/mediaStorage';
import { deleteCommentThumbnails } from '../../lib/commentThumbnail';
import { StatusBadge } from './DashboardPage';
import UploadVersionModal from '../../components/UploadVersionModal';

const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-orange-400 to-red-500',
  'from-fuchsia-400 to-purple-600',
  'from-accent to-accent-dim'
];

function removeAssetWithUndo(
  id: string,
  remove: (id: string) => Promise<import('../../lib/idb').AssetRecord | null>,
  restore: (record: import('../../lib/idb').AssetRecord) => void,
  labels: { deleted: string; undo: string; restored: string }
) {
  void (async () => {
    const record = await remove(id);
    if (!record) return;
    toast({
      message: `${labels.deleted} — ${record.name}`,
      actionLabel: labels.undo,
      onAction: () => {
        void restore(record);
        toast({ message: labels.restored, tone: 'success' });
      }
    });
  })();
}

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
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionNote, setSessionNote] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<ReviewSession | null>(null);

  if (!project || !projectInUserScope(state, user, project)) {
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
  const membershipMap = new Map(projectMemberships(state, project.id).map((membership) => [membership.userId, membership]));
  const activeSession = state.sessions.find((session) => session.projectId === project.id && !session.endedAt);

  const startReviewSession = (version = project.currentVersion, title = sessionTitle, note = sessionNote) => {
    actions.startSession(project.id, version, user.id, title, note);
    setSessionTitle('');
    setSessionNote('');
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
          {client && can('clients.manage') && (
            <>
              <Link to={`/app/clients/${client.id}`} className="transition-colors hover:text-accent">
                {client.name}
              </Link>
              <span className="text-muted/40">/</span>
            </>
          )}
          {client && !can('clients.manage') && (
            <>
              <span>{client.name}</span>
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
              {client && can('clients.manage') ? (
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

            <div className="flex flex-wrap items-center gap-2">
              {latest && can('reports.export') && (
                <Link
                  to={`/app/reports/${project.id}/${latest.v}`}
                  className="rounded-full border border-white/30 bg-black/40 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
                >
                  📄 {t('page_reports')}
                </Link>
              )}
              {can('versions.upload') && (
                <Link
                  to={`/studio/editor/${project.id}/${project.currentVersion}`}
                  className="rounded-full border border-white/30 bg-black/40 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
                >
                  ✂ {lang === 'ar' ? 'المونتاج' : 'Video editor'}
                </Link>
              )}
              {can('projects.edit') && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeSession) {
                        navigate(`/studio/review/${project.id}/${activeSession.version}`);
                      } else {
                        setTab('sessions');
                        // scroll to top of sessions section
                        setTimeout(() => document.querySelector('.session-start-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                      }
                    }}
                    className="rounded-full border border-emerald-400/50 bg-emerald-400/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 backdrop-blur-sm transition-colors hover:bg-emerald-400/30"
                  >
                    {activeSession ? `● ${lang === 'ar' ? 'ادخل الجلسة' : 'Join live session'}` : `● ${lang === 'ar' ? 'ابدأ جلسة جديدة' : 'New review session'}`}
                  </button>
                  <button
                    onClick={() => actions.setProjectArchived(project.id, !project.archived, user.id)}
                    className={`rounded-full border bg-black/40 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors ${
                      project.archived
                        ? 'border-emerald-400/50 text-emerald-300 hover:bg-emerald-400/20'
                        : 'border-white/30 text-white/80 hover:border-orange-300 hover:text-orange-300'
                    }`}
                  >
                    {project.archived ? `↩ ${t('prj_restore')}` : `📦 ${t('prj_archive')}`}
                  </button>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="rounded-full border border-white/30 bg-black/40 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-accent hover:text-accent"
                  >
                    ✎ {t('prj_edit_btn')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {project.milestones && project.milestones.length > 0 && (
        <FadeIn delay={0.08}>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display flex items-center gap-2 text-xs font-bold tracking-widest text-muted uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {t('prj_milestones')}
              </h3>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-accent">
                {project.milestones.filter((m) => m.done).length}/{project.milestones.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {project.milestones.map((m, i) => (
                <button
                  key={m.key}
                  type="button"
                  disabled={!can('projects.edit')}
                  onClick={() => actions.toggleMilestone(project.id, m.key, user.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    m.done
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                      : 'border-line text-muted hover:border-accent hover:text-accent disabled:hover:border-line disabled:hover:text-muted'
                  } ${!can('projects.edit') ? 'cursor-default' : ''}`}
                  title={can('projects.edit') ? undefined : t('prj_milestones')}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[8px] ${m.done ? 'border-emerald-400/60' : 'border-line'}`}>
                    {m.done ? '✓' : i + 1}
                  </span>
                  {t(`ms_${m.key}` as never)}
                </button>
              ))}
              {project.templateId && (
                <span className="ms-auto rounded-full bg-bg px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-muted/60 uppercase">
                  {t(('tpl_' + project.templateId) as never)}
                </span>
              )}
            </div>
          </div>
        </FadeIn>
      )}

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

        <div className="flex items-center gap-2 pb-1">
          {(tab === 'overview' || tab === 'versions') && can('versions.upload') && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setUploadVersionOpen(true)}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-bold text-bg transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
            >
              ↑ {t('prj_upload_version')}
            </motion.button>
          )}
          {tab === 'sessions' && can('projects.edit') && (
            <button
              type="button"
              onClick={() => (activeSession ? navigate(`/studio/review/${project.id}/${activeSession.version}`) : startReviewSession())}
              className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-400/20"
            >
              {activeSession ? `● ${lang === 'ar' ? 'ادخل الجلسة المباشرة' : 'Join live session'}` : `● ${lang === 'ar' ? 'ابدأ جلسة سريعة' : 'Quick live session'}`}
            </button>
          )}
          {tab === 'team' && can('team.manage') && (
            <button
              onClick={() => setAddMemberOpen(true)}
              className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-dim"
            >
              + {t('prj_add_member')}
            </button>
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
        <div className="space-y-4">
          {can('projects.edit') && (
            <div className="session-start-form rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-5">
              <div>
                <p className="text-sm font-bold text-ink">{lang === 'ar' ? 'بدء جلسة Review مباشرة' : 'Start a live review session'}</p>
                <p className="mt-1 text-xs text-muted">
                  {lang === 'ar' ? 'حدد عنوان الجلسة والهدف منها، والنسخة المطلوبة، وادخل لمراجعة المحتوى في الوقت الفعلي مع الفريق والعميل.' : 'Set session title, purpose and version to review in real-time with team and client.'}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-1 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('ses_title_label')}</label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder={t('ses_title_ph')}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('ses_note_label')}</label>
                  <input
                    type="text"
                    value={sessionNote}
                    onChange={(e) => setSessionNote(e.target.value)}
                    placeholder={t('ses_note_ph')}
                    className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>
                <div className="flex items-end gap-2 md:col-span-3">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('prj_versions')}</label>
                    <select
                      value={sessionVersion ?? project.currentVersion}
                      onChange={(event) => setSessionVersion(event.target.value)}
                      className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 font-mono text-xs outline-none focus:border-accent"
                    >
                      {project.versions.map((row) => <option key={row.v} value={row.v}>{row.v}</option>)}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => startReviewSession(sessionVersion ?? project.currentVersion, sessionTitle, sessionNote)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-bg hover:bg-emerald-300"
                  >
                    ● {lang === 'ar' ? 'ابدأ الآن' : 'Start now'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {state.sessions.filter((s) => s.projectId === project.id).length === 0 ? (
            <p className="rounded-xl border border-dashed border-line py-12 text-center text-xs text-muted">
              {lang === 'ar' ? 'مفيش جلسات مسجلة بعد. حدد تفاصيل الجلسة واضغط «ابدأ الآن».' : 'No sessions recorded yet. Fill session details and press “Start now”.'}
            </p>
          ) : (
            <div className="space-y-3">
              {state.sessions
                .filter((s) => s.projectId === project.id)
                .map((s, i) => {
                  const host = memberMap.get(s.hostId);
                  const comments = state.comments.filter((c) => c.projectId === s.projectId && c.version === s.version && c.createdAt >= s.startedAt && (!s.endedAt || c.createdAt <= s.endedAt));
                  const resolved = comments.filter((c) => c.resolved).length;
                  const displayTitle = s.title || `${t('nav_sessions')} · ${s.version}`;
                  return (
                    <FadeIn key={s.id} delay={i * 0.05}>
                      <div className="rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:border-accent/40">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.endedAt ? 'bg-line text-muted' : 'bg-red-400/15 text-red-300'}`}>
                              {s.endedAt ? '🎬' : <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" />}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-ink">{displayTitle}</h4>
                                <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-black text-accent">{s.version}</span>
                                {!s.endedAt ? (
                                  <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[9px] font-black text-red-300">LIVE</span>
                                ) : (
                                  <span className="rounded-full bg-line px-2 py-0.5 text-[9px] font-bold text-muted">{lang === 'ar' ? 'منتهية' : 'Ended'}</span>
                                )}
                              </div>
                              <p className="mt-1 font-mono text-[10px] text-muted" dir="ltr">
                                {s.startedAt}{s.endedAt ? ` → ${s.endedAt}` : ''}
                              </p>
                              {s.note && (
                                <p className="mt-2 text-xs leading-relaxed text-muted bg-bg/50 rounded-lg p-2.5 border border-line/60">
                                  💬 <span className="text-ink/90">{s.note}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-3 text-[11px] text-muted me-2">
                              <span><b className="text-ink/85">{comments.filter((comment) => !comment.resolved).length}</b> {t('prj_open_notes')}</span>
                              <span><b className="text-emerald-300">{resolved}</b> {t('rv_resolved')}</span>
                            </div>
                            {can('projects.edit') && (
                              <button
                                type="button"
                                onClick={() => setEditingSession(s)}
                                className="rounded-full border border-line px-3 py-1 text-[11px] font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
                                title={t('ses_edit_title')}
                              >
                                ✎ {lang === 'ar' ? 'تعديل' : 'Edit'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedSessionId(s.id)}
                              className="rounded-full border border-line px-3 py-1 text-[11px] font-bold text-muted transition-colors hover:border-accent hover:text-accent"
                            >
                              {s.endedAt ? `▶ ${lang === 'ar' ? 'عرض الأرشيف' : 'View archive'}` : `ℹ ${lang === 'ar' ? 'تفاصيل' : 'Details'}`}
                            </button>
                            {!s.endedAt && (
                              <Link
                                to={`/studio/review/${s.projectId}/${s.version}`}
                                className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3.5 py-1 text-[11px] font-bold text-emerald-300 transition-colors hover:bg-emerald-400/20"
                              >
                                ● {lang === 'ar' ? 'دخول الجلسة' : 'Join'}
                              </Link>
                            )}
                            {s.endedAt ? null : (
                              <button
                                onClick={() => actions.endSession(s.id, user.id)}
                                className="rounded-full border border-red-400/40 px-3 py-1 text-[11px] font-bold text-red-300 transition-colors hover:bg-red-400/10"
                              >
                                ⏹ {t('ses_end')}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/50 pt-2.5">
                          <span className="text-[10px] font-bold text-muted uppercase">{t('ses_attendees')}:</span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                            👑 {host?.name ?? 'Host'}
                          </span>
                          {s.participants.filter((pid2) => pid2 !== s.hostId).map((pid2) => {
                            const m = memberMap.get(pid2);
                            const name = m?.name ?? (pid2.startsWith('guest-') ? 'Guest' : 'Reviewer');
                            return (
                              <span key={pid2} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg px-2 py-0.5 text-[10px] text-muted">
                                {m?.avatar ? <img src={m.avatar} alt="" className="h-3.5 w-3.5 rounded-full object-cover" /> : null}
                                <span>{name}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="space-y-4">
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
                      {membershipMap.get(m.id) && (
                        <select
                          value={membershipMap.get(m.id)?.role}
                          disabled={!can('team.manage') || m.id === user.id}
                          aria-label={`${t('project_role')} — ${m.name}`}
                          onChange={(event) => actions.updateProjectMembership(project.id, m.id, event.target.value as ProjectMemberRole, user.id)}
                          className="mt-2 max-w-full rounded-md border border-line bg-bg px-2 py-1 text-[10px] text-muted outline-none focus:border-accent disabled:opacity-60"
                        >
                          {(['owner', 'manager', 'editor', 'reviewer', 'viewer'] as ProjectMemberRole[]).map((role) => (
                            <option key={role} value={role}>{t(`project_role_${role}` as never)}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {can('team.manage') && m.id !== user.id && (
                      <button
                        onClick={() => actions.removeTeamMember(project.id, m.id, user.id)}
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
        {selectedSessionId && (
          <SessionArchiveModal
            session={state.sessions.find((session) => session.id === selectedSessionId)!}
            onClose={() => setSelectedSessionId(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editingSession && (
          <EditSessionModal
            session={editingSession}
            onClose={() => setEditingSession(null)}
          />
        )}
      </AnimatePresence>
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

function EditSessionModal({ session, onClose }: { session: ReviewSession; onClose: () => void }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [title, setTitle] = useState(session.title ?? '');
  const [note, setNote] = useState(session.note ?? '');
  useEscape(onClose);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    actions.updateSession(session.id, {
      title: title.trim() || undefined,
      note: note.trim() || undefined
    }, user.id);
    onClose();
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[80] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <h2 className="font-display text-lg font-bold">✎ {t('ses_edit_title')}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-muted">{t('ses_title_label')}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('ses_title_ph')}
              className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-muted">{t('ses_note_label')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t('ses_note_ph')}
              className="w-full resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 rounded-full bg-accent py-2.5 text-xs font-bold text-bg hover:bg-accent-dim">
              {t('set_save')}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-xs text-muted hover:text-ink">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

function SessionArchiveModal({ session, onClose }: { session: ReviewSession; onClose: () => void }) {
  const { lang } = useLang();
  const state = useAppState();
  useEscape(onClose);
  const memberMap = new Map(state.members.map((member) => [member.id, member]));
  const comments = session.commentSnapshots?.length
    ? session.commentSnapshots
    : state.comments.filter((comment) =>
        session.commentIds?.length
          ? session.commentIds.includes(comment.id)
          : comment.projectId === session.projectId && comment.version === session.version && comment.createdAt >= session.startedAt && (!session.endedAt || comment.createdAt <= session.endedAt)
      );
  const eventLabel = (event: NonNullable<ReviewSession['events']>[number]) => {
    const actor = event.actorId ? memberMap.get(event.actorId)?.name ?? (event.actorId.startsWith('guest-') ? 'Guest' : 'Reviewer') : '';
    const time = event.time !== undefined ? ` · ${formatSessionTime(event.time)}` : '';
    const labels = lang === 'ar'
      ? { started: 'بدأ الجلسة', play: 'شغّل الفيديو', pause: 'أوقف الفيديو', seek: 'انتقل في التايم لاين', control_requested: 'طلب التحكم', control_changed: 'استلم التحكم', ended: 'أنهى الجلسة' }
      : { started: 'started the session', play: 'played the video', pause: 'paused the video', seek: 'moved the playhead', control_requested: 'requested control', control_changed: 'took control', ended: 'ended the session' };
    return `${actor} ${labels[event.type]}${time}`.trim();
  };

  const displayTitle = session.title || `Review · ${session.version}`;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-sm" />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-archive-title"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="fixed inset-x-3 top-1/2 z-[80] mx-auto flex max-h-[88vh] max-w-4xl -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-line p-5">
          <div>
            <p className="text-[10px] font-black tracking-widest text-accent uppercase">{session.endedAt ? (lang === 'ar' ? 'جلسة محفوظة' : 'Archived session') : 'Live session'}</p>
            <h2 id="session-archive-title" className="font-display mt-1 text-lg font-black">{displayTitle}</h2>
            <p className="mt-1 font-mono text-[10px] text-muted">{session.startedAt}{session.endedAt ? ` → ${session.endedAt}` : ''}</p>
            {session.note && <p className="mt-2 text-xs text-muted/90 italic">💬 {session.note}</p>}
          </div>
          <div className="ms-auto flex items-center gap-2">
            <Link to={`/studio/review/${session.projectId}/${session.version}`} className="rounded-full border border-accent/40 px-4 py-2 text-xs font-bold text-accent hover:bg-accent/10">
              ▶ {lang === 'ar' ? 'فتح النسخة' : 'Open version'}
            </Link>
            <button type="button" onClick={onClose} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'} className="rounded-full border border-line px-3 py-2 text-muted hover:text-ink">✕</button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black tracking-widest text-muted uppercase">{lang === 'ar' ? `التعليقات المحفوظة · ${comments.length}` : `Saved comments · ${comments.length}`}</h3>
            {comments.length === 0 ? <p className="rounded-xl border border-dashed border-line p-8 text-center text-xs text-muted">{lang === 'ar' ? 'لم تُسجل تعليقات داخل الجلسة.' : 'No comments were recorded during this session.'}</p> : comments.map((comment) => (
              <Link key={comment.id} to={`/studio/review/${comment.projectId}/${comment.version}?comment=${comment.id}`} className="grid grid-cols-[120px_1fr] gap-3 rounded-xl border border-line bg-bg p-3 transition-colors hover:border-accent/50">
                <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                  {(comment.thumb || comment.cleanThumb) ? <img src={comment.thumb ?? comment.cleanThumb} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-accent">{formatSessionTime(comment.tc)}{comment.rangeEnd !== undefined ? ` → ${formatSessionTime(comment.rangeEnd)}` : ''}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink">{comment.text}</p>
                  <p className="mt-2 text-[10px] text-muted">{memberMap.get(comment.authorId)?.name ?? 'Guest'} · {comment.resolved ? (lang === 'ar' ? 'محلول' : 'Resolved') : (lang === 'ar' ? 'مفتوح' : 'Open')}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-bg p-4">
              <p className="text-[10px] font-black tracking-widest text-muted uppercase">{lang === 'ar' ? 'المشاركون' : 'Participants'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {session.participants.map((id) => <span key={id} className="rounded-full border border-line px-3 py-1 text-[10px] text-muted">{memberMap.get(id)?.name ?? (id.startsWith('guest-') ? 'Guest' : 'Reviewer')}</span>)}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-bg p-4">
              <p className="text-[10px] font-black tracking-widest text-muted uppercase">{lang === 'ar' ? 'سجل ما حدث' : 'Session event log'}</p>
              <div className="mt-3 space-y-3">
                {(session.events ?? []).map((event) => (
                  <div key={event.id} className="flex gap-3 text-[10px]">
                    <span className="font-mono text-muted/60">{event.at.slice(11)}</span>
                    <span className="text-muted">{eventLabel(event)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </>
  );
}

function formatSessionTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(Math.floor(safe % 60)).padStart(2, '0')}:${String(Math.floor((safe % 1) * 25)).padStart(2, '0')}`;
}

function NewVersionModal({ projectId, prevVersion, openNotes, onClose }: { projectId: string; prevVersion: string; openNotes: number; onClose: () => void }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  useEscape(onClose);
  const navigate = useNavigate();
  const [carry, setCarry] = useState(openNotes > 0);
  const num = parseInt(prevVersion.replace(/\D/g, ''), 10) || 0;
  const nextV = `V${String(num + 1).padStart(2, '0')}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = actions.addVersion(projectId, { carryOpen: carry && openNotes > 0 }, user.id);
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

function EditModal({ project, onClose, onDeleted }: { project: { id: string; name: string; client: string; due: string; status: ProjectStatus; companyId?: string; accessPolicy?: ProjectAccessPolicy }; onClose: () => void; onDeleted: () => void }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  useEscape(onClose);
  const state = useAppState();
  const navigate = useNavigate();
  const clients = visibleClients(state, user).filter((client) => !project.companyId || !client.companyId || client.companyId === project.companyId);
  const [name, setName] = useState(project.name);
  const [clientId, setClientId] = useState(clients.find((c) => c.name === project.client)?.id ?? clients[0]?.id ?? '');
  const [due, setDue] = useState(project.due === '—' ? '' : project.due);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [accessPolicy, setAccessPolicy] = useState<ProjectAccessPolicy>(project.accessPolicy ?? 'company');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const rec = state.clients.find((c) => c.id === clientId);
    actions.updateProject(project.id, {
      name: name.trim(),
      client: rec?.name ?? project.client,
      clientId: rec?.id,
      due: due || '—',
      status,
      accessPolicy
    }, user.id);
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
          <label className="block space-y-1.5 text-xs text-muted"><span>{t('project_name')}</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('project_name')} className={cls} /></label>
          <label className="block space-y-1.5 text-xs text-muted"><span>{t('nav_clients')}</span><select value={clientId} onChange={(e) => setClientId(e.target.value)} className={cls} aria-label={t('nav_clients')}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select></label>
          <label className="block space-y-1.5 text-xs text-muted"><span>{t('project_access_policy')}</span><select value={accessPolicy} onChange={(event) => setAccessPolicy(event.target.value as ProjectAccessPolicy)} className={cls} aria-label={t('project_access_policy')}>
            <option value="assigned">{t('project_access_assigned')}</option>
            <option value="company">{t('project_access_company')}</option>
          </select></label>
          <label className="block space-y-1.5 text-xs text-muted"><span>{t('prj_due')}</span><input type="date" value={due} onChange={(e) => setDue(e.target.value)} dir="ltr" className={cls} aria-label={t('prj_due')} /></label>
          <label className="block space-y-1.5 text-xs text-muted"><span>{t('prj_status')}</span><select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={cls} aria-label={t('prj_status')}>
            {(['editing', 'review', 'changes', 'approved'] as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {t(STATUS_LABEL[s] as never)}
              </option>
            ))}
          </select></label>
          <button type="submit" className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim">
            {t('set_save')}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (confirm(t('project_delete_confirm'))) {
                const commentIds = state.comments.filter((comment) => comment.projectId === project.id).map((comment) => comment.id);
                try {
                  await Promise.all([
                    mediaStorage.deleteProjectMedia(project.id),
                    deleteCommentThumbnails(commentIds)
                  ]);
                  if (actions.deleteProject(project.id, user.id)) {
                    onDeleted();
                    navigate('/app/projects');
                  }
                } catch {
                  toast({
                    tone: 'danger',
                    message: lang === 'ar' ? 'تعذر حذف ملفات المشروع المحلية. حاول مرة أخرى.' : 'Could not delete local project media. Please try again.'
                  });
                }
              }
            }}
            className="w-full rounded-full border border-line py-2.5 text-xs text-muted transition-colors hover:border-red-400 hover:text-red-400"
          >
            🗑 {t('project_delete')}
          </button>
        </form>
      </motion.div>
    </>
  );
}

function AddMemberModal({ projectId, existingIds, onClose }: { projectId: string; existingIds: string[]; onClose: () => void }) {
  const { t } = useLang();
  const { user } = useAuth();
  const state = useAppState();
  const [role, setRole] = useState<ProjectMemberRole>('editor');
  const project = state.projects.find((item) => item.id === projectId);
  const available = state.members.filter((m) => !existingIds.includes(m.id) && m.status === 'active' && (!project?.companyId || m.companyId === project.companyId));

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-title"
        className="fixed top-1/2 left-1/2 z-[70] max-h-[70vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <h2 id="add-member-title" className="font-display mb-4 text-lg font-bold">+ {t('prj_add_member')}</h2>
        {available.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">—</p>
        ) : (
          <div className="space-y-3">
            <label className="block space-y-1.5 text-xs text-muted">
              <span>{t('project_role')}</span>
              <select value={role} onChange={(event) => setRole(event.target.value as ProjectMemberRole)} className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent">
                {(['owner', 'manager', 'editor', 'reviewer', 'viewer'] as ProjectMemberRole[]).map((item) => (
                  <option key={item} value={item}>{t(`project_role_${item}` as never)}</option>
                ))}
              </select>
            </label>
            {available.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  actions.addTeamMember(projectId, m.id, role, user.id);
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
                {m.status === 'suspended' && (
                  <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    {t('m_status_suspended')}
                  </span>
                )}
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
  const { assets, add, remove, restore, updateAsset, assignToVersion } = useProjectAssets(projectId);
  const [dragOver, setDragOver] = useState(false);
  const [details, setDetails] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [catFilter, setCatFilter] = useState<'all' | AssetCategory>('all');
  const [targetVersion, setTargetVersion] = useState(currentVersion);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canUpload = can('versions.upload');
  const detailAsset = assets.find((a) => a.id === details) ?? null;

  const categoryLabels: Record<AssetCategory, { label: string; icon: string }> = {
    video: { label: t('ast_cat_video'), icon: '🎬' },
    image: { label: t('ast_cat_image'), icon: '🖼' },
    document: { label: t('ast_cat_document'), icon: '📄' },
    presentation: { label: t('ast_cat_presentation'), icon: '📊' },
    storyboard: { label: t('ast_cat_storyboard'), icon: '🎨' },
    script: { label: t('ast_cat_script'), icon: '📝' },
    brief: { label: t('ast_cat_brief'), icon: '📋' },
    audio: { label: t('ast_cat_audio'), icon: '🎵' },
    other: { label: t('ast_cat_other'), icon: '📦' }
  };

  const filteredAssets = catFilter === 'all' ? assets : assets.filter((a) => a.category === catFilter);

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
          <p className="text-sm font-bold">{lang === 'ar' ? 'أصول وملفات المشروع' : 'Project assets & documents'}</p>
          <p className="mt-1 text-xs text-muted">
            {lang === 'ar'
              ? 'ارفع ملفات الفيديو، الوثائق (PDF / Word)، العروض (PPT / Keynote)، الستوري بورد، الصوتيات والسكريبت.'
              : 'Upload videos, documents (PDF / Word), presentations (PPT / Keynote), storyboards, audio & scripts.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-accent px-4 py-2 text-xs font-black text-bg shadow-sm transition-transform hover:scale-105"
          >
            + {lang === 'ar' ? 'رفع أصل جديد' : 'Upload asset'}
          </button>
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
          <button type="button" onClick={() => navigate(`/studio/editor/${projectId}/${targetVersion}`)} className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted hover:border-accent hover:text-accent">
            ✂ {lang === 'ar' ? 'المونتاج' : 'Editor'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-3">
        <button
          onClick={() => setCatFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${catFilter === 'all' ? 'bg-accent text-bg' : 'border border-line text-muted hover:text-ink'}`}
        >
          {lang === 'ar' ? 'كل الملفات' : 'All Files'} ({assets.length})
        </button>
        {(['video', 'image', 'document', 'presentation', 'storyboard', 'script', 'audio', 'brief'] as AssetCategory[]).map((cat) => {
          const count = assets.filter((a) => a.category === cat).length;
          if (count === 0 && catFilter !== cat) return null;
          const info = categoryLabels[cat];
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${catFilter === cat ? 'bg-accent text-bg' : 'border border-line text-muted hover:text-ink'}`}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
              <span className="opacity-70">({count})</span>
            </button>
          );
        })}
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
          if (e.dataTransfer.files.length === 1) {
            setPendingFile(e.dataTransfer.files[0]);
          } else if (e.dataTransfer.files.length > 1) {
            void add(e.dataTransfer.files);
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver ? 'border-accent bg-accent/5' : 'border-line hover:border-muted'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length === 1) {
              setPendingFile(e.target.files[0]);
            } else if (e.target.files && e.target.files.length > 1) {
              void add(e.target.files);
            }
            e.target.value = '';
          }}
        />
        <svg className="mx-auto mb-3 text-muted" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0L7 9m5-5l5 5" />
          <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        <p className="text-sm font-semibold text-ink">
          {lang === 'ar' ? 'اسحب أي ملف هنا أو اضغط للاختيار' : 'Drop files here or click to browse'}
        </p>
        <p className="mt-1 text-xs text-muted">
          {lang === 'ar' ? 'فيديو، صور، PDF، وورد DOCX، عروض PPT/Keynote، ستوري بورد، سكريبت، صوتيات' : 'Videos, Images, PDF, Word, Presentations, Storyboards, Scripts, Audio'}
        </p>
      </div>

      {filteredAssets.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted">
          {lang === 'ar' ? 'مفيش أصول مطابقة للتصنيف ده.' : 'No assets matching this category.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {filteredAssets.map((a, i) => {
              const catInfo = categoryLabels[a.category] ?? categoryLabels.other;
              const displayTitle = a.title || a.name;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group flex flex-col justify-between overflow-hidden rounded-xl border bg-surface transition-all duration-200 hover:-translate-y-0.5 ${
                    compareIds.includes(a.id) ? 'border-accent ring-2 ring-accent/20' : 'border-line hover:border-accent/50'
                  }`}
                >
                  <div>
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
                      ) : a.isAudio ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950/60 to-purple-950/60 p-4 text-center">
                          <span className="text-3xl">🎵</span>
                          <span className="mt-1 font-mono text-[10px] text-purple-200">AUDIO TRACK</span>
                        </div>
                      ) : a.isPresentation ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-950/60 to-amber-950/60 p-4 text-center">
                          <span className="text-3xl">📊</span>
                          <span className="mt-1 font-mono text-[10px] text-amber-200 uppercase">PRESENTATION DECK</span>
                        </div>
                      ) : a.category === 'storyboard' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-teal-950/60 to-emerald-950/60 p-4 text-center">
                          <span className="text-3xl">🎨</span>
                          <span className="mt-1 font-mono text-[10px] text-emerald-200 uppercase">STORYBOARD / CONCEPT</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-center">
                          <span className="text-3xl">{a.isPdf ? '📕' : '📄'}</span>
                          <span className="mt-1 font-mono text-[10px] text-slate-300 uppercase">{a.isPdf ? 'PDF DOCUMENT' : 'DOCUMENT / BRIEF'}</span>
                        </div>
                      )}

                      <span className="absolute start-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[9px] font-bold text-white/90 backdrop-blur-sm">
                        <span>{catInfo.icon}</span>
                        <span>{catInfo.label}</span>
                      </span>

                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                        <a
                          href={a.url}
                          download={a.name}
                          title={t('ast_download')}
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
                            removeAssetWithUndo(a.id, remove, (rec) => void restore(rec), {
                              deleted: t('toast_asset_deleted'),
                              undo: t('toast_undo'),
                              restored: t('toast_restored')
                            });
                          }}
                          title={lang === 'ar' ? 'حذف الأصل' : 'Delete asset'}
                          className="rounded-full border border-white/30 p-2 text-white transition-colors hover:border-red-400 hover:text-red-400"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="truncate text-xs font-bold text-ink" title={displayTitle}>
                          {displayTitle}
                        </h4>
                        <span className="shrink-0 font-mono text-[10px] text-muted">{formatSize(a.size)}</span>
                      </div>
                      {a.title && a.title !== a.name && (
                        <p className="mt-0.5 truncate font-mono text-[10px] text-muted/70" title={a.name}>
                          {a.name}
                        </p>
                      )}
                      {a.note && (
                        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted bg-bg/60 rounded-md p-1.5 border border-line/60">
                          💬 {a.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 pt-0">
                    {a.isVideo ? (
                      <div className="grid gap-1.5 border-t border-line/50 pt-2.5">
                        <button
                          type="button"
                          onClick={async () => {
                            await assignToVersion(a.id, targetVersion);
                            setAssignedId(a.id);
                          }}
                          className="rounded-md border border-emerald-400/35 bg-emerald-400/5 px-2 py-1.5 text-[10px] font-bold text-emerald-300 hover:bg-emerald-400/15"
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
                    ) : (
                      <div className="flex items-center justify-between border-t border-line/50 pt-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setDetails(a.id)}
                          className="text-muted hover:text-accent font-medium"
                        >
                          ℹ {lang === 'ar' ? 'تفاصيل وملاحظات' : 'Details & notes'}
                        </button>
                        <a
                          href={a.url}
                          download={a.name}
                          className="font-semibold text-accent hover:underline"
                        >
                          ↓ {t('ast_download')}
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {pendingFile && (
          <UploadAssetModal
            file={pendingFile}
            onClose={() => setPendingFile(null)}
            onSave={(meta) => {
              void add(pendingFile, meta);
              setPendingFile(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailAsset && (
          <AssetDetailsModal
            asset={detailAsset}
            onClose={() => setDetails(null)}
            onUpdate={(patch) => void updateAsset(detailAsset.id, patch)}
            onDelete={() => {
              removeAssetWithUndo(detailAsset.id, remove, (rec) => void restore(rec), {
                deleted: t('toast_asset_deleted'),
                undo: t('toast_undo'),
                restored: t('toast_restored')
              });
              setDetails(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadAssetModal({
  file,
  onClose,
  onSave
}: {
  file: File;
  onClose: () => void;
  onSave: (meta: { title: string; category: AssetCategory; note: string }) => void;
}) {
  const { t, lang } = useLang();
  const defaultCategory = detectAssetCategory(file);
  const [category, setCategory] = useState<AssetCategory>(defaultCategory);
  const [title, setTitle] = useState(file.name.replace(/\.[^/.]+$/, ''));
  const [note, setNote] = useState('');
  useEscape(onClose);

  const categories: { key: AssetCategory; label: string; icon: string }[] = [
    { key: 'video', label: t('ast_cat_video'), icon: '🎬' },
    { key: 'image', label: t('ast_cat_image'), icon: '🖼' },
    { key: 'document', label: t('ast_cat_document'), icon: '📄' },
    { key: 'presentation', label: t('ast_cat_presentation'), icon: '📊' },
    { key: 'storyboard', label: t('ast_cat_storyboard'), icon: '🎨' },
    { key: 'script', label: t('ast_cat_script'), icon: '📝' },
    { key: 'brief', label: t('ast_cat_brief'), icon: '📋' },
    { key: 'audio', label: t('ast_cat_audio'), icon: '🎵' },
    { key: 'other', label: t('ast_cat_other'), icon: '📦' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title: title.trim() || file.name, category, note: note.trim() });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[80] max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📁</span>
            <div>
              <h2 className="font-display text-lg font-bold">{t('ast_upload_title')}</h2>
              <p className="font-mono text-[11px] text-muted">{file.name} · {formatSize(file.size)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-muted">{t('ast_category')}</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`flex items-center gap-2 rounded-xl border p-2.5 text-start text-xs font-semibold transition-all ${
                    category === c.key
                      ? 'border-accent bg-accent/15 text-accent shadow-sm'
                      : 'border-line bg-bg text-muted hover:border-line/80 hover:text-ink'
                  }`}
                >
                  <span className="text-base">{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-muted">{t('ast_title_label')}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('ast_title_ph')}
              className="w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-muted">{t('ast_note')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t('ast_comment_ph')}
              className="w-full resize-none rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 rounded-full bg-accent py-2.5 text-xs font-bold text-bg hover:bg-accent-dim">
              ↑ {lang === 'ar' ? 'حفظ ورفع الأصل' : 'Save & Upload Asset'}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-xs text-muted hover:text-ink">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}

function AssetDetailsModal({
  asset,
  onClose,
  onUpdate,
  onDelete
}: {
  asset: import('../../lib/assets').ProjectAsset;
  onClose: () => void;
  onUpdate: (patch: Partial<Pick<import('../../lib/idb').AssetRecord, 'title' | 'category' | 'note'>>) => void;
  onDelete: () => void;
}) {
  const { t, lang } = useLang();
  const [title, setTitle] = useState(asset.title ?? asset.name);
  const [category, setCategory] = useState<AssetCategory>(asset.category);
  const [note, setNote] = useState(asset.note ?? '');
  const [saved, setSaved] = useState(false);
  useEscape(onClose);

  const categories: { key: AssetCategory; label: string; icon: string }[] = [
    { key: 'video', label: t('ast_cat_video'), icon: '🎬' },
    { key: 'image', label: t('ast_cat_image'), icon: '🖼' },
    { key: 'document', label: t('ast_cat_document'), icon: '📄' },
    { key: 'presentation', label: t('ast_cat_presentation'), icon: '📊' },
    { key: 'storyboard', label: t('ast_cat_storyboard'), icon: '🎨' },
    { key: 'script', label: t('ast_cat_script'), icon: '📝' },
    { key: 'brief', label: t('ast_cat_brief'), icon: '📋' },
    { key: 'audio', label: t('ast_cat_audio'), icon: '🎵' },
    { key: 'other', label: t('ast_cat_other'), icon: '📦' }
  ];

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
          ) : asset.isAudio ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-950/80 to-purple-950/80">
              <span className="text-4xl mb-4">🎵</span>
              <audio src={asset.url} controls className="w-full max-w-md" />
            </div>
          ) : (
            <div className="hero-fallback absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl">{asset.isPdf ? '📕' : asset.isPresentation ? '📊' : asset.category === 'storyboard' ? '🎨' : '📄'}</span>
              <span className="mt-2 text-xs font-mono text-muted uppercase">{asset.name}</span>
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
                {asset.title || asset.name}
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
              {t('ast_download')}
            </a>
          </div>

          <div className="space-y-3 pt-2 border-t border-line/60">
            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-muted uppercase">{t('ast_title_label')}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3.5 py-2 text-xs outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-muted uppercase">{t('ast_category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full rounded-lg border border-line bg-bg px-3.5 py-2 text-xs outline-none focus:border-accent"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-muted uppercase">{t('ast_note')}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t('ast_comment_ph')}
                className="w-full resize-none rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  onUpdate({ title: title.trim() || undefined, category, note: note.trim() || undefined });
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
