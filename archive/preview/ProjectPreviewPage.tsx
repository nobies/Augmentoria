import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MOCK_CLIENT,
  MOCK_COMMENTS,
  MOCK_DELIVERABLES,
  MOCK_PROJECT,
  type CommentItem,
  type ProjectStatus
} from './mock';

const STR = {
  preview: { en: 'Client Preview', ar: 'معاينة العميل' },
  mockNote: { en: 'mock data', ar: 'بيانات وهمية' },
  due: { en: 'Due', ar: 'تسليم' },
  progress: { en: 'Progress', ar: 'إنجاز' },
  openNotes: { en: 'Open', ar: 'مفتوحة' },
  resolvedNotes: { en: 'Done', ar: 'منجزة' },
  approve: { en: 'Approve', ar: 'اعتماد' },
  changes: { en: 'Request changes', ar: 'تعديلات' },
  addComment: { en: 'Note on this delivery…', ar: 'ملاحظة على التسليم…' },
  send: { en: 'Send', ar: 'إرسال' },
  newPinHint: { en: 'Click anywhere on the visual to drop a note', ar: 'دوس في أي مكان على الصورة عشان تضيف ملاحظة' },
  resolve: { en: 'Resolve', ar: 'حل' },
  reopen: { en: 'Reopen', ar: 'إعادة فتح' },
  you: { en: 'You', ar: 'أنت' },
  clientRole: { en: 'Client', ar: 'العميل' },
  now: { en: 'now', ar: 'الآن' },
  filter_all: { en: 'All', ar: 'الكل' },
  filter_open: { en: 'Open', ar: 'مفتوحة' },
  filter_done: { en: 'Done', ar: 'تم' },
  st_editing: { en: 'Editing', ar: 'قيد التنفيذ' },
  st_review: { en: 'In Review', ar: 'قيد المراجعة' },
  st_changes: { en: 'Changes Requested', ar: 'تعديلات مطلوبة' },
  st_approved: { en: 'Approved', ar: 'معتمد' }
} as const;

type Lang = 'en' | 'ar';
type StrKey = keyof typeof STR;
type Filter = 'all' | 'open' | 'done';

const STATUS_CLASS: Record<ProjectStatus, string> = {
  editing: 'border-sky-400/40 text-sky-300 bg-sky-400/10',
  review: 'border-amber-400/40 text-amber-300 bg-amber-400/10',
  changes: 'border-orange-400/40 text-orange-300 bg-orange-400/10',
  approved: 'border-emerald-400/40 text-emerald-300 bg-emerald-400/10'
};

const KIND_ICON: Record<string, string> = {
  'key-visual': '🖼',
  social: '📱',
  'video-frame': '🎬',
  billboard: '🛣'
};

function brandColor(name: string) {
  const map: Record<string, string> = { vodafone: '#E60000', flynas: '#3AB54A', rta: '#00A19A' };
  return map[name.toLowerCase()] ?? '#D9A441';
}

