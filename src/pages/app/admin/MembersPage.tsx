import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../../i18n';
import { actions, memberEffectivePerms, useAppState } from '../../../lib/store';
import type { AccountType, MemberRecord } from '../../../lib/store';
import { memberAccountType } from '../../../lib/store';
import { ALL_PERMS, ROLE_KEY } from '../../../lib/rbac';
import type { RoleId } from '../../../lib/rbac';
import { useAuth } from '../../../context/AuthContext';
import { FadeIn } from '../../../components/ui/bits';
import { toast } from '../../../lib/toast';

const ROLES: RoleId[] = ['super_admin', 'company_admin', 'am', 'assistant', 'ops', 'designer', 'client'];
const AVATAR_GRADIENTS = ['from-sky-400 to-blue-600', 'from-emerald-400 to-teal-600', 'from-orange-400 to-red-500', 'from-fuchsia-400 to-purple-600', 'from-accent to-accent-dim'];

export default function MembersPage() {
  const { t, lang } = useLang();
  const state = useAppState();
  const { user } = useAuth();
  const isSuper = user.roleId === 'super_admin';
  const myMember = state.members.find((m) => m.id === user.id);
  const scopedMembers = isSuper ? state.members : state.members.filter((m) => m.companyId === (myMember?.companyId ?? user.companyId));
  const scopedAudit = state.auditLog
    .filter((event) => isSuper || event.companyId === (myMember?.companyId ?? user.companyId))
    .slice(0, 8);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black">{t('admin_members')}</h1>
          <p className="mt-1.5 text-xs text-muted">
            {scopedMembers.length} {t('members_count')}
            {!isSuper && state.companies.find((c) => c.id === myMember?.companyId)?.name ? ` · ${state.companies.find((c) => c.id === myMember?.companyId)?.name}` : ''}
            {' · '}
            <Link to="/app/admin/roles" className="text-accent hover:underline">
              {t('roles_title')} →
            </Link>
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setInviteOpen(true)}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-bg transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
        >
          + {t('m_add_member')}
        </motion.button>
      </div>

      <div className="space-y-3">
        {scopedMembers.map((m, i) => (
          <FadeIn key={m.id} delay={i * 0.04}>
            <MemberRow
              m={m}
              currentUserId={user.id}
              currentUserIsSuper={isSuper}
              expanded={expanded === m.id}
              onToggle={() => setExpanded((e) => (e === m.id ? null : m.id))}
            />
          </FadeIn>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-surface p-5" aria-labelledby="access-audit-title">
        <h2 id="access-audit-title" className="text-sm font-bold">{t('audit_recent')}</h2>
        {scopedAudit.length === 0 ? (
          <p className="mt-3 text-xs text-muted">{t('audit_empty')}</p>
        ) : (
          <div className="mt-3 divide-y divide-line">
            {scopedAudit.map((event) => {
              const actor = state.members.find((member) => member.id === event.actorId);
              return (
                <div key={event.id} className="flex items-start justify-between gap-4 py-2.5 text-xs">
                  <p className="min-w-0">
                    <span className="font-semibold">{actor?.name ?? event.actorId}</span>
                    <span className="text-muted"> · {lang === 'ar' ? event.textAr : event.textEn}</span>
                  </p>
                  <time className="shrink-0 font-mono text-[10px] text-muted" dir="ltr">{event.createdAt.slice(0, 16)}</time>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AnimatePresence>{inviteOpen && <InviteModal actorId={user.id} canAssignSuper={isSuper} scopedCompanyId={!isSuper ? myMember?.companyId ?? '' : ''} onClose={() => setInviteOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function MemberRow({ m, currentUserId, currentUserIsSuper, expanded, onToggle }: { m: MemberRecord; currentUserId: string; currentUserIsSuper: boolean; expanded: boolean; onToggle: () => void }) {
  const { t, lang } = useLang();
  const state = useAppState();
  const company = state.companies.find((c) => c.id === m.companyId);
  const suspended = m.status === 'suspended';
  const effective = memberEffectivePerms(m, state.customRoles);
  const roleEffective = memberEffectivePerms({ ...m, extraPerms: [] }, state.customRoles);
  const customRole = state.customRoles.find((r) => r.id === m.customRoleId);
  const isSelf = m.id === currentUserId;
  const lockedByRole = m.roleId === 'super_admin' && !currentUserIsSuper;
  const roleLocked = isSelf || lockedByRole;
  const assignableRoles = ROLES.filter((r) => r !== 'super_admin' || currentUserIsSuper);
  const companyCustomRoles = state.customRoles.filter((r) => r.companyId === m.companyId);
  const selectValue = customRole ? `cr:${customRole.id}` : `b:${m.roleId}`;

  const changeRole = (value: string) => {
    if (roleLocked) return;
    if (value.startsWith('cr:')) actions.setMemberCustomRole(m.id, value.slice(3), currentUserId);
    else actions.setMemberRole(m.id, value.slice(2) as RoleId, currentUserId);
  };

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
          value={selectValue}
          disabled={roleLocked}
          title={isSelf ? t('m_self_guard') : lockedByRole ? t('m_sa_locked') : undefined}
          onChange={(e) => changeRole(e.target.value)}
          className="max-w-[160px] rounded-full border border-line bg-bg px-3 py-1.5 text-xs outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <optgroup label={t('roles_custom')}>
            {companyCustomRoles.map((r) => (
              <option key={r.id} value={`cr:${r.id}`}>
                {r.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={t('roles_builtin')}>
            {(assignableRoles.includes(m.roleId) ? assignableRoles : [...assignableRoles, m.roleId]).map((r) => (
              <option key={r} value={`b:${r}`}>
                {t(ROLE_KEY[r] as never)}
              </option>
            ))}
          </optgroup>
        </select>

        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${suspended ? 'border-red-400/30 bg-red-400/10 text-red-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'}`}>
          {suspended ? t('m_status_suspended') : t('m_status_active')}
        </span>

        <select
          value={memberAccountType(m)}
          disabled={roleLocked}
          aria-label={t('m_account_type')}
          onChange={(event) => actions.setMemberAccountType(m.id, event.target.value as AccountType, currentUserId)}
          className="rounded-full border border-line bg-bg px-2.5 py-1.5 text-[11px] outline-none focus:border-accent disabled:opacity-50"
        >
          <option value="internal">{t('m_account_internal')}</option>
          <option value="client">{t('m_account_client')}</option>
        </select>

        <button
          onClick={() => actions.setMemberStatus(m.id, suspended ? 'active' : 'suspended', currentUserId)}
          disabled={roleLocked}
          title={isSelf ? t('m_self_guard') : lockedByRole ? t('m_sa_locked') : undefined}
          className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-orange-300 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
        >
          {suspended ? t('m_activate') : t('m_suspend')}
        </button>
        <button onClick={onToggle} className={`rounded-md border p-1.5 text-xs transition-colors ${expanded ? 'border-accent text-accent' : 'border-line text-muted hover:border-accent hover:text-accent'}`} aria-label={t('m_perms_title')}>
          🔑
        </button>
        <button
          onClick={() => {
            if (!confirm(t('m_remove_confirm'))) return;
            const entryId = actions.removeMember(m.id, currentUserId);
            if (entryId) {
              toast({
                message: `${t('toast_member_removed')} — ${m.name}`,
                actionLabel: t('toast_undo'),
                onAction: () => {
                  if (actions.restoreFromTrash(entryId, currentUserId)) toast({ message: t('toast_restored'), tone: 'success' });
                }
              });
            }
          }}
          disabled={roleLocked}
          title={isSelf ? t('m_self_guard') : lockedByRole ? t('m_sa_locked') : undefined}
          className="rounded-md border border-line p-1.5 text-xs text-muted transition-colors hover:border-red-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
          aria-label={t('prj_remove_member')}
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
                  const fromRole = roleEffective.has(perm);
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
                        onChange={() => actions.toggleMemberPerm(m.id, perm, currentUserId)}
                        className="accent-accent"
                      />
                      {t(`perm_${perm.replace('.', '_')}` as never)}
                      {fromRole && <span className="ms-auto text-[9px] text-muted/50 uppercase">{lang === 'ar' ? 'من الدور' : 'role'}</span>}
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

function InviteModal({ actorId, canAssignSuper, scopedCompanyId, onClose }: { actorId: string; canAssignSuper: boolean; scopedCompanyId: string; onClose: () => void }) {
  const { t } = useLang();
  const state = useAppState();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState(scopedCompanyId || (state.companies[0]?.id ?? ''));
  const [accountType, setAccountType] = useState<AccountType>('internal');
  const [roleSelection, setRoleSelection] = useState(() => {
    const customRoles = state.customRoles.filter((r) => r.companyId === (scopedCompanyId || state.companies[0]?.id));
    return customRoles.length > 0 ? `cr:${customRoles[0].id}` : 'b:am';
  });

  const companyCustomRoles = state.customRoles.filter((r) => r.companyId === companyId);
  const assignableBuiltinRoles = ROLES.filter((r) => {
    if (accountType === 'client') return r === 'client';
    if (r === 'client') return false;
    return r !== 'super_admin' || canAssignSuper;
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !companyId) return;
    const isCustom = roleSelection.startsWith('cr:');
    const customRoleId = isCustom ? roleSelection.slice(3) : undefined;
    const roleId: RoleId = isCustom ? (accountType === 'client' ? 'client' : 'assistant') : (roleSelection.slice(2) as RoleId);
    actions.addMember({
      name: name.trim(),
      email: email.trim(),
      companyId,
      roleId,
      accountType,
      customRoleId
    }, actorId);
    toast({ message: `${t('admin_members')} — ${name.trim()}`, tone: 'success' });
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-title"
      >
        <h2 id="add-member-title" className="font-display mb-5 text-lg font-bold">{t('m_add_member')}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('m_account_type')}</label>
            <select
              aria-label={t('m_account_type')}
              value={accountType}
              onChange={(event) => {
                const next = event.target.value as AccountType;
                setAccountType(next);
                if (!roleSelection.startsWith('cr:')) setRoleSelection(next === 'client' ? 'b:client' : 'b:am');
              }}
              className={cls}
            >
              <option value="internal">{t('m_account_internal')}</option>
              <option value="client">{t('m_account_client')}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('m_name')}</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('m_name')} className={cls} />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('m_email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('m_email')} dir="ltr" className={cls} />
          </div>

          {!scopedCompanyId && canAssignSuper && state.companies.length > 1 && (
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('comp_open')}</label>
              <select
                aria-label={t('m_company')}
                value={companyId}
                onChange={(e) => {
                  const nextCompanyId = e.target.value;
                  setCompanyId(nextCompanyId);
                  const nextCustom = state.customRoles.filter((r) => r.companyId === nextCompanyId);
                  setRoleSelection(nextCustom.length > 0 ? `cr:${nextCustom[0].id}` : 'b:am');
                }}
                className={cls}
              >
                {state.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('admin_roles')}</label>
            <select aria-label={t('m_role')} value={roleSelection} onChange={(e) => setRoleSelection(e.target.value)} className={cls}>
              {companyCustomRoles.length > 0 && (
                <optgroup label={t('roles_custom')}>
                  {companyCustomRoles.map((r) => (
                    <option key={r.id} value={`cr:${r.id}`}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label={t('roles_builtin')}>
                {assignableBuiltinRoles.map((r) => (
                  <option key={r} value={`b:${r}`}>
                    {t(ROLE_KEY[r] as never)}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <button type="submit" disabled={!name.trim() || !email.trim()} className="w-full rounded-full bg-accent py-3 text-sm font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40">
            {t('m_add_member')}
          </button>
        </form>
      </motion.div>
    </>
  );
}
