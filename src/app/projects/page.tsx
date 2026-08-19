'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Film,
  Play,
  Trash2,
  Tv,
  CheckCircle2,
  Clock,
  Sparkles,
  LayoutGrid,
  Kanban,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AppNavbar } from '@/components/shell/AppNavbar';
import { ProjectStatus } from '@/lib/types';

export default function ProjectsPage() {
  const {
    currentCompany,
    companyProjects,
    companyClients,
    companyUsers,
    addProject,
    deleteProject,
    canManageProjects,
  } = useAuth();

  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjFps, setNewProjFps] = useState(25);
  const [newProjDesc, setNewProjDesc] = useState('');

  const filteredProjects = companyProjects.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesClient = filterClient === 'all' || p.clientId === filterClient;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesClient && matchesSearch;
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    await addProject({
      name: newProjName.trim(),
      description: newProjDesc.trim() || undefined,
      clientId: newProjClient || undefined,
      fps: Number(newProjFps) || 25,
      dropFrame: false,
      startTimecode: '01:00:00:00',
      status: 'draft',
      primaryColor: currentCompany?.brandPrimary || '#3b82f6',
    });
    setNewProjName('');
    setNewProjDesc('');
    setNewProjClient('');
    setIsNewProjectModalOpen(false);
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'client_review':
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold">Client Review</span>;
      case 'internal_review':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold">Internal Review</span>;
      case 'approved':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">Approved</span>;
      case 'changes_requested':
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">Changes Requested</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-400 text-[10px] font-bold">Delivered</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/30 text-slate-300 text-[10px] font-bold">Draft</span>;
    }
  };

  const kanbanColumns: { id: ProjectStatus; title: string }[] = [
    { id: 'draft', title: 'Draft / Setup' },
    { id: 'internal_review', title: 'Internal Review' },
    { id: 'client_review', title: 'Client Screener' },
    { id: 'changes_requested', title: 'Changes Requested' },
    { id: 'approved', title: 'Approved & Delivery' },
  ];

  return (
    <div className="min-h-screen bg-[#090c13] text-slate-100 flex flex-col select-none">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-blue-400" />
              <span>Projects & Deliverables</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Organize cuts, assign creative teams, and launch synchronized review screeners.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-0.5 bg-[#111724] border border-[#20293d] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Kanban Board View"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>

            {canManageProjects && (
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-900/30 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111724] border border-[#20293d] p-3 rounded-2xl">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="internal_review">Internal Review</option>
              <option value="client_review">Client Review</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="approved">Approved</option>
              <option value="delivered">Delivered</option>
            </select>

            {/* Client Filter */}
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Clients</option>
              {companyClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content View: Grid or Kanban */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 space-y-2">
                <FolderKanban className="w-10 h-10 mx-auto opacity-30 text-blue-400" />
                <p className="text-sm font-semibold">No projects match the selected criteria</p>
              </div>
            ) : (
              filteredProjects.map(proj => {
                const client = companyClients.find(c => c.id === proj.clientId);
                return (
                  <div
                    key={proj.id}
                    className="p-5 rounded-2xl bg-[#111724] border border-[#20293d] hover:border-blue-500/50 transition group flex flex-col justify-between gap-4 shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {getStatusBadge(proj.status)}
                        <span className="text-[10px] font-mono font-bold text-slate-400 px-1.5 py-0.5 rounded bg-[#090d14]">
                          {proj.fps} FPS
                        </span>
                      </div>
                      <Link href={`/projects/${proj.id}`}>
                        <h3 className="text-base font-bold text-white hover:text-blue-400 transition leading-snug cursor-pointer">
                          {proj.name}
                        </h3>
                      </Link>
                      {client && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-semibold text-slate-300">{client.name}</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">{proj.description || 'No description provided.'}</p>
                    </div>

                    <div className="pt-4 border-t border-[#1d2538] flex items-center justify-between">
                      <div className="text-[10px] font-mono text-slate-500">
                        Start TC: {proj.startTimecode}
                      </div>

                      <div className="flex items-center gap-2">
                        {canManageProjects && (
                          <button
                            type="button"
                            onClick={() => deleteProject(proj.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Link
                          href={`/projects/${proj.id}`}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
                        >
                          <FolderKanban className="w-3.5 h-3.5" />
                          <span>Manage Hub</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Kanban Board View */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map(col => {
              const colProjects = filteredProjects.filter(p => p.status === col.id);
              return (
                <div
                  key={col.id}
                  className="w-72 bg-[#111724] border border-[#20293d] rounded-2xl p-3 flex flex-col shrink-0 min-h-[500px]"
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#1c2438]">
                    <span className="text-xs font-bold text-slate-200">{col.title}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold font-mono">
                      {colProjects.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {colProjects.map(proj => (
                      <Link
                        key={proj.id}
                        href={`/projects/${proj.id}`}
                        className="block p-3.5 rounded-xl bg-[#141b29] border border-[#222c42] hover:border-blue-500/50 hover:bg-[#182133] transition shadow cursor-pointer"
                      >
                        <span className="text-[10px] font-mono text-slate-500">{proj.fps} fps</span>
                        <h4 className="text-xs font-bold text-white leading-tight mt-0.5 mb-1">{proj.name}</h4>
                        <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1 mt-2">
                          <span>Open Project Hub →</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1">Create New Production Project</h3>
            <p className="text-xs text-slate-400 mb-4">Set up project timecode base, client branding, and delivery scope.</p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Red Bull Series Commercial Cut 02"
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Deliverable Scope</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Master broadcast cut and social teasers..."
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Client Organization</label>
                  <select
                    value={newProjClient}
                    onChange={e => setNewProjClient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No Client (Internal)</option>
                    {companyClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Timecode Base (FPS)</label>
                  <select
                    value={newProjFps}
                    onChange={e => setNewProjFps(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value={24}>24.00 fps (Cinema)</option>
                    <option value={25}>25.00 fps (PAL / Broadcast)</option>
                    <option value={29.97}>29.97 fps (NTSC Broadcast)</option>
                    <option value={30}>30.00 fps (Web / Social)</option>
                    <option value={60}>60.00 fps (High Frame Rate)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e273b]">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#182133] text-slate-300 text-xs font-bold hover:bg-[#202c44]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 active:scale-95 transition"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
