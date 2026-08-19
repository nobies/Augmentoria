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

  // Actions
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
  const [currentUser, setCurrentUser] = useState<User | null>(SEED_USERS[0]);
  const [companyClients, setCompanyClients] = useState<Client[]>([]);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Initialize DB and load active workspace
  const loadWorkspace = async (targetCompanyId?: string, targetUserId?: string) => {
    setIsLoading(true);
    await initTenantSeed();
    const comps = await getAllCompanies();
    setAllCompanies(comps);

    const activeComp = targetCompanyId
      ? comps.find(c => c.id === targetCompanyId) || comps[0]
      : comps[0];
    setCurrentCompany(activeComp || null);

    if (activeComp) {
      const users = await getUsersByCompany(activeComp.id);
      setCompanyUsers(users);

      const activeUser = targetUserId
        ? users.find(u => u.id === targetUserId) || users[0]
        : users[0];
      setCurrentUser(activeUser || null);

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
    await loadWorkspace(companyId);
  };

  const switchUser = async (userId: string) => {
    const user = companyUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
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

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentCompany,
        allCompanies,
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
