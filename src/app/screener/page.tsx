'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { VideoPlayer, VideoPlayerHandle } from '@/components/VideoPlayer';
import { TimelineScrubber } from '@/components/TimelineScrubber';
import { PresetKeys, PRESET_CATEGORIES, CategoryPreset } from '@/components/PresetKeys';
import { NotesList } from '@/components/NotesList';
import { AnnotationCanvas } from '@/components/AnnotationCanvas';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { StudioBrandingModal } from '@/components/StudioBrandingModal';
import { ProjectManagerModal } from '@/components/ProjectManagerModal';
import { AssetManagerModal } from '@/components/AssetManagerModal';
import { ExportModal } from '@/components/ExportModal';
import { CompareModal } from '@/components/CompareModal';
import { AddMediaModal } from '@/components/AddMediaModal';
import { MediaToolsStrip } from '@/components/MediaToolsStrip';
import { ShareModal } from '@/components/ShareModal';
import { NotekeysModal } from '@/components/NotekeysModal';
import { ColorGradingPanel, ColorGradeSettings, DEFAULT_GRADE } from '@/components/ColorGradingPanel';

import {
  Project,
  Cut,
  ReviewNote,
  StudioBranding,
} from '@/lib/supabase';

import {
  getStudioBranding,
  saveStudioBranding,
  getAllProjects,
  saveProject,
  deleteProject as dbDeleteProject,
  getCutsForProject,
  saveCut,
  deleteCut as dbDeleteCut,
  saveLocalVideoFile,
  getLocalVideoBlobUrl,
  getNotesForCut,
  saveReviewNote,
  deleteReviewNote as dbDeleteNote,
  saveAudioBlob,
} from '@/lib/storage';

import {
  getProjectById as getTenantProjectById,
  getProjectsByCompany,
  getAssetVersionsByProject,
} from '@/lib/tenantStorage';

import {
  secondsToDisplayTimecode,
  timecodeToFrames,
} from '@/lib/timecode';

import { createRealtimeSession, SyncEvent } from '@/lib/realtimeSync';

