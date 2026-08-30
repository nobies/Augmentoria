import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../../i18n';
import type { AnnotationLayer, ChecklistItem, ReviewComment } from '../../lib/store';
import { parseMentions } from '../../lib/store';
import { loadCommentThumbnail, saveCommentThumbnail } from '../../lib/commentThumbnail';

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
  canModerate: boolean;
  getTime: () => number;
  getThumb: () => string;
  onSeek: (t: number) => void;
  onSelect: (id: string) => void;
  onToggleResolve: (id: string) => void;
  onReply: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onPost: (payload: { kind: 'frame' | 'range'; tc: number; rangeEnd?: number; text: string; mentions?: string[]; checklist?: ChecklistItem[] }) => void;
  onDraftRange: (r: { tc: number; rangeEnd?: number } | null) => void;
  draftLayers: AnnotationLayer[];
  layers: AnnotationLayer[];
  onRemoveDraftLayer: (id: string) => void;
  onToggleDraftLayer: (id: string, visible: boolean) => void;
  layerCounts: Record<string, number>;
  mobileOpen: boolean;
  onMobileClose: () => void;
  mentionCandidates: MemberLite[];
  onToggleChecklist: (commentId: string, itemId: string) => void;
  selectedLayerId?: string | null;
  onSelectLayer?: (id: string | null) => void;
  onDeleteLayer?: (id: string) => void;
  canEditLayers?: boolean;
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
  const [query, setQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [draftChecklist, setDraftChecklist] = useState<ChecklistItem[]>([]);
  const [checklistInput, setChecklistInput] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (rangeMode && inPt !== null) {
      p.onDraftRange({ tc: inPt, rangeEnd: outPt ?? undefined });
    } else {
      p.onDraftRange(null);
    }
  }, [rangeMode, inPt, outPt]); // eslint-disable-line react-hooks/exhaustive-deps

  const authors = useMemo(() => {
    const ids = new Set(p.comments.map((c) => c.authorId));
    return [...ids].map((id) => ({ id, name: p.members.get(id)?.name ?? 'Guest' })).sort((a, b) => a.name.localeCompare(b.name));
  }, [p.comments, p.members]);

  const list = useMemo(() => {
    let arr = [...p.comments].sort((a, b) => a.tc - b.tc);
    if (filter === 'open') arr = arr.filter((c) => !c.resolved);
    if (filter === 'resolved') arr = arr.filter((c) => c.resolved);
    if (authorFilter !== 'all') arr = arr.filter((c) => c.authorId === authorFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (c) =>
          c.text.toLowerCase().includes(q) ||
          c.replies.some((r) => r.text.toLowerCase().includes(q)) ||
          (c.checklist ?? []).some((item) => item.text.toLowerCase().includes(q))
      );
    }
    return arr;
  }, [p.comments, filter, query, authorFilter]);

  const mentionMatches = useMemo(() => {
    if (!mentionOpen) return [];
    const token = /@([\p{L}\p{N}_.]*)$/u.exec(text.slice(0, composerRef.current?.selectionStart ?? text.length));
    if (!token) return [];
    const q = token[1].toLowerCase();
    return p.mentionCandidates.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 5);
  }, [mentionOpen, text, p.mentionCandidates]);

  const insertMention = (name: string) => {
    const el = composerRef.current;
    const pos = el?.selectionStart ?? text.length;
    const before = text.slice(0, pos).replace(/@([\p{L}\p{N}_.]*)$/u, `@${name} `);
    const next = before + text.slice(pos);
    setText(next);
    setMentionOpen(false);
    window.setTimeout(() => el?.focus(), 0);
  };

  const addChecklistItem = () => {
    const value = checklistInput.trim();
    if (!value) return;
    setDraftChecklist((items) => [...items, { id: `ck-${Date.now()}-${items.length}`, text: value, done: false }]);
    setChecklistInput('');
  };

  const post = () => {
    const hasVisualFeedback = p.draftLayers.some((layer) => layer.visible);
    const hasChecklist = draftChecklist.length > 0;
    if (!text.trim() && !hasVisualFeedback && !hasChecklist) return;
    const tc = inPt ?? p.getTime();
    p.onPost({
      kind: rangeMode && outPt ? 'range' : 'frame',
      tc,
      rangeEnd: rangeMode && outPt ? outPt : undefined,
      text: text.trim() || (lang === 'ar' ? 'تعليق بصري' : 'Visual feedback'),
      mentions: parseMentions(text, p.mentionCandidates),
      checklist: draftChecklist.length > 0 ? draftChecklist : undefined
    });
    setText('');
    setRangeMode(false);
    setInPt(null);
    setOutPt(null);
    setDraftChecklist([]);
    setChecklistInput('');
    setMentionOpen(false);
  };

  const chip = 'rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors';
  const inputCls = 'w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-accent';

  return (
    <aside
      id="review-comments"
      className={`flex h-full min-h-0 w-[350px] shrink-0 flex-col border-s border-line bg-surface max-xl:w-[300px] max-lg:absolute max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:h-[min(62vh,32rem)] max-lg:w-full max-lg:rounded-t-2xl max-lg:border-s-0 max-lg:border-t max-lg:shadow-2xl max-lg:transition-transform max-lg:duration-300 ${
        p.mobileOpen ? 'lg:flex' : 'lg:hidden'
      } ${
        p.mobileOpen ? 'max-lg:visible max-lg:translate-y-0' : 'max-lg:invisible max-lg:pointer-events-none max-lg:translate-y-full'
      }`}
    >
      <div className="hidden items-center justify-center border-b border-line py-2 max-lg:flex">
        <span className="h-1 w-10 rounded-full bg-line" />
        <button
          type="button"
          onClick={p.onMobileClose}
          aria-label={t('rv_close_comments')}
          className="absolute end-3 top-1 rounded-full p-2 text-lg text-muted transition-colors hover:text-ink"
        >
          ×
        </button>
      </div>
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

      {(p.comments.length > 3 || authorFilter !== 'all' || query) && (
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('rv_search_ph')}
              className="w-full rounded-full border border-line bg-bg px-3 py-1.5 text-xs outline-none focus:border-accent"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label={t('toast_dismiss')} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                ×
              </button>
            )}
          </div>
          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="shrink-0 rounded-full border border-line bg-bg px-2.5 py-1.5 text-xs outline-none focus:border-accent"
          >
            <option value="all">{t('rv_filter_author')}</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {list.length === 0 && <p className="pt-10 text-center text-xs text-muted">{p.comments.length === 0 ? t('rv_no_comments') : t('rv_no_match')}</p>}

        {list.map((c) => {
          const author = p.members.get(c.authorId);
          const count = p.layerCounts[c.id] ?? 0;
          const commentLayers = p.layers.filter((layer) => layer.commentId === c.id && layer.visible);
          const isActive = c.id === p.activeId;
          return (
            <div
              key={c.id}
              onClick={() => {
                p.onSelect(c.id);
                p.onSeek(c.tc);
              }}
              className={`cursor-pointer rounded-xl border p-2.5 transition-all ${
                isActive ? 'border-accent/60 bg-accent/[0.06] shadow-sm' : 'border-line/70 bg-surface/50 hover:border-line hover:bg-surface'
              } ${c.resolved ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-2.5">
                {author?.avatar ? (
                  <img src={author.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                ) : (
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{ backgroundColor: `${author?.color ?? '#888'}22`, color: author?.color ?? '#888' }}
                  >
                    {author?.name.split(' ').map((x) => x[0]).slice(0, 2).join('') ?? '?'}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate text-xs font-semibold">{author?.name ?? 'Guest'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        p.onSeek(c.tc);
                      }}
                      className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent hover:bg-accent/20"
                    >
                      {fmt(c.tc)}
                      {c.kind === 'range' && ` → ${fmt(c.rangeEnd ?? c.tc)}`}
                    </button>
                  </div>
                  <CommentText text={c.text} members={p.members} className={`mt-1 text-xs leading-normal ${c.resolved ? 'line-through decoration-muted/50' : ''}`} />

                  <StoredCommentThumbnailView
                    id={c.id}
                    clean={c.cleanThumb}
                    annotated={c.thumb}
                    layers={commentLayers}
                  />

                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                    {count > 0 && (
                      <span className="rounded-full border border-line px-2 py-0.5">
                        ✎ {count} {lang === 'ar' ? 'طبقة' : 'layer(s)'}
                      </span>
                    )}
                    <span>{c.createdAt.slice(11)}</span>
                    <span className="ms-auto flex items-center gap-1.5">
                      {p.canModerate && (
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
                      )}
                      {p.canComment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyTo(replyTo === c.id ? null : c.id);
                          }}
                          className="rounded-full border border-line px-2 py-0.5 transition-colors hover:border-accent hover:text-accent"
                        >
                          ↩ {c.replies.length || ''}
                        </button>
                      )}
                      {p.canModerate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            p.onDelete(c.id);
                          }}
                          className="rounded-full border border-line px-2 py-0.5 transition-colors hover:border-red-400 hover:text-red-400"
                        >
                          🗑
                        </button>
                      )}
                    </span>
                  </div>

                  {c.checklist && c.checklist.length > 0 && (
                    <div className="mt-2 rounded-lg border border-line bg-surface/60 px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold tracking-wider text-muted uppercase">
                        <span>{t('rv_checklist_add')}</span>
                        <span className="text-accent">
                          {c.checklist.filter((item) => item.done).length}/{c.checklist.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {c.checklist.map((item) => (
                          <label key={item.id} className="flex cursor-pointer items-center gap-2 text-[11px]">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => p.onToggleChecklist(c.id, item.id)}
                              disabled={!p.canComment}
                              className="accent-accent"
                            />
                            <span className={item.done ? 'text-muted line-through' : ''}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attached Annotation Layers & Edit Mode Controls */}
                  {(() => {
                    const commentLayers = p.layers.filter((l) => l.commentId === c.id);
                    if (!commentLayers.length) return null;
                    return (
                      <div className="mt-2.5 rounded-lg border border-accent/30 bg-accent/5 p-2" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-accent uppercase">
                          <span>🎨 {lang === 'ar' ? 'الرسومات والطبقات' : 'Layers'} ({commentLayers.length})</span>
                          {p.canEditLayers && p.selectedLayerId && commentLayers.some((l) => l.id === p.selectedLayerId) && (
                            <button
                              type="button"
                              onClick={() => p.onSelectLayer?.(null)}
                              className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] text-accent hover:bg-accent/30"
                              title={lang === 'ar' ? 'إلغاء وضع التعديل' : 'Exit edit mode'}
                            >
                              ✕ {lang === 'ar' ? 'إنهاء التعديل' : 'Done editing'}
                            </button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {commentLayers.map((layer, idx) => {
                            const isEditing = p.selectedLayerId === layer.id;
                            return (
                              <div
                                key={layer.id}
                                className={`flex items-center justify-between gap-1.5 rounded border px-2 py-1 text-[11px] transition-colors ${
                                  isEditing
                                    ? 'border-accent bg-accent/20 text-accent font-bold ring-1 ring-accent/40'
                                    : 'border-line/60 bg-surface/50 text-muted hover:border-accent/40 hover:text-ink'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                                  <span className="truncate">
                                    {layer.type === 'text' && layer.text ? `“${layer.text}”` : `${idx + 1}. ${layer.type}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {p.canEditLayers && (
                                    <button
                                      type="button"
                                      onClick={() => p.onSelectLayer?.(isEditing ? null : layer.id)}
                                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
                                        isEditing
                                          ? 'bg-accent text-bg font-bold'
                                          : 'border border-line bg-surface text-muted hover:border-accent hover:text-accent'
                                      }`}
                                      title={isEditing ? (lang === 'ar' ? 'إلغاء التعديل' : 'Deselect') : (lang === 'ar' ? 'تعديل وتحريك' : 'Edit & Transform')}
                                    >
                                      {isEditing ? (lang === 'ar' ? '✓ جاري التعديل' : '✓ Editing') : (lang === 'ar' ? '✏ تعديل' : '✏ Edit')}
                                    </button>
                                  )}
                                  {p.canEditLayers && p.onDeleteLayer && (
                                    <button
                                      type="button"
                                      onClick={() => p.onDeleteLayer?.(layer.id)}
                                      className="rounded border border-line px-1 py-0.5 text-[9px] text-muted hover:border-red-400 hover:text-red-400"
                                      title={lang === 'ar' ? 'حذف الطبقة' : 'Delete layer'}
                                    >
                                      🗑
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

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

          <div className="relative">
            <textarea
              id="rv-composer-text"
              ref={composerRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setMentionOpen(/@[\p{L}\p{N}_.]*$/u.test(e.target.value.slice(0, e.target.selectionStart ?? e.target.value.length)));
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') post();
                if (e.key === 'Escape') setMentionOpen(false);
              }}
              rows={2}
              placeholder={t('rv_composer_ph')}
              className={`${inputCls} resize-none`}
            />
            {mentionMatches.length > 0 && (
              <div className="absolute inset-x-0 bottom-full z-20 mb-1 overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
                {mentionMatches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => insertMention(m.name)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-start text-xs transition-colors hover:bg-bg"
                  >
                    <span className="h-5 w-5 rounded-full" style={{ backgroundColor: `${m.color}33`, color: m.color }} />
                    <span className="font-semibold">@{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {p.canComment && (
            <div className="rounded-lg border border-line px-2.5 py-2">
              <div className="flex items-center gap-2">
                <input
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  placeholder={t('rv_checklist_ph')}
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted/50"
                />
                <button
                  onClick={() => setDraftChecklist((items) => items.filter((_, i) => i !== items.length - 1))}
                  disabled={draftChecklist.length === 0}
                  className="text-[10px] text-muted hover:text-red-400 disabled:opacity-30"
                  title={t('toast_dismiss')}
                >
                  ✕
                </button>
              </div>
              {draftChecklist.length > 0 && (
                <div className="mt-1.5 space-y-0.5 border-t border-line pt-1.5">
                  {draftChecklist.map((item) => (
                    <p key={item.id} className="flex items-center gap-1.5 text-[11px] text-muted">
                      <span className="text-accent">☐</span> {item.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

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
            <span className="text-[10px] text-muted/50">{lang === 'ar' ? 'يمكن نشر الرسم أو الصورة بدون كتابة نص' : 'Visual feedback can be posted without text'}</span>
            <button
              onClick={post}
              disabled={!text.trim() && !p.draftLayers.some((layer) => layer.visible) && draftChecklist.length === 0}
              className="ms-auto rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold text-bg transition-all hover:bg-accent-dim disabled:opacity-40"
            >
              {t('rv_post')} ↑
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function CommentText({ text, members, className }: { text: string; members: Map<string, MemberLite>; className?: string }) {
  const names = useMemo(() => [...members.values()].map((m) => m.name).filter(Boolean), [members]);

  const parts = useMemo(() => {
    if (names.length === 0) return [{ chunk: text, mention: false }];
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(@(?:${escaped}))\\b`, 'g');
    return text.split(regex).map((chunk) => ({ chunk, mention: chunk.startsWith('@') }));
  }, [text, names]);

  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.mention ? (
          <span key={i} className="rounded bg-accent/15 px-1 font-semibold text-accent">
            {part.chunk}
          </span>
        ) : (
          <span key={i}>{part.chunk}</span>
        )
      )}
    </p>
  );
}

function StoredCommentThumbnailView({ id, clean, annotated, layers }: { id: string; clean?: string; annotated?: string; layers: AnnotationLayer[] }) {
  const [stored, setStored] = useState<{ clean?: string; annotated?: string } | null>(clean || annotated ? { clean, annotated } : null);

  useEffect(() => {
    let active = true;
    if (clean || annotated) {
      setStored({ clean, annotated });
      void saveCommentThumbnail(id, clean, annotated).catch(() => {
        window.dispatchEvent(new CustomEvent('augmentoria:persistence-error'));
      });
      return () => {
        active = false;
      };
    }
    void loadCommentThumbnail(id).then((record) => {
      if (active && record) setStored(record);
    });
    return () => {
      active = false;
    };
  }, [id, clean, annotated]);

  const src = stored?.clean ?? stored?.annotated;
  if (!src) return null;
  return <CommentThumbnail src={src} layers={stored?.clean ? layers : []} />;
}

function CommentThumbnail({ src, layers }: { src: string; layers: AnnotationLayer[] }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setZoomed(true);
        }}
        title="انقر لتكبير اللقطة"
        className="group relative mt-1.5 h-20 w-36 overflow-hidden rounded-lg border border-line bg-black cursor-zoom-in transition-transform hover:scale-[1.03]"
      >
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true">
          {layers.map((layer) => {
            const cx = (layer.x ?? 0) + (layer.w ?? 0) / 2;
            const cy = (layer.y ?? 0) + (layer.h ?? 0) / 2;
            const transform = layer.rotation ? `rotate(${layer.rotation} ${cx} ${cy})` : undefined;
            return (
              <g key={layer.id} opacity={layer.opacity ?? 0.95} transform={transform}>
                {layer.type === 'pen' && layer.pts && <polyline points={layer.pts.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={layer.color} strokeWidth={8} strokeLinecap="round" />}
                {layer.type === 'arrow' && layer.x !== undefined && layer.y !== undefined && layer.w !== undefined && layer.h !== undefined && <line x1={layer.x} y1={layer.y} x2={layer.x + layer.w} y2={layer.y + layer.h} stroke={layer.color} strokeWidth={8} strokeLinecap="round" />}
                {layer.type === 'circle' && layer.x !== undefined && layer.y !== undefined && layer.w && layer.h && <ellipse cx={layer.x + layer.w / 2} cy={layer.y + layer.h / 2} rx={layer.w / 2} ry={layer.h / 2} fill="none" stroke={layer.color} strokeWidth={8} />}
                {layer.type === 'rect' && layer.x !== undefined && layer.y !== undefined && layer.w && layer.h && <rect x={layer.x} y={layer.y} width={layer.w} height={layer.h} fill="none" stroke={layer.color} strokeWidth={8} />}
                {layer.type === 'text' && layer.x !== undefined && layer.y !== undefined && layer.text && <text x={layer.x} y={layer.y} fill={layer.color} fontSize={layer.fs} fontWeight={700}>{layer.text}</text>}
                {layer.type === 'image' && layer.x !== undefined && layer.y !== undefined && layer.w && layer.h && layer.src && <image href={layer.src} x={layer.x} y={layer.y} width={layer.w} height={layer.h} preserveAspectRatio="xMidYMid meet" />}
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white">
          🔍
        </div>
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(false);
          }}
        >
          <div className="relative max-w-3xl w-full aspect-video rounded-xl overflow-hidden border border-line bg-black shadow-2xl">
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1280 720" preserveAspectRatio="none">
              {layers.map((layer) => {
                const cx = (layer.x ?? 0) + (layer.w ?? 0) / 2;
                const cy = (layer.y ?? 0) + (layer.h ?? 0) / 2;
                const transform = layer.rotation ? `rotate(${layer.rotation} ${cx} ${cy})` : undefined;
                return (
                  <g key={layer.id} opacity={layer.opacity ?? 0.95} transform={transform}>
                    {layer.type === 'pen' && layer.pts && <polyline points={layer.pts.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={layer.color} strokeWidth={8} strokeLinecap="round" />}
                    {layer.type === 'arrow' && layer.x !== undefined && layer.y !== undefined && layer.w !== undefined && layer.h !== undefined && <line x1={layer.x} y1={layer.y} x2={layer.x + layer.w} y2={layer.y + layer.h} stroke={layer.color} strokeWidth={8} strokeLinecap="round" />}
                    {layer.type === 'circle' && layer.x !== undefined && layer.y !== undefined && layer.w && layer.h && <ellipse cx={layer.x + layer.w / 2} cy={layer.y + layer.h / 2} rx={layer.w / 2} ry={layer.h / 2} fill="none" stroke={layer.color} strokeWidth={8} />}
                    {layer.type === 'rect' && layer.x !== undefined && layer.y !== undefined && layer.w && layer.h && <rect x={layer.x} y={layer.y} width={layer.w} height={layer.h} fill="none" stroke={layer.color} strokeWidth={8} />}
                    {layer.type === 'text' && layer.x !== undefined && layer.y !== undefined && layer.text && <text x={layer.x} y={layer.y} fill={layer.color} fontSize={layer.fs} fontWeight={700}>{layer.text}</text>}
                    {layer.type === 'image' && layer.x !== undefined && layer.y !== undefined && layer.w && layer.h && layer.src && <image href={layer.src} x={layer.x} y={layer.y} width={layer.w} height={layer.h} preserveAspectRatio="xMidYMid meet" />}
                  </g>
                );
              })}
            </svg>
            <button
              onClick={() => setZoomed(false)}
              className="absolute top-3 end-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white hover:bg-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
