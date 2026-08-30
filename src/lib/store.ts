import { useSyncExternalStore } from 'react';
import type { Perm, RoleId } from './rbac';
import { ALL_PERMS, ROLE_PERMS } from './rbac';

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

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
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
  opacity?: number;
  rotation?: number;
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
  cleanThumb?: string;
  thumb?: string;
  resolved: boolean;
  createdAt: string;
  replies: CommentReply[];
  originCommentId?: string;
  assetId?: string;
  mentions?: string[];
  checklist?: ChecklistItem[];
}

export interface Project {
  id: string;
  name: string;
  client: string;
  clientId?: string;
  companyId?: string;
  clientLogo?: string;
  thumbnail?: string;
  archived?: boolean;
  status: ProjectStatus;
  currentVersion: string;
  startDate?: string;
  createdAt?: string;
  due: string;
  memberIds: string[];
  versions: VersionRow[];
  activity: ActivityItem[];
  templateId?: string;
  milestones?: ProjectMilestone[];
  projectType?: 'single' | 'campaign';
  platform?: string;
  aspectRatio?: string;
  accessPolicy?: ProjectAccessPolicy;
}

export type AccountType = 'internal' | 'client';
export type ProjectAccessPolicy = 'company' | 'assigned';
export type ProjectMemberRole = 'owner' | 'manager' | 'editor' | 'reviewer' | 'viewer';
export type ProjectAccessLevel = 'manage' | 'edit' | 'review' | 'view';

export interface ProjectMembership {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  accessLevel: ProjectAccessLevel;
  assignedBy?: string;
  assignedAt: string;
  status: 'active' | 'inactive';
}

export interface ProjectMilestone {
  key: string;
  done: boolean;
}

export const PROJECT_TEMPLATES = [
  { id: 'tvc', key: 'tpl_tvc', milestones: ['brief', 'script', 'storyboard', 'production', 'edit', 'review', 'delivery'] },
  { id: 'social', key: 'tpl_social', milestones: ['brief', 'concept', 'edit', 'review', 'delivery'] },
  { id: 'brand', key: 'tpl_brand', milestones: ['brief', 'script', 'production', 'edit', 'review', 'delivery'] },
  { id: 'blank', key: 'tpl_blank', milestones: [] }
] as const;

export type TemplateId = (typeof PROJECT_TEMPLATES)[number]['id'];

export function buildMilestones(templateId?: string): ProjectMilestone[] {
  const tpl = PROJECT_TEMPLATES.find((t) => t.id === templateId);
  return (tpl?.milestones ?? []).map((key) => ({ key, done: false }));
}

export interface ReviewSession {
  id: string;
  projectId: string;
  version: string;
  title?: string;
  note?: string;
  hostId: string;
  startedAt: string;
  endedAt?: string;
  participants: string[];
  controlRequests?: string[];
  commentIds?: string[];
  commentSnapshots?: ReviewComment[];
  events?: SessionEvent[];
}

export interface SessionEvent {
  id: string;
  type: 'started' | 'play' | 'pause' | 'seek' | 'control_requested' | 'control_changed' | 'ended';
  at: string;
  actorId?: string;
  time?: number;
}

export interface ApprovalRecord {
  id: string;
  projectId: string;
  version: string;
  actorId: string;
  decision: 'approved' | 'changes';
  note?: string;
  createdAt: string;
  commentCount?: number;
  resolvedCount?: number;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  logoUrl?: string;
  brandColor?: string;
  tagline?: string;
  status: 'active' | 'suspended';
  plan: 'trial' | 'monthly' | 'yearly';
  planStartedAt?: string;
  planRenewsAt?: string;
  maxMembers?: number;
  notes?: string;
}

export type PlanType = Company['plan'];

export interface CustomRole {
  id: string;
  companyId: string;
  name: string;
  perms: Perm[];
  parentId?: string;
  createdAt: string;
}

export interface RoleTemplateRole {
  key: string;
  name: string;
  perms: Perm[];
  parentKey?: string;
}

export interface RoleTemplate {
  id: string;
  name: string;
  description?: string;
  builtin?: boolean;
  source?: string;
  companyId?: string;
  roles: RoleTemplateRole[];
}

const P = (...perms: Perm[]) => perms;

const FULL_MANAGE: Perm[] = P('clients.manage', 'projects.create', 'projects.edit', 'team.manage', 'versions.upload', 'reviews.comment', 'reviews.annotate', 'approvals.grant', 'reports.export');
const PRODUCER_PERMS: Perm[] = P('clients.manage', 'projects.create', 'projects.edit', 'team.manage', 'versions.upload', 'reviews.comment', 'reviews.annotate', 'approvals.grant', 'reports.export');
const CREATOR_PERMS: Perm[] = P('versions.upload', 'reviews.comment', 'reviews.annotate');
const REVIEW_ONLY: Perm[] = P('reviews.comment', 'reviews.annotate');

export const BUILTIN_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'rtt-commercial',
    name: 'Commercial / TVC Production',
    description: 'EP → Producer → Coordinator, with Director, Editor and Colorist — the classic TVC house structure.',
    builtin: true,
    source: 'Production house standard',
    roles: [
      { key: 'ep', name: 'Executive Producer', perms: FULL_MANAGE },
      { key: 'producer', name: 'Producer', perms: PRODUCER_PERMS, parentKey: 'ep' },
      { key: 'coordinator', name: 'Production Coordinator', perms: P('versions.upload', 'reviews.comment'), parentKey: 'producer' },
      { key: 'director', name: 'Director', perms: P('reviews.comment', 'reviews.annotate', 'approvals.grant') },
      { key: 'editor', name: 'Editor', perms: CREATOR_PERMS },
      { key: 'colorist', name: 'Colorist', perms: CREATOR_PERMS }
    ]
  },
  {
    id: 'rtt-social',
    name: 'Social Media Agency',
    description: 'Content Lead over senior/junior editors plus designer and community manager for always-on content.',
    builtin: true,
    source: 'Social-first agency standard',
    roles: [
      { key: 'lead', name: 'Content Lead', perms: FULL_MANAGE },
      { key: 'senior-editor', name: 'Senior Video Editor', perms: PRODUCER_PERMS, parentKey: 'lead' },
      { key: 'editor', name: 'Video Editor', perms: CREATOR_PERMS, parentKey: 'senior-editor' },
      { key: 'designer', name: 'Graphic Designer', perms: REVIEW_ONLY },
      { key: 'community', name: 'Community Manager', perms: P('reviews.comment', 'reports.export') }
    ]
  },
  {
    id: 'rtt-post',
    name: 'Post-Production House',
    description: 'Post Supervisor leading online, color, sound and VFX specialists.',
    builtin: true,
    source: 'Post-production facility standard',
    roles: [
      { key: 'supervisor', name: 'Post Supervisor', perms: FULL_MANAGE },
      { key: 'online', name: 'Online Editor', perms: CREATOR_PERMS, parentKey: 'supervisor' },
      { key: 'colorist', name: 'Colorist', perms: CREATOR_PERMS, parentKey: 'supervisor' },
      { key: 'sound', name: 'Sound Designer', perms: REVIEW_ONLY, parentKey: 'supervisor' },
      { key: 'vfx', name: 'VFX Compositor', perms: CREATOR_PERMS }
    ]
  },
  {
    id: 'rtt-brand',
    name: 'Brand / In-house Team',
    description: 'Marketing Manager structure used by big brands with in-house creators.',
    builtin: true,
    source: 'In-house marketing team standard',
    roles: [
      { key: 'manager', name: 'Marketing Manager', perms: FULL_MANAGE },
      { key: 'brand', name: 'Brand Guardian', perms: P('reviews.comment', 'reviews.annotate', 'approvals.grant'), parentKey: 'manager' },
      { key: 'videographer', name: 'Videographer', perms: CREATOR_PERMS, parentKey: 'manager' },
      { key: 'content-editor', name: 'Content Editor', perms: CREATOR_PERMS, parentKey: 'manager' }
    ]
  },
  {
    id: 'rtt-film',
    name: 'Film / Long-form',
    description: 'Line producer, script supervision and editorial department for long-form projects.',
    builtin: true,
    source: 'Long-form / film production standard',
    roles: [
      { key: 'line-producer', name: 'Line Producer', perms: FULL_MANAGE },
      { key: 'script-supervisor', name: 'Script Supervisor', perms: P('reviews.comment', 'reviews.annotate'), parentKey: 'line-producer' },
      { key: 'assistant-editor', name: 'Assistant Editor', perms: P('versions.upload', 'reviews.comment'), parentKey: 'line-producer' },
      { key: 'director', name: 'Director', perms: P('reviews.comment', 'reviews.annotate', 'approvals.grant') },
      { key: 'dop', name: 'Director of Photography', perms: P('versions.upload', 'reviews.comment', 'reviews.annotate') }
    ]
  }
];

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
  companyId?: string;
}

export interface MemberRecord {
  id: string;
  name: string;
  email: string;
  companyId: string;
  roleId: RoleId;
  accountType?: AccountType;
  title?: string;
  avatar?: string;
  status: 'active' | 'suspended';
  extraPerms?: Perm[];
  customRoleId?: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  companyId?: string;
  projectId?: string;
  action: string;
  targetId?: string;
  textEn: string;
  textAr: string;
  createdAt: string;
}

export type NotificationKind = 'mention' | 'reply' | 'decision' | 'assignment';

export interface AppNotification {
  id: string;
  userId: string;
  actorId: string;
  kind: NotificationKind;
  projectId: string;
  version?: string;
  commentId?: string;
  textEn: string;
  textAr: string;
  createdAt: string;
  read: boolean;
}

export interface TrashEntry {
  id: string;
  kind: 'comment' | 'member';
  labelEn: string;
  labelAr: string;
  at: string;
  comment?: ReviewComment;
  layers?: AnnotationLayer[];
  member?: MemberRecord;
  projectIds?: string[];
  memberships?: ProjectMembership[];
}

