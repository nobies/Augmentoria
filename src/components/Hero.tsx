import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useLang } from '../i18n';
import { useCollectionMedia } from '../hooks/useCollectionMedia';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } }
};

const word = {
  hidden: { opacity: 0, y: 26, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }
  }
};

export default function Hero() {
  const { t } = useLang();
  const { images, settings } = useCollectionMedia('hero');
  const [idx, setIdx] = useState(0);
  const [builtin, setBuiltin] = useState<{ id: string; url: string }[]>([]);
  const { scrollY } = useScroll();
  const contentY = useTransform(scrollY, [0, 600], [0, 120]);
  const contentOpacity = useTransform(scrollY, [0, 500], [1, 0.15]);

  useEffect(() => {
    const list = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `builtin-${n}`, url: `/hero-slides/slide-${n}.jpg` }));
    setBuiltin(list);
  }, []);

  const slides = useMemo(
    () => [...builtin, ...images.filter((i: { active: boolean }) => i.active).map((i: { id: string; url: string }) => ({ id: i.id, url: i.url }))],
    [builtin, images]
  );

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [idx, slides.length]);

  useEffect(() => {
    if (!settings.enabled || slides.length < 2) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % slides.length), settings.interval * 1000);
    return () => clearInterval(timer);
  }, [settings.enabled, settings.interval, slides.length]);

  const words = t('hero_headline').split(' ');
  const showSlide = settings.enabled && slides.length > 0;

  return (
    <section id="home" className="grain vignette relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="hero-fallback absolute inset-0 z-0" />

      {showSlide && (
        <div className="absolute inset-0 z-[1]" style={{ opacity: settings.opacity }}>
          <AnimatePresence>
            <motion.img
              key={slides[idx % slides.length]?.url}
              src={slides[idx % slides.length]?.url}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
              className="animate-kenburns absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
        </div>
      )}

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-16 text-center lg:px-8"
      >
        <motion.p
          initial={{ opacity: 0, letterSpacing: '0.2em' }}
          animate={{ opacity: 1, letterSpacing: '0.55em' }}
          transition={{ duration: 1.4, delay: 0.15 }}
          className="mb-8 text-[11px] font-medium text-accent uppercase max-md:tracking-[0.35em]"
        >
          AUGMENTORIA
        </motion.p>

        <motion.h1
          variants={container}
          initial="hidden"
          animate="show"
          className="font-display text-5xl leading-[1.05] font-black tracking-tight text-balance sm:text-6xl lg:text-7xl"
        >
          {words.map((w, i) => (
            <motion.span key={`${w}-${i}`} variants={word} className="mr-[0.28em] inline-block last:mr-0">
              {w}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: words.length * 0.09 + 0.5 }}
          className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed tracking-[0.18em] text-muted uppercase max-md:tracking-normal max-md:normal-case"
        >
          {t('hero_sub')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: words.length * 0.09 + 0.75 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#start"
            className="rounded-full bg-accent px-8 py-3.5 text-sm font-bold tracking-wide text-bg transition-all duration-300 hover:bg-accent-dim hover:shadow-[0_0_36px_rgba(var(--glow-rgb),0.45)]"
          >
            {t('hero_cta_primary')}
          </a>
          <a
            href="#how"
            className="rounded-full border border-line px-8 py-3.5 text-sm font-semibold tracking-wide text-ink/90 backdrop-blur-sm transition-all duration-300 hover:border-accent hover:text-accent"
          >
            {t('hero_cta_secondary')}
          </a>
        </motion.div>
      </motion.div>

      {showSlide && slides.length > 1 && (
        <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === idx ? 'w-8 bg-accent' : 'w-3 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      <motion.a
        href="#stats"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-muted transition-colors hover:text-accent"
      >
        <span className="text-[10px] tracking-[0.4em] uppercase">{t('scroll')}</span>
        <motion.svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.a>
    </section>
  );
}
