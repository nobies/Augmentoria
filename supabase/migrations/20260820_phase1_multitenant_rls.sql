-- ====================================================
-- Media Dashboard — Phase 1 Multi-Tenant Schema & Strict RLS
-- Migration: 20260820_phase1_multitenant_rls.sql
-- ====================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ====================================================
-- 0. IDEMPOTENT CONDITIONAL LEGACY PROTOTYPE TABLES RENAME
-- Only renames if legacy_* does not already exist AND public.projects is the old text-id structure
-- ====================================================
do $$
begin
  -- 1. Projects: Only rename if id is text (legacy structure) and legacy_projects does not exist
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'id' and data_type = 'text'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'legacy_projects'
  ) then
    alter table public.projects rename to legacy_projects;
  end if;

  -- 2. Cuts
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'cuts'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'legacy_cuts'
  ) then
    alter table public.cuts rename to legacy_cuts;
  end if;

  -- 3. Notes
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'notes'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'legacy_notes'
  ) then
    alter table public.notes rename to legacy_notes;
  end if;

  -- 4. Studios
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'studios'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'legacy_studios'
  ) then
    alter table public.studios rename to legacy_studios;
  end if;

  -- 5. Client Shares
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'client_shares'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'legacy_client_shares'
  ) then
    alter table public.client_shares rename to legacy_client_shares;
  end if;
end $$;

-- ====================================================
-- 1. MULTI-TENANT ENTITIES WITH COMPOSITE TENANT INTEGRITY
-- ====================================================

-- 1. COMPANIES (TENANTS)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'starter', -- 'starter' | 'pro' | 'enterprise'
  brand_primary text default '#3b82f6',
  brand_secondary text default '#10b981',
  logo_url text,
  website text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. PROFILES (USER ACCOUNTS)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'User',
  email text,
  avatar_url text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. COMPANY MEMBERSHIPS (RBAC)
create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'creative', -- 'super_admin' | 'company_admin' | 'account_manager' | 'creative' | 'client_reviewer' | 'guest'
  status text not null default 'active', -- 'active' | 'invited' | 'suspended'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, user_id)
);

-- 4. CLIENTS (CRM BRANDS)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  logo_url text,
  accent_color text default '#3b82f6',
  website text,
  industry text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id)
);

-- 5. PROJECTS (With composite tenant key)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid,
  name text not null,
  description text,
  fps numeric not null default 24,
  drop_frame boolean not null default false,
  start_timecode text not null default '01:00:00:00',
  color_space text default 'Rec.709',
  thumbnail_url text,
  status text not null default 'active', -- 'active' | 'in_review' | 'approved' | 'delivered' | 'archived'
  theme_json jsonb default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id),
  foreign key (client_id, company_id) references public.clients(id, company_id) on delete set null
);

-- 6. PROJECT MEMBERSHIPS
create table if not exists public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor',
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

-- 7. ASSETS (With strict composite tenant validation)
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null,
  name text not null,
  asset_type text not null default 'video', -- 'video' | 'audio' | 'still' | 'document'
  drive_file_id text,
  source_status text not null default 'ready', -- 'uploading' | 'processing' | 'ready' | 'error'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id),
  foreign key (project_id, company_id) references public.projects(id, company_id) on delete cascade
);

-- 8. ASSET VERSIONS (With strict composite tenant validation)
create table if not exists public.asset_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_id uuid not null,
  version_number integer not null default 1,
  name text not null default 'Cut 1',
  source_url text,
  proxy_url text,
  thumbnail_url text,
  duration_seconds numeric default 0,
  provider text not null default 'local', -- 'local' | 'youtube' | 'vimeo' | 'drive' | 'compare'
  processing_status text not null default 'ready', -- 'queued' | 'processing' | 'ready' | 'failed'
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id),
  foreign key (asset_id, company_id) references public.assets(id, company_id) on delete cascade
);

-- 9. REVIEW SESSIONS (PLAYLISTS & HUD SESSIONS)
create table if not exists public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null,
  title text not null default 'Client Review Session',
  host_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active', -- 'draft' | 'active' | 'closed' | 'archived'
  permissions jsonb not null default '{"canComment": true, "canDraw": true, "canGrade": true, "canVoice": true, "canExport": true, "viewOnly": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  unique(id, company_id),
  foreign key (project_id, company_id) references public.projects(id, company_id) on delete cascade
);

