import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { actions, useAppState } from '../../lib/store';
import { brandColor, GoldMark } from '../../components/ui/bits';
import { idb } from '../../lib/idb';
import { useProjectAssets } from '../../lib/assets';
import { exportCommentsCSV, exportFramePNG, exportSessionJSON } from '../../lib/exportReview';
import Player from './Player';
import type { Marker } from './Player';
import OverlayLayer from './OverlayLayer';
import CommentsPanel from './CommentsPanel';
import type { LayerType } from '../../lib/store';
import NotFoundPage from '../NotFoundPage';

const COLORS = ['#FF4D4D', '#FFB020', '#4FD1C5', '#A78BFA', '#FB7185', '#34D399', '#FFFFFF'];
const DRAFT = '__draft';

function defaultVideo(pid?: string) {
  if (pid === 'p-flynas') return '/demo/flynas-v02.mp4';
  if (pid === 'p-rta') return '/demo/rta-v06.mp4';
  return '/demo/vodafone-v04.mp4';
}

export default function ReviewWorkspace({ mode = 'app' }: { mode?: 'app' | 'guest' }) {
  const { t, lang } = useLang();
  const { pid, v } = useParams();
  const { user, can } = useAuth();
  const state = useAppState();
  const guest = mode === 'guest';
  const canComment = can('reviews.comment');

  const project = state.projects.find((p) => p.id === pid);
  const projectId = project?.id;
  const version = v ?? project?.currentVersion ?? 'V01';

  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [time, setTime] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tool, setTool] = useState<LayerType | 'select'>('select');
  const [color, setColor] = useState(COLORS[0]);
  const [copied, setCopied] = useState(false);
  const [customVideo, setCustomVideo] = useState<{ url: string; name: string } | null>(null);
  const [aspect, setAspect] = useState(16 / 9);
  const [draftRange, setDraftRange] = useState<{ tc: number; rangeEnd?: number } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const { assets } = useProjectAssets(project?.id);
  const videoAssets = useMemo(() => assets.filter((a) => a.isVideo), [assets]);
  const [pickedAssetId, setPickedAssetId] = useState<string | null>(null);

  const company = state.companies[0];
  useEffect(() => {
    if (!guest) return;
    if (company?.brandColor) {
      document.documentElement.style.setProperty('--color-accent', company.brandColor);
    }
  }, [company?.brandColor, guest]);

  useEffect(() => {
    let url: string | null = null;
    idb
      .all('video')
      .then((recs) => {
        const rec = recs.find((r) => r.id === `${project?.id}__${version}`);
        if (rec) {
          url = URL.createObjectURL(rec.blob);
          setCustomVideo({ url, name: rec.name });
        }
      })
      .catch(() => {});
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [project?.id, version]);

  const canUploadVideo = !guest && can('versions.upload');

  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (guest || !canComment || !projectId) return;
    const rec = actions.startSession(projectId, version, user.id);
    setSessionId(rec.id);
  }, [canComment, guest, projectId, user.id, version]);

  const onUploadVideo = async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      await idb.put('video', {
        id: `${project?.id}__${version}`,
        name: file.name,
        type: file.type,
        blob: file,
        active: true,
        createdAt: Date.now()
      });
      await idb.put('assets', {
        id: `as-${Date.now()}-${Math.round(Math.random() * 999)}`,
        projectId: project?.id,
        name: `${version} — ${file.name}`,
        type: file.type || 'video/mp4',
        size: file.size,
        blob: file,
        note: `Version ${version} review file`,
        createdAt: Date.now()
      });
    } catch (err) {
      console.error('[review] video upload failed', err);
    }
    if (customVideo?.url) URL.revokeObjectURL(customVideo.url);
    setCustomVideo({ url, name: file.name });
  };

  const memberMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; avatar?: string; color: string }>();
    state.members.forEach((m) => map.set(m.id, { id: m.id, name: m.name, avatar: m.avatar, color: brandColor(m.name) }));
    return map;
  }, [state.members]);

  const comments = useMemo(
    () => state.comments.filter((c) => c.projectId === project?.id && c.version === version).sort((a, b) => a.tc - b.tc),
    [state.comments, project?.id, version]
  );

  const visibleLayers = useMemo(
    () => state.layers.filter((l) => l.commentId === activeId || l.commentId === DRAFT),
    [state.layers, activeId]
  );

  const layerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    state.layers.forEach((l) => (counts[l.commentId] = (counts[l.commentId] ?? 0) + 1));
    return counts;
  }, [state.layers]);

  const getTime = useCallback(() => videoRef.current?.currentTime ?? time, [time]);

  const getThumb = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.videoWidth) return '';
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = Math.round((320 * vid.videoHeight) / vid.videoWidth);
    canvas.getContext('2d')?.drawImage(vid, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const seek = useCallback((t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
    setTime(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const vid = videoRef.current;
      if (!vid) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (vid.paused) void vid.play();
        else vid.pause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        vid.pause();
        vid.currentTime = Math.min(vid.currentTime + 1 / 25, vid.duration || 0);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        vid.pause();
        vid.currentTime = Math.max(0, vid.currentTime - 1 / 25);
      } else if (e.key === 'Escape') {
        setTool('select');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const markers: Marker[] = comments.map((c) => ({
    id: c.id,
    tc: c.tc,
    kind: c.kind,
    rangeEnd: c.rangeEnd,
    resolved: c.resolved,
    color: memberMap.get(c.authorId)?.color ?? '#D9A441'
  }));
  if (draftRange) {
    markers.push({ id: '__draft-range', tc: draftRange.tc, kind: 'range', rangeEnd: draftRange.rangeEnd, resolved: false, color: '#FFB020' });
  }

  const onMarkerClick = (m: Marker) => {
    seek(m.tc);
    setActiveId(m.id);
  };

  const canAnnotate = can('reviews.annotate');
  const canPost = canComment;

  const post = (payload: { kind: 'frame' | 'range'; tc: number; rangeEnd?: number; text: string }) => {
    if (!project) return;
    const rec = actions.addComment({
      projectId: project.id,
      version,
      authorId: user.id,
      kind: payload.kind,
      tc: payload.tc,
      rangeEnd: payload.rangeEnd,
      text: payload.text,
      thumb: getThumb() || undefined
    });
    actions.attachDraftLayers(DRAFT, rec.id);
    setActiveId(rec.id);
    setTool('select');
  };

  if (!project || !project.versions.some((row) => row.v === version)) {
    return <NotFoundPage />;
  }

  const pickedAsset = videoAssets.find((a) => a.id === pickedAssetId) ?? videoAssets[0];
  const usingDemo = !customVideo && !pickedAsset;
  const src = customVideo?.url ?? pickedAsset?.url ?? defaultVideo(project.id);

  const shareUrl = `${window.location.origin}/review/${project.id}/${version}`;

  return (
    <div className="flex h-screen flex-col bg-bg text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {!guest && (
            <Link to="/app/projects" className="rounded-full border border-line p-2 text-muted transition-colors hover:border-accent hover:text-accent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rtl:rotate-180">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          {guest && (
            company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-7 object-contain" />
            ) : company?.name ? (
              <span className="font-display text-sm font-black tracking-[0.2em]">{company.name}</span>
            ) : (
              <GoldMark size={22} />
            )
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{project.client} — {project.name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[10px] tracking-wider text-muted/60 uppercase">{t('nav_reviews')}</span>
              <div className="flex gap-1">
                {project.versions.map((ver) => (
                  <Link
                    key={ver.v}
                    to={`/studio/review/${project.id}/${ver.v}`}
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold transition-colors ${
                      ver.v === version ? 'bg-accent/15 text-accent' : 'text-muted/60 hover:text-accent'
                    }`}
                  >
                    {ver.v}
                  </Link>
                ))}
              </div>
              {guest && <span className="text-[10px] text-muted/50">· {t('rv_guest_mode')}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUploadVideo && (
            <>
              <input
                ref={uploadRef}
                type="file"
                accept="video/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUploadVideo(f);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => uploadRef.current?.click()}
                title={t('rv_upload_video')}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  customVideo || pickedAsset ? 'border-emerald-400/40 text-emerald-300' : 'border-line text-muted hover:border-accent hover:text-accent'
                }`}
              >
                {customVideo ? `✓ ${t('rv_custom_video')}` : `⬆ ${t('rv_upload_video')}`}
              </button>
            </>
          )}
          {usingDemo && (
            <span className="hidden rounded-full bg-orange-400/10 px-3 py-1.5 text-[10px] font-medium text-orange-300 lg:block" title={t('rv_demo_hint')}>
              {t('rv_demo_clip')}
            </span>
          )}
          {!guest && (
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
              >
                📥 {t('rv_export')}
              </button>
              {exportOpen && (
                <div className="absolute end-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-2xl">
                  {([
                    [
                      'rv_export_png',
                      () => {
                        const vid = videoRef.current;
                        if (vid) void exportFramePNG(vid, visibleLayers.filter((l) => l.visible), 1280, 720, `${project.name}-${version}-@${Math.round(time)}s`);
                      }
                    ],
                    [
                      'rv_export_csv',
                      () =>
                        exportCommentsCSV(
                          comments.map((c) => ({ ...c, layerCount: layerCounts[c.id] ?? 0 })),
                          (id) => memberMap.get(id)?.name ?? 'Guest',
                          `${project.client}-${project.name}-${version}`
                        )
                    ],
                    [
                      'rv_export_json',
                      () =>
                        exportSessionJSON(
                          {
                            project: { id: project.id, name: project.name, client: project.client },
                            version,
                            videoSource: src,
                            exportedAt: new Date().toISOString(),
                            comments: comments.map((c) => ({ ...c, layerCount: layerCounts[c.id] ?? 0 })),
                            layers: state.layers.filter((l) => comments.some((c) => c.id === l.commentId))
                          },
                          `${project.client}-${project.name}-${version}`
                        )
                    ]
                  ] as [string, () => void][]).map(([key, fn]) => (
                    <button
                      key={key}
                      onClick={() => {
                        fn();
                        setExportOpen(false);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-start text-xs text-muted transition-colors hover:bg-bg hover:text-accent"
                    >
                      {t(key as never)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!guest && (
            <button
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                copied ? 'border-emerald-400/50 text-emerald-300' : 'border-line text-muted hover:border-accent hover:text-accent'
              }`}
            >
              {copied ? `✓ ${t('rv_copied')}` : `🔗 ${t('rv_share')}`}
            </button>
          )}

          {sessionId && (
            <button
              onClick={() => {
                actions.endSession(sessionId);
                setSessionId(null);
              }}
              title={t('ses_end')}
              className="flex items-center gap-1.5 rounded-full border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/10"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
              </span>
              {t('ses_live')}
            </button>
          )}
        </div>
      </header>

      {videoAssets.length > 0 && !customVideo && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-4 py-2 lg:px-5">
          <span className="shrink-0 text-[10px] font-bold tracking-widest text-muted/60 uppercase">{t('rv_from_library')}</span>
          {videoAssets.map((a) => (
            <button
              key={a.id}
              onClick={() => setPickedAssetId(a.id)}
              title={a.note ?? a.name}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] transition-colors ${
                pickedAsset?.id === a.id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink'
              }`}
            >
              ▶ {a.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 max-lg:flex-col">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-4 lg:p-5">
          <div className="relative flex min-h-0 flex-1">
            <Player
              src={src}
              videoRef={videoRef}
              onTime={setTime}
              markers={markers}
              onMarkerClick={onMarkerClick}
              onMeta={(vw, vh) => setAspect(vw / vh)}
            />
            <OverlayLayer
              tool={tool}
              color={color}
              layers={visibleLayers}
              draftKey={DRAFT}
              canDraw={canAnnotate && tool !== 'select'}
              aspect={aspect}
              onAdd={(l) => actions.addLayer(l)}
              onUpdate={actions.updateLayer}
              onDelete={actions.deleteLayer}
            />

            <div className="absolute start-4 top-4 z-30 flex items-center gap-2">
              <LogoPill name={project.client} logo={state.clients.find((c) => c.name === project.client)?.logo} domain={state.clients.find((c) => c.name === project.client)?.domain} />
            </div>
          </div>

          {canAnnotate && (
            <div
              className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                tool !== 'select' ? 'border-accent/50 bg-accent/[0.04]' : 'border-line bg-surface'
              }`}
            >
              {tool === 'select' ? (
                <>
                  <span className="me-1 text-[10px] font-bold tracking-widest text-muted/60 uppercase">{t('rv_annotate')}</span>
                  {((
                    [
                      ['pen', 'M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z'],
                      ['arrow', 'M5 19L19 5M19 5v7m0-7h-7'],
                      ['circle', 'M18.36 6.64a9 9 0 11-12.73 0 9 9 0 0112.73 0'],
                      ['rect', 'M4 5h16v14H4z'],
                      ['text', 'M4 7V5h16v2M12 5v14M9 19h6'],
                      ['image', 'M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21']
                    ] as [LayerType, string][]
                  ).map(([tl, path]) => (
                    <button
                      key={tl}
                      onClick={() => setTool(tl)}
                      title={t(`rv_tool_${tl}` as never)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-all hover:border-accent hover:text-accent"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d={path} />
                      </svg>
                    </button>
                  )))}
                  <span className="ms-auto hidden font-mono text-[10px] text-muted/50 lg:block">
                    {lang === 'ar' ? 'اختار أداة للرسم — Space تشغيل' : 'Pick a tool to draw — Space plays'}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2 rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent">
                    ✏ {t(`rv_tool_${tool}` as never)}
                  </span>

                  <span className="mx-0.5 h-6 w-px bg-line" />

                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      aria-label={c}
                      className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface' : ''}`}
                      style={{ backgroundColor: c, ...(color === c ? ({ ['--tw-ring-color']: c } as React.CSSProperties) : {}) }}
                    />
                  ))}

                  <span className="mx-0.5 h-6 w-px bg-line" />

                  <button
                    onClick={() => {
                      const drafts = state.layers.filter((l) => l.commentId === DRAFT);
                      const last = drafts[drafts.length - 1];
                      if (last) actions.deleteLayer(last.id);
                    }}
                    title={t('rv_undo')}
                    className="rounded-lg border border-line px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    ↶ {t('rv_undo')}
                  </button>
                  <button
                    onClick={() => actions.clearDraftLayers(DRAFT)}
                    title={t('rv_clear')}
                    className="rounded-lg border border-line px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-red-400 hover:text-red-400"
                  >
                    🗑 {t('rv_clear')}
                  </button>

                  <button
                    onClick={() => setTool('select')}
                    className="ms-auto flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-xs font-bold text-bg transition-all hover:shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                  >
                    ✓ {t('rv_done_drawing')}
                  </button>
                  <span className="hidden font-mono text-[10px] text-muted/50 lg:block">
                    {lang === 'ar' ? 'Space تشغيل · ESC خروج' : 'Space play · ESC exit'}
                  </span>
                </>
              )}
            </div>
          )}
        </main>

        <CommentsPanel
          comments={comments}
          members={memberMap}
          activeId={activeId}
          canComment={canPost}
          getTime={getTime}
          getThumb={getThumb}
          onSeek={seek}
          onSelect={setActiveId}
          onToggleResolve={canPost ? actions.toggleCommentResolved : () => {}}
          onReply={canPost ? (id, txt) => actions.addReply(id, user.id, txt) : () => {}}
          onDelete={can('projects.edit') ? actions.deleteComment : () => {}}
          onPost={post}
          onDraftRange={setDraftRange}
          draftLayers={state.layers.filter((l) => l.commentId === DRAFT)}
          onRemoveDraftLayer={actions.deleteLayer}
          onToggleDraftLayer={(id, visible) => actions.updateLayer(id, { visible })}
          layerCounts={layerCounts}
        />
      </div>

      {guest && (
        <footer className="shrink-0 border-t border-line py-2 text-center text-[10px] tracking-widest text-muted/40 uppercase">
          {company?.tagline ?? (lang === 'ar' ? 'مراجعة فيديو احترافية' : 'Professional video review')}
          {' · '}
          <span className="text-accent/60">Augmentoria</span>
        </footer>
      )}
    </div>
  );
}

function LogoPill({ name, logo, domain }: { name: string; logo?: string; domain?: string }) {
  const src = logo ?? (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : '');
  return (
    <span className="flex items-center gap-2 rounded-full bg-black/55 py-1.5 pe-4 ps-2 backdrop-blur-md ring-1 ring-white/10">
      {src ? (
        <img src={src} alt={name} className="h-7 w-7 rounded-full bg-white object-contain p-[3px]" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 font-display text-xs font-black text-bg">{name[0]}</span>
      )}
      <span className="text-xs font-semibold text-white/90">{name}</span>
    </span>
  );
}
