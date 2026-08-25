import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { useLandingSections } from '../../hooks/useLandingSections';
import { SECTION_TYPES } from '../../lib/pageSections';
import type { LandingSection, LText, SectionData, SectionItem, SectionType } from '../../lib/pageSections';

function LField({ label, value, onChange }: { label: string; value?: LText; onChange: (v: LText) => void }) {
  const v = value ?? { en: '', ar: '' };
  return (
    <div>
      <p className="mb-1.5 text-[11px] tracking-wider text-muted uppercase">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={v.en}
          onChange={(e) => onChange({ ...v, en: e.target.value })}
          placeholder="English"
          dir="ltr"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-xs outline-none focus:border-accent"
        />
        <input
          value={v.ar}
          onChange={(e) => onChange({ ...v, ar: e.target.value })}
          placeholder="عربي"
          dir="rtl"
          className="w-full rounded-md border border-line bg-bg px-3 py-2 text-xs outline-none focus:border-accent"
        />
      </div>
    </div>
  );
}

export default function PageBuilderPanel({ onClose }: { onClose: () => void }) {
  const { t, dir } = useLang();
  const store = useLandingSections();
  const slideX = dir === 'rtl' ? -520 : 520;
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setData = (id: string, patch: Partial<SectionData>) => store.updateData(id, patch);

  const setItem = (s: LandingSection, idx: number, patch: Partial<SectionItem>) => {
    const items = [...(s.data.items ?? [])];
    items[idx] = { ...items[idx], ...patch };
    setData(s.id, { items });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm"
      />
      <motion.aside
        initial={{ x: slideX, opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: slideX, opacity: 0.5 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed inset-y-0 end-0 z-[70] flex w-full max-w-xl flex-col border-s border-line bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-bold">{t('pb_title')}</h2>
            <p className="mt-1 text-xs text-muted">{t('pb_hint')}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-line p-2 text-muted transition-colors hover:border-accent hover:text-accent"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 border-b border-line px-6 py-4">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) store.addSection(e.target.value as SectionType);
              e.target.value = '';
            }}
            className="flex-1 rounded-md border border-line bg-bg px-3 py-2 text-xs outline-none focus:border-accent"
          >
            <option value="">{t('pb_add')}</option>
            {SECTION_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(`pb_type_${ty}` as never)}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (confirm(t('pb_reset_confirm'))) store.resetAll();
            }}
            className="rounded-md border border-line px-3 py-2 text-xs text-muted transition-colors hover:border-red-400 hover:text-red-400"
          >
            {t('pb_reset')}
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {store.sections.map((s, i) => (
            <SectionRow
              key={s.id}
              s={s}
              index={i}
              total={store.sections.length}
              imageUrl={store.imageUrl}
              fileRef={(el, key) => (fileRefs.current[key] = el)}
              onPickFile={(key) => fileRefs.current[key]?.click()}
              onFiles={async (key, files) => {
                const ids = await store.addImages(files);
                if (ids[0]) {
                  if (key === `row-${s.id}`) setData(s.id, { imageId: ids[0] });
                  else {
                    const itemIdx = Number(key.split('-item-')[1]);
                    setItem(s, itemIdx, { imageId: ids[0] });
                  }
                }
              }}
              onMove={(d) => store.move(s.id, d)}
              onToggle={() => store.toggleVisible(s.id)}
              onDelete={() => store.removeSection(s.id)}
              onEdit={(patch) => setData(s.id, patch)}
            />
          ))}
        </div>
      </motion.aside>
    </>
  );
}

interface RowProps {
  s: LandingSection;
  index: number;
  total: number;
  imageUrl: (id?: string) => string;
  fileRef: (el: HTMLInputElement | null, key: string) => void;
  onPickFile: (key: string) => void;
  onFiles: (key: string, files: FileList) => void;
  onMove: (dir: -1 | 1) => void;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (patch: Partial<SectionData>) => void;
}

