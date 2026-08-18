-- ==========================================================
-- MEDIA DASHBOARD & SCREENER DATABASE SCHEMA (Supabase SQL)
-- Run this in your Supabase SQL Editor (1-Click Setup)
-- ==========================================================

-- 1. Studios / Branding Configuration
CREATE TABLE IF NOT EXISTS studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Studio',
  tagline TEXT DEFAULT '',
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#10b981',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT DEFAULT '',
  fps NUMERIC NOT NULL DEFAULT 25,
  drop_frame BOOLEAN NOT NULL DEFAULT FALSE,
  start_timecode TEXT NOT NULL DEFAULT '01:00:00:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cuts / Versions Table
CREATE TABLE IF NOT EXISTS cuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Cut 1',
  provider TEXT NOT NULL DEFAULT 'local', -- 'local', 'drive', 'youtube', 'vimeo', 'standalone'
  video_url TEXT DEFAULT '',
  drive_file_id TEXT DEFAULT '',
  duration_seconds NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Review Notes & Markers Table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cut_id UUID REFERENCES cuts(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'editorial', -- 'editorial', 'vfx', 'color', 'sound', 'general'
  preset_label TEXT DEFAULT 'Flag',
  text TEXT NOT NULL DEFAULT '',
  frame_number BIGINT NOT NULL DEFAULT 0,
  timecode TEXT NOT NULL DEFAULT '01:00:00:00',
  timecode_out TEXT,
  frame_out BIGINT,
  drawing_data TEXT, -- JSON / base64 vector path or drawing overlay
  still_image_url TEXT, -- URL to snapshot image
  audio_url TEXT, -- URL or storage path for voice comment
  author_name TEXT DEFAULT 'Reviewer',
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Public access policies for simple multi-user setup
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all public access to studios" ON studios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access to projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access to cuts" ON cuts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all public access to notes" ON notes FOR ALL USING (true) WITH CHECK (true);
