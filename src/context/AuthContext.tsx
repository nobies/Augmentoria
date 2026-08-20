'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Company,
  User,
  Client,
  Project,
  ActivityLog,
  UserRole,
} from '@/lib/types';
import {
  getAllCompanies,
  getCompanyById,
  saveCompany,
  getAllUsers,
  getUsersByCompany,
  saveUser,
  deleteUser as dbDeleteUser,
  getClientsByCompany,
  saveClient,
  updateClient as dbUpdateClient,
  deleteClient as dbDeleteClient,
  getProjectsByCompany,
  saveProject,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  getActivityLogsByCompany,
  logActivity,
  initTenantSeed,
  SEED_COMPANIES,
  SEED_USERS,
} from '@/lib/tenantStorage';
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client';

interface AuthContextType {
  currentUser: User | null;
  currentCompany: Company | null;
  allCompanies: Company[];
  availableCompanies: Company[];
  companyUsers: User[];
  companyClients: Client[];
  companyProjects: Project[];
  activityLogs: ActivityLog[];
  isLoading: boolean;

  // Role & Permission Checks
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  isAccountManager: boolean;
  isCreative: boolean;
  isClient: boolean;
  canManageCompany: boolean;
  canManageProjects: boolean;
  canCreateReview: boolean;
  canSwitchCompany: boolean;

