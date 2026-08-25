import { useSyncExternalStore } from 'react';
import type { Perm, RoleId } from './rbac';
import { DEMO_USERS } from './rbac';

export type ProjectStatus = 'editing' | 'review' | 'changes' | 'approved';

export interface VersionRow {
  v: string;
  date: string;
  status: ProjectStatus;
  open: number;
  resolved: number;
}

export interface ActivityItem {
  time: string;
  textEn: string;
  textAr: string;
}

export interface CommentReply {
  id: string;
  authorId: string;
  text: string;
  at: string;
}

export type LayerType = 'pen' | 'arrow' | 'circle' | 'rect' | 'text' | 'image';

export interface AnnotationLayer {
  id: string;
  commentId: string;
  type: LayerType;
  pts?: { x: number; y: number }[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  text?: string;
  src?: string;
  color: string;
  sw: number;
  fs: number;
  visible: boolean;
}

export interface ReviewComment {
  id: string;
  projectId: string;
  version: string;
  authorId: string;
  kind: 'frame' | 'range';
  tc: number;
  rangeEnd?: number;
  text: string;
  thumb?: string;
  resolved: boolean;
  createdAt: string;
  replies: CommentReply[];
  originCommentId?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  clientId?: string;
  clientLogo?: string;
  thumbnail?: string;
  archived?: boolean;
  status: ProjectStatus;
  currentVersion: string;
  due: string;
  memberIds: string[];
  versions: VersionRow[];
  activity: ActivityItem[];
}

export interface ReviewSession {
  id: string;
  projectId: string;
  version: string;
  hostId: string;
  startedAt: string;
  endedAt?: string;
  participants: string[];
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  logoUrl?: string;
  brandColor?: string;
  tagline?: string;
}

export interface Client {
  id: string;
  name: string;
  logo?: string;
  domain?: string;
  description?: string;
  industry?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
}

export interface MemberRecord {
  id: string;
  name: string;
  email: string;
  companyId: string;
  roleId: RoleId;
  title?: string;
  avatar?: string;
  status: 'active' | 'suspended';
  extraPerms?: Perm[];
}

export interface AppState {
  companies: Company[];
  clients: Client[];
  members: MemberRecord[];
  projects: Project[];
  comments: ReviewComment[];
  layers: AnnotationLayer[];
  sessions: ReviewSession[];
}

const KEY = 'augmentoria-state-v1';

function seedClients(): Client[] {
  return [
    { id: 'cl-vodafone', name: 'Vodafone', domain: 'vodafone.com', industry: 'Telecom', description: 'Global telecom operator — Egyptian market campaigns.', contactName: 'Sara Hassan', contactEmail: 'sara.hassan@vodafone.com', createdAt: '2025-11-02' },
    { id: 'cl-flynas', name: 'Flynas', domain: 'flynas.com', industry: 'Aviation', description: 'Saudi low-cost airline, destination launches.', contactName: 'Youssef Adel', contactEmail: 'y.adel@flynas.com', createdAt: '2026-01-20' },
    { id: 'cl-rta', name: 'RTA', domain: 'rta.ae', industry: 'Transport', description: 'Dubai Roads & Transport Authority — public campaigns.', contactName: 'Laila Mostafa', contactEmail: 'laila@rta.ae', createdAt: '2025-09-14' },
    { id: 'cl-neom', name: 'NEOM', domain: 'neom.com', industry: 'Giga Projects', description: 'Saudi futuristic city development brand films.', contactName: '—', contactEmail: 'brand@neom.com', createdAt: '2026-03-01' },
    { id: 'cl-careem', name: 'Careem', domain: 'careem.com', industry: 'Super App', description: 'MENA super app — rebrand & teaser content.', contactName: 'Omar Zaki', contactEmail: 'omar.zaki@careem.com', createdAt: '2026-06-10' }
  ];
}

function migrate(parsed: AppState): AppState {
  if (!parsed.clients) parsed.clients = [];
  if (parsed.clients.length === 0) parsed.clients = seedClients();
  if (!parsed.comments) parsed.comments = [];
  if (!parsed.layers) parsed.layers = [];
  if (!parsed.sessions) parsed.sessions = [];
  parsed.projects = parsed.projects.map((p, idx) => ({
    ...p,
    clientId: p.clientId ?? parsed.clients.find((c) => c.name === p.client)?.id,
    thumbnail: p.thumbnail ?? `/hero-slides/slide-${(idx % 6) + 1}.jpg`
  }));
  return parsed;
}

function seed(): AppState {
  const clients = seedClients();
  const byName = (n: string) => clients.find((c) => c.name === n)?.id;
  return {
    companies: [{ id: 'c-aroma', name: 'AROMA Studios', createdAt: '2026-01-12' }],
    clients,
    comments: [
      {
        id: 'cm-1',
        projectId: 'p-vodafone',
        version: 'V04',
        authorId: 'u-ae',
        kind: 'frame',
        tc: 6.4,
        text: 'Logo looks small — scale it up ~20%.',
        resolved: false,
        createdAt: '2026-08-24 14:36',
        replies: [{ id: 'rp-1', authorId: 'u-mw', text: 'On it — will push to V05.', at: '14:52' }]
      },
      {
        id: 'cm-2',
        projectId: 'p-vodafone',
        version: 'V04',
        authorId: 'u-sh',
        kind: 'range',
        tc: 12,
        rangeEnd: 15.5,
        text: 'Music is too loud under the VO here.',
        resolved: false,
        createdAt: '2026-08-24 14:41',
        replies: []
      },
      {
        id: 'cm-3',
        projectId: 'p-vodafone',
        version: 'V04',
        authorId: 'u-sh',
        kind: 'frame',
        tc: 21.2,
        text: 'Remove the reflection on this shot.',
        resolved: true,
        createdAt: '2026-08-24 15:02',
        replies: []
      }
    ],
    layers: [
      { id: 'ly-1', commentId: 'cm-1', type: 'circle', x: 22, y: 30, w: 18, h: 26, color: '#FF4D4D', sw: 3, fs: 16, visible: true },
      { id: 'ly-2', commentId: 'cm-2', type: 'pen', pts: [{ x: 20, y: 70 }, { x: 32, y: 62 }, { x: 46, y: 72 }, { x: 60, y: 60 }], color: '#FFB020', sw: 3, fs: 16, visible: true },
      { id: 'ly-3', commentId: 'cm-3', type: 'rect', x: 55, y: 35, w: 25, h: 30, color: '#4FD1C5', sw: 3, fs: 16, visible: true }
    ],
    sessions: [
      {
        id: 'se-1',
        projectId: 'p-vodafone',
        version: 'V04',
        hostId: 'u-mw',
        startedAt: '2026-08-24 14:30',
        endedAt: '2026-08-24 15:10',
        participants: ['u-mw', 'u-ae', 'u-sh']
      }
    ],
    members: DEMO_USERS.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      companyId: u.companyId,
      roleId: u.roleId,
      title: u.title,
      status: 'active' as const
    })),
    projects: [
      {
        id: 'p-vodafone',
        thumbnail: '/hero-slides/slide-1.jpg',
        name: 'Ramadan TVC',
        client: 'Vodafone',
        clientId: byName('Vodafone'),
        status: 'review',
        currentVersion: 'V04',
        due: '2026-09-02',
        memberIds: ['u-mw', 'u-ae', 'u-sh'],
        versions: [
          { v: 'V04', date: '2026-08-24', status: 'review', open: 8, resolved: 12 },
          { v: 'V03', date: '2026-08-18', status: 'changes', open: 0, resolved: 9 },
          { v: 'V02', date: '2026-08-11', status: 'changes', open: 0, resolved: 14 },
          { v: 'V01', date: '2026-08-04', status: 'changes', open: 0, resolved: 6 }
        ],
        activity: [
          { time: '14:38', textEn: 'Client added 6 comments on V04', textAr: 'العميل أضاف 6 ملاحظات على V04' },
          { time: '13:52', textEn: 'V04 uploaded by Ahmed', textAr: 'V04 اترفعت بواسطة أحمد' },
          { time: '11:20', textEn: 'V03 approved internally', textAr: 'V03 اعتمدت داخليًا' }
        ]
      },
      {
        id: 'p-flynas',
        thumbnail: '/hero-slides/slide-2.jpg',
        name: 'New Destination',
        client: 'Flynas',
        clientId: byName('Flynas'),
        status: 'editing',
        currentVersion: 'V02',
        due: '2026-09-10',
        memberIds: ['u-mw', 'u-na', 'u-ok'],
        versions: [
          { v: 'V02', date: '2026-08-22', status: 'editing', open: 0, resolved: 0 },
          { v: 'V01', date: '2026-08-15', status: 'approved', open: 0, resolved: 5 }
        ],
        activity: [
          { time: '16:05', textEn: 'Omar started editing V02', textAr: 'عمر بدأ مونتاج V02' },
          { time: '10:41', textEn: 'Assets received from client', textAr: 'استلمنا الخام من العميل' }
        ]
      },
      {
        id: 'p-rta',
        thumbnail: '/hero-slides/slide-3.jpg',
        name: 'Metro Line Campaign',
        client: 'RTA',
        clientId: byName('RTA'),
        status: 'changes',
        currentVersion: 'V06',
        due: '2026-08-30',
        memberIds: ['u-na', 'u-ae', 'u-sh'],
        versions: [
          { v: 'V06', date: '2026-08-23', status: 'changes', open: 5, resolved: 17 },
          { v: 'V05', date: '2026-08-19', status: 'changes', open: 0, resolved: 11 }
        ],
        activity: [
          { time: '15:12', textEn: '5 notes still open on V06', textAr: '5 ملاحظات لسه مفتوحة على V06' },
          { time: '12:33', textEn: 'Live review session completed', textAr: 'جلسة مراجعة مباشرة خلصت' }
        ]
      },
      {
        id: 'p-neom',
        thumbnail: '/hero-slides/slide-4.jpg',
        name: 'Launch Film',
        client: 'NEOM',
        clientId: byName('NEOM'),
        archived: true,
        status: 'approved',
        currentVersion: 'V03',
        due: '2026-08-25',
        memberIds: ['u-mw', 'u-sh'],
        versions: [{ v: 'V03', date: '2026-08-21', status: 'approved', open: 0, resolved: 42 }],
        activity: [{ time: '16:37', textEn: 'V03 approved by client', textAr: 'العميل اعتمد V03' }]
      },
      {
        id: 'p-careem',
        thumbnail: '/hero-slides/slide-5.jpg',
        name: 'Rebrand Teaser',
        client: 'Careem',
        clientId: byName('Careem'),
        status: 'review',
        currentVersion: 'V01',
        due: '2026-09-05',
        memberIds: ['u-na', 'u-ok'],
        versions: [{ v: 'V01', date: '2026-08-24', status: 'review', open: 3, resolved: 2 }],
        activity: [{ time: '18:02', textEn: 'Review link shared with client', textAr: 'لينك المراجعة اتبعت للعميل' }]
      }
    ]
  };
}

