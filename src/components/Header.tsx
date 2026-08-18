'use client';

import React from 'react';
import {
  Folder,
  Sliders,
  Share2,
  Upload,
  Plus,
  Save,
  Link as LinkIcon,
  Palette,
  Settings,
  Sparkles,
  Film,
  Download,
} from 'lucide-react';
import { Project, Cut, StudioBranding } from '@/lib/supabase';

interface HeaderProps {
  currentTool: string;
  onSelectTool: (tool: string) => void;
  branding: StudioBranding;
  activeProject: Project | null;
  activeCut: Cut | null;
  onOpenProjects: () => void;
  onOpenAssets: () => void;
  onOpenBranding: () => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
  onOpenNotekeys: () => void;
  onOpenColorGrading: () => void;
  onOpenAddMedia: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTool,
  onSelectTool,
  branding,
  activeProject,
  activeCut,
  onOpenProjects,
  onOpenAssets,
  onOpenBranding,
  onOpenExport,
  onOpenShare,
  onOpenNotekeys,
  onOpenColorGrading,
  onOpenAddMedia,
}) => {
  return (
    <header className="h-12 bg-[#0c1018] border-b border-[#1c2438] px-3.5 flex items-center justify-between select-none z-30 shrink-0">
      {/* Left: Studio Logo / Name & Project Switcher */}
      <div className="flex items-center gap-3">
        {/* Studio Badge */}
        <button
          onClick={onOpenBranding}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#151c2a] transition group"
          title="Studio Branding Settings"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 group-hover:bg-blue-500 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-900/30 transition">
            {branding.name?.charAt(0) || 'S'}
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-xs font-black text-white leading-none block">{branding.name || 'Studio'}</span>
            <span className="text-[9px] text-slate-400 leading-none">{branding.tagline || 'Screener Suite'}</span>
          </div>
        </button>

        <span className="text-slate-600 font-mono text-xs">/</span>

        {/* Project & Cut Info & Quick Asset Switcher */}
        {activeProject && (
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenProjects}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141b29] hover:bg-[#1c2538] border border-[#222c42] text-xs font-bold text-slate-200 transition"
              title="Change Project"
            >
              <span className="text-blue-400">{activeProject.name}</span>
            </button>

            <span className="text-slate-500">•</span>

            <button
              onClick={onOpenAssets}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#182033] hover:bg-[#222e47] border border-blue-500/30 text-xs font-bold text-white transition group"
              title="Open Project Video Assets Manager"
            >
              <Film className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300" />
              <span>{activeCut?.name || 'Cut 1'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Right: Exactly 8 Rounded Action Icons */}
      <div className="flex items-center gap-1 bg-[#101522] p-1 rounded-xl border border-[#1e273b]">
        {/* 1. New Cut / File+ */}
        <button
          onClick={onOpenProjects}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2336] transition"
          title="New Project / Cut"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* 2. Assets Manager (All Project Videos) */}
        <button
          onClick={onOpenAssets}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-[#1a2336] transition"
          title="Project Assets & Video Cuts Manager"
        >
          <Film className="w-4 h-4" />
        </button>

        {/* 3. Folder (Project Manager) */}
        <button
          onClick={onOpenProjects}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2336] transition"
          title="Projects & Cuts Manager"
        >
          <Folder className="w-4 h-4" />
        </button>

        {/* 4. Link (Add Video Link) */}
        <button
          onClick={onOpenAddMedia}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-[#1a2336] transition"
          title="Add Video Link or Upload File"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        {/* 5. Color Grading Engine */}
        <button
          onClick={onOpenColorGrading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-[#1a2336] transition"
          title="Color Grading & Film Looks"
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* 6. Settings / Gear (Notekeys Settings Modal) */}
        <button
          onClick={onOpenNotekeys}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2336] transition"
          title="Notekeys Console Settings (Add custom categories & keys)"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* 7. Share (Magic Client Link) */}
        <button
          onClick={onOpenShare}
          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-[#1a2336] transition"
          title="Share Passwordless Client Review Link"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* 8. Export (PDF / EDL / CSV) */}
        <button
          onClick={onOpenExport}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-[#1a2336] transition"
          title="Export Notes (PDF, EDL, SRT, CSV)"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
