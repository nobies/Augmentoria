import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../../i18n';
import type { AnnotationLayer, ReviewComment } from '../../lib/store';

interface MemberLite {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

interface Props {
  comments: ReviewComment[];
  members: Map<string, MemberLite>;
  activeId: string | null;
  canComment: boolean;
  getTime: () => number;
  getThumb: () => string;
  onSeek: (t: number) => void;
  onSelect: (id: string) => void;
  onToggleResolve: (id: string) => void;
  onReply: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onPost: (payload: { kind: 'frame' | 'range'; tc: number; rangeEnd?: number; text: string }) => void;
  onDraftRange: (r: { tc: number; rangeEnd?: number } | null) => void;
  draftLayers: AnnotationLayer[];
  onRemoveDraftLayer: (id: string) => void;
  onToggleDraftLayer: (id: string, visible: boolean) => void;
  layerCounts: Record<string, number>;
}

type F = 'all' | 'open' | 'resolved';

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const f = Math.floor((t % 1) * 25);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export default function CommentsPanel(p: Props) {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<F>('all');
  const [text, setText] = useState('');
  const [rangeMode, setRangeMode] = useState(false);
  const [inPt, setInPt] = useState<number | null>(null);
  const [outPt, setOutPt] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (rangeMode && inPt !== null) {
      p.onDraftRange({ tc: inPt, rangeEnd: outPt ?? undefined });
    } else {
      p.onDraftRange(null);
    }
  }, [rangeMode, inPt, outPt]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    let arr = [...p.comments].sort((a, b) => a.tc - b.tc);
    if (filter === 'open') arr = arr.filter((c) => !c.resolved);
    if (filter === 'resolved') arr = arr.filter((c) => c.resolved);
    return arr;
  }, [p.comments, filter]);

  const post = () => {
    if (!text.trim()) return;
    const tc = inPt ?? p.getTime();
    p.onPost({
      kind: rangeMode && outPt ? 'range' : 'frame',
      tc,
      rangeEnd: rangeMode && outPt ? outPt : undefined,
      text: text.trim()
    });
    setText('');
    setRangeMode(false);
    setInPt(null);
    setOutPt(null);
  };

  const chip = 'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors';
  const inputCls = 'w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent';

  return (
    <div className="flex h-full min-h-0 w-[350px] shrink-0 flex-col border-s border-line bg-surface max-xl:w-[300px]">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
        {(['all', 'open', 'resolved'] as F[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`${chip} ${filter === f ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink'}`}
          >
            {f === 'all' ? t('rv_all') : f === 'open' ? t('rv_open') : t('rv_resolved')}
            <span className="ms-1.5 opacity-70">
              {f === 'all' ? p.comments.length : f === 'open' ? p.comments.filter((c) => !c.resolved).length : p.comments.filter((c) => c.resolved).length}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {list.length === 0 && <p className="pt-10 text-center text-xs text-muted">{t('rv_no_comments')}</p>}

        {list.map((c) => {
          const author = p.members.get(c.authorId);
          const count = p.layerCounts[c.id] ?? 0;
          const isActive = c.id === p.activeId;
          return (
            <div
              key={c.id}
              onClick={() => {
                p.onSelect(c.id);
                p.onSeek(c.tc);
              }}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                isActive ? 'border-accent/60 bg-accent/[0.06]' : 'border-line bg-bg hover:border-muted'
              } ${c.resolved ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                {author?.avatar ? (
                  <img src={author.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: `${author?.color ?? '#888'}22`, color: author?.color ?? '#888' }}
                  >
                    {author?.name.split(' ').map((x) => x[0]).slice(0, 2).join('') ?? '?'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold">{author?.name ?? 'Guest'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        p.onSeek(c.tc);
                      }}
                      className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent hover:bg-accent/20"
                    >
                      {fmt(c.tc)}
                      {c.kind === 'range' && ` → ${fmt(c.rangeEnd ?? c.tc)}`}
                    </button>
                  </div>
                  <p className={`mt-1.5 text-xs leading-relaxed ${c.resolved ? 'line-through decoration-muted/50' : ''}`}>{c.text}</p>

                  {c.thumb && (
                    <img
                      src={c.thumb}
                      alt=""
                      className="mt-2 w-full rounded-lg border border-line object-cover"
                      loading="lazy"
                    />
                  )}

                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                    {count > 0 && (
                      <span className="rounded-full border border-line px-2 py-0.5">
                        ✎ {count} {lang === 'ar' ? 'طبقة' : 'layer(s)'}
                      </span>
                    )}
                    <span>{c.createdAt.slice(11)}</span>
                    <span className="ms-auto flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          p.onToggleResolve(c.id);
                        }}
                        title={c.resolved ? t('rv_unresolve') : t('rv_resolve')}
                        className={`rounded-full border px-2 py-0.5 font-semibold transition-colors ${
                          c.resolved ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-line hover:border-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        ✓
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyTo(replyTo === c.id ? null : c.id);
                        }}
                        className="rounded-full border border-line px-2 py-0.5 transition-colors hover:border-accent hover:text-accent"
                      >
                        ↩ {c.replies.length || ''}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          p.onDelete(c.id);
                        }}
                        className="rounded-full border border-line px-2 py-0.5 transition-colors hover:border-red-400 hover:text-red-400"
                      >
                        🗑
                      </button>
                    </span>
                  </div>

                  {c.replies.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-s-2 border-line ps-3">
                      {c.replies.map((r) => {
                        const ra = p.members.get(r.authorId);
                        return (
                          <p key={r.id} className="text-[11px] leading-relaxed text-muted">
                            <b className="text-ink/80">{ra?.name ?? 'Guest'}</b> <span className="font-mono text-[9px] opacity-60">{r.at}</span>
                            <br />
                            {r.text}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  {replyTo === c.id && (
                    <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && replyText.trim()) {
                            p.onReply(c.id, replyText.trim());
                            setReplyText('');
                            setReplyTo(null);
                          }
                        }}
                        placeholder={t('rv_reply_ph')}
                        className="flex-1 rounded-md border border-line bg-bg px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                      />
                      <button
                        onClick={() => {
                          if (replyText.trim()) {
                            p.onReply(c.id, replyText.trim());
                            setReplyText('');
                            setReplyTo(null);
                          }
                        }}
                        className="rounded-md bg-accent px-3 text-xs font-bold text-bg"
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {p.canComment && (
        <div className="space-y-2.5 border-t border-line px-4 py-4">
          <div className="flex items-center justify-between text-[10px] tracking-wider text-muted uppercase">
            <span>{t('rv_new_comment')}</span>
            <span className="font-mono text-accent">{fmt(rangeMode && inPt !== null ? inPt : 0).replace(/^00:/, '')}</span>
          </div>

          <textarea
            id="rv-composer-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') post();
            }}
            rows={2}
            placeholder={t('rv_composer_ph')}
            className={`${inputCls} resize-none`}
          />

          {p.draftLayers.length > 0 && (
            <div className="rounded-lg border border-accent/30 bg-accent/5 px-2.5 py-2">
              <p className="mb-1.5 text-[10px] font-bold tracking-wider text-accent uppercase">
                {t('rv_attached')} ({p.draftLayers.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.draftLayers.map((l, i) => (
                  <span
                    key={l.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                      l.visible ? 'border-accent/40 text-ink/90' : 'border-line text-muted/60 line-through'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.type === 'text' && l.text ? `“${l.text}”` : `${i + 1}. ${l.type}`}
                    <button onClick={() => p.onToggleDraftLayer(l.id, !l.visible)} className="opacity-60 hover:opacity-100" title="Show/Hide">
                      {l.visible ? '👁' : '🚫'}
                    </button>
                    <button onClick={() => p.onRemoveDraftLayer(l.id)} className="opacity-60 hover:text-red-400 hover:opacity-100">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {rangeMode && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-2.5 py-2">
              <span className="text-[10px] font-bold tracking-wider text-accent uppercase">Range</span>
              <button onClick={() => setInPt(p.getTime())} className={`${chip} border-line text-muted hover:text-ink`} title={t('rv_mark_in')}>
                [ IN {inPt !== null ? fmt(inPt).slice(3) : '—'}
              </button>
              <button onClick={() => setOutPt(p.getTime())} className={`${chip} border-line text-muted hover:text-ink`} title={t('rv_mark_out')}>
                OUT {outPt !== null ? fmt(outPt).slice(3) : '—'} ]
              </button>
              {inPt !== null && outPt !== null && outPt > inPt && (
                <span className="font-mono text-[10px] text-accent">{(outPt - inPt).toFixed(2)}s</span>
              )}
              <button
                onClick={() => {
                  setRangeMode(false);
                  setInPt(null);
                  setOutPt(null);
                }}
                className="ms-auto text-[10px] text-muted hover:text-red-400"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (rangeMode) {
                  setRangeMode(false);
                  setInPt(null);
                  setOutPt(null);
                } else {
                  setRangeMode(true);
                  setInPt(p.getTime());
                  setOutPt(null);
                }
              }}
              className={`${chip} ${rangeMode ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-ink'}`}
            >
              ─●─ {t('rv_range_btn')}
            </button>
            <span className="text-[10px] text-muted/50">{lang === 'ar' ? 'ارسم على الفيديو وسيتم إرفاقه' : 'Draw on video — auto-attached'}</span>
            <button
              onClick={post}
              disabled={!text.trim()}
              className="ms-auto rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold text-bg transition-all hover:bg-accent-dim disabled:opacity-40"
            >
              {t('rv_post')} ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
