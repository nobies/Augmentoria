import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../../i18n';
import type { CollectionImage, CollectionSettings } from '../../hooks/useCollectionMedia';

interface Props {
  images: CollectionImage[];
  settings: CollectionSettings;
  titleKey?: 'admin_title' | 'side_title';
  onClose: () => void;
  onLock?: () => void;
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onSettings: (patch: Partial<CollectionSettings>) => void;
}

export default function HeroAdmin({ images, settings, titleKey = 'admin_title', onClose, onLock, onAdd, onRemove, onToggle, onSettings }: Props) {
  const { t, dir } = useLang();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const slideX = dir === 'rtl' ? -420 : 420;

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
        className="fixed inset-y-0 end-0 z-[70] flex w-full max-w-md flex-col border-s border-line bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-bold">{t(titleKey)}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">{t('admin_hint')}</p>
          </div>
          <div className="flex items-center gap-2">
            {onLock && (
              <button
                onClick={onLock}
                className="rounded-full border border-line p-2 text-muted transition-colors hover:border-red-400 hover:text-red-400"
                aria-label={t('gate_lock')}
                title={t('gate_lock')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 019.9-1" strokeLinecap="round" />
                </svg>
              </button>
            )}
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
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) onAdd(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`mx-6 mt-6 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? 'border-accent bg-accent/5' : 'border-line hover:border-muted'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) onAdd(e.target.files);
              e.target.value = '';
            }}
          />
          <svg
            className="mx-auto mb-3 text-muted"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 16V4m0 0L7 9m5-5l5 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-muted">{t('admin_drop')}</p>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto px-6">
          {images.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">—</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  title={img.name}
                  className={`group relative aspect-video overflow-hidden rounded-lg border transition-all ${
                    img.active ? 'border-accent' : 'border-line opacity-40 grayscale'
                  }`}
                >
                  <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                  <button
                    onClick={() => onToggle(img.id)}
                    className="absolute start-1.5 top-1.5 rounded-md bg-black/60 p-1.5 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                    aria-label="Toggle"
                  >
                    {img.active ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <path d="M1 1l22 22" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(img.id)}
                    className="absolute end-1.5 top-1.5 rounded-md bg-black/60 p-1.5 text-red-400 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                    aria-label="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5 border-t border-line px-6 py-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('admin_slideshow')}</span>
            <button
              onClick={() => onSettings({ enabled: !settings.enabled })}
              className={`relative h-6 w-11 rounded-full transition-colors ${settings.enabled ? 'bg-accent' : 'bg-line'}`}
              aria-label="Toggle slideshow"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg transition-all ${
                  settings.enabled ? 'start-[22px]' : 'start-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-muted">{t('admin_opacity')}</span>
              <span className="tabular-nums text-accent">{Math.round(settings.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(settings.opacity * 100)}
              onChange={(e) => onSettings({ opacity: Number(e.target.value) / 100 })}
              className="w-full accent-accent"
            />
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-muted">{t('admin_interval')}</span>
              <span className="tabular-nums text-accent">{settings.interval}s</span>
            </div>
            <input
              type="range"
              min={3}
              max={15}
              value={settings.interval}
              onChange={(e) => onSettings({ interval: Number(e.target.value) })}
              className="w-full accent-accent"
              disabled={!settings.enabled}
            />
          </div>

          <p className="text-[11px] leading-relaxed text-muted/70">{t('admin_stored')}</p>
        </div>
      </motion.aside>
    </>
  );
}
