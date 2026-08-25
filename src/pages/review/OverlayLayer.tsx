import { useEffect, useRef, useState } from 'react';
import type { AnnotationLayer, LayerType } from '../../lib/store';
import { fileToDataUrl } from '../../lib/image';

export const REF_W = 1280;
export const REF_H = 720;

interface Props {
  tool: LayerType | 'select';
  color: string;
  layers: AnnotationLayer[];
  draftKey: string;
  canDraw: boolean;
  aspect: number;
  onAdd: (l: Omit<AnnotationLayer, 'id' | 'visible'>) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<AnnotationLayer, 'visible' | 'text' | 'src' | 'x' | 'y' | 'w' | 'h' | 'fs' | 'opacity' | 'rotation' | 'color'>>
  ) => void;
  onDelete: (id: string) => void;
}

type ShapeDraft = {
  type: 'pen' | 'arrow' | 'circle' | 'rect';
  pts?: { x: number; y: number }[];
  x: number;
  y: number;
  w: number;
  h: number;
};

export default function OverlayLayer({ tool, color, layers, draftKey, canDraw, aspect, onAdd, onUpdate, onDelete }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [box, setBox] = useState({ w: 1280, h: 720 });
  const [draft, setDraft] = useState<ShapeDraft | null>(null);
  const [textEdit, setTextEdit] = useState<{ x: number; y: number; value: string } | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const content = (() => {
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

  const sx = content.w / REF_W;
  const sy = content.h / REF_H;

  const toRef = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left - content.x;
    const py = e.clientY - rect.top - content.y;
    return {
      x: Math.min(REF_W, Math.max(0, px / sx)),
      y: Math.min(REF_H, Math.max(0, py / sy))
    };
  };

  const drawing = canDraw && tool !== 'select';

  const onDown = (e: React.PointerEvent) => {
    if (!drawing || textEdit) return;
    const p = toRef(e);
    if (tool === 'image') {
      imgInputRef.current?.click();
      return;
    }
    if (tool === 'text') {
      e.preventDefault();
      setTextEdit({ x: p.x, y: p.y, value: '' });
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === 'pen') setDraft({ type: 'pen', pts: [p], x: p.x, y: p.y, w: 0, h: 0 });
    else setDraft({ type: tool as 'arrow' | 'circle' | 'rect', x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onMove = (e: React.PointerEvent) => {
    if (!draft) return;
    const p = toRef(e);
    setDraft((d) => {
      if (!d) return d;
      if (d.type === 'pen') return { ...d, pts: [...(d.pts ?? []), p] };
      return { ...d, w: p.x - d.x, h: p.y - d.y };
    });
  };

  const onUp = () => {
    if (!draft) return;
    if (draft.type === 'pen' && (draft.pts?.length ?? 0) > 1) {
      onAdd({ type: 'pen', pts: draft.pts, color, sw: 3, fs: 18, commentId: draftKey });
    } else if (draft.type === 'arrow' && Math.hypot(draft.w, draft.h) > 8) {
      onAdd({ type: 'arrow', x: draft.x, y: draft.y, w: draft.w, h: draft.h, color, sw: 3, fs: 18, commentId: draftKey });
    } else if ((draft.type === 'circle' || draft.type === 'rect') && Math.abs(draft.w) > 6 && Math.abs(draft.h) > 6) {
      onAdd({
        type: draft.type,
        x: Math.min(draft.x, draft.x + draft.w),
        y: Math.min(draft.y, draft.y + draft.h),
        w: Math.abs(draft.w),
        h: Math.abs(draft.h),
        color,
        sw: 3,
        fs: 18,
        commentId: draftKey
      });
    }
    setDraft(null);
  };

  const commitText = () => {
    if (textEdit && textEdit.value.trim()) {
      onAdd({
        type: 'text',
        x: textEdit.x,
        y: textEdit.y,
        text: textEdit.value.trim(),
        color,
        sw: 2,
        fs: 26,
        commentId: draftKey
      });
    }
    setTextEdit(null);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const src = await fileToDataUrl(f, 640);
    const w = REF_W * 0.3;
    const h = w * 0.5625;
    onAdd({
      type: 'image',
      x: (REF_W - w) / 2,
      y: (REF_H - h) / 2,
      w,
      h,
      src,
      color,
      sw: 2,
      fs: 16,
      commentId: draftKey
    });
  };

  const managedList = layers;
  const selectedLayer = managedList.find((layer) => layer.id === selectedLayerId) ?? null;

  useEffect(() => {
    if (selectedLayerId && !layers.some((layer) => layer.id === selectedLayerId)) {
      setSelectedLayerId(layers.at(-1)?.id ?? null);
    } else if (!selectedLayerId && layers.length > 0) {
      setSelectedLayerId(layers.at(-1)?.id ?? null);
    }
  }, [layers, selectedLayerId]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      <div
        className={`absolute ${drawing ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
        style={{ left: content.x, top: content.y, width: content.w, height: content.h }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        <svg data-testid="review-overlay" className="absolute inset-0 h-full w-full" viewBox={`0 0 ${REF_W} ${REF_H}`} preserveAspectRatio="none">
          {layers
            .filter((l) => l.visible)
            .map((l) => (
              <g key={l.id} opacity={l.opacity ?? 0.95} transform={layerTransform(l)}>
                {l.type === 'pen' && l.pts && l.pts.length > 1 && (
                  <polyline points={l.pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={l.color} strokeWidth={l.sw * 1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                )}
                {l.type === 'arrow' && l.w !== undefined && l.h !== undefined && l.x !== undefined && l.y !== undefined && (
                  <Arrow x={l.x} y={l.y} w={l.w} h={l.h} color={l.color} sw={l.sw * 1.6} />
                )}
                {l.type === 'circle' && l.w !== undefined && l.h !== undefined && l.x !== undefined && l.y !== undefined && (
                  <ellipse cx={l.x + l.w / 2} cy={l.y + l.h / 2} rx={l.w / 2} ry={l.h / 2} fill="none" stroke={l.color} strokeWidth={l.sw * 1.6} vectorEffect="non-scaling-stroke" />
                )}
                {l.type === 'rect' && l.w !== undefined && l.h !== undefined && l.x !== undefined && l.y !== undefined && (
                  <rect x={l.x} y={l.y} width={l.w} height={l.h} fill="none" stroke={l.color} strokeWidth={l.sw * 1.6} rx={4} vectorEffect="non-scaling-stroke" />
                )}
                {l.type === 'text' && l.text && l.x !== undefined && l.y !== undefined && (
                  <text x={l.x} y={l.y} fill={l.color} fontSize={l.fs} fontWeight={700} fontFamily="Cairo, Inter, sans-serif" stroke="#000" strokeWidth={0.8} paintOrder="stroke">
                    {l.text}
                  </text>
                )}
                {l.type === 'image' && l.src && l.x !== undefined && l.y !== undefined && l.w && l.h && (
                  <image href={l.src} x={l.x} y={l.y} width={l.w} height={l.h} preserveAspectRatio="xMidYMid meet" />
                )}
              </g>
            ))}

          {draft && draft.type === 'pen' && (draft.pts?.length ?? 0) > 1 && (
            <polyline points={draft.pts!.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          )}
          {draft && draft.type === 'arrow' && <Arrow x={draft.x} y={draft.y} w={draft.w} h={draft.h} color={color} sw={4} />}
          {draft && draft.type === 'circle' && (
            <ellipse cx={draft.x + draft.w / 2} cy={draft.y + draft.h / 2} rx={Math.abs(draft.w) / 2} ry={Math.abs(draft.h) / 2} fill="none" stroke={color} strokeWidth={4} vectorEffect="non-scaling-stroke" />
          )}
          {draft && draft.type === 'rect' && (
            <rect x={Math.min(draft.x, draft.x + draft.w)} y={Math.min(draft.y, draft.y + draft.h)} width={Math.abs(draft.w)} height={Math.abs(draft.h)} fill="none" stroke={color} strokeWidth={4} rx={4} vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {textEdit && (
          <input
            autoFocus
            value={textEdit.value}
            onChange={(e) => setTextEdit((t) => (t ? { ...t, value: e.target.value } : t))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText();
              if (e.key === 'Escape') setTextEdit(null);
            }}
            onBlur={commitText}
            placeholder="Type…"
            className="absolute z-20 rounded-md border border-accent bg-black/85 px-3 py-1.5 text-sm text-white outline-none"
            style={{ left: textEdit.x * sx, top: textEdit.y * sy - 14, minWidth: 170 }}
          />
        )}

        <input ref={imgInputRef} type="file" accept="image/*" hidden onChange={(e) => void onPickImage(e)} />
      </div>

      {drawing && (
        <div className="pointer-events-none absolute end-3 top-3 rounded-full bg-accent/90 px-3 py-1 text-[10px] font-bold uppercase text-bg">
          {tool === 'image' ? 'pick an image…' : `Draw · ${tool}`}
        </div>
      )}

      {managedList.length > 0 && (
        <div className="pointer-events-auto absolute start-3 top-14 z-40 w-64 space-y-1 rounded-xl border border-line bg-black/85 p-2 shadow-2xl backdrop-blur-md">
          <p className="px-1 text-[9px] font-bold tracking-widest text-muted/80 uppercase">Overlay layers ({managedList.length})</p>
          {managedList.map((l, i) => (
            <div key={l.id} className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-white/85 ${selectedLayerId === l.id ? 'bg-accent/20 ring-1 ring-accent/40' : 'bg-white/5'}`}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
              <button type="button" onClick={() => setSelectedLayerId((current) => (current === l.id ? null : l.id))} className="min-w-0 flex-1 truncate text-start">
                {i + 1}. {l.type}{l.type === 'text' && l.text ? ` — ${l.text}` : ''}
              </button>
              <button type="button" onClick={() => onUpdate(l.id, { visible: !l.visible })} className="opacity-70 hover:opacity-100" title="Toggle">
                {l.visible ? '👁' : '🚫'}
              </button>
              <button type="button" onClick={() => onDelete(l.id)} className="opacity-70 hover:text-red-400 hover:opacity-100" title="Delete">
                ✕
              </button>
            </div>
          ))}
          {selectedLayer && (
            <div className="space-y-2 rounded-lg border border-white/10 bg-black/35 p-2 text-[9px] text-white/70">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold tracking-wider text-accent uppercase">{selectedLayer.type} properties</span>
                <input
                  type="color"
                  aria-label="Layer color"
                  value={selectedLayer.color}
                  onChange={(event) => onUpdate(selectedLayer.id, { color: event.target.value })}
                  className="h-6 w-8 cursor-pointer rounded border border-white/15 bg-transparent p-0.5"
                />
              </div>
              {selectedLayer.type === 'text' && (
                <label className="block">
                  <span className="mb-1 block">Text</span>
                  <input
                    type="text"
                    value={selectedLayer.text ?? ''}
                    onChange={(event) => onUpdate(selectedLayer.id, { text: event.target.value })}
                    className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 text-white outline-none focus:border-accent"
                  />
                </label>
              )}
              {(selectedLayer.x !== undefined || selectedLayer.y !== undefined) && (
                <div className="grid grid-cols-2 gap-2">
                  <LayerNumber label="X" value={selectedLayer.x ?? 0} onChange={(value) => onUpdate(selectedLayer.id, { x: value })} />
                  <LayerNumber label="Y" value={selectedLayer.y ?? 0} onChange={(value) => onUpdate(selectedLayer.id, { y: value })} />
                </div>
              )}
              {selectedLayer.w !== undefined && selectedLayer.h !== undefined && (
                <div className="grid grid-cols-2 gap-2">
                  <LayerNumber label="W" value={selectedLayer.w} min={8} onChange={(value) => onUpdate(selectedLayer.id, { w: value })} />
                  <LayerNumber label="H" value={selectedLayer.h} min={8} onChange={(value) => onUpdate(selectedLayer.id, { h: value })} />
                </div>
              )}
              {selectedLayer.type === 'text' && (
                <LayerNumber label="Font" value={selectedLayer.fs} min={8} onChange={(value) => onUpdate(selectedLayer.id, { fs: value })} />
              )}
              {selectedLayer.type !== 'pen' && (
                <div className="grid grid-cols-4 gap-1">
                  <button type="button" title="Move left" onClick={() => onUpdate(selectedLayer.id, { x: (selectedLayer.x ?? 0) - 10 })} className="rounded border border-white/10 py-1 hover:border-accent hover:text-accent">←</button>
                  <button type="button" title="Move up" onClick={() => onUpdate(selectedLayer.id, { y: (selectedLayer.y ?? 0) - 10 })} className="rounded border border-white/10 py-1 hover:border-accent hover:text-accent">↑</button>
                  <button type="button" title="Move down" onClick={() => onUpdate(selectedLayer.id, { y: (selectedLayer.y ?? 0) + 10 })} className="rounded border border-white/10 py-1 hover:border-accent hover:text-accent">↓</button>
                  <button type="button" title="Move right" onClick={() => onUpdate(selectedLayer.id, { x: (selectedLayer.x ?? 0) + 10 })} className="rounded border border-white/10 py-1 hover:border-accent hover:text-accent">→</button>
                </div>
              )}
              <div className="grid grid-cols-4 gap-1">
                <button type="button" title="Smaller" onClick={() => resizeLayer(selectedLayer, 0.9, onUpdate)} className="rounded border border-white/10 py-1 hover:border-accent hover:text-accent">− Size</button>
                <button type="button" title="Larger" onClick={() => resizeLayer(selectedLayer, 1.1, onUpdate)} className="rounded border border-white/10 py-1 hover:border-accent hover:text-accent">+ Size</button>
                <button type="button" title="Rotate left" onClick={() => onUpdate(selectedLayer.id, { rotation: (selectedLayer.rotation ?? 0) - 15 })} className="rounded border border-white/10 py-1 hover:border-accent hover:text-accent">↶ 15°</button>
                <button type="button" title="Rotate right" onClick={() => onUpdate(selectedLayer.id, { rotation: (selectedLayer.rotation ?? 0) + 15 })} className="rounded border border-white/10 py-1 hover:border-accent hover:text-accent">↷ 15°</button>
              </div>
              <label className="block">
                <span className="mb-1 flex justify-between"><span>Opacity</span><span>{Math.round((selectedLayer.opacity ?? 0.95) * 100)}%</span></span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selectedLayer.opacity ?? 0.95}
                  onChange={(event) => onUpdate(selectedLayer.id, { opacity: Number(event.target.value) })}
                  className="w-full accent-accent"
                />
              </label>
              {selectedLayer.type !== 'pen' && (
                <label className="block">
                  <span className="mb-1 flex justify-between"><span>Rotation</span><span>{Math.round(selectedLayer.rotation ?? 0)}°</span></span>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={selectedLayer.rotation ?? 0}
                    onChange={(event) => onUpdate(selectedLayer.id, { rotation: Number(event.target.value) })}
                    className="w-full accent-accent"
                  />
                </label>
              )}
            </div>
          )}
          {managedList.some((l) => l.commentId === draftKey) && (
            <p className="px-1 pt-0.5 text-[9px] leading-tight text-accent/80">Write a comment and Post to attach</p>
          )}
        </div>
      )}</div>
  );
}