function SectionRow({ s, index, total, imageUrl, fileRef, onPickFile, onFiles, onMove, onToggle, onDelete, onEdit }: RowProps) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const d = s.data;

  const setItemLocal = (idx: number, patch: Partial<SectionItem>) => {
    const items = [...(d.items ?? [])];
    items[idx] = { ...items[idx], ...patch };
    onEdit({ items });
  };

  const iconBtn =
    'rounded-md border border-line p-1.5 text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted';

  return (
    <div className={`rounded-xl border ${s.visible ? 'border-line bg-bg' : 'border-line/50 bg-bg/50 opacity-60'}`}>
      <div className="flex items-center gap-2 p-3">
        <span className="font-display w-8 text-center text-[10px] font-bold text-accent">{String(index + 1).padStart(2, '0')}</span>
        <span className="font-display flex-1 truncate text-xs font-bold tracking-wide uppercase">
          {t(`pb_type_${s.type}` as never)}
        </span>
        <button onClick={() => onMove(-1)} disabled={index === 0} className={iconBtn} aria-label="Up">
          ↑
        </button>
        <button onClick={() => onMove(1)} disabled={index === total - 1} className={iconBtn} aria-label="Down">
          ↓
        </button>
        <button onClick={onToggle} className={iconBtn} aria-label="Visible">
          {s.visible ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <path d="M1 1l22 22" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`${iconBtn} ${open ? 'border-accent text-accent' : ''}`}
          aria-label="Edit"
        >
          ✎
        </button>
        <button
          onClick={onDelete}
          className="rounded-md border border-line p-1.5 text-muted transition-colors hover:border-red-400 hover:text-red-400"
          aria-label="Delete"
        >
          🗑
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-line px-4 py-4">
          <LField label={t('f_subtitle')} value={d.subtitle} onChange={(v) => onEdit({ subtitle: v })} />
          <LField label={t('f_title')} value={d.title} onChange={(v) => onEdit({ title: v })} />

          {s.type === 'split' && (
            <>
              <LField label={t('f_body')} value={d.body} onChange={(v) => onEdit({ body: v })} />
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted select-none">
                <input
                  type="checkbox"
                  checked={!!d.reverse}
                  onChange={(e) => onEdit({ reverse: e.target.checked })}
                  className="accent-accent"
                />
                {t('f_reverse')}
              </label>

              <div>
                <p className="mb-1.5 text-[11px] tracking-wider text-muted uppercase">{t('f_bullets')}</p>
                <div className="space-y-2">
                  {(d.bullets ?? []).map((b, bi) => (
                    <div key={bi} className="grid grid-cols-[1fr_auto] gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={b.en}
                          onChange={(e) => {
                            const bullets = [...(d.bullets ?? [])];
                            bullets[bi] = { ...b, en: e.target.value };
                            onEdit({ bullets });
                          }}
                          placeholder="EN"
                          dir="ltr"
                          className="rounded-md border border-line bg-bg px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                        />
                        <input
                          value={b.ar}
                          onChange={(e) => {
                            const bullets = [...(d.bullets ?? [])];
                            bullets[bi] = { ...b, ar: e.target.value };
                            onEdit({ bullets });
                          }}
                          placeholder="AR"
                          dir="rtl"
                          className="rounded-md border border-line bg-bg px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                        />
                      </div>
                      <button
                        onClick={() => onEdit({ bullets: (d.bullets ?? []).filter((_, x) => x !== bi) })}
                        className="text-xs text-muted hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => onEdit({ bullets: [...(d.bullets ?? []), { en: '', ar: '' }] })}
                    className="text-xs text-accent hover:underline"
                  >
                    + {t('btn_add')}
                  </button>
                </div>
              </div>

              <input
                type="file"
                accept="image/*"
                hidden
                ref={(el) => fileRef(el, `row-${s.id}`)}
                onChange={(e) => {
                  if (e.target.files?.length) onFiles(`row-${s.id}`, e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="flex items-center gap-3">
                {imageUrl(d.imageId) ? (
                  <img src={imageUrl(d.imageId)} alt="" className="h-14 w-20 rounded-md border border-line object-cover" />
                ) : (
                  <div className="hero-fallback h-14 w-20 rounded-md border border-line" />
                )}
                <button
                  onClick={() => onPickFile(`row-${s.id}`)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {t('f_image')}
                </button>
              </div>
            </>
          )}

          {(s.type === 'features' || s.type === 'steps' || s.type === 'showcase' || s.type === 'team') && (
            <div className="space-y-3">
              <p className="text-[11px] tracking-wider text-muted uppercase">{t('f_items')}</p>
              {(d.items ?? []).map((item, ii) => (
                <div key={ii} className="space-y-2 rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-accent">#{ii + 1}</span>
                    <button
                      onClick={() => onEdit({ items: (d.items ?? []).filter((_, x) => x !== ii) })}
                      className="text-xs text-muted hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                  <LField label={t('f_title')} value={item.title} onChange={(v) => setItemLocal(ii, { title: v })} />
                  <LField label={t('f_desc')} value={item.desc} onChange={(v) => setItemLocal(ii, { desc: v })} />
                  {(s.type === 'showcase' || s.type === 'team') && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        ref={(el) => fileRef(el, `${s.id}-item-${ii}`)}
                        onChange={(e) => {
                          if (e.target.files?.length) onFiles(`${s.id}-item-${ii}`, e.target.files);
                          e.target.value = '';
                        }}
                      />
                      <div className="flex items-center gap-3">
                        {imageUrl(item.imageId) ? (
                          <img src={imageUrl(item.imageId)} alt="" className="h-12 w-18 rounded-md border border-line object-cover" />
                        ) : (
                          <div className="hero-fallback h-12 w-18 rounded-md border border-line" />
                        )}
                        <button
                          onClick={() => onPickFile(`${s.id}-item-${ii}`)}
                          className="rounded-md border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                        >
                          {t('f_image')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  onEdit({
                    items: [...(d.items ?? []), { title: { en: '', ar: '' }, desc: { en: '', ar: '' } }]
                  })
                }
                className="text-xs text-accent hover:underline"
              >
                + {t('btn_add')}
              </button>
            </div>
          )}

          {s.type === 'cta' && (
            <>
              <LField label={t('f_body')} value={d.body} onChange={(v) => onEdit({ body: v })} />
              <LField label={t('f_cta')} value={d.ctaLabel} onChange={(v) => onEdit({ ctaLabel: v })} />
            </>
          )}

          <p className="pt-1 text-right text-[10px] text-muted/50">{lang === 'ar' ? 'بيتحفظ تلقائيًا' : 'Auto-saved'}</p>
        </div>
      )}
    </div>
  );
}