export interface AppState {
  companies: Company[];
  clients: Client[];
  members: MemberRecord[];
  projects: Project[];
  projectMemberships: ProjectMembership[];
  comments: ReviewComment[];
  layers: AnnotationLayer[];
  sessions: ReviewSession[];
  approvals: ApprovalRecord[];
  notifications: AppNotification[];
  trash: TrashEntry[];
  customRoles: CustomRole[];
  roleTemplates: RoleTemplate[];
  auditLog: AuditEvent[];
}

const KEY = 'augmentoria-state-v2';

function localStamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDate(date = new Date()) {
  return localStamp(date).slice(0, 10);
}

function localTime(date = new Date()) {
  return localStamp(date).slice(11);
}

function activity(textEn: string, textAr: string): ActivityItem {
  return { time: localTime(), textEn, textAr };
}

export function memberAccountType(member: Pick<MemberRecord, 'roleId' | 'accountType'> | undefined): AccountType {
  return member?.accountType ?? (member?.roleId === 'client' ? 'client' : 'internal');
}

function defaultProjectRole(member: MemberRecord | undefined): ProjectMemberRole {
  if (!member) return 'viewer';
  if (memberAccountType(member) === 'client') return 'reviewer';
  if (member.roleId === 'super_admin' || member.roleId === 'company_admin') return 'owner';
  if (member.roleId === 'am' || member.roleId === 'ops') return 'manager';
  if (member.roleId === 'assistant' || member.roleId === 'designer') return 'editor';
  return 'viewer';
}

export function accessLevelForProjectRole(role: ProjectMemberRole): ProjectAccessLevel {
  if (role === 'owner' || role === 'manager') return 'manage';
  if (role === 'editor') return 'edit';
  if (role === 'reviewer') return 'review';
  return 'view';
}

function membershipRecord(projectId: string, member: MemberRecord, assignedBy?: string, assignedAt = localStamp()): ProjectMembership {
  const role = defaultProjectRole(member);
  return {
    id: `pm-${projectId}-${member.id}`,
    projectId,
    userId: member.id,
    role,
    accessLevel: accessLevelForProjectRole(role),
    assignedBy,
    assignedAt,
    status: 'active'
  };
}

function syncVersionCounts(projects: Project[], comments: ReviewComment[]) {
  return projects.map((project) => ({
    ...project,
    versions: project.versions.map((row) => {
      const matching = comments.filter((comment) => comment.projectId === project.id && comment.version === row.v);
      if (matching.length === 0) return row;
      return {
        ...row,
        open: matching.filter((comment) => !comment.resolved).length,
        resolved: matching.filter((comment) => comment.resolved).length
      };
    })
  }));
}

function seedClients(): Client[] {
  return [
    { id: 'cl-vodafone', name: 'Vodafone', domain: 'vodafone.com', industry: 'Telecom', description: 'Global telecom operator — Egyptian market campaigns.', contactName: 'Sara Hassan', contactEmail: 'sara.hassan@vodafone.com', createdAt: '2025-11-02', companyId: 'c-aroma' },
    { id: 'cl-flynas', name: 'Flynas', domain: 'flynas.com', industry: 'Aviation', description: 'Saudi low-cost airline, destination launches.', contactName: 'Youssef Adel', contactEmail: 'y.adel@flynas.com', createdAt: '2026-01-20', companyId: 'c-aroma' },
    { id: 'cl-rta', name: 'RTA', domain: 'rta.ae', industry: 'Transport', description: 'Dubai Roads & Transport Authority — public campaigns.', contactName: 'Laila Mostafa', contactEmail: 'laila@rta.ae', createdAt: '2025-09-14', companyId: 'c-aroma' },
    { id: 'cl-neom', name: 'NEOM', domain: 'neom.com', industry: 'Giga Projects', description: 'Saudi futuristic city development brand films.', contactName: '—', contactEmail: 'brand@neom.com', createdAt: '2026-03-01', companyId: 'c-aroma' },
    { id: 'cl-careem', name: 'Careem', domain: 'careem.com', industry: 'Super App', description: 'MENA super app — rebrand & teaser content.', contactName: 'Omar Zaki', contactEmail: 'omar.zaki@careem.com', createdAt: '2026-06-10', companyId: 'c-aroma' },
    { id: 'cl-instamart', name: 'InstaMart', domain: 'instamart.app', industry: 'Retail', description: 'Q-commerce brand — always-on social content.', contactName: 'Dina Fahmy', contactEmail: 'dina@instamart.app', createdAt: '2026-06-15', companyId: 'c-socializr' }
  ];
}

function migrate(parsed: AppState): AppState {
  if (!parsed.clients) parsed.clients = [];
  if (parsed.clients.length === 0) parsed.clients = seedClients();
  if (!parsed.comments) parsed.comments = [];
  if (!parsed.layers) parsed.layers = [];
  if (!parsed.sessions) parsed.sessions = [];
  parsed.sessions = parsed.sessions.map((session) => ({
    ...session,
    title: session.title ?? `Review Session · ${session.version}`,
    events: session.events ?? [],
    commentIds: session.commentIds ?? []
  }));
  if (!parsed.approvals) parsed.approvals = [];
  if (!parsed.notifications) parsed.notifications = [];
  if (!parsed.trash) parsed.trash = [];
  if (!parsed.customRoles) parsed.customRoles = [];
  if (!parsed.roleTemplates) parsed.roleTemplates = [];
  if (!parsed.auditLog) parsed.auditLog = [];
  parsed.members = parsed.members.map((member) => ({
    ...member,
    accountType: memberAccountType(member)
  }));
  parsed.companies = parsed.companies.map((c) => ({
    ...c,
    status: c.status ?? 'active',
    plan: c.plan ?? 'monthly'
  }));
  parsed.projects = parsed.projects.map((p, idx) => ({
    ...p,
    clientId: p.clientId ?? parsed.clients.find((c) => c.name === p.client)?.id,
    companyId: p.companyId ?? parsed.members.find((m) => p.memberIds.includes(m.id))?.companyId ?? 'c-aroma',
    memberIds: Array.from(new Set(p.memberIds ?? [])).filter((memberId) => {
      const member = parsed.members.find((item) => item.id === memberId);
      return Boolean(member && (!p.companyId || member.companyId === (p.companyId ?? parsed.members.find((m) => p.memberIds.includes(m.id))?.companyId)));
    }),
    thumbnail: p.thumbnail ?? `/hero-slides/slide-${(idx % 6) + 1}.jpg`,
    startDate: p.startDate ?? p.createdAt ?? '2026-08-01',
    createdAt: p.createdAt ?? p.startDate ?? '2026-08-01',
    accessPolicy: p.accessPolicy ?? 'company'
  }));
  // Repair the original demo seed, which used deleted/foreign member IDs for InstaMart.
  parsed.projects = parsed.projects.map((project) =>
    project.id === 'p-instamart' && project.companyId === 'c-socializr'
      ? { ...project, memberIds: parsed.members.filter((member) => member.companyId === project.companyId && member.status === 'active').map((member) => member.id) }
      : project
  );
  const validProjectIds = new Set(parsed.projects.map((project) => project.id));
  const validMembers = new Map(parsed.members.map((member) => [member.id, member]));
  const migratedMemberships = Array.isArray(parsed.projectMemberships)
    ? parsed.projectMemberships.filter((membership) => {
        const project = parsed.projects.find((item) => item.id === membership.projectId);
        const member = validMembers.get(membership.userId);
        return Boolean(project && member && project.companyId === member.companyId);
      })
    : [];
  const membershipKeys = new Set(migratedMemberships.map((membership) => `${membership.projectId}:${membership.userId}`));
  for (const project of parsed.projects) {
    for (const userId of project.memberIds) {
      const member = validMembers.get(userId);
      const key = `${project.id}:${userId}`;
      if (!member || membershipKeys.has(key)) continue;
      migratedMemberships.push(membershipRecord(project.id, member, undefined, `${project.createdAt ?? localDate()} 00:00`));
      membershipKeys.add(key);
    }
  }
  parsed.projectMemberships = migratedMemberships.filter((membership) => validProjectIds.has(membership.projectId));
  parsed.projects = parsed.projects.map((project) => ({
    ...project,
    memberIds: parsed.projectMemberships
      .filter((membership) => membership.projectId === project.id && membership.status === 'active')
      .map((membership) => membership.userId)
  }));
  parsed.projects = syncVersionCounts(parsed.projects, parsed.comments);
  return parsed;
}

