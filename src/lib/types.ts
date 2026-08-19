export type UserRole =
  | 'super_admin'
  | 'company_admin'
  | 'account_manager'
  | 'creative'
  | 'client_reviewer'
  | 'guest';

export type ProjectStatus =
  | 'draft'
  | 'internal_review'
  | 'client_review'
  | 'changes_requested'
  | 'approved'
  | 'delivered'
  | 'archived';

export interface Company {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  brandPrimary: string;
  brandSecondary: string;
  logoUrl?: string;
  plan: 'starter' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  title?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  companyName: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  companyId: string;
  clientId?: string;
  name: string;
  description?: string;
  fps: number;
  dropFrame: boolean;
  startTimecode: string;
  status: ProjectStatus;
  primaryColor?: string;
  secondaryColor?: string;
  coverUrl?: string;
  assignedUserIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  projectId: string;
  companyId: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'document';
  driveFileId?: string;
  createdAt: string;
}

export interface AssetVersion {
  id: string;
  assetId: string;
  projectId: string;
  companyId: string;
  versionNumber: number;
  name: string;
  provider: 'local' | 'drive' | 'youtube' | 'vimeo' | 'standalone' | 'compare';
  videoUrl?: string;
  videoUrlB?: string;
  proxyUrl?: string;
  durationSeconds: number;
  uploadedByUserId: string;
  uploadedByUserName: string;
  createdAt: string;
}

export interface ReviewSession {
  id: string;
  projectId: string;
  companyId: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  playlistAssetIds: string[];
  hostUserId?: string;
  allowClientDraw: boolean;
  allowClientGrade: boolean;
  allowClientVoice: boolean;
  allowClientExport: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  companyId: string;
  projectId?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  createdAt: string;
}
