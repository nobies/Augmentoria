-- ====================================================
-- Authentic Multi-Tenant RLS Isolation Test Script
-- Validates:
-- 1. True "authenticated" role with JWT claim context
-- 2. SELECT / UPDATE / DELETE isolation across companies
-- 3. Unauthorized INSERT attempts onto other companies (RLS WITH CHECK)
-- 4. Cross-tenant spoofing attempts (Composite Foreign Keys)
-- ====================================================

do $$
declare
  user_a_id uuid := gen_random_uuid();
  user_b_id uuid := gen_random_uuid();
  comp_a_id uuid := gen_random_uuid();
  comp_b_id uuid := gen_random_uuid();
  proj_a_id uuid := gen_random_uuid();
  proj_b_id uuid := gen_random_uuid();
  asset_a_id uuid := gen_random_uuid();
  asset_b_id uuid := gen_random_uuid();
  
  visible_count integer;
  updated_count integer;
  deleted_count integer;
  insert_failed boolean;
begin
  -- ----------------------------------------------------
  -- 1. SETUP (Run as admin / superuser)
  -- ----------------------------------------------------
  
  -- Create real auth.users test records
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values 
    (user_a_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_user_a@vortex.io', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (user_b_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test_user_b@socialeyes.io', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
  on conflict (id) do nothing;

  -- Create corresponding public.profiles
  insert into public.profiles (id, display_name, email, is_super_admin)
  values
    (user_a_id, 'Test User A (Vortex)', 'test_user_a@vortex.io', false),
    (user_b_id, 'Test User B (Socialeyes)', 'test_user_b@socialeyes.io', false);

  -- Create Companies
  insert into public.companies (id, name, slug)
  values
    (comp_a_id, 'Vortex Studios Alpha', 'vortex-alpha-test'),
    (comp_b_id, 'Socialeyes Beta', 'socialeyes-beta-test');

  -- Create Memberships
  insert into public.company_memberships (company_id, user_id, role, status)
  values
    (comp_a_id, user_a_id, 'company_admin', 'active'),
    (comp_b_id, user_b_id, 'company_admin', 'active');

  -- Create Projects for each company
  insert into public.projects (id, company_id, name)
  values
    (proj_a_id, comp_a_id, 'Vortex Alpha Confidential Project'),
    (proj_b_id, comp_b_id, 'Socialeyes Beta Confidential Project');

  -- Create Assets for each project
  insert into public.assets (id, company_id, project_id, name)
  values
    (asset_a_id, comp_a_id, proj_a_id, 'Vortex Master Cut Asset'),
    (asset_b_id, comp_b_id, proj_b_id, 'Socialeyes Master Cut Asset');

  -- ----------------------------------------------------
  -- 2. TEST SUITE: SIMULATE USER A CONTEXT
  -- ----------------------------------------------------
  
  -- Impersonate authenticated User A via JWT session variables
  set local role authenticated;
  execute format('set local "request.jwt.claim.sub" = %L', user_a_id::text);
  execute format('set local "request.jwt.claims" = %L', json_build_object('sub', user_a_id::text, 'role', 'authenticated')::text);

  -- TEST A1: User A SELECT projects -> Must see Project A ONLY (count = 1)
  select count(*) into visible_count from public.projects;
  if visible_count <> 1 then
    raise exception 'RLS VIOLATION (A1): User A sees % projects instead of exactly 1', visible_count;
  end if;

  -- TEST A2: User A SELECT specifically Project B -> Must return 0 rows
  select count(*) into visible_count from public.projects where id = proj_b_id;
  if visible_count <> 0 then
    raise exception 'CRITICAL RLS LEAK (A2): User A was able to read Project B from Company B!';
  end if;

  -- TEST A3: User A UPDATE Project B -> Must affect 0 rows
  update public.projects set name = 'Hacked by User A' where id = proj_b_id;
  get diagnostics updated_count = row_count;
  if updated_count <> 0 then
    raise exception 'CRITICAL RLS LEAK (A3): User A was able to update Project B from Company B!';
  end if;

  -- TEST A4: User A DELETE Project B -> Must affect 0 rows
  delete from public.projects where id = proj_b_id;
  get diagnostics deleted_count = row_count;
  if deleted_count <> 0 then
    raise exception 'CRITICAL RLS LEAK (A4): User A was able to delete Project B from Company B!';
  end if;

  -- TEST A5: User A attempts unauthorized INSERT into Company B -> Must be blocked by RLS WITH CHECK
  insert_failed := false;
  begin
    insert into public.projects (company_id, name) values (comp_b_id, 'Unauthorized Project by A');
  exception when others then
    insert_failed := true;
  end;
  if not insert_failed then
    raise exception 'CRITICAL RLS LEAK (A5): User A was able to insert a project into Company B!';
  end if;

  -- TEST A6: Cross-Tenant Spoofing Attempt (Insert Asset with company_id = A but project_id = Project B)
  insert_failed := false;
  begin
    insert into public.assets (company_id, project_id, name)
    values (comp_a_id, proj_b_id, 'Spoofed Tenant Asset');
  exception when others then
    insert_failed := true;
  end;
  if not insert_failed then
    raise exception 'CRITICAL INTEGRITY LEAK (A6): Spoofed tenant asset insertion succeeded across company boundaries!';
  end if;

  -- TEST A7: User A SELECT assets -> Must see Asset A ONLY (count = 1)
  select count(*) into visible_count from public.assets;
  if visible_count <> 1 then
    raise exception 'RLS VIOLATION (A7): User A sees % assets instead of exactly 1', visible_count;
  end if;

  -- ----------------------------------------------------
  -- 3. TEST SUITE: SIMULATE USER B CONTEXT
  -- ----------------------------------------------------
  
  -- Impersonate authenticated User B via JWT session variables
  execute format('set local "request.jwt.claim.sub" = %L', user_b_id::text);
  execute format('set local "request.jwt.claims" = %L', json_build_object('sub', user_b_id::text, 'role', 'authenticated')::text);

  -- TEST B1: User B SELECT projects -> Must see Project B ONLY (count = 1)
  select count(*) into visible_count from public.projects;
  if visible_count <> 1 then
    raise exception 'RLS VIOLATION (B1): User B sees % projects instead of exactly 1', visible_count;
  end if;

  -- TEST B2: User B SELECT specifically Project A -> Must return 0 rows
  select count(*) into visible_count from public.projects where id = proj_a_id;
  if visible_count <> 0 then
    raise exception 'CRITICAL RLS LEAK (B2): User B was able to read Project A from Company A!';
  end if;

  -- TEST B3: User B SELECT specifically Asset A -> Must return 0 rows
  select count(*) into visible_count from public.assets where id = asset_a_id;
  if visible_count <> 0 then
    raise exception 'CRITICAL RLS LEAK (B3): User B was able to read Asset A from Company A!';
  end if;

  -- ----------------------------------------------------
  -- 4. CLEANUP (Revert role & delete test records)
  -- ----------------------------------------------------
  reset role;
  
  delete from public.assets where id in (asset_a_id, asset_b_id);
  delete from public.projects where id in (proj_a_id, proj_b_id);
  delete from public.company_memberships where company_id in (comp_a_id, comp_b_id);
  delete from public.companies where id in (comp_a_id, comp_b_id);
  delete from public.profiles where id in (user_a_id, user_b_id);
  delete from auth.users where id in (user_a_id, user_b_id);

  raise notice 'TRUE RLS & COMPOSITE INTEGRITY TEST PASSED: Full cross-tenant isolation and anti-spoofing constraints verified.';
end $$;
