import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../i18n';
import { actions } from '../lib/store';
import { idb } from '../lib/idb';
import { useEscape } from '../lib/useEscape';

interface Props {
  projectId: string;
  prevVersion: string;
  openNotes: number;
  onClose: () => void;
}

export default function UploadVersionModal({ projectId, prevVersion, openNotes, onClose }: Props) {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  useEscape(onClose);
  const [file, setFile] = useState<File | null>(null);
  const [carry, setCarry] = useState(openNotes > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const num = parseInt(prevVersion.replace(/\D/g, ''), 10) || 0;
  const nextV = `V${String(num + 1).padStart(2, '0')}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError(lang === 'ar' ? 'اختار ملف فيديو الأول.' : 'Pick a video file first.');
      return;
    }
    setBusy(true);
    try {
      const res = actions.addVersion(projectId, { carryOpen: carry && openNotes > 0 });
      if (!res?.version) throw new Error('version creation failed');
      await idb.put('video', {
        id: `${projectId}__${res.version}`,
        name: file.name,
        type: file.type || 'video/mp4',
        blob: file,
        active: true,
        createdAt: Date.now()
      });
      onClose();
      navigate(`/studio/review/${projectId}/${res.version}`);
    } catch (err) {
      console.error('[upload-version]', err);
      setError(lang === 'ar' ? 'حصل خطأ في الرفع — جرّب تاني.' : 'Upload failed — try again.');
      setBusy(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-version-title"
        className="fixed top-1/2 left-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-7 shadow-2xl"
      >
        <h2 id="upload-version-title" className="font-display mb-1 text-lg font-bold">↑ {t('prj_upload_version')}</h2>
        <p className="mb-5 text-xs text-muted">
          {lang === 'ar' ? 'نسخة جديدة' : 'New version'} <span className="font-mono font-bold text-accent">{nextV}</span>
          {lang === 'ar' ? ' بعد' : ' after'} <span className="font-mono">{prevVersion}</span>
        </p>
        <form
          onSubmit={(e) => void submit(e)}
          className="space-y-4"
        >
          <label
            className={`block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              file ? 'border-emerald-400/50 text-emerald-300' : 'border-line text-muted hover:border-accent hover:text-accent'
            }`}
          >
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            {file ? (
              <span className="block truncate font-mono text-xs">✓ {file.name}</span>
            ) : (
              <>
                <svg className="mx-auto mb-2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4m0 0L7 9m5-5l5 5" />
                  <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                </svg>
                <span className="text-xs">{lang === 'ar' ? 'اختار ملف الفيديو (MP4/MOV)' : 'Pick a video file (MP4/MOV)'}</span>
              </>
            )}
          </label>

          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${carry ? 'border-accent/50 bg-accent/5' : 'border-line'}`}>
            <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} disabled={openNotes === 0} className="mt-0.5 accent-accent" />
            <span className="text-xs">
              <b>{t('ver_carry')}</b>
              {openNotes > 0 && (
                <span className="mt-0.5 block text-[11px] text-muted">
                  {openNotes} {t('prj_open_notes')} · {prevVersion}
                </span>
              )}
            </span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button type="submit" disabled={!file || busy} className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40">
            {busy ? '…' : `${t('set_save')} → ${t('nav_reviews')}`}
          </button>
        </form>
      </motion.div>
    </>
  );
}
