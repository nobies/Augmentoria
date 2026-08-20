'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FolderKanban,
  Plus,
  Search,
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
  Upload,
  Check,
  X,
  Layers,
  ArrowRight,
  Sliders,
  Globe,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AppNavbar } from '@/components/shell/AppNavbar';
import { ProjectStatus, Client } from '@/lib/types';
import { getAmbientBackground } from '@/lib/theme';

function ProjectsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientQueryParam = searchParams.get('client') || 'all';

  const {
    currentCompany,
    companyProjects,
    companyClients,
    addProject,
    deleteProject,
    canManageProjects,
  } = useAuth();

  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>(clientQueryParam);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state when query param changes
  useEffect(() => {
    if (clientQueryParam) {
      setFilterClient(clientQueryParam);
    }
  }, [clientQueryParam]);

  // Active selected client (if filtered)
  const activeClient: Client | undefined = companyClients.find(c => c.id === filterClient);
  const activeAccentColor = activeClient?.accentColor || '#6366f1';

  // New Project Form State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState(activeClient ? activeClient.id : '');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjFps, setNewProjFps] = useState(24);
  const [newProjColorSpace, setNewProjColorSpace] = useState('Rec.709');
  const [newProjStartTimecode, setNewProjStartTimecode] = useState('01:00:00:00');
  const [newProjDropFrame, setNewProjDropFrame] = useState(false);
  const [newProjThumbnail, setNewProjThumbnail] = useState('');

  // Strict filtering: if filterClient !== 'all', show ONLY that client's projects
  const filteredProjects = companyProjects.filter(p => {
    const matchesClient = filterClient === 'all' || p.clientId === filterClient;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClient && matchesStatus && matchesSearch;
  });

  const handleSelectClientFilter = (clientId: string) => {
    setFilterClient(clientId);
    if (clientId === 'all') {
      router.push('/projects');
    } else {
      router.push(`/projects?client=${clientId}`);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    const matchedClient = companyClients.find(c => c.id === newProjClient);

    await addProject({
      name: newProjName.trim(),
      description: newProjDesc.trim() || undefined,
      clientId: newProjClient || undefined,
      fps: Number(newProjFps) || 24,
      colorSpace: newProjColorSpace || 'Rec.709',
      dropFrame: newProjDropFrame,
      startTimecode: newProjStartTimecode.trim() || '01:00:00:00',
      status: 'draft',
      thumbnailUrl: newProjThumbnail.trim() || undefined,
      primaryColor: matchedClient?.accentColor || currentCompany?.brandPrimary || '#6366f1',
    });

    setNewProjName('');
    setNewProjDesc('');
    setNewProjClient('');
    setNewProjThumbnail('');
    setIsNewProjectModalOpen(false);
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewProjThumbnail(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'client_review':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold">Client Review</span>;
      case 'internal_review':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold">Internal Review</span>;
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">Approved</span>;
      case 'changes_requested':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">Changes Requested</span>;
      case 'delivered':
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-400 text-[10px] font-bold">Delivered</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-300 text-[10px] font-bold">Draft</span>;
    }
  };

  const kanbanColumns: { id: ProjectStatus; title: string }[] = [
    { id: 'draft', title: 'Ingest & Setup' },
    { id: 'internal_review', title: 'Internal Review' },
    { id: 'client_review', title: 'Client Screener' },
    { id: 'changes_requested', title: 'Revisions Requested' },
    { id: 'approved', title: 'Approved & Delivered' },
  ];

  return (
    <div
      style={{
        background: filterClient !== 'all' ? getAmbientBackground(activeAccentColor) : '#06080d',
      }}
      className="min-h-screen text-slate-100 flex flex-col select-none font-sans transition-all duration-700 relative overflow-x-hidden"
    >
      {/* Ambient Top Glow Mesh */}
      {filterClient !== 'all' && (
        <div
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${activeAccentColor}28 0%, transparent 70%)`,
          }}
          className="pointer-events-none fixed inset-0 z-0 opacity-80"
        />
      )}

      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-7 relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#182033]/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                {currentCompany?.name || 'Socialeyes Studio'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                {companyProjects.length} Master Deliverables
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-white flex items-center gap-2.5">
              <span>Production Lineage & Client Screeners</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Frame-accurate review pipelines across 50 international client accounts.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-0.5 bg-[#0b0f19]/90 backdrop-blur border border-[#1b2538] p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition ${
                  viewMode === 'grid' ? 'bg-white text-black font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-xl transition ${
                  viewMode === 'kanban' ? 'bg-white text-black font-bold shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Kanban Board View"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>

            {canManageProjects && (
              <button
                type="button"
                onClick={() => {
                  setNewProjClient(activeClient ? activeClient.id : '');
                  setIsNewProjectModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold flex items-center gap-1.5 transition shadow-xl active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Project</span>
              </button>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* CLIENT SPOTLIGHT BANNER (When filtering a client) */}
        {/* ---------------------------------------------------- */}
        {activeClient && (
          <div
            style={{
              borderColor: `${activeAccentColor}44`,
              backgroundColor: `${activeAccentColor}0d`,
            }}
            className="p-5 sm:p-6 rounded-3xl border shadow-2xl relative overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95"
          >
            {/* Top Accent Strip */}
            <div
              style={{ backgroundColor: activeAccentColor }}
              className="absolute top-0 left-0 right-0 h-1"
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {activeClient.logoUrl ? (
                  <img
                    src={activeClient.logoUrl}
                    alt={activeClient.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-white/20 bg-[#06080d] shadow-lg shrink-0"
                  />
                ) : (
                  <div
                    style={{ backgroundColor: activeAccentColor }}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shrink-0"
                  >
                    {activeClient.name.charAt(0)}
                  </div>
                )}

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      Active Client Portfolio
                    </span>
                    <span
                      style={{
                        backgroundColor: `${activeAccentColor}22`,
                        color: activeAccentColor,
                        borderColor: `${activeAccentColor}55`,
                      }}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                    >
                      {activeClient.industry || 'Brand Account'}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                    {activeClient.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>{activeClient.companyName}</span>
                    {activeClient.website && (
                      <a
                        href={activeClient.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white flex items-center gap-1 transition"
                      >
                        <Globe className="w-3 h-3" />
                        <span>{activeClient.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Filter Controls */}
              <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-white block">
                    {filteredProjects.length} Dedicated Projects
                  </span>
                  <span className="text-[10px] text-slate-400">Custom Accent: {activeAccentColor}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectClientFilter('all')}
                  className="px-4 py-2 rounded-full bg-[#121927] hover:bg-[#1b253b] text-slate-200 text-xs font-bold flex items-center gap-1.5 transition border border-[#232f48]"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Show All 50 Clients</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#0b0f19]/90 border border-[#1b2538] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white transition"
              />
            </div>

            {/* Filter by Client Dropdown */}
            <select
              value={filterClient}
              onChange={e => handleSelectClientFilter(e.target.value)}
              className="px-3.5 py-2 rounded-2xl bg-[#0b0f19]/90 border border-[#1b2538] text-xs text-slate-300 focus:outline-none focus:border-white transition max-w-[200px]"
            >
              <option value="all">All Clients (50 Brands)</option>
              {companyClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Filter by Status Dropdown */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3.5 py-2 rounded-2xl bg-[#0b0f19]/90 border border-[#1b2538] text-xs text-slate-300 focus:outline-none focus:border-white transition"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="internal_review">Internal Review</option>
              <option value="client_review">Client Review</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="approved">Approved & Delivered</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 font-medium self-end md:self-center">
            Showing <strong className="text-white">{filteredProjects.length}</strong> projects
          </span>
        </div>

        {/* ---------------------------------------------------- */}
        {/* GRID VIEW */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-500 space-y-3 bg-[#0b0f19]/80 rounded-3xl border border-[#182133]">
                <FolderKanban className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                <p className="text-sm font-semibold text-white">No projects match the current filter</p>
                <p className="text-xs text-slate-400">
                  Select a different client or reset search filters to view deliverables.
                </p>
              </div>
            ) : (
              filteredProjects.map(proj => {
                const client = companyClients.find(c => c.id === proj.clientId);
                const clientAccent = client?.accentColor || proj.primaryColor || '#6366f1';
                const thumbnail = proj.thumbnailUrl || proj.coverUrl;

                return (
                  <div
                    key={proj.id}
                    style={{ borderColor: `${clientAccent}2a` }}
                    className="rounded-3xl bg-[#0b0f19]/90 backdrop-blur-md border hover:border-opacity-100 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl group relative"
                  >
                    {/* Top Thumbnail Container */}
                    <div className="relative aspect-video w-full bg-[#06080d] overflow-hidden">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={proj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          style={{ backgroundColor: `${clientAccent}18` }}
                          className="w-full h-full flex items-center justify-center text-slate-600"
                        >
                          <Film className="w-10 h-10 opacity-30" />
                        </div>
                      )}

                      {/* Dark Vignette Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-black/50" />

                      {/* Client Logo Floating Badge */}
                      {client && (
                        <div className="absolute top-3 left-3 flex items-center gap-2 p-1.5 pr-2.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 shadow-lg">
                          {client.logoUrl ? (
                            <img
                              src={client.logoUrl}
                              alt={client.name}
                              className="w-5 h-5 rounded-full object-cover border border-white/20"
                            />
                          ) : (
                            <span
                              style={{ backgroundColor: clientAccent }}
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                            >
                              {client.name.charAt(0)}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-white max-w-[110px] truncate">
                            {client.name}
                          </span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        {getStatusBadge(proj.status)}
                      </div>

                      {/* Quick Play Screener Link Button */}
                      <Link
                        href={`/screener?projectId=${proj.id}`}
                        style={{ backgroundColor: clientAccent }}
                        className="absolute bottom-3 right-3 w-9 h-9 rounded-full text-white flex items-center justify-center shadow-2xl transition active:scale-95 opacity-0 group-hover:opacity-100 hover:brightness-110"
                        title="Launch Direct Screener"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </Link>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <Link href={`/projects/${proj.id}`} className="block">
                          <h3 className="text-sm font-bold text-white hover:text-slate-200 transition line-clamp-1">
                            {proj.name}
                          </h3>
                        </Link>
                        {proj.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                      </div>

                      {/* Spec Chips & Footer */}
                      <div className="space-y-3 pt-3 border-t border-[#161e2e]">
                        {/* Technical Spec Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
                          <span className="px-2 py-0.5 rounded-md bg-[#121927] border border-[#1e273a] text-slate-300 font-bold">
                            {proj.fps} FPS
                          </span>
                          {proj.colorSpace && (
                            <span className="px-2 py-0.5 rounded-md bg-[#121927] border border-[#1e273a] text-slate-300">
                              {proj.colorSpace}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-[#121927] border border-[#1e273a] text-slate-400">
                            TC: {proj.startTimecode}
                          </span>
                        </div>

                        {/* Card Action Link */}
                        <div className="flex items-center justify-between pt-1">
                          <Link
                            href={`/projects/${proj.id}`}
                            className="text-xs font-bold text-white hover:text-slate-300 flex items-center gap-1 transition"
                          >
                            <span>Open Project Hub</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>

                          {canManageProjects && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete "${proj.name}"?`)) {
                                  await deleteProject(proj.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* KANBAN BOARD VIEW */}
        {/* ---------------------------------------------------- */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map(col => {
              const colProjects = filteredProjects.filter(p => p.status === col.id);
              return (
                <div key={col.id} className="bg-[#0b0f19]/90 border border-[#1b2538] rounded-3xl p-4 space-y-3 min-w-[240px]">
                  <div className="flex items-center justify-between pb-2 border-b border-[#182033]">
                    <span className="text-xs font-bold text-white">{col.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#141b2a] text-slate-400 font-bold">
                      {colProjects.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {colProjects.map(proj => {
                      const client = companyClients.find(c => c.id === proj.clientId);
                      const clientAccent = client?.accentColor || proj.primaryColor || '#6366f1';

                      return (
                        <div
                          key={proj.id}
                          className="p-3.5 rounded-2xl bg-[#06080d] border border-[#1a2336] hover:border-[#2a3750] transition space-y-2.5 shadow"
                        >
                          <div className="flex items-center justify-between gap-2">
                            {client && (
                              <span
                                style={{ color: clientAccent }}
                                className="text-[10px] font-bold truncate block"
                              >
                                {client.name}
                              </span>
                            )}
                            <span className="text-[9px] font-mono text-slate-500">{proj.fps} fps</span>
                          </div>

                          <Link href={`/projects/${proj.id}`} className="block">
                            <h4 className="text-xs font-bold text-white hover:text-slate-200 transition line-clamp-2">
                              {proj.name}
                            </h4>
                          </Link>

                          <div className="pt-2 border-t border-[#141b29] flex items-center justify-between text-[10px]">
                            <Link
                              href={`/projects/${proj.id}`}
                              className="text-slate-400 hover:text-white font-medium flex items-center gap-1"
                            >
                              <span>Hub</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </Link>
                            <Link
                              href={`/screener?projectId=${proj.id}`}
                              className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Screener</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ---------------------------------------------------- */}
      {/* CREATE NEW PROJECT MODAL */}
      {/* ---------------------------------------------------- */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0b0f19] border border-[#232f48] rounded-3xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 my-8 space-y-6">
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(false)}
              className="absolute right-5 top-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#141b29] transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Create Production Project</h2>
                <p className="text-xs text-slate-400">
                  Initialize master deliverable container, timecode math, color space, and client link.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Title *</label>
                  <input
                    type="text"
                    required
                    value={newProjName}
                    onChange={e => setNewProjName(e.target.value)}
                    placeholder="e.g. Vodafone RED 5G — Global Network Campaign / Red Bull Cliff Diving"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                {/* Client Link */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Client Account Link</label>
                  <select
                    value={newProjClient}
                    onChange={e => setNewProjClient(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  >
                    <option value="">Internal / No Client</option>
                    {companyClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.companyName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Space */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Color Space Target</label>
                  <select
                    value={newProjColorSpace}
                    onChange={e => setNewProjColorSpace(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  >
                    <option value="Rec.709">Rec.709 (HD / Broadcast Standard)</option>
                    <option value="DCI-P3">DCI-P3 (Theatrical Cinema / Apple Wide Color)</option>
                    <option value="Rec.2020">Rec.2020 (HDR / UHD Premium)</option>
                    <option value="ACEScg">ACEScg (Academy VFX Color Encoding)</option>
                    <option value="sRGB">sRGB (Web Deliverables)</option>
                  </select>
                </div>

                {/* FPS */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Timecode Base (FPS)</label>
                  <select
                    value={newProjFps}
                    onChange={e => setNewProjFps(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  >
                    <option value={23.976}>23.976 fps (NTSC Film)</option>
                    <option value={24}>24.000 fps (Cinema Master)</option>
                    <option value={25}>25.000 fps (PAL / Commercial)</option>
                    <option value={29.97}>29.970 fps (Broadcast NTSC)</option>
                    <option value={30}>30.000 fps (Digital Video)</option>
                    <option value={50}>50.000 fps (PAL High Speed)</option>
                    <option value={60}>60.000 fps (Gaming / Web HFR)</option>
                  </select>
                </div>

                {/* Start Timecode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Timecode (SMPTE)</label>
                  <input
                    type="text"
                    value={newProjStartTimecode}
                    onChange={e => setNewProjStartTimecode(e.target.value)}
                    placeholder="01:00:00:00"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  />
                </div>
              </div>

              {/* Thumbnail URL & Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Project Cover / Thumbnail Image</label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="url"
                    value={newProjThumbnail}
                    onChange={e => setNewProjThumbnail(e.target.value)}
                    placeholder="Paste Thumbnail Image URL (e.g. https://...)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  />
                  <label className="cursor-pointer shrink-0 w-full sm:w-auto">
                    <div className="px-4 py-2.5 rounded-xl border border-[#232f48] bg-[#121927] hover:bg-[#182235] text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition">
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      <span>Upload</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Brief / Scope</label>
                <textarea
                  rows={2}
                  value={newProjDesc}
                  onChange={e => setNewProjDesc(e.target.value)}
                  placeholder="Overview of cuts, deliverables, and director notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white resize-none transition"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#182133]">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#141b29] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-xl transition active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold">Loading projects ecosystem...</span>
          </div>
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
