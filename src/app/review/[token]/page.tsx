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
  getLocalVideoBlobUrl,
  getNotesForCut,
  saveReviewNote,
  deleteReviewNote as dbDeleteNote,
  saveAudioBlob,
} from '@/lib/storage';

import { secondsToDisplayTimecode, timecodeToFrames } from '@/lib/timecode';
import { Film, Shield, Lock, Radio } from 'lucide-react';

interface ReviewPageProps {
  params: Promise<{ token: string }>;
}

function decodeToken(token: string): any {
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const decodedStr = atob(base64);
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(decodedStr, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      return JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    } catch (err) {
      return null;
    }
  }
}

export default function ClientReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [cut, setCut] = useState<Cut | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
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

  // Client Session Control state (Request Control badge)
  const [hasControl, setHasControl] = useState(true);

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
        const decoded = decodeToken(token);
        if (!decoded) {
          setError('Invalid or corrupted review link.');
          setLoading(false);
          return;
        }

        if (decoded.p) setPermissions(decoded.p);

        // 1. Branding (from token or local fallback)
        if (decoded.branding) {
          setBranding(decoded.branding);
        } else {
          const b = await getStudioBranding();
          setBranding(b);
        }

        // 2. Project (from token payload if provided, or from local storage)
        let foundProj: Project | null = null;
        if (decoded.project) {
          foundProj = decoded.project;
        } else {
          const projs = await getAllProjects();
          foundProj = projs.find(p => p.id === decoded.projectId) || projs[0] || null;
        }

        if (!foundProj) {
          setError('Project not found or review link has expired.');
          setLoading(false);
          return;
        }
        setProject(foundProj);

        // 3. Cut (from token payload if provided, or from local storage)
        let foundCut: Cut | null = null;
        if (decoded.cut) {
          foundCut = decoded.cut;
        } else {
          const pCuts = await getCutsForProject(foundProj.id);
          foundCut = pCuts.find(c => c.id === decoded.cutId) || pCuts[0] || null;
        }

        if (!foundCut) {
          setError('Cut not found.');
          setLoading(false);
          return;
        }
        setCut(foundCut);

        // Try local video blob URL if local file
        const vUrl = await getLocalVideoBlobUrl(foundCut.id);
        if (vUrl) setLocalVideoUrl(vUrl);

        // 4. Notes (from token payload if provided, or from local storage)
        if (decoded.notes && Array.isArray(decoded.notes)) {
          setNotes(decoded.notes);
        } else {
          const nts = await getNotesForCut(foundCut.id);
          setNotes(nts);
        }

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

    const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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
    const frameNum = timecodeToFrames(noteTc, project.fps, project.dropFrame);

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
      frameNumber: frameNum,
      timecode: noteTc,
      drawingData: activeDrawingVector || data.drawingData,
      stillImageUrl: finalThumbnail || undefined,
      audioBlobUrl: audioUrl,
      colorGrade: data.colorGrade,
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

  const handleApplyColorGrade = (grade: ColorGradeSettings) => {
    setLivePreviewGrade(null);
    setIsGradeOpen(false);
    handleAddNote({
      category: 'color',
      presetLabel: grade.preset !== 'none' ? `Look: ${grade.preset}` : 'Color Correction',
      text: `Exposure: ${grade.brightness}%, Contrast: ${grade.contrast}%, Saturation: ${grade.saturation}%`,
      colorGrade: grade,
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090c13] text-slate-100 select-none">
      {/* Client Header */}
      <header className="h-12 bg-[#0c1018] border-b border-[#1c2438] px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-900/30">
            {branding.name?.charAt(0) || 'S'}
          </div>
          <div>
            <span className="text-xs font-black text-white block leading-none">{branding.name}</span>
            <span className="text-[9px] text-slate-400 leading-none">Client Review Session</span>
          </div>

          <span className="text-slate-600 font-mono text-xs">/</span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141b29] border border-[#222c42] text-xs font-bold text-slate-200">
            <span className="text-blue-400">{project.name}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">{cut.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Session Control Button */}
          <button
            type="button"
            onClick={() => setHasControl(!hasControl)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              hasControl
                ? 'bg-emerald-600/20 border border-emerald-500 text-emerald-300'
                : 'bg-[#141b29] border border-[#232d44] text-slate-400 hover:text-white'
            }`}
            title="Toggle session control"
          >
            <Radio className={`w-3.5 h-3.5 ${hasControl ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
            <span>{hasControl ? 'You Have Control' : 'Request Control'}</span>
          </button>

          {permissions.viewOnly && (
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
              View-Only Mode
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
              localVideoUrl={localVideoUrl}
              notes={notes}
              selectedNote={selectedNote}
              liveGrade={livePreviewGrade || activeGrade}
              inTime={inTime}
              outTime={outTime}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
              onMarkIn={() => setInTime(currentTime)}
              onMarkOut={() => setOutTime(currentTime)}
              onClearRange={() => {
                setInTime(null);
                setOutTime(null);
              }}
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

        {/* Right: Notes List or Color Grade Panel */}
        {isGradeOpen ? (
          <ColorGradingPanel
            isOpen={isGradeOpen}
            onClose={() => {
              setIsGradeOpen(false);
              setLivePreviewGrade(null);
            }}
            currentGrade={activeGrade}
            onApplyGrade={handleApplyColorGrade}
            onLivePreviewChange={setLivePreviewGrade}
          />
        ) : (
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
              onDeleteNote={permissions.canComment ? async id => {
                await dbDeleteNote(id);
                setNotes(prev => prev.filter(n => n.id !== id));
              } : () => {}}
              onUpdateNoteText={() => {}}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {isVoiceRecordingOpen && (
        <VoiceRecorder
          onSaveAudio={blob => {
            setActiveAudioBlob(blob);
            setIsVoiceRecordingOpen(false);
          }}
          onCancel={() => setIsVoiceRecordingOpen(false)}
        />
      )}

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
