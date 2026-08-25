import { Link } from 'react-router-dom';
import { GoldMark } from '../components/ui/bits';
import { useLang } from '../i18n';

export default function NotFoundPage() {
  const { lang } = useLang();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center text-ink">
      <p className="font-display text-[7rem] font-black leading-none text-accent/15 select-none">404</p>
      <h1 className="font-display -mt-6 text-xl font-bold">
        {lang === 'ar' ? 'الصفحة غير موجودة' : 'Page not found'}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {lang === 'ar'
          ? 'الرابط اللي فتحته غلط أو اتشال من النظام.'
          : 'The link you opened is wrong or no longer exists.'}
      </p>
      <Link
        to="/"
        className="mt-8 rounded-full bg-accent px-6 py-2.5 text-xs font-bold text-bg transition-colors hover:bg-accent-dim"
      >
        {lang === 'ar' ? 'الرئيسية' : 'Go home'}
      </Link>
      <div className="mt-12 opacity-40">
        <GoldMark size={24} />
      </div>
    </div>
  );
}
