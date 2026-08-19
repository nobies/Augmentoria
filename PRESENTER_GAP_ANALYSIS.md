# Presenter Layer Gap Analysis & SaaS Transformation Roadmap (`PRESENTER_GAP_ANALYSIS.md`)

**Date:** August 19, 2026  
**Document Purpose:** Identify architectural gaps between the current Presenter prototype and the target Multi-Tenant SaaS platform, assess technical risks, and define a strict implementation sequence.

---

## 1. Architectural Gap Analysis

| Domain / Capability | Current Presenter Prototype | Target Multi-Tenant SaaS Platform (Master Plan) | Priority |
| :--- | :--- | :--- | :--- |
| **Multi-Tenancy & Isolation** | Single global workspace; un-partitioned queries. | Strict `company_id` / `tenant_id` scoping on all tables, RLS policies, isolated namespaces. | **P0 (Phase 1)** |
| **Auth & RBAC** | Anonymous session / hardcoded `"Editor"`. | Role-Based Access Control (`Super Admin`, `Company Admin`, `Account Manager`, `Creative`, `Client Reviewer`). | **P0 (Phase 1)** |
| **Client Management** | Flat project list without client entity. | Client Directory with contacts, company logos, and assigned Account Managers. | **P0 (Phase 1)** |
| **Asset & Versioning** | Single `cuts` table holding video URLs or local files. | Structured Asset Library, version lineage (`v1`, `v2`), Google Drive original storage. | **P0 (Phase 1)** |
| **Proxy Transcoder** | Direct playback of uploaded/linked source. | External FFmpeg worker generating 720p/1080p browser-ready web proxies with signed URLs. | **P0 (Phase 1)** |
| **Session Playlists** | 1 cut per session. | Multi-asset project review playlists (navigate next/prev shot without switching links). | **P0 (Phase 1)** |
| **Token Security** | Unsigned client-side Base64 tokens. | Server-signed JWT/HMAC magic review links with expiration, tenant scope, and audit logging. | **P1 (Phase 1/2)** |
| **Approval Workflow** | Binary boolean `is_resolved`. | Formal sign-off gates (`Draft`, `Internal Review`, `Client Review`, `Changes Requested`, `Approved`). | **P1 (Phase 2)** |
| **Comment to Tasks** | Read-only note records. | Convert comments into assignable production tasks with assignees and due dates. | **P1 (Phase 2)** |

---

## 2. Technical Debt & Risk Register

### Risk 1: Monolithic Component State
* **Risk:** `page.tsx` and `VideoPlayer.tsx` maintain dozens of interdependent `useState` variables (playback time, in/out marks, modals, notes, real-time channels).
* **Mitigation:** Refactor playback and sync state into modular React Contexts / Custom Hooks (`usePlaybackSession`, `useNotesFeed`, `useRealtimeRoom`) before connecting SaaS platform tables.

### Risk 2: Heavy Client-Side Memory Usage with Blobs
* **Risk:** Storing full-length video Blobs in browser IndexedDB can exhaust device storage and fails for team collaboration.
* **Mitigation:** Transition all video references to cloud-hosted proxies (Google Drive / S3 / Supabase Storage with signed streaming endpoints).

### Risk 3: Breaking Existing Creative Tools during SaaS Refactor
* **Risk:** Refactoring the project/cut structure could inadvertently break the frame calculations or drawing coordinate systems.
* **Mitigation:** Preserve the exact SMPTE frame math in [`timecode.ts`](file:///Users/mohamedwageeh/Desktop/augmentria/src/lib/timecode.ts) and the exact 1920x1080 canvas coordinate mapping in [`AnnotationCanvas.tsx`](file:///Users/mohamedwageeh/Desktop/augmentria/src/components/AnnotationCanvas.tsx).

---

## 3. Explicit List of Behaviors That Must NOT Regress

The following verified features are guaranteed to remain fully functional throughout all subsequent phases:

1. **Multi-Provider Video Playback:**
   * YouTube IFrame playback, Vimeo Player API, and HTML5 video streaming must maintain playhead tracking and frame-accurate seeking.
2. **Dual-Source Compare Engine:**
   * All 5 comparison modes (`Split`, `Wipe`, `Fade`, `A Only`, `B Only`) must preserve synchronized dual-video playback.
3. **Freeze-Frame Annotation Engine:**
   * Overlay canvas drawing tools (Pen, Dynamic Arrow, Rectangle, Circle) must retain vector fidelity.
   * Watermark and image plate upload, scaling, rotation, opacity, and drag-and-drop must render identically on exported still snapshots.
4. **Non-Destructive Color Grading:**
   * Real-time CSS filter grading (exposure, contrast, saturation, temperature, tint) and film look presets must apply non-destructively to video frames and note previews.
5. **Multi-Format Export Engine:**
   * PDF production report generation (with embedded still snapshots and branding), CMX 3600 EDL markers, Premiere CSV, and SRT subtitles must output correct timecodes and formatting.
6. **Bi-Directional Real-Time Synchronization:**
   * Playhead seeking, play/pause broadcasts, and instant note creation/deletion across open review sessions must remain real-time via WebSockets.

---

## 4. Phase 1 Recommended Implementation Order

To cleanly evolve the Presenter into the full Multi-Tenant SaaS platform without regressions, Phase 1 should proceed in the following order:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Multi-Tenant Database Migration & Row Level Security    │
│    (companies, users, clients, projects, assets, sessions) │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Server-Side Authentication & RBAC Middleware             │
│    (Super Admin vs Company Admin vs Account Manager)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. Client & Project Management Dashboard Shell              │
│    (CRM client list, themed project creation, branding)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 4. Asset Library & Google Drive Proxy Pipeline              │
│    (Originals in Drive, async proxy worker job queue)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 5. Presenter Integration: Multi-Asset Session Playlists     │
│    (Embed existing Presenter into session route)            │
└─────────────────────────────────────────────────────────────┘
```
