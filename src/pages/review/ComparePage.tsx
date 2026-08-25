import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLang } from '../../i18n';
import { useAppState } from '../../lib/store';
import { mediaStorage } from '../../lib/mediaStorage';
import { useProjectAssets } from '../../lib/assets';
import { GoldMark } from '../../components/ui/bits';
import NotFoundPage from '../NotFoundPage';

type Mode = 'side' | 'wipe' | 'overlay' | 'flicker';

export default function ComparePage({ source = 'versions' }: { source?: 'versions' | 'assets' }) {
  const { t, lang } = useLang();
  const { pid, vA: vAParam, vB: vBParam, assetA, assetB } = useParams();
  const navigate = useNavigate();
  const state = useAppState();
  const project = state.projects.find((p) => p.id === pid);
  const { assets, loading: assetsLoading } = useProjectAssets(pid);
  const videoAssets = assets.filter((asset) => asset.isVideo);

  const versions = project?.versions.map((v) => v.v) ?? [];
  const [vA, setVA] = useState(source === 'assets' ? assetA ?? '' : vAParam ?? versions[0] ?? 'V01');
  const [vB, setVB] = useState(source === 'assets' ? assetB ?? '' : vBParam ?? versions[1] ?? versions[0] ?? 'V01');
  const [mode, setMode] = useState<Mode>('wipe');
  const [wipe, setWipe] = useState(50);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [showB, setShowB] = useState(false);

  const refA = useRef<HTMLVideoElement>(null);
  const refB = useRef<HTMLVideoElement>(null);
  const wiping = useRef(false);

  const versionSrcA = useVersionVideo(pid, source === 'versions' ? vA : undefined);
  const versionSrcB = useVersionVideo(pid, source === 'versions' ? vB : undefined);
  const assetRowA = videoAssets.find((asset) => asset.id === vA);
  const assetRowB = videoAssets.find((asset) => asset.id === vB);
  const srcA = source === 'assets' ? assetRowA?.url ?? '' : versionSrcA;
  const srcB = source === 'assets' ? assetRowB?.url ?? '' : versionSrcB;
  const labelA = source === 'assets' ? assetRowA?.name ?? vA : vA;
  const labelB = source === 'assets' ? assetRowB?.name ?? vB : vB;

  useEffect(() => {
    if (mode !== 'flicker') {
      setShowB(false);
      return;
    }
    const timer = window.setInterval(() => setShowB((current) => !current), 650);
    return () => window.clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    const a = refA.current;
    const b = refB.current;
    if (!a || !b) return;
    const sync = () => {
      if (Math.abs(b.currentTime - a.currentTime) > 0.05) b.currentTime = a.currentTime;
    };
    const onPlay = () => {
      void b.play().catch(() => undefined);
      setPlaying(true);
    };
    const onPause = () => {
      b.pause();
      setPlaying(false);
    };
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('seeked', sync);
    const onT = () => {
      sync();
      setTime(a.currentTime);
    };
    a.addEventListener('timeupdate', onT);
    const onD = () => setDur(a.duration || 0);
    a.addEventListener('loadedmetadata', onD);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('seeked', sync);
      a.removeEventListener('timeupdate', onT);
      a.removeEventListener('loadedmetadata', onD);
    };
  }, [srcA, srcB]);

  const toggle = () => {
    const a = refA.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  const seekAll = (t: number) => {
    [refA.current, refB.current].forEach((v) => {
      if (v) v.currentTime = t;
    });
    setTime(t);
  };

  const startWipe = (e: React.PointerEvent) => {
    wiping.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    moveWipe(e);
  };
  const moveWipe = (e: React.PointerEvent) => {
    if (!wiping.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isRtl = document.documentElement.dir === 'rtl';
    const raw = ((e.clientX - rect.left) / rect.width) * 100;
    setWipe(Math.min(100, Math.max(0, isRtl ? 100 - raw : raw)));
  };
  const endWipe = () => {
    wiping.current = false;
  };

  const validSelection = source === 'assets' ? videoAssets.some((asset) => asset.id === vA) && videoAssets.some((asset) => asset.id === vB) : versions.includes(vA) && versions.includes(vB);
  if (!project || (source === 'assets' && assetsLoading)) {
    return <div className="flex h-screen items-center justify-center bg-bg text-sm text-muted">Loading media…</div>;
  }
  if (!validSelection) {
    return <NotFoundPage />;
  }

  const sel = 'rounded-lg border border-line bg-surface px-3 py-1.5 font-mono text-xs outline-none focus:border-accent';

  return (
    <div className="flex h-screen flex-col bg-bg text-ink">
      <header className="flex h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate(`/app/projects/${project.id}`)}
            className="rounded-full border border-line p-2 text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rtl:rotate-180">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <GoldMark size={22} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{project.client} — {project.name}</p>
            <p className="text-[10px] tracking-wider text-muted/60 uppercase">{source === 'assets' ? (lang === 'ar' ? 'مقارنة فيديوهات الـAssets' : 'Asset video compare') : t('cmp_title')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={vA} onChange={(e) => setVA(e.target.value)} className={sel} style={{ color: '#4FD1C5' }}>
            {(source === 'assets' ? videoAssets.map((asset) => ({ id: asset.id, label: asset.name })) : versions.map((version) => ({ id: version, label: version }))).map((option) => (
              <option key={option.id} value={option.id}>
                A · {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted/50">vs</span>
          <select value={vB} onChange={(e) => setVB(e.target.value)} className={sel} style={{ color: '#FB7185' }}>
            {(source === 'assets' ? videoAssets.map((asset) => ({ id: asset.id, label: asset.name })) : versions.map((version) => ({ id: version, label: version }))).map((option) => (
              <option key={option.id} value={option.id}>
                B · {option.label}
              </option>
            ))}
          </select>

          <span className="mx-1 h-6 w-px bg-line" />

          {(['side', 'wipe', 'overlay', 'flicker'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                mode === m ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink'
              }`}
            >
              {m === 'flicker' ? (lang === 'ar' ? 'وميض' : 'Flicker') : t(`cmp_${m}` as never)}
            </button>
          ))}
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col p-4 lg:p-5">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-black">
          {mode === 'side' ? (
            <div className="absolute inset-0 grid grid-cols-2 divide-x divide-line rtl:divide-x-reverse">
              <div className="relative">
                <video ref={refA} src={srcA} className="absolute inset-0 h-full w-full object-contain" muted playsInline />
                <span className="absolute start-3 top-3 max-w-[45%] truncate rounded-md bg-teal-400/90 px-2 py-0.5 font-mono text-[10px] font-black text-bg">A · {labelA}</span>
              </div>
              <div className="relative">
                <video ref={refB} src={srcB} className="absolute inset-0 h-full w-full object-contain" muted playsInline />
                <span className="absolute end-3 top-3 max-w-[45%] truncate rounded-md bg-rose-400/90 px-2 py-0.5 font-mono text-[10px] font-black text-bg">B · {labelB}</span>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0" onPointerDown={mode === 'wipe' ? startWipe : undefined} onPointerMove={moveWipe} onPointerUp={endWipe}>
              <video ref={refA} src={srcA} className="absolute inset-0 h-full w-full object-contain" muted playsInline />
              <video
                ref={refB}
                src={srcB}
                className="absolute inset-0 h-full w-full object-contain"
                muted
                playsInline
                style={
                  mode === 'wipe'
                    ? { clipPath: `inset(0 0 0 ${wipe}%)` }
                    : mode === 'flicker'
                      ? { opacity: showB ? 1 : 0 }
                      : { opacity: 0.5 }
                }
              />
              {mode === 'wipe' && (
                <>
                  <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent" style={{ left: `${wipe}%` }} />
                  <div
                    className="absolute top-1/2 z-10 h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-accent bg-bg shadow-lg"
                    style={{ left: `${wipe}%` }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-accent">↔</span>
                  </div>
                </>
              )}
              <span className="absolute start-3 top-3 max-w-[45%] truncate rounded-md bg-teal-400/90 px-2 py-0.5 font-mono text-[10px] font-black text-bg">A · {labelA}</span>
              <span className="absolute end-3 top-3 max-w-[45%] truncate rounded-md bg-rose-400/90 px-2 py-0.5 font-mono text-[10px] font-black text-bg">B · {labelB}</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/40 bg-surface text-accent transition-colors hover:bg-accent/10"
          >
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
          <div
            className="group relative h-2.5 flex-1 cursor-pointer rounded-full bg-line"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seekAll(((e.clientX - r.left) / r.width) * dur);
            }}
          >
            <div className="pointer-events-none absolute inset-y-0 start-0 rounded-full bg-accent" style={{ width: dur ? `${(time / dur) * 100}%` : '0%' }} />
          </div>
          <span className="font-mono text-xs tabular-nums text-accent">
            {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, '0')}
          </span>
        </div>

        <p className="mt-2 text-center text-[10px] text-muted/50">
          {lang === 'ar' ? 'الفيديوهان متزامنان — اسحب المقبض في وضع Wipe' : 'Both videos stay in sync — drag the handle in Wipe mode'}
        </p>
      </main>
    </div>
  );
}

function defaultSrc(pid?: string) {
  const map: Record<string, string> = {
    'p-vodafone': '/demo/vodafone-v04.mp4',
    'p-flynas': '/demo/flynas-v02.mp4',
    'p-rta': '/demo/rta-v06.mp4'
  };
  return (pid && map[pid]) || '/demo/vodafone-v04.mp4';
}

function useVersionVideo(pid?: string, version?: string) {
  const fallback = defaultSrc(pid);
  const [src, setSrc] = useState(fallback);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setSrc(fallback);
    if (!pid || !version) return;

    mediaStorage
      .getVersionVideo(pid, version)
      .then((record) => {
        if (!active || !record?.blob) return;
        objectUrl = URL.createObjectURL(record.blob);
        setSrc(objectUrl);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fallback, pid, version]);

  return src;
}
