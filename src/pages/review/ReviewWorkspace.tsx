import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { actions, useAppState } from '../../lib/store';
import { brandColor, GoldMark } from '../../components/ui/bits';
import { mediaStorage } from '../../lib/mediaStorage';
import { useProjectAssets } from '../../lib/assets';
import { exportCommentsCSV, exportFramePNG, exportSessionJSON } from '../../lib/exportReview';
import Player from './Player';
import type { Marker } from './Player';
import OverlayLayer from './OverlayLayer';
import CommentsPanel from './CommentsPanel';
import type { LayerType } from '../../lib/store';
import NotFoundPage from '../NotFoundPage';
import { FREEFRAME_REVIEW_ENABLED, proReviewPath } from '../../lib/freeframe';

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
  const canComment = guest || can('reviews.comment');
  const canModerate = !guest && can('projects.edit');
  const canExport = !guest && can('reports.export');
  const canShare = !guest && can('projects.edit');
  const canHostSession = !guest && can('projects.edit');
  const canDecide = guest || can('approvals.grant');
  const actorId = guest ? 'guest' : user.id;

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
  const [commentsOpen, setCommentsOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [annotationToolsOpen, setAnnotationToolsOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState<'approved' | 'changes' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const { assets, assignToVersion } = useProjectAssets(project?.id);
  const videoAssets = useMemo(() => assets.filter((a) => a.isVideo), [assets]);
  const [pickedAssetId, setPickedAssetId] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const onBreakpointChange = (event: MediaQueryListEvent) => setCommentsOpen(event.matches);
    media.addEventListener('change', onBreakpointChange);
    return () => media.removeEventListener('change', onBreakpointChange);
  }, []);

  const company = state.companies[0];
  useEffect(() => {
    if (!guest) return;
    if (company?.brandColor) {
      document.documentElement.style.setProperty('--color-accent', company.brandColor);
    }
  }, [company?.brandColor, guest]);

  useEffect(() => {
    let active = true;
    let url: string | null = null;
    setCustomVideo(null);
    if (project?.id) {
      mediaStorage
        .getVersionVideo(project.id, version)
        .then((rec) => {
          if (active && rec) {
            url = URL.createObjectURL(rec.blob);
            setCustomVideo({ url, name: rec.name });
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [project?.id, version]);

  const canUploadVideo = !guest && can('versions.upload');

  const onUploadVideo = async (file: File) => {
    if (!project?.id) return;
    const url = URL.createObjectURL(file);
    try {
      await mediaStorage.saveVersionVideo(project.id, version, file);
      await mediaStorage.saveAsset({
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
    setCustomVideo({ url, name: file.name });
  };

  const handleAssetForReview = async (assetId: string) => {
    const asset = videoAssets.find((row) => row.id === assetId);
    if (!asset || !project?.id) return;
    await assignToVersion(asset.id, version);
    setPickedAssetId(asset.id);
    setCustomVideo({ url: asset.url, name: asset.name });
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

  const activeSession = useMemo(
    () => state.sessions.find((session) => session.projectId === projectId && session.version === version && !session.endedAt),
    [projectId, state.sessions, version]
  );
  const pendingControlRequesterId = activeSession?.controlRequests?.[0];
  const pendingControlRequester = pendingControlRequesterId ? memberMap.get(pendingControlRequesterId)?.name ?? 'Reviewer' : null;

  const latestDecision = useMemo(
    () => state.approvals.find((item) => item.projectId === project?.id && item.version === version),
    [project?.id, state.approvals, version]
  );

  const activeComment = comments.find((comment) => comment.id === activeId);
  const activeOverlayInRange = activeComment
    ? activeComment.kind === 'range'
      ? time >= activeComment.tc && time <= (activeComment.rangeEnd ?? activeComment.tc)
      : Math.abs(time - activeComment.tc) <= 0.08
    : false;
  const visibleLayers = useMemo(
    () => state.layers.filter((layer) => layer.commentId === DRAFT || (activeOverlayInRange && layer.commentId === activeId)),
    [activeId, activeOverlayInRange, state.layers]
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !projectId || !activeSession || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(`augmentoria-review-${projectId}-${version}`);
    const controlsPlayback = !guest && activeSession.hostId === user.id;
    let lastTimeSent = 0;
    let applyingRemote = false;

    const send = (action: 'play' | 'pause' | 'seek' | 'time') => {
      if (!controlsPlayback || applyingRemote) return;
      channel.postMessage({ type: 'playback', action, time: video.currentTime, sessionId: activeSession.id });
    };
    const onPlay = () => send('play');
    const onPause = () => send('pause');
    const onSeek = () => send('seek');
    const onTime = () => {
      const now = Date.now();
      if (now - lastTimeSent < 750) return;
      lastTimeSent = now;
      send('time');
    };

    if (controlsPlayback) {
      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);
      video.addEventListener('seeked', onSeek);
      video.addEventListener('timeupdate', onTime);
    }

    channel.onmessage = (event) => {
      const message = event.data as { type?: string; action?: string; time?: number; sessionId?: string };
      if (controlsPlayback || message.type !== 'playback' || message.sessionId !== activeSession.id || typeof message.time !== 'number') return;
      applyingRemote = true;
      if (Math.abs(video.currentTime - message.time) > 0.08) video.currentTime = message.time;
      if (message.action === 'play') void video.play().catch(() => undefined);
      if (message.action === 'pause') video.pause();
      window.setTimeout(() => {
        applyingRemote = false;
      }, 100);
    };

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeek);
      video.removeEventListener('timeupdate', onTime);
      channel.close();
    };
  }, [activeSession, guest, projectId, user.id, version]);

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
    setCommentsOpen(true);
  };

  const canAnnotate = guest || can('reviews.annotate');
  const canPost = canComment;

  const post = (payload: { kind: 'frame' | 'range'; tc: number; rangeEnd?: number; text: string }) => {
    if (!project) return;
    const rec = actions.addComment({
      projectId: project.id,
      version,
      authorId: actorId,
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

  const pickedAsset = videoAssets.find((a) => a.id === pickedAssetId);
  const usingDemo = !customVideo && !pickedAsset;
  const src = customVideo?.url ?? pickedAsset?.url ?? defaultVideo(project.id);

  const shareUrl = `${window.location.origin}/review/${project.id}/${version}`;

  return (
    <div className="review-workspace flex h-[100dvh] overflow-hidden flex-col bg-bg text-ink">
      <header className="review-header flex h-14 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-line px-2 sm:px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {canExport && (
            <Link to="/app/projects" className="rounded-full border border-line p-2 text-muted transition-colors hover:border-accent hover:text-accent">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rtl:rotate-180">
                <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          {guest && (
            company?.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="h-6 max-w-20 shrink-0 object-contain sm:h-7 sm:max-w-none" />
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
                    to={`/${guest ? 'review' : 'studio/review'}/${project.id}/${ver.v}`}
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold transition-colors ${
                      ver.v !== version ? 'max-sm:hidden' : ''
                    } ${
                      ver.v === version ? 'bg-accent/15 text-accent' : 'text-muted/60 hover:text-accent'
                    }`}
                  >
                    {ver.v}
                  </Link>
                ))}
              </div>
              {guest && <span className="hidden text-[10px] text-muted/50 sm:inline">· {t('rv_guest_mode')}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-controls="review-comments"
            aria-expanded={commentsOpen}
            onClick={() => setCommentsOpen((open) => !open)}
            className={`hidden rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors lg:block ${
              commentsOpen ? 'border-accent/40 text-accent' : 'border-line text-muted hover:text-ink'
            }`}
          >
            💬 {comments.length}
          </button>
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
          {!guest && canUploadVideo && (
            <Link
              to={`/studio/editor/${project.id}/${version}${pickedAsset ? `?asset=${pickedAsset.id}` : ''}`}
              className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              ✂ {lang === 'ar' ? 'المونتاج' : 'Editor'}
            </Link>
          )}
          {!guest && FREEFRAME_REVIEW_ENABLED && (
            <Link to={proReviewPath(project.id, version)} className="rounded-full border border-fuchsia-400/45 bg-fuchsia-400/5 px-3.5 py-1.5 text-xs font-bold text-fuchsia-300 transition-colors hover:bg-fuchsia-400/10">
              ◈ Pro Review
            </Link>
          )}
          {usingDemo && (
            <span className="hidden rounded-full bg-orange-400/10 px-3 py-1.5 text-[10px] font-medium text-orange-300 lg:block" title={t('rv_demo_hint')}>
              {t('rv_demo_clip')}
            </span>
          )}
          {canExport && (
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
          {canShare && (
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

          {canHostSession && !activeSession && (
            <button
              type="button"
              onClick={() => {
                if (projectId) actions.startSession(projectId, version, user.id);
              }}
              className="rounded-full border border-emerald-400/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/10"
            >
              ● {lang === 'ar' ? 'ابدأ Live' : 'Start Live'}
            </button>
          )}
          {activeSession && canHostSession && activeSession.hostId === user.id && pendingControlRequesterId && (
            <button
              type="button"
              onClick={() => actions.takeSessionControl(activeSession.id, pendingControlRequesterId)}
              className="rounded-full border border-orange-400/40 px-3 py-1.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-400/10"
            >
              {lang === 'ar' ? `قبول تحكم ${pendingControlRequester}` : `Accept ${pendingControlRequester}'s control request`}
            </button>
          )}
          {activeSession && canHostSession && (
            <button
              onClick={() => {
                if (activeSession.hostId === user.id) actions.endSession(activeSession.id);
                else actions.takeSessionControl(activeSession.id, user.id);
              }}
              title={activeSession.hostId === user.id ? t('ses_end') : lang === 'ar' ? 'استلم التحكم' : 'Take control'}
              className="flex items-center gap-1.5 rounded-full border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/10"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
              </span>
              {activeSession.hostId === user.id ? t('ses_end') : lang === 'ar' ? 'استلم التحكم' : 'Take control'}
            </button>
          )}
          {activeSession && !canHostSession && !guest && activeSession.hostId !== user.id && (
            <button
              type="button"
              disabled={activeSession.controlRequests?.includes(user.id)}
              onClick={() => actions.requestSessionControl(activeSession.id, user.id)}
              className="rounded-full border border-orange-400/40 px-3 py-1.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-400/10 disabled:opacity-50"
            >
              {activeSession.controlRequests?.includes(user.id)
                ? lang === 'ar'
                  ? 'تم طلب التحكم'
                  : 'Control requested'
                : lang === 'ar'
                  ? 'طلب التحكم'
                  : 'Request control'}
            </button>
          )}
          {activeSession && !canHostSession && !guest && activeSession.hostId === user.id && (
            <span className="rounded-full border border-emerald-400/40 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              🎮 {lang === 'ar' ? 'أنت متحكم' : 'You have control'}
            </span>
          )}
          {activeSession && guest && (
            <button type="button" title={t('ses_live')} disabled className="flex items-center gap-1.5 rounded-full border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
              </span>
              {t('ses_live')}
            </button>
          )}
        </div>
      </header>

      {(canDecide || latestDecision) && (
        <div className="review-decision-bar flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface/70 px-3 py-2 sm:px-5">
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${
              latestDecision?.decision === 'approved'
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : latestDecision?.decision === 'changes'
                  ? 'border-orange-400/40 bg-orange-400/10 text-orange-300'
                  : 'border-line text-muted'
            }`}
          >
            {latestDecision?.decision === 'approved'
              ? lang === 'ar'
                ? 'تم الاعتماد'
                : 'Approved'
              : latestDecision?.decision === 'changes'
                ? lang === 'ar'
                  ? 'تعديلات مطلوبة'
                  : 'Changes requested'
                : lang === 'ar'
                  ? 'في انتظار القرار'
                  : 'Awaiting decision'}
          </span>
          {latestDecision && (
            <span className="truncate text-[10px] text-muted">
              {state.members.find((member) => member.id === latestDecision.actorId)?.name ?? 'Client'} · {latestDecision.createdAt}
              {latestDecision.note ? ` — ${latestDecision.note}` : ''}
            </span>
          )}
          {canDecide && (
            <div className="ms-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDecisionNote('');
                  setDecisionOpen('changes');
                }}
                className="rounded-full border border-orange-400/40 px-3 py-1.5 text-[11px] font-bold text-orange-300 transition-colors hover:bg-orange-400/10"
              >
                {lang === 'ar' ? 'طلب تعديلات' : 'Request changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecisionNote('');
                  setDecisionOpen('approved');
                }}
                className="rounded-full bg-emerald-400 px-4 py-1.5 text-[11px] font-black text-bg transition-colors hover:bg-emerald-300"
              >
                ✓ {lang === 'ar' ? 'اعتماد النسخة' : 'Approve version'}
              </button>
            </div>
          )}
        </div>
      )}

      {videoAssets.length > 0 && (
        <div className="review-assets-bar flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-4 py-2 lg:px-5">
          <span className="shrink-0 text-[10px] font-bold tracking-widest text-muted/60 uppercase">{t('rv_from_library')}</span>
          {videoAssets.map((a) => (
            <button
              key={a.id}
              onClick={() => void handleAssetForReview(a.id)}
              title={a.note ?? a.name}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] transition-colors ${
                pickedAsset?.id === a.id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink'
              }`}
            >
              {pickedAsset?.id === a.id ? '✓' : '▶'} {a.name}
            </button>
          ))}
          {videoAssets.length > 1 && (
            <Link to={`/studio/asset-compare/${project.id}/${videoAssets[0].id}/${videoAssets[1].id}`} className="shrink-0 rounded-full border border-accent/40 px-3 py-1 text-[11px] font-bold text-accent hover:bg-accent/10">
              ⇄ {lang === 'ar' ? 'قارن فيديوهين' : 'Compare assets'}
            </Link>
          )}
        </div>
      )}

      <div className="review-body relative flex min-h-0 flex-1 overflow-hidden">
        <main className="review-main relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-4 lg:p-5">
          <div className="review-player-wrap relative flex min-h-0 flex-1">
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
              className={`review-annotation-bar flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                tool === 'select' && !annotationToolsOpen ? 'max-lg:hidden' : ''
              } ${
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
                      onClick={() => {
                        setTool(tl);
                        setAnnotationToolsOpen(false);
                      }}
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

          {tool === 'select' && !annotationToolsOpen && (
            <div className="review-mobile-actions flex shrink-0 gap-2 lg:hidden">
              {canAnnotate && (
                <button
                  type="button"
                  onClick={() => setAnnotationToolsOpen(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-xs font-bold text-muted"
                >
                  ✏ {t('rv_annotate')}
                </button>
              )}
              <button
                type="button"
                aria-controls="review-comments"
                aria-expanded={commentsOpen}
                onClick={() => setCommentsOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent/40 bg-surface px-4 py-3 text-xs font-bold text-accent"
              >
                💬 {t('rv_comments')} <span className="rounded-full bg-accent/15 px-1.5 py-0.5">{comments.length}</span>
              </button>
            </div>
          )}
        </main>

        {commentsOpen && (
          <button
            type="button"
            aria-label={t('rv_close_comments')}
            onClick={() => setCommentsOpen(false)}
            className="absolute inset-0 z-30 bg-black/55 backdrop-blur-[1px] lg:hidden"
          />
        )}

        <CommentsPanel
          comments={comments}
          members={memberMap}
          activeId={activeId}
          canComment={canPost}
          canModerate={canModerate}
          getTime={getTime}
          getThumb={getThumb}
          onSeek={seek}
          onSelect={setActiveId}
          onToggleResolve={canModerate ? actions.toggleCommentResolved : () => {}}
          onReply={canPost ? (id, txt) => actions.addReply(id, actorId, txt) : () => {}}
          onDelete={canModerate ? actions.deleteComment : () => {}}
          onPost={post}
          onDraftRange={setDraftRange}
          draftLayers={state.layers.filter((l) => l.commentId === DRAFT)}
          layers={state.layers.filter((layer) => comments.some((comment) => comment.id === layer.commentId))}
          onRemoveDraftLayer={actions.deleteLayer}
          onToggleDraftLayer={(id, visible) => actions.updateLayer(id, { visible })}
          layerCounts={layerCounts}
          mobileOpen={commentsOpen}
          onMobileClose={() => setCommentsOpen(false)}
        />
      </div>

      {guest && (
        <footer className="review-footer shrink-0 border-t border-line py-2 text-center text-[10px] tracking-widest text-muted/40 uppercase">
          {company?.tagline ?? (lang === 'ar' ? 'مراجعة فيديو احترافية' : 'Professional video review')}
          {' · '}
          <span className="text-accent/60">Augmentoria</span>
        </footer>
      )}

      {decisionOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setDecisionOpen(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-decision-title"
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="review-decision-title" className="font-display text-lg font-black">
              {decisionOpen === 'approved'
                ? lang === 'ar'
                  ? `اعتماد ${version}`
                  : `Approve ${version}`
                : lang === 'ar'
                  ? `طلب تعديلات على ${version}`
                  : `Request changes on ${version}`}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {decisionOpen === 'changes'
                ? lang === 'ar'
                  ? 'اكتب ملخص التعديلات المطلوبة. الملخص إجباري وسيتحفظ في سجل القرار.'
                  : 'Summarize the required changes. This note is required and saved in the decision history.'
                : lang === 'ar'
                  ? 'يمكنك إضافة ملاحظة اختيارية مع الاعتماد.'
                  : 'You can include an optional note with the approval.'}
            </p>
            <textarea
              autoFocus
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              rows={4}
              placeholder={lang === 'ar' ? 'ملاحظة القرار…' : 'Decision note…'}
              className="mt-4 w-full resize-none rounded-xl border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDecisionOpen(null)} className="rounded-full border border-line px-4 py-2 text-xs text-muted hover:text-ink">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={decisionOpen === 'changes' && !decisionNote.trim()}
                onClick={() => {
                  if (!project) return;
                  actions.recordApproval(project.id, version, actorId, decisionOpen, decisionNote);
                  setDecisionOpen(null);
                  setDecisionNote('');
                }}
                className={`rounded-full px-5 py-2 text-xs font-black text-bg disabled:cursor-not-allowed disabled:opacity-40 ${
                  decisionOpen === 'approved' ? 'bg-emerald-400' : 'bg-orange-400'
                }`}
              >
                {decisionOpen === 'approved'
                  ? lang === 'ar'
                    ? 'تأكيد الاعتماد'
                    : 'Confirm approval'
                  : lang === 'ar'
                    ? 'إرسال طلب التعديل'
                    : 'Send change request'}
              </button>
            </div>
          </section>
        </div>
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