function seed(): AppState {
  const clients = seedClients();
  const byName = (n: string) => clients.find((c) => c.name === n)?.id;
  return {
    companies: [
      { id: 'c-aroma', name: 'AROMA Studios', createdAt: '2026-01-12', status: 'active' as const, plan: 'yearly' as const, planStartedAt: '2026-01-12', planRenewsAt: '2027-01-12', maxMembers: 25 },
      { id: 'c-socializr', name: 'Socializr', createdAt: '2026-06-01', status: 'active' as const, plan: 'monthly' as const, planStartedAt: '2026-06-01', planRenewsAt: '2026-09-01', maxMembers: 10 }
    ],
    clients,
    projectMemberships: [],
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
        replies: [{ id: 'rp-1', authorId: 'u-mw', text: 'On it — will push to V05.', at: '14:52' }],
        mentions: ['u-mw'],
        checklist: [
          { id: 'ck-1', text: 'Scale logo +20%', done: true },
          { id: 'ck-2', text: 'Re-render end card', done: false }
        ]
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
        title: 'Client Rough Cut & VO Review',
        note: 'Reviewing pacing, end card sizing, and VO volume levels with the client team.',
        hostId: 'u-mw',
        startedAt: '2026-08-24 14:30',
        endedAt: '2026-08-24 15:10',
        participants: ['u-mw', 'u-ae', 'u-sh'],
        commentIds: ['cm-1', 'cm-2', 'cm-3'],
        events: [
          { id: 'sev-1', type: 'started', at: '2026-08-24 14:30', actorId: 'u-mw', time: 0 },
          { id: 'sev-2', type: 'seek', at: '2026-08-24 14:36', actorId: 'u-mw', time: 6.4 },
          { id: 'sev-3', type: 'pause', at: '2026-08-24 14:41', actorId: 'u-mw', time: 12 },
          { id: 'sev-4', type: 'ended', at: '2026-08-24 15:10', actorId: 'u-mw', time: 21.2 }
        ]
      }
    ],
    approvals: [],
    notifications: [
      {
        id: 'nt-1',
        userId: 'u-mw',
        actorId: 'u-sh',
        kind: 'mention',
        projectId: 'p-vodafone',
        version: 'V04',
        commentId: 'cm-1',
        textEn: 'Sara Hassan mentioned you on V04',
        textAr: 'سارة حسن أشارت إليك على V04',
        createdAt: '2026-08-24 14:36',
        read: false
      }
    ],
    trash: [],
    roleTemplates: [
      {
        id: 'rt-aroma-custom',
        companyId: 'c-aroma',
        name: 'AROMA Signature Structure',
        description: 'Our own tuned structure — Producer-led with dedicated client gatekeeping.',
        roles: [
          { key: 'studio-director', name: 'Studio Director', perms: FULL_MANAGE },
          { key: 'producer', name: 'Producer', perms: PRODUCER_PERMS, parentKey: 'studio-director' },
          { key: 'client-gatekeeper', name: 'Client Gatekeeper', perms: P('clients.manage', 'reviews.comment'), parentKey: 'producer' },
          { key: 'senior-motion', name: 'Senior Motion Designer', perms: P('versions.upload', 'projects.edit', 'reviews.comment', 'reviews.annotate') }
        ]
      }
    ],
    customRoles: [
      {
        id: 'cr-producer-aroma',
        companyId: 'c-aroma',
        name: 'Producer',
        perms: PRODUCER_PERMS,
        createdAt: '2026-01-15'
      }
    ],
    members: ([
      { id: 'u-sa', name: 'Super Admin', email: 'admin@augmentoria.app', companyId: 'c-aroma', roleId: 'super_admin' as RoleId, title: 'Platform Owner', avatar: '/hero-slides/slide-1.jpg', status: 'active' as const },
      { id: 'u-ca', name: 'Karim Nasser', email: 'karim@aroma.studio', companyId: 'c-aroma', roleId: 'company_admin' as RoleId, title: 'Studio Director', avatar: '/hero-slides/slide-5.jpg', status: 'active' as const },
      { id: 'u-mw', name: 'Mohamed Wageeh', email: 'm.wageeh@aroma.studio', companyId: 'c-aroma', roleId: 'am' as RoleId, customRoleId: 'cr-producer-aroma', title: 'Account Manager & Producer', avatar: '/hero-slides/slide-1.jpg', status: 'active' as const },
      { id: 'u-na', name: 'Nour Adel', email: 'nour@aroma.studio', companyId: 'c-aroma', roleId: 'assistant' as RoleId, title: 'AM Assistant', avatar: '/hero-slides/slide-3.jpg', status: 'active' as const },
      { id: 'u-ok', name: 'Omar Khaled', email: 'omar@aroma.studio', companyId: 'c-aroma', roleId: 'ops' as RoleId, title: 'Operations Manager', avatar: '/hero-slides/slide-4.jpg', status: 'active' as const },
      { id: 'u-sh', name: 'Sara Hassan', email: 'sara@vodafone.com', companyId: 'c-aroma', roleId: 'client' as RoleId, title: 'Client Reviewer', avatar: '/hero-slides/slide-6.jpg', status: 'active' as const },
      { id: 'u-ae', name: 'Ahmed Elkady', email: 'ahmed@aroma.studio', companyId: 'c-aroma', roleId: 'designer' as RoleId, title: 'Senior Motion Designer', avatar: '/hero-slides/slide-2.jpg', status: 'active' as const },
      { id: 'u-ns', name: 'Nada Sherif', email: 'nada@socializr.app', companyId: 'c-socializr', roleId: 'company_admin' as RoleId, title: 'Studio Manager', avatar: '/hero-slides/slide-2.jpg', status: 'active' as const },
      { id: 'u-tk', name: 'Tarek Kamel', email: 'tarek@socializr.io', companyId: 'c-socializr', roleId: 'designer' as RoleId, title: 'Motion Designer', avatar: '/hero-slides/slide-3.jpg', status: 'active' as const }
    ]).map((m) => ({
      ...m,
      extraPerms: m.roleId === 'super_admin' ? [...ALL_PERMS] : []
    })),
    projects: [
      {
        id: 'p-vodafone',
        thumbnail: '/hero-slides/slide-1.jpg',
        name: 'Ramadan TVC',
        client: 'Vodafone',
        clientId: byName('Vodafone'),
        companyId: 'c-aroma',
        status: 'review',
        currentVersion: 'V04',
        startDate: '2026-08-01',
        createdAt: '2026-08-01',
        due: '2026-09-02',
        memberIds: ['u-mw', 'u-ae', 'u-sh'],
        templateId: 'tvc',
        milestones: [
          { key: 'brief', done: true },
          { key: 'script', done: true },
          { key: 'storyboard', done: true },
          { key: 'production', done: true },
          { key: 'edit', done: true },
          { key: 'review', done: false },
          { key: 'delivery', done: false }
        ],
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
        companyId: 'c-aroma',
        status: 'editing',
        currentVersion: 'V02',
        startDate: '2026-08-10',
        createdAt: '2026-08-10',
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
        companyId: 'c-aroma',
        status: 'changes',
        currentVersion: 'V06',
        startDate: '2026-08-05',
        createdAt: '2026-08-05',
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
        companyId: 'c-aroma',
        archived: true,
        status: 'approved',
        currentVersion: 'V03',
        startDate: '2026-08-02',
        createdAt: '2026-08-02',
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
        companyId: 'c-aroma',
        status: 'review',
        currentVersion: 'V01',
        startDate: '2026-08-20',
        createdAt: '2026-08-20',
        due: '2026-09-05',
        memberIds: ['u-na', 'u-ok'],
        versions: [{ v: 'V01', date: '2026-08-20', status: 'review', open: 3, resolved: 1 }],
        activity: [{ time: '18:14', textEn: 'V01 review link shared', textAr: 'اتشارك لينك مراجعة V01' }]
      },
      {
        id: 'p-instamart',
        thumbnail: '/hero-slides/slide-6.jpg',
        name: 'Always-On Social',
        client: 'InstaMart',
        clientId: byName('InstaMart'),
        companyId: 'c-socializr',
        status: 'editing',
        currentVersion: 'V02',
        startDate: '2026-08-15',
        createdAt: '2026-08-15',
        due: '2026-09-01',
        memberIds: ['u-ns', 'u-tk'],
        versions: [
          { v: 'V02', date: '2026-08-25', status: 'editing', open: 0, resolved: 0 },
          { v: 'V01', date: '2026-08-18', status: 'approved', open: 0, resolved: 4 }
        ],
        activity: [{ time: '10:15', textEn: 'Nada started editing V02', textAr: 'ندا بدأت مونتاج V02' }]
      }
    ],
    auditLog: []
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

let state: AppState = load() ?? migrate(seed());
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY || !event.newValue) return;
    try {
      const incoming = JSON.parse(event.newValue) as AppState;
      if (!incoming.companies || !incoming.members || !incoming.projects) return;
      state = migrate(incoming);
      listeners.forEach((listener) => listener());
    } catch {
      // Ignore malformed or incompatible cross-tab state.
    }
  });
}

function emit() {
  try {
    // Frame captures belong in IndexedDB. Keeping them in the synchronous
    // localStorage state makes one busy review enough to exceed the browser
    // quota and silently lose later work.
    const persistable = {
      ...state,
      comments: state.comments.map((comment) => ({ ...comment, thumb: undefined, cleanThumb: undefined }))
    };
    localStorage.setItem(KEY, JSON.stringify(persistable));
  } catch {
    // A large imported thumbnail or a full browser quota must not make a user action fail.
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('augmentoria:persistence-error'));
  }
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

