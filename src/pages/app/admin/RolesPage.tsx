import { useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../../../i18n';
import { BUILTIN_ROLE_TEMPLATES, actions, useAppState } from '../../../lib/store';
import type { CustomRole, RoleTemplate, RoleTemplateRole } from '../../../lib/store';
import { ALL_PERMS, ROLE_KEY, ROLE_PERMS } from '../../../lib/rbac';
import type { RoleId } from '../../../lib/rbac';
import { useAuth } from '../../../context/AuthContext';
import { FadeIn } from '../../../components/ui/bits';
import { toast } from '../../../lib/toast';

interface Draft {
  id: string | null;
  name: string;
  perms: Perm[];
  parentId: string;
}

type Perm = (typeof ALL_PERMS)[number];

const BUILTIN_ROLES: RoleId[] = ['super_admin', 'company_admin', 'am', 'assistant', 'ops', 'designer', 'client'];

function emptyDraft(): Draft {
  return { id: null, name: '', perms: [], parentId: '' };
}

function descendantRoleIds(roles: CustomRole[], rootId: string): Set<string> {
  const result = new Set<string>();
  const visit = (id: string) => {
    for (const role of roles) {
      if (role.parentId !== id || result.has(role.id)) continue;
      result.add(role.id);
      visit(role.id);
    }
  };
  visit(rootId);
  return result;
}

export default function RolesPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const state = useAppState();
  const isSuper = user.roleId === 'super_admin';
  const myMember = state.members.find((m) => m.id === user.id);
  const [companyId, setCompanyId] = useState(() => (isSuper ? state.companies[0]?.id ?? '' : myMember?.companyId ?? ''));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [applyTpl, setApplyTpl] = useState<RoleTemplate | null>(null);
  const [editorTpl, setEditorTpl] = useState<{
    tpl: RoleTemplate | null;
    prefillRoles?: RoleTemplateRole[];
    initialName?: string;
    initialDesc?: string;
  } | null>(null);

  const effectiveCompanyId = isSuper ? companyId : myMember?.companyId ?? '';
  const company = state.companies.find((c) => c.id === effectiveCompanyId);
  const roles = state.customRoles.filter((r) => r.companyId === effectiveCompanyId);

  const memberCount = (roleId: string) => state.members.filter((m) => m.customRoleId === roleId).length;

  const roots = roles.filter((r) => !r.parentId || !roles.some((p) => p.id === r.parentId));
  const childrenOf = (id: string) => roles.filter((r) => r.parentId === id);

  const canDelete = (role: CustomRole) => memberCount(role.id) === 0 && !roles.some((candidate) => candidate.parentId === role.id);

  const startEdit = (role?: CustomRole) => {
    if (role) setDraft({ id: role.id, name: role.name, perms: [...role.perms], parentId: role.parentId ?? '' });
    else setDraft(emptyDraft());
  };

  const save = () => {
    if (!draft || !draft.name.trim() || !effectiveCompanyId) return;
    const payload = { name: draft.name.trim(), perms: draft.perms, parentId: draft.parentId || undefined };
    if (draft.id) actions.updateCustomRole(draft.id, payload, user.id);
    else actions.addCustomRole({ ...payload, companyId: effectiveCompanyId }, user.id);
    setDraft(null);
  };

  const togglePerm = (perm: Perm) => {
    setDraft((d) =>
      d ? { ...d, perms: d.perms.includes(perm) ? d.perms.filter((p) => p !== perm) : [...d.perms, perm] } : d
    );
  };

  const roleChip = 'rounded-full border px-2 py-0.5 text-[9px] font-bold';

  const renderNode = (role: CustomRole, depth: number): ReactNode => (
    <div key={role.id}>
      <FadeIn delay={depth * 0.03}>
        <div
          className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 transition-colors ${
            depth > 0 ? 'ms-5 border-line/70 bg-bg/60' : 'border-line bg-surface'
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-xs font-black text-accent">
            {role.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {role.name}
              <span className={`ms-2 ${roleChip} border-line text-muted`}>{memberCount(role.id)} 👤</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted">{role.perms.length} permissions</p>
          </div>
          <div className="hidden max-w-[40%] flex-wrap gap-1 lg:flex">
            {role.perms.slice(0, 4).map((perm) => (
              <span key={perm} className={`${roleChip} border-accent/30 bg-accent/10 text-accent`}>
                {t(`perm_${perm.replace('.', '_')}` as never)}
              </span>
            ))}
            {role.perms.length > 4 && <span className={`${roleChip} border-line text-muted`}>+{role.perms.length - 4}</span>}
          </div>
          <button onClick={() => startEdit(role)} className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent">
            ✎ {t('prj_edit_btn')}
          </button>
          <button
            onClick={() => {
              if (!canDelete(role)) return;
              if (confirm(lang === 'ar' ? `تشيل دور "${role.name}"؟` : `Delete role "${role.name}"?`)) actions.removeCustomRole(role.id, user.id);
            }}
            disabled={!canDelete(role)}
            title={canDelete(role) ? undefined : t('role_in_use')}
            className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-red-400 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
          >
            🗑
          </button>
        </div>
      </FadeIn>
      {childrenOf(role.id).map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black">{t('roles_title')}</h1>
          <p className="mt-1.5 text-xs text-muted">{t('roles_sub')}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => startEdit()}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-bg transition-shadow hover:shadow-[0_0_24px_rgba(var(--glow-rgb),0.35)]"
        >
          + {t('role_new')}
        </motion.button>
      </div>

      {isSuper && (
        <select
          value={effectiveCompanyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded-full border border-line bg-surface px-4 py-1.5 text-xs outline-none focus:border-accent"
        >
          {state.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <div className="space-y-3">
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted/50 uppercase">{lang === 'ar' ? 'المسميات المخصصة' : 'Custom roles'}</p>
        {roots.length === 0 && (
          <div className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">{t('roles_empty')}</div>
        )}
        {roots.map((role) => renderNode(role, 0))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-muted/50 uppercase">{t('tpl_section_title')}</p>
          <button
            onClick={() => setEditorTpl({ tpl: null, prefillRoles: roles.map((r, i) => ({ key: `k${i}`, name: r.name, perms: [...r.perms], parentKey: undefined })) })}
            disabled={roles.length === 0}
            className="rounded-full border border-accent/50 px-3.5 py-1.5 text-[11px] font-bold text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
            title={t('tpl_save_current_hint')}
          >
            ⭐ {t('tpl_save_current')}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...state.roleTemplates.filter((rt) => rt.companyId === effectiveCompanyId).map((rt) => ({ tpl: rt, saved: true })), ...BUILTIN_ROLE_TEMPLATES.map((tpl) => ({ tpl, saved: false }))].map(({ tpl, saved }) => (
            <FadeIn key={tpl.id}>
              <div className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/40">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-sm font-bold leading-snug">{tpl.name}</h4>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${saved ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-line text-muted'}`}>
                    {saved ? t('roles_custom') : t('tpl_industry')}
                  </span>
                </div>
                {tpl.description && <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{tpl.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1">
                  {tpl.roles.map((r, i) => (
                    <span key={r.key} className="rounded-full border border-line px-2 py-0.5 text-[9px] font-semibold text-muted">
                      {i > 0 && <span className="me-1 text-muted/40">→</span>}
                      {r.name}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                  <button
                    onClick={() => setApplyTpl(tpl)}
                    className="rounded-full bg-accent px-3.5 py-1.5 text-[11px] font-bold text-bg transition-colors hover:bg-accent-dim"
                  >
                    ⬇ {t('tpl_apply')}
                  </button>
                  {!saved && (
                    <button
                      onClick={() =>
                        setEditorTpl({
                          tpl: null,
                          prefillRoles: tpl.roles.map((r) => ({ ...r, perms: [...r.perms] })),
                          initialName: `${tpl.name} (${lang === 'ar' ? 'مخصص' : 'Custom'})`,
                          initialDesc: tpl.description
                        })
                      }
                      title={t('tpl_customize_hint')}
                      className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      ✎ {t('tpl_customize')}
                    </button>
                  )}
                  {saved && (
                    <>
                      <button
                        onClick={() => setEditorTpl({ tpl })}
                        title={t('tpl_edit')}
                        className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() =>
                          setEditorTpl({
                            tpl: null,
                            prefillRoles: tpl.roles.map((r) => ({ ...r, perms: [...r.perms] })),
                            initialName: `${tpl.name} (${lang === 'ar' ? 'نسخة' : 'Copy'})`,
                            initialDesc: tpl.description
                          })
                        }
                        title={t('tpl_duplicate')}
                        className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(lang === 'ar' ? `تشيل تمبليت "${tpl.name}"؟` : `Delete template "${tpl.name}"?`)) actions.removeRoleTemplate(tpl.id, user.id);
                        }}
                        className="rounded-md border border-line px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:border-red-400 hover:text-red-400"
                      >
                        🗑
                      </button>
                    </>
                  )}
                  <span className="ms-auto text-[10px] text-muted/60">{tpl.roles.length} {lang === 'ar' ? 'مسمى' : 'roles'}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold tracking-[0.2em] text-muted/50 uppercase">{lang === 'ar' ? 'أدوار النظام الثابتة' : 'Built-in system roles'}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BUILTIN_ROLES.map((rid) => {
            const count = state.members.filter((m) => m.companyId === effectiveCompanyId && m.roleId === rid && !m.customRoleId).length;
            return (
              <div key={rid} className="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-surface/60 px-4 py-3 opacity-80">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t(ROLE_KEY[rid] as never)}</p>
                  <p className="text-[10px] text-muted">{ROLE_PERMS[rid].length} permissions · {count} 👤</p>
                </div>
                <span className={`${roleChip} shrink-0 border-line text-muted/60 uppercase`}>{lang === 'ar' ? 'ثابت' : 'fixed'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {applyTpl && company && (
          <ApplyTemplateModal
            tpl={applyTpl}
            existingNames={roles.map((r) => r.name)}
            onApply={(selectedRoles) => {
              const res = actions.applyRoleTemplate({ ...applyTpl, roles: selectedRoles }, effectiveCompanyId, user.id);
              setApplyTpl(null);
              if (res.created > 0) toast({ message: `${res.created} ${lang === 'ar' ? 'مسمى أضيف' : 'role(s) created'}${res.skipped ? ` · ${res.skipped} skipped` : ''}`, tone: 'success' });
              else toast({ message: t('tpl_already_applied'), tone: 'default' });
            }}
            onClose={() => setApplyTpl(null)}
          />
        )}
        {editorTpl && (
          <TemplateEditorModal
            template={editorTpl.tpl}
            prefillRoles={editorTpl.prefillRoles}
            initialName={editorTpl.initialName}
            initialDesc={editorTpl.initialDesc}
            companyId={effectiveCompanyId}
            actorId={user.id}
            onClose={() => setEditorTpl(null)}
          />
        )}

        {draft && company && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDraft(null)} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 z-[70] max-h-[85vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-7 shadow-2xl"
            >
              <h2 className="font-display mb-5 text-lg font-bold">{draft.id ? `${t('role_edit')} — ${company.name}` : `${t('role_new')} — ${company.name}`}</h2>
              <div className="space-y-4">
                <input
                  autoFocus
                  value={draft.name}
                  onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                  placeholder={t('role_name_ph')}
                  className="w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
                />
                <select
                  value={draft.parentId}
                  onChange={(e) => setDraft((d) => (d ? { ...d, parentId: e.target.value } : d))}
                  className="w-full rounded-lg border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
                >
                  <option value="">{t('role_none')}</option>
                  {roles
                    .filter((r) => r.id !== draft.id && !(draft.id && descendantRoleIds(roles, draft.id).has(r.id)))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        ↳ {r.name}
                      </option>
                    ))}
                </select>

                <div>
                  <p className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">{t('m_perms_title')}</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {ALL_PERMS.map((perm) => (
                      <label
                        key={perm}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                          draft.perms.includes(perm) ? 'border-accent/40 bg-accent/5 text-ink' : 'border-line text-muted hover:border-muted'
                        }`}
                      >
                        <input type="checkbox" checked={draft.perms.includes(perm)} onChange={() => togglePerm(perm)} className="accent-accent" />
                        {t(`perm_${perm.replace('.', '_')}` as never)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setDraft(null)} className="rounded-full border border-line px-5 py-2 text-xs text-muted hover:text-ink">
                    ✕
                  </button>
                  <button
                    onClick={save}
                    disabled={!draft.name.trim()}
                    className="rounded-full bg-accent px-6 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40"
                  >
                    {t('set_save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ApplyTemplateModal({
  tpl,
  existingNames,
  onApply,
  onClose
}: {
  tpl: RoleTemplate;
  existingNames: string[];
  onApply: (roles: RoleTemplateRole[]) => void;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tpl.roles.map((r) => [r.key, !existingNames.some((e) => e.toLowerCase() === r.name.toLowerCase())]))
  );

  const chosen = tpl.roles.filter((r) => selected[r.key]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[70] max-h-[80vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <h2 className="font-display mb-1 text-lg font-bold">{t('tpl_apply')} — {tpl.name}</h2>
        <p className="mb-4 text-[11px] leading-relaxed text-muted">{t('tpl_apply_hint')}</p>
        <div className="space-y-1.5">
          {tpl.roles.map((r) => {
            const exists = existingNames.some((e) => e.toLowerCase() === r.name.toLowerCase());
            const parent = r.parentKey ? tpl.roles.find((x) => x.key === r.parentKey)?.name : null;
            return (
              <label
                key={r.key}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs transition-colors ${
                  exists ? 'border-line/50 opacity-50' : selected[r.key] ? 'border-accent/40 bg-accent/5' : 'border-line'
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(selected[r.key])}
                  disabled={exists}
                  onChange={(e) => setSelected((s) => ({ ...s, [r.key]: e.target.checked }))}
                  className="accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  {parent && <span className="block truncate text-[10px] text-muted">↳ {parent}</span>}
                </span>
                {exists && <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 text-[9px] font-bold uppercase text-muted">{t('tpl_exists')}</span>}
              </label>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-line px-5 py-2 text-xs text-muted hover:text-ink">
            ✕
          </button>
          <button
            onClick={() => onApply(chosen)}
            disabled={chosen.length === 0}
            className="rounded-full bg-accent px-6 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40"
          >
            {t('tpl_apply')} ({chosen.length})
          </button>
        </div>
      </motion.div>
    </>
  );
}

function TemplateEditorModal({
  template,
  prefillRoles,
  initialName,
  initialDesc,
  companyId,
  actorId,
  onClose
}: {
  template: RoleTemplate | null;
  prefillRoles?: RoleTemplateRole[];
  initialName?: string;
  initialDesc?: string;
  companyId: string;
  actorId: string;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const [name, setName] = useState(initialName ?? template?.name ?? '');
  const [description, setDescription] = useState(initialDesc ?? template?.description ?? '');
  const [roles, setRoles] = useState<RoleTemplateRole[]>(() =>
    template
      ? template.roles.map((r) => ({ ...r, perms: [...r.perms] }))
      : (prefillRoles ?? [{ key: `k${Date.now()}`, name: '', perms: [] }])
  );
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const patchRole = (key: string, patch: Partial<RoleTemplateRole>) =>
    setRoles((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRole = () => {
    const key = `k${Date.now()}`;
    setRoles((rs) => [...rs, { key, name: '', perms: [] }]);
    setExpandedKey(key);
  };

  const save = (saveAsNew = false) => {
    const cleaned = roles.filter((r) => r.name.trim());
    if (!name.trim() || cleaned.length === 0) return;
    if (template && !saveAsNew) {
      actions.updateRoleTemplate(template.id, { name: name.trim(), description: description || undefined, roles: cleaned }, actorId);
      toast({ message: lang === 'ar' ? 'تم حفظ التعديلات على التمبليت' : 'Template updated', tone: 'success' });
    } else {
      actions.saveRoleTemplate({ name: name.trim(), description: description || undefined, roles: cleaned, companyId }, actorId);
      toast({ message: lang === 'ar' ? 'تم حفظ التمبليت كقالب جديد خاص بالاستوديو' : 'Saved as a new studio template', tone: 'success' });
    }
    onClose();
  };

  const inputCls = 'w-full rounded-lg border border-line bg-bg px-3 py-2 text-xs outline-none focus:border-accent';

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed top-1/2 left-1/2 z-[70] max-h-[85vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
      >
        <h2 className="font-display mb-1 text-lg font-bold">
          {template ? `${t('tpl_edit')} — ${template.name}` : initialName ? `${t('tpl_customize')} — ${name}` : t('tpl_save_current')}
        </h2>
        <p className="mb-4 text-[11px] text-muted">
          {template ? t('tpl_desc_ph') : t('tpl_customize_hint')}
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('tpl_label')}</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('tpl_name_ph')} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold tracking-wider text-muted uppercase">{t('ast_note')}</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('tpl_desc_ph')} className={inputCls} />
          </div>

          <div className="space-y-2">
            {roles.map((r) => (
              <div key={r.key} className="rounded-xl border border-line bg-bg/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input value={r.name} onChange={(e) => patchRole(r.key, { name: e.target.value })} placeholder={t('role_name_ph')} className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs outline-none focus:border-accent" />
                  <select value={r.parentKey ?? ''} onChange={(e) => patchRole(r.key, { parentKey: e.target.value || undefined })} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] outline-none focus:border-accent">
                    <option value="">{t('role_none')}</option>
                    {roles.filter((x) => x.key !== r.key).map((x) => (
                      <option key={x.key} value={x.key}>↳ {x.name || '—'}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setExpandedKey((k) => (k === r.key ? null : r.key))}
                    className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[10px] font-bold transition-colors ${
                      expandedKey === r.key ? 'border-accent text-accent' : 'border-line text-muted hover:border-accent hover:text-accent'
                    }`}
                  >
                    🔑 {r.perms.length}
                  </button>
                  <button
                    onClick={() => setRoles((rs) => rs.filter((x) => x.key !== r.key))}
                    className="shrink-0 rounded-md border border-line px-2 py-1.5 text-[10px] text-muted transition-colors hover:border-red-400 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
                {expandedKey === r.key && (
                  <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {ALL_PERMS.map((perm) => (
                      <label key={perm} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] transition-colors ${r.perms.includes(perm) ? 'border-accent/40 bg-accent/5 text-ink' : 'border-line text-muted'}`}>
                        <input
                          type="checkbox"
                          checked={r.perms.includes(perm)}
                          onChange={() =>
                            patchRole(r.key, {
                              perms: r.perms.includes(perm) ? r.perms.filter((p) => p !== perm) : [...r.perms, perm]
                            })
                          }
                          className="accent-accent"
                        />
                        {t(`perm_${perm.replace('.', '_')}` as never)}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={addRole} className="w-full rounded-lg border border-dashed border-line py-2 text-xs font-semibold text-muted transition-colors hover:border-accent hover:text-accent">
            + {t('tpl_add_role')}
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-full border border-line px-5 py-2 text-xs text-muted hover:text-ink">
              ✕
            </button>
            {template && (
              <button
                onClick={() => save(true)}
                disabled={!name.trim()}
                className="rounded-full border border-accent px-5 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
              >
                📋 {t('tpl_save_as_new')}
              </button>
            )}
            <button
              onClick={() => save(false)}
              disabled={!name.trim()}
              className="rounded-full bg-accent px-6 py-2 text-xs font-bold text-bg transition-colors hover:bg-accent-dim disabled:opacity-40"
            >
              💾 {t('set_save')}
            </button>
          </div>
          <p className="text-center text-[10px] text-muted/60">
            {lang === 'ar' ? 'التمبليت بيتحفظ خاص باستوديوك بس.' : 'Saved templates are private to this studio.'}
          </p>
        </div>
      </motion.div>
    </>
  );
}
