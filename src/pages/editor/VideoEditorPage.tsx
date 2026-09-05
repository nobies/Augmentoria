import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../i18n';
import { useProjectAssets } from '../../lib/assets';
import { mediaStorage } from '../../lib/mediaStorage';
import { projectInUserScope, useAppState } from '../../lib/store';
import type { AnnotationLayer } from '../../lib/store';
import { GoldMark } from '../../components/ui/bits';
import NotFoundPage from '../NotFoundPage';

type EditorClip = {
  id: string;
  source: string;
  name: string;
  kind?: 'video' | 'audio';
  in: number;
  out: number;
  speed: number;
  volume?: number;
  muted?: boolean;
};

type TimelineDocument = {
  clips: EditorClip[];
  overlayIds: string[];
  updatedAt: string;
};

const DEFAULT_TIMELINE: TimelineDocument = { clips: [], overlayIds: [], updatedAt: '' };

function timelineKey(projectId: string, version: string) {
  return `augmentoria-editor:${projectId}:${version}`;
}

function readTimeline(projectId: string, version: string) {
  try {
    const raw = localStorage.getItem(timelineKey(projectId, version));
    return raw ? (JSON.parse(raw) as TimelineDocument) : DEFAULT_TIMELINE;
  } catch {
    return DEFAULT_TIMELINE;
  }
}

