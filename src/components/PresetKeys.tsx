'use client';

import React, { useState } from 'react';
import {
  Scissors,
  Sparkles,
  Palette,
  Volume2,
  PenTool,
  Mic,
  Send,
} from 'lucide-react';

export interface CategoryPreset {
  id: string;
  name: string;
  color: 'editorial' | 'vfx' | 'color' | 'sound';
  icon: any;
  keys: string[];
}

export const PRESET_CATEGORIES: CategoryPreset[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    color: 'editorial',
    icon: Scissors,
    keys: [
      'Flag',
      'Trim',
      'Extend',
      'Drags',
      'Rushed',
      'Fix Cut',
      'Drop Shot',
      'Drop Line',
      'Alt Take',
      'Add Cutaway',
      'Continuity',
      'Restructure',
    ],
  },
  {
    id: 'vfx',
    name: 'VFX',
    color: 'vfx',
    icon: Sparkles,
    keys: [
      'Flag',
      'Add VFX',
      'Cleanup',
      'Remove Object',
      'Remove Rig',
      'Boom Visible',
      'Crew Visible',
      'Reframe',
      'Steady',
      'Add Screen',
      'Sky Replace',
      'Looks Fake',
    ],
  },
  {
    id: 'color',
    name: 'Color',
    color: 'color',
    icon: Palette,
    keys: [
      'Flag',
      'Brighten',
      'Darken',
      'Warmer',
      'Cooler',
      'More Contrast',
      'Less Contrast',
      'More Color',
      'Less Color',
      'Skin Tones',
      'Blown Out',
      'Match',
    ],
  },
  {
    id: 'sound',
    name: 'Sound',
    color: 'sound',
    icon: Volume2,
    keys: [
      'Flag',
      'Louder',
      'Softer',
      "Can't Hear",
      'Clean Audio',
      'Music Down',
      'Add Music',
      'Add SFX',
      'Add Ambience',
      'ADR',
      'Off Sync',
      'Fade Out',
    ],
  },
];

interface PresetKeysProps {
  currentTc: string;
  inTc: string | null;
  outTc: string | null;
  onClearRange: () => void;
  onAddNote: (noteData: {
    category: 'editorial' | 'vfx' | 'color' | 'sound' | 'general';
    presetLabel: string;
    text: string;
    stillImageUrl?: string;
    audioBlob?: Blob;
    drawingData?: string;
  }) => void;
  onStartDrawing: () => void;
  onStartVoiceRecording: () => void;
  activeDrawingSnapshot: string | null;
  activeAudioBlob: Blob | null;
  onClearDrawingSnapshot: () => void;
  onClearAudioBlob: () => void;
}

