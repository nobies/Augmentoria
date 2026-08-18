'use client';

import React, { useState } from 'react';
import {
  Scissors,
  Sparkles,
  Palette,
  Volume2,
  Send,
  Plus,
} from 'lucide-react';

export interface CategoryPreset {
  id: string;
  name: string;
  color: 'editorial' | 'vfx' | 'color' | 'sound';
  icon?: any;
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
  categories?: CategoryPreset[];
  onClearRange: () => void;
  onAddNote: (noteData: {
    category: 'editorial' | 'vfx' | 'color' | 'sound' | 'general';
    presetLabel: string;
    text: string;
    stillImageUrl?: string;
    audioBlob?: Blob;
    drawingData?: string;
  }) => void;
  onOpenNotekeys?: () => void;
  activeDrawingSnapshot: string | null;
  activeAudioBlob: Blob | null;
  onClearDrawingSnapshot: () => void;
  onClearAudioBlob: () => void;
}

export const PresetKeys: React.FC<PresetKeysProps> = ({
  currentTc,
  inTc,
  outTc,
  categories = PRESET_CATEGORIES,
  onClearRange,
  onAddNote,
  onOpenNotekeys,
  activeDrawingSnapshot,
  activeAudioBlob,
  onClearDrawingSnapshot,
  onClearAudioBlob,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('editorial');
  const [customText, setCustomText] = useState('');
  const [selectedKey, setSelectedKey] = useState('Flag');

  const currentCategoryObj = categories.find(c => c.id === activeCategory) || categories[0] || PRESET_CATEGORIES[0];

  const handleKeyClick = (keyLabel: string) => {
    setSelectedKey(keyLabel);
    onAddNote({
      category: activeCategory as any,
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
      category: activeCategory as any,
      presetLabel: selectedKey || 'Note',
      text: customText.trim(),
      stillImageUrl: activeDrawingSnapshot || undefined,
      audioBlob: activeAudioBlob || undefined,
    });
    setCustomText('');
  };

  const accentColor =
    currentCategoryObj.color === 'editorial'
      ? '#ef4444'
      : currentCategoryObj.color === 'vfx'
      ? '#3b82f6'
      : currentCategoryObj.color === 'color'
      ? '#f59e0b'
      : '#10b981';

  return (
    <div className="bg-[#111724] border border-[#20293d] rounded-2xl p-2.5 flex flex-col gap-2 shadow-2xl shrink-0">
      {/* Category Tabs (Exact Screenshot 2 Underline Style) */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#1d2538] pb-1.5">
        <div className="flex items-center gap-4">
          {categories.map(cat => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedKey(cat.keys[0] || 'Flag');
                }}
                className={`text-xs font-bold transition relative pb-1 ${
                  isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                {isSelected && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
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
              <button onClick={onClearRange} className="ml-1 text-slate-400 hover:text-white">
                ×
              </button>
            </div>
          )}
          <div className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#161e2e] border border-[#26334d] text-blue-400">
            {currentTc}
          </div>
        </div>
      </div>

      {/* Preset Action Keys with Left Vertical Accent Bar (Screenshot 2) */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {currentCategoryObj.keys.map(k => {
          const isSelected = selectedKey === k;
          return (
            <button
              key={k}
              onClick={() => handleKeyClick(k)}
              style={{ borderLeftColor: accentColor }}
              className={`h-9 rounded-lg border border-l-[3.5px] px-2 text-center text-[11px] font-bold transition active:scale-95 flex items-center justify-center relative ${
                isSelected
                  ? 'bg-[#1e273a] border-slate-500 text-white shadow'
                  : 'bg-[#141b29] border-[#222c42] text-slate-200 hover:bg-[#1a2336] hover:text-white'
              }`}
              title={`Stamp [${k}] at ${currentTc}`}
            >
              <span>{k}</span>
            </button>
          );
        })}

        {/* + Add key Dashed Button */}
        {onOpenNotekeys && (
          <button
            type="button"
            onClick={onOpenNotekeys}
            className="h-9 rounded-lg border border-dashed border-[#2b3952] hover:border-blue-500 text-[11px] font-bold text-slate-400 hover:text-white flex items-center justify-center gap-1 transition"
          >
            <Plus className="w-3 h-3" />
            <span>Add key</span>
          </button>
        )}
      </div>

      {/* Quick Custom Comment Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-0.5">
        {activeDrawingSnapshot && (
          <div className="relative group shrink-0">
            <img
              src={activeDrawingSnapshot}
              alt="Snapshot"
              className="w-7 h-7 object-cover rounded border border-amber-500 shadow"
            />
            <button
              type="button"
              onClick={onClearDrawingSnapshot}
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] flex items-center justify-center"
            >
              ×
            </button>
          </div>
        )}

        {activeAudioBlob && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold shrink-0">
            <span>Voice</span>
            <button type="button" onClick={onClearAudioBlob} className="ml-0.5 text-slate-400 hover:text-white">
              ×
            </button>
          </div>
        )}

        <input
          type="text"
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder={`Add custom comment at ${currentTc}...`}
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
