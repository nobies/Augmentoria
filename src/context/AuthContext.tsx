import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { DemoUser, Perm } from '../lib/rbac';
import { DEMO_USERS, effectivePerms } from '../lib/rbac';
import { actions, subscribeToState, getAppState } from '../lib/store';

const KEY = 'augmentoria-auth-user';

interface AuthCtx {
  user: DemoUser;
  isAuthenticated: boolean;
  can: (p: Perm) => boolean;
  loginAs: (id: string) => void;
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

  const user: DemoUser = useMemo(
    () =>
      stored
        ? {
            ...stored,
            name: liveMember?.name ?? stored.name,
            email: liveMember?.email ?? stored.email,
            title: liveMember?.title ?? stored.title,
            avatar: liveMember?.avatar ?? stored.avatar,
            roleId: liveMember?.roleId ?? stored.roleId,
            extraPerms: liveMember?.extraPerms ?? stored.extraPerms
          }
        : GUEST_USER,
    [stored, liveMember]
  );

  const perms = useMemo(
    () => (stored ? effectivePerms(user.roleId, user.extraPerms) : new Set<Perm>()),
    [stored, user.roleId, user.extraPerms]
  );

  useEffect(() => {
    if (stored) localStorage.setItem(KEY, JSON.stringify(stored));
    else localStorage.removeItem(KEY);
  }, [stored]);

  return (
    <Ctx.Provider
      value={{
        user,
        isAuthenticated: stored !== null,
        can: (p) => perms.has(p),
        loginAs: (id) => {
          const rec = state.members.find((m) => m.id === id);
          if (rec) {
            setStored({
              id: rec.id,
              name: rec.name,
              email: rec.email,
              roleId: rec.roleId,
              companyId: rec.companyId,
              title: rec.title,
              avatar: rec.avatar,
              extraPerms: rec.extraPerms ? [...rec.extraPerms] : undefined
            });
            return;
          }
          const found = DEMO_USERS.find((u) => u.id === id);
          if (found) setStored({ ...found });
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
