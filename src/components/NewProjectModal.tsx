import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { actions, PROJECT_TEMPLATES, useAppState, buildMilestones, visibleClients } from '../lib/store';
import type { ProjectAccessPolicy, TemplateId } from '../lib/store';
import { useEscape } from '../lib/useEscape';
import { useAuth } from '../context/AuthContext';

interface Props {
  creatorId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

const PLATFORMS = [
  { id: 'tvc',      key: 'platform_tvc',      ar: '16:9' },
  { id: 'youtube',  key: 'platform_youtube',   ar: '16:9' },
  { id: 'ig_feed',  key: 'platform_ig_feed',   ar: '1:1'  },
  { id: 'ig_story', key: 'platform_ig_story',  ar: '9:16' },
  { id: 'tiktok',   key: 'platform_tiktok',    ar: '9:16' },
  { id: 'ooh',      key: 'platform_ooh',       ar: 'custom' },
  { id: 'custom',   key: 'platform_custom',    ar: 'custom' },
] as const;

type PlatformId = (typeof PLATFORMS)[number]['id'];

function arFromPlatform(pid: PlatformId): string {
  return PLATFORMS.find((x) => x.id === pid)?.ar ?? '16:9';
}

export default function NewProjectModal({ creatorId, onClose, onCreated }: Props) {
  const { t, lang } = useLang();
  useEscape(onClose);
  const state = useAppState();
  const { user } = useAuth();
  const clients = visibleClients(state, user);

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [due, setDue] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId>('tvc');
  const [projectType, setProjectType] = useState<'single' | 'campaign'>('single');
  const [platform, setPlatform] = useState<PlatformId>('tvc');
  const [customAr, setCustomAr] = useState('16:9');
  const [accessPolicy, setAccessPolicy] = useState<ProjectAccessPolicy>('assigned');

  const cls = 'w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent';

  const submit = () => {
    const rec = state.clients.find((c) => c.id === clientId);
    if (!name.trim() || !rec) return;
    const ar = platform === 'custom' || platform === 'ooh' ? customAr : arFromPlatform(platform);
    const p = actions.addProject({
      name: name.trim(),
      client: rec.name,
      due: due || '—',
      creatorId,
      clientId: rec.id,
      templateId,
      projectType,
      platform,
      aspectRatio: ar,
      accessPolicy,
    });
    if (!p) return;
    onClose();
    onCreated(p.id);
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
        aria-labelledby="new-project-title"
        className="fixed top-1/2 left-1/2 z-[70] max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-7 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="new-project-title" className="font-display text-lg font-bold">
            {step === 1 ? `+ ${t('dash_new_project')}` : lang === 'ar' ? '📐 نوع المشروع والمنصة' : '📐 Project type & platform'}
          </h2>
          <div className="flex gap-1.5">
            {([1, 2] as const).map((s) => (
              <span key={s} className={`h-2 rounded-full transition-all ${s === step ? 'w-6 bg-accent' : 'w-2 bg-line'}`} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
              <label className="block space-y-1.5 text-xs text-muted">
                <span>{t('project_name')}</span>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('project_name')} className={cls} />
              </label>
              <label className="block space-y-1.5 text-xs text-muted">
                <span>{lang === 'ar' ? 'العميل' : 'Client'}</span>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={cls} aria-label={lang === 'ar' ? 'اختيار العميل' : 'Select client'}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                </select>
              </label>
              <p className="text-[11px] text-muted/70">
                {t('client_add')}:{' '}
                <Link to="/app/clients" className="text-accent hover:underline">{t('nav_clients')} →</Link>
              </p>
              <div>
                <p className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">{t('tpl_label')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplateId(tpl.id)}
                      className={`rounded-xl border px-3 py-2.5 text-start text-xs font-semibold transition-all ${
                        templateId === tpl.id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:border-muted hover:text-ink'
                      }`}
                    >
                      {t(tpl.key as never)}
                      <span className="mt-1 block text-[9px] font-normal opacity-70">
                        {buildMilestones(tpl.id).length} {lang === 'ar' ? 'مرحلة' : 'stages'}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-muted/60">{t('tpl_hint')}</p>
              </div>
              <label className="block space-y-1.5 text-xs text-muted">
                <span>{lang === 'ar' ? 'موعد التسليم' : 'Due date'}</span>
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} dir="ltr" className={cls} aria-label={lang === 'ar' ? 'موعد التسليم' : 'Due date'} />
              </label>
              <label className="block space-y-1.5 text-xs text-muted">
                <span>{t('project_access_policy')}</span>
                <select value={accessPolicy} onChange={(event) => setAccessPolicy(event.target.value as ProjectAccessPolicy)} className={cls}>
                  <option value="assigned">{t('project_access_assigned')}</option>
                  <option value="company">{t('project_access_company')}</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40"
              >
                {lang === 'ar' ? 'التالي — نوع المشروع ←' : 'Next — project type →'}
              </button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-5">
              <div>
                <p className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">{t('prj_type_label')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['single', 'campaign'] as const).map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setProjectType(pt)}
                      className={`rounded-xl border p-3.5 text-start transition-all ${
                        projectType === pt ? 'border-accent bg-accent/10' : 'border-line hover:border-muted'
                      }`}
                    >
                      <p className={`text-sm font-bold ${projectType === pt ? 'text-accent' : 'text-ink'}`}>
                        {pt === 'single' ? `🎬 ${t('prj_type_single')}` : `🎯 ${t('prj_type_campaign')}`}
                      </p>
                      <p className="mt-1 text-[10px] text-muted">
                        {t(pt === 'single' ? 'prj_type_single_hint' : 'prj_type_campaign_hint')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">{t('prj_platform_label')}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PLATFORMS.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => setPlatform(pl.id)}
                      className={`rounded-xl border px-3 py-2.5 text-start text-xs font-semibold transition-all ${
                        platform === pl.id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:border-muted hover:text-ink'
                      }`}
                    >
                      {t(pl.key as never)}
                      {pl.ar !== 'custom' && (
                        <span className="mt-0.5 block font-mono text-[9px] opacity-60">{pl.ar}</span>
                      )}
                    </button>
                  ))}
                </div>
                {(platform === 'custom' || platform === 'ooh') && (
                  <input
                    type="text"
                    value={customAr}
                    onChange={(e) => setCustomAr(e.target.value)}
                    placeholder="e.g. 4:3, 2.39:1"
                    className={`mt-2 ${cls} font-mono text-xs`}
                    dir="ltr"
                    aria-label={lang === 'ar' ? 'نسبة أبعاد مخصصة' : 'Custom aspect ratio'}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-full border border-line py-3 text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  ← {lang === 'ar' ? 'رجوع' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  className="flex-[2] rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim"
                >
                  ✓ {t('set_save')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
