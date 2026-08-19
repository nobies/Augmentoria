# Presenter Design System & UI Guide (`PRESENTER_DESIGN_GUIDE.md`)

**Target:** PostFlow Studio / Augmentoria UI Design System  
**Framework:** Tailwind CSS + Lucide Icons + CSS Custom Properties  

---

## 1. Design Philosophy & Layout Strategy

The Presenter interface is engineered specifically for **broadcast, editing suites, and darkroom post-production environments**. 
* **Zero-Scroll Viewport:** The entire application strictly fills `100vh` (`h-screen overflow-hidden`) without document-level window scrolling. All sub-panels and drawers scroll independently with thin, subdued scrollbars.
* **Tactile Hardware Aesthetic:** Controls resemble professional hardware consoles (e.g., DaVinci Fairlight / Blackmagic Speed Editor) with crisp borders, glowing LCD displays, and tactile click states (`active:scale-95`).
* **Non-Destructive Creative Feedback:** Floating HUDs and overlays provide immediate visual feedback while maintaining complete transparency over the video playhead.

---

## 2. Color Tokens & Palette

### 2.1 Surfaces & Neutrals (Dark Mode First)
| Token Name | Hex Value | Tailwind Equivalent | Usage / Application |
| :--- | :--- | :--- | :--- |
| `surface-app-bg` | `#090c13` | `bg-[#090c13]` | Root application background. |
| `surface-header` | `#0c1018` | `bg-[#0c1018]` | Top navigation header and action bars. |
| `surface-panel` | `#0b0e16` | `bg-[#0b0e16]` | Main player housing and video container wrapper. |
| `surface-card` | `#111622` | `bg-[#111622]` | Note cards, tool drawers, modal containers. |
| `surface-button` | `#141b29` | `bg-[#141b29]` | Interactive preset buttons, input backgrounds. |
| `surface-button-hover`| `#1f283d` | `bg-[#1f283d]` | Button hover state background. |
| `border-subtle` | `#1c2438` | `border-[#1c2438]` | Structural column dividers and header borders. |
| `border-default` | `#1e273b` | `border-[#1e273b]` | Standard card outlines and player container border. |
| `border-interactive`| `#232d44` | `border-[#232d44]` | Button outlines and input borders. |

---

### 2.2 Semantic & Category Accents
| Category / Accent | Hex Value | Category Mapping | Visual Treatment |
| :--- | :--- | :--- | :--- |
| **Primary (Blue)** | `#3b82f6` | General / Active Selection | Active tool indicator, LCD timecode, scrub head, primary CTAs. |
| **Editorial (Red)** | `#ef4444` | Editorial Cuts & Trims | Note dot, preset button left accent border, delete buttons. |
| **VFX (Sky Blue)** | `#38bdf8` | VFX & Graphics Markers | Note dot, preset category button accent. |
| **Color (Amber)** | `#f59e0b` | Color Grading & Looks | Note dot, preset category button accent, Look badges. |
| **Sound (Emerald)** | `#10b981` | Audio & Voice Comments | Note dot, preset category button accent, resolved state badge. |
| **Special / Watermark (Purple)** | `#8b5cf6` | Placed Plates & Compare | Compare mode active state, watermark transform HUD. |

---

## 3. Typography & Text Conventions

* **Primary Font:** System Inter / Sans-Serif (`font-sans` / `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).
* **Timecode / Technical Monospace:** Monospace (`font-mono` / `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`).
  * **LCD Timecode:** `font-mono text-xl font-black text-blue-400 tracking-widest drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]`.
  * **FPS / DropFrame Badges:** `text-[9px] font-mono font-bold text-slate-400`.
  * **In/Out Timecode Stamps:** `text-[10px] font-mono text-slate-400`.

---

## 4. Component Patterns & Visual Rules

### 4.1 Modals & Dialogs
* Centered fixed overlays (`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm`).
* Inner container: `bg-[#0e131f] border border-[#232d44] rounded-2xl p-6 shadow-2xl max-w-xl w-full text-slate-100`.
* Action Buttons: Right-aligned cancel/confirm footer with `active:scale-95` micro-interaction.

### 4.2 Tactile Preset Buttons (`PresetKeys.tsx`)
* Button layout: Grid with `grid-cols-4 sm:grid-cols-5 gap-1.5`.
* Base style: `px-2 py-2 rounded-xl bg-[#121824] hover:bg-[#1a2233] border border-[#1e273b] hover:border-slate-600 transition text-left flex flex-col justify-between`.
* Left category accent: 3px left border or colored badge matching the category token.

### 4.3 Notes List Card (`NotesList.tsx`)
* Base style: `p-2.5 rounded-xl bg-[#111622] border border-[#1e273b] hover:border-[#2e3c5a] transition group cursor-pointer`.
* Active Selected Note: `border-blue-500 bg-[#141b29] shadow-lg shadow-blue-900/20`.
* Elements: Left 16:9 thumbnail still (with drawing overlay if present), bold timecode in header, author avatar badge (`👤 Editor`), inline expandable text field, action buttons on hover.

---

## 5. Interaction States & Transitions

* **Hover States:** Lighten surface by 8%–12% (`bg-[#121824] -> bg-[#1c2438]`), brighten text from `text-slate-400` to `text-slate-100`.
* **Focus / Active States:** `ring-2 ring-blue-500 ring-offset-2 ring-offset-[#090c13]`.
* **Button Clicks:** `active:scale-95 transition-transform duration-75`.
* **Loading Spinners:** Pulsing / rotating Lucide icons in `text-blue-500`.
