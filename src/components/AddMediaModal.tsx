'use client';

import React, { useState } from 'react';
import { X, Link as LinkIcon, Upload, Tv, Play, Video, Check } from 'lucide-react';

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onUpdateSource: (url: string, provider: 'local' | 'youtube' | 'vimeo' | 'standalone' | 'compare' | 'drive') => void;
  onUploadFile: (file: File) => void;
}

export const AddMediaModal: React.FC<AddMediaModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onUpdateSource,
  onUploadFile,
}) => {
  const [url, setUrl] = useState(currentUrl || '');

  if (!isOpen) return null;

  const detectProvider = (rawUrl: string) => {
    const clean = rawUrl.trim().toLowerCase();
    if (!clean) return 'standalone';
    if (clean.includes('vimeo.com')) return 'vimeo';
    if (clean.includes('youtube.com') || clean.includes('youtu.be')) return 'youtube';
    return 'local';
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const provider = detectProvider(url);
    onUpdateSource(url.trim(), provider);
    onClose();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111723] border border-[#232d44] rounded-2xl shadow-2xl p-5 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <LinkIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Add Video / Link</h3>
            <p className="text-[11px] text-slate-400">Paste a Vimeo or YouTube URL, or upload a local video</p>
          </div>
        </div>

        <form onSubmit={handleUrlSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Video URL (Vimeo / YouTube / MP4)</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="e.g. https://vimeo.com/55764137"
              className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px] uppercase font-bold py-1">
            <span className="h-px bg-[#1e273b] flex-1" />
            <span>OR</span>
            <span className="h-px bg-[#1e273b] flex-1" />
          </div>

          <label className="block border-2 border-dashed border-[#232d44] hover:border-blue-500 rounded-xl p-3 text-center cursor-pointer bg-[#090d14] hover:bg-[#131926] transition group">
            <Upload className="w-4 h-4 text-blue-400 mx-auto mb-1 group-hover:scale-110 transition" />
            <span className="text-xs text-slate-300 font-semibold block">Upload Local Video File</span>
            <span className="text-[10px] text-slate-500">MP4, MOV, WebM (Cached locally in browser)</span>
            <input type="file" accept="video/*" onChange={handleFileInput} className="hidden" />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e273b] mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition active:scale-95"
            >
              Load Video
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