function ScreenerStudioContent() {
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get('projectId');
  const requestedCutId = searchParams.get('cutId');

  const [currentTool, setCurrentTool] = useState<string>('screener');

  // Reviewer Author Name
  const [authorName, setAuthorName] = useState<string>('Editor');

  // Studio Branding
  const [branding, setBranding] = useState<StudioBranding>({
    name: 'Studio',
    tagline: 'Post-Production Suite',
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
  });

  // Projects & Cuts
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [activeCut, setActiveCut] = useState<Cut | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [inTime, setInTime] = useState<number | null>(null);
  const [outTime, setOutTime] = useState<number | null>(null);

  // Notekeys Categories
  const [categories, setCategories] = useState<CategoryPreset[]>(PRESET_CATEGORIES);

  // Color Grading state
  const [activeGrade, setActiveGrade] = useState<ColorGradeSettings>(DEFAULT_GRADE);
  const [livePreviewGrade, setLivePreviewGrade] = useState<ColorGradeSettings | null>(null);

  // Notes & Selected Note
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<ReviewNote | null>(null);

  // Modals
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isNotekeysOpen, setIsNotekeysOpen] = useState(false);
  const [isColorGradingOpen, setIsColorGradingOpen] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [isVoiceRecordingOpen, setIsVoiceRecordingOpen] = useState(false);

  // Attachments
  const [activeDrawingSnapshot, setActiveDrawingSnapshot] = useState<string | null>(null);
  const [activeDrawingVector, setActiveDrawingVector] = useState<string | null>(null);
  const [activeAudioBlob, setActiveAudioBlob] = useState<Blob | null>(null);

  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);
  const realtimeSessionRef = useRef<{ broadcast: (e: any) => void; cleanup: () => void } | null>(null);
  const localUserIdRef = useRef<string>(`user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

  // Initial Load with Query Params Support
  useEffect(() => {
    async function init() {
      const b = await getStudioBranding();
      setBranding(b);

      const projs = await getAllProjects();

      let targetProj: Project | null = null;
      if (requestedProjectId) {
        targetProj = projs.find(p => p.id === requestedProjectId) || null;
        if (!targetProj) {
          const tenantProj = await getTenantProjectById(requestedProjectId);
          if (tenantProj) {
            targetProj = {
              id: tenantProj.id,
              name: tenantProj.name,
              fps: tenantProj.fps,
              dropFrame: tenantProj.dropFrame,
              startTimecode: tenantProj.startTimecode,
              createdAt: tenantProj.createdAt,
            };
            await saveProject(targetProj);
            projs.unshift(targetProj);
          }
        }
      }

      setProjects(projs);

      const activeP = targetProj || (projs.length > 0 ? projs[0] : null);
      if (activeP) {
        setActiveProject(activeP);
        let pCuts = await getCutsForProject(activeP.id);
        if (pCuts.length === 0) {
          const versions = await getAssetVersionsByProject(activeP.id);
          if (versions.length > 0) {
            for (const v of versions) {
              const newCut: Cut = {
                id: v.id,
                projectId: activeP.id,
                name: v.name,
                provider: v.provider === 'youtube' ? 'youtube' : v.provider === 'vimeo' ? 'vimeo' : 'local',
                videoUrl: v.videoUrl,
                durationSeconds: v.durationSeconds || 120,
                createdAt: v.createdAt,
              };
              await saveCut(newCut);
              pCuts.push(newCut);
            }
          }
        }
        setCuts(pCuts);

        let activeC: Cut | null = null;
        if (requestedCutId) {
          activeC = pCuts.find(c => c.id === requestedCutId) || null;
        }
        if (!activeC && pCuts.length > 0) {
          activeC = pCuts[0];
        }

        if (activeC) {
          setActiveCut(activeC);
          const vUrl = await getLocalVideoBlobUrl(activeC.id);
          setLocalVideoUrl(vUrl);
          const nts = await getNotesForCut(activeC.id);
          setNotes(nts);
        } else {
          setActiveCut(null);
          setLocalVideoUrl(null);
          setNotes([]);
        }
      }
    }
    init();
  }, [requestedProjectId, requestedCutId]);

  // Initialize Realtime Sync Room for Active Cut
  useEffect(() => {
    if (!activeCut) return;

    const session = createRealtimeSession(
      activeCut.id,
      activeProject?.id || 'main',
      localUserIdRef.current,
      authorName,
      (event: SyncEvent) => {
        if (event.type === 'SEEK' && typeof event.time === 'number') {
          videoPlayerRef.current?.seekTo(event.time);
          setCurrentTime(event.time);
        } else if (event.type === 'PLAY') {
          videoPlayerRef.current?.play();
        } else if (event.type === 'PAUSE') {
          videoPlayerRef.current?.pause();
        } else if (event.type === 'NOTE_UPSERT' && event.note) {
          setNotes(prev => {
            const filtered = prev.filter(n => n.id !== event.note?.id);
            return [...filtered, event.note!].sort((a, b) => a.frameNumber - b.frameNumber);
          });
        } else if (event.type === 'NOTE_DELETE' && event.noteId) {
          setNotes(prev => prev.filter(n => n.id !== event.noteId));
        }
      },
      (freshNotes: ReviewNote[]) => {
        setNotes(freshNotes);
      }
    );

    realtimeSessionRef.current = session;
    return () => {
      session.cleanup();
    };
  }, [activeCut?.id, activeProject?.id, authorName]);

  // Update Source
  const handleUpdateSource = async (
    url: string,
    provider: 'local' | 'youtube' | 'vimeo' | 'standalone' | 'compare' | 'drive'
  ) => {
    if (!activeCut) return;
    const updatedCut: Cut = {
      ...activeCut,
      provider,
      videoUrl: url || activeCut.videoUrl,
    };
    await saveCut(updatedCut);
    setActiveCut(updatedCut);
    setCuts(prev => prev.map(c => (c.id === updatedCut.id ? updatedCut : c)));
    setCurrentTime(0);
    setInTime(null);
    setOutTime(null);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(0);
    }
  };

  // Apply Compare Mode
  const handleApplyCompare = async (urlA: string, urlB: string, fileA?: File, fileB?: File) => {
    if (!activeCut) return;
    let finalUrlA = urlA;
    let finalUrlB = urlB;

    if (fileA) finalUrlA = await saveLocalVideoFile(`${activeCut.id}_a`, fileA);
    if (fileB) finalUrlB = await saveLocalVideoFile(`${activeCut.id}_b`, fileB);

    const updatedCut: Cut = {
      ...activeCut,
      provider: 'compare',
      videoUrl: finalUrlA,
      videoUrlB: finalUrlB,
    };
    await saveCut(updatedCut);
    setActiveCut(updatedCut);
    setCuts(prev => prev.map(c => (c.id === updatedCut.id ? updatedCut : c)));
    setCurrentTime(0);
  };

  // Quick Compare two cuts directly from Asset Manager
  const handleCompareWithCut = async (cutA: Cut, cutB: Cut) => {
    const updatedCut: Cut = {
      ...cutA,
      provider: 'compare',
      videoUrl: cutA.videoUrl,
      videoUrlB: cutB.videoUrl,
    };
    await saveCut(updatedCut);
    setActiveCut(updatedCut);
    setCuts(prev => prev.map(c => (c.id === updatedCut.id ? updatedCut : c)));
    setCurrentTime(0);
  };

  // Update FPS
  const handleUpdateFps = async (newFps: number) => {
    if (!activeProject) return;
    const updatedProj: Project = { ...activeProject, fps: newFps };
    await saveProject(updatedProj);
    setActiveProject(updatedProj);
    setProjects(prev => prev.map(p => (p.id === updatedProj.id ? updatedProj : p)));
  };

  // Update Start TC
  const handleUpdateStartTc = async (newStartTc: string) => {
    if (!activeProject) return;
    const updatedProj: Project = { ...activeProject, startTimecode: newStartTc };
    await saveProject(updatedProj);
    setActiveProject(updatedProj);
    setProjects(prev => prev.map(p => (p.id === updatedProj.id ? updatedProj : p)));
  };

  // File Upload
  const handleUploadFile = async (file: File) => {
    if (!activeCut) return;
    const vUrl = await saveLocalVideoFile(activeCut.id, file);
    setLocalVideoUrl(vUrl);
    const updatedCut: Cut = {
      ...activeCut,
      provider: 'local',
      videoUrl: file.name,
    };
    await saveCut(updatedCut);
    setActiveCut(updatedCut);
    setCuts(prev => prev.map(c => (c.id === updatedCut.id ? updatedCut : c)));
    setCurrentTime(0);
  };

  // Switch Cut
  const handleSelectCut = async (cut: Cut) => {
    setActiveCut(cut);
    const vUrl = await getLocalVideoBlobUrl(cut.id);
    setLocalVideoUrl(vUrl);
    const nts = await getNotesForCut(cut.id);
    setNotes(nts);
    setSelectedNote(null);
    setCurrentTime(0);
    setInTime(null);
    setOutTime(null);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(0);
    }
  };

  // Switch Project
  const handleSelectProject = async (proj: Project) => {
    setActiveProject(proj);
    let pCuts = await getCutsForProject(proj.id);
    if (pCuts.length === 0) {
      const versions = await getAssetVersionsByProject(proj.id);
      if (versions.length > 0) {
        for (const v of versions) {
          const newCut: Cut = {
            id: v.id,
            projectId: proj.id,
            name: v.name,
            provider: v.provider === 'youtube' ? 'youtube' : v.provider === 'vimeo' ? 'vimeo' : 'local',
            videoUrl: v.videoUrl,
            durationSeconds: v.durationSeconds || 120,
            createdAt: v.createdAt,
          };
          await saveCut(newCut);
          pCuts.push(newCut);
        }
      }
    }
    setCuts(pCuts);
    if (pCuts.length > 0) {
      handleSelectCut(pCuts[0]);
    } else {
      setActiveCut(null);
      setNotes([]);
      setLocalVideoUrl(null);
    }
  };

  // Mark In / Out
  const handleMarkIn = () => setInTime(currentTime);
  const handleMarkOut = () => setOutTime(currentTime);
  const handleClearRange = () => {
    setInTime(null);
    setOutTime(null);
  };

  // Display Timecodes
  const currentTc = activeProject
    ? secondsToDisplayTimecode(
        currentTime,
        activeProject.fps,
        activeProject.startTimecode,
        activeProject.dropFrame
      )
    : '01:00:00:00';

  const inTc =
    inTime !== null && activeProject
      ? secondsToDisplayTimecode(
          inTime,
          activeProject.fps,
          activeProject.startTimecode,
          activeProject.dropFrame
        )
      : null;

  const outTc =
    outTime !== null && activeProject
      ? secondsToDisplayTimecode(
          outTime,
          activeProject.fps,
          activeProject.startTimecode,
          activeProject.dropFrame
        )
      : null;

  // Add Note Handler
  const handleAddNote = async (data: {
    category: 'editorial' | 'vfx' | 'color' | 'sound' | 'general';
    presetLabel: string;
    text: string;
    colorGrade?: ColorGradeSettings;
    stillImageUrl?: string;
    audioBlob?: Blob;
    drawingData?: string;
  }) => {
    if (!activeCut || !activeProject) return;

    const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let audioUrl: string | undefined = undefined;

    if (data.audioBlob) {
      audioUrl = await saveAudioBlob(noteId, data.audioBlob);
    }

    const noteTime = inTime !== null ? inTime : currentTime;
    const noteTc = secondsToDisplayTimecode(
      noteTime,
      activeProject.fps,
      activeProject.startTimecode,
      activeProject.dropFrame
    );

    const frameNum = timecodeToFrames(noteTc, activeProject.fps, activeProject.dropFrame);

    let tcOut: string | undefined = undefined;
    let frameOutNum: number | undefined = undefined;

    if (outTime !== null && inTime !== null && outTime > inTime) {
      tcOut = secondsToDisplayTimecode(
        outTime,
        activeProject.fps,
        activeProject.startTimecode,
        activeProject.dropFrame
      );
      frameOutNum = timecodeToFrames(tcOut, activeProject.fps, activeProject.dropFrame);
    }

    let finalThumbnail = data.stillImageUrl || activeDrawingSnapshot;
    if (!finalThumbnail && videoPlayerRef.current) {
      finalThumbnail = videoPlayerRef.current.captureFrameThumbnail();
    }

    const newNote: ReviewNote = {
      id: noteId,
      cutId: activeCut.id,
      category: data.category,
      presetLabel: data.presetLabel,
      text: data.text,
      frameNumber: frameNum,
      timecode: noteTc,
      timecodeOut: tcOut,
      frameOut: frameOutNum,
      colorGrade: data.colorGrade,
      drawingData: activeDrawingVector || data.drawingData,
      stillImageUrl: finalThumbnail || undefined,
      audioBlobUrl: audioUrl,
      authorName: authorName || 'Editor',
      isResolved: false,
      createdAt: new Date().toISOString(),
    };

    await saveReviewNote(newNote);
    setNotes(prev => [...prev, newNote].sort((a, b) => a.frameNumber - b.frameNumber));

    // Broadcast note to real-time session
    realtimeSessionRef.current?.broadcast({
      type: 'NOTE_UPSERT',
      note: newNote,
    });

    setActiveDrawingSnapshot(null);
    setActiveDrawingVector(null);
    setActiveAudioBlob(null);
    setInTime(null);
    setOutTime(null);
  };

  // Apply Color Grade to Note
  const handleApplyColorGrade = (grade: ColorGradeSettings, applyScope: 'frame' | 'range' | 'master') => {
    setLivePreviewGrade(null);
    handleAddNote({
      category: 'color',
      presetLabel: grade.preset !== 'none' ? `Look: ${grade.preset}` : 'Color Correction',
      text: `Brightness: ${grade.brightness}%, Contrast: ${grade.contrast}%, Saturation: ${grade.saturation}%, Temp: ${grade.temperature}K`,
      colorGrade: grade,
    });
  };

  // Toggle Resolved
  const handleToggleResolved = async (noteId: string) => {
    const target = notes.find(n => n.id === noteId);
    if (!target) return;
    const updated = { ...target, isResolved: !target.isResolved };
    await saveReviewNote(updated);
    setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));

    realtimeSessionRef.current?.broadcast({
      type: 'NOTE_UPSERT',
      note: updated,
    });
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    await dbDeleteNote(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedNote?.id === noteId) setSelectedNote(null);

    realtimeSessionRef.current?.broadcast({
      type: 'NOTE_DELETE',
      noteId,
    });
  };

  // Update Note Text
  const handleUpdateNoteText = async (noteId: string, newText: string) => {
    const target = notes.find(n => n.id === noteId);
    if (!target) return;
    const updated = { ...target, text: newText };
    await saveReviewNote(updated);
    setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));

    realtimeSessionRef.current?.broadcast({
      type: 'NOTE_UPSERT',
      note: updated,
    });
  };

  // Seek to Note
  const handleSeekToNote = (note: ReviewNote) => {
    if (!activeProject || !videoPlayerRef.current) return;
    setSelectedNote(note);

    const noteFrames = timecodeToFrames(note.timecode, activeProject.fps, activeProject.dropFrame);
    const startFrames = timecodeToFrames(
      activeProject.startTimecode || '01:00:00:00',
      activeProject.fps,
      activeProject.dropFrame
    );
    const relativeSeconds = Math.max(0, (noteFrames - startFrames) / activeProject.fps);
    videoPlayerRef.current.seekTo(relativeSeconds);
    videoPlayerRef.current.pause();

    realtimeSessionRef.current?.broadcast({
      type: 'SEEK',
      time: relativeSeconds,
    });
  };

  // Handle timeline seek broadcast
  const handleTimelineSeek = (sec: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(sec);
    }
    realtimeSessionRef.current?.broadcast({
      type: 'SEEK',
      time: sec,
    });
  };

  // Create Project
  const handleCreateProject = async (projData: Omit<Project, 'id'>) => {
    const newId = `proj_${Date.now()}`;
    const newProj: Project = { ...projData, id: newId, createdAt: new Date().toISOString() };
    await saveProject(newProj);
    setProjects(prev => [newProj, ...prev]);

    const newCut: Cut = {
      id: `cut_${Date.now()}`,
      projectId: newId,
      name: 'Cut 1',
      provider: 'standalone',
      durationSeconds: 0,
      createdAt: new Date().toISOString(),
    };
    await saveCut(newCut);

    setActiveProject(newProj);
    setCuts([newCut]);
    setActiveCut(newCut);
    setNotes([]);
    setLocalVideoUrl(null);
  };

  // Create Cut
  const handleCreateCut = async (cutData: Omit<Cut, 'id'>, videoFile?: File) => {
    const cutId = `cut_${Date.now()}`;
    const newCut: Cut = {
      ...cutData,
      id: cutId,
      durationSeconds: 0,
      createdAt: new Date().toISOString(),
    };

    if (videoFile) {
      const vUrl = await saveLocalVideoFile(cutId, videoFile);
      setLocalVideoUrl(vUrl);
    }

    await saveCut(newCut);
    setCuts(prev => [...prev, newCut]);
    setActiveCut(newCut);
    setNotes([]);
  };

  // Delete Project
  const handleDeleteProject = async (projId: string) => {
    await dbDeleteProject(projId);
    const remaining = projects.filter(p => p.id !== projId);
    setProjects(remaining);
    if (remaining.length > 0) {
      handleSelectProject(remaining[0]);
    } else {
      setActiveProject(null);
      setActiveCut(null);
      setCuts([]);
      setNotes([]);
    }
  };

  // Delete Cut
  const handleDeleteCut = async (cutId: string) => {
    await dbDeleteCut(cutId);
    const remaining = cuts.filter(c => c.id !== cutId);
    setCuts(remaining);
    if (remaining.length > 0) {
      handleSelectCut(remaining[0]);
    } else {
      setActiveCut(null);
      setNotes([]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden bg-[#090c13] text-slate-100 select-none">
      {/* Top Action Icons Header */}
      <Header
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        branding={branding}
        activeProject={activeProject}
        activeCut={activeCut}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenAssets={() => setIsAssetsOpen(true)}
        onOpenBranding={() => setIsBrandingOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenNotekeys={() => setIsNotekeysOpen(true)}
        onOpenColorGrading={() => setIsColorGradingOpen(true)}
        onOpenAddMedia={() => setIsAddMediaOpen(true)}
      />

      {/* Main Studio Hub (Responsive 100vh on Desktop, Flex Column Scroll on Mobile) */}
      <main className="flex-1 p-2 sm:p-2.5 flex flex-col lg:flex-row gap-2 sm:gap-2.5 overflow-y-auto lg:overflow-hidden max-w-[1920px] w-full mx-auto min-h-0">
        {/* Left / Center: Video Player + Timeline + Preset Console */}
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          {/* Main Video Box with Integrated Header */}
          <div className="flex-1 relative flex flex-col min-h-[280px] xs:min-h-[340px] sm:min-h-[420px] lg:min-h-0">
            {activeCut && activeProject ? (
              <VideoPlayer
                ref={videoPlayerRef}
                cut={activeCut}
                project={activeProject}
                localVideoUrl={localVideoUrl}
                notes={notes}
                selectedNote={selectedNote}
                liveGrade={livePreviewGrade || activeGrade}
                inTime={inTime}
                outTime={outTime}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
                onPlayStateChange={(playing) => {
                  realtimeSessionRef.current?.broadcast({
                    type: playing ? 'PLAY' : 'PAUSE',
                    time: videoPlayerRef.current?.getCurrentTime() || 0,
                  });
                }}
                onMarkIn={handleMarkIn}
                onMarkOut={handleMarkOut}
                onClearRange={handleClearRange}
                onOpenAddMedia={() => setIsAddMediaOpen(true)}
                onOpenCompare={() => setIsCompareOpen(true)}
                onUpdateFps={handleUpdateFps}
                onUpdateStartTc={handleUpdateStartTc}
              />
            ) : (
              <div className="flex-1 min-h-[220px] bg-[#111622] rounded-2xl flex flex-col items-center justify-center border border-[#1e273b] text-slate-400 gap-3 p-6 text-center">
                <p className="text-sm font-semibold">No project selected</p>
                <button
                  onClick={() => setIsProjectsOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 transition active:scale-95"
                >
                  Create or Select a Project
                </button>
              </div>
            )}

            {/* On-Screen Freeze-Frame Drawing Canvas */}
            {isDrawingOpen && (
              <AnnotationCanvas
                isOpen={isDrawingOpen}
                videoElement={videoPlayerRef.current?.getVideoElement() || null}
                posterDataUrl={videoPlayerRef.current?.getPosterDataUrl() || null}
                onSaveDrawing={(drawingDataUrl, snapshotDataUrl) => {
                  setActiveDrawingSnapshot(snapshotDataUrl);
                  setActiveDrawingVector(drawingDataUrl);
                  setIsDrawingOpen(false);
                }}
                onCancel={() => setIsDrawingOpen(false)}
              />
            )}
          </div>

          {/* Timeline Scrubber */}
          {activeProject && (
            <TimelineScrubber
              currentTime={currentTime}
              duration={duration || 1}
              project={activeProject}
              notes={notes}
              inTime={inTime}
              outTime={outTime}
              onSeek={handleTimelineSeek}
              onSelectNote={handleSeekToNote}
            />
          )}

          {/* Tactile Preset Console with Left Colored Accent & Add Key */}
          <PresetKeys
            currentTc={currentTc}
            inTc={inTc}
            outTc={outTc}
            categories={categories}
            onClearRange={handleClearRange}
            onAddNote={handleAddNote}
            onOpenNotekeys={() => setIsNotekeysOpen(true)}
            activeDrawingSnapshot={activeDrawingSnapshot}
            activeAudioBlob={activeAudioBlob}
            onClearDrawingSnapshot={() => {
              setActiveDrawingSnapshot(null);
              setActiveDrawingVector(null);
            }}
            onClearAudioBlob={() => setActiveAudioBlob(null)}
          />
        </div>

        {/* Middle Quick Tools Strip (Draw, Color Grade, Watermark, Voice) */}
        <MediaToolsStrip
          onStartDrawing={() => {
            videoPlayerRef.current?.pause();
            setIsDrawingOpen(true);
          }}
          onStartVoiceRecording={() => {
            videoPlayerRef.current?.pause();
            setIsVoiceRecordingOpen(true);
          }}
          onOpenColorGrading={() => setIsColorGradingOpen(true)}
          onAttachImage={file => {
            const reader = new FileReader();
            reader.onload = () => {
              setActiveDrawingSnapshot(reader.result as string);
            };
            reader.readAsDataURL(file);
          }}
          hasActiveDrawing={Boolean(activeDrawingSnapshot)}
          hasActiveVoice={Boolean(activeAudioBlob)}
        />

        {/* Right: Review Notes Log OR Docked Color Grading Side Panel */}
        {isColorGradingOpen ? (
          <ColorGradingPanel
            isOpen={isColorGradingOpen}
            onClose={() => {
              setIsColorGradingOpen(false);
              setLivePreviewGrade(null);
            }}
            currentGrade={activeGrade}
            onApplyGrade={handleApplyColorGrade}
            onLivePreviewChange={setLivePreviewGrade}
          />
        ) : (
          <div className="w-full lg:w-[320px] xl:w-[350px] flex flex-col min-h-[340px] lg:min-h-0 shrink-0">
            <NotesList
              notes={notes}
              selectedNoteId={selectedNote?.id || null}
              currentAuthorName={authorName}
              onChangeAuthorName={setAuthorName}
              onSeekToNote={handleSeekToNote}
              onToggleResolved={handleToggleResolved}
              onDeleteNote={handleDeleteNote}
              onUpdateNoteText={handleUpdateNoteText}
            />
          </div>
        )}
      </main>

      {/* Asset & Cuts Manager Modal */}
      {activeProject && (
        <AssetManagerModal
          isOpen={isAssetsOpen}
          onClose={() => setIsAssetsOpen(false)}
          project={activeProject}
          cuts={cuts}
          activeCut={activeCut}
          onSelectCut={handleSelectCut}
          onCompareWithCut={handleCompareWithCut}
          onCreateCut={handleCreateCut}
          onDeleteCut={handleDeleteCut}
        />
      )}

      {/* Notekeys Settings Modal */}
      <NotekeysModal
        isOpen={isNotekeysOpen}
        onClose={() => setIsNotekeysOpen(false)}
        categories={categories}
        onSaveCategories={setCategories}
      />

      {/* Share Modal */}
      {activeProject && activeCut && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          project={activeProject}
          cut={activeCut}
          notes={notes}
          branding={branding}
        />
      )}

      {/* Voice Recorder Overlay Modal */}
      {isVoiceRecordingOpen && (
        <VoiceRecorder
          onSaveAudio={(blob, url) => {
            setActiveAudioBlob(blob);
            setIsVoiceRecordingOpen(false);
          }}
          onCancel={() => setIsVoiceRecordingOpen(false)}
        />
      )}

      {/* Add Media Modal */}
      <AddMediaModal
        isOpen={isAddMediaOpen}
        onClose={() => setIsAddMediaOpen(false)}
        currentUrl={activeCut?.videoUrl || ''}
        onUpdateSource={handleUpdateSource}
        onUploadFile={handleUploadFile}
      />

      {/* Compare Modal */}
      {activeCut && (
        <CompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          currentCut={activeCut}
          projectCuts={cuts}
          onApplyCompare={handleApplyCompare}
        />
      )}

      {/* Studio Branding Modal */}
      <StudioBrandingModal
        isOpen={isBrandingOpen}
        onClose={() => setIsBrandingOpen(false)}
        branding={branding}
        onSaveBranding={async updated => {
          await saveStudioBranding(updated);
          setBranding(updated);
        }}
      />

      {/* Project & Cut Manager Modal */}
      <ProjectManagerModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        projects={projects}
        activeProject={activeProject}
        activeCut={activeCut}
        cuts={cuts}
        onSelectProject={handleSelectProject}
        onSelectCut={handleSelectCut}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onCreateCut={handleCreateCut}
        onDeleteCut={handleDeleteCut}
      />

      {/* Multi-Format Export Modal */}
      {activeProject && activeCut && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          project={activeProject}
          cut={activeCut}
          notes={notes}
          branding={branding}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090c13] text-slate-100 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold">Loading Screener Studio...</span>
          </div>
        </div>
      }
    >
      <ScreenerStudioContent />
    </Suspense>
  );
}
