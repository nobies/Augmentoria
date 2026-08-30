import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { actions, getAppState, parseMentions, projectInUserScope, subscribeToState, useAppState } from '../../lib/store';
import { brandColor, GoldMark } from '../../components/ui/bits';
import { mediaStorage } from '../../lib/mediaStorage';
import { useProjectAssets } from '../../lib/assets';
import { exportCommentsCSV, exportFramePNG, exportSessionJSON } from '../../lib/exportReview';
import Player from './Player';
import type { Marker } from './Player';
import OverlayLayer from './OverlayLayer';
import CommentsPanel from './CommentsPanel';
import type { ChecklistItem, LayerType } from '../../lib/store';
import { toast } from '../../lib/toast';
import NotFoundPage from '../NotFoundPage';
import { renderCommentThumbnail, saveCommentThumbnail } from '../../lib/commentThumbnail';
import { connectReviewRealtime } from '../../lib/realtime';
import { isSupabaseConfigured } from '../../lib/supabase';
import ShareReviewDialog from './ShareReviewDialog';

const COLORS = ['#FF4D4D', '#FFB020', '#4FD1C5', '#A78BFA', '#FB7185', '#34D399', '#FFFFFF'];
const DRAFT = '__draft';

function guestActorId() {
  const key = 'augmentoria-guest-id';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = `guest-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function defaultVideo(pid?: string, v?: string) {
  if (pid === 'p-flynas' && (!v || v === 'V02')) return '/demo/flynas-v02.mp4';
  if (pid === 'p-rta' && (!v || v === 'V06')) return '/demo/rta-v06.mp4';
  if (pid === 'p-vodafone' && (!v || v === 'V04')) return '/demo/vodafone-v04.mp4';
  return '';
}

export default function ReviewWorkspace({ mode = 'app', experience = 'standard' }: { mode?: 'app' | 'guest'; experience?: 'standard' | 'pro' }) {
  const { t, lang } = useLang();
  const { pid, v } = useParams();
  const [searchParams] = useSearchParams();
  const linkedCommentId = searchParams.get('comment');
  const { user, can } = useAuth();
  const state = useAppState();
  const guest = mode === 'guest';
  const pro = experience === 'pro';
  const canComment = guest || can('reviews.comment');
  const canModerate = !guest && can('projects.edit');
  const canExport = !guest && can('reports.export');
  const canShare = !guest && can('projects.edit');
  const canHostSession = !guest && can('projects.edit');
  const canDecide = guest || can('approvals.grant');
  const localGuestId = useMemo(() => guestActorId(), []);
  const actorId = guest ? localGuestId : user.id;

  const project = state.projects.find((p) => p.id === pid);
  const projectId = project?.id;
  const version = v ?? project?.currentVersion ?? 'V01';

  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [time, setTime] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tool, setTool] = useState<LayerType | 'select'>('select');
  const [color, setColor] = useState(COLORS[0]);
  const [shareOpen, setShareOpen] = useState(false);
  const [customVideo, setCustomVideo] = useState<{ url: string; name: string } | null>(null);
  const [aspect, setAspect] = useState(16 / 9);
  const [arOverride, setArOverride] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<'contain' | 'fill' | 'cover'>('contain');
  const [deviceFrame, setDeviceFrame] = useState<'none' | 'tv' | 'mobile' | 'instagram'>('none');
  const [draftRange, setDraftRange] = useState<{ tc: number; rangeEnd?: number } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [annotationToolsOpen, setAnnotationToolsOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState<'approved' | 'changes' | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeDetail, setRealtimeDetail] = useState('Local tab synchronization');
  const [liveParticipants, setLiveParticipants] = useState<string[]>([]);
  const { assets, add: addAsset, assignToVersion } = useProjectAssets(project?.id);
  const videoAssets = useMemo(() => assets.filter((a) => a.isVideo), [assets]);
  const [pickedAssetId, setPickedAssetId] = useState<string | null>(null);
  const [assetsDrawerOpen, setAssetsDrawerOpen] = useState(false);
  const [showSessionStart, setShowSessionStart] = useState(false);
  const [liveSessionTitle, setLiveSessionTitle] = useState('');
  const [liveSessionNote, setLiveSessionNote] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isPanActive, setIsPanActive] = useState(false);
  const [autoExitDrawing, setAutoExitDrawing] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [customArInput, setCustomArInput] = useState('');
  const [customArModal, setCustomArModal] = useState(false);
  const [showSocialUI, setShowSocialUI] = useState(false);
  const [maskOpacity, setMaskOpacity] = useState<number>(0.6); // 0 = transparent, 0.6 = standard, 1.0 = solid blackout
  const [activeToolbarTab, setActiveToolbarTab] = useState<'annotate' | 'frame'>('annotate');

  // Auto-switch aspect ratio when a device frame is selected
  const handleDeviceFrameChange = (df: 'none' | 'tv' | 'mobile' | 'instagram') => {
    setDeviceFrame(df);
    if (df === 'tv') {
      setArOverride('16:9');
    } else if (df === 'mobile') {
      setArOverride('9:16');
    } else if (df === 'instagram') {
      // Default to 4:5 or 1:1 or 9:16 for IG
      if (!arOverride || arOverride === '16:9') {
        setArOverride('4:5');
      }
    }
  };

  // Resolve effective aspect ratio: arOverride > project setting > detected from video
  const effectiveAr = useMemo(() => {
    if (arOverride) {
      const parts = arOverride.split(':').map(Number);
      if (parts.length === 2 && parts[0] && parts[1]) return parts[0] / parts[1];
    }
    const prjAr = project?.aspectRatio;
    if (prjAr) {
      const parts = prjAr.split(':').map(Number);
      if (parts.length === 2 && parts[0] && parts[1]) return parts[0] / parts[1];
    }
    return aspect;
  }, [arOverride, project?.aspectRatio, aspect]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const onBreakpointChange = (event: MediaQueryListEvent) => setCommentsOpen(event.matches);
    media.addEventListener('change', onBreakpointChange);
    return () => media.removeEventListener('change', onBreakpointChange);
  }, []);

  const company = state.companies.find((item) => item.id === project?.companyId) ?? state.companies[0];
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
      // Also save as an asset so it appears in the Assets tab
      await addAsset(file, {
        title: `${version} — ${file.name}`,
        category: 'video',
        note: `Uploaded from Review — version ${version}`
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

  const mentionCandidates = useMemo(
    () =>
      (project?.memberIds ?? [])
        .map((id) => memberMap.get(id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m) && m!.id !== actorId),
    [project?.memberIds, memberMap, actorId]
  );

  const comments = useMemo(
    () =>
      state.comments
        .filter((c) => {
          if (c.projectId !== project?.id || c.version !== version) return false;
          if (pickedAssetId) {
            // When an asset is picked, show comments for this asset or general version comments
            return !c.assetId || c.assetId === pickedAssetId;
          }
          return !c.assetId;
        })
        .sort((a, b) => a.tc - b.tc),
    [state.comments, project?.id, version, pickedAssetId]
  );

  const activeSession = useMemo(
    () => state.sessions.find((session) => session.projectId === projectId && session.version === version && !session.endedAt),
    [projectId, state.sessions, version]
  );
  const activeSessionId = activeSession?.id;
  const activeSessionHostId = activeSession?.hostId;
  const pendingControlRequesterId = activeSession?.controlRequests?.[0];
  const pendingControlRequester = pendingControlRequesterId
    ? memberMap.get(pendingControlRequesterId)?.name ?? (pendingControlRequesterId.startsWith('guest-') ? 'Guest' : 'Reviewer')
    : null;

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
    if (!linkedCommentId) return;
    const linkedComment = comments.find((comment) => comment.id === linkedCommentId);
    if (!linkedComment) return;
    setActiveId(linkedComment.id);
    setCommentsOpen(true);
    seek(linkedComment.tc);
  }, [comments, linkedCommentId, seek]);

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
    if (tool !== 'select') {
      videoRef.current?.pause();
    }
  }, [tool]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !projectId) return;
    const roomId = `${projectId}-${version}`;
    const controlsPlayback = Boolean(activeSessionId && activeSessionHostId === actorId);
    let lastTimeSent = 0;
    let applyingRemote = false;
    let applyingRemoteState = false;

    const applyPlayback = (message: { action: string; time: number; sessionId: string }) => {
      if (controlsPlayback || !activeSessionId || message.sessionId !== activeSessionId) return;
      applyingRemote = true;
      if (Math.abs(video.currentTime - message.time) > 0.08) video.currentTime = message.time;
      if (message.action === 'play') void video.play().catch(() => undefined);
      if (message.action === 'pause') video.pause();
      window.setTimeout(() => {
        applyingRemote = false;
      }, 100);
    };

    const connection = connectReviewRealtime(roomId, actorId, {
      onStatus: (connected, detail) => {
        setRealtimeConnected(connected);
        if (detail) setRealtimeDetail(detail);
      },
      onMessage: (message) => {
        if (message.type === 'welcome') {
          if (message.state) {
            applyingRemoteState = true;
            actions.replaceRealtimeState(message.state);
            applyingRemoteState = false;
          } else {
            connection.send({ type: 'state', state: getAppState() });
          }
          if (message.playback) applyPlayback(message.playback);
        } else if (message.type === 'state' && message.senderId !== actorId) {
          applyingRemoteState = true;
          actions.replaceRealtimeState(message.state);
          applyingRemoteState = false;
        } else if (message.type === 'playback' && message.senderId !== actorId) {
          applyPlayback(message);
        } else if (message.type === 'presence') {
          setLiveParticipants(message.participants);
          if (activeSessionId && activeSessionHostId === actorId) actions.addSessionParticipants(activeSessionId, message.participants, actorId);
        }
      },
    });

    const unsubscribeState = subscribeToState(() => {
      if (!applyingRemoteState) connection.send({ type: 'state', state: getAppState() });
    });

    const send = (action: 'play' | 'pause' | 'seek' | 'time') => {
      if (!controlsPlayback || applyingRemote || !activeSessionId) return;
      if (action !== 'time') actions.addSessionEvent(activeSessionId, action, actorId, video.currentTime);
      connection.send({ type: 'playback', action, time: video.currentTime, sessionId: activeSessionId });
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

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeek);
      video.removeEventListener('timeupdate', onTime);
      unsubscribeState();
      connection.close();
    };
  }, [activeSessionHostId, activeSessionId, actorId, projectId, version]);

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
    setSelectedLayerId(null);
    setCommentsOpen(true);
  };

  const canAnnotate = guest || can('reviews.annotate');
  const canPost = canComment;

  const post = async (payload: { kind: 'frame' | 'range'; tc: number; rangeEnd?: number; text: string; mentions?: string[]; checklist?: ChecklistItem[] }) => {
    if (!project) return;
    const draftLayers = state.layers.filter((layer) => layer.commentId === DRAFT && layer.visible);
    const thumbnail = videoRef.current ? await renderCommentThumbnail(videoRef.current, draftLayers) : null;
    const fallbackThumb = getThumb() || undefined;
    const rec = actions.addComment({
      projectId: project.id,
      version,
      assetId: pickedAssetId ?? undefined,
      authorId: actorId,
      kind: payload.kind,
      tc: payload.tc,
      rangeEnd: payload.rangeEnd,
      text: payload.text,
      cleanThumb: thumbnail?.clean ?? fallbackThumb,
      thumb: thumbnail?.annotated ?? thumbnail?.clean ?? fallbackThumb,
      mentions: payload.mentions,
      checklist: payload.checklist
    });
    void saveCommentThumbnail(
      rec.id,
      thumbnail?.clean ?? fallbackThumb,
      thumbnail?.annotated ?? thumbnail?.clean ?? fallbackThumb
    ).catch(() => {
      window.dispatchEvent(new CustomEvent('augmentoria:persistence-error'));
    });
    actions.attachDraftLayers(DRAFT, rec.id);
    setActiveId(rec.id);
    setSelectedLayerId(null);
    setTool('select');
  };

  const resolvedVersion = version;

  if (!project) {
    return <NotFoundPage />;
  }

  if (!project.versions.some((row) => row.v === version)) {
    return <NotFoundPage />;
  }

  if (!guest && !projectInUserScope(state, user, project)) {
    return <NotFoundPage />;
  }

  const pickedAsset = videoAssets.find((a) => a.id === pickedAssetId);
  const fallbackDemo = defaultVideo(project.id, version);
  const usingDemo = !customVideo && !pickedAsset && Boolean(fallbackDemo);
  const src = customVideo?.url ?? pickedAsset?.url ?? fallbackDemo;

  return (
    <div className="review-workspace flex h-[100dvh] overflow-hidden flex-col bg-bg text-ink">
      {!guest && (
        <Link
          to={`/app/projects/${project.id}`}
          aria-label={lang === 'ar' ? 'العودة للمشروع' : 'Back to project'}
          title={lang === 'ar' ? 'العودة للمشروع' : 'Back to project'}
          className="fixed start-2 top-2 z-[65] flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/95 text-muted shadow-lg backdrop-blur-sm transition-colors hover:border-accent hover:text-accent sm:hidden"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rtl:rotate-180">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
      {/* Guest info banner: media upload remains browser-local until cloud storage is connected. */}
      {guest && usingDemo && (
        <div className="hidden md:flex shrink-0 bg-amber-400/15 border-b border-amber-400/30 px-4 py-2 text-[11px] text-amber-300 items-center gap-2">
          <span>ℹ️</span>
          <span>
            {lang === 'ar'
              ? isSupabaseConfigured
                ? 'أنت تشاهد فيديو تجريبيًا — التعليقات متزامنة لحظيًا، بينما الفيديو المرفوع يظل على هذا المتصفح حتى ربط التخزين السحابي.'
                : 'أنت تشاهد نسخة تجريبية — الفيديو المرفوع والتعليقات الحية متاحة فقط داخل نفس المتصفح.'
              : isSupabaseConfigured
                ? 'You\'re viewing a demo video — comments sync live, while uploaded media stays in this browser until cloud storage is connected.'
                : 'You\'re viewing a demo — uploaded video and live comments are only visible within the same browser session.'}
          </span>
        </div>
      )}
      <header className="review-header hidden sm:flex h-11 sm:h-14 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-line px-2 sm:px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {!guest && (
            <Link to="/app/projects" aria-label={lang === 'ar' ? 'العودة للمشاريع' : 'Back to projects'} title={lang === 'ar' ? 'العودة للمشاريع' : 'Back to projects'} className="rounded-full border border-line p-2 text-muted transition-colors hover:border-accent hover:text-accent">
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
              <span className="text-[10px] tracking-wider text-muted/60 uppercase">{pro ? (lang === 'ar' ? 'مراجعة احترافية موحدة' : 'Unified Pro Review') : t('nav_reviews')}</span>
              <div className="flex gap-1">
                {project.versions.map((ver) => {
                  const className = `rounded px-1.5 py-0.5 font-mono text-[9px] font-bold transition-colors ${
                    ver.v !== version ? 'max-sm:hidden' : ''
                  } ${ver.v === version ? 'bg-accent/15 text-accent' : 'text-muted/35'}`;

                  return guest ? (
                    <span
                      key={ver.v}
                      className={className}
                      aria-current={ver.v === version ? 'page' : undefined}
                      title={
                        ver.v === version
                          ? undefined
                          : lang === 'ar'
                            ? 'اطلب رابط مشاركة خاصًا بهذه النسخة'
                            : 'Ask for a share link for this version'
                      }
                    >
                      {ver.v}
                    </span>
                  ) : (
                    <Link
                      key={ver.v}
                      to={`/studio/review/${project.id}/${ver.v}`}
                      className={`${className} ${ver.v === version ? '' : 'hover:text-accent'}`}
                    >
                      {ver.v}
                    </Link>
                  );
                })}
              </div>
              {guest && <span className="hidden text-[10px] text-muted/50 sm:inline">· {t('rv_guest_mode')}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(activeSession || isSupabaseConfigured) && (
            <span
              title={realtimeConnected ? `${liveParticipants.length} connected participant(s)` : realtimeDetail}
              className={`hidden rounded-full border px-2.5 py-1 text-[10px] font-bold sm:inline-flex ${
                realtimeConnected ? 'border-emerald-400/40 text-emerald-300' : 'border-orange-400/35 text-orange-300'
              }`}
            >
              {realtimeConnected ? `● ${lang === 'ar' ? 'مباشر' : 'Live'} · ${liveParticipants.length}` : `○ ${lang === 'ar' ? 'وضع محلي' : 'Local fallback'}`}
            </span>
          )}
          <button
            type="button"
            aria-controls="review-comments"
            aria-expanded={commentsOpen}
            onClick={() => setCommentsOpen((open) => !open)}
            className={`hidden rounded-full border px-3 py-1 text-xs font-semibold transition-colors md:block ${
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
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
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
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              ✂ {lang === 'ar' ? 'المونتاج' : 'Editor'}
            </Link>
          )}
          {!guest && pro && (
            <Link to="/app/settings" className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent">
              ⚙ {lang === 'ar' ? 'الإعدادات الموحدة' : 'Unified settings'}
            </Link>
          )}
          {usingDemo && (
            <span className="hidden rounded-full bg-orange-400/10 px-2.5 py-1 text-[10px] font-medium text-orange-300 xl:block" title={t('rv_demo_hint')}>
              {t('rv_demo_clip')}
            </span>
          )}
          {canExport && (
            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
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
              type="button"
              onClick={() => setShareOpen(true)}
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
            >
              🔗 {t('rv_share')}
            </button>
          )}

          {canHostSession && !activeSession && (
            <button
              type="button"
              onClick={() => setShowSessionStart(true)}
              className="rounded-full border border-emerald-400/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/10"
            >
              ● {lang === 'ar' ? 'ابدأ Live' : 'Start Live'}
            </button>
          )}
          {activeSession && activeSession.hostId === actorId && pendingControlRequesterId && (
            <button
              type="button"
              onClick={() => actions.takeSessionControl(activeSession.id, pendingControlRequesterId, actorId)}
              className="rounded-full border border-orange-400/40 px-3 py-1.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-400/10"
            >
              {lang === 'ar' ? `قبول تحكم ${pendingControlRequester}` : `Accept ${pendingControlRequester}'s control request`}
            </button>
          )}
          {activeSession && canHostSession && (
            <button
              onClick={() => {
                if (activeSession.hostId === user.id) actions.endSession(activeSession.id, user.id);
                else actions.takeSessionControl(activeSession.id, user.id, user.id);
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
          {activeSession && guest && activeSession.hostId !== actorId && (
            <button
              type="button"
              disabled={activeSession.controlRequests?.includes(actorId)}
              onClick={() => actions.requestSessionControl(activeSession.id, actorId)}
              className="rounded-full border border-orange-400/40 px-3 py-1.5 text-xs font-semibold text-orange-300 transition-colors hover:bg-orange-400/10 disabled:opacity-50"
            >
              {activeSession.controlRequests?.includes(actorId)
                ? lang === 'ar' ? 'تم طلب التحكم' : 'Control requested'
                : lang === 'ar' ? 'طلب التحكم' : 'Request control'}
            </button>
          )}
          {activeSession && guest && activeSession.hostId === actorId && (
            <span className="rounded-full border border-emerald-400/40 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              🎮 {lang === 'ar' ? 'أنت متحكم' : 'You have control'}
            </span>
          )}
        </div>
      </header>

      {/* Unified Compact Sub-Header Bar (Decision status, actions & Video Assets in one sleek row) */}
      {((canDecide || latestDecision) || videoAssets.length > 0) && (
        <div className="review-sub-header hidden md:flex h-9 shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-line bg-surface/60 px-3 py-1 text-xs backdrop-blur-sm sm:px-4 lg:px-5">
          {/* Left / Start: Decision Status or Project Assets */}
          <div className="flex items-center gap-2 overflow-x-auto min-w-0">
            {(canDecide || latestDecision) && (
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                    latestDecision?.decision === 'approved'
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                      : latestDecision?.decision === 'changes'
                        ? 'border-orange-400/40 bg-orange-400/10 text-orange-300'
                        : 'border-line bg-bg/50 text-muted'
                  }`}
                >
                  {latestDecision?.decision === 'approved'
                    ? lang === 'ar' ? 'تم الاعتماد' : 'Approved'
                    : latestDecision?.decision === 'changes'
                      ? lang === 'ar' ? 'تعديلات مطلوبة' : 'Changes requested'
                      : lang === 'ar' ? 'في انتظار القرار' : 'Awaiting decision'}
                </span>
                {latestDecision && (
                  <span className="hidden truncate text-[10px] text-muted xl:inline">
                    {state.members.find((member) => member.id === latestDecision.actorId)?.name ?? 'Client'}
                    {latestDecision.note ? ` · ${latestDecision.note}` : ''}
                  </span>
                )}
              </div>
            )}

            {/* Divider if both exist */}
            {(canDecide || latestDecision) && videoAssets.length > 0 && (
              <span className="h-4 w-px bg-line/80 shrink-0" />
            )}

            {/* Video Assets Drawer Open Button & Quick Indicator */}
            {videoAssets.length > 0 && (
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setAssetsDrawerOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-accent hover:bg-accent/20 transition-all shadow-sm"
                >
                  🎬 {lang === 'ar' ? 'مكتبة الفيديوهات' : 'Project Videos'} ({videoAssets.length})
                  <span className="truncate max-w-[120px] opacity-80">
                    · {pickedAsset?.name ?? (customVideo?.name ?? 'Main Video')}
                  </span>
                </button>

                {videoAssets.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompareA(pickedAsset?.id ?? videoAssets[0].id);
                      setCompareB(videoAssets.find((x) => x.id !== (pickedAsset?.id ?? videoAssets[0].id))?.id ?? videoAssets[1].id);
                      setCompareOpen(true);
                    }}
                    className="shrink-0 rounded-full border border-accent/40 bg-accent/5 px-2 py-0.5 text-[10px] font-bold text-accent hover:bg-accent/15"
                  >
                    ⇄ {lang === 'ar' ? 'مقارنة' : 'Compare'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right / End: Decision Action Buttons */}
          {canDecide && (
            <div className="flex items-center gap-1.5 shrink-0 ms-auto">
              <button
                type="button"
                onClick={() => {
                  setDecisionNote('');
                  setDecisionOpen('changes');
                }}
                className="rounded-full border border-orange-400/40 px-2.5 py-1 text-[10px] font-bold text-orange-300 transition-colors hover:bg-orange-400/10"
              >
                {lang === 'ar' ? 'طلب تعديلات' : 'Request changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDecisionNote('');
                  setDecisionOpen('approved');
                }}
                className="rounded-full bg-emerald-400 px-3 py-1 text-[10px] font-black text-bg transition-colors hover:bg-emerald-300 shadow-sm"
              >
                ✓ {lang === 'ar' ? 'اعتماد النسخة' : 'Approve version'}
              </button>
            </div>
          )}
        </div>
      )}

      <ShareReviewDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        projectId={project.id}
        version={resolvedVersion}
        lang={lang}
      />

      {/* Compare picker modal */}
      {compareOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={() => setCompareOpen(false)}>
          <section className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <h2 className="font-display mb-4 text-base font-black">{lang === 'ar' ? '⇄ اختر فيديوهين للمقارنة' : '⇄ Select two videos to compare'}</h2>
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] font-bold tracking-wider text-muted uppercase">A</p>
              <div className="flex flex-col gap-1.5">
                {videoAssets.map((a) => (
                  <button key={a.id} type="button" onClick={() => setCompareA(a.id)}
                    className={`rounded-lg border px-3 py-2 text-start text-xs transition-colors ${compareA === a.id ? 'border-accent bg-accent/10 text-accent font-bold' : 'border-line text-muted hover:text-ink'}`}
                  >
                    {compareA === a.id ? '✓ ' : ''}{a.title || a.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="mb-1.5 text-[10px] font-bold tracking-wider text-muted uppercase">B</p>
              <div className="flex flex-col gap-1.5">
                {videoAssets.filter((a) => a.id !== compareA).map((a) => (
                  <button key={a.id} type="button" onClick={() => setCompareB(a.id)}
                    className={`rounded-lg border px-3 py-2 text-start text-xs transition-colors ${compareB === a.id ? 'border-rose-400 bg-rose-400/10 text-rose-300 font-bold' : 'border-line text-muted hover:text-ink'}`}
                  >
                    {compareB === a.id ? '✓ ' : ''}{a.title || a.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCompareOpen(false)} className="flex-1 rounded-full border border-line py-2 text-xs text-muted hover:text-ink">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!compareA || !compareB}
                onClick={() => {
                  if (compareA && compareB) {
                    window.open(`/studio/asset-compare/${project.id}/${compareA}/${compareB}`, '_blank');
                    setCompareOpen(false);
                  }
                }}
                className="flex-[2] rounded-full bg-accent py-2 text-xs font-black text-bg disabled:opacity-40"
              >
                ⇄ {lang === 'ar' ? 'افتح المقارنة' : 'Open compare'}
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="review-body relative flex min-h-0 flex-1 overflow-hidden">
        <main className="review-main relative flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 p-1 sm:gap-3 sm:p-4 lg:p-5">
          <div className="review-player-wrap relative flex min-h-0 flex-1">
            <Player
              src={src}
              videoRef={videoRef}
              onTime={setTime}
              markers={markers}
              onMarkerClick={onMarkerClick}
              onMeta={(vw, vh) => setAspect(vw / vh)}
              fitMode={fitMode}
              aspect={effectiveAr}
              deviceFrame={deviceFrame}
              panOffset={panOffset}
              onPanChange={setPanOffset}
              zoomScale={zoomScale}
              onZoomChange={setZoomScale}
              rotationAngle={rotationAngle}
              isPanActive={isPanActive}
              showSocialUI={showSocialUI}
              maskOpacity={maskOpacity}
              onOpenAssets={() => setAssetsDrawerOpen(true)}
              onUploadVideo={canUploadVideo ? () => uploadRef.current?.click() : undefined}
              videoAssetsCount={videoAssets.length}
            >
              <OverlayLayer
                tool={tool}
                color={color}
                layers={visibleLayers}
                draftKey={DRAFT}
                canDraw={canAnnotate && tool !== 'select'}
                canTransform={canModerate}
                aspect={effectiveAr}
                onAdd={(l) => actions.addLayer(l)}
                onUpdate={actions.updateLayer}
                onDelete={(id) => {
                  if (canModerate) actions.deleteLayer(id);
                }}
                selectedLayerId={selectedLayerId}
                onSelectLayerId={setSelectedLayerId}
                onDoneDrawing={() => {
                  if (autoExitDrawing) {
                    setTool('select');
                  }
                }}
              />
            </Player>

            <div className="absolute start-4 top-4 z-30 flex items-center gap-2">
              <LogoPill name={project.client} logo={state.clients.find((c) => c.name === project.client)?.logo} domain={state.clients.find((c) => c.name === project.client)?.domain} />
            </div>
          </div>

          {/* Unified Pro Bottom Controls Bar (Drawing & Annotation | Frame & Aspect Ratio) */}
          <div className="review-bottom-dock flex flex-col gap-1.5 rounded-xl border border-line bg-surface/95 p-2 shadow-xl backdrop-blur-md">
            {/* Header Tabs: [ ✏ الرسم والملاحظات ] vs [ 📐 الكادر والأبعاد والمنصات ] */}
            <div className="flex items-center justify-between border-b border-line/50 pb-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveToolbarTab('annotate')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                    activeToolbarTab === 'annotate'
                      ? 'bg-accent text-bg shadow-sm'
                      : 'text-muted hover:bg-bg hover:text-ink'
                  }`}
                >
                  ✏ {lang === 'ar' ? 'الرسم والتعليق' : 'Draw & Annotate'}
                </button>
                {!guest && (
                  <button
                    type="button"
                    onClick={() => setActiveToolbarTab('frame')}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                      activeToolbarTab === 'frame'
                        ? 'bg-accent text-bg shadow-sm'
                        : 'text-muted hover:bg-bg hover:text-ink'
                    }`}
                  >
                    📐 {lang === 'ar' ? 'الكادر والنسب (Aspect Ratio)' : 'Frame & Aspect Ratio'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Reset Video Transforms button if modified */}
                {(panOffset.x !== 0 || panOffset.y !== 0 || zoomScale !== 1 || rotationAngle !== 0 || arOverride) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPanOffset({ x: 0, y: 0 });
                      setZoomScale(1);
                      setRotationAngle(0);
                      setArOverride(null);
                    }}
                    title={lang === 'ar' ? 'إعادة ضبط كل التعديلات' : 'Reset all transforms'}
                    className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 hover:bg-amber-400/20"
                  >
                    🎯 {lang === 'ar' ? 'إعادة ضبط' : 'Reset'}
                  </button>
                )}
                <span className="hidden font-mono text-[10px] text-muted/50 lg:inline">
                  {lang === 'ar' ? 'Space تشغيل · Drag بالماوس تحريك' : 'Space play · Middle-drag pan'}
                </span>
              </div>
            </div>

            {/* TAB 1: Annotate & Draw Tools */}
            {activeToolbarTab === 'annotate' && canAnnotate && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {/* Drawing Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoExitDrawing((v) => !v)}
                  title={lang === 'ar' ? 'تفعيل / إيقاف الخروج التلقائي لوضع التحديد بعد الرسم' : 'Toggle auto-exit drawing mode after adding a shape'}
                  className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    autoExitDrawing
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-line/70 bg-bg text-muted hover:text-ink'
                  }`}
                >
                  {autoExitDrawing ? '🔒 ' + (lang === 'ar' ? 'رسم مفرد' : 'Single Draw') : '♾️ ' + (lang === 'ar' ? 'رسم مستمر' : 'Continuous Draw')}
                </button>

                <span className="mx-0.5 h-4 w-px bg-line" />

                {tool === 'select' ? (
                  <>
                    <span className="text-[10px] font-bold tracking-widest text-muted/60 uppercase">
                      {t('rv_annotate')}:
                    </span>
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
                        title={t(`rv_tool_${tl}` as never)}
                        onClick={() => {
                          setTool(tl);
                          setAnnotationToolsOpen(false);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-all hover:border-accent hover:text-accent"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d={path} />
                        </svg>
                      </button>
                    )))}
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">
                      ✏ {t(`rv_tool_${tool}` as never)}
                    </span>

                    <span className="mx-0.5 h-5 w-px bg-line" />

                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        aria-label={c}
                        className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface' : ''}`}
                        style={{ backgroundColor: c, ...(color === c ? ({ ['--tw-ring-color']: c } as React.CSSProperties) : {}) }}
                      />
                    ))}

                    <span className="mx-0.5 h-5 w-px bg-line" />

                    <button
                      onClick={() => {
                        const drafts = state.layers.filter((l) => l.commentId === DRAFT);
                        const last = drafts[drafts.length - 1];
                        if (last) actions.deleteLayer(last.id);
                      }}
                      title={t('rv_undo')}
                      className="rounded-lg border border-line px-2.5 py-1 text-[10px] text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      ↶ {t('rv_undo')}
                    </button>
                    <button
                      onClick={() => actions.clearDraftLayers(DRAFT)}
                      title={t('rv_clear')}
                      className="rounded-lg border border-line px-2.5 py-1 text-[10px] text-muted transition-colors hover:border-red-400 hover:text-red-400"
                    >
                      🗑 {t('rv_clear')}
                    </button>

                    <button
                      onClick={() => setTool('select')}
                      className="ms-auto flex items-center gap-1.5 rounded-full bg-emerald-400 px-4 py-1.5 text-xs font-bold text-bg transition-all hover:bg-emerald-300"
                    >
                      ✓ {t('rv_done_drawing')}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: Frame, Aspect Ratio, Device Presets & Video Transforms */}
            {activeToolbarTab === 'frame' && !guest && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {/* Aspect Ratio Presets */}
                <div className="flex items-center gap-1">
                  <span className="shrink-0 text-[10px] font-bold tracking-widest text-muted/60 uppercase">
                    {t('rv_ar_label')}:
                  </span>
                  {(['16:9', '9:16', '1:1', '4:5', '4:3', '2.39:1'] as const).map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => setArOverride((prev) => (prev === ar ? null : ar))}
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                        arOverride === ar
                          ? 'bg-accent text-bg font-bold'
                          : 'border border-line/70 bg-bg text-muted hover:border-accent/60 hover:text-ink'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomArInput(arOverride ?? '');
                      setCustomArModal(true);
                    }}
                    title={lang === 'ar' ? 'إدخال نسبة مخصصة' : 'Custom Aspect Ratio'}
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                      arOverride && !['16:9', '9:16', '1:1', '4:5', '4:3', '2.39:1'].includes(arOverride)
                        ? 'bg-accent text-bg font-bold'
                        : 'border border-dashed border-line bg-bg text-muted hover:text-accent'
                    }`}
                  >
                    + {arOverride && !['16:9', '9:16', '1:1', '4:5', '4:3', '2.39:1'].includes(arOverride) ? arOverride : lang === 'ar' ? 'مخصص' : 'Custom'}
                  </button>
                </div>

                <span className="mx-0.5 h-4 w-px bg-line" />

                {/* Fit Mode */}
                <div className="flex items-center gap-1">
                  {(['contain', 'fill', 'cover'] as const).map((fm) => (
                    <button
                      key={fm}
                      type="button"
                      onClick={() => setFitMode(fm)}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                        fitMode === fm
                          ? 'border border-accent/60 bg-accent/15 text-accent font-bold'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {t(`rv_fit_${fm}` as never)}
                    </button>
                  ))}
                </div>

                <span className="mx-0.5 h-4 w-px bg-line" />

                {/* Device Frames */}
                <div className="flex items-center gap-1">
                  {(['none', 'tv', 'mobile', 'instagram'] as const).map((df) => (
                    <button
                      key={df}
                      type="button"
                      onClick={() => handleDeviceFrameChange(df)}
                      title={t(`rv_device_${df}` as never)}
                      className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
                        deviceFrame === df
                          ? 'border border-accent bg-accent/20 text-accent font-bold'
                          : 'border border-line/60 bg-bg/60 text-muted hover:text-ink'
                      }`}
                    >
                      {df === 'none'
                        ? (lang === 'ar' ? '⬜ عادي' : '⬜ Normal')
                        : df === 'tv'
                          ? `📺 ${lang === 'ar' ? 'تلفزيون' : 'TV'}`
                          : df === 'mobile'
                            ? `📱 ${lang === 'ar' ? 'موبايل' : 'Mobile'}`
                            : `🟨 ${lang === 'ar' ? 'إنستجرام' : 'Instagram'}`}
                    </button>
                  ))}
                </div>

                <span className="mx-0.5 h-4 w-px bg-line" />

                {/* Mask Opacity Selector */}
                <div className="flex items-center gap-1 rounded-lg border border-line/80 bg-bg px-2 py-0.5">
                  <span className="text-[9px] font-bold text-muted/70 uppercase">
                    {lang === 'ar' ? 'تظليل الفريم' : 'Mask'}:
                  </span>
                  {[
                    { label: '0%', val: 0, title: lang === 'ar' ? 'شفاف' : 'Transparent' },
                    { label: '50%', val: 0.5, title: lang === 'ar' ? 'نصفي' : 'Half' },
                    { label: '80%', val: 0.8, title: lang === 'ar' ? 'داكن' : 'Dark' },
                    { label: '100%', val: 1.0, title: lang === 'ar' ? 'سواد كامل' : 'Solid' }
                  ].map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setMaskOpacity(m.val)}
                      title={m.title}
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] transition-colors ${
                        maskOpacity === m.val
                          ? 'bg-accent text-bg font-bold'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <span className="mx-0.5 h-4 w-px bg-line" />

                {/* Pan, Zoom, Rotate, Social UI */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsPanActive((v) => !v)}
                    title={lang === 'ar' ? 'تفعيل تحريك الفيديو بالسحب' : 'Toggle drag pan'}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      isPanActive
                        ? 'border border-emerald-400 bg-emerald-400/20 text-emerald-300 font-bold'
                        : 'border border-line/60 bg-bg text-muted hover:text-ink'
                    }`}
                  >
                    🖐 {isPanActive ? (lang === 'ar' ? 'تحريك مفعل' : 'Panning') : (lang === 'ar' ? 'تحريك' : 'Pan')}
                  </button>

                  <div className="flex items-center gap-1 rounded-md border border-line bg-bg px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => setZoomScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))}
                      className="font-bold text-[10px] text-muted hover:text-ink"
                    >
                      −
                    </button>
                    <span className="font-mono text-[9px] font-bold text-muted w-6 text-center">
                      {Math.round(zoomScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomScale((s) => Math.min(3, +(s + 0.1).toFixed(2)))}
                      className="font-bold text-[10px] text-muted hover:text-ink"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRotationAngle((r) => (r + 90) % 360)}
                    className="rounded border border-line/60 bg-bg px-2 py-0.5 font-mono text-[10px] text-muted hover:text-ink"
                  >
                    ↻ {rotationAngle !== 0 ? `${rotationAngle}°` : lang === 'ar' ? 'تدوير' : 'Rotate'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSocialUI((v) => !v)}
                    className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      showSocialUI || deviceFrame === 'instagram'
                        ? 'border border-purple-400 bg-purple-400/20 text-purple-300 font-bold'
                        : 'border border-line/60 bg-bg text-muted hover:text-ink'
                    }`}
                  >
                    💬 {lang === 'ar' ? 'واجهة السوشيال' : 'Social UI'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {tool === 'select' && !annotationToolsOpen && (
            <div className="review-mobile-actions flex shrink-0 gap-2 py-0.5 lg:hidden">
              {canAnnotate && (
                <button
                  type="button"
                  onClick={() => setAnnotationToolsOpen(true)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 sm:py-2.5 text-xs font-bold text-muted"
                >
                  ✏ {t('rv_annotate')}
                </button>
              )}
              <button
                type="button"
                aria-controls="review-comments"
                aria-expanded={commentsOpen}
                onClick={() => setCommentsOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-surface px-3 py-1.5 sm:py-2.5 text-xs font-bold text-accent"
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
          onSelect={(id) => {
            setActiveId(id);
            setSelectedLayerId(null);
          }}
          onToggleResolve={canModerate ? (id) => actions.toggleCommentResolved(id, user.id) : () => {}}
          onReply={canPost ? (id, txt) => actions.addReply(id, actorId, txt, parseMentions(txt, mentionCandidates)) : () => {}}
          onDelete={
            canModerate
              ? (id) => {
                  const entryId = actions.deleteComment(id, user.id);
                  if (entryId) {
                    toast({
                      message: t('toast_comment_deleted'),
                      actionLabel: t('toast_undo'),
                      onAction: () => {
                        if (actions.restoreFromTrash(entryId, user.id)) toast({ message: t('toast_restored'), tone: 'success' });
                      }
                    });
                  }
                }
              : () => {}
          }
          onPost={post}
          onDraftRange={setDraftRange}
          draftLayers={state.layers.filter((l) => l.commentId === DRAFT)}
          layers={state.layers.filter((layer) => comments.some((comment) => comment.id === layer.commentId))}
          onRemoveDraftLayer={actions.deleteLayer}
          onToggleDraftLayer={(id, visible) => actions.updateLayer(id, { visible })}
          layerCounts={layerCounts}
          mobileOpen={commentsOpen}
          onMobileClose={() => setCommentsOpen(false)}
          mentionCandidates={mentionCandidates}
          onToggleChecklist={(commentId, itemId) => actions.toggleChecklistItem(commentId, itemId, actorId)}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onDeleteLayer={canModerate ? actions.deleteLayer : undefined}
          canEditLayers={canModerate}
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
                  actions.recordApproval(project.id, version, actorId, decisionOpen, decisionNote, guest ? undefined : user);
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

      {/* Start Live Session dialog */}
      {showSessionStart && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setShowSessionStart(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-start-title"
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="session-start-title" className="font-display text-lg font-black text-emerald-300">
              ● {lang === 'ar' ? 'بدء جلسة مباشرة' : 'Start live session'}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {lang === 'ar' ? 'حدد اسم الجلسة وسبب انعقادها قبل البدء.' : 'Give this session a title and purpose before going live.'}
            </p>
            <div className="mt-4 space-y-3">
              <input
                autoFocus
                type="text"
                value={liveSessionTitle}
                onChange={(e) => setLiveSessionTitle(e.target.value)}
                placeholder={lang === 'ar' ? 'اسم الجلسة (مثال: مراجعة V03 مع العميل)' : 'Session title (e.g. V03 client review)'}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
              <textarea
                rows={2}
                value={liveSessionNote}
                onChange={(e) => setLiveSessionNote(e.target.value)}
                placeholder={lang === 'ar' ? 'هدف الجلسة (اختياري)…' : 'Session purpose / agenda (optional)…'}
                className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSessionStart(false)}
                className="flex-1 rounded-full border border-line py-2.5 text-xs text-muted hover:text-ink"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (projectId) {
                    const title = liveSessionTitle.trim() || `${version} Live Review`;
                    actions.startSession(projectId, version, user.id, title, liveSessionNote.trim());
                    setShowSessionStart(false);
                    setLiveSessionTitle('');
                    setLiveSessionNote('');
                  }
                }}
                className="flex-[2] rounded-full bg-emerald-400 py-2.5 text-xs font-black text-bg transition-colors hover:bg-emerald-300"
              >
                ● {lang === 'ar' ? 'ابدأ الآن' : 'Go live now'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Custom Aspect Ratio Dialog Modal */}
      {customArModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setCustomArModal(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-ar-title"
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="custom-ar-title" className="font-display text-base font-black text-accent">
              📐 {lang === 'ar' ? 'نسبة عرض إلى ارتفاع مخصصة' : 'Custom Aspect Ratio'}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {lang === 'ar' ? 'اكتب النسبة بصيغة W:H (مثال: 4:5, 18:9, 3:2, 21:9)' : 'Enter ratio as W:H (e.g. 4:5, 18:9, 3:2, 21:9)'}
            </p>
            <div className="mt-4">
              <input
                autoFocus
                type="text"
                value={customArInput}
                onChange={(e) => setCustomArInput(e.target.value)}
                placeholder="e.g. 4:5, 21:9, 1.85:1"
                dir="ltr"
                className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
              />
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {['4:5', '1.85:1', '21:9', '3:2', '18:9'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomArInput(preset)}
                    className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-muted hover:border-accent hover:text-accent"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setCustomArModal(false)}
                className="flex-1 rounded-full border border-line py-2.5 text-xs text-muted hover:text-ink"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!customArInput.trim()}
                onClick={() => {
                  const cleaned = customArInput.trim();
                  if (cleaned) {
                    setArOverride(cleaned);
                    setCustomArModal(false);
                  }
                }}
                className="flex-[2] rounded-full bg-accent py-2.5 text-xs font-black text-bg transition-colors hover:bg-accent-dim disabled:opacity-40"
              >
                ✓ {lang === 'ar' ? 'تطبيق النسبة' : 'Apply Ratio'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Project Video Assets Side Drawer with Interactive Hover-to-Play Video Thumbnails */}
      {assetsDrawerOpen && (
        <div
          className="fixed inset-0 z-[85] flex justify-end bg-black/70 backdrop-blur-sm transition-all"
          role="presentation"
          onClick={() => setAssetsDrawerOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="assets-drawer-title"
            className="flex h-full w-full max-w-sm flex-col border-s border-line bg-surface p-5 shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 id="assets-drawer-title" className="font-display text-base font-black text-ink flex items-center gap-2">
                  🎬 {lang === 'ar' ? 'فيديوهات المشروع والنسخ' : 'Project Video Assets'}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  {lang === 'ar' ? 'مرر الفأرة لمعاينة الفيديو قبل اختياره' : 'Hover to preview video before selecting'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssetsDrawerOpen(false)}
                className="rounded-full border border-line p-1.5 text-muted hover:border-accent hover:text-accent"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pe-1">
              {videoAssets.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted">
                  {lang === 'ar' ? 'لا توجد فيديوهات مضافة بعد' : 'No videos found in this project'}
                </p>
              ) : (
                videoAssets.map((asset) => {
                  const isSelected = (pickedAsset?.id ?? pickedAssetId) === asset.id;
                  const assetCommentsCount = state.comments.filter((c) => c.projectId === project?.id && c.version === version && c.assetId === asset.id).length;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => {
                        void handleAssetForReview(asset.id);
                        setAssetsDrawerOpen(false);
                      }}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/[0.08] shadow-md ring-1 ring-accent/30'
                          : 'border-line bg-bg/80 hover:border-accent/50 hover:bg-surface'
                      }`}
                    >
                      {/* Video Thumbnail with onMouseEnter Auto-Play */}
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-line/60 bg-black">
                        <video
                          src={asset.url}
                          muted
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => {
                            try {
                              void e.currentTarget.play();
                            } catch {
                              // Hover preview can be blocked until media metadata is ready.
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="pointer-events-none absolute bottom-2 end-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[9px] text-white backdrop-blur-xs">
                          ▶ {lang === 'ar' ? 'مرر للمعاينة' : 'Hover preview'}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 start-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-black text-bg shadow">
                            ✓ {lang === 'ar' ? 'نشط حالياً' : 'Active'}
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-xs font-bold text-ink group-hover:text-accent">
                          {asset.name}
                        </span>
                        <span className="shrink-0 rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] text-muted">
                          💬 {assetCommentsCount}
                        </span>
                      </div>

                      {asset.note && (
                        <p className="mt-1 line-clamp-1 text-[11px] text-muted">{asset.note}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 border-t border-line pt-3 flex gap-2">
              {canUploadVideo && (
                <button
                  type="button"
                  onClick={() => {
                    uploadRef.current?.click();
                    setAssetsDrawerOpen(false);
                  }}
                  className="flex-1 rounded-full border border-accent/40 bg-accent/10 py-2 text-xs font-bold text-accent hover:bg-accent/20 transition-colors"
                >
                  + {lang === 'ar' ? 'إضافة فيديو جديد' : 'Add New Video'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setAssetsDrawerOpen(false)}
                className="flex-1 rounded-full border border-line py-2 text-xs text-muted hover:text-ink transition-colors"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </aside>
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
