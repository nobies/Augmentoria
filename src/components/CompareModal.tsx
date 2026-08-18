'use client';

import React, { useState } from 'react';
import { X, SplitSquareVertical, Tv, Film, Check } from 'lucide-react';
import { Cut } from '@/lib/supabase';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCut: Cut;
  projectCuts: Cut[];
  onApplyCompare: (urlA: string, urlB: string) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  currentCut,
  projectCuts,
  onApplyCompare,
}) => {
  const [urlA, setUrlA] = useState(currentCut.videoUrl || '');
  const [urlB, setUrlB] = useState(currentCut.videoUrlB || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlA.trim() || !urlB.trim()) {
      setError('Please provide two video URLs or select a cut from the project to compare.');
      return;
    }
    setError('');
    onApplyCompare(urlA.trim(), urlB.trim());
    onClose();
  };

  const handleSelectCutB = (cut: Cut) => {
    if (cut.videoUrl) {
      setUrlB(cut.videoUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#111723] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <SplitSquareVertical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Compare Two Clips / Cuts</h2>
            <p className="text-xs text-slate-400">
              Synchronize two videos side-by-side or toggle between Cut A and Cut B in lockstep.
            </p>
          </div>
        </div>

        <form onSubmit={handleApply} className="space-y-4">
          {/* Video A */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Clip A (Primary Cut / URL)
            </label>
            <input
              type="text"
              required
              value={urlA}
              onChange={e => setUrlA(e.target.value)}
              placeholder="e.g. https://vimeo.com/55764137"
              className="w-full px-3 py-2.5 rounded-xl bg-[#171f30] border border-[#242f48] text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Video B */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Clip B (Compare Cut / URL)
            </label>
            <input
              type="text"
              required
              value={urlB}
              onChange={e => setUrlB(e.target.value)}
              placeholder="Paste second Vimeo/YouTube link or pick from project below..."
              className="w-full px-3 py-2.5 rounded-xl bg-[#171f30] border border-[#242f48] text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />

            {/* Quick Pick from Project Cuts */}
            {projectCuts.length > 1 && (
              <div className="mt-2">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Or pick from project cuts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {projectCuts
                    .filter(c => c.id !== currentCut.id && c.videoUrl)
                    .map(c => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleSelectCutB(c)}
                        className="px-2.5 py-1 rounded-lg bg-[#141b29] hover:bg-[#1f2a40] border border-[#232d44] text-[11px] text-slate-300 flex items-center gap-1.5 transition"
                      >
                        <Film className="w-3 h-3 text-blue-400" />
                        <span>{c.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[#232d44] pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Enable Compare Mode</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
