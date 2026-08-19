'use client';

import React from 'react';
import {
  Folder,
  Share2,
  Plus,
  Link as LinkIcon,
  Palette,
  Settings,
  Film,
  Download,
  Database,
  Cloud,
} from 'lucide-react';
import { Project, Cut, StudioBranding, isSupabaseConfigured } from '@/lib/supabase';

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
    <header className="min-h-[48px] bg-[#0c1018] border-b border-[#1c2438] px-2.5 sm:px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 select-none z-30 shrink-0">
      {/* Left: Studio Logo / Name & Project Switcher */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Studio Badge */}
        <button
          onClick={onOpenBranding}
          className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-xl hover:bg-[#151c2a] transition group"
          title="Studio Branding Settings"
          aria-label="Studio Branding Settings"
        >
          <div
            style={{ backgroundColor: branding.primaryColor || '#3b82f6' }}
            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-900/30 transition shrink-0"
          >
            {branding.name?.charAt(0) || 'S'}
          </div>
          <div className="text-left hidden xs:block">
            <span className="text-xs font-black text-white leading-none block truncate max-w-[100px] sm:max-w-[140px]">
              {branding.name || 'Studio'}
            </span>
            <span className="text-[9px] text-slate-400 leading-none truncate max-w-[100px] sm:max-w-[140px] block">
              {branding.tagline || 'Screener Suite'}
            </span>
          </div>
        </button>

        <span className="text-slate-600 font-mono text-xs hidden sm:inline">/</span>

        {/* Project & Cut Info & Quick Asset Switcher */}
        {activeProject && (
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <button
              onClick={onOpenProjects}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-[#141b29] hover:bg-[#1c2538] border border-[#222c42] text-[11px] sm:text-xs font-bold text-slate-200 transition truncate max-w-[120px] sm:max-w-[180px]"
              title="Change Project"
              aria-label="Change Project"
            >
              <span className="text-blue-400 truncate">{activeProject.name}</span>
            </button>

            <span className="text-slate-500">•</span>

            <button
              onClick={onOpenAssets}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-[#182033] hover:bg-[#222e47] border border-blue-500/30 text-[11px] sm:text-xs font-bold text-white transition group truncate max-w-[110px] sm:max-w-[160px]"
              title="Open Project Video Assets Manager"
              aria-label="Open Project Video Assets Manager"
            >
              <Film className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 shrink-0" />
              <span className="truncate">{activeCut?.name || 'Cut 1'}</span>
            </button>

            {/* Sync State Badge */}
            {isSupabaseConfigured ? (
              <span className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <Cloud className="w-3 h-3 text-emerald-400" />
                <span>Cloud Synced</span>
              </span>
            ) : (
              <span className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold" title="Operating in offline-first IndexedDB mode">
                <Database className="w-3 h-3 text-amber-400" />
                <span>Local DB</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Action Icons (Responsive Grid/Flex) */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-[#101522] p-1 rounded-xl border border-[#1e273b] shrink-0 overflow-x-auto max-w-full">
        {/* 1. Add Media / Upload */}
        <button
          onClick={onOpenAddMedia}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-[#1a2336] transition"
          title="Add Video Link or Upload Media"
          aria-label="Add Media"
        >
          <Plus className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* 2. Assets Manager (All Project Videos) */}
        <button
          onClick={onOpenAssets}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-[#1a2336] transition"
          title="Project Assets & Video Cuts Manager"
          aria-label="Assets Manager"
        >
          <Film className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* 3. Projects Manager */}
        <button
          onClick={onOpenProjects}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2336] transition"
          title="Projects Manager"
          aria-label="Projects Manager"
        >
          <Folder className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* 4. Link (Add Video Link) */}
        <button
          onClick={onOpenAddMedia}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-[#1a2336] transition"
          title="Add Video Link"
          aria-label="Add Video Link"
        >
          <LinkIcon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* 5. Color Grading Engine */}
        <button
          onClick={onOpenColorGrading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-[#1a2336] transition"
          title="Color Grading & Film Looks"
          aria-label="Color Grading"
        >
          <Palette className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* 6. Settings / Notekeys */}
        <button
          onClick={onOpenNotekeys}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2336] transition"
          title="Notekeys Console Settings"
          aria-label="Notekeys Settings"
        >
          <Settings className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* 7. Share (Magic Client Link) */}
        <button
          onClick={onOpenShare}
          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-[#1a2336] transition"
          title="Share Passwordless Client Review Link"
          aria-label="Share Review Link"
        >
          <Share2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* 8. Export (PDF / EDL / CSV) */}
        <button
          onClick={onOpenExport}
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-[#1a2336] transition"
          title="Export Notes (PDF, EDL, SRT, CSV)"
          aria-label="Export Notes"
        >
          <Download className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>
      </div>
    </header>
  );
};
