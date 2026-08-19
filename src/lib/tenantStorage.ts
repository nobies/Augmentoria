import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Company,
  User,
  Client,
  Project,
  Asset,
  AssetVersion,
  ReviewSession,
  ActivityLog,
} from './types';

interface TenantDB extends DBSchema {
  companies: {
    key: string;
    value: Company;
  };
  users: {
    key: string;
    value: User;
    indexes: { 'by-company': string };
  };
  clients: {
    key: string;
    value: Client;
    indexes: { 'by-company': string };
  };
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-company': string; 'by-client': string };
  };
  assets: {
    key: string;
    value: Asset;
    indexes: { 'by-project': string; 'by-company': string };
  };
  assetVersions: {
    key: string;
    value: AssetVersion;
    indexes: { 'by-asset': string; 'by-project': string };
  };
  reviewSessions: {
    key: string;
    value: ReviewSession;
    indexes: { 'by-project': string; 'by-company': string };
  };
  activityLogs: {
    key: string;
    value: ActivityLog;
    indexes: { 'by-company': string; 'by-project': string };
  };
}

const DB_NAME = 'postflow_saas_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TenantDB>> | null = null;

// Initial Seed Data for Multi-Tenancy Demo
const SEED_COMPANIES: Company[] = [
  {
    id: 'comp_vortex',
    name: 'Vortex Post Studios',
    slug: 'vortex',
    tagline: 'High-End Commercial & VFX Post-Production',
    brandPrimary: '#3b82f6',
    brandSecondary: '#10b981',
    plan: 'pro',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'comp_cineflow',
    name: 'CineFlow Media House',
    slug: 'cineflow',
    tagline: 'Broadcast Television & Documentary Suite',
    brandPrimary: '#8b5cf6',
    brandSecondary: '#ec4899',
    plan: 'enterprise',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
];

const SEED_USERS: User[] = [
  {
    id: 'user_sarah',
    companyId: 'comp_vortex',
    name: 'Sarah Jenkins',
    email: 'sarah@vortexpost.com',
    role: 'company_admin',
    title: 'Managing Director & Partner',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_david',
    companyId: 'comp_vortex',
    name: 'David Miller',
    email: 'david@vortexpost.com',
    role: 'account_manager',
    title: 'Executive Producer',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_leo',
    companyId: 'comp_vortex',
    name: 'Leo Vance',
    email: 'leo@vortexpost.com',
    role: 'creative',
    title: 'Senior Colorist & Editor',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_client_ahmed',
    companyId: 'comp_vortex',
    name: 'Ahmed Rashed (Client)',
    email: 'ahmed@redbullmedia.com',
    role: 'client_reviewer',
    title: 'Brand Marketing Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  // CineFlow User
  {
    id: 'user_alex',
    companyId: 'comp_cineflow',
    name: 'Alex Mercer',
    email: 'alex@cineflowmedia.com',
    role: 'company_admin',
    title: 'Studio Head',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
];

const SEED_CLIENTS: Client[] = [
  {
    id: 'client_redbull',
    companyId: 'comp_vortex',
    name: 'Red Bull Media House',
    companyName: 'Red Bull GmbH',
    email: 'production@redbullmedia.com',
    phone: '+43 662 6582 0',
    notes: 'Primary contact: Ahmed Rashed. Strict 4K Rec.709 color requirements.',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'client_nike',
    companyId: 'comp_vortex',
    name: 'Nike Global Running',
    companyName: 'Nike Inc.',
    email: 'campaigns@nike.com',
    phone: '+1 503 671 6453',
    notes: 'Seasonal campaign delivery. Needs vertical 9:16 cuts and 16:9 hero exports.',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'client_spotify',
    companyId: 'comp_cineflow',
    name: 'Spotify Studios',
    companyName: 'Spotify AB',
    email: 'video@spotify.com',
    phone: '+46 8 501 645 00',
    notes: 'Exclusive artist sessions and teaser packages.',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

const SEED_PROJECTS: Project[] = [
  {
    id: 'proj_cliff_diving',
    companyId: 'comp_vortex',
    clientId: 'client_redbull',
    name: 'Red Bull Cliff Diving — Series Promo',
    description: 'High-energy 60s broadcast commercial and social cuts for the 2026 championship.',
    fps: 25,
    dropFrame: false,
    startTimecode: '01:00:00:00',
    status: 'client_review',
    primaryColor: '#ef4444',
    assignedUserIds: ['user_sarah', 'user_david', 'user_leo'],
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj_nike_air',
    companyId: 'comp_vortex',
    clientId: 'client_nike',
    name: 'Nike Air Max 2026 — Velocity Launch',
    description: 'Global flagship product reveal featuring dynamic VFX transitions and sound design.',
    fps: 24,
    dropFrame: false,
    startTimecode: '01:00:00:00',
    status: 'internal_review',
    primaryColor: '#3b82f6',
    assignedUserIds: ['user_david', 'user_leo'],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj_spotify_teaser',
    companyId: 'comp_cineflow',
    clientId: 'client_spotify',
    name: 'Spotify Wrapped 2026 — Creator Spotlight',
    description: 'Mini-documentary series celebrating breakthrough international artists.',
    fps: 25,
    dropFrame: false,
    startTimecode: '01:00:00:00',
    status: 'approved',
    primaryColor: '#10b981',
    assignedUserIds: ['user_alex'],
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_LOGS: ActivityLog[] = [
  {
    id: 'log_1',
    companyId: 'comp_vortex',
    projectId: 'proj_cliff_diving',
    userId: 'user_david',
    userName: 'David Miller',
    userRole: 'account_manager',
    action: 'Created Review Session',
    details: 'Initiated "Cut 2 — Client Screener" with 3 video playlist items',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'log_2',
    companyId: 'comp_vortex',
    projectId: 'proj_cliff_diving',
    userId: 'user_leo',
    userName: 'Leo Vance',
    userRole: 'creative',
    action: 'Uploaded New Cut',
    details: 'Applied "Teal & Orange" grade proposal to scene 4',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'log_3',
    companyId: 'comp_vortex',
    projectId: 'proj_nike_air',
    userId: 'user_sarah',
    userName: 'Sarah Jenkins',
    userRole: 'company_admin',
    action: 'Project Initialized',
    details: 'Created project and assigned creative leads',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

export function getTenantDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<TenantDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('companies')) {
          db.createObjectStore('companies', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('by-company', 'companyId');
        }
        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientStore.createIndex('by-company', 'companyId');
        }
        if (!db.objectStoreNames.contains('projects')) {
          const projStore = db.createObjectStore('projects', { keyPath: 'id' });
          projStore.createIndex('by-company', 'companyId');
          projStore.createIndex('by-client', 'clientId');
        }
        if (!db.objectStoreNames.contains('assets')) {
          const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
          assetStore.createIndex('by-project', 'projectId');
          assetStore.createIndex('by-company', 'companyId');
        }
        if (!db.objectStoreNames.contains('assetVersions')) {
          const versionStore = db.createObjectStore('assetVersions', { keyPath: 'id' });
          versionStore.createIndex('by-asset', 'assetId');
          versionStore.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('reviewSessions')) {
          const sessionStore = db.createObjectStore('reviewSessions', { keyPath: 'id' });
          sessionStore.createIndex('by-project', 'projectId');
          sessionStore.createIndex('by-company', 'companyId');
        }
        if (!db.objectStoreNames.contains('activityLogs')) {
          const logStore = db.createObjectStore('activityLogs', { keyPath: 'id' });
          logStore.createIndex('by-company', 'companyId');
          logStore.createIndex('by-project', 'projectId');
        }
      },
    });
  }
  return dbPromise;
}

// ----------------------------------------------------
// SEED INITIALIZER
// ----------------------------------------------------
export async function initTenantSeed(): Promise<void> {
  const db = await getTenantDB();
  if (!db) return;

  const existingCompanies = await db.getAll('companies');
  if (existingCompanies.length === 0) {
    for (const c of SEED_COMPANIES) await db.put('companies', c);
    for (const u of SEED_USERS) await db.put('users', u);
    for (const cl of SEED_CLIENTS) await db.put('clients', cl);
    for (const p of SEED_PROJECTS) await db.put('projects', p);
    for (const l of SEED_LOGS) await db.put('activityLogs', l);
  }
}

// ----------------------------------------------------
// COMPANIES (TENANTS)
// ----------------------------------------------------
export async function getAllCompanies(): Promise<Company[]> {
  const db = await getTenantDB();
  if (!db) return SEED_COMPANIES;
  await initTenantSeed();
  const all = await db.getAll('companies');
  return all.length > 0 ? all : SEED_COMPANIES;
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const db = await getTenantDB();
  if (!db) return SEED_COMPANIES.find(c => c.id === id) || null;
  const c = await db.get('companies', id);
  return c || SEED_COMPANIES.find(comp => comp.id === id) || null;
}

export async function saveCompany(company: Company): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('companies', company);
}

// ----------------------------------------------------
// USERS & MEMBERS
// ----------------------------------------------------
export async function getUsersByCompany(companyId: string): Promise<User[]> {
  const db = await getTenantDB();
  if (!db) return SEED_USERS.filter(u => u.companyId === companyId);
  await initTenantSeed();
  const users = await db.getAllFromIndex('users', 'by-company', companyId);
  return users.length > 0 ? users : SEED_USERS.filter(u => u.companyId === companyId);
}

export async function saveUser(user: User): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('users', user);
}

export async function deleteUser(userId: string): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.delete('users', userId);
}

