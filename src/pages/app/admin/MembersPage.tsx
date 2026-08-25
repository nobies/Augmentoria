import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../../i18n';
import { actions, useAppState } from '../../../lib/store';
import type { MemberRecord } from '../../../lib/store';
import { ALL_PERMS, ROLE_KEY, ROLE_PERMS } from '../../../lib/rbac';
import type { RoleId } from '../../../lib/rbac';
import { FadeIn } from '../../../components/ui/bits';

const ROLES: RoleId[] = ['super_admin', 'company_admin', 'am', 'assistant', 'ops', 'designer', 'client'];
const AVATAR_GRADIENTS = ['from-sky-400 to-blue-600', 'from-emerald-400 to-teal-600', 'from-orange-400 to-red-500', 'from-fuchsia-400 to-purple-600', 'from-accent to-accent-dim'];

export default function MembersPage() {
  const { t } = useLang();
  const state = useAppState();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black">{t('admin_members')}</h1>
          <p className="mt-1.5 text-xs text-muted">{state.members.length} {t('members_count')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setInviteOpen(true)}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-bg transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
        >
          + {t('m_invite')}
        </motion.button>
      </div>

      <div className="space-y-3">
        {state.members.map((m, i) => (
          <FadeIn key={m.id} delay={i * 0.04}>
            <MemberRow
              m={m}
              expanded={expanded === m.id}
              onToggle={() => setExpanded((e) => (e === m.id ? null : m.id))}
            />
          </FadeIn>
        ))}
      </div>

      <AnimatePresence>{inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function MemberRow({ m, expanded, onToggle }: { m: MemberRecord; expanded: boolean; onToggle: () => void }) {
  const { t } = useLang();
  const state = useAppState();
  const company = state.companies.find((c) => c.id === m.companyId);
  const suspended = m.status === 'suspended';
  const effective = new Set([...(ROLE_PERMS[m.roleId] ?? []), ...(m.extraPerms ?? [])]);

  return (
    <div className={`rounded-xl border transition-colors ${suspended ? 'border-line/50 bg-surface/50 opacity-60' : 'border-line bg-surface'}`}>
      <div className="flex flex-wrap items-center gap-4 p-4">
        {m.avatar ? (
          <img src={m.avatar} alt={m.name} className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-accent/30" />
        ) : (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${AVATAR_GRADIENTS[m.name.length % AVATAR_GRADIENTS.length]}`}>
            {m.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{m.name} {m.title && <span className="text-muted/70">· {m.title}</span>}</p>
          <p className="truncate text-[11px] text-muted" dir="ltr">{m.email} · {company?.name ?? '—'}</p>
        </div>

        <select
          value={m.roleId}
          onChange={(e) => actions.setMemberRole(m.id, e.target.value as RoleId)}
          className="rounded-full border border-line bg-bg px-3 py-1.5 text-xs outline-none focus:border-accent"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(ROLE_KEY[r] as never)}
            </option>
          ))}
        </select>

        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${suspended ? 'border-red-400/30 bg-red-400/10 text-red-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'}`}>
          {suspended ? t('m_status_suspended') : t('m_status_active')}
        </span>

        <button onClick={() => actions.setMemberStatus(m.id, suspended ? 'active' : 'suspended')} className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-orange-300 hover:text-orange-300">
          {suspended ? t('m_activate') : t('m_suspend')}
        </button>
        <button onClick={onToggle} className={`rounded-md border p-1.5 text-xs transition-colors ${expanded ? 'border-accent text-accent' : 'border-line text-muted hover:border-accent hover:text-accent'}`} aria-label="Permissions">
          🔑
        </button>
        <button
          onClick={() => {
            if (confirm(t('m_remove_confirm'))) actions.removeMember(m.id);
          }}
          className="rounded-md border border-line p-1.5 text-xs text-muted transition-colors hover:border-red-400 hover:text-red-400"
          aria-label="Remove"
        >
          🗑
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-line px-5 py-4">
              <p className="mb-1 text-[11px] font-bold tracking-wider text-accent uppercase">{t('m_perms_title')}</p>
              <p className="mb-3 text-[11px] text-muted/70">{t('m_perms_hint')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ALL_PERMS.map((perm) => {
                  const fromRole = (ROLE_PERMS[m.roleId] ?? []).includes(perm);
                  const extra = m.extraPerms?.includes(perm) ?? false;
                  const on = effective.has(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                        on ? 'border-accent/40 bg-accent/5 text-ink' : 'border-line text-muted hover:border-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={fromRole}
                        onChange={() => actions.toggleMemberPerm(m.id, perm)}
                        className="accent-accent"
                      />
                      {t(`perm_${perm.replace('.', '_')}` as never)}
                      {fromRole && <span className="ms-auto text-[9px] text-muted/50 uppercase">role</span>}
                      {!fromRole && extra && <span className="ms-auto text-[9px] text-accent uppercase">+</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const state = useAppState();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState(state.companies[0]?.id ?? '');
  const [roleId, setRoleId] = useState<RoleId>('am');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !companyId) return;
    actions.addMember({ name: name.trim(), email: email.trim(), companyId, roleId });
    onClose();
  };

  const cls =
    'w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent';

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-7 shadow-2xl"
      >
        <h2 className="font-display mb-5 text-lg font-bold">{t('m_invite')}</h2>
        <form onSubmit={submit} className="space-y-4">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('m_name')} className={cls} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('m_email')} dir="ltr" className={cls} />
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={cls}>
            {state.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value as RoleId)} className={cls}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(ROLE_KEY[r] as never)}
              </option>
            ))}
          </select>
          <button type="submit" className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim">
            {t('m_send_invite')}
          </button>
        </form>
      </motion.div>
    </>
  );
}
