import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { DemoUser, Perm } from '../lib/rbac';
import { DEMO_USERS } from '../lib/rbac';
import { actions, memberEffectivePerms, subscribeToState, getAppState } from '../lib/store';

const KEY = 'augmentoria-auth-user';

interface AuthCtx {
  user: DemoUser;
  isAuthenticated: boolean;
  can: (p: Perm) => boolean;
  loginAs: (id: string) => boolean;
  updateProfile: (patch: Partial<Pick<DemoUser, 'name' | 'email' | 'title' | 'avatar'>>) => void;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

const GUEST_USER: DemoUser = {
  id: 'guest',
  name: 'Guest Reviewer',
  email: '',
  roleId: 'client',
  companyId: ''
};

function loadStored(): DemoUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoUser;
      if (parsed?.id && DEMO_USERS.some((d) => d.roleId === parsed.roleId)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<DemoUser | null>(loadStored);
  const state = useSyncExternalStore(subscribeToState, getAppState);

  const liveMember = useMemo(
    () => state.members.find((m) => m.id === stored?.id),
    [state, stored?.id]
  );

  const company = useMemo(
    () => state.companies.find((c) => c.id === liveMember?.companyId),
    [state, liveMember?.companyId]
  );

  const sessionValid =
    stored !== null &&
    liveMember !== undefined &&
    liveMember.status === 'active' &&
    (company?.status ?? 'active') === 'active';

  const user: DemoUser = useMemo(
    () =>
      stored && sessionValid
        ? {
            ...stored,
            name: liveMember?.name ?? stored.name,
            email: liveMember?.email ?? stored.email,
            title: liveMember?.title ?? stored.title,
            avatar: liveMember?.avatar ?? stored.avatar,
            roleId: liveMember?.roleId ?? stored.roleId,
            accountType: liveMember?.accountType ?? stored.accountType ?? (liveMember?.roleId === 'client' ? 'client' : 'internal'),
            extraPerms: liveMember?.extraPerms ?? stored.extraPerms
          }
        : GUEST_USER,
    [stored, sessionValid, liveMember]
  );

  const perms = useMemo(
    () => (stored && sessionValid && liveMember ? memberEffectivePerms(liveMember, state.customRoles) : new Set<Perm>()),
    [stored, sessionValid, liveMember, state.customRoles]
  );

  useEffect(() => {
    try {
      if (stored) localStorage.setItem(KEY, JSON.stringify(stored));
      else localStorage.removeItem(KEY);
    } catch {
      // Authentication remains in memory when browser storage is unavailable.
    }
  }, [stored]);

  return (
    <Ctx.Provider
      value={{
        user,
        isAuthenticated: stored !== null && sessionValid,
        can: (p) => perms.has(p),
        loginAs: (id) => {
          const rec = state.members.find((m) => m.id === id);
          const recCompany = rec ? state.companies.find((c) => c.id === rec.companyId) : undefined;
          if (rec && rec.status === 'active' && (recCompany?.status ?? 'active') === 'active') {
            setStored({
              id: rec.id,
              name: rec.name,
              email: rec.email,
              roleId: rec.roleId,
              companyId: rec.companyId,
              accountType: rec.accountType ?? (rec.roleId === 'client' ? 'client' : 'internal'),
              title: rec.title,
              avatar: rec.avatar,
              extraPerms: rec.extraPerms ? [...rec.extraPerms] : undefined
            });
            return true;
          }
          if (rec) return false;
          const found = DEMO_USERS.find((u) => u.id === id);
          const stillActive = found
            ? state.members.some((m) => {
                if (m.id !== found.id || m.status !== 'active') return false;
                const co = state.companies.find((c) => c.id === m.companyId);
                return (co?.status ?? 'active') === 'active';
              })
            : false;
          if (found && stillActive) {
            setStored({ ...found });
            return true;
          }
          return false;
        },
        updateProfile: (patch) => {
          if (!stored) return;
          setStored((u) => (u ? { ...u, ...patch } : u));
          actions.updateMemberProfile(user.id, patch);
        },
        logout: () => {
          setStored(null);
        }
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
