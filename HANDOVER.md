# PostFlow Studio (Augmentoria) — Project Handover Document

**Version:** 1.0.0-PROD  
**Repository:** [https://github.com/nobies/Augmentoria](https://github.com/nobies/Augmentoria)  
**Live Production URL:** [https://augmentoria-sooty.vercel.app](https://augmentoria-sooty.vercel.app)  
**Cloud Database:** Supabase (`ygdqiuvysbkcdnoxjgxv`)  
**Target Environment:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + Lucide Icons + Supabase + Vercel

---

## 1. Executive Summary & System Vision

**PostFlow Studio** is a real-time, browser-based, broadcast-grade post-production and media review platform. Built for film directors, editors, VFX supervisors, colorists, and clients, the platform bridges creative workflows with instant client collaboration.

The platform provides a suite of modular post-production tools, starting with the **Professional Screener Tool** (real-time synchronized review, annotations, color grading, audio notes, and comparison engine).

---

## 2. Live Cloud Infrastructure & Deployment

```
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│     Local Codebase      │ ───►  │     GitHub Repo         │ ───►  │    Vercel Deployment    │
│  (Next.js / TypeScript) │       │ (nobies/Augmentoria)    │       │ (Auto CI/CD on Push)    │
└─────────────────────────┘       └─────────────────────────┘       └────────────┬────────────┘
                                                                                 │
                                                                   ┌─────────────▼────────────┐
                                                                   │     Supabase Cloud DB    │
                                                                   │ (Postgres + Realtime WS) │
                                                                   └──────────────────────────┘
```

| Service | Destination / Identifier | Role |
| :--- | :--- | :--- |
| **GitHub** | `https://github.com/nobies/Augmentoria` | Source Code Versioning & Main branch CI/CD |
| **Vercel** | `https://augmentoria-sooty.vercel.app` | Global Edge Production Hosting |
| **Supabase** | `https://ygdqiuvysbkcdnoxjgxv.supabase.co` | Cloud PostgreSQL, Realtime Replication & Storage |

### Environment Variables (`.env.local` / Vercel Settings)
```env
NEXT_PUBLIC_SUPABASE_URL=https://ygdqiuvysbkcdnoxjgxv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_rb2otWUPrMU6UzvR1PDJQg_hNasGrv8
```

---

## 3. Core Architecture & Implemented Features

### 3.1 Multi-Provider Video Playback Engine
* **YouTube**: Fully integrated via YouTube IFrame API with playhead polling, seek sync, shuttle stepping, volume control, and maxres poster fallback.
* **Vimeo**: Embedded Vimeo Player API with thumbnail fetcher and frame-level seek control.
* **Local & Web MP4**: HTML5 hardware-accelerated video tag with IndexedDB blob caching.
* **Dual-Source Compare Engine**: Synchronized playback of Cut A vs Cut B across 5 modes:
  1. `Split` — Side-by-side synchronized comparison.
  2. `Wipe` — Interactive draggable curtain divider with position slider.
  3. `Fade` — Dual-layer dissolve with opacity percentage slider.
  4. `A Only` / `B Only` — 1-click instantaneous source switching.

### 3.2 Freeze-Frame Annotation & Watermarking
* **Transparent Overlay Canvas**: `AnnotationCanvas` overlays directly on top of the paused video frame at the exact current timecode.
* **Markup Tools**: Brush/Pen, Dynamic Arrow, Bounding Box, Circle/Ellipse with color palette and stroke width control.
* **Image Plate & Watermark Placement**: Drag-to-position, Scale (20%–250%), Rotate (-180° to +180°), Opacity (10%–100%), and reset tools.
* **Playback Integration**: Drawings render automatically when reaching the note's timecode/range or upon clicking the note card in `NotesList`, with a floating `Drawing ON / OFF` toggle.

### 3.3 Live Color Grading & Film Looks
* **Non-Destructive Grading**: Frame-level and range-level color grading attached directly to review notes.
* **Controls**: Exposure/Brightness, Contrast, Saturation, Color Temperature Wash (Warm orange / Cool blue), and Tint Wash (Magenta / Green).
* **Film Presets**: *Teal & Orange*, *Cinematic Warm*, *Nordic Noir*, *Bleach Bypass*, *Vintage Film*, *Black & White*, *Punchy Vivid*.
* **Notes Badging**: Visual look badge on note cards (`Look: Teal & Orange`) with 1-click seek and live preview.

### 3.4 Magic Links & Client Review Portal (`/review/[token]`)
* **Passwordless Security**: Self-contained UTF-8 Base64URL tokens carrying project metadata, cut details, notes, and branding.
* **Cross-Browser Hydration**: Opens reliably on Chrome, Edge, Safari, and mobile without requiring prior local database state.
* **Granular Permissions**: Configurable access matrix (`canComment`, `canDraw`, `canGrade`, `canVoice`, `canExport`, `viewOnly`).

### 3.5 Bi-Directional Real-Time Session Sync
* **Supabase Realtime WebSockets**: Broadcast channel for instantaneous playhead seeking, playback state (Play/Pause), and presence.
* **Postgres Changes Stream (`postgres_changes`)**: Instant server-push when notes are added, edited, or resolved by any party.
* **High-Frequency Auto-Sync (2s Polling)**: Zero-refresh background polling fallback ensuring 100% data freshness under fluctuating networks.
* **Author Attribution**: Live reviewer name switcher with author badges (`👤 Editor`, `👤 Client (Ahmed)`) on all comments.

### 3.6 Multi-Format Export Engine
* **PDF Report**: Formatted production report containing video stills, drawn annotations, timecodes, categories, author names, and custom studio branding.
* **EDL (Edit Decision List)**: Industry-standard EDL for importing markers into Premiere Pro, DaVinci Resolve, and Final Cut Pro.
* **CSV / Text**: Tabular exports for production tracking and project management.

---

## 4. Supabase Database Schema

The database schema is defined in [`supabase_schema.sql`](file:///c:/apps/Media%20Dashboard/supabase_schema.sql):

```sql
-- Studios / Workspaces
create table public.studios (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  tagline text,
  primary_color text default '#3b82f6',
  secondary_color text default '#10b981',
  logo_url text,
  created_at timestamp with time zone default now()
);

-- Projects
create table public.projects (
  id text primary key,
  studio_id uuid references public.studios(id),
  name text not null,
  description text,
  fps numeric default 25,
  drop_frame boolean default false,
  start_timecode text default '01:00:00:00',
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Cuts / Media Versions
create table public.cuts (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  name text not null,
  provider text not null default 'standalone',
  video_url text,
  video_url_b text,
  duration_seconds numeric default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Review Notes
create table public.notes (
  id text primary key,
  cut_id text references public.cuts(id) on delete cascade,
  category text not null,
  preset_label text not null,
  text text,
  frame_number integer not null,
  timecode text not null,
  timecode_out text,
  frame_out integer,
  drawing_data text,
  color_grade jsonb,
  still_image_url text,
  audio_url text,
  author_name text default 'Reviewer',
  is_resolved boolean default false,
  created_at timestamp with time zone default now()
);

-- Magic Client Shares
create table public.client_shares (
  id uuid primary key default uuid_generate_v4(),
  token text unique not null,
  project_id text references public.projects(id) on delete cascade,
  cut_id text references public.cuts(id) on delete cascade,
  permissions jsonb not null,
  created_at timestamp with time zone default now()
);
```

---

## 5. File Structure Map

```
c:/apps/Media Dashboard/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main Studio Hub & Screener Workspace
│   │   ├── layout.tsx                # App Root Layout & Dark Theme Provider
│   │   ├── globals.css               # Tailwind & Global Styles
│   │   ├── review/[token]/page.tsx   # Passwordless Client Review Portal
│   │   └── api/
│   │       ├── thumbnail/route.ts    # Vimeo/YouTube Thumbnail Proxy
│   │       ├── upload/route.ts       # Video & Audio File Upload Handler
│   │       └── video/[id]/route.ts   # Streaming Media Handler
│   ├── components/
│   │   ├── Header.tsx                # Action Bar & Cloud Sync Status Badge
│   │   ├── VideoPlayer.tsx           # Multi-Provider Player & Compare Engine
│   │   ├── TimelineScrubber.tsx      # Precision Scrubber & Note Markers
│   │   ├── PresetKeys.tsx            # Tactile Preset Buttons Console
│   │   ├── NotesList.tsx             # Review Notes Feed & Author Attribution
│   │   ├── AnnotationCanvas.tsx      # Freeze-Frame Transparent Drawing Overlay
│   │   ├── ColorGradingPanel.tsx     # Color Correction & Film Look Presets
│   │   ├── VoiceRecorder.tsx         # Voice Note Microphone Capture
│   │   ├── AssetManagerModal.tsx     # Project Video Asset & Version Drawer
│   │   ├── ShareModal.tsx            # Magic Link Encoder & Permissions Matrix
│   │   ├── ExportModal.tsx           # PDF / EDL / CSV Report Generator
│   │   ├── ProjectManagerModal.tsx   # Project Creation & Cut Switcher
│   │   ├── StudioBrandingModal.tsx   # Custom Logo & Accent Color Customizer
│   │   └── NotekeysModal.tsx         # Custom Preset Key Category Editor
│   └── lib/
│       ├── supabase.ts               # Supabase Client & Shared TypeScript Types
│       ├── storage.ts                # Cloud Supabase & Local IndexedDB Sync Engine
│       ├── realtimeSync.ts           # WebSockets, Postgres Changes & Auto-Sync
│       ├── timecode.ts               # SMPTE Timecode Calculator (FPS & DropFrame)
│       ├── videoUtils.ts             # YouTube & Vimeo Provider Detectors
│       └── pdfExport.ts              # PDF Report Layout & jsPDF Generator
├── supabase_schema.sql               # Supabase Database Initialization Script
├── .env.example                      # Template Environment Variables
├── package.json                      # Dependencies & NPM Scripts
└── README.md                         # Project Readme
```

---

## 6. Development & Operational Commands

```bash
# Install Dependencies
npm install

# Start Local Dev Server
npm run dev

# Run Production Build
npm run build

# Push Changes to GitHub (Triggers Automatic Vercel Deployment)
git add .
git commit -m "your commit message"
git push origin main
```

---

## 7. Next Phase Roadmap (Platform Shell Expansion)

1. **Authentication & Multi-Tenant Workspaces**:
   - User registration (`/register`), login (`/login`), and studio onboarding.
2. **Client Management CRM (`/clients`)**:
   - Client directory with company logos, primary contacts, and assigned Account Managers.
3. **Team & Permissions Management (`/team`)**:
   - Role-based access control (`Owner`, `Admin`, `Account Manager`, `Designer`, `Viewer`).
4. **Multi-Project Hub (`/projects`)**:
   - Kanban/Grid project dashboard with status filters (`Active`, `In Review`, `Delivered`, `Archived`) and direct 1-click access to the Screener tool suite.
