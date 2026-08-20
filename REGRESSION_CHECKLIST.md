# Presenter & SaaS Platform Regression Checklist (REGRESSION_CHECKLIST.md)

This checklist defines the non-negotiable verification test suite that must pass before and after every phase, refactor, and migration commit.

---

## 1. Video Playback & Seeking Engine
- [ ] **HTML5 Direct MP4 Playback**: Plays, pauses, seeks without stutters; loop & timecode tracking accurate.
- [ ] **YouTube IFrame API Playback**: Plays embedded YouTube videos, timecode synchronization active, play/pause HUD responsive.
- [ ] **Vimeo Player API Playback**: Plays embedded Vimeo videos, poster fetched cleanly, play/pause HUD responsive.
- [ ] **SMPTE Timecode Accuracy**: Frame stepping (Left/Right arrow) matches project FPS (24, 25, 29.97, 30, 50, 59.94, 60); DropFrame calculation accurate.
- [ ] **Shuttle Stepping (J-K-L)**: J steps backward (-5 frames), K pauses/plays, L steps forward (+5 frames), Space toggles playback.

---

## 2. Dual-Source Compare Engine
- [ ] **Split Mode**: Side-by-side synchronized playback between Cut A and Cut B.
- [ ] **Wipe Mode**: Interactive vertical divider slider (0–100%) wipes between Cut A and Cut B in real time.
- [ ] **Fade Mode**: Opacity dissolve slider (0–100%) onion-skins Cut B over Cut A during synchronized playback.
- [ ] **A Only & B Only Modes**: Instant soloing of either clip without losing playhead position.

---

## 3. Annotation Canvas & Creative Tools
- [ ] **1920x1080 Aspect-Ratio Coordinate Mapping**: Drawing on any screen size or DPI stays pixel-locked to exact video frame positions.
- [ ] **Vector Drawing Tools**: Pen freehand, Dynamic Arrow with computed arrowheads, Bounding Box, Circle/Ellipse.
- [ ] **Undo / Redo Stack**: 15-step undo history preserves exact stroke order.
- [ ] **Color Palette & Stroke Width**: 7 selectable colors (Cyan, Magenta, Yellow, Red, Green, Blue, White) and variable stroke sizes.
- [ ] **Watermark / Image Plate Placement**: Image upload, drag-to-position, scale (20%–250%), rotate (-180° to +180°), opacity (10%–100%).
- [ ] **Snapshot Composite Generation**: Exports combined background video frame + vector drawings + watermark plate.

---

## 4. Non-Destructive Color Grading
- [ ] **Real-Time Grade Sliders**: Exposure, Contrast, Saturation, Temperature (-100 to +100K), Tint (-100 to +100), Hue Rotate.
- [ ] **Film Look Presets**: Teal & Orange, Cinematic Warm, Nordic Noir, Bleach Bypass, Vintage Film, Black & White, Punchy Vivid.
- [ ] **Per-Note Color Grade Attachment**: Attached grade applies exclusively when viewing the specific note or its defined In/Out time range.

---

## 5. Notes, Audio Voice Memos & Preset Categories
- [ ] **Preset Quick-Tag Keys**: 1-click note creation with active timecode, In/Out range, category (Editorial, VFX, Color, Sound, General).
- [ ] **Notes Feed**: Chronological ordering by frame number, timecode chips, drawing thumbnail previews, status toggle (Open vs Resolved), inline edit.
- [ ] **Voice Note Memos**: Audio recording via microphone, duration counter, audio preview, audio blob playback.

---

## 6. Multi-Format Export Engine
- [ ] **PDF Production Report**: Generates multi-page PDF with project header, company branding, note table, timecodes, and embedded drawings.
- [ ] **CMX 3600 EDL**: Generates industry-standard Edit Decision List markers for DaVinci Resolve & Avid Media Composer.
- [ ] **Premiere Marker CSV**: Generates Adobe Premiere Pro marker CSV format.
- [ ] **SRT Subtitles**: Outputs valid SubRip subtitle timecodes and text.

---

## 7. Multi-Tenant Isolation & Auth (SaaS Platform)
- [ ] **Tenant Scoping**: User from Company A cannot query, update, or delete any entity from Company B.
- [ ] **RBAC Enforcement**: Permissions matrix correctly restricts Super Admin vs Company Admin vs Account Manager vs Creative vs Client Reviewer.
- [ ] **Server-Authoritative Repositories**: Queries and mutations validated by session context and database RLS.
- [ ] **Secure Share Links**: Cryptographically signed review tokens with expiration, revoked state, and audit logs.
