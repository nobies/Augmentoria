'use client';

import React, { useState } from 'react';
import {
  X,
  Video,
  Plus,
  Upload,
  Link as LinkIcon,
  SplitSquareVertical,
  Play,
  Trash2,
  Edit2,
  Check,
  Film,
  HardDrive,
  Globe,
} from 'lucide-react';
import { Cut, Project } from '@/lib/supabase';
import { secondsToDisplayTimecode } from '@/lib/timecode';

interface AssetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  cuts: Cut[];
  activeCut: Cut | null;
  onSelectCut: (cut: Cut) => void;
  onCompareWithCut: (cutA: Cut, cutB: Cut) => void;
  onCreateCut: (data: Omit<Cut, 'id'>, file?: File) => Promise<void>;
  onDeleteCut: (cutId: string) => Promise<void>;
}

export const AssetManagerModal: React.FC<AssetManagerModalProps> = ({
  isOpen,
  onClose,
  project,
  cuts,
  activeCut,
  onSelectCut,
  onCompareWithCut,
  onCreateCut,
  onDeleteCut,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<'local' | 'vimeo' | 'youtube' | 'standalone'>('vimeo');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      await onCreateCut(
        {
          projectId: project.id,
          name: name.trim(),
          provider: file ? 'local' : provider,
          videoUrl: file ? file.name : url.trim(),
        },
        file || undefined
      );
      setName('');
      setUrl('');
      setFile(null);
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#111723] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Project Assets & Cuts Manager</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                  {cuts.length} {cuts.length === 1 ? 'asset' : 'assets'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage all versions, raw footage, and review cuts for <strong className="text-slate-200">{project.name}</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Video / Cut</span>
          </button>
        </div>

        {/* Add New Video / Cut Drawer */}
        {isAdding && (
          <form
            onSubmit={handleAddSubmit}
            className="p-4 bg-[#141b29] rounded-xl border border-blue-500/40 mb-4 space-y-3 shrink-0 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-[#232d44] pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">New Asset / Video</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Asset Name / Version</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cut 2 - Color Grade v1"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Source Type</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['vimeo', 'youtube', 'local'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                        provider === p
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#090d14] text-slate-400 hover:text-white border border-[#232d44]'
                      }`}
                    >
                      {p === 'local' ? 'Local MP4' : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {provider === 'local' ? (
              <label className="block border-2 border-dashed border-[#2b3752] hover:border-blue-500 rounded-xl p-3 text-center cursor-pointer bg-[#090d14] transition">
                <Upload className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <span className="text-xs text-slate-300 font-semibold block">
                  {file ? file.name : 'Select Video File (MP4, MOV, WebM)'}
                </span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Video URL (Vimeo / MP4)</label>
                <input
                  type="text"
                  placeholder="https://vimeo.com/... or https://..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {loading ? 'Saving Asset...' : 'Save & Add Asset'}
              </button>
            </div>
          </form>
        )}

        {/* Cuts & Assets List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {cuts.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-400" />
              <p className="text-xs">No video assets found in this project yet.</p>
            </div>
          ) : (
            cuts.map(cut => {
              const isActive = activeCut?.id === cut.id;
              return (
                <div
                  key={cut.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-blue-950/20 border-blue-500/50 shadow-md shadow-blue-900/10'
                      : 'bg-[#141b29] border-[#222c42] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-[#0d121c] border-[#1e273b] text-slate-400'
                      }`}
                    >
                      <Video className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{cut.name}</h4>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-bold uppercase tracking-wider">
                            Active Cut
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-[#0d121c] border border-[#1e273b] text-[9px] font-mono text-slate-400 uppercase">
                          {cut.provider}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {cut.videoUrl || (cut.provider === 'local' ? 'Local Cache' : 'No URL')}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Switch to this cut */}
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCut(cut);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#1b2336] hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
                        title="Work on this video"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Work on This</span>
                      </button>
                    )}

                    {/* Compare with this cut */}
                    {activeCut && !isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          onCompareWithCut(activeCut, cut);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
                        title="Compare active cut with this version"
                      >
                        <SplitSquareVertical className="w-3.5 h-3.5" />
                        <span>Compare</span>
                      </button>
                    )}

                    {/* Delete cut */}
                    {cuts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteCut(cut.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition"
                        title="Delete Cut"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#232d44] pt-4 mt-4 shrink-0">
          <span className="text-xs text-slate-400">
            Click <strong>Work on This</strong> to inspect or <strong>Compare</strong> to launch synchronized dual comparison.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1a2233] hover:bg-[#25324d] text-xs font-bold text-slate-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