export default function ProjectPreviewPage() {
  const [lang, setLang] = useState<Lang>('ar');
  const t = (k: StrKey) => STR[k][lang];
  const rtl = lang === 'ar';

  const [project, setProject] = useState(MOCK_PROJECT);
  const [version, setVersion] = useState('v3');
  const [shotId, setShotId] = useState(MOCK_DELIVERABLES[0].id);
  const [comments, setComments] = useState<CommentItem[]>(MOCK_COMMENTS);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [pendingText, setPendingText] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [flash, setFlash] = useState<null | 'approved' | 'changes'>(null);

  const artRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const shot = MOCK_DELIVERABLES.find((d) => d.id === shotId)!;
  const vRow = project.versions.find((v) => v.v === version) ?? project.versions[0];

  const shotComments = useMemo(() => comments.filter((c) => c.shotId === shotId), [comments, shotId]);
  const visibleComments = useMemo(
    () => comments.filter((c) => (filter === 'all' ? true : filter === 'open' ? !c.resolved : c.resolved)),
    [comments, filter]
  );
  const openCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.length - openCount;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPending(null);
        setPendingText('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!activeId || !listRef.current) return;
    listRef.current.querySelector(`[data-cid="${activeId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeId]);

  // pin numbers per deliverable: sequential over unresolved pins, resolved get ✓
  const pinNumbers = useMemo(() => {
    const m = new Map<string, number>();
    let n = 1;
    for (const c of comments) if (c.shotId === shotId && c.pin && !c.resolved) m.set(c.id, n++);
    return m;
  }, [comments, shotId]);

  const canvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!artRef.current) return;
    const r = artRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setActiveId(null);
    setPending({ x: Math.min(96, Math.max(4, x)), y: Math.min(94, Math.max(6, y)) });
    setPendingText('');
  };

  const commitPending = () => {
    if (!pending || !pendingText.trim()) return;
    setComments((cs) => [
      ...cs,
      {
        id: `c${Date.now()}`,
        shotId,
        author: t('you'),
        role: t('clientRole'),
        time: t('now'),
        textEn: pendingText.trim(),
        textAr: pendingText.trim(),
        resolved: false,
        pin: pending
      }
    ]);
    setPending(null);
    setPendingText('');
  };

  const toggleResolve = (id: string) =>
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c)));

  const setStatus = (s: ProjectStatus) => {
    setProject((p) => ({ ...p, status: s }));
    if (s === 'approved' || s === 'changes') {
      setFlash(s);
      setTimeout(() => setFlash(null), 2400);
    }
  };

  const accent = brandColor(MOCK_CLIENT.name);

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="flex h-dvh flex-col overflow-hidden bg-bg font-body text-ink">
      {/* ── top bar ── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
        <svg width="22" height="22" viewBox="0 0 64 64" className="shrink-0">
          <rect width="64" height="64" rx="16" fill="#141414" />
          <path d="M32 12 L48 52 H40.5 L36.8 41.5 H27.2 L23.5 52 H16 Z M32 25 L29 34 H35 Z" fill="#d9a441" />
        </svg>
        <span className="rounded border border-accent/50 px-1.5 py-px text-[9px] font-bold tracking-widest text-accent uppercase">
          {t('preview')}
        </span>
        <span className="h-4 w-px bg-line" />
        <span className="hidden text-[11px] font-semibold md:block">{project.name}</span>
        <StatusBadge status={project.status} label={t(`st_${project.status}` as StrKey)} />
        <span className="hidden font-mono text-[10px] text-muted lg:inline" dir="ltr">
          {t('due')} {project.due} · {project.progress}% {t('progress')}
        </span>

        {/* version switch */}
        <div className="ms-auto flex items-center rounded-full border border-line p-0.5">
          {project.versions.map((v) => (
            <button
              key={v.v}
              onClick={() => setVersion(v.v)}
              title={`${v.date} · ${v.open} open`}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                v.v === version ? 'bg-accent text-bg' : 'text-muted hover:text-accent'
              }`}
            >
              {v.v}
            </button>
          ))}
        </div>

        <div className="relative flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setStatus('approved')}
            disabled={project.status === 'approved'}
            className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-bold text-bg enabled:hover:shadow-[0_0_18px_rgba(var(--glow-rgb),0.35)] disabled:opacity-40"
          >
            ✓ {t('approve')}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setStatus('changes')}
            className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-orange-300 hover:text-orange-300"
          >
            ↺ {t('changes')}
          </motion.button>
          <AnimatePresence>
            {flash && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`absolute -bottom-5 end-0 whitespace-nowrap text-[10px] font-bold ${flash === 'approved' ? 'text-emerald-300' : 'text-orange-300'}`}
              >
                {t(`st_${flash}` as StrKey)}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setLang(rtl ? 'en' : 'ar')}
          className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
        >
          {rtl ? 'EN' : 'ع'}
        </button>
      </header>

      {/* ── workspace ── */}
      <div className="flex min-h-0 flex-1">
        {/* stage */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          {/* deliverable tabs */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3">
            <div className="pointer-events-auto flex items-center gap-1 overflow-x-auto rounded-full border border-line bg-surface/90 p-1 backdrop-blur">
              {MOCK_DELIVERABLES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setShotId(d.id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    d.id === shotId ? 'bg-accent/15 text-accent ring-1 ring-accent/40' : 'text-muted hover:text-ink'
                  }`}
                >
                  {KIND_ICON[d.kind]} <span className="ms-1 hidden sm:inline">{d.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* canvas */}
          <div
            onClick={canvasClick}
            className="relative flex min-h-0 flex-1 cursor-crosshair items-center justify-center overflow-hidden p-10 pt-16 pb-20"
            style={{
              backgroundColor: '#0a0a0a',
              backgroundImage: 'radial-gradient(#262626 1px, transparent 1px)',
              backgroundSize: '22px 22px'
            }}
          >
            <div
              ref={artRef}
              className="relative max-h-full overflow-hidden rounded-lg shadow-[0_8px_60px_rgba(0,0,0,0.6)] ring-1 ring-line"
              style={{ aspectRatio: shot.ratio, width: `min(94%, calc((100dvh - 15rem) * ${(Number(shot.ratio.split('/')[0]) || 16) / (Number(shot.ratio.split('/')[1]) || 9)}))` }}
            >
              <div className="grain absolute inset-0" style={{ background: shot.gradient }} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={shot.id + version}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: shot.gradient }}
                >
                  <div className="text-center">
                    <p className="font-display text-4xl font-black tracking-tight text-white/85">{version.toUpperCase()}</p>
                    <p className="mt-1 text-xs text-white/45">{shot.title}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* pins */}
              {shotComments.filter((c) => c.pin).map((c) => (
                <Pin
                  key={c.id}
                  x={c.pin!.x}
                  y={c.pin!.y}
                  num={pinNumbers.get(c.id)}
                  resolved={c.resolved}
                  active={activeId === c.id}
                  accent={accent}
                  rtl={rtl}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = activeId === c.id ? null : c.id;
                    if (next) setFilter('all');
                    setActiveId(next);
                  }}
                />
              ))}

              {/* pending composer */}
              <AnimatePresence>
                {pending && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute z-30 w-56 rounded-xl border border-accent/40 bg-surface p-2.5 shadow-2xl`}
                    style={{
                      left: `${pending.x}%`,
                      top: `${pending.y}%`,
                      transform: `translate(${pending.x > 62 ? '-100%' : '0'}, -110%)`
                    }}
                  >
                    <span className="absolute -bottom-1.5 start-4 h-3 w-3 rotate-45 border-b border-e border-accent/40 bg-surface" />
                    <textarea
                      autoFocus
                      value={pendingText}
                      onChange={(e) => setPendingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          commitPending();
                        }
                      }}
                      rows={2}
                      placeholder={t('addComment')}
                      className="w-full resize-none rounded-md border border-line bg-bg px-2.5 py-1.5 text-[11px] outline-none placeholder:text-muted/60 focus:border-accent/60"
                    />
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <button
                        onClick={commitPending}
                        disabled={!pendingText.trim()}
                        className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold text-bg disabled:opacity-40"
                      >
                        {t('send')}
                      </button>
                      <button
                        onClick={() => setPending(null)}
                        className="rounded-full border border-line px-2.5 py-1 text-[10px] text-muted hover:text-ink"
                      >
                        ✕
                      </button>
                      <span className="ms-auto font-mono text-[9px] text-muted/50">{Math.round(pending.x)}·{Math.round(pending.y)}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* hint */}
            <AnimatePresence>
              {!pending && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2 rounded-full border border-line bg-bg/80 px-3 py-1 text-[10px] text-muted backdrop-blur"
                >
                  ✚ {t('newPinHint')}
                </motion.p>
              )}
            </AnimatePresence>

            {/* thumbnails */}
            <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center">
              <div className="flex items-end gap-1.5 rounded-xl border border-line bg-surface/90 p-1.5 backdrop-blur">
                {MOCK_DELIVERABLES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setShotId(d.id)}
                    className={`overflow-hidden rounded-md transition-all ${
                      d.id === shotId ? 'ring-2 ring-accent' : 'opacity-45 hover:opacity-90'
                    }`}
                  >
                    <span className="block w-14" style={{ aspectRatio: d.ratio, background: d.gradient }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* ── side panel ── */}
        <aside className="flex w-[300px] shrink-0 flex-col border-s border-line bg-surface/50">
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
            <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-2 py-0.5 text-[10px] font-bold text-orange-300 tabular-nums">
              {openCount} {t('openNotes')}
            </span>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 tabular-nums">
              {resolvedCount} {t('resolvedNotes')}
            </span>
          </div>

          <div className="flex gap-1 border-b border-line px-3 py-1.5">
            {(['all', 'open', 'done'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
                  filter === f ? 'bg-ink/10 text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {t(`filter_${f}` as StrKey)}
              </button>
            ))}
            <span className="ms-auto self-center font-mono text-[9px] text-muted/50">{vRow?.date}</span>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
            {visibleComments.length === 0 && (
              <p className="pt-10 text-center text-[11px] text-muted/60">—</p>
            )}
            {visibleComments.map((c) => {
              const d = MOCK_DELIVERABLES.find((x) => x.id === c.shotId)!;
              return (
                <CommentCard
                  key={c.id}
                  c={c}
                  num={pinNumbers.get(c.id)}
                  active={activeId === c.id}
                  tag={d.title}
                  icon={KIND_ICON[d.kind]}
                  rtl={rtl}
                  t={t}
                  onHover={() => c.shotId === shotId && setActiveId(c.id)}
                  onLeave={() => setActiveId(null)}
                  onClick={() => {
                    setShotId(c.shotId);
                    setActiveId(c.id);
                  }}
                  onResolve={() => toggleResolve(c.id)}
                />
              );
            })}
          </div>

          {/* general composer (no pin) */}
          <div className="border-t border-line p-2.5">
            <div className="flex gap-1.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.trim()) {
                    setComments((cs) => [
                      ...cs,
                      { id: `c${Date.now()}`, shotId, author: t('you'), role: t('clientRole'), time: t('now'), textEn: draft.trim(), textAr: draft.trim(), resolved: false }
                    ]);
                    setDraft('');
                  }
                }}
                placeholder={t('addComment')}
                className="min-w-0 flex-1 rounded-full border border-line bg-bg px-3 py-1.5 text-[11px] outline-none placeholder:text-muted/60 focus:border-accent/60"
              />
              <span className="self-center font-mono text-[9px] text-muted/40">↵</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Pin({
  x, y, num, resolved, active, accent, rtl, onClick
}: {
  x: number; y: number; num?: number; resolved: boolean; active: boolean; accent: string; rtl: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.15 }}
      onClick={onClick}
      style={{ left: `${x}%`, top: `${y}%`, backgroundColor: resolved ? '#3f3f3f' : accent }}
      className={`absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full rounded-bl-none text-[10px] font-black shadow-lg transition-shadow ${
        active ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''
      } ${resolved ? 'text-muted' : 'text-bg'} ${rtl ? 'rounded-br-none rounded-bl-full' : ''}`}
    >
      {resolved ? '✓' : num}
    </motion.button>
  );
}