function layerTransform(layer: AnnotationLayer) {
  if (!layer.rotation) return undefined;
  const cx = (layer.x ?? 0) + (layer.w ?? 0) / 2;
  const cy = (layer.y ?? 0) + (layer.h ?? 0) / 2;
  return `rotate(${layer.rotation} ${cx} ${cy})`;
}

function resizeLayer(
  layer: AnnotationLayer,
  factor: number,
  onUpdate: Props['onUpdate']
) {
  if (layer.type === 'text') {
    onUpdate(layer.id, { fs: Math.max(8, layer.fs * factor) });
    return;
  }
  if (layer.w !== undefined && layer.h !== undefined) {
    const nextW = Math.max(8, layer.w * factor);
    const nextH = Math.max(8, layer.h * factor);
    onUpdate(layer.id, {
      x: (layer.x ?? 0) - (nextW - layer.w) / 2,
      y: (layer.y ?? 0) - (nextH - layer.h) / 2,
      w: nextW,
      h: nextH
    });
  }
}

function LayerNumber({ label, value, min, onChange }: { label: string; value: number; min?: number; onChange: (value: number) => void }) {
  return (
    <label className="flex items-center gap-1">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={Math.round(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 flex-1 rounded border border-white/10 bg-black/50 px-1.5 py-1 text-white outline-none focus:border-accent"
      />
    </label>
  );
}

function Arrow({ x, y, w, h, color, sw }: { x: number; y: number; w: number; h: number; color: string; sw: number }) {
  const x2 = x + w;
  const y2 = y + h;
  const ang = Math.atan2(h, w);
  const len = Math.min(26, Math.hypot(w, h) / 3);
  const p1 = { x: x2 - len * Math.cos(ang - 0.45), y: y2 - len * Math.sin(ang - 0.45) };
  const p2 = { x: x2 - len * Math.cos(ang + 0.45), y: y2 - len * Math.sin(ang + 0.45) };
  return (
    <g>
      <line x1={x} y1={y} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <polyline points={`${p1.x},${p1.y} ${x2},${y2} ${p2.x},${p2.y}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
