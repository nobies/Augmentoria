-- ====================================================
-- PostFlow Studio - Complete Supabase Database Schema
-- Run this in Supabase Dashboard -> SQL Editor
-- ====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. STUDIOS / WORKSPACES TABLE
create table if not exists public.studios (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Studio',
  tagline text default 'Post-Production Suite',
  primary_color text default '#3b82f6',
  secondary_color text default '#10b981',
  logo_url text,
  logo_url_dark text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROJECTS TABLE
create table if not exists public.projects (
  id text primary key,
  studio_id uuid references public.studios(id) on delete set null,
  name text not null,
  description text,
  fps numeric not null default 25,
  drop_frame boolean default false,
  start_timecode text default '01:00:00:00',
  status text default 'active', -- 'active' | 'review' | 'delivered' | 'archived'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. CUTS / VERSIONS TABLE
create table if not exists public.cuts (
  id text primary key,
  project_id text references public.projects(id) on delete cascade not null,
  name text not null,
  provider text not null default 'standalone', -- 'local' | 'drive' | 'youtube' | 'vimeo' | 'standalone' | 'compare'
  video_url text,
  video_url_b text,
  drive_file_id text,
  duration_seconds numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. REVIEW NOTES TABLE
create table if not exists public.notes (
  id text primary key,
  cut_id text references public.cuts(id) on delete cascade not null,
  category text not null default 'general', -- 'editorial' | 'vfx' | 'color' | 'sound' | 'general'
  preset_label text not null,
  text text,
  frame_number integer not null,
  timecode text not null,
  timecode_out text,
  frame_out integer,
  drawing_data text, -- Vector JSON or DataURL
  color_grade jsonb, -- { brightness, contrast, saturation, temperature, tint, hue, preset }
  still_image_url text,
  audio_url text,
  author_name text default 'Reviewer',
  is_resolved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. CLIENT SHARES TABLE (Magic Links)
create table if not exists public.client_shares (
  id uuid primary key default uuid_generate_v4(),
  token text unique not null,
  project_id text references public.projects(id) on delete cascade not null,
  cut_id text references public.cuts(id) on delete cascade not null,
  permissions jsonb not null default '{"canComment": true, "canDraw": true, "canGrade": true, "canVoice": true, "canExport": true, "viewOnly": false}'::jsonb,
  expires_at timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================
alter table public.studios enable row level security;
alter table public.projects enable row level security;
alter table public.cuts enable row level security;
alter table public.notes enable row level security;
alter table public.client_shares enable row level security;

-- Allow public read & write via Anon Key for Screener & Client Review Portal
create policy "Allow all on studios" on public.studios for all using (true) with check (true);
create policy "Allow all on projects" on public.projects for all using (true) with check (true);
create policy "Allow all on cuts" on public.cuts for all using (true) with check (true);
create policy "Allow all on notes" on public.notes for all using (true) with check (true);
create policy "Allow all on client_shares" on public.client_shares for all using (true) with check (true);

-- ====================================================
-- REALTIME ENABLEMENT
-- ====================================================
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.cuts;
alter publication supabase_realtime add table public.notes;

-- ====================================================
-- STORAGE BUCKETS SETUP
-- ====================================================
insert into storage.buckets (id, name, public)
values
  ('media-stills', 'media-stills', true),
  ('media-drawings', 'media-drawings', true),
  ('media-audio', 'media-audio', true)
on conflict (id) do nothing;

create policy "Public Stills Access" on storage.objects for all using (bucket_id = 'media-stills') with check (bucket_id = 'media-stills');
create policy "Public Drawings Access" on storage.objects for all using (bucket_id = 'media-drawings') with check (bucket_id = 'media-drawings');
create policy "Public Audio Access" on storage.objects for all using (bucket_id = 'media-audio') with check (bucket_id = 'media-audio');