  // Actions
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  updateCompanyBranding: (branding: Partial<Company>) => Promise<void>;
  createNewCompany: (name: string, plan?: 'starter' | 'pro' | 'enterprise') => Promise<Company>;
  addProject: (data: Omit<Project, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (projectId: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addClient: (data: Omit<Client, 'id' | 'companyId' | 'createdAt'>) => Promise<Client>;
  updateClient: (clientId: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  addTeamMember: (data: Omit<User, 'id' | 'companyId' | 'createdAt'>) => Promise<User>;
  deleteTeamMember: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const [isLoading, setIsLoading] = useState(false);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [companyClients, setCompanyClients] = useState<Client[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Initialize DB and load active workspace
  const loadWorkspace = async (targetCompanyId?: string, targetUserId?: string) => {
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();

    // 1. Production Flow: Server-Authoritative Supabase Auth Session
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Query profile & company memberships from Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        const { data: membership } = await supabase
          .from('company_memberships')
          .select('*, companies(*)')
          .eq('user_id', authUser.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (membership && membership.companies) {
          const userComp: Company = {
            id: membership.companies.id,
            name: membership.companies.name,
            slug: membership.companies.slug,
            plan: membership.companies.plan || 'starter',
            brandPrimary: membership.companies.brand_primary || '#3b82f6',
            brandSecondary: membership.companies.brand_secondary || '#10b981',
            logoUrl: membership.companies.logo_url || '',
            createdAt: membership.companies.created_at,
          };
          const cloudUser: User = {
            id: authUser.id,
            companyId: userComp.id,
            name: profile?.display_name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email || '',
            role: membership.role || 'creative',
            avatarUrl: profile?.avatar_url || '',
            createdAt: authUser.created_at,
          };
          setCurrentUser(cloudUser);
          setCurrentCompany(userComp);
          setAllCompanies([userComp]);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Supabase Auth Session check skipped/error:', e);
    }

    // 2. Demo Sandbox Mode (Explicitly gated behind NEXT_PUBLIC_DEMO_MODE=true)
    if (isDemoMode) {
      await initTenantSeed();
      const comps = await getAllCompanies();
      setAllCompanies(comps);

      const allUsers = await getAllUsers();
      let savedCompanyId = targetCompanyId;
      let savedUserId = targetUserId;
      if (typeof window !== 'undefined') {
        if (!savedCompanyId) savedCompanyId = localStorage.getItem('augmentoria_auth_company') || undefined;
        if (!savedUserId) savedUserId = localStorage.getItem('augmentoria_auth_user') || undefined;
      }

      let activeUser: User | null = null;
      if (savedUserId) {
        activeUser = allUsers.find(u => u.id === savedUserId) || null;
      }
      if (!activeUser) {
        activeUser = allUsers.find(u => u.role === 'super_admin') || allUsers[0] || SEED_USERS[0];
      }
      setCurrentUser(activeUser);

      let activeCompId = savedCompanyId;
      if (activeUser.role !== 'super_admin') {
        activeCompId = activeUser.companyId;
      } else {
        if (!activeCompId) {
          activeCompId = comps[0]?.id || 'comp_vortex';
        }
      }

      const activeComp = comps.find(c => c.id === activeCompId) || comps[0];
      setCurrentCompany(activeComp || null);

      if (activeComp) {
        const users = await getUsersByCompany(activeComp.id);
        setCompanyUsers(users);

        const clients = await getClientsByCompany(activeComp.id);
        setCompanyClients(clients);

        const projs = await getProjectsByCompany(activeComp.id);
        setCompanyProjects(projs);

        const logs = await getActivityLogsByCompany(activeComp.id);
        setActivityLogs(logs);
      }
    } else {
      // In Production without active auth session: reset state
      setCurrentUser(null);
      setCurrentCompany(null);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadWorkspace();

    const supabase = createSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        loadWorkspace();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();
    const lower = email.trim().toLowerCase();

    // 1. Supabase Cloud Authentication
    if (password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: lower,
          password: password,
        });
        if (data?.user && !error) {
          await loadWorkspace();
          setIsLoading(false);
          return { success: true };
        }
        if (error) {
          if (!isDemoMode) {
            setIsLoading(false);
            return { success: false, error: error.message };
          }
        }
      } catch (e: any) {
        if (!isDemoMode) {
          setIsLoading(false);
          return { success: false, error: e?.message || 'Authentication error' };
        }
      }
    }

    // 2. Demo Sandbox Fallback (Only if NEXT_PUBLIC_DEMO_MODE=true)
    if (isDemoMode) {
      const allUsers = await getAllUsers();
      const user = allUsers.find(u => u.email.toLowerCase() === lower);

      if (!user) {
        setIsLoading(false);
        return { success: false, error: `No demo account registered with ${email}` };
      }

      const comps = await getAllCompanies();
      const userCompany = comps.find(c => c.id === user.companyId) || comps[0];

      if (typeof window !== 'undefined') {
        localStorage.setItem('augmentoria_auth_user', user.id);
        localStorage.setItem('augmentoria_auth_company', userCompany.id);
      }

      setCurrentUser(user);
      setCurrentCompany(userCompany);

      const users = await getUsersByCompany(userCompany.id);
      setCompanyUsers(users);
      const clients = await getClientsByCompany(userCompany.id);
      setCompanyClients(clients);
      const projs = await getProjectsByCompany(userCompany.id);
      setCompanyProjects(projs);
      const logs = await getActivityLogsByCompany(userCompany.id);
      setActivityLogs(logs);

      setIsLoading(false);
      return { success: true };
    }

    setIsLoading(false);
    return { success: false, error: 'Password is required to sign in.' };
  };

  const logout = async () => {
    const supabase = createSupabaseBrowserClient();
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('augmentoria_auth_user');
      localStorage.removeItem('augmentoria_auth_company');
    }
    setCurrentUser(null);
    setCurrentCompany(null);
    window.location.href = '/login';
  };

  const refreshData = async () => {
    if (!currentCompany) return;
    const comps = await getAllCompanies();
    setAllCompanies(comps);
    const users = await getUsersByCompany(currentCompany.id);
    setCompanyUsers(users);
    const clients = await getClientsByCompany(currentCompany.id);
    setCompanyClients(clients);
    const projs = await getProjectsByCompany(currentCompany.id);
    setCompanyProjects(projs);
    const logs = await getActivityLogsByCompany(currentCompany.id);
    setActivityLogs(logs);
  };

  const switchCompany = async (companyId: string) => {
    // Super admins can switch anywhere; others are isolated to their own company
    if (currentUser?.role !== 'super_admin' && currentUser?.companyId !== companyId) {
      console.warn('Unauthorized company switch attempted for tenant:', companyId);
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('augmentoria_auth_company', companyId);
    }
    await loadWorkspace(companyId);
  };

  const switchUser = async (userId: string) => {
    const allU = await getAllUsers();
    const user = allU.find(u => u.id === userId);
    if (user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('augmentoria_auth_user', user.id);
        localStorage.setItem('augmentoria_auth_company', user.companyId);
      }
      await loadWorkspace(user.companyId, user.id);
    }
  };

  const updateCompanyBranding = async (branding: Partial<Company>) => {
    if (!currentCompany) return;
    const updated: Company = { ...currentCompany, ...branding };
    await saveCompany(updated);
    setCurrentCompany(updated);
    setAllCompanies(prev => prev.map(c => (c.id === updated.id ? updated : c)));

    if (currentUser) {
      await logActivity({
        companyId: currentCompany.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'Updated Studio Branding',
        details: `Updated branding colors & studio name to "${updated.name}"`,
      });
    }
    await refreshData();
  };

  const createNewCompany = async (name: string, plan: 'starter' | 'pro' | 'enterprise' = 'pro') => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newCompany: Company = {
      id: `comp_${Date.now()}`,
      name,
      slug,
      brandPrimary: '#3b82f6',
      brandSecondary: '#10b981',
      plan,
      createdAt: new Date().toISOString(),
    };
    await saveCompany(newCompany);

    const initialAdmin: User = {
      id: `user_admin_${Date.now()}`,
      companyId: newCompany.id,
      name: `${name} Admin`,
      email: `admin@${slug}.com`,
      role: 'company_admin',
      title: 'Studio Administrator',
      createdAt: new Date().toISOString(),
    };
    await saveUser(initialAdmin);

    await loadWorkspace(newCompany.id, initialAdmin.id);
    return newCompany;
  };