-- 10. REVIEW SESSION ITEMS (PLAYLIST ORDERING)
create table if not exists public.review_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  asset_version_id uuid not null references public.asset_versions(id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(session_id, asset_version_id)
);

-- 11. REVIEW COMMENTS & TIMELINE NOTES (With composite tenant validation)
create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  session_id uuid,
  asset_version_id uuid not null,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text default 'Reviewer',
  frame_number bigint not null default 0,
  timecode text not null default '01:00:00:00',
  frame_out bigint,
  timecode_out text,
  text text not null default '',
  category text not null default 'general', -- 'editorial' | 'vfx' | 'color' | 'sound' | 'general'
  preset_label text default 'Note',
  drawing_data text,
  color_grade jsonb,
  still_image_url text,
  audio_url text,
  status text not null default 'open', -- 'open' | 'in_progress' | 'resolved'
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, company_id),
  foreign key (session_id, company_id) references public.review_sessions(id, company_id) on delete cascade,
  foreign key (asset_version_id, company_id) references public.asset_versions(id, company_id) on delete cascade
);

-- 12. REVIEW ANNOTATIONS
create table if not exists public.review_annotations (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.review_comments(id) on delete cascade,
  drawing_vector_json text,
  snapshot_url text,
  created_at timestamptz not null default now()
);

-- 13. APPROVALS (With composite tenant validation)
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null,
  asset_version_id uuid,
  session_id uuid,
  reviewer_id uuid references public.profiles(id) on delete set null,
  status text not null default 'approved', -- 'approved' | 'changes_requested' | 'rejected'
  notes text,
  created_at timestamptz not null default now(),
  foreign key (project_id, company_id) references public.projects(id, company_id) on delete cascade,
  foreign key (asset_version_id, company_id) references public.asset_versions(id, company_id) on delete set null,
  foreign key (session_id, company_id) references public.review_sessions(id, company_id) on delete set null
);

-- 14. TASKS (With composite tenant validation)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null,
  asset_version_id uuid,
  comment_id uuid,
  assignee_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium', -- 'low' | 'medium' | 'high' | 'urgent'
  status text not null default 'todo', -- 'todo' | 'in_progress' | 'review' | 'done'
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (project_id, company_id) references public.projects(id, company_id) on delete cascade,
  foreign key (asset_version_id, company_id) references public.asset_versions(id, company_id) on delete set null,
  foreign key (comment_id, company_id) references public.review_comments(id, company_id) on delete set null
);

-- 15. ACTIVITY LOGS
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 16. SECURE SHARE LINKS (MAGIC REVIEWS)
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  session_id uuid not null,
  token_hash text unique not null,
  permissions jsonb not null default '{"canComment": true, "canDraw": true, "canGrade": true, "canVoice": true, "canExport": true}'::jsonb,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (session_id, company_id) references public.review_sessions(id, company_id) on delete cascade
);

-- 17. MEDIA JOBS (FFMPEG & PROXY PIPELINE)
create table if not exists public.media_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_version_id uuid not null,
  job_type text not null default 'proxy_transcode', -- 'proxy_transcode' | 'thumbnail_extract' | 'audio_waveform'
  status text not null default 'queued', -- 'queued' | 'processing' | 'ready' | 'failed' | 'cancelled'
  progress integer not null default 0, -- 0 - 100
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (asset_version_id, company_id) references public.asset_versions(id, company_id) on delete cascade
);

-- ====================================================
-- SAFE RLS HELPER FUNCTIONS (Explicit search_path & SECURITY DEFINER)
-- ====================================================

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_super_admin = true
  );
$$;

