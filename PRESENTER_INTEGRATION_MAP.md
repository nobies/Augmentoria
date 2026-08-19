# Presenter Platform Integration Map (`PRESENTER_INTEGRATION_MAP.md`)

**Target:** Multi-Tenant SaaS Integration Strategy  
**Purpose:** Define exact data flows, prop mappings, and database entity relationships to embed the Presenter review engine into the SaaS platform shell.

---

## 1. Domain Entity Hierarchy & Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    Platform Super Admin                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ (1 : N)
┌──────────────────────────────▼──────────────────────────────┐
│                    Companies / Tenants                      │
│      (Company Name, Brand Tokens, Storage Settings, Plan)   │
└──────────────┬───────────────────────────────┬──────────────┘
               │ (1 : N)                       │ (1 : N)
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│        Company Users        │ │           Clients           │
│ (Admin, Producer, Creative) │ │  (Client Company, Contacts) │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │ (1 : N)
                ┌──────────────▼──────────────┐
                │          Projects           │
                │ (Themed UI, FPS, Start TC)  │
                └──────────────┬──────────────┘
                               │ (1 : N)
                ┌──────────────▼──────────────┐
                │       Asset Library         │
                │ (Originals in Drive, Media) │
                └──────────────┬──────────────┘
                               │ (1 : N)
                ┌──────────────▼──────────────┐
                │       Asset Versions        │
                │ (v1, v2, Transcoded Proxies)│
                └──────────────┬──────────────┘
                               │ (N : N)
                ┌──────────────▼──────────────┐
                │       Review Sessions       │
                │  (Playlist of Assets/Cuts)  │
                └──────────────┬──────────────┘
                               │ (1 : N)
                ┌──────────────▼──────────────┐
                │   Review Notes & Drawings   │
                │(Timecode, Canvas, Grade, TC)│
                └─────────────────────────────┘
```

---

## 2. Presenter Component Prop & State Mapping

The table below maps how the existing Presenter components will consume real SaaS database entities when embedded into `/projects/[projectId]/review/[sessionId]`:

| Existing Presenter Component | Current Local / Mocked Input | Target SaaS Entity & Data Source |
| :--- | :--- | :--- |
| **`Header.tsx`** | Hardcoded `branding` state & project modal triggers. | `Company.branding` + `Client.name` + `Project.name` + `Session.title` + `User.role`. |
| **`VideoPlayer.tsx`** | `activeCut.videoUrl` / local `Blob` URL. | `AssetVersion.proxyUrl` (with signed CloudFront/S3/Drive URL) + `Project.fps`. |
| **`TimelineScrubber.tsx`** | Local `notes` array & `currentTime`. | `Session.activeAsset.notes` + `AssetVersion.durationSeconds`. |
| **`AnnotationCanvas.tsx`** | Raw HTML5 Canvas element / video frame. | Freeze-frame still capture, vector JSON uploaded to `Tenant/Projects/Drawings` storage. |
| **`ColorGradingPanel.tsx`**| Local `activeGrade` state. | Non-destructive `Note.colorGrade` JSON payload saved directly to session notes. |
| **`NotesList.tsx`** | Unauthenticated `authorName` string. | `Note.user` (with avatar, verified name, company role, or invited client badge). |
| **`ExportModal.tsx`** | Local in-memory export generator. | `Project` + `Client` + `Session` + `Notes` + `Company.branding` (PDF, EDL, CSV). |
| **`SessionPlaylistDrawer`** *(New)* | Single active cut. | `Session.playlistItems` (Array of assets and version selectors). |

---

## 3. Session State & Real-Time Sync Lifecycle

```
[User Connects to Review Session: /review/:sessionId]
                     │
                     ▼
  [Fetch Session Context & Permissions]
  (Validate JWT Token / User Session via Supabase Auth)
                     │
                     ▼
  [Mount Presenter Review Suite]
  ├── Play Video from AssetVersion.proxy_url
  ├── Load Playlist items for multi-shot navigation
  ├── Subscribe to Supabase Realtime Channel (`session_${sessionId}`)
  │     ├── Broadcast: `SEEK`, `PLAY`, `PAUSE` (Host playhead lock)
  │     ├── Presence: Connected Team Members & Clients
  │     └── Postgres Stream: Realtime comments & approvals
  └── Render Notes & Drawing Overlays
```

---

## 4. Theme & Branding Inheritance Engine

The Presenter will apply dynamic branding using CSS custom properties via the following cascade:

$$\text{Platform Defaults} \longrightarrow \text{Company Brand Tokens} \longrightarrow \text{Project/Client Theme} \longrightarrow \text{Presenter HUD}$$

1. **Company Level:** Custom Logo, Primary Accent (`--brand-primary`), Secondary Accent (`--brand-secondary`).
2. **Project / Client Level:** Client Logo, Project Name, Custom Theme Palette overrides.
3. **Session Viewport:** Clean darkroom container (`#090c13`) with client/project accent highlights on the LCD timecode and action buttons.