export default function VideoEditorPage() {
  const { pid, v } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { lang } = useLang();
  const state = useAppState();
  const project = state.projects.find((row) => row.id === pid);
  const version = v ?? project?.currentVersion ?? 'V01';
  const { assets, add } = useProjectAssets(pid);
  const videoAssets = useMemo(() => assets.filter((asset) => asset.isVideo), [assets]);
  const mediaAssets = useMemo(() => assets.filter((asset) => asset.isVideo || asset.isAudio), [assets]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [timeline, setTimeline] = useState<TimelineDocument>(() => (pid ? readTimeline(pid, version) : DEFAULT_TIMELINE));
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [saved, setSaved] = useState(true);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const historyRef = useRef<TimelineDocument[]>([]);
  const futureRef = useRef<TimelineDocument[]>([]);
  const clipSequenceRef = useRef(0);
  const [, setHistoryRevision] = useState(0);

  const versionSource = useStoredVersionVideo(pid, version);
  const requestedAsset = search.get('asset');
  const requestedAssetName = videoAssets.find((asset) => asset.id === requestedAsset)?.name;

  useEffect(() => {
    if (!pid) return;
    const existing = readTimeline(pid, version);
    if (existing.clips.length > 0) {
      setTimeline(existing);
      setSelectedClipId(existing.clips[0].id);
      historyRef.current = [];
      futureRef.current = [];
      return;
    }
    const source = requestedAsset ? `asset:${requestedAsset}` : `version:${version}`;
    const name = requestedAssetName ?? `${version} review video`;
    const first: EditorClip = { id: `clip-${Date.now()}`, source, name, kind: 'video', in: 0, out: 0, speed: 1, volume: 1, muted: false };
    setTimeline({ clips: [first], overlayIds: [], updatedAt: '' });
    setSelectedClipId(first.id);
    historyRef.current = [];
    futureRef.current = [];
  }, [pid, requestedAsset, requestedAssetName, version]);

  useEffect(() => {
    if (!pid) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      const next = { ...timeline, updatedAt: new Date().toISOString() };
      localStorage.setItem(timelineKey(pid, version), JSON.stringify(next));
      setSaved(true);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pid, timeline, version]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) {
        const next = futureRef.current[0];
        if (!next) return;
        futureRef.current = futureRef.current.slice(1);
        historyRef.current = [...historyRef.current.slice(-49), timeline];
        setTimeline(next);
      } else {
        const previous = historyRef.current.at(-1);
        if (!previous) return;
        historyRef.current = historyRef.current.slice(0, -1);
        futureRef.current = [timeline, ...futureRef.current].slice(0, 50);
        setTimeline(previous);
      }
      setHistoryRevision((value) => value + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [timeline]);

  const selectedClip = timeline.clips.find((clip) => clip.id === selectedClipId) ?? timeline.clips[0];
  const selectedAssetId = selectedClip?.source.startsWith('asset:') ? selectedClip.source.slice(6) : null;
  const selectedAsset = mediaAssets.find((asset) => asset.id === selectedAssetId);
  const src = selectedClip?.source.startsWith('asset:') ? selectedAsset?.url ?? '' : versionSource;
  const selectedStart = selectedClip?.in ?? 0;
  const selectedSpeed = selectedClip?.speed ?? 1;
  const selectedVolume = selectedClip?.volume ?? 1;
  const selectedMuted = selectedClip?.muted ?? false;
  const versionComments = state.comments.filter((comment) => comment.projectId === pid && comment.version === version);
  const versionCommentIds = new Set(versionComments.map((comment) => comment.id));
  const commentById = new Map(versionComments.map((comment) => [comment.id, comment]));
  const reviewLayers = state.layers.filter((layer) => versionCommentIds.has(layer.commentId));
  const activeLayers = reviewLayers.filter((layer) => {
    if (!timeline.overlayIds.includes(layer.id)) return false;
    const comment = commentById.get(layer.commentId);
    if (!comment) return false;
    const end = comment.kind === 'range' ? comment.rangeEnd ?? comment.tc : comment.tc + 1 / 25;
    return playhead >= comment.tc && playhead <= end;
  });
  const reviewTrackEnd = Math.max(
    1,
    ...versionComments.map((comment) => comment.rangeEnd ?? comment.tc),
    ...timeline.clips.map((clip) => clip.out || 0)
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedClipId) return;
    video.playbackRate = selectedSpeed;
    video.volume = selectedVolume;
    video.muted = selectedMuted;
  }, [selectedClipId, selectedMuted, selectedSpeed, selectedVolume, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedClipId) return;
    const seek = selectedStart;
    if (Number.isFinite(seek)) video.currentTime = seek;
    setPlayhead(seek || 0);
  }, [selectedClipId, selectedStart, src]);

  if (!project || !projectInUserScope(state, user, project) || !project.versions.some((row) => row.v === version)) return <NotFoundPage />;

  const commitTimeline = (next: TimelineDocument) => {
    if (next === timeline) return;
    historyRef.current = [...historyRef.current.slice(-49), timeline];
    futureRef.current = [];
    setTimeline(next);
    setHistoryRevision((value) => value + 1);
  };

  const nextClipId = (suffix = '') => {
    clipSequenceRef.current += 1;
    return `clip-${version}-${clipSequenceRef.current}${suffix}`;
  };

  const undo = () => {
    const previous = historyRef.current.at(-1);
    if (!previous) return;
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [timeline, ...futureRef.current].slice(0, 50);
    setTimeline(previous);
    setHistoryRevision((value) => value + 1);
  };

  const redo = () => {
    const next = futureRef.current[0];
    if (!next) return;
    futureRef.current = futureRef.current.slice(1);
    historyRef.current = [...historyRef.current.slice(-49), timeline];
    setTimeline(next);
    setHistoryRevision((value) => value + 1);
  };

  const updateClip = (patch: Partial<EditorClip>) => {
    if (!selectedClip) return;
    commitTimeline({ ...timeline, clips: timeline.clips.map((clip) => (clip.id === selectedClip.id ? { ...clip, ...patch } : clip)) });
  };

  const addClip = (source: string, name: string, kind: EditorClip['kind'] = 'video') => {
    const clip: EditorClip = { id: nextClipId(), source, name, kind, in: 0, out: 0, speed: 1, volume: 1, muted: false };
    commitTimeline({ ...timeline, clips: [...timeline.clips, clip] });
    setSelectedClipId(clip.id);
  };

  const splitClip = () => {
    if (!selectedClip) return;
    const end = selectedClip.out || videoRef.current?.duration || 0;
    if (playhead <= selectedClip.in + 0.05 || playhead >= end - 0.05) return;
    const splitId = nextClipId();
    const left = { ...selectedClip, id: `${splitId}-a`, out: playhead, name: `${selectedClip.name} · A` };
    const right = { ...selectedClip, id: `${splitId}-b`, in: playhead, out: end, name: `${selectedClip.name} · B` };
    commitTimeline({ ...timeline, clips: timeline.clips.flatMap((clip) => (clip.id === selectedClip.id ? [left, right] : [clip])) });
    setSelectedClipId(right.id);
  };

  const removeClip = () => {
    if (!selectedClip) return;
    commitTimeline({ ...timeline, clips: timeline.clips.filter((clip) => clip.id !== selectedClip.id) });
    const index = timeline.clips.findIndex((clip) => clip.id === selectedClip.id);
    setSelectedClipId(timeline.clips[index + 1]?.id ?? timeline.clips[index - 1]?.id ?? null);
  };

  const moveClip = (delta: number) => {
    if (!selectedClip) return;
    const from = timeline.clips.findIndex((clip) => clip.id === selectedClip.id);
    const to = Math.min(timeline.clips.length - 1, Math.max(0, from + delta));
    if (from === to) return;
    const clips = [...timeline.clips];
    const [item] = clips.splice(from, 1);
    clips.splice(to, 0, item);
    commitTimeline({ ...timeline, clips });
  };

  const moveClipTo = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const from = timeline.clips.findIndex((clip) => clip.id === sourceId);
    const to = timeline.clips.findIndex((clip) => clip.id === targetId);
    if (from < 0 || to < 0) return;
    const clips = [...timeline.clips];
    const [item] = clips.splice(from, 1);
    clips.splice(to, 0, item);
    commitTimeline({ ...timeline, clips });
  };

  const downloadTimeline = (content: string, extension: 'json' | 'edl', type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name}-${version}-timeline.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTimeline = () => {
    downloadTimeline(JSON.stringify({ projectId: project.id, version, ...timeline }, null, 2), 'json', 'application/json');
  };

  const exportEdl = () => {
    let recordTime = 0;
    const rows = timeline.clips.flatMap((clip, index) => {
      const sourceOut = clip.out > clip.in ? clip.out : clip.in;
      const duration = Math.max(0, sourceOut - clip.in) / Math.max(0.01, clip.speed || 1);
      const recordOut = recordTime + duration;
      const track = clip.kind === 'audio' ? 'A' : 'V';
      const row = `${String(index + 1).padStart(3, '0')}  AX       ${track}     C        ${edlTime(clip.in)} ${edlTime(sourceOut)} ${edlTime(recordTime)} ${edlTime(recordOut)}`;
      recordTime = recordOut;
      return [row, `* FROM CLIP NAME: ${clip.name.replace(/[\r\n]+/g, ' ')}`];
    });
    downloadTimeline([`TITLE: ${project.name} ${version}`, 'FCM: NON-DROP FRAME', '', ...rows].join('\n'), 'edl', 'text/plain');
  };

  if (!can('versions.upload')) {
    return <div className="flex h-screen items-center justify-center bg-bg text-sm text-muted">You do not have permission to edit this project.</div>;
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label={lang === 'ar' ? 'العودة للمشروع' : 'Back to project'} onClick={() => navigate(`/app/projects/${project.id}`)} className="rounded-full border border-line p-2 text-muted hover:border-accent hover:text-accent">←</button>
          <GoldMark size={22} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{project.name} · <span className="font-mono text-accent">{version}</span></p>
            <p className="text-[10px] tracking-widest text-muted uppercase">{lang === 'ar' ? 'مونتاج فيديو غير هدّام' : 'Non-destructive video editor'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${saved ? 'text-emerald-300' : 'text-orange-300'}`}>{saved ? (lang === 'ar' ? '✓ محفوظ' : '✓ Saved') : (lang === 'ar' ? 'جاري الحفظ…' : 'Saving…')}</span>
          <button type="button" onClick={undo} disabled={historyRef.current.length === 0} aria-label={lang === 'ar' ? 'تراجع' : 'Undo'} className="rounded-full border border-line px-2.5 py-1.5 text-xs text-muted hover:text-accent disabled:opacity-30">↶</button>
          <button type="button" onClick={redo} disabled={futureRef.current.length === 0} aria-label={lang === 'ar' ? 'إعادة' : 'Redo'} className="rounded-full border border-line px-2.5 py-1.5 text-xs text-muted hover:text-accent disabled:opacity-30">↷</button>
          <Link to={`/studio/review/${project.id}/${version}`} className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent">▶ {lang === 'ar' ? 'الريفيو' : 'Review'}</Link>
          <button type="button" onClick={exportEdl} className="hidden rounded-full border border-accent/50 px-3 py-1.5 text-xs font-bold text-accent sm:block">EDL</button>
          <button type="button" onClick={exportTimeline} className="rounded-full bg-accent px-4 py-1.5 text-xs font-black text-bg">{lang === 'ar' ? 'تصدير الخطة' : 'Export timeline'}</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
        <aside className="hidden overflow-y-auto border-e border-line bg-surface/40 p-3 lg:block">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-black tracking-widest text-muted uppercase">{lang === 'ar' ? 'مكتبة الميديا' : 'Media bin'}</h2>
            <button type="button" onClick={() => uploadRef.current?.click()} className="rounded border border-line px-2 py-1 text-[10px] text-accent">+ {lang === 'ar' ? 'رفع' : 'Upload'}</button>
            <input ref={uploadRef} type="file" accept="video/*,audio/*" multiple hidden onChange={(event) => { if (event.target.files?.length) void add(event.target.files); event.target.value = ''; }} />
          </div>
          <button type="button" onClick={() => addClip(`version:${version}`, `${version} review video`)} className="mb-2 w-full rounded-lg border border-line p-2 text-start text-xs hover:border-accent">
            <span className="block font-mono font-bold text-accent">{version}</span>
            <span className="mt-1 block truncate text-[10px] text-muted">{lang === 'ar' ? 'فيديو الريفيو المعيّن' : 'Assigned review video'}</span>
          </button>
          <div className="space-y-2">
            {mediaAssets.map((asset) => (
              <button key={asset.id} type="button" onClick={() => addClip(`asset:${asset.id}`, asset.name, asset.isAudio ? 'audio' : 'video')} className="group w-full overflow-hidden rounded-lg border border-line text-start hover:border-accent">
                {asset.isAudio ? (
                  <span className="flex aspect-video w-full items-center justify-center bg-black text-3xl text-accent">♫</span>
                ) : (
                  <video src={asset.url} muted preload="metadata" className="aspect-video w-full bg-black object-cover" />
                )}
                <span className="block truncate px-2 py-1.5 text-[10px] text-muted group-hover:text-ink">+ {asset.isAudio ? '♫ ' : ''}{asset.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col p-3 lg:p-5">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-black">
            {src ? (
              <video
                ref={videoRef}
                key={src}
                src={src}
                controls
                playsInline
                className="absolute inset-0 h-full w-full object-contain"
                onLoadedMetadata={(event) => {
                  const duration = event.currentTarget.duration || 0;
                  if (selectedClip && !selectedClip.out) updateClip({ out: duration });
                  event.currentTarget.currentTime = selectedClip?.in ?? 0;
                }}
                onTimeUpdate={(event) => {
                  const current = event.currentTarget.currentTime;
                  setPlayhead(current);
                  if (selectedClip?.out && current >= selectedClip.out) {
                    event.currentTarget.pause();
                    event.currentTarget.currentTime = selectedClip.in;
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">{lang === 'ar' ? 'الفيديو غير موجود. عيّن Asset للنسخة أو اختار Clip تاني.' : 'Video source unavailable. Assign an asset or choose another clip.'}</div>
            )}
            <EditorOverlay layers={activeLayers} />
            <div className="absolute start-3 top-3 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-accent">{selectedClip?.name ?? (lang === 'ar' ? 'لا يوجد مقطع' : 'No clip')}</div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={splitClip} disabled={!selectedClip} className="rounded-full border border-accent/40 px-4 py-2 text-xs font-bold text-accent disabled:opacity-40">✂ {lang === 'ar' ? 'اقسم عند المؤشر' : 'Split at playhead'}</button>
            <button type="button" onClick={() => updateClip({ in: playhead })} disabled={!selectedClip} className="rounded-full border border-line px-3 py-2 text-xs text-muted hover:text-ink disabled:opacity-40">{lang === 'ar' ? 'تحديد البداية' : 'Mark In'}</button>
            <button type="button" onClick={() => updateClip({ out: playhead })} disabled={!selectedClip} className="rounded-full border border-line px-3 py-2 text-xs text-muted hover:text-ink disabled:opacity-40">{lang === 'ar' ? 'تحديد النهاية' : 'Mark Out'}</button>
            <span className="ms-auto font-mono text-xs text-accent">{formatTime(playhead)}</span>
          </div>
        </main>

        <aside className="hidden overflow-y-auto border-s border-line bg-surface/40 p-3 lg:block">
          <h2 className="text-[10px] font-black tracking-widest text-muted uppercase">{lang === 'ar' ? 'خصائص المقطع' : 'Clip inspector'}</h2>
          {selectedClip ? (
            <div className="mt-3 space-y-3">
              <p className="truncate text-xs font-bold">{selectedClip.name}</p>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="In" value={selectedClip.in} min={0} onChange={(value) => updateClip({ in: Math.min(value, selectedClip.out || value) })} />
                <NumberField label="Out" value={selectedClip.out} min={selectedClip.in} onChange={(value) => updateClip({ out: value })} />
              </div>
              <label className="block text-[10px] text-muted">Speed
                <select value={selectedClip.speed} onChange={(event) => updateClip({ speed: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-2 text-xs text-ink outline-none focus:border-accent">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
                </select>
              </label>
              <label className="block text-[10px] text-muted">{lang === 'ar' ? 'مستوى الصوت' : 'Volume'}
                <input type="range" min={0} max={1} step={0.05} value={selectedClip.volume ?? 1} onChange={(event) => updateClip({ volume: Number(event.target.value) })} className="mt-2 w-full accent-accent" />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-muted">
                <input type="checkbox" checked={selectedClip.muted ?? false} onChange={(event) => updateClip({ muted: event.target.checked })} className="accent-accent" />
                {lang === 'ar' ? 'كتم الصوت' : 'Mute clip'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => moveClip(-1)} className="rounded-lg border border-line py-2 text-xs text-muted hover:text-accent">← {lang === 'ar' ? 'تحريك' : 'Move'}</button>
                <button type="button" onClick={() => moveClip(1)} className="rounded-lg border border-line py-2 text-xs text-muted hover:text-accent">{lang === 'ar' ? 'تحريك' : 'Move'} →</button>
              </div>
              <button type="button" onClick={removeClip} className="w-full rounded-lg border border-red-400/30 py-2 text-xs text-red-300 hover:bg-red-400/10">{lang === 'ar' ? 'حذف المقطع' : 'Delete clip'}</button>
            </div>
          ) : <p className="mt-3 text-xs text-muted">{lang === 'ar' ? 'اختر مقطعًا.' : 'Select a clip.'}</p>}

          <div className="my-5 h-px bg-line" />
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black tracking-widest text-muted uppercase">Accepted review overlays</h2>
            <span className="text-[10px] text-accent">{timeline.overlayIds.length}/{reviewLayers.length}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {reviewLayers.length === 0 ? <p className="text-[10px] leading-relaxed text-muted">No review drawings on this version yet.</p> : reviewLayers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => commitTimeline({ ...timeline, overlayIds: timeline.overlayIds.includes(layer.id) ? timeline.overlayIds.filter((id) => id !== layer.id) : [...timeline.overlayIds, layer.id] })}
                className={`flex w-full items-center justify-between rounded-lg border px-2 py-2 text-[10px] ${timeline.overlayIds.includes(layer.id) ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted'}`}
              >
                <span>{layer.type}{layer.type === 'text' ? ` · ${layer.text}` : ''}</span>
                <span>{timeline.overlayIds.includes(layer.id) ? '✓ Timeline' : '+ Accept'}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <section className="h-56 shrink-0 border-t border-line bg-surface/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[10px] font-black tracking-widest text-muted uppercase">Timeline · {timeline.clips.length} clips</h2>
          <span className="text-[10px] text-muted">{lang === 'ar' ? 'اضغط Clip للتحديد ثم Trim أو Split' : 'Select a clip, then trim or split'}</span>
        </div>
        <div className="mb-2 grid grid-cols-[56px_1fr] items-center gap-2">
          <span className="text-[9px] font-black tracking-wider text-muted">REVIEW</span>
          <div className="relative h-7 overflow-hidden rounded-md border border-line bg-bg">
            {versionComments.map((comment) => {
              const start = (comment.tc / reviewTrackEnd) * 100;
              const width = comment.kind === 'range'
                ? Math.max(1, (((comment.rangeEnd ?? comment.tc) - comment.tc) / reviewTrackEnd) * 100)
                : 0;
              const accepted = reviewLayers.some((layer) => layer.commentId === comment.id && timeline.overlayIds.includes(layer.id));
              return (
                <button
                  key={comment.id}
                  type="button"
                  title={`${formatTime(comment.tc)} · ${comment.text}`}
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = comment.tc;
                    setPlayhead(comment.tc);
                  }}
                  className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${accepted ? 'bg-accent' : 'bg-orange-300/80'}`}
                  style={{ left: `${Math.min(99, start)}%`, width: comment.kind === 'range' ? `${width}%` : 8 }}
                />
              );
            })}
          </div>
        </div>
        <div className="flex h-28 gap-2 overflow-x-auto rounded-lg border border-line bg-bg p-2">
          {timeline.clips.map((clip, index) => (
            <button
              key={clip.id}
              type="button"
              draggable
              onDragStart={(event) => {
                setDragClipId(clip.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', clip.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = event.dataTransfer.getData('text/plain') || dragClipId;
                if (sourceId) moveClipTo(sourceId, clip.id);
                setDragClipId(null);
              }}
              onDragEnd={() => setDragClipId(null)}
              onClick={() => setSelectedClipId(clip.id)}
              className={`relative min-w-44 cursor-grab overflow-hidden rounded-lg border p-3 text-start transition-all active:cursor-grabbing ${dragClipId === clip.id ? 'scale-95 opacity-50' : ''} ${selectedClip?.id === clip.id ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-muted'}`}
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent to-fuchsia-400" />
              <span className="text-[9px] font-black text-muted">CLIP {index + 1}</span>
              <span className="mt-2 block truncate text-xs font-bold">{clip.name}</span>
              <span className="mt-2 block font-mono text-[10px] text-accent">{formatTime(clip.in)} → {clip.out > 0 ? formatTime(clip.out) : (lang === 'ar' ? 'النهاية' : 'END')} · {clip.speed}×</span>
            </button>
          ))}
          <button type="button" onClick={() => uploadRef.current?.click()} className="min-w-32 rounded-lg border border-dashed border-line text-xs text-muted hover:border-accent hover:text-accent">+ Add media</button>
        </div>
      </section>
    </div>
  );
}

function NumberField({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (value: number) => void }) {
  return (
    <label className="text-[10px] text-muted">{label}
      <input type="number" min={min} step={0.01} value={Number(value.toFixed(2))} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-2 font-mono text-xs text-ink outline-none focus:border-accent" />
    </label>
  );
}

function edlTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const frames = Math.floor((safe % 1) * 25);
  const totalSeconds = Math.floor(safe);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return [h, m, s, frames].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, '0')}.${Math.floor((safe % 1) * 10)}`;
}

function useStoredVersionVideo(projectId?: string, version?: string) {
  const fallback = projectId === 'p-flynas' ? '/demo/flynas-v02.mp4' : projectId === 'p-rta' ? '/demo/rta-v06.mp4' : '/demo/vodafone-v04.mp4';
  const [src, setSrc] = useState(fallback);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setSrc(fallback);
    if (projectId && version) {
      void mediaStorage.getVersionVideo(projectId, version).then((record) => {
        if (!active || !record) return;
        objectUrl = URL.createObjectURL(record.blob);
        setSrc(objectUrl);
      });
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fallback, projectId, version]);
  return src;
}

function EditorOverlay({ layers }: { layers: AnnotationLayer[] }) {
  if (layers.length === 0) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet">
      {layers.filter((layer) => layer.visible).map((layer) => {
        const transform = layer.rotation ? `rotate(${layer.rotation} ${(layer.x ?? 0) + (layer.w ?? 0) / 2} ${(layer.y ?? 0) + (layer.h ?? 0) / 2})` : undefined;
        return (
          <g key={layer.id} opacity={layer.opacity ?? 0.95} transform={transform}>
            {layer.type === 'pen' && layer.pts ? <polyline points={layer.pts.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={layer.color} strokeWidth={layer.sw} /> : null}
            {layer.type === 'rect' ? <rect x={layer.x} y={layer.y} width={layer.w} height={layer.h} fill="none" stroke={layer.color} strokeWidth={layer.sw} /> : null}
            {layer.type === 'circle' ? <ellipse cx={(layer.x ?? 0) + (layer.w ?? 0) / 2} cy={(layer.y ?? 0) + (layer.h ?? 0) / 2} rx={(layer.w ?? 0) / 2} ry={(layer.h ?? 0) / 2} fill="none" stroke={layer.color} strokeWidth={layer.sw} /> : null}
            {layer.type === 'arrow' ? <line x1={layer.x} y1={layer.y} x2={(layer.x ?? 0) + (layer.w ?? 0)} y2={(layer.y ?? 0) + (layer.h ?? 0)} stroke={layer.color} strokeWidth={layer.sw} /> : null}
            {layer.type === 'text' ? <text x={layer.x} y={layer.y} fill={layer.color} fontSize={layer.fs} fontWeight="700">{layer.text}</text> : null}
            {layer.type === 'image' && layer.src ? <image href={layer.src} x={layer.x} y={layer.y} width={layer.w} height={layer.h} /> : null}
          </g>
        );
      })}
    </svg>
  );
}