function load(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.companies || !parsed.members || !parsed.projects) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

let state: AppState = load() ?? seed();
const listeners = new Set<() => void>();

function emit() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state);
}

export function getAppState(): AppState {
  return state;
}

export const subscribeToState = subscribe;

export const actions = {
  addCompany(name: string) {
    const c: Company = { id: `c-${Date.now()}`, name, createdAt: new Date().toISOString().slice(0, 10) };
    state = { ...state, companies: [...state.companies, c] };
    emit();
    return c;
  },

  addClient(c: Omit<Client, 'id' | 'createdAt'>) {
    const rec: Client = { ...c, id: `cl-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    state = { ...state, clients: [...state.clients, rec] };
    emit();
    return rec;
  },

  updateClient(id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>) {
    state = { ...state, clients: state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    emit();
  },

  setProjectArchived(id: string, archived: boolean) {
    state = { ...state, projects: state.projects.map((p) => (p.id === id ? { ...p, archived } : p)) };
    emit();
  },

  addVersion(projectId: string, opts: { carryOpen: boolean }) {
    const p = state.projects.find((x) => x.id === projectId);
    if (!p) return null;
    const prev = p.currentVersion;
    const num = parseInt(prev.replace(/\D/g, ''), 10) || 0;
    const nextV = `V${String(num + 1).padStart(2, '0')}`;
    const sourceComments = opts.carryOpen
      ? state.comments.filter((c) => c.projectId === projectId && c.version === prev && !c.resolved)
      : [];
    const carried = sourceComments.length;
    const createdAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const copiedComments = sourceComments.map((comment, index) => ({
      ...comment,
      id: `cm-${Date.now()}-${index}`,
      version: nextV,
      createdAt,
      originCommentId: comment.originCommentId ?? comment.id,
      replies: comment.replies.map((reply, replyIndex) => ({
        ...reply,
        id: `rp-${Date.now()}-${index}-${replyIndex}`
      }))
    }));
    const commentIdMap = new Map(sourceComments.map((comment, index) => [comment.id, copiedComments[index].id]));
    const copiedLayers = state.layers
      .filter((layer) => commentIdMap.has(layer.commentId))
      .map((layer, index) => ({
        ...layer,
        id: `ly-${Date.now()}-${index}`,
        commentId: commentIdMap.get(layer.commentId)!
      }));
    const row: VersionRow = {
      v: nextV,
      date: new Date().toISOString().slice(0, 10),
      status: 'editing',
      open: carried,
      resolved: 0
    };
    state = {
      ...state,
      comments: [...state.comments, ...copiedComments],
      layers: [...state.layers, ...copiedLayers],
      projects: state.projects.map((x) =>
        x.id === projectId ? { ...x, currentVersion: nextV, versions: [row, ...x.versions] } : x
      )
    };
    emit();
    return { version: nextV, carried };
  },

  addMember(m: Omit<MemberRecord, 'id' | 'status'>) {
    const rec: MemberRecord = { ...m, id: `u-${Date.now()}`, status: 'active' };
    state = { ...state, members: [...state.members, rec] };
    emit();
    return rec;
  },

  setMemberRole(id: string, roleId: RoleId) {
    state = { ...state, members: state.members.map((m) => (m.id === id ? { ...m, roleId } : m)) };
    emit();
  },

  setMemberStatus(id: string, status: MemberRecord['status']) {
    state = { ...state, members: state.members.map((m) => (m.id === id ? { ...m, status } : m)) };
    emit();
  },

  setMemberAvatar(id: string, avatar?: string) {
    state = { ...state, members: state.members.map((m) => (m.id === id ? { ...m, avatar } : m)) };
    emit();
  },

  updateMemberProfile(id: string, patch: Partial<Pick<MemberRecord, 'name' | 'email' | 'title' | 'avatar'>>) {
    state = { ...state, members: state.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
    emit();
  },

  toggleMemberPerm(id: string, perm: Perm) {
    state = {
      ...state,
      members: state.members.map((m) => {
        if (m.id !== id) return m;
        const extra = m.extraPerms ?? [];
        return { ...m, extraPerms: extra.includes(perm) ? extra.filter((p) => p !== perm) : [...extra, perm] };
      })
    };
    emit();
  },

  removeMember(id: string) {
    state = {
      ...state,
      members: state.members.filter((m) => m.id !== id),
      projects: state.projects.map((p) => ({ ...p, memberIds: p.memberIds.filter((x) => x !== id) }))
    };
    emit();
  },

  addProject(p: Pick<Project, 'name' | 'client' | 'due'> & { creatorId: string; clientId?: string }) {
    const proj: Project = {
      id: `p-${Date.now()}`,
      name: p.name,
      client: p.client,
      clientId: p.clientId ?? state.clients.find((c) => c.name === p.client)?.id,
      thumbnail: `/hero-slides/slide-${(state.projects.length % 6) + 1}.jpg`,
      status: 'editing',
      currentVersion: 'V01',
      due: p.due,
      memberIds: [p.creatorId],
      versions: [],
      activity: [{ time: new Date().toTimeString().slice(0, 5), textEn: 'Project created', textAr: 'المشروع اتأنشئ' }]
    };
    state = { ...state, projects: [proj, ...state.projects] };
    emit();
    return proj;
  },

  updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'client' | 'due' | 'status' | 'clientLogo' | 'clientId'>>) {
    state = { ...state, projects: state.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
    emit();
  },

  deleteProject(id: string) {
    state = { ...state, projects: state.projects.filter((p) => p.id !== id) };
    emit();
  },

  addTeamMember(projectId: string, memberId: string) {
    state = {
      ...state,
      projects: state.projects.map((p) =>
        p.id === projectId && !p.memberIds.includes(memberId) ? { ...p, memberIds: [...p.memberIds, memberId] } : p
      )
    };
    emit();
  },

  removeTeamMember(projectId: string, memberId: string) {
    state = {
      ...state,
      projects: state.projects.map((p) => (p.id === projectId ? { ...p, memberIds: p.memberIds.filter((x) => x !== memberId) } : p))
    };
    emit();
  },

  addComment(c: Omit<ReviewComment, 'id' | 'createdAt' | 'replies' | 'resolved'>) {
    const rec: ReviewComment = {
      ...c,
      id: `cm-${Date.now()}`,
      resolved: false,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      replies: []
    };
    state = { ...state, comments: [...state.comments, rec] };
    emit();
    return rec;
  },
  toggleCommentResolved(id: string) {
    state = { ...state, comments: state.comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c)) };
    emit();
  },

  addReply(commentId: string, authorId: string, text: string) {
    state = {
      ...state,
      comments: state.comments.map((c) =>
        c.id === commentId
          ? { ...c, replies: [...c.replies, { id: `rp-${Date.now()}`, authorId, text, at: new Date().toTimeString().slice(0, 5) }] }
          : c
      )
    };
    emit();
  },

  deleteComment(id: string) {
    state = {
      ...state,
      comments: state.comments.filter((c) => c.id !== id),
      layers: state.layers.filter((l) => l.commentId !== id)
    };
    emit();
  },

  addLayer(l: Omit<AnnotationLayer, 'id' | 'visible'> & { visible?: boolean }) {
    const rec: AnnotationLayer = { visible: true, ...l, id: `ly-${Date.now()}-${Math.round(Math.random() * 999)}` };
    state = { ...state, layers: [...state.layers, rec] };
    emit();
    return rec;
  },

  updateLayer(id: string, patch: Partial<Pick<AnnotationLayer, 'visible' | 'text' | 'src'>>) {
    state = { ...state, layers: state.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) };
    emit();
  },

  deleteLayer(id: string) {
    state = { ...state, layers: state.layers.filter((l) => l.id !== id) };
    emit();
  },

  attachDraftLayers(draftKey: string, commentId: string) {
    state = { ...state, layers: state.layers.map((l) => (l.commentId === draftKey ? { ...l, commentId } : l)) };
    emit();
  },

  clearDraftLayers(draftKey: string) {
    state = { ...state, layers: state.layers.filter((l) => l.commentId !== draftKey) };
    emit();
  },

  startSession(projectId: string, version: string, hostId: string) {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 16).replace('T', ' ');
    const existing = state.sessions.find((s) => s.projectId === projectId && s.version === version && !s.endedAt);
    if (existing) {
      if (!existing.participants.includes(hostId)) {
        state = {
          ...state,
          sessions: state.sessions.map((s) => (s.id === existing.id ? { ...s, participants: [...s.participants, hostId] } : s))
        };
        emit();
      }
      return existing;
    }
    const rec: ReviewSession = {
      id: `se-${Date.now()}`,
      projectId,
      version,
      hostId,
      startedAt: stamp,
      participants: [hostId]
    };
    state = { ...state, sessions: [rec, ...state.sessions] };
    emit();
    return rec;
  },

  endSession(id: string) {
    const now = new Date();
    state = {
      ...state,
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, endedAt: now.toISOString().slice(0, 16).replace('T', ' ') } : s))
    };
    emit();
  },

  updateCompanyBranding(id: string, patch: Partial<Pick<Company, 'logoUrl' | 'brandColor' | 'tagline'>>) {
    state = { ...state, companies: state.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    emit();
  }
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  editing: 'st_editing',
  review: 'st_review',
  changes: 'st_changes',
  approved: 'st_approved'
};

export function clientLogoSrc(c?: Client): string {
  if (!c) return '';
  if (c.logo) return c.logo;
  if (c.domain) return `https://www.google.com/s2/favicons?domain=${c.domain}&sz=128`;
  return '';
}

export function findClientByName(state: AppState, name: string): Client | undefined {
  return state.clients.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export const STATUS_CLASS: Record<ProjectStatus, string> = {
  editing: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
  review: 'bg-accent/10 text-accent border-accent/30',
  changes: 'bg-orange-400/10 text-orange-300 border-orange-400/30',
  approved: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
};
