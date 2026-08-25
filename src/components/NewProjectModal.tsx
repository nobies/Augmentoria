import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { actions, useAppState } from '../lib/store';
import { useEscape } from '../lib/useEscape';

interface Props {
  creatorId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export default function NewProjectModal({ creatorId, onClose, onCreated }: Props) {
  const { t } = useLang();
  useEscape(onClose);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="fixed top-1/2 left-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-7 shadow-2xl"
      >
        <h2 id="new-project-title" className="font-display mb-5 text-lg font-bold">+ {t('dash_new_project')}</h2>
        <form onSubmit={submit} className="space-y-4">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('m_name')} className={cls} />
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={cls}>
            {state.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted/70">
            {t('client_add')}:{' '}
            <Link to="/app/clients" className="text-accent hover:underline">
              {t('nav_clients')} →
            </Link>
          </p>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} dir="ltr" className={cls} />
          <button type="submit" disabled={!name.trim()} className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40">
            {t('set_save')}
          </button>
        </form>
      </motion.div>
    </>
  );
}
