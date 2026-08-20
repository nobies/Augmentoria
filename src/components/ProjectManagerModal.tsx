'use client';

import React, { useState } from 'react';
import {
  X,
  FolderPlus,
  Film,
  Plus,
  Trash2,
  Check,
  Clock,
  Play,
  Video,
  Upload,
  HardDrive,
  Tv,
  Search,
} from 'lucide-react';
import { Project, Cut } from '@/lib/supabase';
import { STANDARD_FPS_LIST } from '@/lib/timecode';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProject: Project | null;
  activeCut: Cut | null;
  cuts: Cut[];
  onSelectProject: (project: Project) => void;
  onSelectCut: (cut: Cut) => void;
  onCreateProject: (proj: Omit<Project, 'id'>) => Promise<void>;
  onDeleteProject: (projId: string) => Promise<void>;
  onCreateCut: (cut: Omit<Cut, 'id'>, videoFile?: File) => Promise<void>;
  onDeleteCut: (cutId: string) => Promise<void>;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProject,
  activeCut,
  cuts,
  onSelectProject,
  onSelectCut,
  onCreateProject,
  onDeleteProject,
  onCreateCut,
  onDeleteCut,
}) => {
  const [tab, setTab] = useState<'switch' | 'new-proj' | 'new-cut'>('switch');
  const [searchQuery, setSearchQuery] = useState('');

  // New Project Form
  const [newProjName, setNewProjName] = useState('');
  const [newProjFps, setNewProjFps] = useState(25);
  const [newProjDropFrame, setNewProjDropFrame] = useState(false);
  const [newProjStartTc, setNewProjStartTc] = useState('01:00:00:00');

  // New Cut Form
  const [newCutName, setNewCutName] = useState('Cut 2');
  const [newCutProvider, setNewCutProvider] = useState<'local' | 'youtube' | 'vimeo' | 'standalone'>('local');
  const [newCutUrl, setNewCutUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleCreateProjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    await onCreateProject({
      name: newProjName.trim(),
      fps: Number(newProjFps),
      dropFrame: newProjDropFrame,
      startTimecode: newProjStartTc.trim() || '01:00:00:00',
    });
    setNewProjName('');
    setTab('switch');
  };

  const handleCreateCutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newCutName.trim()) return;
    setUploading(true);
    try {
      await onCreateCut(
        {
          projectId: activeProject.id,
          name: newCutName.trim(),
          provider: newCutProvider,
          videoUrl: newCutUrl.trim(),
        },
        selectedFile || undefined
      );
      setNewCutName('');
      setSelectedFile(null);
      setNewCutUrl('');
      setTab('switch');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#101623] border border-[#232d44] rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-[#1e273b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Project & Version Manager</h2>
              <p className="text-xs text-slate-400">Manage review cuts, timecode bases, and media assets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2233] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="px-5 pt-3 border-b border-[#1e273b] flex items-center gap-2 bg-[#0d121c]">
          <button
            onClick={() => setTab('switch')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              tab === 'switch'
                ? 'border-blue-500 text-blue-400 bg-[#141b29]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Projects & Cuts
          </button>
          <button
            onClick={() => setTab('new-proj')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
              tab === 'new-proj'
                ? 'border-blue-500 text-blue-400 bg-[#141b29]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
          <button
            onClick={() => setTab('new-cut')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
              tab === 'new-cut'
                ? 'border-blue-500 text-blue-400 bg-[#141b29]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Cut / Version</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'switch' && (
            <div className="space-y-6">
              {/* Projects List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Projects ({projects.length})
                  </div>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search 500 projects..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0a0e17] border border-[#232d44] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
                  {projects
                    .filter(p =>
                      !searchQuery.trim() ||
                      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
                    )
                    .map(p => {
                      const isSelected = activeProject?.id === p.id;
                      return (
                      <div
                        key={p.id}
                        onClick={() => onSelectProject(p)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-lg shadow-blue-900/10'
                            : 'bg-[#141b29] border-[#222c42] text-slate-300 hover:bg-[#1a2336] hover:border-[#2f3d5c]'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            {p.name}
                            {isSelected && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-[#1e273b] text-blue-300 font-mono">
                              {p.fps} fps
                            </span>
                            <span className="font-mono text-slate-500">{p.startTimecode}</span>
                          </div>
                        </div>
                        {projects.length > 1 && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (confirm(`Delete project "${p.name}"?`)) onDeleteProject(p.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cuts for Active Project */}
              {activeProject && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Cuts / Versions for &quot;{activeProject.name}&quot;
                    </div>
                    <button
                      onClick={() => setTab('new-cut')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Cut</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {cuts.map(c => {
                      const isSelected = activeCut?.id === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => onSelectCut(c)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-600/15 border-blue-500/40 text-white'
                              : 'bg-[#141b29] border-[#222c42] text-slate-300 hover:bg-[#1a2336]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#1a2336] text-blue-400">
                              {c.provider === 'youtube' ? (
                                <Play className="w-4 h-4 text-red-400" />
                              ) : c.provider === 'vimeo' ? (
                                <Tv className="w-4 h-4 text-sky-400" />
                              ) : c.provider === 'drive' ? (
                                <HardDrive className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Video className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                            <div>
                              <div className="text-xs font-semibold">{c.name}</div>
                              <div className="text-[10px] text-slate-400 capitalize">
                                Source: {c.provider} {c.videoUrl ? `(${c.videoUrl.slice(0, 35)}...)` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                                Active Cut
                              </span>
                            )}
                            {cuts.length > 1 && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (confirm(`Delete version "${c.name}"?`)) onDeleteCut(c.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'new-proj' && (
            <form onSubmit={handleCreateProjSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  placeholder="e.g. Nike Commercial - Spring 2026"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#171f30] border border-[#242f48] text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Timeline Timebase (FPS)</label>
                  <select
                    value={newProjFps}
                    onChange={e => setNewProjFps(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#171f30] border border-[#242f48] text-sm text-white focus:outline-none focus:border-blue-500 transition"
                  >
                    {STANDARD_FPS_LIST.map(f => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Timecode</label>
                  <input
                    type="text"
                    value={newProjStartTc}
                    onChange={e => setNewProjStartTc(e.target.value)}
                    placeholder="01:00:00:00"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#171f30] border border-[#242f48] text-sm font-mono text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="dropframe"
                  checked={newProjDropFrame}
                  onChange={e => setNewProjDropFrame(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-[#171f30] border-[#242f48]"
                />
                <label htmlFor="dropframe" className="text-xs text-slate-300 cursor-pointer">
                  Drop-Frame Timecode (for 29.97 / 59.94 fps broadcast delivery)
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#1e273b]">
                <button
                  type="button"
                  onClick={() => setTab('switch')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-lg shadow-blue-900/30"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          )}

          {tab === 'new-cut' && (
            <form onSubmit={handleCreateCutSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cut / Version Name</label>
                <input
                  type="text"
                  required
                  value={newCutName}
                  onChange={e => setNewCutName(e.target.value)}
                  placeholder="e.g. Cut 2 - Director Review, Picture Lock"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#171f30] border border-[#242f48] text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Media Source</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'local', label: 'Local File', icon: Upload },
                    { id: 'youtube', label: 'YouTube', icon: Play },
                    { id: 'vimeo', label: 'Vimeo', icon: Tv },
                    { id: 'standalone', label: 'Standalone', icon: Clock },
                  ].map(item => {
                    const SIcon = item.icon;
                    const isSelected = newCutProvider === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setNewCutProvider(item.id as any)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 font-semibold'
                            : 'bg-[#171f30] border-[#242f48] text-slate-400 hover:text-white'
                        }`}
                      >
                        <SIcon className="w-4 h-4" />
                        <span className="text-[11px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {newCutProvider === 'local' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Video File</label>
                  <label className="block border-2 border-dashed border-[#2b3752] hover:border-blue-500/50 rounded-xl p-4 text-center cursor-pointer bg-[#141b29] transition">
                    <Video className="w-6 h-6 text-blue-400 mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-slate-200 block">
                      {selectedFile ? selectedFile.name : 'Click to select or drop video file (MP4, MOV, WebM)'}
                    </span>
                    {selectedFile && (
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Size: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {(newCutProvider === 'youtube' || newCutProvider === 'vimeo') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {newCutProvider === 'youtube' ? 'YouTube Video URL' : 'Vimeo Video URL'}
                  </label>
                  <input
                    type="url"
                    required
                    value={newCutUrl}
                    onChange={e => setNewCutUrl(e.target.value)}
                    placeholder={
                      newCutProvider === 'youtube'
                        ? 'https://www.youtube.com/watch?v=...'
                        : 'https://vimeo.com/...'
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#171f30] border border-[#242f48] text-sm text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              )}

              {newCutProvider === 'standalone' && (
                <p className="text-xs text-slate-400 bg-[#141b29] p-3 rounded-xl border border-[#232d44]">
                  Standalone mode runs an interactive SMPTE timecode clock without requiring a loaded video file.
                </p>
              )}

              <div className="pt-4 flex justify-end gap-2 border-t border-[#1e273b]">
                <button
                  type="button"
                  onClick={() => setTab('switch')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-lg shadow-blue-900/30 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{uploading ? 'Processing Cut...' : 'Save & Open Cut'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
