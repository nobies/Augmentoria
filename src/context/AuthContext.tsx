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
  getClientsByCompany,
  saveClient,
  getProjectsByCompany,
  saveProject,
  deleteProject as dbDeleteProject,
  getActivityLogsByCompany,
  logActivity,
  initTenantSeed,
  SEED_COMPANIES,
  SEED_USERS,
} from '@/lib/tenantStorage';

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
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  updateCompanyBranding: (branding: Partial<Company>) => Promise<void>;
  createNewCompany: (name: string, plan?: 'starter' | 'pro' | 'enterprise') => Promise<Company>;
  addProject: (data: Omit<Project, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  addClient: (data: Omit<Client, 'id' | 'companyId' | 'createdAt'>) => Promise<Client>;
  addTeamMember: (data: Omit<User, 'id' | 'companyId' | 'createdAt'>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [allCompanies, setAllCompanies] = useState<Company[]>(SEED_COMPANIES);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(SEED_COMPANIES[0]);
  const [companyUsers, setCompanyUsers] = useState<User[]>(
    SEED_USERS.filter(u => u.companyId === SEED_COMPANIES[0].id)
  );
  const [currentUser, setCurrentUser] = useState<User | null>(SEED_USERS[1]); // Default to Sarah Jenkins (Company Admin @ Vortex)
  const [companyClients, setCompanyClients] = useState<Client[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Initialize DB and load active workspace
  const loadWorkspace = async (targetCompanyId?: string, targetUserId?: string) => {
    setIsLoading(true);
    await initTenantSeed();
    const comps = await getAllCompanies();
    setAllCompanies(comps);

    const allUsers = await getAllUsers();

    // Check localStorage for persisted session
    let savedCompanyId = targetCompanyId;
    let savedUserId = targetUserId;
    if (typeof window !== 'undefined') {
      if (!savedCompanyId) savedCompanyId = localStorage.getItem('augmentoria_auth_company') || undefined;
      if (!savedUserId) savedUserId = localStorage.getItem('augmentoria_auth_user') || undefined;
    }

    // Resolve Active User accurately
    let activeUser: User | null = null;
    if (savedUserId) {
      activeUser = allUsers.find(u => u.id === savedUserId) || null;
    }
    if (!activeUser) {
      activeUser = allUsers.find(u => u.role === 'super_admin') || allUsers[0] || SEED_USERS[0];
    }
    setCurrentUser(activeUser);

    // Resolve Company based on user role
    let activeCompId = savedCompanyId;
    if (activeUser.role !== 'super_admin') {
      // Non-super-admins are strictly locked to their own company
      activeCompId = activeUser.companyId;
    } else {
      // Super admin can be in any selected company (default to saved or first company)
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
    setIsLoading(false);
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const lower = email.trim().toLowerCase();
    const allUsers = await getAllUsers();
    const user = allUsers.find(u => u.email.toLowerCase() === lower);

    if (!user) {
      setIsLoading(false);
      return { success: false, error: `No account registered with ${email}` };
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
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('augmentoria_auth_user');
      localStorage.removeItem('augmentoria_auth_company');
    }
    // Set to default guest or login
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
        deleteProject,
        addClient,
        addTeamMember,
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
