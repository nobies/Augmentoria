import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../../i18n';
import { useEscape } from '../../../lib/useEscape';
import { actions, clientLogoSrc, findClientByName, useAppState } from '../../../lib/store';
import type { Client } from '../../../lib/store';
import { FadeIn, LogoChip } from '../../../components/ui/bits';
import { guessLogoDomain } from '../../../lib/clients';

const empty: Omit<Client, 'id' | 'createdAt'> = {
  name: '',
  domain: '',
  description: '',
  industry: '',
  contactName: '',
  contactEmail: '',
  contactPhone: ''
};

export default function ClientsPage() {
  const { t, lang } = useLang();
  const state = useAppState();
  const [editing, setEditing] = useState<Client | 'new' | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black">{t('clients_title')}</h1>
          <p className="mt-1.5 text-xs text-muted">
            {state.clients.length} {lang === 'ar' ? 'عميل' : 'clients'}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setEditing('new')}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-bg transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
        >
          + {t('client_add')}
        </motion.button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {state.clients.map((c, i) => {
          const projects = state.projects.filter((p) => p.clientId === c.id || p.client === c.name);
          return (
            <FadeIn key={c.id} delay={i * 0.05}>
              <Link
                to={`/app/clients/${c.id}`}
                className="group block rounded-2xl border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <LogoChip name={c.name} logo={clientLogoSrc(c)} size="lg" />
                  {c.industry && (
                    <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] tracking-wider text-muted uppercase">{c.industry}</span>
                  )}
                </div>
                <h3 className="font-display mt-4 text-lg font-bold transition-colors group-hover:text-accent">{c.name}</h3>
                <p className="mt-1.5 line-clamp-2 min-h-[2.4rem] text-xs leading-relaxed text-muted">
                  {c.description || (lang === 'ar' ? 'لا يوجد وصف بعد.' : 'No description yet.')}
                </p>
                <div className="mt-4 flex items-center gap-4 border-t border-line pt-4 text-[11px] text-muted">
                  <span>
                    <b className="text-accent">{projects.filter((p) => !p.archived).length}</b> {lang === 'ar' ? 'نشط' : 'active'}
                  </span>
                  <span>
                    <b className="text-ink/70">{projects.length}</b> {lang === 'ar' ? 'إجمالي' : 'total'}
                  </span>
                  <span className="ms-auto font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    {t('dash_view_all')} →
                  </span>
                </div>
              </Link>
            </FadeIn>
          );
        })}
      </div>

      <AnimatePresence>
        {editing && (
          <ClientModal
            initial={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSave={(data) => {
              if (editing === 'new') actions.addClient(data);
              else if (editing !== null) actions.updateClient(editing.id, data);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function ClientModal({
  initial,
  onClose,
  onSave
}: {
  initial: Client | null;
  onClose: () => void;
  onSave: (data: Omit<Client, 'id' | 'createdAt'>) => void;
}) {
  const { t } = useLang();
  const state = useAppState();
  const [f, setF] = useState<Omit<Client, 'id' | 'createdAt'>>(initial ? { ...initial } : { ...empty });
  const dup = !!f.name.trim() && findClientByName(state, f.name)?.id !== initial?.id;

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const cls = 'w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent';

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[70] max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-7 shadow-2xl"
      >
        <h2 className="font-display mb-5 text-lg font-bold">{initial ? t('client_edit') : t('client_add')}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.name.trim() || dup) return;
            onSave({
              ...f,
              name: f.name.trim(),
              logo: f.logo?.trim() || undefined,
              domain: f.domain?.trim() || undefined
            });
          }}
          className="space-y-4"
        >
          <div className="flex items-center gap-4">
            <LogoChip name={f.name || '?'} logo={clientLogoSrc({ ...(initial ?? {}), ...f } as Client)} size="lg" />
            <div className="flex-1 space-y-2">
              <input value={f.name} onChange={set('name')} placeholder={t('ph_company_name')} className={`${cls} ${dup ? 'border-red-500' : ''}`} autoFocus />
              {dup && <p className="text-[11px] text-red-400">{lang_dup()}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input value={f.domain ?? ''} onChange={set('domain')} onBlur={(e) => !f.logo && e.target.value && setF((p) => ({ ...p, logo: `https://www.google.com/s2/favicons?domain=${guessLogoDomain(e.target.value) || e.target.value}&sz=128` }))} placeholder="domain.com" dir="ltr" className={`${cls} text-xs`} />
            <input value={f.industry ?? ''} onChange={set('industry')} placeholder={t('client_industry')} className={cls} />
          </div>

          <textarea value={f.description ?? ''} onChange={set('description')} rows={3} placeholder={t('client_desc')} className={cls} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input value={f.contactName ?? ''} onChange={set('contactName')} placeholder={t('client_contact_name')} className={cls} />
            <input type="email" value={f.contactEmail ?? ''} onChange={set('contactEmail')} placeholder={t('m_email')} dir="ltr" className={cls} />
            <input value={f.contactPhone ?? ''} onChange={set('contactPhone')} placeholder={t('client_contact_phone')} dir="ltr" className={cls} />
          </div>

          <input value={f.logo ?? ''} onChange={(e) => setF((p) => ({ ...p, logo: e.target.value }))} placeholder="Logo URL — auto from domain" dir="ltr" className={`${cls} text-xs`} />

          <button type="submit" disabled={!f.name.trim() || dup} className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40">
            {t('set_save')}
          </button>
        </form>
      </motion.div>
    </>
  );
}

function lang_dup() {
  return document.documentElement.lang === 'ar' ? 'الاسم موجود بالفعل.' : 'Name already exists.';
}