export function parseMentions(text: string, candidates: { id: string; name: string }[]): string[] {
  const found = new Set<string>();
  for (const c of candidates) {
    if (!c.name) continue;
    const pattern = new RegExp(`@${c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(text)) found.add(c.id);
  }
  return [...found];
}

function pushNotifications(
  state: AppState,
  entries: Omit<AppNotification, 'id' | 'createdAt' | 'read'>[]
): AppNotification[] {
  const created = entries.map((entry, i) => ({
    ...entry,
    id: `nt-${Date.now()}-${i}`,
    createdAt: localStamp(),
    read: false
  }));
  return [...created, ...state.notifications].slice(0, 100);
}

function pushAudit(
  current: AppState,
  event: Omit<AuditEvent, 'id' | 'createdAt'>
): AuditEvent[] {
  return [
    { ...event, id: `au-${Date.now()}-${Math.round(Math.random() * 999)}`, createdAt: localStamp() },
    ...current.auditLog
  ].slice(0, 250);
}

const TRASH_CAP = 50;

export const actions = {
  replaceRealtimeState(incoming: AppState) {
    if (!incoming || !Array.isArray(incoming.projects) || !Array.isArray(incoming.comments) || !Array.isArray(incoming.layers)) return;
    state = migrate(JSON.parse(JSON.stringify(incoming)) as AppState);
    emit();
  },

  addCompany(name: string, opts?: Partial<Pick<Company, 'plan' | 'planStartedAt' | 'planRenewsAt' | 'maxMembers' | 'notes' | 'tagline'>>, actorId?: string) {
    if (!authorize(state, actorId, 'companies.manage')) return null;
    const c: Company = {
      id: `c-${Date.now()}`,
      name,
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'active',
      plan: opts?.plan ?? 'trial',
      planStartedAt: opts?.planStartedAt,
      planRenewsAt: opts?.planRenewsAt,
      maxMembers: opts?.maxMembers,
      notes: opts?.notes,
      tagline: opts?.tagline
    };
    state = {
      ...state,
      companies: [...state.companies, c],
      auditLog: pushAudit(state, { actorId: actorId!, companyId: c.id, action: 'company.created', targetId: c.id, textEn: `Created company ${c.name}`, textAr: `تم إنشاء شركة ${c.name}` })
    };
    emit();
    return c;
  },

  updateCompanyInfo(id: string, patch: Partial<Omit<Company, 'id' | 'createdAt'>>, actorId?: string) {
    if (!authorize(state, actorId, actorId && state.members.find((member) => member.id === actorId)?.roleId === 'super_admin' ? 'companies.manage' : 'members.manage', { companyId: id })) return false;
    state = {
      ...state,
      companies: state.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      auditLog: pushAudit(state, { actorId: actorId!, companyId: id, action: 'company.updated', targetId: id, textEn: 'Updated company settings', textAr: 'تم تحديث إعدادات الشركة' })
    };
    emit();
    return true;
  },

  setCompanyStatus(id: string, status: Company['status'], actorId?: string) {
    if (!authorize(state, actorId, 'companies.manage')) return false;
    state = {
      ...state,
      companies: state.companies.map((c) => (c.id === id ? { ...c, status } : c)),
      auditLog: pushAudit(state, { actorId: actorId!, companyId: id, action: 'company.status', targetId: id, textEn: `Company status changed to ${status}`, textAr: `تم تغيير حالة الشركة إلى ${status}` })
    };
    emit();
    return true;
  },

  removeCompany(id: string, actorId?: string) {
    if (!authorize(state, actorId, 'companies.manage')) return false;
    const company = state.companies.find((c) => c.id === id);
    if (!company || state.companies.length <= 1) return false;
    const memberIds = new Set(state.members.filter((m) => m.companyId === id).map((m) => m.id));
    const projectIds = new Set(state.projects.filter((p) => p.companyId === id).map((p) => p.id));
    const commentIds = new Set(state.comments.filter((comment) => projectIds.has(comment.projectId)).map((comment) => comment.id));
    state = {
      ...state,
      companies: state.companies.filter((c) => c.id !== id),
      members: state.members.filter((m) => m.companyId !== id),
      customRoles: state.customRoles.filter((r) => r.companyId !== id),
      roleTemplates: state.roleTemplates.filter((template) => template.companyId !== id),
      clients: state.clients.filter((c) => c.companyId !== id),
      projects: state.projects.filter((p) => p.companyId !== id),
      projectMemberships: state.projectMemberships.filter((membership) => !projectIds.has(membership.projectId)),
      comments: state.comments.filter((cm) => !projectIds.has(cm.projectId)),
      layers: state.layers.filter((layer) => !commentIds.has(layer.commentId)),
      sessions: state.sessions.filter((s) => !projectIds.has(s.projectId)),
      approvals: state.approvals.filter((a) => !projectIds.has(a.projectId)),
      notifications: state.notifications.filter((n) => !memberIds.has(n.userId) && !projectIds.has(n.projectId)),
      auditLog: state.auditLog.filter((event) => event.companyId !== id && !projectIds.has(event.projectId ?? ''))
    };
    emit();
    return true;
  },

  addCustomRole(role: Omit<CustomRole, 'id' | 'createdAt'>, actorId?: string) {
    if (!authorize(state, actorId, 'roles.assign', { companyId: role.companyId })) return null;
    if (role.parentId && !state.customRoles.some((candidate) => candidate.id === role.parentId && candidate.companyId === role.companyId)) return null;
    const rec: CustomRole = { ...role, id: `cr-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    state = {
      ...state,
      customRoles: [...state.customRoles, rec],
      auditLog: pushAudit(state, { actorId: actorId!, companyId: role.companyId, action: 'role.created', targetId: rec.id, textEn: `Created role ${rec.name}`, textAr: `تم إنشاء دور ${rec.name}` })
    };
    emit();
    return rec;
  },

  updateCustomRole(id: string, patch: Partial<Pick<CustomRole, 'name' | 'perms' | 'parentId'>>, actorId?: string) {
    const current = state.customRoles.find((role) => role.id === id);
    if (!current || !authorize(state, actorId, 'roles.assign', { companyId: current.companyId })) return false;
    if (patch.parentId) {
      const parent = state.customRoles.find((role) => role.id === patch.parentId && role.companyId === current.companyId);
      if (!parent || parent.id === id) return false;
      const seen = new Set<string>([id]);
      let cursor: CustomRole | undefined = parent;
      while (cursor) {
        if (seen.has(cursor.id)) return false;
        seen.add(cursor.id);
        cursor = cursor.parentId ? state.customRoles.find((role) => role.id === cursor?.parentId) : undefined;
      }
    }
    state = {
      ...state,
      customRoles: state.customRoles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      auditLog: pushAudit(state, { actorId: actorId!, companyId: current.companyId, action: 'role.updated', targetId: id, textEn: `Updated role ${current.name}`, textAr: `تم تحديث دور ${current.name}` })
    };
    emit();
    return true;
  },

  removeCustomRole(id: string, actorId?: string) {
    const role = state.customRoles.find((item) => item.id === id);
    if (!role || !authorize(state, actorId, 'roles.assign', { companyId: role.companyId })) return false;
    if (state.members.some((m) => m.customRoleId === id)) return false;
    if (state.customRoles.some((item) => item.parentId === id)) return false;
    state = {
      ...state,
      customRoles: state.customRoles.filter((r) => r.id !== id),
      members: state.members.map((m) => (m.customRoleId === id ? { ...m, customRoleId: undefined } : m))
    };
    emit();
    return true;
  },

  setMemberCustomRole(id: string, customRoleId: string | null, actorId?: string) {
    const member = state.members.find((item) => item.id === id);
    const role = customRoleId ? state.customRoles.find((item) => item.id === customRoleId) : undefined;
    if (!member || member.id === actorId || !authorize(state, actorId, 'roles.assign', { companyId: member.companyId }) || (customRoleId && (!role || role.companyId !== member.companyId))) return false;
    state = {
      ...state,
      members: state.members.map((m) =>
        m.id === id ? { ...m, customRoleId: customRoleId ?? undefined } : m
      ),
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: member.companyId,
        action: 'member.custom-role.updated',
        targetId: id,
        textEn: `Changed ${member.name}'s custom role`,
        textAr: `تم تغيير الدور المخصص للعضو ${member.name}`
      })
    };
    emit();
    return true;
  },

  saveRoleTemplate(tpl: Pick<RoleTemplate, 'name' | 'description' | 'roles'> & { companyId: string }, actorId?: string) {
    if (!authorize(state, actorId, 'roles.assign', { companyId: tpl.companyId })) return null;
    const rec: RoleTemplate = { ...tpl, id: `rt-${Date.now()}` };
    state = { ...state, roleTemplates: [rec, ...state.roleTemplates] };
    emit();
    return rec;
  },

  updateRoleTemplate(id: string, patch: Partial<Pick<RoleTemplate, 'name' | 'description' | 'roles'>>, actorId?: string) {
    const template = state.roleTemplates.find((item) => item.id === id);
    if (!template?.companyId || !authorize(state, actorId, 'roles.assign', { companyId: template.companyId })) return false;
    state = { ...state, roleTemplates: state.roleTemplates.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
    emit();
    return true;
  },

  removeRoleTemplate(id: string, actorId?: string) {
    const template = state.roleTemplates.find((item) => item.id === id);
    if (!template?.companyId || !authorize(state, actorId, 'roles.assign', { companyId: template.companyId })) return false;
    state = { ...state, roleTemplates: state.roleTemplates.filter((r) => r.id !== id) };
    emit();
    return true;
  },

  applyRoleTemplate(template: RoleTemplate, companyId: string, actorId?: string): { created: number; skipped: number } {
    if (!authorize(state, actorId, 'roles.assign', { companyId })) return { created: 0, skipped: template.roles.length };
    const existing = state.customRoles.filter((r) => r.companyId === companyId);
    const createdRoles: CustomRole[] = [];
    const keyToId = new Map<string, string>();
    let skipped = 0;
    let seq = 0;

    for (const tplRole of template.roles) {
      if (existing.some((e) => e.name.toLowerCase() === tplRole.name.toLowerCase())) {
        skipped += 1;
        continue;
      }
      const rec: CustomRole = {
        id: `cr-${Date.now()}-${seq++}`,
        companyId,
        name: tplRole.name,
        perms: [...tplRole.perms],
        createdAt: localStamp()
      };
      keyToId.set(tplRole.key, rec.id);
      createdRoles.push(rec);
    }

    for (const tplRole of template.roles) {
      if (!tplRole.parentKey) continue;
      const roleId = keyToId.get(tplRole.key);
      const parentId = keyToId.get(tplRole.parentKey);
      if (!roleId || !parentId) continue;
      const target = createdRoles.find((r) => r.id === roleId);
      if (target) target.parentId = parentId;
    }

    if (createdRoles.length > 0) {
      state = { ...state, customRoles: [...state.customRoles, ...createdRoles] };
      emit();
    }
    return { created: createdRoles.length, skipped };
  },

  addClient(c: Omit<Client, 'id' | 'createdAt'>, actorId?: string) {
    if (!c.companyId || !authorize(state, actorId, 'clients.manage', { companyId: c.companyId })) return null;
    const rec: Client = { ...c, id: `cl-${Date.now()}`, createdAt: new Date().toISOString().slice(0, 10) };
    state = { ...state, clients: [...state.clients, rec] };
    emit();
    return rec;
  },

  removeClient(id: string, actorId?: string) {
    const client = state.clients.find((item) => item.id === id);
    if (!client || !authorize(state, actorId, 'clients.manage', { client })) return false;
    if (state.projects.some((project) => project.clientId === id)) return false;
    state = { ...state, clients: state.clients.filter((c) => c.id !== id) };
    emit();
    return true;
  },

  updateClient(id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>, actorId?: string) {
    const client = state.clients.find((item) => item.id === id);
    if (!client || !authorize(state, actorId, 'clients.manage', { client })) return false;
    state = { ...state, clients: state.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    emit();
    return true;
  },

  setProjectArchived(id: string, archived: boolean, actorId?: string) {
    const project = state.projects.find((item) => item.id === id);
    if (!project || !authorize(state, actorId, 'projects.edit', { project })) return false;
    state = { ...state, projects: state.projects.map((p) => (p.id === id ? { ...p, archived } : p)) };
    emit();
    return true;
  },

  addVersion(projectId: string, opts: { carryOpen: boolean }, actorId?: string) {
    const p = state.projects.find((x) => x.id === projectId);
    if (!p || !authorize(state, actorId, 'versions.upload', { project: p })) return null;
    const prev = p.currentVersion;
    const num = parseInt(prev.replace(/\D/g, ''), 10) || 0;
    const nextV = `V${String(num + 1).padStart(2, '0')}`;
    const sourceComments = opts.carryOpen
      ? state.comments.filter((c) => c.projectId === projectId && c.version === prev && !c.resolved)
      : [];
    const carried = sourceComments.length;
    const createdAt = localStamp();
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
      date: localDate(),
      status: 'editing',
      open: carried,
      resolved: 0
    };
    state = {
      ...state,
      comments: [...state.comments, ...copiedComments],
      layers: [...state.layers, ...copiedLayers],
      projects: state.projects.map((x) =>
        x.id === projectId
          ? {
              ...x,
              status: 'editing',
              currentVersion: nextV,
              versions: [row, ...x.versions],
              activity: [activity(`${nextV} created${carried ? ` with ${carried} carried comments` : ''}`, `تم إنشاء ${nextV}${carried ? ` مع نقل ${carried} ملاحظات` : ''}`), ...x.activity]
            }
          : x
      )
    };
    emit();
    return { version: nextV, carried };
  },

  addMember(m: Omit<MemberRecord, 'id' | 'status'>, actorId?: string) {
    if (!authorize(state, actorId, 'members.manage', { companyId: m.companyId })) return null;
    if (m.roleId === 'super_admin' && state.members.find((member) => member.id === actorId)?.roleId !== 'super_admin') return null;
    const rec: MemberRecord = {
      ...m,
      accountType: m.accountType ?? (m.roleId === 'client' ? 'client' : 'internal'),
      id: `u-${Date.now()}`,
      status: 'active'
    };
    state = {
      ...state,
      members: [...state.members, rec],
      auditLog: pushAudit(state, { actorId: actorId!, companyId: m.companyId, action: 'member.created', targetId: rec.id, textEn: `Added member ${rec.name}`, textAr: `تمت إضافة العضو ${rec.name}` })
    };
    emit();
    return rec;
  },

  setMemberRole(id: string, roleId: RoleId, actorId?: string) {
    const target = state.members.find((member) => member.id === id);
    if (!target || target.id === actorId || !authorize(state, actorId, 'roles.assign', { companyId: target.companyId })) return false;
    if ((target.roleId === 'super_admin' || roleId === 'super_admin') && state.members.find((member) => member.id === actorId)?.roleId !== 'super_admin') return false;
    state = {
      ...state,
      members: state.members.map((m) =>
        m.id === id
          ? { ...m, roleId, accountType: roleId === 'client' ? 'client' : 'internal', customRoleId: undefined }
          : m
      ),
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: target.companyId,
        action: 'member.role.updated',
        targetId: id,
        textEn: `Changed ${target.name}'s system role to ${roleId}`,
        textAr: `تم تغيير دور ${target.name} إلى ${roleId}`
      })
    };
    emit();
    return true;
  },

  setMemberAccountType(id: string, accountType: AccountType, actorId?: string) {
    const target = state.members.find((member) => member.id === id);
    if (!target || target.id === actorId || !authorize(state, actorId, 'members.manage', { companyId: target.companyId })) return false;
    state = {
      ...state,
      members: state.members.map((member) =>
        member.id === id
          ? {
              ...member,
              accountType,
              roleId: accountType === 'client' ? 'client' : member.roleId === 'client' ? 'assistant' : member.roleId
            }
          : member
      ),
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: target.companyId,
        action: 'member.account-type.updated',
        targetId: id,
        textEn: `Changed ${target.name}'s account type to ${accountType}`,
        textAr: `تم تغيير نوع حساب ${target.name} إلى ${accountType}`
      })
    };
    emit();
    return true;
  },

  setMemberStatus(id: string, status: MemberRecord['status'], actorId?: string) {
    const target = state.members.find((member) => member.id === id);
    if (!target || !authorize(state, actorId, 'members.manage', { companyId: target.companyId }) || target.id === actorId) return false;
    state = {
      ...state,
      members: state.members.map((m) => (m.id === id ? { ...m, status } : m)),
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: target.companyId,
        action: 'member.status.updated',
        targetId: id,
        textEn: `Changed ${target.name}'s status to ${status}`,
        textAr: `تم تغيير حالة ${target.name} إلى ${status}`
      })
    };
    emit();
    return true;
  },

  setMemberAvatar(id: string, avatar?: string) {
    state = { ...state, members: state.members.map((m) => (m.id === id ? { ...m, avatar } : m)) };
    emit();
  },

  updateMemberProfile(id: string, patch: Partial<Pick<MemberRecord, 'name' | 'email' | 'title' | 'avatar'>>) {
    state = { ...state, members: state.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
    emit();
  },

  toggleMemberPerm(id: string, perm: Perm, actorId?: string) {
    const target = state.members.find((member) => member.id === id);
    if (!target || target.id === actorId || !authorize(state, actorId, 'roles.assign', { companyId: target.companyId })) return false;
    state = {
      ...state,
      members: state.members.map((m) => {
        if (m.id !== id) return m;
        const extra = m.extraPerms ?? [];
        return { ...m, extraPerms: extra.includes(perm) ? extra.filter((p) => p !== perm) : [...extra, perm] };
      }),
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: target.companyId,
        action: 'member.permission.updated',
        targetId: id,
        textEn: `Changed ${perm} for ${target.name}`,
        textAr: `تم تغيير صلاحية ${perm} للعضو ${target.name}`
      })
    };
    emit();
    return true;
  },

  removeMember(id: string, actorId?: string) {
    const member = state.members.find((m) => m.id === id);
    if (!member || member.id === actorId || !authorize(state, actorId, 'members.manage', { companyId: member.companyId })) return null;
    if (member.roleId === 'super_admin' && state.members.find((item) => item.id === actorId)?.roleId !== 'super_admin') return null;
    const projectIds = state.projects.filter((p) => p.memberIds.includes(id)).map((p) => p.id);
    const memberships = state.projectMemberships.filter((membership) => membership.userId === id);
    const entry: TrashEntry = {
      id: `tr-${Date.now()}`,
      kind: 'member',
      labelEn: member.name,
      labelAr: member.name,
      at: localStamp(),
      member,
      projectIds,
      memberships
    };
    state = {
      ...state,
      members: state.members.filter((m) => m.id !== id),
      projects: state.projects.map((p) => ({ ...p, memberIds: p.memberIds.filter((x) => x !== id) })),
      projectMemberships: state.projectMemberships.filter((membership) => membership.userId !== id),
      trash: [entry, ...state.trash].slice(0, TRASH_CAP),
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: member.companyId,
        action: 'member.removed',
        targetId: id,
        textEn: `Removed member ${member.name}`,
        textAr: `تم حذف العضو ${member.name}`
      })
    };
    emit();
    return entry.id;
  },

  addProject(p: Pick<Project, 'name' | 'client' | 'due'> & { creatorId: string; clientId?: string; templateId?: TemplateId; companyId?: string; startDate?: string; projectType?: 'single' | 'campaign'; platform?: string; aspectRatio?: string; accessPolicy?: ProjectAccessPolicy }) {
    const creator = state.members.find((member) => member.id === p.creatorId);
    const companyId = p.companyId ?? creator?.companyId;
    const clientId = p.clientId ?? state.clients.find((c) => c.name === p.client)?.id;
    const client = state.clients.find((c) => c.id === clientId);
    if (!creator || !companyId || !authorize(state, creator.id, 'projects.create', { companyId }) || (client && client.companyId && client.companyId !== companyId)) {
      throw new Error('Project client must belong to the creator company');
    }
    const proj: Project = {
      id: `p-${Date.now()}`,
      name: p.name,
      client: p.client,
      clientId,
      companyId,
      thumbnail: `/hero-slides/slide-${(state.projects.length % 6) + 1}.jpg`,
      status: 'editing',
      currentVersion: 'V01',
      due: p.due,
      startDate: p.startDate ?? localDate(),
      createdAt: localDate(),
      memberIds: [p.creatorId],
      versions: [],
      activity: [{ time: new Date().toTimeString().slice(0, 5), textEn: 'Project created', textAr: 'المشروع اتأنشئ' }],
      templateId: p.templateId,
      milestones: buildMilestones(p.templateId),
      projectType: p.projectType ?? 'single',
      platform: p.platform,
      aspectRatio: p.aspectRatio,
      accessPolicy: p.accessPolicy ?? 'assigned',
    };
    state = {
      ...state,
      projects: [proj, ...state.projects],
      projectMemberships: [membershipRecord(proj.id, creator, creator.id), ...state.projectMemberships]
    };
    emit();
    return proj;
  },

  toggleMilestone(projectId: string, key: string, actorId?: string) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project || !authorize(state, actorId, 'projects.edit', { project })) return false;
    state = {
      ...state,
      projects: state.projects.map((p) =>
        p.id === projectId && p.milestones
          ? { ...p, milestones: p.milestones.map((m) => (m.key === key ? { ...m, done: !m.done } : m)) }
          : p
      )
    };
    emit();
    return true;
  },

  updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'client' | 'due' | 'status' | 'clientLogo' | 'clientId' | 'startDate' | 'projectType' | 'platform' | 'aspectRatio' | 'accessPolicy'>>, actorId?: string) {
    const current = state.projects.find((project) => project.id === id);
    if (!current || !authorize(state, actorId, 'projects.edit', { project: current })) return false;
    const nextClient = patch.clientId
      ? state.clients.find((item) => item.id === patch.clientId)
      : patch.client
        ? state.clients.find((item) => item.name.toLowerCase() === patch.client?.toLowerCase())
        : undefined;
    if (nextClient) {
      const client = nextClient;
      if (client?.companyId && current.companyId && client.companyId !== current.companyId) return false;
    }
    state = {
      ...state,
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: current.companyId,
        projectId: id,
        action: 'project.updated',
        targetId: id,
        textEn: `Updated project ${current.name}`,
        textAr: `تم تحديث مشروع ${current.name}`
      })
    };
    emit();
    return true;
  },

  deleteProject(id: string, actorId?: string) {
    const project = state.projects.find((item) => item.id === id);
    if (!project || !authorize(state, actorId, 'projects.edit', { project })) return false;
    const commentIds = new Set(state.comments.filter((comment) => comment.projectId === id).map((comment) => comment.id));
    state = {
      ...state,
      projects: state.projects.filter((p) => p.id !== id),
      projectMemberships: state.projectMemberships.filter((membership) => membership.projectId !== id),
      comments: state.comments.filter((comment) => comment.projectId !== id),
      layers: state.layers.filter((layer) => !commentIds.has(layer.commentId)),
      sessions: state.sessions.filter((session) => session.projectId !== id),
      approvals: state.approvals.filter((approval) => approval.projectId !== id),
      notifications: state.notifications.filter((notification) => notification.projectId !== id),
      auditLog: pushAudit(
        { ...state, auditLog: state.auditLog.filter((event) => event.projectId !== id) },
        {
          actorId: actorId!,
          companyId: project.companyId,
          action: 'project.deleted',
          targetId: id,
          textEn: `Deleted project ${project.name}`,
          textAr: `تم حذف مشروع ${project.name}`
        }
      ),
      trash: state.trash.filter((entry) => entry.comment?.projectId !== id)
    };
    emit();
    return true;
  },

  addTeamMember(projectId: string, memberId: string, role?: ProjectMemberRole, actorId?: string) {
    const project = state.projects.find((item) => item.id === projectId);
    const member = state.members.find((item) => item.id === memberId);
    if (!project || !member || !authorize(state, actorId, 'team.manage', { project }) || member.status !== 'active' || (project.companyId && member.companyId !== project.companyId)) return false;
    const membershipRole = role ?? defaultProjectRole(member);
    const existingMembership = state.projectMemberships.find((item) => item.projectId === projectId && item.userId === memberId);
    const nextMembership: ProjectMembership = existingMembership
      ? { ...existingMembership, role: membershipRole, accessLevel: accessLevelForProjectRole(membershipRole), status: 'active', assignedBy: actorId ?? existingMembership.assignedBy }
      : { ...membershipRecord(projectId, member, actorId), role: membershipRole, accessLevel: accessLevelForProjectRole(membershipRole) };
    const actorName = state.members.find((item) => item.id === actorId)?.name ?? 'A project manager';
    state = {
      ...state,
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              memberIds: p.memberIds.includes(memberId) ? p.memberIds : [...p.memberIds, memberId],
              activity: [activity(`${member.name} joined the project`, `تمت إضافة ${member.name} لفريق المشروع`), ...p.activity]
            }
          : p
      ),
      projectMemberships: existingMembership
        ? state.projectMemberships.map((item) => (item.id === existingMembership.id ? nextMembership : item))
        : [nextMembership, ...state.projectMemberships],
      notifications: pushNotifications(state, [{
        userId: memberId,
        actorId: actorId ?? memberId,
        kind: 'assignment',
        projectId,
        textEn: `${actorName} assigned you to ${project.name} as ${membershipRole}`,
        textAr: `${actorName} أضافك لمشروع ${project.name} بدور ${membershipRole}`
      }]),
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: project.companyId,
        projectId,
        action: existingMembership ? 'project.member.updated' : 'project.member.added',
        targetId: memberId,
        textEn: `${existingMembership ? 'Updated' : 'Added'} ${member.name} as ${membershipRole}`,
        textAr: `${existingMembership ? 'تم تحديث' : 'تمت إضافة'} ${member.name} بدور ${membershipRole}`
      })
    };
    emit();
    return true;
  },

  updateProjectMembership(projectId: string, memberId: string, role: ProjectMemberRole, actorId?: string) {
    const project = state.projects.find((item) => item.id === projectId);
    const membership = state.projectMemberships.find((item) => item.projectId === projectId && item.userId === memberId);
    if (!project || !membership || !authorize(state, actorId, 'team.manage', { project })) return false;
    const ownerCount = state.projectMemberships.filter((item) => item.projectId === projectId && item.status === 'active' && item.role === 'owner').length;
    if (membership.role === 'owner' && role !== 'owner' && ownerCount <= 1) return false;
    state = {
      ...state,
      projectMemberships: state.projectMemberships.map((item) =>
        item.id === membership.id ? { ...item, role, accessLevel: accessLevelForProjectRole(role) } : item
      ),
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: project.companyId,
        projectId,
        action: 'project.member.role-updated',
        targetId: memberId,
        textEn: `Changed project role for ${state.members.find((item) => item.id === memberId)?.name ?? memberId} to ${role}`,
        textAr: `تم تغيير دور العضو داخل المشروع إلى ${role}`
      })
    };
    emit();
    return true;
  },

  removeTeamMember(projectId: string, memberId: string, actorId?: string) {
    const project = state.projects.find((item) => item.id === projectId);
    const member = state.members.find((item) => item.id === memberId);
    const membership = state.projectMemberships.find((item) => item.projectId === projectId && item.userId === memberId);
    if (!project || !authorize(state, actorId, 'team.manage', { project }) || actorId === memberId) return false;
    const ownerCount = state.projectMemberships.filter((item) => item.projectId === projectId && item.status === 'active' && item.role === 'owner').length;
    if (membership?.role === 'owner' && ownerCount <= 1) return false;
    state = {
      ...state,
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              memberIds: p.memberIds.filter((x) => x !== memberId),
              activity: member ? [activity(`${member.name} left the project`, `تمت إزالة ${member.name} من فريق المشروع`), ...p.activity] : p.activity
            }
          : p
      ),
      projectMemberships: state.projectMemberships.filter((membership) => !(membership.projectId === projectId && membership.userId === memberId)),
      notifications: project && member
        ? pushNotifications(state, [{
            userId: memberId,
            actorId: actorId ?? memberId,
            kind: 'assignment',
            projectId,
            textEn: `You were removed from ${project.name}`,
            textAr: `تمت إزالتك من مشروع ${project.name}`
          }])
        : state.notifications,
      auditLog: pushAudit(state, {
        actorId: actorId!,
        companyId: project.companyId,
        projectId,
        action: 'project.member.removed',
        targetId: memberId,
        textEn: `Removed ${member?.name ?? memberId} from ${project.name}`,
        textAr: `تمت إزالة ${member?.name ?? memberId} من مشروع ${project.name}`
      })
    };
    emit();
    return true;
  },

  addComment(c: Omit<ReviewComment, 'id' | 'createdAt' | 'replies' | 'resolved'> & { mentions?: string[]; checklist?: ChecklistItem[] }) {
    const project = state.projects.find((item) => item.id === c.projectId);
    const isGuest = c.authorId.startsWith('guest-');
    if (!project || (!isGuest && !authorize(state, c.authorId, 'reviews.comment', { project }))) {
      throw new Error('Not authorized to comment on this project');
    }
    const rec: ReviewComment = {
      ...c,
      id: `cm-${Date.now()}`,
      resolved: false,
      createdAt: localStamp(),
      replies: []
    };
    const comments = [...state.comments, rec];
    const author = state.members.find((member) => member.id === c.authorId)?.name ?? 'Guest';
    const projects = state.projects.map((project) =>
      project.id === c.projectId
        ? { ...project, activity: [activity(`${author} added a comment on ${c.version}`, `${author} أضاف ملاحظة على ${c.version}`), ...project.activity] }
        : project
    );
    const mentionEntries = (c.mentions ?? [])
      .filter((id) => id !== c.authorId)
      .map((userId) => ({
        userId,
        actorId: c.authorId,
        kind: 'mention' as NotificationKind,
        projectId: c.projectId,
        version: c.version,
        commentId: rec.id,
        textEn: `${author} mentioned you on ${c.version}`,
        textAr: `${author} أشار إليك على ${c.version}`
      }));
    state = {
      ...state,
      comments,
      projects: syncVersionCounts(projects, comments),
      notifications: pushNotifications(state, mentionEntries)
    };
    emit();
    return rec;
  },

  toggleChecklistItem(commentId: string, itemId: string, actorId?: string) {
    const target = state.comments.find((comment) => comment.id === commentId);
    const project = target ? state.projects.find((item) => item.id === target.projectId) : undefined;
    const isGuest = actorId?.startsWith('guest-');
    if (!target || !project || (!isGuest && !authorize(state, actorId, 'reviews.comment', { project }))) return false;
    state = {
      ...state,
      comments: state.comments.map((comment) =>
        comment.id === commentId && comment.checklist
          ? {
              ...comment,
              checklist: comment.checklist.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item))
            }
          : comment
      )
    };
    emit();
    return true;
  },

  toggleCommentResolved(id: string, actorId?: string) {
    const target = state.comments.find((comment) => comment.id === id);
    const project = target ? state.projects.find((item) => item.id === target.projectId) : undefined;
    if (!target || !project || !authorize(state, actorId, 'projects.edit', { project })) return false;
    const comments = state.comments.map((comment) => (comment.id === id ? { ...comment, resolved: !comment.resolved } : comment));
    const projects = state.projects.map((project) =>
      project.id === target.projectId
        ? {
            ...project,
            activity: [
              activity(
                `${target.version} comment ${target.resolved ? 'reopened' : 'resolved'}`,
                `تم ${target.resolved ? 'إعادة فتح' : 'حل'} ملاحظة على ${target.version}`
              ),
              ...project.activity
            ]
          }
        : project
    );
    state = { ...state, comments, projects: syncVersionCounts(projects, comments) };
    emit();
    return true;
  },

  addReply(commentId: string, authorId: string, text: string, mentions?: string[]) {
    const target = state.comments.find((comment) => comment.id === commentId);
    const project = target ? state.projects.find((item) => item.id === target.projectId) : undefined;
    const isGuest = authorId.startsWith('guest-');
    if (!target || !project || (!isGuest && !authorize(state, authorId, 'reviews.comment', { project }))) return false;
    const author = state.members.find((member) => member.id === authorId)?.name ?? 'Guest';
    const recipients = new Set([...(mentions ?? []), target.authorId]);
    recipients.delete(authorId);
    const replyEntries = [...recipients].map((userId) => ({
      userId,
      actorId: authorId,
      kind: 'reply' as NotificationKind,
      projectId: target.projectId,
      version: target.version,
      commentId: target.id,
      textEn: `${author} replied to a comment on ${target.version}`,
      textAr: `${author} رد على ملاحظة في ${target.version}`
    }));
    state = {
      ...state,
      comments: state.comments.map((c) =>
        c.id === commentId
          ? { ...c, replies: [...c.replies, { id: `rp-${Date.now()}`, authorId, text, at: localTime() }] }
          : c
      ),
      projects: state.projects.map((project) =>
        project.id === target.projectId
          ? { ...project, activity: [activity(`${author} replied on ${target.version}`, `${author} رد على ملاحظة في ${target.version}`), ...project.activity] }
          : project
      ),
      notifications: pushNotifications(state, replyEntries)
    };
    emit();
    return true;
  },

  deleteComment(id: string, actorId?: string) {
    const target = state.comments.find((comment) => comment.id === id);
    const project = target ? state.projects.find((item) => item.id === target.projectId) : undefined;
    if (!target || !project || !authorize(state, actorId, 'projects.edit', { project })) return null;
    const comments = state.comments.filter((comment) => comment.id !== id);
    const projects = state.projects.map((project) =>
      project.id === target.projectId
        ? { ...project, activity: [activity(`A comment was deleted from ${target.version}`, `تم حذف ملاحظة من ${target.version}`), ...project.activity] }
        : project
    );
    const entry: TrashEntry = {
      id: `tr-${Date.now()}`,
      kind: 'comment',
      labelEn: target.text.slice(0, 60),
      labelAr: target.text.slice(0, 60),
      at: localStamp(),
      comment: target,
      layers: state.layers.filter((l) => l.commentId === id)
    };
    state = {
      ...state,
      comments,
      projects: syncVersionCounts(projects, comments),
      layers: state.layers.filter((l) => l.commentId !== id),
      trash: [entry, ...state.trash].slice(0, TRASH_CAP)
    };
    emit();
    return entry.id;
  },

  restoreFromTrash(entryId: string, actorId?: string) {
    const entry = state.trash.find((item) => item.id === entryId);
    if (!entry) return false;
    const project = entry.comment ? state.projects.find((item) => item.id === entry.comment?.projectId) : undefined;
    const companyId = entry.member?.companyId ?? project?.companyId;
    if (entry.kind === 'member') {
      if (!authorize(state, actorId, 'members.manage', { companyId })) return false;
    } else if (!project || !authorize(state, actorId, 'reviews.comment', { project })) {
      return false;
    }
    if (entry.kind === 'comment' && entry.comment) {
      state = {
        ...state,
        comments: [...state.comments, entry.comment],
        layers: [...state.layers, ...(entry.layers ?? [])]
      };
    } else if (entry.kind === 'member' && entry.member) {
      const restoredMemberships = (entry.memberships ?? []).filter((membership) =>
        state.projects.some((project) => project.id === membership.projectId && project.companyId === entry.member!.companyId)
      );
      state = {
        ...state,
        members: [...state.members, entry.member],
        projectMemberships: [
          ...state.projectMemberships,
          ...restoredMemberships.filter((membership) =>
            !state.projectMemberships.some((existing) => existing.projectId === membership.projectId && existing.userId === membership.userId)
          )
        ],
        projects: state.projects.map((p) =>
          restoredMemberships.some((membership) => membership.projectId === p.id) && !p.memberIds.includes(entry.member!.id)
            ? { ...p, memberIds: [...p.memberIds, entry.member!.id] }
            : p
        )
      };
    } else {
      return false;
    }
    state = { ...state, trash: state.trash.filter((item) => item.id !== entryId) };
    emit();
    return true;
  },


  addLayer(l: Omit<AnnotationLayer, 'id' | 'visible'> & { visible?: boolean }) {
    const rec: AnnotationLayer = { visible: true, ...l, id: `ly-${Date.now()}-${Math.round(Math.random() * 999)}` };
    state = { ...state, layers: [...state.layers, rec] };
    emit();
    return rec;
  },

  updateLayer(
    id: string,
    patch: Partial<Pick<AnnotationLayer, 'visible' | 'text' | 'src' | 'x' | 'y' | 'w' | 'h' | 'fs' | 'opacity' | 'rotation' | 'color' | 'pts'>>
  ) {
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

  startSession(projectId: string, version: string, hostId: string, title?: string, note?: string) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project || !authorize(state, hostId, 'projects.edit', { project })) return null;
    const stamp = localStamp();
    const existing = state.sessions.find((s) => s.projectId === projectId && s.version === version && !s.endedAt);
    if (existing) {
      if (!existing.participants.includes(hostId) || (title && !existing.title) || (note && !existing.note)) {
        state = {
          ...state,
          sessions: state.sessions.map((s) =>
            s.id === existing.id
              ? {
                  ...s,
                  participants: s.participants.includes(hostId) ? s.participants : [...s.participants, hostId],
                  title: title?.trim() || s.title,
                  note: note?.trim() || s.note
                }
              : s
          )
        };
        emit();
      }
      return existing;
    }
    const defaultTitle = title?.trim() || `Review Session · ${version}`;
    const rec: ReviewSession = {
      id: `se-${Date.now()}`,
      projectId,
      version,
      title: defaultTitle,
      note: note?.trim() || undefined,
      hostId,
      startedAt: stamp,
      participants: [hostId],
      controlRequests: [],
      commentIds: [],
      events: [{ id: `sev-${Date.now()}`, type: 'started', at: stamp, actorId: hostId, time: 0 }]
    };
    state = {
      ...state,
      sessions: [rec, ...state.sessions],
      projects: state.projects.map((project) =>
        project.id === projectId
          ? { ...project, activity: [activity(`Live review "${defaultTitle}" started on ${version}`, `بدأت جلسة المراجعة "${defaultTitle}" على ${version}`), ...project.activity] }
          : project
      )
    };
    emit();
    return rec;
  },

  updateSession(id: string, patch: Partial<Pick<ReviewSession, 'title' | 'note'>>, actorId?: string) {
    const target = state.sessions.find((session) => session.id === id);
    const project = target ? state.projects.find((item) => item.id === target.projectId) : undefined;
    if (!target || !project || (target.hostId !== actorId && !authorize(state, actorId, 'projects.edit', { project }))) return false;
    state = {
      ...state,
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s))
    };
    emit();
    return true;
  },

  takeSessionControl(id: string, nextActorId: string, actorId?: string) {
    const target = state.sessions.find((session) => session.id === id && !session.endedAt);
    const project = target ? state.projects.find((item) => item.id === target.projectId) : undefined;
    const managerTakingOwnControl = actorId === nextActorId && Boolean(project && authorize(state, actorId, 'projects.edit', { project }));
    if (!target || !project || (target.hostId !== actorId && !managerTakingOwnControl)) return false;
    if (target.hostId === actorId && nextActorId !== actorId && !target.controlRequests?.includes(nextActorId)) return false;
    const actor = state.members.find((member) => member.id === nextActorId)?.name ?? 'Reviewer';
    state = {
      ...state,
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              hostId: nextActorId,
              participants: session.participants.includes(nextActorId) ? session.participants : [...session.participants, nextActorId],
              controlRequests: (session.controlRequests ?? []).filter((requesterId) => requesterId !== nextActorId),
              events: [...(session.events ?? []), { id: `sev-${Date.now()}`, type: 'control_changed', at: localStamp(), actorId: nextActorId }]
            }
          : session
      ),
      projects: state.projects.map((project) =>
        project.id === target.projectId
          ? { ...project, activity: [activity(`${actor} took playback control on ${target.version}`, `${actor} استلم تحكم التشغيل على ${target.version}`), ...project.activity] }
          : project
      )
    };
    emit();
    return true;
  },

  requestSessionControl(id: string, actorId: string) {
    const target = state.sessions.find((session) => session.id === id && !session.endedAt);
    const project = target ? state.projects.find((item) => item.id === target.projectId) : undefined;
    const isGuest = actorId.startsWith('guest-');
    if (!target || !project || (!isGuest && !authorize(state, actorId, 'reviews.comment', { project })) || target.hostId === actorId || target.controlRequests?.includes(actorId)) return false;
    const actor = state.members.find((member) => member.id === actorId)?.name ?? 'Reviewer';
    state = {
      ...state,
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              controlRequests: [...(session.controlRequests ?? []), actorId],
              participants: session.participants.includes(actorId) ? session.participants : [...session.participants, actorId],
              events: [...(session.events ?? []), { id: `sev-${Date.now()}`, type: 'control_requested', at: localStamp(), actorId }]
            }
          : session
      ),
      projects: state.projects.map((project) =>
        project.id === target.projectId
          ? { ...project, activity: [activity(`${actor} requested playback control on ${target.version}`, `${actor} طلب تحكم التشغيل على ${target.version}`), ...project.activity] }
          : project
      )
    };
    emit();
    return true;
  },

  addSessionParticipants(id: string, participantIds: string[], actorId?: string) {
    const target = state.sessions.find((session) => session.id === id && !session.endedAt);
    if (!target || target.hostId !== actorId) return false;
    const participants = [...new Set([...target.participants, ...participantIds])];
    if (participants.length === target.participants.length) return true;
    state = {
      ...state,
      sessions: state.sessions.map((session) => (session.id === id ? { ...session, participants } : session))
    };
    emit();
    return true;
  },

  addSessionEvent(id: string, type: Extract<SessionEvent['type'], 'play' | 'pause' | 'seek'>, actorId: string, time: number) {
    const target = state.sessions.find((session) => session.id === id && !session.endedAt);
    if (!target || target.hostId !== actorId) return false;
    const last = target.events?.at(-1);
    if (last?.type === type && Math.abs((last.time ?? 0) - time) < 0.15) return true;
    state = {
      ...state,
      sessions: state.sessions.map((session) =>
        session.id === id
          ? { ...session, events: [...(session.events ?? []), { id: `sev-${Date.now()}`, type, at: localStamp(), actorId, time }] }
          : session
      )
    };
    emit();
    return true;
  },

  endSession(id: string, actorId?: string) {
    const target = state.sessions.find((session) => session.id === id);
    const project = target ? state.projects.find((item) => item.id === target.projectId) : undefined;
    if (!target || !project || (target.hostId !== actorId && !authorize(state, actorId, 'projects.edit', { project }))) return false;
    const endedAt = localStamp();
    const commentIds = state.comments
      .filter((comment) => comment.projectId === target.projectId && comment.version === target.version && comment.createdAt >= target.startedAt && comment.createdAt <= endedAt)
      .map((comment) => comment.id);
    const commentSnapshots = state.comments
      .filter((comment) => commentIds.includes(comment.id))
      .map((comment) => JSON.parse(JSON.stringify(comment)) as ReviewComment);
    state = {
      ...state,
      sessions: state.sessions.map((s) =>
        s.id === id
          ? {
              ...s,
              endedAt,
              commentIds,
              commentSnapshots,
              events: [...(s.events ?? []), { id: `sev-${Date.now()}`, type: 'ended', at: endedAt, actorId: s.hostId }]
            }
          : s
      ),
      projects: state.projects.map((project) =>
        project.id === target.projectId
          ? { ...project, activity: [activity(`Live review ended on ${target.version}`, `انتهت جلسة المراجعة المباشرة على ${target.version}`), ...project.activity] }
          : project
      )
    };
    emit();
    return true;
  },

  recordApproval(projectId: string, version: string, actorId: string, decision: ApprovalRecord['decision'], note?: string, authActor?: SessionUserLike) {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project || !project.versions.some((item) => item.v === version)) return null;
    if (authActor) {
      const actorMember = state.members.find((member) => member.id === authActor.id);
      if (authActor.id !== actorId || !actorMember || !projectInUserScope(state, authActor, project) || !memberEffectivePerms(actorMember, state.customRoles).has('approvals.grant')) return null;
    }

    const record: ApprovalRecord = {
      id: `ap-${Date.now()}`,
      projectId,
      version,
      actorId,
      decision,
      note: note?.trim() || undefined,
      createdAt: localStamp(),
      commentCount: state.comments.filter((comment) => comment.projectId === projectId && comment.version === version).length,
      resolvedCount: state.comments.filter((comment) => comment.projectId === projectId && comment.version === version && comment.resolved).length
    };
    const actor = state.members.find((member) => member.id === actorId)?.name ?? 'Client';
    const status: ProjectStatus = decision === 'approved' ? 'approved' : 'changes';
    const activity: ActivityItem = {
      time: localTime(),
      textEn: decision === 'approved' ? `${version} approved by ${actor}` : `${actor} requested changes on ${version}`,
      textAr: decision === 'approved' ? `${actor} اعتمد ${version}` : `${actor} طلب تعديلات على ${version}`
    };
    const decisionEntries = project.memberIds
      .filter((userId) => userId !== actorId)
      .map((userId) => ({
        userId,
        actorId,
        kind: 'decision' as NotificationKind,
        projectId,
        version,
        textEn: activity.textEn,
        textAr: activity.textAr
      }));

    state = {
      ...state,
      approvals: [record, ...state.approvals],
      projects: state.projects.map((item) =>
        item.id === projectId
          ? {
              ...item,
              status: item.currentVersion === version ? status : item.status,
              versions: item.versions.map((row) => (row.v === version ? { ...row, status } : row)),
              activity: [activity, ...item.activity]
            }
          : item
      ),
      notifications: pushNotifications(state, decisionEntries)
    };
    emit();
    return record;
  },

  updateCompanyBranding(id: string, patch: Partial<Pick<Company, 'logoUrl' | 'brandColor' | 'tagline'>>, actorId?: string) {
    const member = state.members.find((item) => item.id === actorId);
    if (!member || (member.roleId !== 'super_admin' && member.roleId !== 'company_admin') || (member.roleId !== 'super_admin' && member.companyId !== id)) return false;
    state = { ...state, companies: state.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    emit();
    return true;
  },

  markNotificationRead(id: string) {
    state = { ...state, notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) };
    emit();
  },

  markAllNotificationsRead(userId: string) {
    state = { ...state, notifications: state.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) };
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

