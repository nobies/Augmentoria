'use client';

import React, { useState, useEffect } from 'react';
import {
  Link as LinkIcon,
  Video,
  Upload,
  Clock,
  Tv,
  Play,
  SplitSquareVertical,
  Sliders,
} from 'lucide-react';
import { STANDARD_FPS_LIST } from '@/lib/timecode';

interface MediaSourceBarProps {
  currentUrl: string;
  provider: 'local' | 'youtube' | 'vimeo' | 'standalone' | 'compare';
  fps: number;
  dropFrame: boolean;
  startTc: string;
  onUpdateSource: (url: string, provider: 'local' | 'youtube' | 'vimeo' | 'standalone' | 'compare') => void;
  onUpdateFps: (fps: number) => void;
  onUpdateStartTc: (startTc: string) => void;
  onUpdateDropFrame: (df: boolean) => void;
  onUploadFile: (file: File) => void;
  onOpenCompare: () => void;
}

export const MediaSourceBar: React.FC<MediaSourceBarProps> = ({
  currentUrl,
  provider,
  fps,
  dropFrame,
  startTc,
  onUpdateSource,
  onUpdateFps,
  onUpdateStartTc,
  onUpdateDropFrame,
  onUploadFile,
  onOpenCompare,
}) => {
  const [inputUrl, setInputUrl] = useState(currentUrl || '');

  useEffect(() => {
    setInputUrl(currentUrl || '');
  }, [currentUrl]);

  const detectProvider = (url: string) => {
    const clean = url.trim().toLowerCase();
    if (!clean) return 'standalone';
    if (clean.includes('vimeo.com')) return 'vimeo';
    if (clean.includes('youtube.com') || clean.includes('youtu.be')) return 'youtube';
    return 'local';
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const detected = detectProvider(inputUrl);
    onUpdateSource(inputUrl.trim(), detected);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  return (
    <div className="bg-[#111724] border border-[#20293d] rounded-2xl p-3 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Left: Direct URL input & Fast Actions */}
      <form onSubmit={handleUrlSubmit} className="flex-1 w-full flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {/* URL Input Box */}
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 flex items-center gap-1.5 pointer-events-none">
            {provider === 'vimeo' ? (
              <Tv className="w-4 h-4 text-sky-400" />
            ) : provider === 'youtube' ? (
              <Play className="w-4 h-4 text-red-400" />
            ) : provider === 'compare' ? (
              <SplitSquareVertical className="w-4 h-4 text-purple-400" />
            ) : provider === 'local' ? (
              <Video className="w-4 h-4 text-blue-400" />
            ) : (
              <LinkIcon className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            placeholder="Paste Vimeo link (e.g. vimeo.com/55764137), YouTube, or MP4 URL..."
            className="w-full pl-9 pr-16 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow transition active:scale-95"
          >
            Sync
          </button>
        </div>

        {/* Upload Local Video Button */}
        <label className="cursor-pointer shrink-0">
          <div
            className="px-3 py-2 rounded-xl bg-[#171f30] hover:bg-[#1f2a40] border border-[#232d44] text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
            title="Upload local video file (MP4, MOV, WebM)"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Upload</span>
          </div>
          <input type="file" accept="video/*" onChange={handleFileInput} className="hidden" />
        </label>

        {/* Compare Clips Button */}
        <button
          type="button"
          onClick={onOpenCompare}
          className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            provider === 'compare'
              ? 'bg-purple-600/25 border-purple-500 text-purple-300 shadow-lg shadow-purple-900/20'
              : 'bg-[#171f30] border-[#232d44] text-slate-300 hover:text-purple-300 hover:border-purple-500/40'
          }`}
          title="Compare Cut A vs Cut B (Dual synchronized player)"
        >
          <SplitSquareVertical className="w-3.5 h-3.5 text-purple-400" />
          <span>Compare</span>
        </button>

        {/* Standalone Clock Mode Toggle (Preserves Video URL) */}
        <button
          type="button"
          onClick={() => {
            if (provider === 'standalone') {
              // Toggle back to detected video
              const detected = detectProvider(inputUrl);
              onUpdateSource(inputUrl, detected);
            } else {
              // Switch to clock view without clearing inputUrl
              onUpdateSource(inputUrl, 'standalone');
            }
          }}
          className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            provider === 'standalone'
              ? 'bg-blue-600/25 border-blue-500 text-blue-300'
              : 'bg-[#171f30] border-[#232d44] text-slate-400 hover:text-white'
          }`}
          title="Toggle Standalone SMPTE Clock mode without losing video link"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{provider === 'standalone' ? 'Exit Clock' : 'Clock Mode'}</span>
        </button>
      </form>

      {/* Right: Timebase Settings (FPS & Start TC) */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-[#1e273b] pt-2 md:pt-0 shrink-0">
        {/* FPS selector */}
        <div className="flex items-center gap-1.5 bg-[#090d14] px-2.5 py-1 rounded-xl border border-[#232d44]">
          <span className="text-[10px] uppercase font-bold text-slate-500">FPS</span>
          <select
            value={fps}
            onChange={e => onUpdateFps(Number(e.target.value))}
            className="bg-transparent text-xs font-bold text-blue-400 focus:outline-none cursor-pointer"
          >
            {STANDARD_FPS_LIST.map(f => (
              <option key={f.value} value={f.value} className="bg-[#111724] text-white">
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start TC input */}
        <div className="flex items-center gap-1.5 bg-[#090d14] px-2.5 py-1 rounded-xl border border-[#232d44]">
          <span className="text-[10px] uppercase font-bold text-slate-500">Start TC</span>
          <input
            type="text"
            value={startTc}
            onChange={e => onUpdateStartTc(e.target.value)}
            className="w-20 bg-transparent text-xs font-mono font-bold text-slate-200 text-center focus:outline-none focus:text-blue-400"
            placeholder="01:00:00:00"
          />
        </div>
      </div>
    </div>
  );
};
