'use client';

import React, { useState } from 'react';
import {
  Palette,
  Sliders,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

export interface ColorGradeSettings {
  brightness: number; // 50 to 150, default 100
  contrast: number; // 50 to 150, default 100
  saturation: number; // 0 to 200, default 100
  temperature: number; // -50 to 50, default 0 (warm/cool)
  tint: number; // -50 to 50, default 0 (green/magenta)
  hue: number; // -180 to 180, default 0
  preset: string; // 'none' | 'teal-orange' | 'cinematic-warm' | 'noir' | 'vintage' | 'bw'
}

export const DEFAULT_GRADE: ColorGradeSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  tint: 0,
  hue: 0,
  preset: 'none',
};

export const FILM_PRESETS = [
  { id: 'none', name: 'Rec.709 Standard', grade: DEFAULT_GRADE },
  {
    id: 'teal-orange',
    name: 'Teal & Orange',
    grade: { brightness: 105, contrast: 120, saturation: 125, temperature: 15, tint: -10, hue: 10, preset: 'teal-orange' },
  },
  {
    id: 'cinematic-warm',
    name: 'Cinematic Warm',
    grade: { brightness: 102, contrast: 115, saturation: 110, temperature: 30, tint: 5, hue: 0, preset: 'cinematic-warm' },
  },
  {
    id: 'noir',
    name: 'Nordic Noir',
    grade: { brightness: 95, contrast: 130, saturation: 75, temperature: -35, tint: 10, hue: -5, preset: 'noir' },
  },
  {
    id: 'vintage',
    name: '70s Film Look',
    grade: { brightness: 108, contrast: 110, saturation: 90, temperature: 20, tint: 15, hue: 15, preset: 'vintage' },
  },
  {
    id: 'bw',
    name: 'B&W Tri-X',
    grade: { brightness: 105, contrast: 145, saturation: 0, temperature: 0, tint: 0, hue: 0, preset: 'bw' },
  },
];

interface ColorGradingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentGrade: ColorGradeSettings;
  onApplyGrade: (grade: ColorGradeSettings, applyScope: 'frame' | 'range' | 'master') => void;
  onLivePreviewChange: (grade: ColorGradeSettings | null) => void;
}

