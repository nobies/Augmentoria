import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useLang } from '../../i18n';
import { validateReviewShare } from '../../lib/reviewShare';
import ReviewWorkspace from './ReviewWorkspace';

type GateStatus = 'locked' | 'checking' | 'granted' | 'denied' | 'error';

export default function GuestReviewRoute() {
  const { pid = '', v = '' } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('share') ?? '';
  return <GuestReviewGate key={`${pid}:${v}:${token}`} pid={pid} version={v} token={token} />;
}

function GuestReviewGate({ pid, version, token }: { pid: string; version: string; token: string }) {
  const { lang } = useLang();
  const ar = lang === 'ar';
  const requireCode = import.meta.env.PROD || import.meta.env.VITE_REQUIRE_REVIEW_SHARE_CODE === 'true';
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<GateStatus>(requireCode ? 'locked' : 'granted');

  useEffect(() => {
    if (!requireCode || status !== 'granted') return;
    let active = true;
    const verify = async () => {
      try {
        const valid = await validateReviewShare(token, pid, version, code);
        if (active && !valid) setStatus('denied');
      } catch {
        if (active) setStatus('error');
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void verify(); };
    const interval = window.setInterval(() => void verify(), 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [requireCode, status, token, pid, version, code]);

  if (status === 'granted') return <ReviewWorkspace mode="guest" experience="pro" />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !pid || !version || !/^\d{6}$/.test(code)) return;

    setStatus('checking');
    try {
      const valid = await validateReviewShare(token, pid, version, code);
      if (!valid) {
        setStatus('denied');
        return;
      }
      setStatus('granted');
    } catch {
      setStatus('error');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 text-ink" dir={ar ? 'rtl' : 'ltr'}>
      <section className="w-full max-w-md rounded-3xl border border-line bg-panel p-7 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {ar ? 'مراجعة آمنة' : 'Secure review'}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{ar ? 'أدخل كود الدعوة' : 'Enter the invitation code'}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {token
            ? ar
              ? 'لا تحتاج إلى إنشاء حساب. اطلب كود الدخول المكوّن من 6 أرقام من صاحب المشروع.'
              : 'No account is required. Ask the project owner for the six-digit access code.'
            : ar
              ? 'هذا الرابط غير مكتمل أو قديم. اطلب رابط مشاركة جديدًا من صاحب المشروع.'
              : 'This link is incomplete or outdated. Ask the project owner for a new share link.'}
        </p>

        {token && (
          <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4">
            <label htmlFor="review-access-code" className="block text-sm font-semibold">
              {ar ? 'كود الدخول' : 'Access code'}
            </label>
            <input
              id="review-access-code"
              autoFocus
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                if (status === 'denied' || status === 'error') setStatus('locked');
              }}
              placeholder="000000"
              dir="ltr"
              className="w-full rounded-2xl border border-line bg-bg px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.35em] outline-none focus:border-accent"
            />
            {(status === 'denied' || status === 'error') && (
              <p role="alert" className="text-sm text-red-300">
                {status === 'denied'
                  ? ar
                    ? 'الكود غير صحيح، أو انتهت صلاحية الرابط.'
                    : 'The code is incorrect, or the link has expired.'
                  : ar
                    ? 'تعذر التحقق الآن. حاول مرة أخرى.'
                    : 'Could not verify the code. Please try again.'}
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'checking' || code.length !== 6}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'checking' ? (ar ? 'جارٍ التحقق…' : 'Checking…') : ar ? 'فتح المراجعة' : 'Open review'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
