'use client';

import React, { useState } from 'react';
import {
  Palette,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  X,
  Layers,
  SplitSquareVertical,
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
  { id: 'none', name: 'Original (Rec.709)', grade: DEFAULT_GRADE },
  {
    id: 'teal-orange',
    name: 'Teal & Orange Blockbuster',
    grade: { brightness: 105, contrast: 120, saturation: 125, temperature: 15, tint: -10, hue: 10, preset: 'teal-orange' },
  },
  {
    id: 'cinematic-warm',
    name: 'Cinematic Golden Warm',
    grade: { brightness: 102, contrast: 115, saturation: 110, temperature: 30, tint: 5, hue: 0, preset: 'cinematic-warm' },
  },
  {
    id: 'noir',
    name: 'Cool Nordic Noir',
    grade: { brightness: 95, contrast: 130, saturation: 75, temperature: -35, tint: 10, hue: -5, preset: 'noir' },
  },
  {
    id: 'vintage',
    name: 'Vintage 70s Kodachrome',
    grade: { brightness: 108, contrast: 110, saturation: 90, temperature: 20, tint: 15, hue: 15, preset: 'vintage' },
  },
  {
    id: 'bw',
    name: 'B&W High Contrast Tri-X',
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#111723] border border-[#232d44] rounded-2xl shadow-2xl p-5 relative animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => {
            onLivePreviewChange(null);
            onClose();
          }}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Color Grading & Look Engine</h2>
              <p className="text-[11px] text-slate-400">Live primary color wheels & cinematic LUT presets</p>
            </div>
          </div>

          {/* Bypass Toggle Button */}
          <button
            type="button"
            onClick={toggleBypass}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
              isBypassed
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-[#182030] border-[#26334d] text-slate-300 hover:text-white'
            }`}
            title="Toggle Before / After Bypass"
          >
            {isBypassed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{isBypassed ? 'Bypassed' : 'Preview Active'}</span>
          </button>
        </div>

        {/* Cinematic Film Presets */}
        <div className="mb-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
            Cinematic LUTs & Film Looks
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {FILM_PRESETS.map(p => (
              <button
                type="button"
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition truncate ${
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

        {/* Primary Color Sliders */}
        <div className="p-3.5 bg-[#141b29] rounded-xl border border-[#222c42] space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              Primary Adjustments
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Exposure / Brightness */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
              <span>Exposure / Brightness</span>
              <span className="font-mono text-orange-400">{grade.brightness - 100 > 0 ? `+${grade.brightness - 100}` : grade.brightness - 100}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={grade.brightness}
              onChange={e => updateSetting('brightness', Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
              <span>Contrast</span>
              <span className="font-mono text-orange-400">{grade.contrast}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="160"
              value={grade.contrast}
              onChange={e => updateSetting('contrast', Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
              <span>Saturation / Vibrance</span>
              <span className="font-mono text-orange-400">{grade.saturation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={grade.saturation}
              onChange={e => updateSetting('saturation', Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>

          {/* Temperature (Cool Blue <-> Warm Orange) */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
              <span>Color Temperature (Warm / Cool)</span>
              <span className="font-mono text-orange-400">{grade.temperature > 0 ? `+${grade.temperature}K` : `${grade.temperature}K`}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-blue-400 font-bold">Cool</span>
              <input
                type="range"
                min="-50"
                max="50"
                value={grade.temperature}
                onChange={e => updateSetting('temperature', Number(e.target.value))}
                className="flex-1 accent-orange-500 cursor-pointer"
              />
              <span className="text-[10px] text-amber-400 font-bold">Warm</span>
            </div>
          </div>

          {/* Tint (Green <-> Magenta) */}
          <div>
            <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
              <span>Tint (Green / Magenta)</span>
              <span className="font-mono text-orange-400">{grade.tint > 0 ? `+${grade.tint}` : grade.tint}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400 font-bold">Green</span>
              <input
                type="range"
                min="-50"
                max="50"
                value={grade.tint}
                onChange={e => updateSetting('tint', Number(e.target.value))}
                className="flex-1 accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-pink-400 font-bold">Magenta</span>
            </div>
          </div>
        </div>

        {/* Apply Scope (Frame, In/Out Range, Master Clip) */}
        <div className="mb-5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
            Apply Scope / Target
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'frame', label: 'Current Frame' },
              { id: 'range', label: 'In/Out Range' },
              { id: 'master', label: 'Master Clip' },
            ].map(s => (
              <button
                type="button"
                key={s.id}
                onClick={() => setApplyScope(s.id as any)}
                className={`py-1.5 rounded-lg text-center text-[11px] font-bold border transition ${
                  applyScope === s.id
                    ? 'bg-orange-600/30 border-orange-500 text-orange-300 shadow'
                    : 'bg-[#151c29] border-[#222c42] text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222c42]">
          <button
            type="button"
            onClick={() => {
              onLivePreviewChange(null);
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-lg shadow-orange-900/30 transition active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Grade to Note</span>
          </button>
        </div>
      </div>
    </div>
  );
};
