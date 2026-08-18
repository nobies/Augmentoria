'use client';

import React, { useState } from 'react';
import {
  Layers,
  Film,
  Scissors,
  Crop,
  FileCode,
  FileSpreadsheet,
  Tv,
  Clapperboard,
  Sparkles,
  Cloud,
  CloudOff,
  FolderOpen,
  Palette,
  Download,
  Share2,
} from 'lucide-react';
import { StudioBranding, Project, Cut, isSupabaseConfigured } from '@/lib/supabase';

interface HeaderProps {
  currentTool: string;
  onSelectTool: (toolId: string) => void;
  branding: StudioBranding;
  activeProject: Project | null;
  activeCut: Cut | null;
  onOpenProjects: () => void;
  onOpenBranding: () => void;
  onOpenExport: () => void;
}

export const TOOLS_LIST = [
  { id: 'screener', name: 'Screener', icon: Film, desc: 'Timecode review notes' },
  { id: 'frames', name: 'Frame Extractor', icon: Layers, desc: 'Pull clean stills' },
  { id: 'cutsheet', name: 'Cutsheet', icon: Scissors, desc: 'Edit logs & cues' },
  { id: 'reframe', name: 'Reframe', icon: Crop, desc: 'Aspect ratio conversions' },
  { id: 'naming', name: 'Filename Gen', icon: FileCode, desc: 'Standardized delivery' },
  { id: 'specsheet', name: 'Spec Sheet', icon: FileSpreadsheet, desc: 'Delivery specs' },
  { id: 'adshot', name: 'Adshot', icon: Tv, desc: 'Commercial slate shots' },
  { id: 'slate', name: 'Slate Builder', icon: Clapperboard, desc: 'Production clapper' },
  { id: 'credits', name: 'End Credits', icon: Sparkles, desc: 'Rolling credit builder' },
];

export const Header: React.FC<HeaderProps> = ({
  currentTool,
  onSelectTool,
  branding,
  activeProject,
  activeCut,
  onOpenProjects,
  onOpenBranding,
  onOpenExport,
}) => {
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  const activeToolObj = TOOLS_LIST.find(t => t.id === currentTool) || TOOLS_LIST[0];
  const IconComponent = activeToolObj.icon;

  return (
    <header className="h-14 border-b border-[#1f2638] bg-[#0c1018]/90 backdrop-blur-md px-4 flex items-center justify-between z-40 sticky top-0">
      {/* Left: Studio & Tool Switcher */}
      <div className="flex items-center gap-3">
        {/* Studio Branding / Logo */}
        <button
          onClick={onOpenBranding}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#141a27] hover:bg-[#1c2436] border border-[#232d44] transition group"
          title="Studio Bundle: Customize Branding"
        >
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="w-5 h-5 object-contain rounded" />
          ) : (
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white shadow"
              style={{ backgroundColor: branding.primaryColor || '#3b82f6' }}
            >
              {branding.name?.charAt(0) || 'S'}
            </div>
          )}
          <span className="text-xs font-semibold text-slate-200 group-hover:text-white max-w-[120px] truncate">
            {branding.name || 'Studio'}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Studio
          </span>
        </button>

        <span className="text-slate-600">/</span>

        {/* Current Tool Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141a27] hover:bg-[#1a2233] border border-[#232d44] text-slate-100 text-sm font-medium transition"
          >
            <IconComponent className="w-4 h-4 text-blue-400" />
            <span>{activeToolObj.name}</span>
            <span className="text-xs text-slate-500">▼</span>
          </button>

          {showToolsMenu && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-[#111723] border border-[#232d44] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                Dropmedia Suite Tools
              </div>
              <div className="space-y-1">
                {TOOLS_LIST.map(t => {
                  const TIcon = t.icon;
                  const isSelected = t.id === currentTool;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        onSelectTool(t.id);
                        setShowToolsMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition ${
                        isSelected
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                          : 'text-slate-300 hover:bg-[#192233] hover:text-white'
                      }`}
                    >
                      <TIcon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-[10px] text-slate-500">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Active Project & Cut selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141a27] hover:bg-[#1a2233] border border-[#232d44] text-xs transition text-slate-200"
          title="Switch or manage projects and cuts"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold">{activeProject?.name || 'Untitled Project'}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{activeCut?.name || 'Cut 1'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e273b] text-slate-400">
            {activeProject?.fps || 25} fps
          </span>
        </button>
      </div>

      {/* Right: Actions (Brand, Cloud Sync, Export) */}
      <div className="flex items-center gap-2">
        {/* Cloud Sync indicator */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border bg-[#141a27] border-[#232d44]"
          title={isSupabaseConfigured ? 'Connected to Supabase & Google Drive' : 'Running in Local Offline Storage (IndexedDB)'}
        >
          {isSupabaseConfigured ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 hidden sm:inline">Cloud Sync</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 hidden sm:inline">Local Cache</span>
            </>
          )}
        </div>

        {/* Studio Brand Settings */}
        <button
          onClick={onOpenBranding}
          className="p-1.5 rounded-lg bg-[#141a27] hover:bg-[#1a2233] border border-[#232d44] text-slate-300 hover:text-white transition"
          title="Studio Branding & Colors"
        >
          <Palette className="w-4 h-4 text-purple-400" />
        </button>

        {/* Export Notes Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Notes</span>
        </button>
      </div>
    </header>
  );
};
