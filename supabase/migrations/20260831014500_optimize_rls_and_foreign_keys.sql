begin;

-- Explicit deny policies document that the empty prototype tables are kept
-- only for rollback and are not part of the online application API.
create policy "Legacy table disabled" on public.legacy_client_shares
for all to authenticated using (false) with check (false);
create policy "Legacy table disabled" on public.legacy_cuts
for all to authenticated using (false) with check (false);
create policy "Legacy table disabled" on public.legacy_notes
for all to authenticated using (false) with check (false);
create policy "Legacy table disabled" on public.legacy_projects
for all to authenticated using (false) with check (false);
create policy "Legacy table disabled" on public.legacy_studios
for all to authenticated using (false) with check (false);

drop policy if exists "Users can view profiles in their companies or self" on public.profiles;
create policy "Users can view profiles in their companies or self"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or private.is_super_admin()
  or exists (
    select 1
    from public.company_memberships cm1
    join public.company_memberships cm2 on cm1.company_id = cm2.company_id
    where cm1.user_id = (select auth.uid())
      and cm2.user_id = profiles.id
  )
);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "Comment authors or admins can update comments" on public.review_comments;
create policy "Comment authors or admins can update comments"
on public.review_comments for update to authenticated
using (
  author_id = (select auth.uid())
  or private.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin']::text[])
)
with check (private.has_company_access(company_id));

drop policy if exists "Comment authors or admins can delete comments" on public.review_comments;
create policy "Comment authors or admins can delete comments"
on public.review_comments for delete to authenticated
using (
  author_id = (select auth.uid())
  or private.has_company_role(company_id, array['company_admin', 'account_manager', 'super_admin']::text[])
);

drop policy if exists "Authorized members can manage media jobs" on public.media_jobs;
drop policy if exists "Members can view media jobs" on public.media_jobs;

create policy "Members can view media jobs"
on public.media_jobs for select to authenticated
using (private.has_company_access(company_id));

create policy "Authorized members can insert media jobs"
on public.media_jobs for insert to authenticated
with check (
  private.has_company_role(
    company_id,
    array['company_admin', 'account_manager', 'creative', 'super_admin']::text[]
  )
);

create policy "Authorized members can update media jobs"
on public.media_jobs for update to authenticated
using (
  private.has_company_role(
    company_id,
    array['company_admin', 'account_manager', 'creative', 'super_admin']::text[]
  )
)
with check (
  private.has_company_role(
    company_id,
    array['company_admin', 'account_manager', 'creative', 'super_admin']::text[]
  )
);

create policy "Authorized members can delete media jobs"
on public.media_jobs for delete to authenticated
using (
  private.has_company_role(
    company_id,
    array['company_admin', 'account_manager', 'creative', 'super_admin']::text[]
  )
);

create index if not exists idx_activity_logs_company_id on public.activity_logs (company_id);
create index if not exists idx_activity_logs_user_id on public.activity_logs (user_id);
create index if not exists idx_approvals_asset_version_id_company_id on public.approvals (asset_version_id, company_id);
create index if not exists idx_approvals_company_id on public.approvals (company_id);
create index if not exists idx_approvals_project_id_company_id on public.approvals (project_id, company_id);
create index if not exists idx_approvals_reviewer_id on public.approvals (reviewer_id);
create index if not exists idx_approvals_session_id_company_id on public.approvals (session_id, company_id);
create index if not exists idx_asset_versions_asset_id_company_id on public.asset_versions (asset_id, company_id);
create index if not exists idx_asset_versions_company_id on public.asset_versions (company_id);
create index if not exists idx_asset_versions_uploaded_by on public.asset_versions (uploaded_by);
create index if not exists idx_assets_company_id on public.assets (company_id);
create index if not exists idx_assets_project_id_company_id on public.assets (project_id, company_id);
create index if not exists idx_clients_company_id on public.clients (company_id);
create index if not exists idx_clients_created_by on public.clients (created_by);
create index if not exists idx_company_memberships_user_id on public.company_memberships (user_id);
create index if not exists idx_media_jobs_asset_version_id_company_id on public.media_jobs (asset_version_id, company_id);
create index if not exists idx_media_jobs_company_id on public.media_jobs (company_id);
create index if not exists idx_project_memberships_user_id on public.project_memberships (user_id);
create index if not exists idx_projects_client_id_company_id on public.projects (client_id, company_id);
create index if not exists idx_projects_company_id on public.projects (company_id);
create index if not exists idx_projects_created_by on public.projects (created_by);
create index if not exists idx_review_annotations_comment_id on public.review_annotations (comment_id);
create index if not exists idx_review_comments_asset_version_id_company_id on public.review_comments (asset_version_id, company_id);
create index if not exists idx_review_comments_author_id on public.review_comments (author_id);
create index if not exists idx_review_comments_company_id on public.review_comments (company_id);
create index if not exists idx_review_comments_session_id_company_id on public.review_comments (session_id, company_id);
create index if not exists idx_review_session_items_asset_version_id on public.review_session_items (asset_version_id);
create index if not exists idx_review_sessions_company_id on public.review_sessions (company_id);
create index if not exists idx_review_sessions_host_user_id on public.review_sessions (host_user_id);
create index if not exists idx_review_sessions_project_id_company_id on public.review_sessions (project_id, company_id);
create index if not exists idx_share_links_company_id on public.share_links (company_id);
create index if not exists idx_share_links_session_id_company_id on public.share_links (session_id, company_id);
create index if not exists idx_tasks_asset_version_id_company_id on public.tasks (asset_version_id, company_id);
create index if not exists idx_tasks_assignee_id on public.tasks (assignee_id);
create index if not exists idx_tasks_comment_id_company_id on public.tasks (comment_id, company_id);
create index if not exists idx_tasks_company_id on public.tasks (company_id);
create index if not exists idx_tasks_project_id_company_id on public.tasks (project_id, company_id);

commit;
