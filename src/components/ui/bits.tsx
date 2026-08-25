import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';

const BRAND_COLORS: Record<string, string> = {
  vodafone: '#E60000',
  flynas: '#3AB54A',
  rta: '#00A19A',
  neom: '#8B7CF6',
  careem: '#5FB709'
};

const FALLBACK = ['#D9A441', '#4FA3E0', '#E06AA0', '#7BC96A', '#C77DD9'];

export function brandColor(name: string) {
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  if (BRAND_COLORS[key]) return BRAND_COLORS[key];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

export function LogoChip({ name, logo, size = 'md' }: { name: string; logo?: string; size?: 'sm' | 'md' | 'lg' }) {
  const c = brandColor(name);
  const dims =
    size === 'lg'
      ? 'h-[4.25rem] w-[4.25rem] text-xl rounded-2xl p-2.5'
      : size === 'sm'
        ? 'h-9 w-9 text-sm rounded-lg p-1.5'
        : 'h-12 w-12 text-base rounded-xl p-2';
  const [broken, setBroken] = useState(false);
  const showImg = !!logo && !broken;

  return showImg ? (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ${dims} shadow-[0_2px_10px_rgba(0,0,0,0.35)] ring-1 ring-white/15`}
    >
      <img src={logo} alt={name} onError={() => setBroken(true)} className="h-full w-full object-contain" loading="lazy" />
    </span>
  ) : (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-display font-black ${dims}`}
      style={{ backgroundColor: `${c}22`, color: c, boxShadow: `inset 0 0 0 1px ${c}44` }}
    >
      {name[0]?.toUpperCase()}
    </span>
  );
}

export function CountUp({ to, duration = 1200 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {val}
    </span>
  );
}

export function FadeIn({
  children,
  delay = 0,
  y = 18,
  className
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function GoldMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx="16" fill="#141414" />
      <path d="M32 12 L48 52 H40.5 L36.8 41.5 H27.2 L23.5 52 H16 Z M32 25 L29 34 H35 Z" fill="var(--color-accent)" />
    </svg>
  );
}
