import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLang } from '../../../i18n';
import { actions, clientLogoSrc, useAppState } from '../../../lib/store';
import { FadeIn, LogoChip } from '../../../components/ui/bits';
import { StatusBadge } from '../DashboardPage';
import { ClientModal } from './ClientsPage';

export default function ClientDetailPage() {
  const { t, lang } = useLang();
  const { id } = useParams();
  const state = useAppState();
  const client = state.clients.find((c) => c.id === id);
  const [editOpen, setEditOpen] = useState(false);

  if (!client) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-4xl font-black text-muted/30">404</p>
        <Link to="/app/clients" className="mt-4 inline-block text-sm text-accent hover:underline">
          ← {t('clients_title')}
        </Link>
      </div>
    );
  }

  const projects = state.projects.filter((p) => p.clientId === client.id || p.client === client.name);
  const activeProjects = projects.filter((p) => !p.archived);
  const pastProjects = projects.filter((p) => p.archived);

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Link to="/app/clients" className="transition-colors hover:text-accent">
            {t('clients_title')}
          </Link>
          <span className="text-muted/40">/</span>
          <span>{client.name}</span>
        </div>

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-line bg-surface p-6 lg:p-8">
          <div className="pointer-events-none absolute -top-10 end-0 h-40 w-96 rounded-full bg-accent/5 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <LogoChip name={client.name} logo={clientLogoSrc(client)} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl font-black lg:text-3xl">{client.name}</h1>
                  {client.industry && (
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] tracking-wider text-muted uppercase">{client.industry}</span>
                  )}
                </div>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                  {client.description || (lang === 'ar' ? 'لا يوجد وصف بعد.' : 'No description yet.')}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              {state.members.some((m) => m.roleId === 'am' || m.roleId === 'company_admin') && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  ✎ {t('client_edit')}
                </button>
              )}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-bg px-5 py-2.5 ring-1 ring-line">
                  <p className="font-display text-lg font-black text-accent">{activeProjects.length}</p>
                  <p className="text-[9px] tracking-wider text-muted uppercase">{lang === 'ar' ? 'نشط' : 'Active'}</p>
                </div>
                <div className="rounded-lg bg-bg px-5 py-2.5 ring-1 ring-line">
                  <p className="font-display text-lg font-black">{pastProjects.length}</p>
                  <p className="text-[9px] tracking-wider text-muted uppercase">{lang === 'ar' ? 'مكتمل' : 'Done'}</p>
                </div>
              </div>
            </div>
          </div>

          {(client.contactName || client.contactEmail || client.contactPhone) && (
            <div className="relative mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
              {client.contactName && <ContactBox label={t('client_contact_name')} value={client.contactName} />}
              {client.contactEmail && <ContactBox label={t('m_email')} value={client.contactEmail} mono />}
              {client.contactPhone && <ContactBox label={t('client_contact_phone')} value={client.contactPhone} mono />}
            </div>
          )}
        </div>
      </FadeIn>

      <section>
        <h2 className="font-display mb-4 text-sm font-bold tracking-wide text-muted uppercase">{lang === 'ar' ? 'المشاريع النشطة' : 'Active projects'}</h2>
        {activeProjects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-muted">—</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {activeProjects.map((p, i) => (
              <ProjectCard key={p.id} pid={p.id} name={p.name} status={p.status} version={p.currentVersion} due={p.due} thumb={p.thumbnail} index={i} />
            ))}
          </div>
        )}
      </section>

      {pastProjects.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-sm font-bold tracking-wide text-muted uppercase">{lang === 'ar' ? 'مشاريع سابقة (مؤرشفة)' : 'Past projects'}</h2>
          <div className="grid gap-4 opacity-80 sm:grid-cols-2 xl:grid-cols-3">
            {pastProjects.map((p, i) => (
              <ProjectCard key={p.id} pid={p.id} name={p.name} status={p.status} version={p.currentVersion} due={p.due} thumb={p.thumbnail} index={i} past />
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>{editOpen && <ClientModal initial={client} onClose={() => setEditOpen(false)} onSave={(data) => { actions.updateClient(client.id, data); setEditOpen(false); }} />}</AnimatePresence>
    </div>
  );
}

function ContactBox({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-bg px-4 py-2.5 ring-1 ring-line">
      <p className="text-[9px] tracking-widest text-muted/60 uppercase">{label}</p>
      <p className={`mt-0.5 truncate text-xs text-ink/90 ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined}>
        {value}
      </p>
    </div>
  );
}

export function ProjectCard({
  pid,
  name,
  status,
  version,
  due,
  thumb,
  index,
  past
}: {
  pid: string;
  name: string;
  status: 'editing' | 'review' | 'changes' | 'approved';
  version: string;
  due: string;
  thumb?: string;
  index: number;
  past?: boolean;
}) {
  const { t, lang } = useLang();
  return (
    <FadeIn delay={index * 0.06}>
      <Link
        to={`/app/projects/${pid}`}
        className={`group block overflow-hidden rounded-xl border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_10px_36px_rgba(0,0,0,0.35)] ${past ? 'opacity-70 hover:opacity-100' : ''}`}
      >
        <div className="relative aspect-video w-full overflow-hidden">
          {thumb ? (
            <img src={thumb} alt={name} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
          ) : (
            <div className="hero-fallback absolute inset-0" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display truncate font-bold transition-colors group-hover:text-accent">{name}</h3>
            <StatusBadge status={status} />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
            <span className="font-mono">{version}</span>
            <span dir="ltr">{t('prj_due')}: {due}</span>
            <span className="font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
              {lang === 'ar' ? 'افتح' : 'Open'} →
            </span>
          </div>
        </div>
      </Link>
    </FadeIn>
  );
}
