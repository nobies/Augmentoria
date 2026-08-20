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
  Trash2,
  Sliders,
  Globe,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AppNavbar } from '@/components/shell/AppNavbar';
import { Project, Client, Asset, AssetVersion, ReviewSession, ActivityLog, ProjectStatus } from '@/lib/types';
import { getAmbientBackground, getVideoThumbnail, detectVideoProvider } from '@/lib/theme';
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
    companyClients,
    updateProject,
    deleteProject,
    canManageProjects,
  } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [projectLogs, setProjectLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'assets' | 'sessions' | 'approvals' | 'activity' | 'settings'>('assets');
  const [isLoading, setIsLoading] = useState(true);

  // Settings Tab Edit State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editFps, setEditFps] = useState(24);
  const [editColorSpace, setEditColorSpace] = useState('Rec.709');
  const [editStartTimecode, setEditStartTimecode] = useState('01:00:00:00');
  const [editDropFrame, setEditDropFrame] = useState(false);
  const [editThumbnail, setEditThumbnail] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

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

    if (proj) {
      setEditName(proj.name || '');
      setEditDesc(proj.description || '');
      setEditClientId(proj.clientId || '');
      setEditFps(proj.fps || 24);
      setEditColorSpace(proj.colorSpace || 'Rec.709');
      setEditStartTimecode(proj.startTimecode || '01:00:00:00');
      setEditDropFrame(Boolean(proj.dropFrame));
      setEditThumbnail(proj.thumbnailUrl || proj.coverUrl || '');

      if (proj.companyId) {
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
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project) return;
    await updateProject(project.id, { status: newStatus });
    setProject(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !editName.trim()) return;
    setIsSavingSettings(true);

    const matchedClient = companyClients.find(c => c.id === editClientId);

    const updatedData: Partial<Project> = {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      clientId: editClientId || undefined,
      fps: Number(editFps) || 24,
      colorSpace: editColorSpace || 'Rec.709',
      startTimecode: editStartTimecode.trim() || '01:00:00:00',
      dropFrame: editDropFrame,
      thumbnailUrl: editThumbnail.trim() || undefined,
      primaryColor: matchedClient?.accentColor || project.primaryColor,
    };

    await updateProject(project.id, updatedData);
    setIsSavingSettings(false);
    setSettingsSavedSuccess(true);
    setTimeout(() => setSettingsSavedSuccess(false), 3000);
    await loadProjectData();
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setEditThumbnail(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMediaCut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !currentCompany) return;

    let targetAsset = assets[0];
    if (!targetAsset) {
      targetAsset = {
        id: `asset_${Date.now()}`,
        projectId: project.id,
        companyId: currentCompany.id,
        name: 'Master Video Sequence',
        type: 'video',
        createdAt: new Date().toISOString(),
      };
      await saveAsset(targetAsset);
      setAssets([targetAsset]);
    }

    const detectedProv = detectVideoProvider(newCutUrl);
    const cutThumb = getVideoThumbnail(newCutUrl, project.thumbnailUrl);

    const newVersionObj: AssetVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      assetId: targetAsset.id,
      projectId: project.id,
      companyId: currentCompany.id,
      versionNumber: newCutVersion,
      name: newCutName,
      provider: detectedProv,
      videoUrl: newCutUrl,
      thumbnailUrl: cutThumb,
      durationSeconds: 120,
      uploadedByUserId: currentUser?.id || 'user_1',
      uploadedByUserName: currentUser?.name || 'Studio Member',
      createdAt: new Date().toISOString(),
    };

    await saveAssetVersion(newVersionObj);

    // Sync with screener storage
    try {
      await saveCut({
        id: newVersionObj.id,
        projectId: project.id,
        name: `${project.name} — ${newCutName} (v${newCutVersion})`,
        videoUrl: newCutUrl,
        provider: detectedProv === 'youtube' ? 'youtube' : detectedProv === 'vimeo' ? 'vimeo' : 'local',
        durationSeconds: 120,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Storage sync:', err);
    }

    if (currentUser) {
      await logActivity({
        companyId: currentCompany.id,
        projectId: project.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'Uploaded Media Cut',
        details: `Added ${newCutName} (v${newCutVersion}) [${detectedProv.toUpperCase()}]`,
      });
    }

    setIsAddAssetModalOpen(false);
    await loadProjectData();
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !currentCompany) return;

    const newSession: ReviewSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: project.id,
      companyId: currentCompany.id,
      title: newSessionTitle,
      status: 'active',
      playlistAssetIds: assets.map(a => a.id),
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
        companyId: currentCompany.id,
        projectId: project.id,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'Created Review Session',
        details: `Created review playlist "${newSessionTitle}"`,
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
      <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col">
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

  // Strict Tenant Isolation: Block members from viewing projects of other companies
  const isUnauthorized = currentCompany && project.companyId !== currentCompany.id && currentUser?.role !== 'super_admin';

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-[#06080d] text-slate-100 flex flex-col">
        <AppNavbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Restricted</h2>
          <p className="text-xs text-slate-400">
            This project belongs to another studio workspace. Your account ({currentUser?.name} @ {currentCompany?.name}) does not have permission to view this project.
          </p>
          <Link
            href="/projects"
            className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold transition shadow"
          >
            Back to {currentCompany?.name} Projects
          </Link>
        </div>
      </div>
    );
  }

  const clientAccent = client?.accentColor || project.primaryColor || '#6366f1';
  const thumbnail = project.thumbnailUrl || project.coverUrl;

  return (
    <div
      style={{
        background: getAmbientBackground(clientAccent),
      }}
      className="min-h-screen text-slate-100 flex flex-col select-none font-sans transition-all duration-700 relative overflow-x-hidden"
    >
      {/* Ambient Top Glow Mesh */}
      <div
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${clientAccent}28 0%, transparent 70%)`,
        }}
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
      />

      <AppNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-7 relative z-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link href="/projects" className="hover:text-white flex items-center gap-1 transition">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Projects</span>
          </Link>
          <span>/</span>
          {client && (
            <>
              <Link href={`/clients`} style={{ color: clientAccent }} className="hover:underline font-medium">
                {client.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-slate-200 font-bold truncate">{project.name}</span>
        </div>

        {/* ---------------------------------------------------- */}
        {/* CINEMATIC PROJECT HEADER WITH DYNAMIC CLIENT THEMING */}
        {/* ---------------------------------------------------- */}
        <div
          style={{ borderColor: `${clientAccent}33` }}
          className="bg-[#0b0f19] border rounded-3xl shadow-2xl relative overflow-hidden space-y-5 group"
        >
          {/* Top Dynamic Client Accent Bar */}
          <div
            style={{ backgroundColor: clientAccent }}
            className="absolute top-0 left-0 right-0 h-1.5 opacity-80"
          />

          {/* Optional Thumbnail Hero Backdrop */}
          {thumbnail && (
            <div className="absolute inset-0 z-0 opacity-15 overflow-hidden pointer-events-none">
              <img src={thumbnail} alt="" className="w-full h-full object-cover blur-sm" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/80 to-transparent" />
            </div>
          )}

          <div className="p-6 sm:p-7 relative z-10 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 min-w-0">
                {/* Meta Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(project.status)}

                  {client && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#121927] border border-[#212c42]">
                      {client.logoUrl ? (
                        <img src={client.logoUrl} alt={client.name} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <span
                          style={{ backgroundColor: clientAccent }}
                          className="w-2.5 h-2.5 rounded-full"
                        />
                      )}
                      <span className="text-xs font-bold text-white">{client.name}</span>
                    </div>
                  )}

                  <span className="font-mono text-xs font-bold text-slate-300 px-2.5 py-0.5 rounded-full bg-[#121927] border border-[#212c42]">
                    {project.fps} FPS
                  </span>

                  {project.colorSpace && (
                    <span className="font-mono text-xs text-slate-300 px-2.5 py-0.5 rounded-full bg-[#121927] border border-[#212c42]">
                      {project.colorSpace}
                    </span>
                  )}

                  <span className="font-mono text-xs text-slate-400 px-2.5 py-0.5 rounded-full bg-[#070a10]">
                    TC: {project.startTimecode}
                  </span>
                </div>

                {/* Project Title */}
                <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white leading-tight">
                  {project.name}
                </h1>

                {project.description && (
                  <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                {canManageProjects && (
                  <select
                    value={project.status}
                    onChange={e => handleStatusChange(e.target.value as ProjectStatus)}
                    className="px-3.5 py-2.5 rounded-full bg-[#121927] border border-[#212c42] text-xs font-semibold text-white focus:outline-none focus:border-white transition"
                  >
                    <option value="draft">Status: Draft</option>
                    <option value="internal_review">Status: Internal Review</option>
                    <option value="client_review">Status: Client Review</option>
                    <option value="changes_requested">Status: Changes Requested</option>
                    <option value="approved">Status: Approved</option>
                    <option value="delivered">Status: Delivered</option>
                  </select>
                )}

                <Link
                  href={`/screener?projectId=${project.id}`}
                  style={{ backgroundColor: clientAccent }}
                  className="px-5 py-2.5 rounded-full text-white text-xs font-bold flex items-center gap-2 shadow-xl hover:brightness-110 transition active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch Screener</span>
                </Link>
              </div>
            </div>

            {/* Hub Navigation Tabs */}
            <div className="flex items-center gap-1 border-t border-[#182133] pt-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('assets')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'assets'
                    ? 'bg-white text-black shadow'
                    : 'text-slate-400 hover:text-white hover:bg-[#121927]'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Media Lineage ({versions.length} Cuts)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'sessions'
                    ? 'bg-white text-black shadow'
                    : 'text-slate-400 hover:text-white hover:bg-[#121927]'
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Review Playlists ({sessions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('approvals')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'approvals'
                    ? 'bg-white text-black shadow'
                    : 'text-slate-400 hover:text-white hover:bg-[#121927]'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Approval Pipeline</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'activity'
                    ? 'bg-white text-black shadow'
                    : 'text-slate-400 hover:text-white hover:bg-[#121927]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Activity Log ({projectLogs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-white text-black shadow'
                    : 'text-slate-400 hover:text-white hover:bg-[#121927]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Project Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: MEDIA CUTS & VERSION LINEAGE */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0b0f19]/80 border border-[#1b2538] p-5 rounded-3xl backdrop-blur-md">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Media Asset Center</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                    {versions.length} Active Stream Cuts
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">Project Video Cuts & Asset Repository</h3>
                <p className="text-xs text-slate-400">
                  Direct external streams from YouTube, Vimeo, Instagram Reels, and ProRes masters with frame-accurate timecodes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAssetModalOpen(true)}
                className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold flex items-center gap-2 transition shadow-xl shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Media Stream Link</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {versions.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 space-y-3 bg-[#0b0f19] rounded-3xl border border-[#182133]">
                  <Film className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                  <p className="text-sm font-semibold text-white">No media cuts attached to this project</p>
                  <p className="text-xs text-slate-400">Add your first YouTube, Vimeo, Instagram, or direct video cut.</p>
                </div>
              ) : (
                versions.map(ver => {
                  const cutThumb = ver.thumbnailUrl || getVideoThumbnail(ver.videoUrl, project.thumbnailUrl);
                  const provider = ver.provider || detectVideoProvider(ver.videoUrl);

                  const getProviderBadge = () => {
                    switch (provider) {
                      case 'youtube':
                        return <span className="px-2.5 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 text-[10px] font-bold flex items-center gap-1">YouTube 4K</span>;
                      case 'vimeo':
                        return <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-bold flex items-center gap-1">Vimeo Pro</span>;
                      case 'instagram':
                        return <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-bold flex items-center gap-1">Instagram Reel</span>;
                      case 'tiktok':
                        return <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1">TikTok Stream</span>;
                      default:
                        return <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold flex items-center gap-1">Direct Master</span>;
                    }
                  };

                  return (
                    <div
                      key={ver.id}
                      className="rounded-3xl bg-[#0b0f19]/90 border border-[#1b2538] hover:border-[#2f3f5c] transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl group"
                    >
                      {/* Video Thumbnail Viewport */}
                      <div className="relative aspect-video w-full bg-[#06080d] overflow-hidden">
                        <img
                          src={cutThumb}
                          alt={ver.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-black/60" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center font-mono font-black text-white text-[11px] shadow">
                            v{ver.versionNumber}
                          </div>
                          {getProviderBadge()}
                        </div>

                        {/* Duration Chip */}
                        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
                          {project.fps} FPS • {project.colorSpace || 'Rec.709'}
                        </div>

                        {/* Center Hover Play Button */}
                        <Link
                          href={`/screener?projectId=${project.id}&cutId=${ver.id}`}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          title="Open in Screener"
                        >
                          <div
                            style={{ backgroundColor: clientAccent }}
                            className="w-12 h-12 rounded-full text-white flex items-center justify-center shadow-2xl transition hover:scale-110 hover:brightness-110"
                          >
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </Link>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-slate-200 transition line-clamp-1">
                            {ver.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 block truncate">
                            By {ver.uploadedByUserName} • {new Date(ver.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-[#182133] flex items-center justify-between gap-2">
                          {ver.videoUrl && (
                            <a
                              href={ver.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Stream Source</span>
                            </a>
                          )}

                          <Link
                            href={`/screener?projectId=${project.id}&cutId=${ver.id}`}
                            style={{ backgroundColor: `${clientAccent}22`, color: clientAccent, borderColor: `${clientAccent}55` }}
                            className="px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition border hover:brightness-125"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Review Cut</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: REVIEW PLAYLISTS & SESSIONS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'sessions' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Client Review Playlists</h3>
                <p className="text-xs text-slate-400">Passwordless magic links dispatched to clients for synchronized review.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(true)}
                className="px-4 py-2 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Review Link</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-500 space-y-3 bg-[#0b0f19] rounded-3xl border border-[#182133]">
                  <Tv className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                  <p className="text-sm font-semibold text-white">No active review sessions</p>
                  <p className="text-xs text-slate-400">Create a review session to generate a secure client magic link.</p>
                </div>
              ) : (
                sessions.map(session => {
                  const magicReviewUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/review/${session.id}`;
                  const isCopied = sessionCopiedId === session.id;

                  return (
                    <div
                      key={session.id}
                      className="p-5 rounded-3xl bg-[#0b0f19] border border-[#1b2538] space-y-4 shadow-xl"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-white">{session.title}</h4>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">● Active Magic Link</span>
                        </div>
                        <Link
                          href={`/review/${session.id}`}
                          target="_blank"
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-xl bg-[#06080d] border border-[#182133]">
                        <input
                          type="text"
                          readOnly
                          value={magicReviewUrl}
                          className="flex-1 bg-transparent text-[11px] font-mono text-slate-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(magicReviewUrl);
                            setSessionCopiedId(session.id);
                            setTimeout(() => setSessionCopiedId(null), 2500);
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 transition shrink-0"
                        >
                          {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: APPROVAL GATES */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'approvals' && (
          <div className="p-6 rounded-3xl bg-[#0b0f19] border border-[#1b2538] space-y-5">
            <h3 className="text-sm font-bold text-white">5-Stage Production Sign-Off Gates</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { label: '1. Ingest & Sync', done: true },
                { label: '2. Picture Lock', done: project.status !== 'draft' },
                { label: '3. Color & Audio Mix', done: project.status === 'client_review' || project.status === 'approved' || project.status === 'delivered' },
                { label: '4. Executive Sign-Off', done: project.status === 'approved' || project.status === 'delivered' },
                { label: '5. Master Delivered', done: project.status === 'delivered' },
              ].map((gate, idx) => (
                <div
                  key={gate.label}
                  className={`p-4 rounded-2xl border text-center space-y-2 ${
                    gate.done
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-[#06080d] border-[#182133] text-slate-500'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 mx-auto ${gate.done ? 'text-emerald-400' : 'text-slate-600'}`} />
                  <span className="text-xs font-bold block">{gate.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: ACTIVITY LOG */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'activity' && (
          <div className="p-6 rounded-3xl bg-[#0b0f19] border border-[#1b2538] space-y-4">
            <h3 className="text-sm font-bold text-white">Audit Trail & Activity Log</h3>
            <div className="space-y-3">
              {projectLogs.length === 0 ? (
                <p className="text-xs text-slate-500">No activity recorded for this project yet.</p>
              ) : (
                projectLogs.map(log => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-[#06080d] border border-[#182133] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white">{log.action}</span>
                      <span className="text-slate-400 block text-[11px]">{log.details}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: PROJECT SETTINGS & TECHNICAL SPECIFICATIONS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'settings' && (
          <div className="p-6 sm:p-7 rounded-3xl bg-[#0b0f19] border border-[#1b2538] space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Project Specifications & Metadata</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage technical timeline parameters, timecode math, color space target, and client assignment.
              </p>
            </div>

            {settingsSavedSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Project specifications updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Title</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                {/* Client Link */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Linked Client Account</label>
                  <select
                    value={editClientId}
                    onChange={e => setEditClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  >
                    <option value="">No Client (Internal)</option>
                    {companyClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.companyName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Space */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Color Space</label>
                  <select
                    value={editColorSpace}
                    onChange={e => setEditColorSpace(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white transition"
                  >
                    <option value="Rec.709">Rec.709 (HD / SDR Standard)</option>
                    <option value="DCI-P3">DCI-P3 (Theatrical Cinema / Apple P3)</option>
                    <option value="Rec.2020">Rec.2020 (UHD / HDR Master)</option>
                    <option value="ACEScg">ACEScg (Academy VFX Color Encoding)</option>
                    <option value="sRGB">sRGB (Web Standard)</option>
                  </select>
                </div>

                {/* FPS */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Timecode Base (FPS)</label>
                  <select
                    value={editFps}
                    onChange={e => setEditFps(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  >
                    <option value={23.976}>23.976 fps (NTSC Film)</option>
                    <option value={24}>24.000 fps (Cinema Master)</option>
                    <option value={25}>25.000 fps (PAL / Commercial)</option>
                    <option value={29.97}>29.970 fps (Broadcast NTSC)</option>
                    <option value={30}>30.000 fps (Digital Video)</option>
                    <option value={60}>60.000 fps (Gaming / Web HFR)</option>
                  </select>
                </div>

                {/* Start Timecode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Timecode (SMPTE)</label>
                  <input
                    type="text"
                    value={editStartTimecode}
                    onChange={e => setEditStartTimecode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono transition"
                  />
                </div>
              </div>

              {/* Thumbnail URL & Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Project Thumbnail Image</label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="url"
                    value={editThumbnail}
                    onChange={e => setEditThumbnail(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Scope / Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white resize-none transition"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#182133]">
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Are you sure you want to permanently delete "${project.name}"?`)) {
                      await deleteProject(project.id);
                      router.push('/projects');
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-red-950/30 hover:bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Project</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-xl transition active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingSettings ? 'Saving...' : 'Save Specifications'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* ---------------------------------------------------- */}
      {/* ADD MEDIA CUT MODAL */}
      {/* ---------------------------------------------------- */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0b0f19] border border-[#232f48] rounded-3xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add New Media Cut / Version</h3>
              <button
                type="button"
                onClick={() => setIsAddAssetModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMediaCut} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cut / Sequence Name</label>
                <input
                  type="text"
                  required
                  value={newCutName}
                  onChange={e => setNewCutName(e.target.value)}
                  placeholder="e.g. Cut 3 — Social Media Edit / Color Grade Master"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Detected Provider</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs font-bold text-slate-200 capitalize flex items-center justify-between">
                    <span>{detectVideoProvider(newCutUrl)}</span>
                    <span className="text-[10px] font-mono text-slate-400">Auto-detected</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">External Video Stream Link</label>
                <input
                  type="url"
                  required
                  value={newCutUrl}
                  onChange={e => setNewCutUrl(e.target.value)}
                  placeholder="Paste YouTube, Vimeo, Instagram, TikTok, or MP4 URL..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Supports YouTube, Vimeo, Instagram Reels, TikTok, and direct CDN .mp4 links.
                </span>
              </div>

              {/* Live Thumbnail Preview */}
              {newCutUrl && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">Live Stream Thumbnail Preview</span>
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#232f48] bg-[#06080d]">
                    <img
                      src={getVideoThumbnail(newCutUrl, project?.thumbnailUrl)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-white">
                      {detectVideoProvider(newCutUrl).toUpperCase()}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#182133]">
                <button
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold shadow-lg"
                >
                  Save to Media Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* NEW REVIEW SESSION MODAL */}
      {/* ---------------------------------------------------- */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0b0f19] border border-[#232f48] rounded-3xl shadow-2xl p-6 sm:p-7 relative animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Client Review Link</h3>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={newSessionTitle}
                  onChange={e => setNewSessionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06080d] border border-[#1e273a] text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="space-y-2 p-3 bg-[#06080d] rounded-2xl border border-[#1e273b]">
                <span className="text-xs font-bold text-white block mb-1">Reviewer Permissions</span>
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Allow Drawing & Vector Markup</span>
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#182133]">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-white hover:bg-slate-200 text-black text-xs font-bold"
                >
                  Create Review Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