export const ColorGradingPanel: React.FC<ColorGradingPanelProps> = ({
  isOpen,
  onClose,
  currentGrade,
  onApplyGrade,
  onLivePreviewChange,
}) => {
  const [grade, setGrade] = useState<ColorGradeSettings>(currentGrade || DEFAULT_GRADE);
  const [isBypassed, setIsBypassed] = useState(false);
  const [applyScope, setApplyScope] = useState<'frame' | 'range' | 'master'>('frame');

  if (!isOpen) return null;

  const updateSetting = (key: keyof ColorGradeSettings, value: number | string) => {
    const updated = { ...grade, [key]: value };
    setGrade(updated);
    if (!isBypassed) onLivePreviewChange(updated);
  };

  const handleSelectPreset = (preset: typeof FILM_PRESETS[0]) => {
    setGrade(preset.grade);
    if (!isBypassed) onLivePreviewChange(preset.grade);
  };

  const handleReset = () => {
    setGrade(DEFAULT_GRADE);
    if (!isBypassed) onLivePreviewChange(DEFAULT_GRADE);
  };

  const toggleBypass = () => {
    const nextBypass = !isBypassed;
    setIsBypassed(nextBypass);
    onLivePreviewChange(nextBypass ? null : grade);
  };

  const handleSave = () => {
    onApplyGrade(grade, applyScope);
    onClose();
  };

  return (
    <div className="w-[320px] lg:w-[350px] bg-[#111724] border border-[#20293d] rounded-2xl p-3 flex flex-col shadow-2xl shrink-0 h-full min-h-0 animate-in fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e273b] pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-orange-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Color Grading</h2>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Bypass Toggle */}
          <button
            type="button"
            onClick={toggleBypass}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
              isBypassed
                ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                : 'bg-[#182030] text-slate-300 hover:text-white'
            }`}
            title="Toggle Bypass (Before / After)"
          >
            {isBypassed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{isBypassed ? 'Bypassed' : 'Live'}</span>
          </button>

          <button
            onClick={() => {
              onLivePreviewChange(null);
              onClose();
            }}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Adjustments */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
        {/* Film LUT Presets */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Film Looks & LUTs
          </span>
          <div className="grid grid-cols-2 gap-1">
            {FILM_PRESETS.map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`px-2 py-1 rounded-lg border text-left text-[10px] font-bold transition truncate ${
                  grade.preset === p.id
                    ? 'bg-orange-600 text-white border-orange-400 shadow'
                    : 'bg-[#151c2a] border-[#222d42] text-slate-300 hover:bg-[#1d273a] hover:text-white'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Sliders */}
        <div className="p-2.5 bg-[#141b29] rounded-xl border border-[#222c42] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Sliders className="w-3 h-3 text-orange-400" />
              Primary Adjustments
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[9px] text-slate-400 hover:text-white flex items-center gap-0.5 transition"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Exposure / Brightness */}
          <div>
            <div className="flex justify-between text-[10px] font-medium text-slate-300 mb-0.5">
              <span>Exposure</span>
              <span className="font-mono text-orange-400">
                {grade.brightness - 100 > 0 ? `+${grade.brightness - 100}` : grade.brightness - 100}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={grade.brightness}
              onChange={e => updateSetting('brightness', Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer h-1.5"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex justify-between text-[10px] font-medium text-slate-300 mb-0.5">
              <span>Contrast</span>
              <span className="font-mono text-orange-400">{grade.contrast}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="160"
              value={grade.contrast}
              onChange={e => updateSetting('contrast', Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer h-1.5"
            />
          </div>

          {/* Saturation */}
          <div>
            <div className="flex justify-between text-[10px] font-medium text-slate-300 mb-0.5">
              <span>Saturation</span>
              <span className="font-mono text-orange-400">{grade.saturation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={grade.saturation}
              onChange={e => updateSetting('saturation', Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer h-1.5"
            />
          </div>

          {/* Temperature */}
          <div>
            <div className="flex justify-between text-[10px] font-medium text-slate-300 mb-0.5">
              <span>Temperature</span>
              <span className="font-mono text-orange-400">
                {grade.temperature > 0 ? `+${grade.temperature}K` : `${grade.temperature}K`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-blue-400 font-bold">Cool</span>
              <input
                type="range"
                min="-50"
                max="50"
                value={grade.temperature}
                onChange={e => updateSetting('temperature', Number(e.target.value))}
                className="flex-1 accent-orange-500 cursor-pointer h-1.5"
              />
              <span className="text-[9px] text-amber-400 font-bold">Warm</span>
            </div>
          </div>

          {/* Tint */}
          <div>
            <div className="flex justify-between text-[10px] font-medium text-slate-300 mb-0.5">
              <span>Tint</span>
              <span className="font-mono text-orange-400">{grade.tint > 0 ? `+${grade.tint}` : grade.tint}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-emerald-400 font-bold">Green</span>
              <input
                type="range"
                min="-50"
                max="50"
                value={grade.tint}
                onChange={e => updateSetting('tint', Number(e.target.value))}
                className="flex-1 accent-purple-500 cursor-pointer h-1.5"
              />
              <span className="text-[9px] text-pink-400 font-bold">Magenta</span>
            </div>
          </div>
        </div>

        {/* Scope Selector */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
            Target Scope
          </span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'frame', label: 'Frame' },
              { id: 'range', label: 'Range' },
              { id: 'master', label: 'Master' },
            ].map(s => (
              <button
                type="button"
                key={s.id}
                onClick={() => setApplyScope(s.id as any)}
                className={`py-1 rounded text-center text-[10px] font-bold border transition ${
                  applyScope === s.id
                    ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                    : 'bg-[#151c29] border-[#222c42] text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1e273b] mt-2">
        <button
          type="button"
          onClick={() => {
            onLivePreviewChange(null);
            onClose();
          }}
          className="px-2.5 py-1 text-slate-400 hover:text-white text-xs font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-900/30 transition active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Apply to Note</span>
        </button>
      </div>
    </div>
  );
};
