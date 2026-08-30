import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useLang } from '../../i18n';

export interface Marker {
  id: string;
  tc: number;
  kind: 'frame' | 'range';
  rangeEnd?: number;
  resolved: boolean;
  color: string;
}

interface Props {
  src: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onTime: (t: number) => void;
  markers: Marker[];
  onMarkerClick: (m: Marker) => void;
  onMeta?: (vw: number, vh: number) => void;
  fitMode?: 'contain' | 'fill' | 'cover';
  aspect?: number;
  deviceFrame?: 'none' | 'tv' | 'mobile' | 'instagram';
  panOffset?: { x: number; y: number };
  onPanChange?: (offset: { x: number; y: number }) => void;
  zoomScale?: number;
  onZoomChange?: (scale: number) => void;
  rotationAngle?: number;
  isPanActive?: boolean;
  showSocialUI?: boolean;
  maskOpacity?: number; // 0 (completely visible) to 1 (completely hidden / solid black)
  children?: React.ReactNode;
  onOpenAssets?: () => void;
  onUploadVideo?: () => void;
  videoAssetsCount?: number;
}

const FPS = 25;

function fmt(t: number) {
  const total = Math.max(0, t);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const f = Math.floor((total % 1) * FPS);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export default function Player({
  src,
  videoRef,
  onTime,
  markers,
  onMarkerClick,
  onMeta,
  fitMode = 'contain',
  aspect = 16 / 9,
  deviceFrame = 'none',
  panOffset = { x: 0, y: 0 },
  onPanChange,
  zoomScale = 1,
  onZoomChange,
  rotationAngle = 0,
  isPanActive = false,
  showSocialUI = false,
  maskOpacity = 0.6,
  children,
  onOpenAssets,
  onUploadVideo,
  videoAssetsCount = 0
}: Props) {
  const { lang } = useLang();
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; startOffsetX: number; startOffsetY: number }>({ x: 0, y: 0, startOffsetX: 0, startOffsetY: 0 });
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [box, setBox] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onT = () => {
      setTime(v.currentTime);
      onTime(v.currentTime);
    };
    const onP = () => setPlaying(!v.paused);
    const onD = () => {
      setDur(v.duration || 0);
      if (v.videoWidth) onMeta?.(v.videoWidth, v.videoHeight);
    };
    v.addEventListener('timeupdate', onT);
    v.addEventListener('play', onP);
    v.addEventListener('pause', onP);
    v.addEventListener('loadedmetadata', onD);
    onT();
    onP();
    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) onD();
    return () => {
      v.removeEventListener('timeupdate', onT);
      v.removeEventListener('play', onP);
      v.removeEventListener('pause', onP);
      v.removeEventListener('loadedmetadata', onD);
    };
  }, [videoRef, onTime, onMeta]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };
  const toggle = togglePlay;

  const scrub = (target: number) => {
    const v = videoRef.current;
    const clamped = Math.max(0, Math.min(dur, target));
    if (v) v.currentTime = clamped;
    setTime(clamped);
  };
  const seekTo = scrub;

  const toggleFullscreen = () => {
    const wrapper = wrapRef.current;
    if (!wrapper) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapper.requestFullscreen();
  };

  const scrubToPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dur) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    scrub(ratio * dur);
  };

  const step = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    scrub(v.currentTime + delta / FPS);
  };

  const handlePointerDownPan = (e: React.PointerEvent) => {
    // Support middle click (button === 1) anytime, or left click (button === 0) when isPanActive is enabled
    if (e.button === 1 || (isPanActive && e.button === 0)) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startOffsetX: panOffset.x,
        startOffsetY: panOffset.y
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMovePan = (e: React.PointerEvent) => {
    if (!isPanningRef.current || !onPanChange) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    onPanChange({
      x: Math.round(panStartRef.current.startOffsetX + dx),
      y: Math.round(panStartRef.current.startOffsetY + dy)
    });
  };

  const handlePointerUpPan = (e: React.PointerEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already have been released by the browser.
      }
    }
  };

  const handleDoubleClickReset = () => {
    onPanChange?.({ x: 0, y: 0 });
    onZoomChange?.(1);
  };

  const handleWheelZoom = (e: React.WheelEvent) => {
    if (!onZoomChange) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const nextZoom = Math.min(4, Math.max(0.5, zoomScale * zoomFactor));
    onZoomChange(nextZoom);
  };

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-accent hover:text-accent';

  const contentBox = (() => {
    const W = box.w;
    const H = box.h;
    const a = aspect || 16 / 9;
    let cw = W;
    let ch = W / a;
    if (ch > H) {
      ch = H;
      cw = H * a;
    }
    return { x: (W - cw) / 2, y: (H - ch) / 2, w: cw, h: ch };
  })();

  return (
    <div ref={wrapRef} className="review-player flex h-full min-w-0 flex-1 flex-col bg-bg">
      <div
        ref={containerRef}
        onWheel={handleWheelZoom}
        onPointerDown={handlePointerDownPan}
        onPointerMove={handlePointerMovePan}
        onPointerUp={handlePointerUpPan}
        onPointerCancel={handlePointerUpPan}
        onDoubleClick={handleDoubleClickReset}
        className={`relative min-h-[220px] flex-1 overflow-hidden rounded-xl border border-line bg-black flex items-center justify-center select-none ${
          isPanActive ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        {src ? (
          <video
            ref={videoRef}
            src={src}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale}) rotate(${rotationAngle}deg)`
            }}
            className={`block h-full w-full pointer-events-none transition-transform duration-75 origin-center ${
              fitMode === 'fill' ? 'object-fill' : fitMode === 'cover' ? 'object-cover' : 'object-contain'
            }`}
            playsInline
          />
        ) : (
          <div className="relative h-full w-full overflow-hidden flex items-center justify-center">
            {/* Background Image: ChatGPT Image Aug 25, 2026 */}
            <img
              src="/media/empty-review-placeholder.png"
              alt="Video Review Workspace"
              className="absolute inset-0 h-full w-full object-cover opacity-35 scale-105 filter blur-[0.5px]"
            />
            {/* Dark gradient vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-bg/50 backdrop-blur-[2px]" />

            {/* Hero Prompt Box */}
            <div className="relative z-10 mx-auto max-w-lg p-6 text-center space-y-3.5 animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/40 bg-accent/15 text-2xl text-accent shadow-[0_0_35px_rgba(217,164,65,0.25)]">
                🎬
              </div>
              <div className="space-y-1.5">
                <span className="inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 text-[10px] font-bold tracking-wider text-accent uppercase">
                  {lang === 'ar' ? 'مراجعة فيديو جديدة' : 'New Video Review'}
                </span>
                <h3 className="font-display text-lg font-black text-ink sm:text-xl">
                  {lang === 'ar' ? 'اختر فيديو للبدء في المراجعة' : 'Select a Video to Start Review'}
                </h3>
                <p className="text-xs leading-relaxed text-muted max-w-md mx-auto">
                  {lang === 'ar'
                    ? 'لم يتم تحديد فيديو لهذه النسخة بعد. يرجى اختيار فيديو من مكتبة أصول المشروع أو رفع فيديو جديد لبدء المراجعة والتعليق المباشر.'
                    : 'No video selected for this version yet. Please select a video from the project assets library or upload a new video to begin live review and feedback.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onOpenAssets && (
                  <button
                    type="button"
                    onClick={onOpenAssets}
                    className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-black text-bg transition-all hover:bg-accent-dim hover:scale-105 shadow-[0_0_20px_rgba(217,164,65,0.3)]"
                  >
                    🎬 {lang === 'ar' ? 'اختيار من مكتبة الأصول' : 'Pick from Assets'} {videoAssetsCount > 0 ? `(${videoAssetsCount})` : ''}
                  </button>
                )}
                {onUploadVideo && (
                  <button
                    type="button"
                    onClick={onUploadVideo}
                    className="flex items-center gap-2 rounded-full border border-line bg-surface/90 px-5 py-2.5 text-xs font-bold text-ink transition-all hover:border-accent hover:text-accent hover:bg-surface"
                  >
                    📤 {lang === 'ar' ? 'استيراد ملف من جهازك' : 'Import Media File'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Aspect Ratio Frame Guideline Overlay */}
        <div
          className="pointer-events-none absolute transition-all duration-150"
          style={{
            left: `${contentBox.x}px`,
            top: `${contentBox.y}px`,
            width: `${contentBox.w}px`,
            height: `${contentBox.h}px`,
          }}
        >
          {/* Outer letterbox shading mask using box-shadow with dynamic opacity */}
          <div
            className="absolute inset-0 transition-all duration-150"
            style={{
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, ${maskOpacity})`
            }}
          />

          {/* Active Frame Boundary Border */}
          <div
            className={`absolute inset-0 ${
              deviceFrame === 'tv'
                ? 'rounded-2xl border-[6px] border-zinc-700/90 shadow-2xl ring-1 ring-white/20'
                : deviceFrame === 'mobile'
                ? 'rounded-[36px] border-[8px] border-zinc-800 shadow-2xl ring-2 ring-zinc-700/60'
                : deviceFrame === 'instagram'
                ? 'border-2 border-dashed border-amber-400/80 bg-amber-400/[0.02]'
                : 'border border-dashed border-accent/70'
            }`}
          >
            {/* Aspect Ratio Badge at corner */}
            <div className="absolute top-2 start-2 flex items-center gap-1.5 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent backdrop-blur-sm">
              <span>📐</span>
              <span>{aspect.toFixed(2)}:1</span>
              {deviceFrame !== 'none' && (
                <span className="text-zinc-400 capitalize">({deviceFrame})</span>
              )}
            </div>

            {/* Social Media UI Mockup Overlay (Instagram / TikTok Reels simulation) */}
            {(showSocialUI || deviceFrame === 'instagram' || (deviceFrame === 'mobile' && showSocialUI)) && (
              <div className="absolute inset-0 flex flex-col justify-between p-3.5 text-white/95 text-xs select-none pointer-events-none overflow-hidden">
                {/* Header (Story/Reel header) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
                      <div className="h-full w-full rounded-full bg-black flex items-center justify-center font-bold text-[9px]">OX</div>
                    </div>
                    <span className="font-bold text-[11px] drop-shadow-md">brand_official</span>
                    <span className="text-[10px] text-zinc-300 drop-shadow-md">• Sponsored</span>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] drop-shadow-md">
                    <span>⋯</span>
                  </div>
                </div>

                {/* Right Action Icons (Like, Comment, Share) */}
                <div className="absolute right-3 bottom-14 flex flex-col items-center gap-3 drop-shadow-lg">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 backdrop-blur-md">❤️</div>
                    <span className="font-mono text-[9px] font-semibold">24.5K</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 backdrop-blur-md">💬</div>
                    <span className="font-mono text-[9px] font-semibold">1,280</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 backdrop-blur-md">↗️</div>
                    <span className="font-mono text-[9px] font-semibold">Share</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 backdrop-blur-md">🔖</div>
                </div>

                {/* Footer Caption & Sound */}
                <div className="space-y-1.5 max-w-[78%] drop-shadow-lg">
                  <p className="font-medium text-[11px] leading-snug line-clamp-2">
                    <span className="font-bold">brand_official</span> Check out our latest campaign! Special offers inside 🚀✨ #ad #creative
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                    <span>🎵</span>
                    <span className="truncate">Original Audio — brand_official</span>
                  </div>
                  {/* Call to Action bar */}
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-accent/90 px-3 py-1.5 font-bold text-[10px] text-bg shadow-lg">
                    <span>Learn More / Shop Now</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            )}

            {/* Corner Crop Marks */}
            <div className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-accent" />
            <div className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-accent" />
            <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-accent" />
            <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-accent" />
          </div>
        </div>

        {children}
      </div>

      <div className="review-player-controls mt-1.5 sm:mt-3 space-y-1.5 sm:space-y-2">
        <div
          role="slider"
          aria-label={lang === 'ar' ? 'الخط الزمني للريفيو' : 'Review timeline'}
          aria-valuemin={0}
          aria-valuemax={dur}
          aria-valuenow={time}
          tabIndex={0}
          onPointerDown={(event) => {
            scrubbingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            scrubToPointer(event);
          }}
          onPointerMove={(event) => {
            if (scrubbingRef.current) scrubToPointer(event);
          }}
          onPointerUp={(event) => {
            scrubToPointer(event);
            scrubbingRef.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { scrubbingRef.current = false; }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') seekTo(Math.max(0, time - 1 / FPS));
            if (event.key === 'ArrowRight') seekTo(Math.min(dur, time + 1 / FPS));
          }}
          className="group relative h-3 cursor-ew-resize touch-none rounded-full bg-line outline-none focus:ring-2 focus:ring-accent/60"
        >
          <div
            className="pointer-events-none absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-accent-dim to-accent transition-[width] duration-75"
            style={{ width: dur ? `${(time / dur) * 100}%` : '0%' }}
          />
          {markers.map((mk) => (
            <button
              key={mk.id}
              title={`${mk.kind === 'frame' ? fmt(mk.tc) : `${fmt(mk.tc)} → ${fmt(mk.rangeEnd ?? mk.tc)}`}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onMarkerClick(mk);
              }}
              className="absolute top-1/2 z-10 -translate-y-1/2 -translate-x-1/2"
              style={{ left: dur ? `${(mk.tc / dur) * 100}%` : '0%' }}
            >
              {mk.kind === 'frame' ? (
                <span
                  className={`block h-3 w-3 rotate-45 rounded-[3px] ring-2 ring-bg ${mk.resolved ? 'bg-emerald-400' : ''}`}
                  style={mk.resolved ? undefined : { backgroundColor: mk.color }}
                />
              ) : (
                <span
                  className={`block h-3 rounded-sm ring-2 ring-bg ${mk.resolved ? 'bg-emerald-400/80' : ''}`}
                  style={{
                    width: dur && mk.rangeEnd ? `${((mk.rangeEnd - mk.tc) / dur) * 100}%` : '12px',
                    backgroundColor: mk.resolved ? undefined : `${mk.color}CC`
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <button onClick={toggle} className={`${btn} !h-8 !w-8 sm:!h-10 sm:!w-10 !border-accent/40 !text-accent`} aria-label={lang === 'ar' ? 'تشغيل/إيقاف' : 'Play/Pause'}>
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="4" width="5" height="16" rx="1" />
                <rect x="14" y="4" width="5" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4l13 8-13 8V4z" />
              </svg>
            )}
          </button>
          <button onClick={() => step(-1)} className={btn} aria-label={lang === 'ar' ? 'فريم للخلف' : '-1 frame'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 19l-7-7 7-7M21 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={() => step(1)} className={btn} aria-label={lang === 'ar' ? 'فريم للأمام' : '+1 frame'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 5l7 7-7 7M3 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <span className="font-mono text-xs tabular-nums text-accent">{fmt(time)}</span>
          <span className="text-xs text-muted/50">/</span>
          <span className="font-mono text-xs tabular-nums text-muted">{fmt(dur)}</span>

          <div className="ms-auto flex items-center gap-2">
            <svg className="text-muted max-sm:hidden" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.08" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVol(v);
                if (videoRef.current) videoRef.current.volume = v;
              }}
              className="w-20 accent-accent max-sm:hidden"
            />
            <button onClick={toggleFullscreen} className={btn} aria-label={lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen'} title={lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen'}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
