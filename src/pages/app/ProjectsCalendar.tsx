import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../i18n';
import type { Project } from '../../lib/store';

const STATUS_DOT: Record<string, string> = {
  editing: 'bg-sky-400',
  review: 'bg-accent',
  changes: 'bg-orange-400',
  approved: 'bg-emerald-400'
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface DayEvent {
  project: Project;
  kind: 'entry' | 'due';
}

export default function ProjectsCalendar({ projects }: { projects: Project[] }) {
  const { t, lang } = useLang();
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [filter, setFilter] = useState<'all' | 'entry' | 'due'>('all');

  const byDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    for (const p of projects) {
      const entryDate = p.startDate || p.createdAt;
      if (entryDate && /^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
        const list = map.get(entryDate) ?? [];
        list.push({ project: p, kind: 'entry' });
        map.set(entryDate, list);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(p.due)) {
        const list = map.get(p.due) ?? [];
        list.push({ project: p, kind: 'due' });
        map.set(p.due, list);
      }
    }
    return map;
  }, [projects]);

  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en', { weekday: 'short' });
    return [2, 3, 4, 5, 6, 7, 8].map((offset) => fmt.format(new Date(2024, 8, offset)));
  }, [lang]);

  const monthLabel = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en', { month: 'long', year: 'numeric' }).format(cursor);
  const todayStamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const shift = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg font-bold capitalize">{monthLabel}</h3>
          <div className="flex items-center gap-1 rounded-full border border-line bg-bg p-0.5 text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-full px-2.5 py-0.5 font-semibold transition-colors ${filter === 'all' ? 'bg-accent text-bg' : 'text-muted hover:text-ink'}`}
            >
              {lang === 'ar' ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setFilter('entry')}
              className={`rounded-full px-2.5 py-0.5 font-semibold transition-colors ${filter === 'entry' ? 'bg-sky-400/20 text-sky-300' : 'text-muted hover:text-ink'}`}
            >
              📥 {t('cal_entry_on')}
            </button>
            <button
              onClick={() => setFilter('due')}
              className={`rounded-full px-2.5 py-0.5 font-semibold transition-colors ${filter === 'due' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-ink'}`}
            >
              🚩 {t('cal_due_on')}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} aria-label="Previous month" className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent">
            ‹
          </button>
          <button
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${monthKey(cursor) === monthKey(today) ? 'border-accent/50 text-accent' : 'border-line text-muted hover:text-ink'}`}
          >
            {lang === 'ar' ? 'اليوم' : 'Today'}
          </button>
          <button onClick={() => shift(1)} aria-label="Next month" className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent">
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((day) => (
          <p key={day} className="pb-1 text-center text-[10px] font-bold tracking-wider text-muted/60 uppercase">
            {day}
          </p>
        ))}
        {grid.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="min-h-24 rounded-lg bg-bg/40 max-md:min-h-14" />;
          const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const allDayEvents = byDay.get(stamp) ?? [];
          const dayEvents = filter === 'all' ? allDayEvents : allDayEvents.filter((e) => e.kind === filter);
          const isToday = stamp === todayStamp;
          return (
            <div
              key={stamp}
              className={`min-h-24 rounded-lg border p-1.5 transition-colors max-md:min-h-14 ${
                isToday ? 'border-accent/60 bg-accent/[0.06]' : dayEvents.length > 0 ? 'border-line bg-bg' : 'border-line/40'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={`text-[10px] font-mono ${isToday ? 'font-black text-accent' : 'text-muted/60'}`}>{date.getDate()}</span>
                {dayEvents.length > 0 && (
                  <span className="text-[8px] font-bold text-muted/50">{dayEvents.length}</span>
                )}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((e) => {
                  const isEntry = e.kind === 'entry';
                  return (
                    <Link
                      key={`${e.project.id}-${e.kind}`}
                      to={`/app/projects/${e.project.id}`}
                      title={`${e.project.name} (${e.project.client})\n${isEntry ? `${t('cal_entry_on')}: ${e.project.startDate || e.project.createdAt}` : `${t('cal_due_on')}: ${e.project.due}`}`}
                      className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[9px] font-semibold leading-tight transition-colors ${
                        isEntry
                          ? 'border border-sky-400/20 bg-sky-400/10 text-sky-200 hover:bg-sky-400/20'
                          : 'border border-line bg-surface/80 text-ink/90 hover:bg-accent/10 hover:text-accent'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isEntry ? 'bg-sky-400' : (STATUS_DOT[e.project.status] ?? 'bg-muted')}`} />
                      <span className="shrink-0 text-[8px] font-bold opacity-75">{isEntry ? '📥' : '🚩'}</span>
                      <span className="truncate">{e.project.name}</span>
                    </Link>
                  );
                })}
                {dayEvents.length > 2 && (
                  <p className="px-1 text-[9px] font-bold text-muted">+{dayEvents.length - 2} {lang === 'ar' ? 'مزيد' : 'more'}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {byDay.size === 0 && (
        <p className="pt-4 text-center text-xs text-muted">{lang === 'ar' ? 'مفيش مشاريع ليها مواعيد في التقويم.' : 'No projects with calendar dates to show.'}</p>
      )}
    </div>
  );
}
