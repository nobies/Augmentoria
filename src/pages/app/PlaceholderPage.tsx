import { Link } from 'react-router-dom';
import { useLang } from '../../i18n';

export default function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="font-display text-xl font-bold">{t(titleKey as never)}</h1>
      <p className="mt-2 text-sm text-muted">{t('soon_title')} — {t('soon_back')}</p>
      <Link to="/app" className="mt-6 rounded-full border border-line px-5 py-2 text-xs text-muted transition-colors hover:border-accent hover:text-accent">
        ← {t('nav_home')}
      </Link>
    </div>
  );
}
