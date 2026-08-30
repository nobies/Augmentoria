import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { clientLogoSrc, useAppState, visibleClients, visibleProjects } from '../../lib/store';
import { STATUS_LABEL } from '../../lib/store';
import { LogoChip } from '../../components/ui/bits';
import { StatusBadge } from './DashboardPage';
import ProjectsCalendar from './ProjectsCalendar';
import NewProjectModal from '../../components/NewProjectModal';

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
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [query, setQuery] = useState('');
  const clients = visibleClients(state, user);

  const filters: Filter[] = ['all', 'editing', 'review', 'changes', 'approved'];
  let list = filter === 'all' ? visibleProjects(state, user) : visibleProjects(state, user).filter((p) => p.status === filter);
  list = list.filter((p) => (showArchived ? p.archived : !p.archived));
  if (clientFilter !== 'all') list = list.filter((p) => p.clientId === clientFilter || p.client === clientFilter);
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery) list = list.filter((p) => `${p.name} ${p.client}`.toLowerCase().includes(normalizedQuery));

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
        <div className="flex overflow-hidden rounded-full border border-line">
          {(['list', 'calendar'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                view === v ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {v === 'list' ? t('prj_view_list') : `📅 ${t('prj_view_calendar')}`}
            </button>
          ))}
        </div>

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

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === 'ar' ? 'ابحث في المشاريع…' : 'Search projects…'}
          aria-label={lang === 'ar' ? 'بحث في المشاريع' : 'Search projects'}
          className="min-w-[180px] rounded-full border border-line bg-surface px-4 py-1.5 text-xs outline-none focus:border-accent"
        />

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          aria-label={t('prj_filter_client')}
          className="ms-auto rounded-full border border-line bg-surface px-4 py-1.5 text-xs text-muted outline-none focus:border-accent"
        >
          <option value="all">{t('prj_filter_client')}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {view === 'calendar' && <ProjectsCalendar projects={list.filter((p) => !p.archived)} />}

      {view === 'list' && (
      <div className="overflow-hidden rounded-xl border border-line bg-bg">
        <table className="w-full text-sm">
          <thead className="bg-surface text-[11px] tracking-wider text-muted uppercase">
            <tr>
              <th className="px-5 py-3.5 text-start font-medium">{lang === 'ar' ? 'المشروع' : 'Project'}</th>
              <th className="hidden px-5 py-3.5 text-start font-medium md:table-cell">{lang === 'ar' ? 'العميل' : 'Client'}</th>
              <th className="px-5 py-3.5 text-start font-medium">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              <th className="hidden px-5 py-3.5 text-start font-medium sm:table-cell">{t('prj_versions')}</th>
              <th className="hidden px-5 py-3.5 text-start font-medium lg:table-cell">{t('prj_due')}</th>
              <th className="hidden px-5 py-3.5 text-end font-medium xl:table-cell"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center text-sm text-muted">
                  {lang === 'ar' ? 'لا توجد مشاريع مطابقة للفلاتر الحالية.' : 'No projects match the current filters.'}
                </td>
              </tr>
            ) : list.map((p, i) => {
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
                      {lang === 'ar' ? 'فتح' : 'Open'}
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
      )}

      <AnimatePresence>{newOpen && <NewProjectModal onClose={() => setNewOpen(false)} creatorId={user.id} onCreated={(id) => navigate(`/app/projects/${id}`)} />}</AnimatePresence>
    </div>
  );
}
