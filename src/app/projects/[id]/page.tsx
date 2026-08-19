'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FolderKanban,
  Film,
  Tv,
  Plus,
  Play,
  Share2,
  CheckCircle2,
  Clock,
  Building2,
  Users,
  Settings,
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
  FileText,
  Copy,
  Check,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AppNavbar } from '@/components/shell/AppNavbar';
import { Project, Client, Asset, AssetVersion, ReviewSession, ActivityLog, ProjectStatus } from '@/lib/types';
import { saveCut, saveProject as saveProjectStorage } from '@/lib/storage';
import {
  getProjectById,
  saveProject,
  getClientsByCompany,
  getAssetsByProject,
  saveAsset,
  getAssetVersionsByProject,
  saveAssetVersion,
  getReviewSessionsByProject,
  saveReviewSession,
  getActivityLogsByCompany,
  logActivity,
} from '@/lib/tenantStorage';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const {
    currentCompany,
    currentUser,
    companyUsers,
    canManageProjects,
  } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [projectLogs, setProjectLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'assets' | 'sessions' | 'approvals' | 'activity'>('assets');
  const [isLoading, setIsLoading] = useState(true);

  // New Cut / Version Modal
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [newCutName, setNewCutName] = useState('Cut 1 — Master Assembly');
  const [newCutProvider, setNewCutProvider] = useState<'youtube' | 'vimeo' | 'local' | 'standalone'>('youtube');
  const [newCutUrl, setNewCutUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [newCutVersion, setNewCutVersion] = useState(1);

  // New Review Session Modal
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('Client Review Screener');
  const [sessionAllowDraw, setSessionAllowDraw] = useState(true);
  const [sessionAllowGrade, setSessionAllowGrade] = useState(true);
  const [sessionCopiedId, setSessionCopiedId] = useState<string | null>(null);

  const loadProjectData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    const proj = await getProjectById(projectId);
    setProject(proj);

    if (proj && proj.companyId) {
      const clients = await getClientsByCompany(proj.companyId);
      const matchedClient = clients.find(c => c.id === proj.clientId) || null;
      setClient(matchedClient);

      const projAssets = await getAssetsByProject(proj.id);
      setAssets(projAssets);

      const projVersions = await getAssetVersionsByProject(proj.id);
      setVersions(projVersions);

      const projSessions = await getReviewSessionsByProject(proj.id);
      setSessions(projSessions);

      const allLogs = await getActivityLogsByCompany(proj.companyId);
      setProjectLogs(allLogs.filter(l => l.projectId === proj.id));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project) return;
    const updated: Project = {
      ...project,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    await saveProject(updated);
    setProject(updated);

    if (currentUser) {
      await logActivity({
        companyId: project.companyId,
        projectId: project.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'Status Updated',
        details: `Changed project status to "${newStatus}"`,
      });
      await loadProjectData();
    }
  };

  const handleCreateCut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newCutName.trim()) return;

    // 1. Ensure project exists in Screener storage
    await saveProjectStorage({
      id: project.id,
      name: project.name,
      fps: project.fps,
      dropFrame: project.dropFrame,
      startTimecode: project.startTimecode,
      createdAt: project.createdAt,
    });

    // 2. Create parent asset container
    const assetId = `asset_${Date.now()}`;
    const newAsset: Asset = {
      id: assetId,
      projectId: project.id,
      companyId: project.companyId,
      name: newCutName.trim(),
      type: 'video',
      createdAt: new Date().toISOString(),
    };
    await saveAsset(newAsset);

    // 3. Create version v1/v2
    const cutId = `cut_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newVersion: AssetVersion = {
      id: cutId,
      assetId,
      projectId: project.id,
      companyId: project.companyId,
      versionNumber: Number(newCutVersion) || 1,
      name: `v${newCutVersion} — ${newCutName.trim()}`,
      provider: newCutProvider,
      videoUrl: newCutUrl.trim(),
      durationSeconds: 120,
      uploadedByUserId: currentUser?.id || 'user_admin',
      uploadedByUserName: currentUser?.name || 'Studio Member',
      createdAt: new Date().toISOString(),
    };
    await saveAssetVersion(newVersion);

    // 4. Save to Screener Cuts DB so it is instantly playable in Screener Studio
    await saveCut({
      id: cutId,
      projectId: project.id,
      name: newVersion.name,
      provider: newCutProvider,
      videoUrl: newCutUrl.trim(),
      durationSeconds: 120,
      createdAt: new Date().toISOString(),
    });

    if (currentUser) {
      await logActivity({
        companyId: project.companyId,
        projectId: project.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'Uploaded New Cut',
        details: `Added ${newVersion.name} (${newCutProvider})`,
      });
    }

    setIsAddAssetModalOpen(false);
    await loadProjectData();
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newSessionTitle.trim()) return;

    const newSession: ReviewSession = {
      id: `session_${Date.now()}`,
      projectId: project.id,
      companyId: project.companyId,
      title: newSessionTitle.trim(),
      status: 'active',
      playlistAssetIds: versions.map(v => v.id),
      hostUserId: currentUser?.id,
      allowClientDraw: sessionAllowDraw,
      allowClientGrade: sessionAllowGrade,
      allowClientVoice: true,
      allowClientExport: true,
      createdAt: new Date().toISOString(),
    };
    await saveReviewSession(newSession);

    if (currentUser) {
      await logActivity({
        companyId: project.companyId,
        projectId: project.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'Created Review Session',
        details: `Initiated "${newSession.title}" with ${newSession.playlistAssetIds.length} playlist cuts`,
      });
    }

    setIsNewSessionModalOpen(false);
    await loadProjectData();
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'client_review':
        return <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">Client Review</span>;
      case 'internal_review':
        return <span className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold">Internal Review</span>;
      case 'approved':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">Approved</span>;
      case 'changes_requested':
        return <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">Changes Requested</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-300 text-xs font-bold">Delivered</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-300 text-xs font-bold">Draft</span>;
    }
  };

  if (isLoading || !project) {
    return (
      <div className="min-h-screen bg-[#090c13] text-slate-100 flex flex-col">
        <AppNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold">Loading project hub...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090c13] text-slate-100 flex flex-col select-none">
      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/projects" className="hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Projects</span>
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-bold truncate">{project.name}</span>
        </div>

        {/* Project Header Banner */}
        <div className="bg-[#111724] border border-[#20293d] p-5 sm:p-6 rounded-3xl shadow-2xl relative overflow-hidden space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(project.status)}
                {client && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-300 px-2.5 py-0.5 rounded-full bg-[#182133] border border-[#243048]">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>{client.name}</span>
                  </span>
                )}
                <span className="font-mono text-xs font-bold text-blue-400 px-2 py-0.5 rounded bg-[#090d14] border border-[#1e273b]">
                  {project.fps} FPS
                </span>
                <span className="font-mono text-xs text-slate-400 px-2 py-0.5 rounded bg-[#090d14]">
                  TC: {project.startTimecode}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                {project.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
                {project.description || 'Comprehensive multi-version media review and client sign-off hub.'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              {canManageProjects && (
                <select
                  value={project.status}
                  onChange={e => handleStatusChange(e.target.value as ProjectStatus)}
                  className="px-3 py-2 rounded-xl bg-[#182133] border border-[#26334d] text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="draft">Set: Draft</option>
                  <option value="internal_review">Set: Internal Review</option>
                  <option value="client_review">Set: Client Review</option>
                  <option value="changes_requested">Set: Changes Requested</option>
                  <option value="approved">Set: Approved</option>
                  <option value="delivered">Set: Delivered</option>
                </select>
              )}

              <Link
                href={`/?projectId=${project.id}`}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-900/40 active:scale-95 transition"
              >
                <Tv className="w-4 h-4" />
                <span>Launch Screener Studio</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#1c2438] pb-1 overflow-x-auto">
          {[
            { id: 'assets', label: 'Media Library & Versions', icon: Film, count: versions.length },
            { id: 'sessions', label: 'Review Sessions & Playlists', icon: Tv, count: sessions.length },
            { id: 'approvals', label: 'Approvals & Sign-Off', icon: CheckSquare },
            { id: 'activity', label: 'Activity Trail', icon: Clock, count: projectLogs.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#111724]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#182133] text-[10px] font-mono font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Media Library & Version Lineage */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Project Media Cuts & Version Lineage</h2>
                <p className="text-xs text-slate-400">Manage review cuts, compare passes, and version progressions.</p>
              </div>

              {canManageProjects && (
                <button
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload / Add Media Cut</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {versions.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 space-y-2 bg-[#111724] border border-[#20293d] rounded-2xl p-6">
                  <Film className="w-10 h-10 mx-auto opacity-30 text-blue-400" />
                  <p className="text-sm font-semibold">No media cuts uploaded yet</p>
                  <p className="text-xs text-slate-500">Add YouTube, Vimeo, or MP4 video cuts to start reviewing.</p>
                </div>
              ) : (
                versions.map(ver => (
                  <div
                    key={ver.id}
                    className="p-4 rounded-2xl bg-[#111724] border border-[#20293d] hover:border-blue-500/50 transition group flex flex-col justify-between gap-3 shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs font-mono font-bold">
                          v{ver.versionNumber}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-[#090d14]">
                          {ver.provider}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition leading-snug">
                        {ver.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        By: <span className="text-slate-300 font-semibold">{ver.uploadedByUserName}</span>
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[#1d2538] flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(ver.createdAt).toLocaleDateString()}
                      </span>

                      <Link
                        href={`/?projectId=${project.id}&cutId=${ver.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#182133] hover:bg-blue-600 hover:text-white text-blue-400 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Launch Review</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Review Sessions & Playlists */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Synchronized Review Sessions</h2>
                <p className="text-xs text-slate-400">Interactive live screeners and multi-cut playlist sessions.</p>
              </div>

              {canManageProjects && (
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Review Session</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 space-y-2 bg-[#111724] border border-[#20293d] rounded-2xl p-6">
                  <Tv className="w-10 h-10 mx-auto opacity-30 text-purple-400" />
                  <p className="text-sm font-semibold">No active review sessions</p>
                  <p className="text-xs text-slate-500">Create a session to invite clients with passwordless review links.</p>
                </div>
              ) : (
                sessions.map(sess => (
                  <div
                    key={sess.id}
                    className="p-5 rounded-2xl bg-[#111724] border border-[#20293d] hover:border-purple-500/50 transition group flex flex-col justify-between gap-4 shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          Active Session
                        </span>
                        <span className="text-xs font-mono font-bold text-purple-400">
                          {sess.playlistAssetIds.length} Cuts in Playlist
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                        {sess.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Draw Permissions: {sess.allowClientDraw ? 'Enabled' : 'Disabled'} • Grade Permissions: {sess.allowClientGrade ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#1d2538] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/review/demo_token_${sess.id}`;
                          navigator.clipboard.writeText(url);
                          setSessionCopiedId(sess.id);
                          setTimeout(() => setSessionCopiedId(null), 2500);
                        }}
                        className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-[#182133] transition"
                      >
                        {sessionCopiedId === sess.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied Magic Link!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-blue-400" />
                            <span>Copy Client Link</span>
                          </>
                        )}
                      </button>

                      <Link
                        href="/"
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Join Session</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Approval Gates & Sign-Off */}
        {activeTab === 'approvals' && (
          <div className="space-y-6 bg-[#111724] border border-[#20293d] p-6 rounded-2xl shadow-xl">
            <div>
              <h2 className="text-base font-bold text-white">Production Sign-Off & Approval Gates</h2>
              <p className="text-xs text-slate-400">Traceable decision points from initial ingest to final client sign-off.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { stage: '1. Ingest & Sync', done: true, desc: 'Media linked & timecode locked' },
                { stage: '2. Internal Review', done: project.status !== 'draft', desc: 'Creative editor approval' },
                { stage: '3. Client Screener', done: project.status === 'client_review' || project.status === 'approved' || project.status === 'delivered', desc: 'Magic screener link active' },
                { stage: '4. Revisions & Fixes', done: project.status === 'changes_requested', desc: 'Notes and markups resolved' },
                { stage: '5. Final Approval', done: project.status === 'approved' || project.status === 'delivered', desc: 'Client sign-off complete' },
              ].map((step, idx) => (
                <div
                  key={step.stage}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    step.done
                      ? 'bg-blue-600/10 border-blue-500/40 text-white'
                      : 'bg-[#0d121c] border-[#1e273b] text-slate-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Gate {idx + 1}</span>
                      {step.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <h4 className="text-xs font-bold mb-1">{step.stage}</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Activity Trail */}
        {activeTab === 'activity' && (
          <div className="space-y-4 bg-[#111724] border border-[#20293d] p-6 rounded-2xl shadow-xl">
            <h2 className="text-base font-bold text-white">Project Activity & Decision Log</h2>
            <div className="space-y-3">
              {projectLogs.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No activity recorded for this project yet.</p>
              ) : (
                projectLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl bg-[#141b29] border border-[#1e273b] flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white">{log.userName}</span>
                        <span className="text-[10px] text-slate-500">({log.userRole})</span>
                        <span className="text-xs font-semibold text-blue-400">• {log.action}</span>
                      </div>
                      <p className="text-xs text-slate-400">{log.details}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Cut Modal */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1">Add New Media Cut / Version</h3>
            <p className="text-xs text-slate-400 mb-4">Upload or link a video version to {project.name}.</p>

            <form onSubmit={handleCreateCut} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cut Label / Name</label>
                <input
                  type="text"
                  required
                  value={newCutName}
                  onChange={e => setNewCutName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Version Number</label>
                  <input
                    type="number"
                    min={1}
                    value={newCutVersion}
                    onChange={e => setNewCutVersion(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Provider Type</label>
                  <select
                    value={newCutProvider}
                    onChange={e => setNewCutProvider(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="youtube">YouTube URL</option>
                    <option value="vimeo">Vimeo URL</option>
                    <option value="local">Local MP4 / Cloud File</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Video Stream URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={newCutUrl}
                  onChange={e => setNewCutUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e273b]">
                <button
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#182133] text-slate-300 text-xs font-bold hover:bg-[#202c44]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 active:scale-95 transition"
                >
                  Save Media Cut
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Review Session Modal */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111724] border border-[#232d44] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1">Create Client Review Session</h3>
            <p className="text-xs text-slate-400 mb-4">Set up a synchronized playlist screener with custom reviewer permissions.</p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={newSessionTitle}
                  onChange={e => setNewSessionTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090d14] border border-[#232d44] text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2 p-3 bg-[#0d121c] rounded-xl border border-[#1e273b]">
                <span className="text-xs font-bold text-white block mb-1">Reviewer Permissions</span>
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Allow Drawing & Markup</span>
                  <input
                    type="checkbox"
                    checked={sessionAllowDraw}
                    onChange={e => setSessionAllowDraw(e.target.checked)}
                    className="w-4 h-4 accent-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Allow Color Grading Adjustment Proposals</span>
                  <input
                    type="checkbox"
                    checked={sessionAllowGrade}
                    onChange={e => setSessionAllowGrade(e.target.checked)}
                    className="w-4 h-4 accent-blue-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1e273b]">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#182133] text-slate-300 text-xs font-bold hover:bg-[#202c44]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 active:scale-95 transition"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
