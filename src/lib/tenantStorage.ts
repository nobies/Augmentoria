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
const DB_VERSION = 2; // Incremented for 10-company multi-tenant seed

let dbPromise: Promise<IDBPDatabase<TenantDB>> | null = null;

// ----------------------------------------------------
// 10 DIVERSE STUDIOS / TENANTS
// ----------------------------------------------------
export const SEED_COMPANIES: Company[] = [
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
  {
    id: 'comp_neon',
    name: 'Neon Horizon VFX',
    slug: 'neon-horizon',
    tagline: 'Feature Film CGI, Creatures & Dynamic FX',
    brandPrimary: '#ec4899',
    brandSecondary: '#f43f5e',
    plan: 'enterprise',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'comp_pulse',
    name: 'Pulse Creative Agency',
    slug: 'pulse-creative',
    tagline: 'Social-First Video Ads & Viral Campaigns',
    brandPrimary: '#f59e0b',
    brandSecondary: '#fbbf24',
    plan: 'starter',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'comp_mirage',
    name: 'Mirage Animation Studio',
    slug: 'mirage-animation',
    tagline: '3D Character Animation & Motion Graphics',
    brandPrimary: '#10b981',
    brandSecondary: '#059669',
    plan: 'pro',
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'comp_soundwave',
    name: 'SoundWave Post Audio',
    slug: 'soundwave',
    tagline: 'Dolby Atmos Mastering & Cinematic Sound Design',
    brandPrimary: '#06b6d4',
    brandSecondary: '#0891b2',
    plan: 'pro',
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    id: 'comp_blackbox',
    name: 'BlackBox Documentaries',
    slug: 'blackbox-docs',
    tagline: 'Investigative Journalism & Festival Films',
    brandPrimary: '#64748b',
    brandSecondary: '#475569',
    plan: 'starter',
    createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
  },
  {
    id: 'comp_apex',
    name: 'Apex Esports Broadcast',
    slug: 'apex-esports',
    tagline: 'Live Gaming Production & Tournament Highlights',
    brandPrimary: '#ef4444',
    brandSecondary: '#dc2626',
    plan: 'enterprise',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'comp_silk',
    name: 'Silk & Stone Luxury Media',
    slug: 'silk-stone',
    tagline: 'Fashion, Haute Horlogerie & Architectural Cinema',
    brandPrimary: '#d946ef',
    brandSecondary: '#c026d3',
    plan: 'pro',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'comp_skyline',
    name: 'Skyline Aerial Cinema',
    slug: 'skyline-aerial',
    tagline: 'Heavy-Lift FPV Drone & Nature Cinematography',
    brandPrimary: '#14b8a6',
    brandSecondary: '#0d9488',
    plan: 'starter',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

// ----------------------------------------------------
// 22+ DIVERSE USERS WITH DIFFERENT ROLES & PERMISSIONS
// ----------------------------------------------------
export const SEED_USERS: User[] = [
  // --- Platform Super Admin (Can switch between all 10 studios) ---
  {
    id: 'user_super_admin',
    companyId: 'comp_vortex',
    name: 'Adam Vance (Super Admin)',
    email: 'admin@augmentoria.io',
    role: 'super_admin',
    title: 'Platform Infrastructure Super Admin',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- Vortex Post Studios ---
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
    title: 'Lead Colorist & Senior Editor',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_maya',
    companyId: 'comp_vortex',
    name: 'Maya Lin',
    email: 'maya@vortexpost.com',
    role: 'creative',
    title: 'VFX Compositor',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_client_ahmed',
    companyId: 'comp_vortex',
    name: 'Ahmed Rashed (Client)',
    email: 'ahmed@redbullmedia.com',
    role: 'client_reviewer',
    title: 'Brand Marketing Director @ Red Bull',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- CineFlow Media House ---
  {
    id: 'user_alex',
    companyId: 'comp_cineflow',
    name: 'Alex Mercer',
    email: 'alex@cineflowmedia.com',
    role: 'company_admin',
    title: 'Head of Production',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_elena',
    companyId: 'comp_cineflow',
    name: 'Elena Rostova',
    email: 'elena@cineflowmedia.com',
    role: 'creative',
    title: 'Documentary Supervising Editor',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_tariq',
    companyId: 'comp_cineflow',
    name: 'Tariq Mansour',
    email: 'tariq@cineflowmedia.com',
    role: 'account_manager',
    title: 'Broadcast Delivery Producer',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- Neon Horizon VFX ---
  {
    id: 'user_marcus',
    companyId: 'comp_neon',
    name: 'Marcus Sterling',
    email: 'marcus@neonvfx.com',
    role: 'company_admin',
    title: 'VFX Supervisor & CTO',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_chloe',
    companyId: 'comp_neon',
    name: 'Chloe Dubois',
    email: 'chloe@neonvfx.com',
    role: 'creative',
    title: 'CG Lead & Houdini Artist',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- Pulse Creative Agency ---
  {
    id: 'user_jake',
    companyId: 'comp_pulse',
    name: 'Jake Taylor',
    email: 'jake@pulseagency.com',
    role: 'company_admin',
    title: 'Creative Director',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_samira',
    companyId: 'comp_pulse',
    name: 'Samira Khan',
    email: 'samira@pulseagency.com',
    role: 'account_manager',
    title: 'Growth Marketing Producer',
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- Mirage Animation Studio ---
  {
    id: 'user_kenji',
    companyId: 'comp_mirage',
    name: 'Kenji Sato',
    email: 'kenji@miragestudio.jp',
    role: 'company_admin',
    title: 'Animation Director',
    avatarUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_claire',
    companyId: 'comp_mirage',
    name: 'Claire Fontaine',
    email: 'claire@miragestudio.jp',
    role: 'creative',
    title: 'Lead Motion Designer',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- SoundWave Post Audio ---
  {
    id: 'user_liam',
    companyId: 'comp_soundwave',
    name: 'Liam O’Connor',
    email: 'liam@soundwavepost.com',
    role: 'company_admin',
    title: 'Supervising Sound Editor (MPSE)',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_nina',
    companyId: 'comp_soundwave',
    name: 'Nina Patel',
    email: 'nina@soundwavepost.com',
    role: 'creative',
    title: 'Re-recording Mixer',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- BlackBox Documentaries ---
  {
    id: 'user_henrik',
    companyId: 'comp_blackbox',
    name: 'Henrik Lindqvist',
    email: 'henrik@blackboxdocs.no',
    role: 'company_admin',
    title: 'Documentary Filmmaker & Producer',
    avatarUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- Apex Esports Production ---
  {
    id: 'user_jin',
    companyId: 'comp_apex',
    name: 'Jin-Woo Park',
    email: 'jin@apexesports.tv',
    role: 'company_admin',
    title: 'Broadcast Technical Director',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_victoria',
    companyId: 'comp_apex',
    name: 'Victoria Vance',
    email: 'victoria@apexesports.tv',
    role: 'account_manager',
    title: 'Tournament Operations Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- Silk & Stone Luxury Media ---
  {
    id: 'user_giovanni',
    companyId: 'comp_silk',
    name: 'Giovanni Rossi',
    email: 'giovanni@silkcimena.it',
    role: 'company_admin',
    title: 'Fashion Film Director',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },

  // --- Skyline Aerial Cinema ---
  {
    id: 'user_erik',
    companyId: 'comp_skyline',
    name: 'Erik Olsen',
    email: 'erik@skylineaerial.ca',
    role: 'company_admin',
    title: 'Chief Drone Pilot & DP',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
];

// ----------------------------------------------------
// CLIENTS ACROSS STUDIOS
// ----------------------------------------------------
const SEED_CLIENTS: Client[] = [
  {
    id: 'client_redbull',
    companyId: 'comp_vortex',
    name: 'Red Bull Media House',
    companyName: 'Red Bull GmbH',
    email: 'production@redbullmedia.com',
    phone: '+43 662 6582 0',
    notes: 'Primary contact: Ahmed Rashed. High-energy color saturation and rapid frame rate standards.',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'client_nike',
    companyId: 'comp_vortex',
    name: 'Nike Global Running',
    companyName: 'Nike Inc.',
    email: 'campaigns@nike.com',
    phone: '+1 503 671 6453',
    notes: 'Requires 16:9 widescreen master + 9:16 vertical reframe exports for social rollout.',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'client_spotify',
    companyId: 'comp_cineflow',
    name: 'Spotify Studios',
    companyName: 'Spotify AB',
    email: 'video@spotify.com',
    phone: '+46 8 501 645 00',
    notes: 'Exclusive artist sessions and global Wrapped campaign deliverables.',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'client_warner',
    companyId: 'comp_neon',
    name: 'Warner Bros. Pictures',
    companyName: 'Warner Bros. Discovery',
    email: 'vfxreview@warnerbros.com',
    phone: '+1 818 954 6000',
    notes: 'Strict NDA watermarking required on all screener cuts.',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'client_audi',
    companyId: 'comp_pulse',
    name: 'Audi AG Digital',
    companyName: 'Audi AG',
    email: 'social@audi.de',
    phone: '+49 841 89 0',
    notes: 'Electric vehicle launch series with dynamic sound accents.',
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
  {
    id: 'client_riot',
    companyId: 'comp_apex',
    name: 'Riot Games Esports',
    companyName: 'Riot Games Inc.',
    email: 'esports-broadcast@riotgames.com',
    phone: '+1 424 231 1111',
    notes: 'World Championship highlight packages. 60fps deliverables.',
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
  },
  {
    id: 'client_gucci',
    companyId: 'comp_silk',
    name: 'Gucci Creative Hub',
    companyName: 'Kering Group',
    email: 'fashion-media@gucci.com',
    phone: '+39 055 759221',
    notes: 'Milan Fashion Week digital campaign.',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
];

// ----------------------------------------------------
// PROJECTS ACROSS STUDIOS
// ----------------------------------------------------
const SEED_PROJECTS: Project[] = [
  // Vortex Projects
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
    assignedUserIds: ['user_david', 'user_leo', 'user_maya'],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // CineFlow Projects
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
    assignedUserIds: ['user_alex', 'user_elena'],
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj_nordic_doc',
    companyId: 'comp_cineflow',
    name: 'Arctic Silence — 4K Nature Doc',
    description: 'Feature-length documentary exploring seasonal wildlife migrations.',
    fps: 24,
    dropFrame: false,
    startTimecode: '01:00:00:00',
    status: 'client_review',
    primaryColor: '#8b5cf6',
    assignedUserIds: ['user_alex', 'user_tariq'],
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Neon Horizon Projects
  {
    id: 'proj_cyber_vfx',
    companyId: 'comp_neon',
    clientId: 'client_warner',
    name: 'Cyberpunk 2099 — VFX Shot Breakdown',
    description: 'Futuristic city hologram composites, explosion passes, and wire removal.',
    fps: 24,
    dropFrame: false,
    startTimecode: '01:00:00:00',
    status: 'client_review',
    primaryColor: '#ec4899',
    assignedUserIds: ['user_marcus', 'user_chloe'],
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Pulse Creative Projects
  {
    id: 'proj_audi_ev',
    companyId: 'comp_pulse',
    clientId: 'client_audi',
    name: 'Audi e-tron GT — Silent Power Social Ad',
    description: 'Fast-paced 15s Instagram reels and TikTok campaign series.',
    fps: 30,
    dropFrame: false,
    startTimecode: '01:00:00:00',
    status: 'changes_requested',
    primaryColor: '#f59e0b',
    assignedUserIds: ['user_jake', 'user_samira'],
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Apex Esports Projects
  {
    id: 'proj_worlds_highlights',
    companyId: 'comp_apex',
    clientId: 'client_riot',
    name: 'LoL Worlds 2026 — Finals Highlight Reel',
    description: '60fps high bitrate tournament replay package with motion graphics scoreboard overlays.',
    fps: 60,
    dropFrame: false,
    startTimecode: '01:00:00:00',
    status: 'delivered',
    primaryColor: '#ef4444',
    assignedUserIds: ['user_jin', 'user_victoria'],
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // Silk & Stone Projects
  {
    id: 'proj_gucci_milan',
    companyId: 'comp_silk',
    clientId: 'client_gucci',
    name: 'Gucci Fall Collection — Milan Runway Cinema',
    description: 'Ultra 4K slow-motion film looks with vintage anamorphic lens characteristics.',
    fps: 24,
    dropFrame: false,
    startTimecode: '01:00:00:00',
    status: 'approved',
    primaryColor: '#d946ef',
    assignedUserIds: ['user_giovanni'],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
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
  {
    id: 'log_4',
    companyId: 'comp_neon',
    projectId: 'proj_cyber_vfx',
    userId: 'user_marcus',
    userName: 'Marcus Sterling',
    userRole: 'company_admin',
    action: 'VFX Pass Approved',
    details: 'Approved final comp for shot 042',
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
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
// SEED INITIALIZER (Auto-seeds all 10 companies & 22 users)
// ----------------------------------------------------
export async function initTenantSeed(): Promise<void> {
  const db = await getTenantDB();
  if (!db) return;

  const existingCompanies = await db.getAll('companies');
  if (existingCompanies.length < 10) {
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
  return all.length >= 10 ? all : SEED_COMPANIES;
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
export async function getAllUsers(): Promise<User[]> {
  const db = await getTenantDB();
  if (!db) return SEED_USERS;
  await initTenantSeed();
  const users = await db.getAll('users');
  return users.length > 0 ? users : SEED_USERS;
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = await getTenantDB();
  if (!db) return SEED_USERS.find(u => u.id === userId) || null;
  await initTenantSeed();
  const user = await db.get('users', userId);
  return user || SEED_USERS.find(u => u.id === userId) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getTenantDB();
  const lower = email.trim().toLowerCase();
  if (!db) return SEED_USERS.find(u => u.email.toLowerCase() === lower) || null;
  await initTenantSeed();
  const users = await db.getAll('users');
  const found = users.find(u => u.email.toLowerCase() === lower);
  return found || SEED_USERS.find(u => u.email.toLowerCase() === lower) || null;
}

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

// ----------------------------------------------------
// ASSETS & VERSIONS
// ----------------------------------------------------
export async function getAssetsByProject(projectId: string): Promise<Asset[]> {
  const db = await getTenantDB();
  if (!db) return [];
  await initTenantSeed();
  return db.getAllFromIndex('assets', 'by-project', projectId);
}

export async function saveAsset(asset: Asset): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('assets', asset);
}

export async function deleteAsset(assetId: string): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.delete('assets', assetId);
}

export async function getAssetVersionsByAsset(assetId: string): Promise<AssetVersion[]> {
  const db = await getTenantDB();
  if (!db) return [];
  await initTenantSeed();
  const versions = await db.getAllFromIndex('assetVersions', 'by-asset', assetId);
  return versions.sort((a, b) => b.versionNumber - a.versionNumber);
}

export async function getAssetVersionsByProject(projectId: string): Promise<AssetVersion[]> {
  const db = await getTenantDB();
  if (!db) return [];
  await initTenantSeed();
  return db.getAllFromIndex('assetVersions', 'by-project', projectId);
}

export async function saveAssetVersion(version: AssetVersion): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('assetVersions', version);
}

// ----------------------------------------------------
// REVIEW SESSIONS
// ----------------------------------------------------
export async function getReviewSessionsByProject(projectId: string): Promise<ReviewSession[]> {
  const db = await getTenantDB();
  if (!db) return [];
  await initTenantSeed();
  return db.getAllFromIndex('reviewSessions', 'by-project', projectId);
}

export async function saveReviewSession(session: ReviewSession): Promise<void> {
  const db = await getTenantDB();
  if (db) await db.put('reviewSessions', session);
}