create or replace function public.has_company_access(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select (
    public.is_super_admin()
    or exists (
      select 1 from public.company_memberships
      where company_id = target_company_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );
$$;

create or replace function public.has_company_role(target_company_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select (
    public.is_super_admin()
    or exists (
      select 1 from public.company_memberships
      where company_id = target_company_id
        and user_id = auth.uid()
        and status = 'active'
        and role = any(allowed_roles)
    )
  );
$$;

create or replace function public.has_project_access(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and public.has_company_access(p.company_id)
  );
$$;

-- Revoke public execution and grant to authenticated and service_role only
revoke execute on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated, service_role;

revoke execute on function public.has_company_access(uuid) from public;
grant execute on function public.has_company_access(uuid) to authenticated, service_role;

revoke execute on function public.has_company_role(uuid, text[]) from public;
grant execute on function public.has_company_role(uuid, text[]) to authenticated, service_role;

revoke execute on function public.has_project_access(uuid) from public;
grant execute on function public.has_project_access(uuid) to authenticated, service_role;

-- ====================================================
-- ENABLE ROW LEVEL SECURITY
-- ====================================================
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_memberships enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.assets enable row level security;
alter table public.asset_versions enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_session_items enable row level security;
alter table public.review_comments enable row level security;
alter table public.review_annotations enable row level security;
alter table public.approvals enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_logs enable row level security;
alter table public.share_links enable row level security;
alter table public.media_jobs enable row level security;

-- ====================================================
-- RLS POLICIES (STRICT TENANT SCOPED WITH FULL WITH CHECK)
-- ====================================================

-- 1. Companies Policies
create policy "Users can view their companies"
  on public.companies for select
  using (public.has_company_access(id));

create policy "Company Admins can update their company"
  on public.companies for update
  using (public.has_company_role(id, array['company_admin', 'super_admin']))
  with check (public.has_company_role(id, array['company_admin', 'super_admin']));

-- 2. Profiles Policies
create policy "Users can view profiles in their companies or self"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_super_admin()
    or exists (
      select 1 from public.company_memberships cm1
      join public.company_memberships cm2 on cm1.company_id = cm2.company_id
      where cm1.user_id = auth.uid() and cm2.user_id = public.profiles.id
    )
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- 3. Company Memberships Policies
create policy "Users can view memberships of their companies"
  on public.company_memberships for select
  using (public.has_company_access(company_id));

create policy "Admins can insert memberships"
  on public.company_memberships for insert
  with check (public.has_company_role(company_id, array['company_admin', 'super_admin']));

create policy "Admins can update memberships"
  on public.company_memberships for update
  using (public.has_company_role(company_id, array['company_admin', 'super_admin']))
  with check (public.has_company_role(company_id, array['company_admin', 'super_admin']));

create policy "Admins can delete memberships"
  on public.company_memberships for delete
  using (public.has_company_role(company_id, array['company_admin', 'super_admin']));

-- 4. Clients Policies
create policy "Members can view company clients"
  on public.clients for select
  using (public.has_company_access(company_id));

create policy "Admins and Managers can insert clients"
  on public.clients for insert
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin']));

create policy "Admins and Managers can update clients"
  on public.clients for update
  using (public.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin']))
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin']));

create policy "Admins and Managers can delete clients"
  on public.clients for delete
  using (public.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin']));

-- 5. Projects Policies
create policy "Members can view company projects"
  on public.projects for select
  using (public.has_company_access(company_id));

create policy "Authorized members can insert projects"
  on public.projects for insert
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));

create policy "Authorized members can update projects"
  on public.projects for update
  using (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']))
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));

create policy "Admins can delete projects"
  on public.projects for delete
  using (public.has_company_role(company_id, array['company_admin', 'super_admin']));

-- 6. Assets & Asset Versions Policies
create policy "Members can view assets"
  on public.assets for select
  using (public.has_company_access(company_id));

create policy "Authorized members can insert assets"
  on public.assets for insert
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));

create policy "Authorized members can update assets"
  on public.assets for update
  using (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']))
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));

create policy "Admins can delete assets"
  on public.assets for delete
  using (public.has_company_role(company_id, array['company_admin', 'super_admin']));

create policy "Members can view asset versions"
  on public.asset_versions for select
  using (public.has_company_access(company_id));

create policy "Authorized members can insert asset versions"
  on public.asset_versions for insert
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));

create policy "Authorized members can update asset versions"
  on public.asset_versions for update
  using (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']))
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));

