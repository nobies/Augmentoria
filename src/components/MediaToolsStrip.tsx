'use client';

import React from 'react';
import { PenTool, Image as ImageIcon, Mic } from 'lucide-react';

interface MediaToolsStripProps {
  onStartDrawing: () => void;
  onStartVoiceRecording: () => void;
  onAttachImage: (file: File) => void;
  hasActiveDrawing: boolean;
  hasActiveVoice: boolean;
}

export const MediaToolsStrip: React.FC<MediaToolsStripProps> = ({
  onStartDrawing,
  onStartVoiceRecording,
  onAttachImage,
  hasActiveDrawing,
  hasActiveVoice,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAttachImage(file);
  };

  return (
    <div className="flex lg:flex-col items-center justify-center gap-2 bg-[#111724] border border-[#20293d] p-2 rounded-2xl shadow-xl shrink-0">
      {/* Freeze Frame Drawing */}
      <button
        type="button"
        onClick={onStartDrawing}
        className={`p-2.5 rounded-xl border transition active:scale-95 group relative ${
          hasActiveDrawing
            ? 'bg-amber-500/25 border-amber-500 text-amber-400 shadow-lg shadow-amber-900/30 ring-1 ring-amber-500/50'
            : 'bg-[#151b29] border-[#222c42] text-slate-300 hover:text-amber-400 hover:border-amber-500/40 hover:bg-[#1a2336]'
        }`}
        title="Draw on Freeze Frame (Arrow, Box, Circle, Pen)"
      >
        <PenTool className="w-4 h-4" />
      </button>

      {/* Watermark / Image Upload */}
      <label className="cursor-pointer">
        <div
          className="p-2.5 rounded-xl bg-[#151b29] hover:bg-[#1a2336] border border-[#222c42] hover:border-blue-500/40 text-slate-300 hover:text-blue-400 transition active:scale-95"
          title="Place Watermark / Plate / Reference Image on Frame"
        >
          <ImageIcon className="w-4 h-4" />
        </div>
        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </label>

      {/* Voice Comment Recorder */}
      <button
        type="button"
        onClick={onStartVoiceRecording}
        className={`p-2.5 rounded-xl border transition active:scale-95 group relative ${
          hasActiveVoice
            ? 'bg-red-500/25 border-red-500 text-red-400 shadow-lg shadow-red-900/30 ring-1 ring-red-500/50'
            : 'bg-[#151b29] border-[#222c42] text-slate-300 hover:text-red-400 hover:border-red-500/40 hover:bg-[#1a2336]'
        }`}
        title="Record Voice Comment Clip"
      >
        <Mic className="w-4 h-4" />
      </button>
    </div>
  );
};
