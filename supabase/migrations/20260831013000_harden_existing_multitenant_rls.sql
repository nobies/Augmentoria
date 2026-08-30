-- Harden the already-provisioned multi-tenant schema without changing data.
-- Helper functions live outside the exposed public schema so they cannot be
-- invoked as arbitrary Data API RPC endpoints.

begin;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated, service_role;

alter function public.is_super_admin() set schema private;
alter function public.has_company_access(uuid) set schema private;
alter function public.has_company_role(uuid, text[]) set schema private;
alter function public.has_project_access(uuid) set schema private;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_super_admin = true
  );
$$;

create or replace function private.has_company_access(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    private.is_super_admin()
    or exists (
      select 1
      from public.company_memberships
      where company_id = target_company_id
        and user_id = (select auth.uid())
        and status = 'active'
    )
  );
$$;

create or replace function private.has_company_role(target_company_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    private.is_super_admin()
    or exists (
      select 1
      from public.company_memberships
      where company_id = target_company_id
        and user_id = (select auth.uid())
        and status = 'active'
        and role = any(allowed_roles)
    )
  );
$$;

create or replace function private.has_project_access(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and private.has_company_access(p.company_id)
  );
$$;

revoke all on function private.is_super_admin() from public, anon;
revoke all on function private.has_company_access(uuid) from public, anon;
revoke all on function private.has_company_role(uuid, text[]) from public, anon;
revoke all on function private.has_project_access(uuid) from public, anon;
grant execute on function private.is_super_admin() to authenticated, service_role;
grant execute on function private.has_company_access(uuid) to authenticated, service_role;
grant execute on function private.has_company_role(uuid, text[]) to authenticated, service_role;
grant execute on function private.has_project_access(uuid) to authenticated, service_role;

drop policy if exists "Members can view project memberships" on public.project_memberships;
create policy "Members can view project memberships"
on public.project_memberships
for select
to authenticated
using (private.has_project_access(project_id));

drop policy if exists "Managers can insert project memberships" on public.project_memberships;
create policy "Managers can insert project memberships"
on public.project_memberships
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and private.has_company_role(
        p.company_id,
        array['company_admin', 'account_manager', 'super_admin']::text[]
      )
  )
);

drop policy if exists "Managers can update project memberships" on public.project_memberships;
create policy "Managers can update project memberships"
on public.project_memberships
for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and private.has_company_role(
        p.company_id,
        array['company_admin', 'account_manager', 'super_admin']::text[]
      )
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and private.has_company_role(
        p.company_id,
        array['company_admin', 'account_manager', 'super_admin']::text[]
      )
  )
);

drop policy if exists "Managers can delete project memberships" on public.project_memberships;
create policy "Managers can delete project memberships"
on public.project_memberships
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and private.has_company_role(
        p.company_id,
        array['company_admin', 'account_manager', 'super_admin']::text[]
      )
  )
);

-- The old prototype tables are empty and superseded by the UUID schema.
-- Remove their blanket public policies, but preserve the tables for rollback.
drop policy if exists "Allow all on client_shares" on public.legacy_client_shares;
drop policy if exists "Allow all on cuts" on public.legacy_cuts;
drop policy if exists "Allow all on notes" on public.legacy_notes;
drop policy if exists "Allow all on projects" on public.legacy_projects;
drop policy if exists "Allow all on studios" on public.legacy_studios;

revoke all on table public.legacy_client_shares from anon, authenticated;
revoke all on table public.legacy_cuts from anon, authenticated;
revoke all on table public.legacy_notes from anon, authenticated;
revoke all on table public.legacy_projects from anon, authenticated;
revoke all on table public.legacy_studios from anon, authenticated;

commit;