function CommentCard({
  c, num, active, tag, icon, rtl, t,
  onClick, onHover, onLeave, onResolve
}: {
  c: CommentItem; num?: number; active: boolean; tag: string; icon: string; rtl: boolean;
  t: (k: StrKey) => string;
  onClick: () => void; onHover: () => void; onLeave: () => void; onResolve: () => void;
}) {
  return (
    <motion.div
      layout
      data-cid={c.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-2.5 transition-all ${
        active ? 'border-accent/60 bg-accent/5' : 'border-line bg-bg hover:border-accent/30'
      } ${c.resolved ? 'opacity-55' : ''}`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={`flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full rounded-bl-none text-[9px] font-black ${
            c.resolved ? 'bg-neutral-700 text-muted' : 'bg-accent text-bg'
          } ${rtl ? 'rounded-br-none rounded-bl-full' : ''}`}
        >
          {c.resolved ? '✓' : num ?? '!'}
        </span>
        <p className="truncate text-[11px] font-bold">{c.author}</p>
        <span className="truncate text-[10px] text-muted/70">{c.role}</span>
        <span className="ms-auto shrink-0 font-mono text-[9px] text-muted/60" dir="ltr">{c.time}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted">{rtl ? c.textAr : c.textEn}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="rounded border border-line px-1.5 py-px text-[9px] text-muted/70">{icon} {tag}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onResolve();
          }}
          className={`ms-auto rounded-full border px-2 py-px text-[9px] font-bold transition-colors ${
            c.resolved
              ? 'border-line text-muted hover:border-accent hover:text-accent'
              : 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10'
          }`}
        >
          {c.resolved ? `⟳ ${t('reopen')}` : `✓ ${t('resolve')}`}
        </button>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status, label }: { status: ProjectStatus; label: string }) {
  const pulse = status === 'review' || status === 'changes';
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-px text-[10px] font-semibold ${STATUS_CLASS[status]}`}>
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}
