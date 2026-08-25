import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useLang } from '../i18n';

const STATS = [
  { value: 12480, suffix: '+', key: 'stats_1_label' as const },
  { value: 86300, suffix: '+', key: 'stats_2_label' as const },
  { value: 3200, suffix: '+', key: 'stats_3_label' as const },
  { value: 42, suffix: '%', key: 'stats_4_label' as const }
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target]);

  return (
    <span ref={ref} className="font-display text-4xl font-black text-ink tabular-nums lg:text-5xl">
      {val.toLocaleString()}
      <span className="text-accent">{suffix}</span>
    </span>
  );
}

export default function StatsStrip() {
  const { t } = useLang();

  return (
    <section id="stats" className="relative border-t border-line bg-bg py-20 lg:py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-12 px-6 lg:grid-cols-4 lg:px-8">
        {STATS.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: i * 0.12 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <Counter target={s.value} suffix={s.suffix} />
            <span className="text-xs tracking-[0.25em] text-muted uppercase">{t(s.key)}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
