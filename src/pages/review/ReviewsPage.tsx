import { Link } from 'react-router-dom';
import { useLang } from '../../i18n';
import { useAppState, STATUS_LABEL, STATUS_CLASS } from '../../lib/store';
import { FadeIn, LogoChip } from '../../components/ui/bits';

export default function ReviewsPage() {
  const { t, lang } = useLang();
  const state = useAppState();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">{t('page_reviews')}</h1>
        <p className="mt-1.5 text-xs text-muted">{lang === 'ar' ? 'اختار نسخة وابدأ المراجعة فريم بفريم.' : 'Pick a version and start frame-by-frame review.'}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {state.projects
          .filter((p) => !p.archived && p.versions.length > 0)
          .map((p, i) => {
            const clientRec = state.clients.find((c) => c.id === p.clientId || c.name === p.client);
            return (
              <FadeIn key={p.id} delay={i * 0.06}>
                <div className="overflow-hidden rounded-xl border border-line bg-surface">
                  <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                    <LogoChip name={clientRec?.name ?? p.client} logo={p.clientLogo ?? (clientRec ? `https://www.google.com/s2/favicons?domain=${clientRec.domain}&sz=128` : '')} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold">{p.name}</h3>
                      <p className="text-[11px] text-muted">{p.client}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[p.status]}`}>
                      {t(STATUS_LABEL[p.status] as never)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4">
                    {p.versions.map((v) => {
                      const open = state.comments.filter((c) => c.projectId === p.id && c.version === v.v && !c.resolved).length;
                      return (
                        <Link
                          key={v.v}
                          to={`/studio/review/${p.id}/${v.v}`}
                          className="group flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 transition-all hover:border-accent hover:bg-bg"
                        >
                          <span className="font-mono text-xs font-black text-accent">{v.v}</span>
                          {open > 0 && <span className="rounded-full bg-orange-400/15 px-1.5 py-0.5 text-[9px] font-bold text-orange-300">{open}</span>}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted rtl:rotate-180">
                            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            );
          })}
      </div>
    </div>
  );
}
