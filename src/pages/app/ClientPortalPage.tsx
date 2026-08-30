import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { clientLogoSrc, useAppState, visibleProjects, STATUS_CLASS, STATUS_LABEL } from '../../lib/store';
import { CountUp, FadeIn, LogoChip, brandColor } from '../../components/ui/bits';
import { clientLogoUrl } from '../../lib/clients';

export default function ClientPortalPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const state = useAppState();
  const projects = visibleProjects(state, user).filter((p) => !p.archived);

  const stats = [
    {
      label: 'dash_stat_active',
      value: projects.filter((p) => p.status !== 'approved').length
    },
    {
      label: 'dash_stat_wait_client',
      value: projects.filter((p) => p.status === 'review').length
    },
    {
      label: 'dash_stat_approved',
      value: projects.filter((p) => p.status === 'approved').length
    },
    {
      label: 'cp_open_notes',
      value: projects.reduce((sum, p) => sum + (p.versions[0]?.open ?? 0), 0)
    }
  ];

  return (
    <div className="space-y-8">
      <FadeIn>
        <div>
          <h1 className="font-display text-2xl font-black lg:text-3xl">{t('cp_title')}</h1>
          <p className="mt-2 text-sm text-muted">
            {lang === 'ar' ? `أهلاً ${user.name} — ` : `Welcome back, ${user.name} — `}
            {t('cp_sub')}
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-line bg-surface p-5">
              <p className="font-display text-3xl font-black text-accent">
                <CountUp to={s.value} />
              </p>
              <p className="mt-1 text-[11px] tracking-wider text-muted uppercase">{t(s.label as never)}</p>
            </div>
          ))}
        </div>
      </FadeIn>

      {projects.length === 0 ? (
        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-dashed border-line py-16 text-center">
            <p className="text-sm text-muted">{t('cp_no_projects')}</p>
          </div>
        </FadeIn>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p, i) => {
            const latest = p.versions[0];
            return (
              <FadeIn key={p.id} delay={i * 0.06}>
                <motion.div whileHover={{ y: -4 }} className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent/50">
                  <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                    <LogoChip name={p.client} logo={p.clientLogo ?? (clientLogoSrc(state.clients.find((c) => c.id === p.clientId)) || clientLogoUrl(p.client))} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-muted">{p.client}</p>
                      <h3 className="font-display truncate font-bold transition-colors group-hover:text-accent">{p.name}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[p.status]}`}>
                      {t(STATUS_LABEL[p.status] as never)}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">{t('cp_latest')}</span>
                      <span className="rounded bg-accent/10 px-2 py-0.5 font-mono font-bold text-accent">{latest?.v ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">{t('prj_due')}</span>
                      <span className="font-mono text-muted" dir="ltr">{p.due}</span>
                    </div>
                    {(latest?.open ?? 0) > 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-[11px] font-semibold text-orange-300">
                        ● {latest?.open} {t('cp_open_notes')}
                      </div>
                    )}

                    <div className="mt-auto flex items-center gap-2 pt-1">
                      {latest && (
                        <Link
                          to={`/studio/review/${p.id}/${latest.v}`}
                          className="flex-1 rounded-full bg-accent px-4 py-2 text-center text-xs font-bold text-bg transition-all hover:bg-accent-dim"
                        >
                          ▶ {t('cp_open_review')}
                        </Link>
                      )}
                      <span
                        className="h-8 w-8 shrink-0 rounded-full border-2"
                        style={{ borderColor: brandColor(p.client) }}
                        title={p.status}
                      />
                    </div>
                  </div>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}
