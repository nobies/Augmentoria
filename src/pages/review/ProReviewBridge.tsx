import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLang } from '../../i18n';
import { useAppState } from '../../lib/store';
import {
  checkFreeFrameHealth,
  FREEFRAME_REVIEW_ENABLED,
  freeFrameLaunchUrl
} from '../../lib/freeframe';
import { GoldMark } from '../../components/ui/bits';
import NotFoundPage from '../NotFoundPage';

type EngineState = 'checking' | 'ready' | 'offline';

export default function ProReviewBridge() {
  const { pid, v } = useParams();
  const { lang } = useLang();
  const state = useAppState();
  const [engineState, setEngineState] = useState<EngineState>('checking');
  const project = state.projects.find((row) => row.id === pid);
  const version = v ?? project?.currentVersion ?? 'V01';

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);
    void checkFreeFrameHealth(controller.signal)
      .then(() => setEngineState('ready'))
      .catch(() => setEngineState('offline'))
      .finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  if (!project || !project.versions.some((row) => row.v === version)) return <NotFoundPage />;

  const engineUrl = freeFrameLaunchUrl(project.id, version);
  const statusLabel = engineState === 'ready'
    ? (lang === 'ar' ? 'المحرك متصل' : 'Engine connected')
    : engineState === 'offline'
      ? (lang === 'ar' ? 'المحرك غير متاح' : 'Engine offline')
      : (lang === 'ar' ? 'جاري فحص المحرك…' : 'Checking engine…');

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-bg text-ink">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={`/app/projects/${project.id}`} className="rounded-full border border-line p-2 text-muted transition-colors hover:border-accent hover:text-accent" aria-label={lang === 'ar' ? 'العودة للمشروع' : 'Back to project'}>←</Link>
          <GoldMark size={22} />
          <div className="min-w-0">
            <p className="truncate text-xs font-black">{project.client} — {project.name} · <span className="font-mono text-accent">{version}</span></p>
            <p className="text-[9px] font-bold tracking-[0.18em] text-muted uppercase">Augmentoria Pro Review · FreeFrame Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${engineState === 'ready' ? 'border-emerald-400/40 text-emerald-300' : engineState === 'offline' ? 'border-red-400/40 text-red-300' : 'border-line text-muted'}`}>
            {engineState === 'ready' ? '● ' : '○ '}{statusLabel}
          </span>
          <Link to={`/studio/review/${project.id}/${version}`} className="rounded-full border border-line px-3 py-1.5 text-[10px] font-semibold text-muted transition-colors hover:border-accent hover:text-accent">
            {lang === 'ar' ? 'الـReview القديم' : 'Legacy review'}
          </Link>
          <a href={engineUrl} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-4 py-1.5 text-[10px] font-black text-bg">
            {lang === 'ar' ? 'فتح في نافذة كاملة ↗' : 'Open full app ↗'}
          </a>
        </div>
      </header>

      {!FREEFRAME_REVIEW_ENABLED ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-2xl border border-line bg-surface p-8">
            <h1 className="font-display text-xl font-black">Pro Review is disabled</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">Set VITE_ENABLE_FREEFRAME=true to enable the isolated review engine.</p>
          </div>
        </div>
      ) : engineState === 'offline' ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div className="max-w-lg rounded-2xl border border-red-400/25 bg-red-400/5 p-8">
            <h1 className="font-display text-xl font-black text-red-300">{lang === 'ar' ? 'محرك الـReview مش شغال' : 'Review engine is offline'}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{lang === 'ar' ? 'الـReview القديم ما زال متاحًا بدون أي تغيير. شغّل FreeFrame من Docker ثم أعد تحميل الصفحة.' : 'The legacy review remains available and unchanged. Start FreeFrame with Docker, then reload this page.'}</p>
            <code className="mt-4 block rounded-lg bg-black/40 px-3 py-2 text-xs text-accent">npm run review:engine:up</code>
          </div>
        </div>
      ) : (
        <iframe
          title="Augmentoria Pro Review"
          src={engineUrl}
          className="min-h-0 flex-1 border-0 bg-[#0d0d10]"
          allow="fullscreen; clipboard-read; clipboard-write"
        />
      )}
    </div>
  );
}
