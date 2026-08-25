import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../i18n';
import { useProjectAssets } from '../../lib/assets';
import { mediaStorage } from '../../lib/mediaStorage';
import { useAppState } from '../../lib/store';
import type { AnnotationLayer } from '../../lib/store';
import { GoldMark } from '../../components/ui/bits';
import NotFoundPage from '../NotFoundPage';

type EditorClip = {
  id: string;
  source: string;
  name: string;
  in: number;
  out: number;
  speed: number;
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
  const { can } = useAuth();
  const { lang } = useLang();
  const state = useAppState();
  const project = state.projects.find((row) => row.id === pid);
  const version = v ?? project?.currentVersion ?? 'V01';
  const { assets, add } = useProjectAssets(pid);
  const videoAssets = useMemo(() => assets.filter((asset) => asset.isVideo), [assets]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [timeline, setTimeline] = useState<TimelineDocument>(() => (pid ? readTimeline(pid, version) : DEFAULT_TIMELINE));
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [saved, setSaved] = useState(true);

  const versionSource = useStoredVersionVideo(pid, version);
  const requestedAsset = search.get('asset');
  const requestedAssetName = videoAssets.find((asset) => asset.id === requestedAsset)?.name;

  useEffect(() => {
    if (!pid) return;
    const existing = readTimeline(pid, version);
    if (existing.clips.length > 0) {
      setTimeline(existing);
      setSelectedClipId(existing.clips[0].id);
      return;
    }
    const source = requestedAsset ? `asset:${requestedAsset}` : `version:${version}`;
    const name = requestedAssetName ?? `${version} review video`;
    const first: EditorClip = { id: `clip-${Date.now()}`, source, name, in: 0, out: 0, speed: 1 };
    setTimeline({ clips: [first], overlayIds: [], updatedAt: '' });
    setSelectedClipId(first.id);
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

  const selectedClip = timeline.clips.find((clip) => clip.id === selectedClipId) ?? timeline.clips[0];
  const selectedAssetId = selectedClip?.source.startsWith('asset:') ? selectedClip.source.slice(6) : null;
  const selectedAsset = videoAssets.find((asset) => asset.id === selectedAssetId);
  const src = selectedClip?.source.startsWith('asset:') ? selectedAsset?.url ?? '' : versionSource;
  const selectedStart = selectedClip?.in ?? 0;
  const selectedSpeed = selectedClip?.speed ?? 1;
  const versionCommentIds = new Set(state.comments.filter((comment) => comment.projectId === pid && comment.version === version).map((comment) => comment.id));
  const reviewLayers = state.layers.filter((layer) => versionCommentIds.has(layer.commentId));
  const activeLayers = reviewLayers.filter((layer) => timeline.overlayIds.includes(layer.id));

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedClipId) return;
    video.playbackRate = selectedSpeed;
    const seek = selectedStart;
    if (Number.isFinite(seek)) video.currentTime = seek;
    setPlayhead(seek || 0);
  }, [selectedClipId, selectedSpeed, selectedStart, src]);

  if (!project || !project.versions.some((row) => row.v === version)) return <NotFoundPage />;

  const updateClip = (patch: Partial<EditorClip>) => {
    if (!selectedClip) return;
    setTimeline((current) => ({ ...current, clips: current.clips.map((clip) => (clip.id === selectedClip.id ? { ...clip, ...patch } : clip)) }));
  };

  const addClip = (source: string, name: string) => {
    const clip: EditorClip = { id: `clip-${Date.now()}-${Math.round(Math.random() * 999)}`, source, name, in: 0, out: 0, speed: 1 };
    setTimeline((current) => ({ ...current, clips: [...current.clips, clip] }));
    setSelectedClipId(clip.id);
  };

  const splitClip = () => {
    if (!selectedClip) return;
    const end = selectedClip.out || videoRef.current?.duration || 0;
    if (playhead <= selectedClip.in + 0.05 || playhead >= end - 0.05) return;
    const left = { ...selectedClip, id: `clip-${Date.now()}-a`, out: playhead, name: `${selectedClip.name} · A` };
    const right = { ...selectedClip, id: `clip-${Date.now()}-b`, in: playhead, out: end, name: `${selectedClip.name} · B` };
    setTimeline((current) => ({
      ...current,
      clips: current.clips.flatMap((clip) => (clip.id === selectedClip.id ? [left, right] : [clip]))
    }));
    setSelectedClipId(right.id);
  };

  const removeClip = () => {
    if (!selectedClip) return;
    setTimeline((current) => ({ ...current, clips: current.clips.filter((clip) => clip.id !== selectedClip.id) }));
    const index = timeline.clips.findIndex((clip) => clip.id === selectedClip.id);
    setSelectedClipId(timeline.clips[index + 1]?.id ?? timeline.clips[index - 1]?.id ?? null);
  };

  const moveClip = (delta: number) => {
    if (!selectedClip) return;
    setTimeline((current) => {
      const from = current.clips.findIndex((clip) => clip.id === selectedClip.id);
      const to = Math.min(current.clips.length - 1, Math.max(0, from + delta));
      if (from === to) return current;
      const clips = [...current.clips];
      const [item] = clips.splice(from, 1);
      clips.splice(to, 0, item);
      return { ...current, clips };
    });
  };

  const exportTimeline = () => {
    const blob = new Blob([JSON.stringify({ projectId: project.id, version, ...timeline }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name}-${version}-timeline.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!can('versions.upload')) {
    return <div className="flex h-screen items-center justify-center bg-bg text-sm text-muted">You do not have permission to edit this project.</div>;
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => navigate(`/app/projects/${project.id}`)} className="rounded-full border border-line p-2 text-muted hover:border-accent hover:text-accent">←</button>
          <GoldMark size={22} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{project.name} · <span className="font-mono text-accent">{version}</span></p>
            <p className="text-[10px] tracking-widest text-muted uppercase">{lang === 'ar' ? 'مونتاج فيديو غير هدّام' : 'Non-destructive video editor'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${saved ? 'text-emerald-300' : 'text-orange-300'}`}>{saved ? (lang === 'ar' ? '✓ محفوظ' : '✓ Saved') : (lang === 'ar' ? 'جاري الحفظ…' : 'Saving…')}</span>
          <Link to={`/studio/review/${project.id}/${version}`} className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent">▶ Review</Link>
          <button type="button" onClick={exportTimeline} className="rounded-full bg-accent px-4 py-1.5 text-xs font-black text-bg">{lang === 'ar' ? 'تصدير الخطة' : 'Export timeline'}</button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_260px]">
        <aside className="hidden overflow-y-auto border-e border-line bg-surface/40 p-3 lg:block">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-black tracking-widest text-muted uppercase">Asset bin</h2>
            <button type="button" onClick={() => uploadRef.current?.click()} className="rounded border border-line px-2 py-1 text-[10px] text-accent">+ Upload</button>
            <input ref={uploadRef} type="file" accept="video/*" hidden onChange={(event) => { if (event.target.files?.length) void add(event.target.files); event.target.value = ''; }} />
          </div>
          <button type="button" onClick={() => addClip(`version:${version}`, `${version} review video`)} className="mb-2 w-full rounded-lg border border-line p-2 text-start text-xs hover:border-accent">
            <span className="block font-mono font-bold text-accent">{version}</span>
            <span className="mt-1 block truncate text-[10px] text-muted">Assigned review video</span>
          </button>
          <div className="space-y-2">
            {videoAssets.map((asset) => (
              <button key={asset.id} type="button" onClick={() => addClip(`asset:${asset.id}`, asset.name)} className="group w-full overflow-hidden rounded-lg border border-line text-start hover:border-accent">
                <video src={asset.url} muted preload="metadata" className="aspect-video w-full bg-black object-cover" />
                <span className="block truncate px-2 py-1.5 text-[10px] text-muted group-hover:text-ink">+ {asset.name}</span>
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
            <div className="absolute start-3 top-3 rounded bg-black/70 px-2 py-1 font-mono text-[10px] text-accent">{selectedClip?.name ?? 'No clip'}</div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={splitClip} disabled={!selectedClip} className="rounded-full border border-accent/40 px-4 py-2 text-xs font-bold text-accent disabled:opacity-40">✂ {lang === 'ar' ? 'اقسم عند المؤشر' : 'Split at playhead'}</button>
            <button type="button" onClick={() => updateClip({ in: playhead })} disabled={!selectedClip} className="rounded-full border border-line px-3 py-2 text-xs text-muted hover:text-ink disabled:opacity-40">Mark In</button>
            <button type="button" onClick={() => updateClip({ out: playhead })} disabled={!selectedClip} className="rounded-full border border-line px-3 py-2 text-xs text-muted hover:text-ink disabled:opacity-40">Mark Out</button>
            <span className="ms-auto font-mono text-xs text-accent">{formatTime(playhead)}</span>
          </div>
        </main>

        <aside className="hidden overflow-y-auto border-s border-line bg-surface/40 p-3 lg:block">
          <h2 className="text-[10px] font-black tracking-widest text-muted uppercase">Clip inspector</h2>
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
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => moveClip(-1)} className="rounded-lg border border-line py-2 text-xs text-muted hover:text-accent">← Move</button>
                <button type="button" onClick={() => moveClip(1)} className="rounded-lg border border-line py-2 text-xs text-muted hover:text-accent">Move →</button>
              </div>
              <button type="button" onClick={removeClip} className="w-full rounded-lg border border-red-400/30 py-2 text-xs text-red-300 hover:bg-red-400/10">Delete clip</button>
            </div>
          ) : <p className="mt-3 text-xs text-muted">Select a clip.</p>}

          <div className="my-5 h-px bg-line" />
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black tracking-widest text-muted uppercase">Review overlays</h2>
            <span className="text-[10px] text-accent">{timeline.overlayIds.length}/{reviewLayers.length}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {reviewLayers.length === 0 ? <p className="text-[10px] leading-relaxed text-muted">No review drawings on this version yet.</p> : reviewLayers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setTimeline((current) => ({ ...current, overlayIds: current.overlayIds.includes(layer.id) ? current.overlayIds.filter((id) => id !== layer.id) : [...current.overlayIds, layer.id] }))}
                className={`flex w-full items-center justify-between rounded-lg border px-2 py-2 text-[10px] ${timeline.overlayIds.includes(layer.id) ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted'}`}
              >
                <span>{layer.type}{layer.type === 'text' ? ` · ${layer.text}` : ''}</span>
                <span>{timeline.overlayIds.includes(layer.id) ? '✓' : '+'}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <section className="h-44 shrink-0 border-t border-line bg-surface/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[10px] font-black tracking-widest text-muted uppercase">Timeline · {timeline.clips.length} clips</h2>
          <span className="text-[10px] text-muted">{lang === 'ar' ? 'اضغط Clip للتحديد ثم Trim أو Split' : 'Select a clip, then trim or split'}</span>
        </div>
        <div className="flex h-28 gap-2 overflow-x-auto rounded-lg border border-line bg-bg p-2">
          {timeline.clips.map((clip, index) => (
            <button
              key={clip.id}
              type="button"
              onClick={() => setSelectedClipId(clip.id)}
              className={`relative min-w-44 overflow-hidden rounded-lg border p-3 text-start transition-colors ${selectedClip?.id === clip.id ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-muted'}`}
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent to-fuchsia-400" />
              <span className="text-[9px] font-black text-muted">CLIP {index + 1}</span>
              <span className="mt-2 block truncate text-xs font-bold">{clip.name}</span>
              <span className="mt-2 block font-mono text-[10px] text-accent">{formatTime(clip.in)} → {formatTime(clip.out)} · {clip.speed}×</span>
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
