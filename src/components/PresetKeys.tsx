'use client';

import React, { useState } from 'react';
import {
  Scissors,
  Sparkles,
  Palette,
  Volume2,
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
    <div className="bg-[#111724] border border-[#20293d] rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xl shrink-0">
      {/* Category Tabs & Active Range/TC */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-[#0b0f17] p-0.5 rounded-lg border border-[#1e273b]">
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  isSelected
                    ? cat.id === 'editorial'
                      ? 'bg-blue-600 text-white shadow'
                      : cat.id === 'vfx'
                      ? 'bg-purple-600 text-white shadow'
                      : cat.id === 'color'
                      ? 'bg-orange-600 text-white shadow'
                      : 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-[#151c2c]'
                }`}
              >
                <CatIcon className="w-3 h-3" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Current Timecode / In-Out Range indicator */}
        <div className="flex items-center gap-1.5">
          {inTc && (
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
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
          <div className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[#161e2e] border border-[#26334d] text-blue-400">
            {currentTc}
          </div>
        </div>
      </div>

      {/* Preset Action Keys (Compact 36px Height Buttons) */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {currentCategoryObj.keys.map(k => {
          const isSelected = selectedKey === k;
          return (
            <button
              key={k}
              onClick={() => handleKeyClick(k)}
              className={`h-9 rounded-lg border px-2 text-center text-[11px] font-bold transition active:scale-95 flex items-center justify-center ${
                isSelected
                  ? 'bg-blue-600/25 border-blue-400 text-white shadow'
                  : 'bg-[#141b29] border-[#222c42] text-slate-200 hover:bg-[#1c2438] hover:border-slate-500 hover:text-white'
              }`}
              title={`Stamp [${k}] at ${currentTc}`}
            >
              <span>{k}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Custom Comment Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
        {/* Drawing Snapshot Badge */}
        {activeDrawingSnapshot && (
          <div className="relative group shrink-0">
            <img
              src={activeDrawingSnapshot}
              alt="Attached Drawing"
              className="w-8 h-8 object-cover rounded-lg border border-amber-500 shadow"
            />
            <button
              type="button"
              onClick={onClearDrawingSnapshot}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center"
            >
              ×
            </button>
          </div>
        )}

        {/* Voice Note Badge */}
        {activeAudioBlob && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold shrink-0">
            <span>Voice Clip</span>
            <button type="button" onClick={onClearAudioBlob} className="ml-1 text-slate-400 hover:text-white">
              ×
            </button>
          </div>
        )}

        <input
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder={`Type custom comment for timestamp ${currentTc}...`}
          className="flex-1 px-3 py-1.5 rounded-xl bg-[#090d14] border border-[#222c42] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
        />

        <button
          type="submit"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition active:scale-95 shrink-0"
        >
          <Send className="w-3 h-3" />
          <span>Add</span>
        </button>
      </form>
    </div>
  );
};