export interface SessionUserLike {
  id: string;
  roleId: RoleId;
  companyId?: string;
  accountType?: AccountType;
}

function userCompanyId(state: AppState, user: SessionUserLike): string | undefined {
  return state.members.find((member) => member.id === user.id)?.companyId ?? user.companyId;
}

export function projectMembership(state: AppState, projectId: string, userId: string): ProjectMembership | undefined {
  return state.projectMemberships.find(
    (membership) => membership.projectId === projectId && membership.userId === userId && membership.status === 'active'
  );
}

export function projectMemberships(state: AppState, projectId: string): ProjectMembership[] {
  return state.projectMemberships.filter((membership) => membership.projectId === projectId && membership.status === 'active');
}

/**
 * Resource-level authorization shared by routes and mutations. Internal users
 * can work across their own company, while clients must be assigned to the
 * project. Guests are intentionally handled by the public review route.
 */
export function projectInUserScope(
  state: AppState,
  user: SessionUserLike | null | undefined,
  project: Project | null | undefined,
  options?: { requireMembership?: boolean }
): project is Project {
  if (!user || !project) return false;
  if (user.roleId === 'super_admin') return true;
  const companyId = userCompanyId(state, user);
  if (!companyId) return false;
  if (project.companyId && project.companyId !== companyId) return false;
  const liveMember = state.members.find((member) => member.id === user.id);
  const requiresMembership =
    Boolean(options?.requireMembership) ||
    memberAccountType(liveMember ?? { roleId: user.roleId, accountType: user.accountType }) === 'client' ||
    project.accessPolicy === 'assigned';
  return requiresMembership ? Boolean(projectMembership(state, project.id, user.id)) : true;
}

