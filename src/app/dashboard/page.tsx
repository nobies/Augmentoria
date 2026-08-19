'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Users,
  Building2,
  Tv,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  Play,
  Film,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AppNavbar } from '@/components/shell/AppNavbar';
import { StudioBrandingModal } from '@/components/StudioBrandingModal';

export default function DashboardPage() {
  const {
    currentCompany,
    currentUser,
    companyProjects,
    companyClients,
    companyUsers,
    activityLogs,
    updateCompanyBranding,
    addProject,
    canManageProjects,
  } = useAuth();

  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjFps, setNewProjFps] = useState(25);

  const activeProjectsCount = companyProjects.filter(p => p.status !== 'delivered' && p.status !== 'archived').length;
  const inReviewProjectsCount = companyProjects.filter(p => p.status === 'client_review' || p.status === 'internal_review').length;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    await addProject({
      name: newProjName.trim(),
      clientId: newProjClient || undefined,
      fps: Number(newProjFps) || 25,
      dropFrame: false,
      startTimecode: '01:00:00:00',
      status: 'draft',
      primaryColor: currentCompany?.brandPrimary || '#3b82f6',
    });
    setNewProjName('');
    setIsNewProjectModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
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

  return (
    <div className="min-h-screen bg-[#090c13] text-slate-100 flex flex-col select-none">
      <AppNavbar onOpenBranding={() => setIsBrandingOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111724] border border-[#20293d] p-5 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                {currentCompany?.name} Workspace
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Welcome back, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Producer'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage your production deliverables, synchronized client screeners, and media assets.
            </p>
          </div>

          <div className="flex items-center gap-2.5 relative z-10 shrink-0">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-[#182133] hover:bg-[#222e47] border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-2 transition shadow-lg"
            >
              <Tv className="w-4 h-4 text-purple-400" />
              <span>Open Screener Studio</span>
            </Link>

            {canManageProjects && (
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-blue-900/40 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            )}
          </div>

          {/* Subtle background glow */}
          <div
            style={{ backgroundColor: currentCompany?.brandPrimary || '#3b82f6' }}
            className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
          />
        </div>

        {/* Analytics & Health Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[#111724] border border-[#20293d] shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">Active Projects</span>
              <FolderKanban className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{activeProjectsCount}</div>
            <span className="text-[10px] text-slate-500 font-semibold">{companyProjects.length} total projects</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#111724] border border-[#20293d] shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">In Active Review</span>
              <Film className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-300">{inReviewProjectsCount}</div>
            <span className="text-[10px] text-purple-400 font-semibold">Live client screeners</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#111724] border border-[#20293d] shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">Registered Clients</span>
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-300">{companyClients.length}</div>
            <span className="text-[10px] text-slate-500 font-semibold">Client organizations</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#111724] border border-[#20293d] shadow-xl">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold">Studio Team</span>
              <Users className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-black text-white">{companyUsers.length}</div>
            <span className="text-[10px] text-slate-500 font-semibold">Active team members</span>
          </div>
        </div>

        {/* Main Grid: Projects List & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Recent Projects</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                  {companyProjects.length}
                </span>
              </div>
              <Link
                href="/projects"
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
              >
                <span>View All Projects</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {companyProjects.map(proj => {
                const client = companyClients.find(c => c.id === proj.clientId);
                return (
                  <div
                    key={proj.id}
                    className="p-4 rounded-2xl bg-[#111724] border border-[#20293d] hover:border-blue-500/50 transition group flex flex-col justify-between gap-4 shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        {getStatusBadge(proj.status)}
                        <span className="text-[10px] font-mono font-bold text-slate-500">{proj.fps} fps</span>
                      </div>
                      <Link href={`/projects/${proj.id}`}>
                        <h3 className="text-sm font-bold text-white hover:text-blue-400 transition leading-snug cursor-pointer">
                          {proj.name}
                        </h3>
                      </Link>
                      {client && (
                        <span className="text-[11px] font-semibold text-slate-400 block mt-1">
                          Client: <span className="text-slate-300">{client.name}</span>
                        </span>
                      )}
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{proj.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#1d2538] flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-500 font-mono">
                        TC: {proj.startTimecode}
                      </span>
                      <Link
                        href={`/projects/${proj.id}`}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold transition"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Open Hub</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Log Feed (1 Col) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Audit & Activity Trail</span>
              </h2>
            </div>

            <div className="p-4 rounded-2xl bg-[#111724] border border-[#20293d] shadow-xl space-y-3">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No recent activity</p>
              ) : (
                activityLogs.slice(0, 6).map(log => (
                  <div key={log.id} className="pb-3 border-b border-[#1c2438] last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-1 text-[11px] mb-0.5">
                      <span className="font-bold text-slate-200">{log.userName}</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-blue-400">{log.action}</p>
                    <p className="text-[11px] text-slate-400">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
                  placeholder="e.g. Nike Winter Campaign Cut 01"
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
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
                    <option value={25}>25.00 fps (PAL / Commercial)</option>
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

      {/* Studio Branding Modal */}
      {isBrandingOpen && currentCompany && (
        <StudioBrandingModal
          isOpen={isBrandingOpen}
          onClose={() => setIsBrandingOpen(false)}
          branding={{
            name: currentCompany.name,
            tagline: currentCompany.tagline || '',
            primaryColor: currentCompany.brandPrimary,
            secondaryColor: currentCompany.brandSecondary,
          }}
          onSaveBranding={async updated => {
            await updateCompanyBranding({
              name: updated.name,
              tagline: updated.tagline,
              brandPrimary: updated.primaryColor,
              brandSecondary: updated.secondaryColor,
            });
            setIsBrandingOpen(false);
          }}
        />
      )}
    </div>
  );
}
