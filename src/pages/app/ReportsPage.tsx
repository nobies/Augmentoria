import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { clientLogoSrc, useAppState } from '../../lib/store';
import { exportCommentsCSV, exportSessionJSON } from '../../lib/exportReview';
import { FadeIn, LogoChip } from '../../components/ui/bits';

export default function ReportsPage() {
  const { t, lang } = useLang();
  const { can } = useAuth();
  const state = useAppState();
  const [pid, setPid] = useState(state.projects[0]?.id ?? '');

  const project = state.projects.find((p) => p.id === pid);
  const clientRec = state.clients.find((c) => c.id === project?.clientId || c.name === project?.client);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">{t('page_reports')}</h1>
        <p className="mt-1.5 text-xs text-muted">{lang === 'ar' ? 'ولّد تقرير مراجعة كامل جاهز للعميل.' : 'Generate a full client-ready review report.'}</p>
      </div>

      <div className="space-y-3 rounded-xl border border-line bg-surface p-5">
        <label className="block text-[11px] tracking-wider text-muted uppercase">{t('prj_filter_client')}</label>
        <select value={pid} onChange={(e) => setPid(e.target.value)} className="w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent">
          {state.projects.map((p) => (
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
            <Link to={`/app/clients/${clientRec.id}`} className="ms-auto text-xs text-accent hover:underline">
              {t('client_edit')} →
            </Link>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

export function ReportView() {
  const { t, lang } = useLang();
  const { can } = useAuth();
  const { pid, v } = useParams();
  const state = useAppState();
  const project = state.projects.find((p) => p.id === pid);
  const clientRec = state.clients.find((c) => c.id === project?.clientId || c.name === project?.client);
  const company = state.companies[0];
  const version = v ?? project?.currentVersion ?? 'V01';

  if (!project) {
    return (
      <div className="py-24 text-center">
        <Link to="/app/reports" className="text-sm text-accent hover:underline">
          ← {t('page_reports')}
        </Link>
      </div>
    );
  }

  const memberMap = new Map(state.members.map((m) => [m.id, m]));
  const comments = state.comments
    .filter((c) => c.projectId === project.id && c.version === version)
    .sort((a, b) => a.tc - b.tc);
  const layersBy = (cid: string) => state.layers.filter((l) => l.commentId === cid);
  const resolved = comments.filter((c) => c.resolved).length;
  const fmtTc = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}:${String(Math.floor((t % 1) * 25)).padStart(2, '0')}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/app/reports" className="text-xs text-muted hover:text-accent">
          ← {t('page_reports')}
        </Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} disabled={!can('reports.export')} className="rounded-full bg-accent px-5 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40">
            🖨 {lang === 'ar' ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
          </button>
          <button
            onClick={() =>
              exportCommentsCSV(
                comments.map((c) => ({ ...c, layerCount: layersBy(c.id).length })),
                (id) => memberMap.get(id)?.name ?? 'Guest',
                `${project.client}-${project.name}-${version}`
              )
            }
            className="rounded-full border border-line px-4 py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            📊 CSV
          </button>
          <button
            onClick={() =>
              exportSessionJSON(
                { project: { id: project.id, name: project.name }, version, exportedAt: new Date().toISOString(), comments, layers: state.layers.filter((l) => comments.some((c) => c.id === l.commentId)) },
                `${project.client}-${project.name}-${version}`
              )
            }
            className="rounded-full border border-line px-4 py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            🗂 JSON
          </button>
        </div>
      </div>

      <div id="report-sheet" className="rounded-2xl border border-line bg-white p-8 text-black shadow-xl print:rounded-none print:border-0 print:shadow-none lg:p-12">
        <header className="flex items-start justify-between border-b-2 border-black/80 pb-6">
          <div className="flex items-center gap-4">
            <LogoChip name={clientRec?.name ?? project.client} logo={clientLogoSrc(clientRec)} size="lg" />
            <div>
              <p className="text-[10px] font-bold tracking-[0.25em] text-black/50 uppercase">{clientRec?.name}</p>
              <h1 className="font-display text-2xl font-black">{project.name}</h1>
              <p className="mt-0.5 text-xs text-black/60">Review Report — Version {version}</p>
            </div>
          </div>
          <div className="text-end text-[10px] leading-relaxed text-black/50">
            {company?.logoUrl ? <img src={company.logoUrl} alt={company.name} className="mb-1 ms-auto h-10 object-contain" /> : <p className="font-display text-sm font-black tracking-widest">{company?.name}</p>}
            <p>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</p>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-4 border-b border-black/10 py-5 text-center">
          <Stat label="Comments" value={String(comments.length)} />
          <Stat label="Resolved" value={String(resolved)} />
          <Stat label="Open" value={String(comments.length - resolved)} />
          <Stat label="Versions" value={`${project.currentVersion} · ${project.versions.length}`} />
        </div>

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
                    {c.thumb ? (
                      <img src={c.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : project.thumbnail ? (
                      <img src={project.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
                    ) : null}
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1280 720" preserveAspectRatio="none">
                      {layers.filter((l) => l.visible).map((l) => (
                        <g key={l.id}>
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
                            <text x={l.x} y={l.y} fill={l.color} fontSize={34} fontWeight={700}>{l.text}</text>
                          )}
                        </g>
                      ))}
                    </svg>
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
                  {layers.length > 0 && (
                    <p className="mt-1.5 text-[10px] text-black/45">
                      ✎ {layers.length} annotation layer(s): {layers.map((l) => l.type).join(', ')}
                    </p>
                  )}
                  {c.replies.map((r) => (
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-xl font-black">{value}</p>
      <p className="mt-0.5 text-[9px] tracking-widest text-black/45 uppercase">{label}</p>
    </div>
  );
}