export const PresetKeys: React.FC<PresetKeysProps> = ({
  currentTc,
  inTc,
  outTc,
  onClearRange,
  onAddNote,
  onStartDrawing,
  onStartVoiceRecording,
  activeDrawingSnapshot,
  activeAudioBlob,
  onClearDrawingSnapshot,
  onClearAudioBlob,
}) => {
  const [activeCategory, setActiveCategory] = useState<'editorial' | 'vfx' | 'color' | 'sound'>('editorial');
  const [customText, setCustomText] = useState('');
  const [selectedKey, setSelectedKey] = useState('Flag');

  const currentCategoryObj = PRESET_CATEGORIES.find(c => c.id === activeCategory) || PRESET_CATEGORIES[0];

  const handleKeyClick = (keyLabel: string) => {
    setSelectedKey(keyLabel);
    // Instant add note on click with current text (if any) or preset label
    onAddNote({
      category: activeCategory,
      presetLabel: keyLabel,
      text: customText.trim(),
      stillImageUrl: activeDrawingSnapshot || undefined,
      audioBlob: activeAudioBlob || undefined,
    });
    setCustomText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddNote({
      category: activeCategory,
      presetLabel: selectedKey || 'Note',
      text: customText.trim(),
      stillImageUrl: activeDrawingSnapshot || undefined,
      audioBlob: activeAudioBlob || undefined,
    });
    setCustomText('');
  };

  return (
    <div className="bg-[#111724] border border-[#20293d] rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
      {/* Top Header: Department Tabs & Active Timecode Display */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#1d2538] pb-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 bg-[#0b0f17] p-1 rounded-xl border border-[#1e273b]">
          {PRESET_CATEGORIES.map(cat => {
            const CatIcon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as any);
                  setSelectedKey('Flag');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  isSelected
                    ? cat.id === 'editorial'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                      : cat.id === 'vfx'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                      : cat.id === 'color'
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40'
                      : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-white hover:bg-[#151c2c]'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Current Timecode & Range info */}
        <div className="flex items-center gap-2">
          {inTc && (
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <span>IN: {inTc}</span>
              {outTc && <span>→ OUT: {outTc}</span>}
              <button
                onClick={onClearRange}
                className="ml-1 text-slate-400 hover:text-white"
                title="Clear In/Out range"
              >
                ×
              </button>
            </div>
          )}
          <div className="text-xs font-mono font-black px-3 py-1 rounded-lg bg-[#161e2e] border border-[#26334d] text-blue-400 tracking-wider">
            {currentTc}
          </div>
        </div>
      </div>

      {/* Preset Action Keys Grid (Dropmedia 72px Tactile Console Buttons) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {currentCategoryObj.keys.map(k => {
          const isSelected = selectedKey === k;
          return (
            <button
              key={k}
              onClick={() => handleKeyClick(k)}
              className={`h-[68px] rounded-xl border px-3 text-center text-xs font-bold leading-snug transition-all active:scale-95 flex items-center justify-center relative overflow-hidden group ${
                isSelected
                  ? 'bg-blue-600/25 border-blue-400 text-white shadow-xl shadow-blue-900/20'
                  : 'bg-[#141b29] border-[#222c42] text-slate-200 hover:bg-[#1c2438] hover:border-slate-500 hover:text-white'
              }`}
              title={`Click to stamp [${k}] at ${currentTc}`}
            >
              <span>{k}</span>
              {/* Quick stamp hint */}
              <span className="absolute bottom-1 right-1.5 text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 font-mono">
                Stamp
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Comment & Media Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 border-t border-[#1d2538]">
        {/* Drawing Snapshot Badge */}
        {activeDrawingSnapshot && (
          <div className="relative group shrink-0">
            <img
              src={activeDrawingSnapshot}
              alt="Attached Drawing"
              className="w-10 h-10 object-cover rounded-lg border border-amber-500"
            />
            <button
              type="button"
              onClick={onClearDrawingSnapshot}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center shadow"
            >
              ×
            </button>
          </div>
        )}

        {/* Voice Note Badge */}
        {activeAudioBlob && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold shrink-0">
            <Mic className="w-4 h-4 animate-pulse text-red-400" />
            <span>Voice Clip Ready</span>
            <button
              type="button"
              onClick={onClearAudioBlob}
              className="ml-1 text-slate-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Text Input */}
        <input
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder={`Type custom comment for timestamp ${currentTc}...`}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#090d14] border border-[#222c42] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
        />

        {/* Draw on Freeze Frame Button */}
        <button
          type="button"
          onClick={onStartDrawing}
          className={`p-2.5 rounded-xl border transition active:scale-95 ${
            activeDrawingSnapshot
              ? 'bg-amber-500/25 border-amber-500 text-amber-400'
              : 'bg-[#151b29] border-[#222c42] text-slate-300 hover:text-amber-400 hover:border-amber-500/40'
          }`}
          title="Draw on freeze-frame"
        >
          <PenTool className="w-4 h-4" />
        </button>

        {/* Record Voice Note Button */}
        <button
          type="button"
          onClick={onStartVoiceRecording}
          className={`p-2.5 rounded-xl border transition active:scale-95 ${
            activeAudioBlob
              ? 'bg-red-500/25 border-red-500 text-red-400'
              : 'bg-[#151b29] border-[#222c42] text-slate-300 hover:text-red-400 hover:border-red-500/40'
          }`}
          title="Record voice comment"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* Add Note Button */}
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition active:scale-95 shrink-0"
        >
          <Send className="w-4 h-4" />
          <span>Add Note</span>
        </button>
      </form>
    </div>
  );
};
