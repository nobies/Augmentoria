import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { clientLogoSrc, projectInUserScope, useAppState, visibleClients, visibleProjects } from '../../lib/store';
import NotFoundPage from '../NotFoundPage';
import { exportCommentsCSV, exportCommentsXLSX, exportSessionJSON } from '../../lib/exportReview';
import { FadeIn, LogoChip } from '../../components/ui/bits';

export default function ReportsPage() {
  const { t, lang } = useLang();
  const { user, can } = useAuth();
  const state = useAppState();
  const projects = visibleProjects(state, user);
  const clients = visibleClients(state, user);
  const [pid, setPid] = useState(projects[0]?.id ?? '');

  const project = projects.find((p) => p.id === pid);
  const clientRec = clients.find((c) => c.id === project?.clientId || c.name === project?.client);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">{t('page_reports')}</h1>
        <p className="mt-1.5 text-xs text-muted">{lang === 'ar' ? 'ولّد تقرير مراجعة كامل جاهز للعميل.' : 'Generate a full client-ready review report.'}</p>
      </div>

      <div className="space-y-3 rounded-xl border border-line bg-surface p-5">
        <label className="block text-[11px] tracking-wider text-muted uppercase">{t('prj_filter_client')}</label>
        <select value={pid} onChange={(e) => setPid(e.target.value)} className="w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent">
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.client} — {p.name}
            </option>
          ))}
        </select>

        {project && (
          <div className="flex flex-wrap gap-2 pt-2">
            {project.versions.map((v) => (
              <Link
                key={v.v}
                to={`/app/reports/${project.id}/${v.v}`}
                className="rounded-lg border border-line px-4 py-2 text-xs transition-all hover:border-accent hover:bg-bg"
              >
                <span className="font-mono font-black text-accent">{v.v}</span>
                <span className="ms-2 text-muted">{v.date}</span>
              </Link>
            ))}
          </div>
        )}

        {!can('reports.export') && <p className="pt-2 text-[11px] text-orange-300">{lang === 'ar' ? 'ملاحظة: التصدير النهائي محتاج صلاحية reports.export.' : 'Note: final export needs reports.export permission.'}</p>}
      </div>

      {project && clientRec && (
        <FadeIn>
          <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-5">
            <LogoChip name={clientRec.name} logo={clientLogoSrc(clientRec)} />
            <div className="min-w-0">
              <p className="text-sm font-bold">{clientRec.name}</p>
              <p className="truncate text-[11px] text-muted">{lang === 'ar' ? 'اللوجو والبيانات هتظهر في رأس التقرير.' : 'Logo & details appear in the report header.'}</p>
            </div>
            {can('clients.manage') && (
              <Link to={`/app/clients/${clientRec.id}`} className="ms-auto text-xs text-accent hover:underline">
                {t('client_edit')} →
              </Link>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}

export function ReportView() {
  const { t, lang } = useLang();
  const { user, can } = useAuth();
  const { pid, v } = useParams();
  const state = useAppState();
  const project = state.projects.find((p) => p.id === pid);
  const clientRec = state.clients.find((c) => c.id === project?.clientId || c.name === project?.client);
  const company = project ? state.companies.find((item) => item.id === project.companyId) ?? state.companies[0] : undefined;
  const version = v ?? project?.currentVersion ?? 'V01';
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [includeReplies, setIncludeReplies] = useState(true);
  const [includeDrawings, setIncludeDrawings] = useState(true);
  const [includeThumbnails, setIncludeThumbnails] = useState(true);
  const [includeApproval, setIncludeApproval] = useState(true);
  const [includeSessions, setIncludeSessions] = useState(true);
  const [clientMode, setClientMode] = useState(false);

  if (!project || !projectInUserScope(state, user, project)) return <NotFoundPage />;

  const memberMap = new Map(state.members.map((m) => [m.id, m]));
  const allComments = state.comments
    .filter((c) => c.projectId === project.id && c.version === version)
    .sort((a, b) => a.tc - b.tc);
  const comments = allComments.filter(
    (comment) =>
      (statusFilter === 'all' || (statusFilter === 'resolved' ? comment.resolved : !comment.resolved)) &&
      (authorFilter === 'all' || comment.authorId === authorFilter)
  );
  const reportAuthors = [...new Set(allComments.map((comment) => comment.authorId))];
  const layersBy = (cid: string) => state.layers.filter((l) => l.commentId === cid);
  const resolved = comments.filter((c) => c.resolved).length;
  const decisions = state.approvals.filter((item) => item.projectId === project.id && item.version === version);
  const sessions = state.sessions.filter((session) => session.projectId === project.id && session.version === version);
  const versionRow = project.versions.find((item) => item.v === version);
  const fmtTc = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}:${String(Math.floor((t % 1) * 25)).padStart(2, '0')}`;
  const reportToggles = [
    { label: 'Replies', checked: includeReplies, setChecked: setIncludeReplies },
    { label: 'Drawings', checked: includeDrawings, setChecked: setIncludeDrawings },
    { label: 'Thumbnails', checked: includeThumbnails, setChecked: setIncludeThumbnails },
    { label: 'Approval', checked: includeApproval, setChecked: setIncludeApproval },
    { label: 'Sessions', checked: includeSessions, setChecked: setIncludeSessions }
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/app/reports" className="text-xs text-muted hover:text-accent">
          ← {t('page_reports')}
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => setClientMode((m) => !m)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
              clientMode ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:border-accent hover:text-accent'
            }`}
            title={t('rpt_client_note')}
          >
            🎯 {t('rpt_client_summary')}
          </button>
          <button onClick={() => window.print()} disabled={!can('reports.export')} className="rounded-full bg-accent px-5 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40">
            🖨 {lang === 'ar' ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
          </button>
          <button
            onClick={() =>
              exportCommentsCSV(
                comments.map((c) => ({ ...c, replies: includeReplies ? c.replies : [], layerCount: includeDrawings ? layersBy(c.id).length : 0 })),
                (id) => memberMap.get(id)?.name ?? 'Guest',
                `${project.client}-${project.name}-${version}`
              )
            }
            disabled={!can('reports.export')}
            className="rounded-full border border-line px-4 py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          >
            📊 CSV
          </button>
          <button
            onClick={() =>
              void exportCommentsXLSX(
                comments.map((c) => ({ ...c, replies: includeReplies ? c.replies : [], layerCount: includeDrawings ? layersBy(c.id).length : 0 })),
                (id) => memberMap.get(id)?.name ?? 'Guest',
                `${project.client}-${project.name}-${version}`
              )
            }
            disabled={!can('reports.export')}
            className="rounded-full border border-line px-4 py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          >
            📗 Excel
          </button>
          <button
            onClick={() =>
              exportSessionJSON(
                {
                  project: { id: project.id, name: project.name },
                  version,
                  exportedAt: new Date().toISOString(),
                  comments: comments.map((comment) => (includeReplies ? comment : { ...comment, replies: [] })),
                  layers: includeDrawings ? state.layers.filter((l) => comments.some((c) => c.id === l.commentId)) : [],
                  approvals: includeApproval ? decisions : [],
                  sessions: includeSessions ? sessions : []
                },
                `${project.client}-${project.name}-${version}`
              )
            }
            disabled={!can('reports.export')}
            className="rounded-full border border-line px-4 py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
          >
            🗂 JSON
          </button>
        </div>
      </div>

      {!clientMode && (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3 print:hidden">
        <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Report filters</span>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'open' | 'resolved')} className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs outline-none focus:border-accent">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)} className="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs outline-none focus:border-accent">
          <option value="all">All reviewers</option>
          {reportAuthors.map((authorId) => (
            <option key={authorId} value={authorId}>{memberMap.get(authorId)?.name ?? 'Guest'}</option>
          ))}
        </select>
        {reportToggles.map(({ label, checked, setChecked }) => (
          <label key={label} className="flex items-center gap-1.5 text-[10px] text-muted">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
              className="accent-accent"
            />
            {label}
          </label>
        ))}
        <span className="ms-auto text-[10px] text-muted">{comments.length} / {allComments.length} comments</span>
      </div>
      )}

      <div id="report-sheet" className="rounded-2xl border border-line bg-white p-8 text-black shadow-xl print:rounded-none print:border-0 print:shadow-none lg:p-12">
        <header className="flex items-start justify-between border-b-2 border-black/80 pb-6">
          <div className="flex items-center gap-4">
            <LogoChip name={clientRec?.name ?? project.client} logo={clientLogoSrc(clientRec)} size="lg" />
            <div>
              <p className="text-[10px] font-bold tracking-[0.25em] text-black/50 uppercase">{clientRec?.name}</p>
              <h1 className="font-display text-2xl font-black">{project.name}</h1>
              <p className="mt-0.5 text-xs text-black/60">{clientMode ? t('rpt_client_summary') : lang === 'ar' ? 'تقرير مراجعة' : 'Review Report'} — {version}</p>
              {clientMode && <p className="mt-0.5 text-[10px] text-black/45">{t('rpt_client_note')}</p>}
            </div>
          </div>
          <div className="text-end text-[10px] leading-relaxed text-black/50">
            {company?.logoUrl ? <img src={company.logoUrl} alt={company.name} className="mb-1 ms-auto h-10 object-contain" /> : <p className="font-display text-sm font-black tracking-widest">{company?.name}</p>}
            <p>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</p>
          </div>
        </header>

        {clientMode ? (
          <>
            <div className="grid grid-cols-3 gap-4 border-b border-black/10 py-5 text-center">
              <Stat label={t('rpt_feedback_list')} value={String(comments.length)} />
              <Stat label={lang === 'ar' ? 'قيد التنفيذ' : 'In progress'} value={String(comments.length - resolved)} />
              <Stat label={lang === 'ar' ? 'تم' : 'Done'} value={String(resolved)} />
            </div>

            {versionRow?.status === 'approved' && (
              <p className="mt-5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                ✓ {lang === 'ar' ? `تم اعتماد النسخة ${version} والمشروع جاهز للتسليم.` : `Version ${version} is approved and ready for delivery.`}
              </p>
            )}

            <div className="space-y-4 py-6">
              <p className="text-[10px] font-bold tracking-[0.25em] text-black/40 uppercase">{t('rpt_feedback_list')}</p>
              {comments.length === 0 && <p className="py-10 text-center text-sm text-black/40">—</p>}
              {comments.map((c, i) => (
                <div key={c.id} className="flex items-start gap-3 border-b border-black/10 pb-3">
                  <span className="font-display w-7 shrink-0 pt-0.5 text-[11px] font-black text-black/30">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${c.resolved ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                    {fmtTc(c.tc)}
                  </span>
                  <p className={`flex-1 text-sm leading-relaxed ${c.resolved ? 'text-black/45 line-through' : ''}`}>{c.text}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 border-b border-black/10 py-5 text-center">
              <Stat label="Comments" value={String(comments.length)} />
              <Stat label="Resolved" value={String(resolved)} />
              <Stat label="Open" value={String(comments.length - resolved)} />
              <Stat label="Versions" value={`${project.currentVersion} · ${project.versions.length}`} />
            </div>

            {includeApproval && <section className="border-b border-black/10 py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold tracking-[0.25em] text-black/40 uppercase">Approval status</p>
            <span
              className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase ${
                versionRow?.status === 'approved'
                  ? 'border-emerald-600/30 bg-emerald-50 text-emerald-700'
                  : versionRow?.status === 'changes'
                    ? 'border-orange-500/30 bg-orange-50 text-orange-700'
                    : 'border-black/15 text-black/50'
              }`}
            >
              {versionRow?.status ?? 'review'}
            </span>
          </div>
          {decisions.length === 0 ? (
            <p className="mt-3 text-xs text-black/45">No approval decision has been recorded for this version.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {decisions.map((decision) => (
                <div key={decision.id} className="rounded-lg border border-black/10 bg-black/[0.025] px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <b>{decision.decision === 'approved' ? 'Approved' : 'Changes requested'}</b>
                    <span className="text-black/50">by {memberMap.get(decision.actorId)?.name ?? 'Client'}</span>
                    {decision.commentCount !== undefined && <span className="text-black/50">{decision.commentCount} comments · {decision.resolvedCount ?? 0} resolved</span>}
                    <span className="ms-auto font-mono text-[9px] text-black/40">{decision.createdAt}</span>
                  </div>
                  {decision.note && <p className="mt-1 text-black/65">{decision.note}</p>}
                </div>
              ))}
            </div>
          )}
        </section>}

        {includeSessions && <section className="border-b border-black/10 py-5">
          <p className="text-[10px] font-bold tracking-[0.25em] text-black/40 uppercase">Live review sessions</p>
          {sessions.length === 0 ? (
            <p className="mt-3 text-xs text-black/45">No live review session has been recorded for this version.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-[10px]">
                  <b>{session.endedAt ? 'Completed' : 'Live now'}</b>
                  <span className="text-black/50">Host: {memberMap.get(session.hostId)?.name ?? 'Reviewer'}</span>
                  <span className="text-black/50">Participants: {session.participants.length}</span>
                  <span className="ms-auto font-mono text-black/40">{session.startedAt}{session.endedAt ? ` → ${session.endedAt}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </section>}

        <div className="space-y-6 py-6">
          <p className="text-[10px] font-bold tracking-[0.25em] text-black/40 uppercase">{t('rv_all')} — {comments.length}</p>

          {comments.length === 0 && <p className="py-10 text-center text-sm text-black/40">No comments on this version.</p>}

          {comments.map((c, i) => {
            const author = memberMap.get(c.authorId);
            const layers = layersBy(c.id);
            return (
              <article key={c.id} className="grid grid-cols-[220px_1fr] gap-5 border-b border-black/10 pb-6">
                <div>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-black/15 bg-black">
                    {includeThumbnails
                      ? c.cleanThumb || c.thumb
                        ? <img src={c.cleanThumb ?? c.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        : project.thumbnail
                          ? <img src={project.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                          : null
                      : null}
                    {includeDrawings && Boolean(c.cleanThumb) && <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1280 720" preserveAspectRatio="none">
                      {layers.filter((l) => l.visible).map((l) => (
                        <g key={l.id} opacity={l.opacity ?? 0.95} transform={reportLayerTransform(l)}>
                          {l.type === 'pen' && l.pts && <polyline points={l.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={l.color} strokeWidth={5} strokeLinecap="round" />}
                          {l.type === 'arrow' && l.w !== undefined && l.h !== undefined && l.x !== undefined && l.y !== undefined && (
                            <g>
                              <line x1={l.x} y1={l.y} x2={l.x + l.w} y2={l.y + l.h} stroke={l.color} strokeWidth={6} strokeLinecap="round" />
                              <circle cx={l.x + l.w} cy={l.y + l.h} r={9} fill={l.color} />
                            </g>
                          )}
                          {l.type === 'circle' && l.w !== undefined && l.h !== undefined && l.x !== undefined && l.y !== undefined && (
                            <ellipse cx={l.x + l.w / 2} cy={l.y + l.h / 2} rx={l.w / 2} ry={l.h / 2} fill="none" stroke={l.color} strokeWidth={6} />
                          )}
                          {l.type === 'rect' && l.w !== undefined && l.h !== undefined && l.x !== undefined && l.y !== undefined && (
                            <rect x={l.x} y={l.y} width={l.w} height={l.h} fill="none" stroke={l.color} strokeWidth={6} />
                          )}
                          {l.type === 'text' && l.text && l.x !== undefined && l.y !== undefined && (
                            <text x={l.x} y={l.y} fill={l.color} fontSize={l.fs} fontWeight={700}>{l.text}</text>
                          )}
                          {l.type === 'image' && l.src && l.x !== undefined && l.y !== undefined && l.w && l.h && (
                            <image href={l.src} x={l.x} y={l.y} width={l.w} height={l.h} preserveAspectRatio="xMidYMid meet" />
                          )}
                        </g>
                      ))}
                    </svg>}
                  </div>
                  <p className="mt-2 text-center font-mono text-[10px] text-black/50">
                    {fmtTc(c.tc)}{c.rangeEnd !== undefined ? ` → ${fmtTc(c.rangeEnd)}` : ''} · {c.kind}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-[10px] font-black text-black/30">#{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-xs font-bold">{author?.name ?? 'Guest'}</span>
                    {c.resolved ? (
                      <span className="rounded-full border border-emerald-600/40 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">RESOLVED ✓</span>
                    ) : (
                      <span className="rounded-full border border-orange-500/40 bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-700">OPEN</span>
                    )}
                    <span className="ms-auto text-[10px] text-black/40">{c.createdAt}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{c.text}</p>
                  {includeDrawings && layers.length > 0 && (
                    <p className="mt-1.5 text-[10px] text-black/45">
                      ✎ {layers.length} annotation layer(s): {layers.map((l) => l.type).join(', ')}
                    </p>
                  )}
                  {includeReplies && c.replies.map((r) => (
                    <div key={r.id} className="mt-2 border-s-2 border-black/15 ps-3">
                      <p className="text-[11px] text-black/70">
                        <b>{memberMap.get(r.authorId)?.name ?? 'Guest'}</b> · {r.at}
                      </p>
                      <p className="text-xs">{r.text}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
          </>
        )}

        <footer className="flex items-center justify-between border-t-2 border-black/80 pt-4 text-[9px] tracking-widest text-black/40 uppercase">
          <span>{company?.name ?? 'Augmentoria'} — Review Report</span>
          <span>
            {project.client} · {project.name} · {version}
          </span>
        </footer>
      </div>
    </div>
  );
}

function reportLayerTransform(layer: import('../../lib/store').AnnotationLayer) {
  if (!layer.rotation) return undefined;
  const cx = (layer.x ?? 0) + (layer.w ?? 0) / 2;
  const cy = (layer.y ?? 0) + (layer.h ?? 0) / 2;
  return `rotate(${layer.rotation} ${cx} ${cy})`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-xl font-black">{value}</p>
      <p className="mt-0.5 text-[9px] tracking-widest text-black/45 uppercase">{label}</p>
    </div>
  );
}
