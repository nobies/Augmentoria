'use client';

import React, { useState } from 'react';
import { X, SplitSquareVertical, Tv, Film, Check, Upload, Video } from 'lucide-react';
import { Cut } from '@/lib/supabase';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCut: Cut;
  projectCuts: Cut[];
  onApplyCompare: (urlA: string, urlB: string, fileA?: File, fileB?: File) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  currentCut,
  projectCuts,
  onApplyCompare,
}) => {
  const [sourceTypeA, setSourceTypeA] = useState<'url' | 'file'>('url');
  const [sourceTypeB, setSourceTypeB] = useState<'url' | 'file'>('url');

  const [urlA, setUrlA] = useState(currentCut.videoUrl || '');
  const [urlB, setUrlB] = useState(currentCut.videoUrlB || '');

  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const finalA = sourceTypeA === 'file' ? (fileA ? URL.createObjectURL(fileA) : '') : urlA.trim();
    const finalB = sourceTypeB === 'file' ? (fileB ? URL.createObjectURL(fileB) : '') : urlB.trim();

    if (!finalA || !finalB) {
      setError('Please provide two valid video clips (URLs, files, or project cuts) to compare.');
      return;
    }

    setError('');
    onApplyCompare(finalA, finalB, fileA || undefined, fileB || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111723] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <SplitSquareVertical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Compare Two Clips / Cuts</h2>
            <p className="text-xs text-slate-400">
              Synchronize two videos side-by-side or toggle A/B. Use URLs, local video files, or existing project cuts.
            </p>
          </div>
        </div>

        <form onSubmit={handleApply} className="space-y-5">
          {/* CLIP A */}
          <div className="p-3.5 bg-[#141b29] rounded-xl border border-[#222c42] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Clip A (Primary Cut)
              </span>
              <div className="flex items-center gap-1 bg-[#0b0e16] p-0.5 rounded-lg border border-[#1e273b]">
                <button
                  type="button"
                  onClick={() => setSourceTypeA('url')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sourceTypeA === 'url' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Link / Cut
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTypeA('file')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sourceTypeA === 'file' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Local File
                </button>
              </div>
            </div>

            {sourceTypeA === 'url' ? (
              <div>
                <input
                  type="text"
                  value={urlA}
                  onChange={e => setUrlA(e.target.value)}
                  placeholder="Paste Vimeo/YouTube link or MP4 URL..."
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500 transition"
                />
                {projectCuts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] text-slate-500 mr-1">Project cuts:</span>
                    {projectCuts
                      .filter(c => c.videoUrl)
                      .map(c => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setUrlA(c.videoUrl || '')}
                          className="px-2 py-0.5 rounded bg-[#1b2336] hover:bg-[#25324d] text-[10px] text-slate-300 transition"
                        >
                          {c.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <label className="block border-2 border-dashed border-[#2b3752] hover:border-blue-500 rounded-xl p-3 text-center cursor-pointer bg-[#090d14] transition">
                <Video className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <span className="text-xs text-slate-300 font-semibold block">
                  {fileA ? fileA.name : 'Select Local Video File for Clip A'}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={e => setFileA(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* CLIP B */}
          <div className="p-3.5 bg-[#141b29] rounded-xl border border-[#222c42] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                Clip B (Compare Cut)
              </span>
              <div className="flex items-center gap-1 bg-[#0b0e16] p-0.5 rounded-lg border border-[#1e273b]">
                <button
                  type="button"
                  onClick={() => setSourceTypeB('url')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sourceTypeB === 'url' ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Link / Cut
                </button>
                <button
                  type="button"
                  onClick={() => setSourceTypeB('file')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sourceTypeB === 'file' ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Local File
                </button>
              </div>
            </div>

            {sourceTypeB === 'url' ? (
              <div>
                <input
                  type="text"
                  value={urlB}
                  onChange={e => setUrlB(e.target.value)}
                  placeholder="Paste second Vimeo/YouTube link or pick from project..."
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-purple-500 transition"
                />
                {projectCuts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] text-slate-500 mr-1">Project cuts:</span>
                    {projectCuts
                      .filter(c => c.id !== currentCut.id && c.videoUrl)
                      .map(c => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setUrlB(c.videoUrl || '')}
                          className="px-2 py-0.5 rounded bg-[#1b2336] hover:bg-[#25324d] text-[10px] text-slate-300 transition"
                        >
                          {c.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <label className="block border-2 border-dashed border-[#2b3752] hover:border-purple-500 rounded-xl p-3 text-center cursor-pointer bg-[#090d14] transition">
                <Video className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <span className="text-xs text-slate-300 font-semibold block">
                  {fileB ? fileB.name : 'Select Local Video File for Clip B'}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={e => setFileB(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

          {/* Action Buttons */}
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Launch Compare Mode</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
