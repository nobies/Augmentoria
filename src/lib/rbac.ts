export type RoleId = 'super_admin' | 'company_admin' | 'am' | 'assistant' | 'ops' | 'designer' | 'client';

export type Perm =
  | 'companies.manage'
  | 'clients.manage'
  | 'members.manage'
  | 'roles.assign'
  | 'projects.create'
  | 'projects.edit'
  | 'team.manage'
  | 'versions.upload'
  | 'reviews.comment'
  | 'reviews.annotate'
  | 'approvals.grant'
  | 'reports.export';

export const ALL_PERMS: Perm[] = [
  'companies.manage',
  'clients.manage',
  'members.manage',
  'roles.assign',
  'projects.create',
  'projects.edit',
  'team.manage',
  'versions.upload',
  'reviews.comment',
  'reviews.annotate',
  'approvals.grant',
  'reports.export'
];

export const ROLE_PERMS: Record<RoleId, Perm[]> = {
  super_admin: [...ALL_PERMS],
  company_admin: [
    'clients.manage',
    'members.manage',
    'roles.assign',
    'projects.create',
    'projects.edit',
    'team.manage',
    'versions.upload',
    'reviews.comment',
    'reviews.annotate',
    'approvals.grant',
    'reports.export'
  ],
  am: ['clients.manage', 'projects.create', 'projects.edit', 'team.manage', 'versions.upload', 'reviews.comment', 'reviews.annotate', 'approvals.grant', 'reports.export'],
  assistant: ['versions.upload', 'reviews.comment', 'reviews.annotate', 'reports.export'],
  ops: ['projects.edit', 'team.manage', 'versions.upload', 'reviews.comment', 'reports.export'],
  designer: ['versions.upload', 'reviews.comment', 'reviews.annotate'],
  client: ['reviews.comment', 'reviews.annotate', 'approvals.grant']
};

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  roleId: RoleId;
  companyId: string;
  accountType?: 'internal' | 'client';
  title?: string;
  avatar?: string;
  extraPerms?: Perm[];
}

export const DEMO_USERS: DemoUser[] = [
  { id: 'u-sa', name: 'Super Admin', email: 'admin@augmentoria.app', roleId: 'super_admin', companyId: 'c-aroma', title: 'Platform Owner' },
  { id: 'u-ca', name: 'Karim Nasser', email: 'karim@aroma.studio', roleId: 'company_admin', companyId: 'c-aroma', title: 'Studio Director' },
  { id: 'u-mw', name: 'Mohamed Wageeh', email: 'm.wageeh@aroma.studio', roleId: 'am', companyId: 'c-aroma', title: 'Account Manager' },
  { id: 'u-na', name: 'Nour Adel', email: 'nour@aroma.studio', roleId: 'assistant', companyId: 'c-aroma', title: 'AM Assistant' },
  { id: 'u-ok', name: 'Omar Khaled', email: 'omar@aroma.studio', roleId: 'ops', companyId: 'c-aroma', title: 'Operations Manager' },
  { id: 'u-sh', name: 'Sara Hassan', email: 'sara@vodafone.com', roleId: 'client', companyId: 'c-aroma', title: 'Client Reviewer' },
  { id: 'u-ae', name: 'Ahmed Elkady', email: 'ahmed@aroma.studio', roleId: 'designer', companyId: 'c-aroma', title: 'Senior Motion Designer' },
  { id: 'u-ns', name: 'Nada Sherif', email: 'nada@socializr.app', roleId: 'company_admin', companyId: 'c-socializr', title: 'Studio Manager' }
];

export function effectivePerms(roleId: RoleId, extra?: Perm[]): Set<Perm> {
  return new Set([...(ROLE_PERMS[roleId] ?? []), ...(extra ?? [])]);
}

export const ROLE_KEY: Record<RoleId, string> = {
  super_admin: 'role_super_admin',
  company_admin: 'role_company_admin',
  am: 'role_am',
  assistant: 'role_assistant',
  ops: 'role_ops',
  designer: 'role_designer',
  client: 'role_client'
};
