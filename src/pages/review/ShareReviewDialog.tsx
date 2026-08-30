import { useEffect, useState } from 'react';
import { createReviewShare, type ReviewShare } from '../../lib/reviewShare';
import { toast } from '../../lib/toast';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  version: string;
  lang: 'ar' | 'en';
};

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function ShareReviewDialog({ open, onClose, projectId, version, lang }: Props) {
  const ar = lang === 'ar';
  const [ttlDays, setTtlDays] = useState(7);
  const [share, setShare] = useState<ReviewShare | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setShare(null);
      setError('');
      setCreating(false);
    }
  }, [open]);

  if (!open) return null;

  const create = async () => {
    setCreating(true);
    setError('');
    try {
      setShare(await createReviewShare(projectId, version, ttlDays));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const copy = async (value: string, success: string) => {
    try {
      await copyText(value);
      toast({ message: success, tone: 'success' });
    } catch {
      toast({
        message: ar ? 'تعذر النسخ. انسخ القيمة يدويًا.' : 'Copy failed. Copy the value manually.',
        tone: 'danger',
      });
    }
  };

  const invitation = share
    ? ar
      ? `رابط المراجعة: ${share.url}\nكود الدخول: ${share.code}`
      : `Review link: ${share.url}\nAccess code: ${share.code}`
    : '';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="secure-share-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-line bg-panel p-6 shadow-2xl"
        dir={ar ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              {ar ? 'مشاركة آمنة' : 'Secure sharing'}
            </p>
            <h2 id="secure-share-title" className="mt-1 text-xl font-bold text-ink">
              {ar ? 'رابط مراجعة بكود دخول' : 'Review link with an access code'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ar ? 'إغلاق' : 'Close'}
            className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        {!share ? (
          <div className="mt-6 space-y-5">
            <p className="text-sm leading-6 text-muted">
              {ar
                ? 'الضيف لن يحتاج إلى تسجيل حساب. الرابط يعمل فقط مع كود من 6 أرقام وينتهي تلقائيًا.'
                : 'Guests do not need an account. The link only opens with a six-digit code and expires automatically.'}
            </p>
            <label className="block text-sm font-semibold text-ink">
              {ar ? 'مدة صلاحية الرابط' : 'Link lifetime'}
              <select
                value={ttlDays}
                onChange={(event) => setTtlDays(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                <option value={1}>{ar ? 'يوم واحد' : '1 day'}</option>
                <option value={7}>{ar ? '7 أيام' : '7 days'}</option>
                <option value={14}>{ar ? '14 يومًا' : '14 days'}</option>
                <option value={30}>{ar ? '30 يومًا' : '30 days'}</option>
              </select>
            </label>
            {error && (
              <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
                {ar ? 'تعذر إنشاء الرابط الآمن. حاول مرة أخرى.' : 'Could not create the secure link. Please try again.'}
              </p>
            )}
            <button
              type="button"
              disabled={creating}
              onClick={() => void create()}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-black transition-opacity disabled:cursor-wait disabled:opacity-60"
            >
              {creating ? (ar ? 'جارٍ الإنشاء…' : 'Creating…') : ar ? 'إنشاء رابط وكود' : 'Create link and code'}
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="secure-share-url" className="text-xs font-semibold text-muted">
                {ar ? 'رابط المراجعة' : 'Review link'}
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="secure-share-url"
                  readOnly
                  value={share.url}
                  dir="ltr"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-xs text-ink"
                />
                <button
                  type="button"
                  onClick={() => void copy(share.url, ar ? 'تم نسخ الرابط' : 'Link copied')}
                  className="rounded-xl border border-line px-3 text-xs font-semibold text-ink hover:border-accent"
                >
                  {ar ? 'نسخ' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
              <p className="text-xs font-semibold text-muted">{ar ? 'كود الدخول' : 'Access code'}</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-[0.25em] text-accent" dir="ltr">
                {share.code}
              </p>
              <button
                type="button"
                onClick={() => void copy(share.code, ar ? 'تم نسخ الكود' : 'Code copied')}
                className="mt-3 text-xs font-semibold text-accent underline underline-offset-4"
              >
                {ar ? 'نسخ الكود' : 'Copy code'}
              </button>
            </div>

            <p className="text-xs leading-5 text-muted">
              {ar ? 'للأمان، أرسل الكود في رسالة منفصلة إن أمكن.' : 'For better security, send the code in a separate message when possible.'}
              {' · '}
              {ar ? 'ينتهي ' : 'Expires '}
              {new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(share.expiresAt))}
            </p>

            <button
              type="button"
              onClick={() => void copy(invitation, ar ? 'تم نسخ بيانات الدعوة' : 'Invitation copied')}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-black"
            >
              {ar ? 'نسخ الرابط والكود' : 'Copy link and code'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