// ----------------------------------------------------
// CLIENTS (CRM)
// ----------------------------------------------------
export async function getClientsByCompany(companyId: string): Promise<Client[]> {
  const db = await getTenantDB();
  if (!db) return SEED_CLIENTS.filter(c => c.companyId === companyId);
  await initTenantSeed();
  const clients = await db.getAllFromIndex('clients', 'by-company', companyId);
  return clients.length > 0 ? clients : SEED_CLIENTS.filter(c => c.companyId === companyId);
}

export async function saveClient(client: Client): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('clients', client);
}

export async function deleteClient(clientId: string): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.delete('clients', clientId);
}

// ----------------------------------------------------
// PROJECTS
// ----------------------------------------------------
export async function getProjectsByCompany(companyId: string): Promise<Project[]> {
  const db = await getTenantDB();
  if (!db) return SEED_PROJECTS.filter(p => p.companyId === companyId);
  await initTenantSeed();
  const projects = await db.getAllFromIndex('projects', 'by-company', companyId);
  return (projects.length > 0 ? projects : SEED_PROJECTS.filter(p => p.companyId === companyId)).sort(
    (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const db = await getTenantDB();
  if (!db) return SEED_PROJECTS.find(p => p.id === projectId) || null;
  const p = await db.get('projects', projectId);
  return p || SEED_PROJECTS.find(proj => proj.id === projectId) || null;
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('projects', project);
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.delete('projects', projectId);
}

// ----------------------------------------------------
// ACTIVITY LOGS
// ----------------------------------------------------
export async function getActivityLogsByCompany(companyId: string): Promise<ActivityLog[]> {
  const db = await getTenantDB();
  if (!db) return SEED_LOGS.filter(l => l.companyId === companyId);
  await initTenantSeed();
  const logs = await db.getAllFromIndex('activityLogs', 'by-company', companyId);
  return (logs.length > 0 ? logs : SEED_LOGS.filter(l => l.companyId === companyId)).sort(
    (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

export async function logActivity(log: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<void> {
  const db = await getTenantDB();
  const newLog: ActivityLog = {
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  if (db) await db.put('activityLogs', newLog);
}
