import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../../i18n';
import type { LText, LandingSection } from '../../lib/pageSections';

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function tx(v: LText | undefined, lang: 'en' | 'ar') {
  if (!v) return '';
  return lang === 'ar' ? v.ar || v.en : v.en;
}

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Reveal className="mx-auto mb-16 max-w-2xl text-center">
      {subtitle && <p className="mb-3 text-[11px] font-medium tracking-[0.4em] text-accent uppercase">{subtitle}</p>}
      <h2 className="font-display text-3xl font-black text-balance sm:text-4xl lg:text-5xl">{title}</h2>
      <div className="mx-auto mt-6 h-px w-16 bg-accent" />
    </Reveal>
  );
}

function ImageBox({ url, alt, ratio = 'aspect-[4/3]' }: { url: string; alt: string; ratio?: string }) {
  return url ? (
    <img src={url} alt={alt} className={`w-full rounded-2xl border border-line object-cover ${ratio}`} />
  ) : (
    <div className={`hero-fallback flex w-full items-center justify-center rounded-2xl border border-line ${ratio}`}>
      <span className="font-display text-xs tracking-[0.35em] text-muted/50 uppercase">AUGMENTORIA</span>
    </div>
  );
}

function SplitSection({ s, imageUrl, band }: { s: LandingSection; imageUrl: (id?: string) => string; band: number }) {
  const { lang } = useLang();
  const d = s.data;
  return (
    <section className={`py-24 lg:py-32 ${band % 2 ? 'bg-surface' : 'bg-bg'}`}>
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <Reveal className={d.reverse ? 'lg:order-2' : ''}>
          {d.subtitle && (
            <p className="mb-4 text-[11px] font-medium tracking-[0.4em] text-accent uppercase">{tx(d.subtitle, lang)}</p>
          )}
          <h2 className="font-display text-3xl leading-tight font-black text-balance sm:text-4xl">{tx(d.title, lang)}</h2>
          <p className="mt-6 leading-relaxed text-muted">{tx(d.body, lang)}</p>
          {d.bullets && d.bullets.length > 0 && (
            <ul className="mt-8 space-y-4">
              {d.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink/90">
                  <svg
                    className="mt-0.5 shrink-0 text-accent"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {tx(b, lang)}
                </li>
              ))}
            </ul>
          )}
        </Reveal>
        <Reveal delay={0.15} className={d.reverse ? 'lg:order-1' : ''}>
          <ImageBox url={imageUrl(d.imageId)} alt={tx(d.title, lang)} />
        </Reveal>
      </div>
    </section>
  );
}

function FeaturesSection({ s, band }: { s: LandingSection; band: number }) {
  const { lang } = useLang();
  const d = s.data;
  return (
    <section className={`py-24 lg:py-32 ${band % 2 ? 'bg-surface' : 'bg-bg'}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHead title={tx(d.title, lang)} subtitle={tx(d.subtitle, lang)} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(d.items ?? []).map((item, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="group h-full rounded-xl border border-line bg-bg p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_8px_40px_rgba(var(--glow-rgb),0.08)]">
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 font-display text-sm font-black text-accent transition-colors group-hover:bg-accent group-hover:text-bg">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-display mb-3 text-base font-bold">{tx(item.title, lang)}</h3>
                <p className="text-sm leading-relaxed text-muted">{tx(item.desc, lang)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepsSection({ s, band }: { s: LandingSection; band: number }) {
  const { lang } = useLang();
  const d = s.data;
  return (
    <section className={`py-24 lg:py-32 ${band % 2 ? 'bg-surface' : 'bg-bg'}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHead title={tx(d.title, lang)} subtitle={tx(d.subtitle, lang)} />
        <div className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute top-8 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent via-line to-transparent lg:block" />
          {(d.items ?? []).map((item, i) => (
            <Reveal key={i} delay={i * 0.12} className="relative text-center">
              <span className="font-display pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-7xl font-black text-accent/10 select-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display relative z-10 mt-4 text-lg font-bold">{tx(item.title, lang)}</h3>
              <p className="relative z-10 mt-3 text-sm leading-relaxed text-muted">{tx(item.desc, lang)}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection({ s, imageUrl, portrait, band }: { s: LandingSection; imageUrl: (id?: string) => string; portrait?: boolean; band: number }) {
  const { lang } = useLang();
  const d = s.data;
  return (
    <section className={`py-24 lg:py-32 ${band % 2 ? 'bg-surface' : 'bg-bg'}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHead title={tx(d.title, lang)} subtitle={tx(d.subtitle, lang)} />
        <div className={`grid gap-6 ${portrait ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
          {(d.items ?? []).map((item, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className={`group relative overflow-hidden rounded-xl border border-line ${portrait ? 'aspect-[3/4]' : 'aspect-video'}`}>
                {item.imageId && imageUrl(item.imageId) ? (
                  <img
                    src={imageUrl(item.imageId)}
                    alt={tx(item.title, lang)}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="hero-fallback absolute inset-0" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="font-display text-base font-bold">{tx(item.title, lang)}</h3>
                  <p className="mt-1 max-h-0 overflow-hidden text-xs text-muted transition-all duration-500 group-hover:max-h-16">
                    {tx(item.desc, lang)}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ s, band }: { s: LandingSection; band: number }) {
  const { t, lang } = useLang();
  const d = s.data;
  return (
    <section className={`grain relative overflow-hidden py-28 lg:py-36 ${band % 2 ? 'bg-surface' : 'bg-bg'}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-accent/8 blur-3xl" />
      </div>
      <Reveal className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-3xl font-black text-balance sm:text-4xl lg:text-5xl">{tx(d.title, lang)}</h2>
        <p className="mt-5 text-muted">{tx(d.body, lang)}</p>
        <a
          href="#start"
          className="mt-10 inline-block rounded-full bg-accent px-10 py-4 text-sm font-bold tracking-wide text-bg transition-all duration-300 hover:bg-accent-dim hover:shadow-[0_0_40px_rgba(var(--glow-rgb),0.45)]"
        >
          {tx(d.ctaLabel, lang) || t('nav_cta')}
        </a>
      </Reveal>
    </section>
  );
}

export function LandingSectionView({
  section,
  index,
  imageUrl
}: {
  section: LandingSection;
  index: number;
  imageUrl: (id?: string) => string;
}) {
  let view = null;
  switch (section.type) {
    case 'split':
      view = <SplitSection s={section} imageUrl={imageUrl} band={index} />;
      break;
    case 'features':
      view = <FeaturesSection s={section} band={index} />;
      break;
    case 'steps':
      view = <StepsSection s={section} band={index} />;
      break;
    case 'showcase':
      view = <ShowcaseSection s={section} imageUrl={imageUrl} band={index} />;
      break;
    case 'team':
      view = <ShowcaseSection s={section} imageUrl={imageUrl} band={index} portrait />;
      break;
    case 'cta':
      view = <CtaSection s={section} band={index} />;
      break;
  }
  return (
    <div id={section.id.replace(/^s-/, '')}>
      {view}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 text-center">
        <span className="font-display text-sm font-black tracking-[0.35em]">AUGMENTORIA</span>
        <div className="flex gap-6 text-xs text-muted">
          <a href="#" className="transition-colors hover:text-accent">
            Privacy
          </a>
          <a href="#" className="transition-colors hover:text-accent">
            Terms
          </a>
          <a href="#" className="transition-colors hover:text-accent">
            Contact
          </a>
        </div>
        <p className="text-[11px] tracking-widest text-muted/60 uppercase">© 2026 Augmentoria — All rights reserved</p>
      </div>
    </footer>
  );
}