  const addProject = async (data: Omit<Project, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => {
    if (!currentCompany || !currentUser) throw new Error('No active company');
    const newProj: Project = {
      ...data,
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      companyId: currentCompany.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProject(newProj);
    setCompanyProjects(prev => [newProj, ...prev]);

    await logActivity({
      companyId: currentCompany.id,
      projectId: newProj.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'Created Project',
      details: `Created new project "${newProj.name}" (${newProj.fps} fps)`,
    });
    await refreshData();
    return newProj;
  };

  const deleteProject = async (projectId: string) => {
    if (!currentCompany) return;
    await dbDeleteProject(projectId);
    setCompanyProjects(prev => prev.filter(p => p.id !== projectId));
    if (currentUser) {
      await logActivity({
        companyId: currentCompany.id,
        projectId,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'Deleted Project',
        details: `Deleted project ${projectId}`,
      });
    }
    await refreshData();
  };

  const updateProject = async (projectId: string, data: Partial<Project>) => {
    if (!currentCompany) return;
    const updated = await dbUpdateProject(projectId, data);
    if (updated) {
      setCompanyProjects(prev => prev.map(p => (p.id === projectId ? updated : p)));
      if (currentUser) {
        await logActivity({
          companyId: currentCompany.id,
          projectId,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'Updated Project Settings',
          details: `Updated project "${updated.name}" settings`,
        });
      }
      await refreshData();
    }
  };

  const addClient = async (data: Omit<Client, 'id' | 'companyId' | 'createdAt'>) => {
    if (!currentCompany || !currentUser) throw new Error('No active company');
    const newClient: Client = {
      ...data,
      id: `client_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      companyId: currentCompany.id,
      createdAt: new Date().toISOString(),
    };
    await saveClient(newClient);
    setCompanyClients(prev => [...prev, newClient]);

    await logActivity({
      companyId: currentCompany.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'Added Client',
      details: `Registered client "${newClient.name}" (${newClient.companyName})`,
    });
    await refreshData();
    return newClient;
  };

  const updateClient = async (clientId: string, data: Partial<Client>) => {
    if (!currentCompany) return;
    const updated = await dbUpdateClient(clientId, data);
    if (updated) {
      setCompanyClients(prev => prev.map(c => (c.id === clientId ? updated : c)));
      if (currentUser) {
        await logActivity({
          companyId: currentCompany.id,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'Updated Client Profile',
          details: `Updated client "${updated.name}" branding & profile`,
        });
      }
      await refreshData();
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!currentCompany) return;
    await dbDeleteClient(clientId);
    setCompanyClients(prev => prev.filter(c => c.id !== clientId));
    if (currentUser) {
      await logActivity({
        companyId: currentCompany.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'Deleted Client',
        details: `Deleted client ${clientId}`,
      });
    }
    await refreshData();
  };

  const addTeamMember = async (data: Omit<User, 'id' | 'companyId' | 'createdAt'>) => {
    if (!currentCompany || !currentUser) throw new Error('No active company');
    const newUser: User = {
      ...data,
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      companyId: currentCompany.id,
      createdAt: new Date().toISOString(),
    };
    await saveUser(newUser);
    setCompanyUsers(prev => [...prev, newUser]);

    await logActivity({
      companyId: currentCompany.id,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'Invited Team Member',
      details: `Added ${newUser.name} with role "${newUser.role}"`,
    });
    await refreshData();
    return newUser;
  };

  const deleteTeamMember = async (userId: string) => {
    if (!currentCompany) return;
    await dbDeleteUser(userId);
    setCompanyUsers(prev => prev.filter(u => u.id !== userId));
    if (currentUser) {
      await logActivity({
        companyId: currentCompany.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'Removed Team Member',
        details: `Removed user ${userId}`,
      });
    }
    await refreshData();
  };

  // Role checks
  const role = currentUser?.role || 'guest';
  const isSuperAdmin = role === 'super_admin';
  const isCompanyAdmin = role === 'company_admin' || isSuperAdmin;
  const isAccountManager = role === 'account_manager' || isCompanyAdmin;
  const isCreative = role === 'creative' || isAccountManager;
  const isClient = role === 'client_reviewer';

  const canManageCompany = isCompanyAdmin;
  const canManageProjects = isAccountManager;
  const canCreateReview = isCreative;
  const canSwitchCompany = isSuperAdmin;

  // Strict tenant isolation: Non-super-admins only see their own company
  const availableCompanies = isSuperAdmin
    ? allCompanies
    : currentCompany
    ? [currentCompany]
    : [];

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentCompany,
        allCompanies,
        availableCompanies,
        companyUsers,
        companyClients,
        companyProjects,
        activityLogs,
        isLoading,
        isSuperAdmin,
        isCompanyAdmin,
        isAccountManager,
        isCreative,
        isClient,
        canManageCompany,
        canManageProjects,
        canCreateReview,
        canSwitchCompany,
        login,
        logout,
        switchUser,
        switchCompany,
        refreshData,
        updateCompanyBranding,
        createNewCompany,
        addProject,
        updateProject,
        deleteProject,
        addClient,
        updateClient,
        deleteClient,
        addTeamMember,
        deleteTeamMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
