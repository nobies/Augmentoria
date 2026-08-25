import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

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
}

const FPS = 25;

function fmt(t: number) {
  const total = Math.max(0, t);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  const f = Math.floor((total % 1) * FPS);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export default function Player({ src, videoRef, onTime, markers, onMarkerClick, onMeta }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);

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
    return () => {
      v.removeEventListener('timeupdate', onT);
      v.removeEventListener('play', onP);
      v.removeEventListener('pause', onP);
      v.removeEventListener('loadedmetadata', onD);
    };
  }, [videoRef, onTime, onMeta]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const step = (dir: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = Math.min(Math.max(0, v.currentTime + dir / FPS), v.duration || 0);
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
  };

  const toggleFullscreen = () => {
    const wrapper = wrapRef.current;
    if (!wrapper) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapper.requestFullscreen();
  };

  const trackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * dur);
  };

  const btn =
    'flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-accent hover:text-accent';

  return (
    <div ref={wrapRef} className="review-player flex h-full min-w-0 flex-1 flex-col bg-bg">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-black">
        <video
          ref={videoRef}
          src={src}
          className="absolute inset-0 h-full w-full object-contain"
          playsInline
          onClick={toggle}
        />
      </div>

      <div className="review-player-controls mt-3 space-y-2">
        <div
          onClick={trackClick}
          className="group relative h-2.5 cursor-pointer rounded-full bg-line"
        >
          <div
            className="pointer-events-none absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-accent-dim to-accent transition-[width] duration-75"
            style={{ width: dur ? `${(time / dur) * 100}%` : '0%' }}
          />
          {markers.map((mk) => (
            <button
              key={mk.id}
              title={`${mk.kind === 'frame' ? fmt(mk.tc) : `${fmt(mk.tc)} → ${fmt(mk.rangeEnd ?? mk.tc)}`}`}
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

        <div className="flex items-center gap-2.5">
          <button onClick={toggle} className={`${btn} !h-10 !w-10 !border-accent/40 !text-accent`} aria-label="Play/Pause">
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
          <button onClick={() => step(-1)} className={btn} aria-label="-1 frame">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 19l-7-7 7-7M21 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={() => step(1)} className={btn} aria-label="+1 frame">
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
            <button onClick={toggleFullscreen} className={btn} aria-label="Fullscreen" title="Fullscreen">
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
