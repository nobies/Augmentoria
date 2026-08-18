'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { VideoPlayer, VideoPlayerHandle } from '@/components/VideoPlayer';
import { TimelineScrubber } from '@/components/TimelineScrubber';
import { PresetKeys, PRESET_CATEGORIES } from '@/components/PresetKeys';
import { NotesList } from '@/components/NotesList';
import { AnnotationCanvas } from '@/components/AnnotationCanvas';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { ExportModal } from '@/components/ExportModal';
import { MediaToolsStrip } from '@/components/MediaToolsStrip';
import { ColorGradingPanel, ColorGradeSettings, DEFAULT_GRADE } from '@/components/ColorGradingPanel';

import { Project, Cut, ReviewNote, StudioBranding } from '@/lib/supabase';
import {
  getStudioBranding,
  getAllProjects,
  getCutsForProject,
  getNotesForCut,
  saveReviewNote,
  deleteReviewNote as dbDeleteNote,
  saveAudioBlob,
} from '@/lib/storage';

import { secondsToDisplayTimecode, timecodeToFrames } from '@/lib/timecode';
import { Film, Shield, Lock } from 'lucide-react';

interface ReviewPageProps {
  params: Promise<{ token: string }>;
}

export default function ClientReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [cut, setCut] = useState<Cut | null>(null);
  const [branding, setBranding] = useState<StudioBranding>({
    name: 'Studio',
    tagline: 'Review Portal',
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
  });

  const [permissions, setPermissions] = useState({
    canComment: true,
    canDraw: true,
    canGrade: true,
    canVoice: true,
    canExport: true,
    viewOnly: false,
  });

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [inTime, setInTime] = useState<number | null>(null);
  const [outTime, setOutTime] = useState<number | null>(null);

  // Notes
  const [notes, setNotes] = useState<ReviewNote[]>([]);
  const [selectedNote, setSelectedNote] = useState<ReviewNote | null>(null);

  // Modals & Panels
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [isVoiceRecordingOpen, setIsVoiceRecordingOpen] = useState(false);
  const [isGradeOpen, setIsGradeOpen] = useState(false);

  // Active Grade / Live GPU Preview
  const [activeGrade, setActiveGrade] = useState<ColorGradeSettings>(DEFAULT_GRADE);
  const [livePreviewGrade, setLivePreviewGrade] = useState<ColorGradeSettings | null>(null);

  // Attachments
  const [activeDrawingSnapshot, setActiveDrawingSnapshot] = useState<string | null>(null);
  const [activeDrawingVector, setActiveDrawingVector] = useState<string | null>(null);
  const [activeAudioBlob, setActiveAudioBlob] = useState<Blob | null>(null);

  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);

  useEffect(() => {
    async function loadClientSession() {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
        if (decoded.p) setPermissions(decoded.p);

        const b = await getStudioBranding();
        setBranding(b);

        const projs = await getAllProjects();
        const foundProj = projs.find(p => p.id === decoded.projectId) || projs[0];
        if (!foundProj) {
          setError('Project not found or review link has expired.');
          setLoading(false);
          return;
        }

        setProject(foundProj);
        const pCuts = await getCutsForProject(foundProj.id);
        const foundCut = pCuts.find(c => c.id === decoded.cutId) || pCuts[0];

        if (!foundCut) {
          setError('Cut not found.');
          setLoading(false);
          return;
        }

        setCut(foundCut);
        const nts = await getNotesForCut(foundCut.id);
        setNotes(nts);
        setLoading(false);
      } catch (e: any) {
        setError('Invalid or corrupted review link.');
        setLoading(false);
      }
    }
    loadClientSession();
  }, [token]);

  if (loading) {
    return (
      <div className="h-screen bg-[#090c13] flex items-center justify-center text-slate-400 font-mono text-xs">
        <Film className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        Loading Secure Review Portal...
      </div>
    );
  }

  if (error || !project || !cut) {
    return (
      <div className="h-screen bg-[#090c13] flex items-center justify-center p-4">
        <div className="p-6 rounded-2xl bg-[#141b29] border border-[#222c42] text-center max-w-sm">
          <Lock className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">Access Restricted</h3>
          <p className="text-xs text-slate-400">{error || 'Review link is unavailable.'}</p>
        </div>
      </div>
    );
  }

  const currentTc = secondsToDisplayTimecode(
    currentTime,
    project.fps,
    project.startTimecode,
    project.dropFrame
  );

  const handleAddNote = async (data: any) => {
    if (permissions.viewOnly || !permissions.canComment) return;

    const noteId = `note_${Date.now()}`;
    let audioUrl: string | undefined = undefined;

    if (data.audioBlob) {
      audioUrl = await saveAudioBlob(noteId, data.audioBlob);
    }

    const noteTime = inTime !== null ? inTime : currentTime;
    const noteTc = secondsToDisplayTimecode(
      noteTime,
      project.fps,
      project.startTimecode,
      project.dropFrame
    );

    let finalThumbnail = data.stillImageUrl || activeDrawingSnapshot;
    if (!finalThumbnail && videoPlayerRef.current) {
      finalThumbnail = videoPlayerRef.current.captureFrameThumbnail();
    }

    const newNote: ReviewNote = {
      id: noteId,
      cutId: cut.id,
      category: data.category,
      presetLabel: data.presetLabel,
      text: data.text,
      frameNumber: timecodeToFrames(noteTc, project.fps, project.dropFrame),
      timecode: noteTc,
      drawingData: activeDrawingVector || data.drawingData,
      stillImageUrl: finalThumbnail || undefined,
      audioBlobUrl: audioUrl,
      authorName: 'Client Reviewer',
      isResolved: false,
      createdAt: new Date().toISOString(),
    };

    await saveReviewNote(newNote);
    setNotes(prev => [...prev, newNote].sort((a, b) => a.frameNumber - b.frameNumber));

    setActiveDrawingSnapshot(null);
    setActiveDrawingVector(null);
    setActiveAudioBlob(null);
    setInTime(null);
    setOutTime(null);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090c13] text-slate-100 select-none">
      {/* Branded Header */}
      <header className="h-12 bg-[#0c1018] border-b border-[#1c2438] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-xs">
            {branding.name?.charAt(0) || 'S'}
          </div>
          <div>
            <span className="text-xs font-bold text-white block">{branding.name}</span>
            <span className="text-[10px] text-slate-400">{project.name} · {cut.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {permissions.viewOnly && (
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
              View-Only Portal
            </span>
          )}
          {permissions.canExport && !permissions.viewOnly && (
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition active:scale-95"
            >
              Export Notes
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-2.5 flex gap-2.5 overflow-hidden max-w-[1920px] w-full mx-auto min-h-0">
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          <div className="flex-1 relative flex flex-col min-h-0">
            <VideoPlayer
              ref={videoPlayerRef}
              cut={cut}
              project={project}
              localVideoUrl={null}
              notes={notes}
              selectedNote={selectedNote}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onMarkIn={() => setInTime(currentTime)}
              onMarkOut={() => setOutTime(currentTime)}
              onOpenAddMedia={() => {}}
              onOpenCompare={() => {}}
              onUpdateFps={() => {}}
              onUpdateStartTc={() => {}}
            />

            {isDrawingOpen && permissions.canDraw && !permissions.viewOnly && (
              <AnnotationCanvas
                isOpen={isDrawingOpen}
                videoElement={videoPlayerRef.current?.getVideoElement() || null}
                posterDataUrl={videoPlayerRef.current?.getPosterDataUrl() || null}
                onSaveDrawing={(vectorUrl, snapshotUrl) => {
                  setActiveDrawingSnapshot(snapshotUrl);
                  setActiveDrawingVector(vectorUrl);
                  setIsDrawingOpen(false);
                }}
                onCancel={() => setIsDrawingOpen(false)}
              />
            )}
          </div>

          <TimelineScrubber
            currentTime={currentTime}
            duration={duration || 1}
            project={project}
            notes={notes}
            inTime={inTime}
            outTime={outTime}
            onSeek={sec => videoPlayerRef.current?.seekTo(sec)}
            onSelectNote={n => {
              setSelectedNote(n);
              const nFrames = timecodeToFrames(n.timecode, project.fps, project.dropFrame);
              const sFrames = timecodeToFrames(project.startTimecode || '01:00:00:00', project.fps, project.dropFrame);
              videoPlayerRef.current?.seekTo(Math.max(0, (nFrames - sFrames) / project.fps));
            }}
          />

          {!permissions.viewOnly && permissions.canComment && (
            <PresetKeys
              currentTc={currentTc}
              inTc={null}
              outTc={null}
              onClearRange={() => {
                setInTime(null);
                setOutTime(null);
              }}
              onAddNote={handleAddNote}
              activeDrawingSnapshot={activeDrawingSnapshot}
              activeAudioBlob={activeAudioBlob}
              onClearDrawingSnapshot={() => {
                setActiveDrawingSnapshot(null);
                setActiveDrawingVector(null);
              }}
              onClearAudioBlob={() => setActiveAudioBlob(null)}
            />
          )}
        </div>

        {!permissions.viewOnly && (
          <MediaToolsStrip
            onStartDrawing={() => {
              if (permissions.canDraw) {
                videoPlayerRef.current?.pause();
                setIsDrawingOpen(true);
              }
            }}
            onStartVoiceRecording={() => {
              if (permissions.canVoice) {
                videoPlayerRef.current?.pause();
                setIsVoiceRecordingOpen(true);
              }
            }}
            onOpenColorGrading={() => {
              if (permissions.canGrade) {
                setIsGradeOpen(true);
              }
            }}
            onAttachImage={file => {
              if (permissions.canDraw) {
                const reader = new FileReader();
                reader.onload = () => setActiveDrawingSnapshot(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
            hasActiveDrawing={Boolean(activeDrawingSnapshot)}
            hasActiveVoice={Boolean(activeAudioBlob)}
          />
        )}

        <div className="w-[320px] lg:w-[350px] flex flex-col min-h-0 shrink-0">
          <NotesList
            notes={notes}
            selectedNoteId={selectedNote?.id || null}
            onSeekToNote={n => {
              setSelectedNote(n);
              const nFrames = timecodeToFrames(n.timecode, project.fps, project.dropFrame);
              const sFrames = timecodeToFrames(project.startTimecode || '01:00:00:00', project.fps, project.dropFrame);
              videoPlayerRef.current?.seekTo(Math.max(0, (nFrames - sFrames) / project.fps));
            }}
            onToggleResolved={() => {}}
            onDeleteNote={() => {}}
            onUpdateNoteText={() => {}}
          />
        </div>
      </main>

      {isVoiceRecordingOpen && (
        <VoiceRecorder
          onSaveAudio={blob => {
            setActiveAudioBlob(blob);
            setIsVoiceRecordingOpen(false);
          }}
          onCancel={() => setIsVoiceRecordingOpen(false)}
        />
      )}

      {/* Color Grading Panel */}
      <ColorGradingPanel
        isOpen={isGradeOpen}
        onClose={() => {
          setIsGradeOpen(false);
          setLivePreviewGrade(null);
        }}
        currentGrade={activeGrade}
        onApplyGrade={(grade, applyScope) => {
          setActiveGrade(grade);
          setLivePreviewGrade(null);
          handleAddNote({
            category: 'color',
            presetLabel: grade.preset !== 'none' ? `Look: ${grade.preset}` : 'Color Grade',
            text: `Exposure: ${grade.brightness - 100 > 0 ? `+${grade.brightness - 100}` : grade.brightness - 100}%, Contrast: ${grade.contrast}%, Sat: ${grade.saturation}%`,
          });
        }}
        onLivePreviewChange={setLivePreviewGrade}
      />

      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          project={project}
          cut={cut}
          notes={notes}
          branding={branding}
        />
      )}
    </div>
  );
}
