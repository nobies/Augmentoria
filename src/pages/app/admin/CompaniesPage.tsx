import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../../../i18n';
import { actions, useAppState } from '../../../lib/store';
import { FadeIn, LogoChip, brandColor } from '../../../components/ui/bits';

export default function CompaniesPage() {
  const { t } = useLang();
  const state = useAppState();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    actions.addCompany(name.trim());
    setName('');
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black">{t('admin_companies')}</h1>
          <p className="mt-1.5 text-xs text-muted">{state.companies.length} {lang_n()}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpen(true)}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-bg transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
        >
          + {t('btn_add_company')}
        </motion.button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.companies.map((c, i) => {
          const members = state.members.filter((m) => m.companyId === c.id).length;
          return (
            <FadeIn key={c.id} delay={i * 0.06}>
              <div className="group rounded-xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
                <div className="flex items-center gap-3">
                  <LogoChip name={c.name} />
                  <div>
                    <h3 className="font-display font-bold transition-colors group-hover:text-accent">{c.name}</h3>
                    <p className="font-mono text-[10px] text-muted/60" dir="ltr">{c.createdAt}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-bg py-2.5 ring-1 ring-line">
                    <p className="font-display text-lg font-black text-accent">{members}</p>
                    <p className="text-[10px] tracking-wider text-muted uppercase">{t('members_count')}</p>
                  </div>
                  <div className="rounded-lg bg-bg py-2.5 ring-1 ring-line">
                    <p className="font-display text-lg font-black" style={{ color: brandColor(c.name) }}>
                      {state.projects.filter((p) => p.memberIds.some((mid) => state.members.find((m) => m.id === mid)?.companyId === c.id)).length}
                    </p>
                    <p className="text-[10px] tracking-wider text-muted uppercase">{t('projects_count')}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>

      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 z-[70] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-7 shadow-2xl"
          >
            <h2 className="font-display mb-5 text-lg font-bold">{t('btn_add_company')}</h2>
            <form onSubmit={submit} className="space-y-4">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('ph_company_name')}
                className="w-full rounded-lg border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-accent"
              />
              <button type="submit" className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim">
                {t('set_save')}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </div>
  );
}

function lang_n() {
  return document.documentElement.lang === 'ar' ? 'شركة' : 'companies';
}