export function clientInUserScope(state: AppState, user: SessionUserLike | null | undefined, client: Client | null | undefined): client is Client {
  if (!user || !client) return false;
  if (user.roleId === 'super_admin') return true;
  const companyId = userCompanyId(state, user);
  return Boolean(companyId && (!client.companyId || client.companyId === companyId));
}

export function visibleProjects(state: AppState, user?: SessionUserLike | null): Project[] {
  if (!user || user.roleId === 'super_admin') return state.projects;
  return state.projects.filter((project) => projectInUserScope(state, user, project));
}

export function visibleClients(state: AppState, user?: SessionUserLike | null): Client[] {
  if (!user || user.roleId === 'super_admin') return state.clients;
  return state.clients.filter((client) => clientInUserScope(state, user, client));
}

export function memberEffectivePerms(member: MemberRecord | undefined, customRoles: CustomRole[]): Set<Perm> {
  if (!member) return new Set<Perm>();
  if (member.customRoleId) {
    const byId = new Map(customRoles.map((role) => [role.id, role]));
    const inherited = new Set<Perm>();
    const visit = (roleId: string | undefined, seen: Set<string>) => {
      if (!roleId || seen.has(roleId)) return;
      const role = byId.get(roleId);
      if (!role) return;
      seen.add(roleId);
      role.perms.forEach((perm) => inherited.add(perm));
      visit(role.parentId, seen);
    };
    visit(member.customRoleId, new Set<string>());
    return new Set([...inherited, ...(member.extraPerms ?? [])]);
  }
  return new Set([...(ROLE_PERMS[member.roleId] ?? []), ...(member.extraPerms ?? [])]);
}

export function authorize(
  state: AppState,
  actorId: string | undefined,
  perm: Perm,
  resource?: { project?: Project; client?: Client; companyId?: string }
): boolean {
  if (!actorId) return false;
  const member = state.members.find((item) => item.id === actorId);
  if (!member || member.status !== 'active') return false;
  const company = state.companies.find((item) => item.id === member.companyId);
  if (company?.status === 'suspended') return false;
  if (!memberEffectivePerms(member, state.customRoles).has(perm)) return false;
  const actor: SessionUserLike = { id: member.id, roleId: member.roleId, companyId: member.companyId, accountType: memberAccountType(member) };
  if (resource?.project && !projectInUserScope(state, actor, resource.project)) return false;
  if (resource?.client && !clientInUserScope(state, actor, resource.client)) return false;
  if (resource?.companyId && member.roleId !== 'super_admin' && member.companyId !== resource.companyId) return false;
  return true;
}

export const STATUS_CLASS: Record<ProjectStatus, string> = {
  editing: 'bg-sky-400/10 text-sky-300 border-sky-400/30',
  review: 'bg-accent/10 text-accent border-accent/30',
  changes: 'bg-orange-400/10 text-orange-300 border-orange-400/30',
  approved: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
};