create policy "Admins can delete asset versions"
  on public.asset_versions for delete
  using (public.has_company_role(company_id, array['company_admin', 'super_admin']));

-- 7. Review Sessions Policies
create policy "Members can view review sessions"
  on public.review_sessions for select
  using (public.has_company_access(company_id));

create policy "Authorized members can insert review sessions"
  on public.review_sessions for insert
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));

create policy "Authorized members can update review sessions"
  on public.review_sessions for update
  using (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']))
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));

create policy "Admins can delete review sessions"
  on public.review_sessions for delete
  using (public.has_company_role(company_id, array['company_admin', 'super_admin']));

-- 8. Review Session Items Policies
create policy "Members can view session items"
  on public.review_session_items for select
  using (
    exists (
      select 1 from public.review_sessions rs
      where rs.id = public.review_session_items.session_id
        and public.has_company_access(rs.company_id)
    )
  );

create policy "Authorized members can insert session items"
  on public.review_session_items for insert
  with check (
    exists (
      select 1 from public.review_sessions rs
      where rs.id = public.review_session_items.session_id
        and public.has_company_role(rs.company_id, array['company_admin', 'account_manager', 'creative', 'super_admin'])
    )
  );

create policy "Authorized members can delete session items"
  on public.review_session_items for delete
  using (
    exists (
      select 1 from public.review_sessions rs
      where rs.id = public.review_session_items.session_id
        and public.has_company_role(rs.company_id, array['company_admin', 'account_manager', 'creative', 'super_admin'])
    )
  );

-- 9. Review Comments & Annotations Policies
create policy "Members can view review comments"
  on public.review_comments for select
  using (public.has_company_access(company_id));

create policy "Members can insert review comments"
  on public.review_comments for insert
  with check (public.has_company_access(company_id));

create policy "Comment authors or admins can update comments"
  on public.review_comments for update
  using (
    author_id = auth.uid()
    or public.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin'])
  )
  with check (public.has_company_access(company_id));

create policy "Comment authors or admins can delete comments"
  on public.review_comments for delete
  using (
    author_id = auth.uid()
    or public.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin'])
  );

create policy "Members can view review annotations"
  on public.review_annotations for select
  using (
    exists (
      select 1 from public.review_comments rc
      where rc.id = public.review_annotations.comment_id
        and public.has_company_access(rc.company_id)
    )
  );

create policy "Members can insert review annotations"
  on public.review_annotations for insert
  with check (
    exists (
      select 1 from public.review_comments rc
      where rc.id = public.review_annotations.comment_id
        and public.has_company_access(rc.company_id)
    )
  );

-- 10. Approvals & Tasks Policies
create policy "Members can view company approvals"
  on public.approvals for select
  using (public.has_company_access(company_id));

create policy "Authorized members can insert approvals"
  on public.approvals for insert
  with check (public.has_company_access(company_id));

create policy "Members can view company tasks"
  on public.tasks for select
  using (public.has_company_access(company_id));

create policy "Authorized members can insert tasks"
  on public.tasks for insert
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));

create policy "Authorized members can update tasks"
  on public.tasks for update
  using (public.has_company_access(company_id))
  with check (public.has_company_access(company_id));

-- 11. Activity Logs Policies
create policy "Members can view company activity logs"
  on public.activity_logs for select
  using (public.has_company_access(company_id));

create policy "Members can insert activity logs"
  on public.activity_logs for insert
  with check (public.has_company_access(company_id));

-- 12. Share Links Policies
create policy "Members can view share links"
  on public.share_links for select
  using (public.has_company_access(company_id));

create policy "Authorized members can insert share links"
  on public.share_links for insert
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin']));

create policy "Authorized members can update share links"
  on public.share_links for update
  using (public.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin']))
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin']));

-- 13. Media Jobs Policies
create policy "Members can view media jobs"
  on public.media_jobs for select
  using (public.has_company_access(company_id));

create policy "Authorized members can manage media jobs"
  on public.media_jobs for all
  using (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']))
  with check (public.has_company_role(company_id, array['company_admin', 'account_manager', 'creative', 'super_admin']));
