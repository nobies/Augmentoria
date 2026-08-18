'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { VideoPlayer, VideoPlayerHandle } from '@/components/VideoPlayer';
import { TimelineScrubber } from '@/components/TimelineScrubber';
import { PresetKeys } from '@/components/PresetKeys';
import { NotesList } from '@/components/NotesList';
import { AnnotationCanvas } from '@/components/AnnotationCanvas';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { StudioBrandingModal } from '@/components/StudioBrandingModal';
import { ProjectManagerModal } from '@/components/ProjectManagerModal';
import { ExportModal } from '@/components/ExportModal';

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
  getAudioBlobUrl,
} from '@/lib/storage';

import {
  secondsToDisplayTimecode,
  timecodeToFrames,
  secondsToFrames,
  framesToTimecode,
} from '@/lib/timecode';

export default function Home() {
  const [currentTool, setCurrentTool] = useState<string>('screener');

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
  const [duration, setDuration] = useState(120);
  const [inTime, setInTime] = useState<number | null>(null);
  const [outTime, setOutTime] = useState<number | null>(null);

  // Notes
  const [notes, setNotes] = useState<ReviewNote[]>([]);

  // Modals & Panels
  const [isBrandingOpen, setIsBrandingOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [isVoiceRecordingOpen, setIsVoiceRecordingOpen] = useState(false);

  // Active Pending Attachments
  const [activeDrawingSnapshot, setActiveDrawingSnapshot] = useState<string | null>(null);
  const [activeAudioBlob, setActiveAudioBlob] = useState<Blob | null>(null);

  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);

  // Initial Load
  useEffect(() => {
    async function init() {
      const b = await getStudioBranding();
      setBranding(b);

      const projs = await getAllProjects();
      setProjects(projs);

      if (projs.length > 0) {
        const initialProj = projs[0];
        setActiveProject(initialProj);
        const pCuts = await getCutsForProject(initialProj.id);
        setCuts(pCuts);

        if (pCuts.length > 0) {
          const initialCut = pCuts[0];
          setActiveCut(initialCut);
          const vUrl = await getLocalVideoBlobUrl(initialCut.id);
          setLocalVideoUrl(vUrl);
          const nts = await getNotesForCut(initialCut.id);
          setNotes(nts);
        }
      }
    }
    init();
  }, []);

  // Switch Cut
  const handleSelectCut = async (cut: Cut) => {
    setActiveCut(cut);
    const vUrl = await getLocalVideoBlobUrl(cut.id);
    setLocalVideoUrl(vUrl);
    const nts = await getNotesForCut(cut.id);
    setNotes(nts);
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
    const pCuts = await getCutsForProject(proj.id);
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
  const handleMarkIn = () => {
    setInTime(currentTime);
  };

  const handleMarkOut = () => {
    setOutTime(currentTime);
  };

  const handleClearRange = () => {
    setInTime(null);
    setOutTime(null);
  };

  // Current Display Timecode
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
      drawingData: data.drawingData,
      stillImageUrl: data.stillImageUrl,
      audioBlobUrl: audioUrl,
      authorName: 'Reviewer',
      isResolved: false,
      createdAt: new Date().toISOString(),
    };

    await saveReviewNote(newNote);
    setNotes(prev => [...prev, newNote].sort((a, b) => a.frameNumber - b.frameNumber));

    // Clear temporary attachments & in/out range
    setActiveDrawingSnapshot(null);
    setActiveAudioBlob(null);
    setInTime(null);
    setOutTime(null);
  };

  // Toggle Resolved
  const handleToggleResolved = async (noteId: string) => {
    const target = notes.find(n => n.id === noteId);
    if (!target) return;
    const updated = { ...target, isResolved: !target.isResolved };
    await saveReviewNote(updated);
    setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    await dbDeleteNote(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  // Update Note Text
  const handleUpdateNoteText = async (noteId: string, newText: string) => {
    const target = notes.find(n => n.id === noteId);
    if (!target) return;
    const updated = { ...target, text: newText };
    await saveReviewNote(updated);
    setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));
  };

  // Seek to Note
  const handleSeekToNote = (note: ReviewNote) => {
    if (!activeProject || !videoPlayerRef.current) return;
    const noteFrames = timecodeToFrames(note.timecode, activeProject.fps, activeProject.dropFrame);
    const startFrames = timecodeToFrames(
      activeProject.startTimecode || '01:00:00:00',
      activeProject.fps,
      activeProject.dropFrame
    );
    const relativeSeconds = Math.max(0, (noteFrames - startFrames) / activeProject.fps);
    videoPlayerRef.current.seekTo(relativeSeconds);
    videoPlayerRef.current.pause();
  };

  // Create Project
  const handleCreateProject = async (projData: Omit<Project, 'id'>) => {
    const newId = `proj_${Date.now()}`;
    const newProj: Project = { ...projData, id: newId, createdAt: new Date().toISOString() };
    await saveProject(newProj);
    setProjects(prev => [newProj, ...prev]);

    // Create default cut for it
    const newCut: Cut = {
      id: `cut_${Date.now()}`,
      projectId: newId,
      name: 'Cut 1',
      provider: 'standalone',
      durationSeconds: 120,
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
      durationSeconds: 120,
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
    <div className="flex flex-col min-h-screen bg-[#090c13] text-slate-100">
      {/* Studio Header */}
      <Header
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        branding={branding}
        activeProject={activeProject}
        activeCut={activeCut}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenBranding={() => setIsBrandingOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Workspace Area */}
      {currentTool === 'screener' ? (
        <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1700px] w-full mx-auto">
          {/* Left / Center Column (Player + Timeline + Presets): 7 cols on large screens */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Video Player Container */}
            <div className="relative">
              {activeCut && activeProject ? (
                <VideoPlayer
                  ref={videoPlayerRef}
                  cut={activeCut}
                  project={activeProject}
                  localVideoUrl={localVideoUrl}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  onMarkIn={handleMarkIn}
                  onMarkOut={handleMarkOut}
                />
              ) : (
                <div className="aspect-video bg-[#111622] rounded-2xl flex items-center justify-center border border-[#1e273b] text-slate-500">
                  Select a project to start
                </div>
              )}

              {/* On-Screen Freeze-Frame Drawing Canvas Overlay */}
              {isDrawingOpen && (
                <AnnotationCanvas
                  isOpen={isDrawingOpen}
                  videoElement={videoPlayerRef.current?.getVideoElement() || null}
                  onSaveDrawing={(drawingDataUrl, snapshotDataUrl) => {
                    setActiveDrawingSnapshot(snapshotDataUrl);
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
                duration={duration}
                project={activeProject}
                notes={notes}
                inTime={inTime}
                outTime={outTime}
                onSeek={sec => {
                  if (videoPlayerRef.current) {
                    videoPlayerRef.current.seekTo(sec);
                  }
                }}
                onSelectNote={handleSeekToNote}
              />
            )}

            {/* Voice Recorder Panel (if open) */}
            {isVoiceRecordingOpen && (
              <VoiceRecorder
                onSaveAudio={(blob, url) => {
                  setActiveAudioBlob(blob);
                  setIsVoiceRecordingOpen(false);
                }}
                onCancel={() => setIsVoiceRecordingOpen(false)}
              />
            )}

            {/* Preset Action Keys & Note Input Form */}
            <PresetKeys
              currentTc={currentTc}
              inTc={inTc}
              outTc={outTc}
              onClearRange={handleClearRange}
              onAddNote={handleAddNote}
              onStartDrawing={() => {
                videoPlayerRef.current?.pause();
                setIsDrawingOpen(true);
              }}
              onStartVoiceRecording={() => {
                videoPlayerRef.current?.pause();
                setIsVoiceRecordingOpen(true);
              }}
              activeDrawingSnapshot={activeDrawingSnapshot}
              activeAudioBlob={activeAudioBlob}
              onClearDrawingSnapshot={() => setActiveDrawingSnapshot(null)}
              onClearAudioBlob={() => setActiveAudioBlob(null)}
            />
          </div>

          {/* Right Column (Notes List & Filtered Cards): 5 cols */}
          <div className="lg:col-span-5 h-[calc(100vh-6rem)] sticky top-20 flex flex-col">
            <NotesList
              notes={notes}
              onSeekToNote={handleSeekToNote}
              onToggleResolved={handleToggleResolved}
              onDeleteNote={handleDeleteNote}
              onUpdateNoteText={handleUpdateNoteText}
            />
          </div>
        </main>
      ) : (
        /* Placeholder view for other suite tools (Frames, Cutsheet, Reframe, etc.) */
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="p-4 rounded-2xl bg-[#141b29] border border-[#222c42] max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1 capitalize">
              {currentTool.replace('-', ' ')} Tool
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Integrated inside Media Dashboard Hub. Switch back to Screener to continue review notes or prepare this module next.
            </p>
            <button
              onClick={() => setCurrentTool('screener')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
            >
              Back to Screener
            </button>
          </div>
        </main>
      )}

      {/* Studio Branding Modal (Studio Bundle) */}
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
