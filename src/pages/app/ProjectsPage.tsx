import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { actions, clientLogoSrc, useAppState } from '../../lib/store';
import { STATUS_LABEL } from '../../lib/store';
import { LogoChip } from '../../components/ui/bits';
import { StatusBadge } from './DashboardPage';

type Filter = 'all' | 'editing' | 'review' | 'changes' | 'approved';

export default function ProjectsPage() {
  const { t, lang } = useLang();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const state = useAppState();
  const [filter, setFilter] = useState<Filter>('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const filters: Filter[] = ['all', 'editing', 'review', 'changes', 'approved'];
  let list = filter === 'all' ? state.projects : state.projects.filter((p) => p.status === filter);
  list = list.filter((p) => (showArchived ? p.archived : !p.archived));
  if (clientFilter !== 'all') list = list.filter((p) => p.clientId === clientFilter || p.client === clientFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black">{t('nav_projects')}</h1>
          <p className="mt-1.5 text-xs text-muted">
            {list.length} {lang === 'ar' ? 'مشروع' : 'projects'}
            {!showArchived && state.projects.some((p) => p.archived) && (
              <button onClick={() => setShowArchived(true)} className="ms-3 text-accent hover:underline">
                {lang === 'ar' ? 'عرض الأرشيف' : 'View archive'}
              </button>
            )}
            {showArchived && (
              <button onClick={() => setShowArchived(false)} className="ms-3 text-accent hover:underline">
                {lang === 'ar' ? 'رجوع للنشطة' : 'Back to active'}
              </button>
            )}
          </p>
        </div>
        {can('projects.create') && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setNewOpen(true)}
            className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-bg transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
          >
            + {t('dash_new_project')}
          </motion.button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`relative rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
              filter === f ? 'border-accent text-accent' : 'border-line text-muted hover:border-muted hover:text-ink'
            }`}
          >
            {filter === f && (
              <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-accent/10" transition={{ type: 'spring', damping: 30, stiffness: 350 }} />
            )}
            <span className="relative z-10">{f === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : t(STATUS_LABEL[f] as never)}</span>
          </button>
        ))}

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="ms-auto rounded-full border border-line bg-surface px-4 py-1.5 text-xs text-muted outline-none focus:border-accent"
        >
          <option value="all">{t('prj_filter_client')}</option>
          {state.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-bg">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[11px] tracking-wider text-muted uppercase">
            <tr>
              <th className="px-5 py-3.5 text-start font-medium">Project</th>
              <th className="hidden px-5 py-3.5 text-start font-medium md:table-cell">Client</th>
              <th className="px-5 py-3.5 text-start font-medium">Status</th>
              <th className="hidden px-5 py-3.5 text-start font-medium sm:table-cell">{t('prj_versions')}</th>
              <th className="hidden px-5 py-3.5 text-start font-medium lg:table-cell">{t('prj_due')}</th>
              <th className="hidden px-5 py-3.5 text-end font-medium xl:table-cell"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((p, i) => {
              const clientRec = state.clients.find((c) => c.id === p.clientId || c.name === p.client);
              return (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className={`group transition-colors hover:bg-surface ${p.archived ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    <Link to={`/app/projects/${p.id}`} className="flex items-center gap-3.5">
                      {p.thumbnail ? (
                        <img
                          src={p.thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-12 w-[74px] shrink-0 rounded-lg object-cover ring-1 ring-line transition-transform duration-300 group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="hero-fallback h-12 w-[74px] shrink-0 rounded-lg ring-1 ring-line" />
                      )}
                      <span className="font-medium transition-colors group-hover:text-accent">{p.name}</span>
                      {p.archived && <span className="rounded border border-line px-1.5 py-0.5 text-[9px] uppercase text-muted/70">{lang === 'ar' ? 'مؤرشف' : 'archived'}</span>}
                    </Link>
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell">
                    {clientRec ? (
                      <Link to={`/app/clients/${clientRec.id}`} className="flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-accent">
                        <LogoChip name={clientRec.name} logo={clientLogoSrc(clientRec)} size="sm" />
                        <span>{p.client}</span>
                      </Link>
                    ) : (
                      <span className="text-muted">{p.client}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-xs text-muted ring-1 ring-line">{p.currentVersion}</span>
                  </td>
                  <td className="hidden px-5 py-4 font-mono text-xs text-muted lg:table-cell" dir="ltr">
                    {p.due}
                  </td>
                  <td className="hidden px-5 py-4 text-end xl:table-cell">
                    <Link
                      to={`/app/projects/${p.id}`}
                      className="inline-flex translate-x-1 items-center gap-1 rounded-full border border-line px-3.5 py-1.5 text-xs text-muted opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 hover:border-accent hover:text-accent rtl:-translate-x-1 rtl:group-hover:translate-x-0"
                    >
                      Open
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rtl:rotate-180">
                        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>{newOpen && <NewProjectModal onClose={() => setNewOpen(false)} creatorId={user.id} onCreated={(id) => navigate(`/app/projects/${id}`)} />}</AnimatePresence>
    </div>
  );
}

function NewProjectModal({
  onClose,
  creatorId,
  onCreated
}: {
  onClose: () => void;
  creatorId: string;
  onCreated: (id: string) => void;
}) {
  const { t } = useLang();
  const state = useAppState();
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(state.clients[0]?.id ?? '');
  const [due, setDue] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const rec = state.clients.find((c) => c.id === clientId);
    if (!name.trim() || !rec) return;
    const p = actions.addProject({ name: name.trim(), client: rec.name, due: due || '—', creatorId, clientId: rec.id });
    onClose();
    onCreated(p.id);
  };

  const cls = 'w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent';

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-7 shadow-2xl"
      >
        <h2 className="font-display mb-5 text-lg font-bold">+ {t('dash_new_project')}</h2>
        <form onSubmit={submit} className="space-y-4">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('m_name')} className={cls} />
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={cls}>
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Link to="/app/clients" className="block text-[11px] text-accent hover:underline">
            + {t('client_add')}
          </Link>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} dir="ltr" className={cls} />
          <button type="submit" className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim">
            {t('set_save')}
          </button>
        </form>
      </motion.div>
    </>
  );
}
