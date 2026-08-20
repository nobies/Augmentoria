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
import { Film, Radio, ShieldCheck, User } from 'lucide-react';

import {
  Project,
  Cut,
  ReviewNote,
  StudioBranding,
} from '@/lib/supabase';

import {
  getStudioBranding,
  getAllProjects,
  getCutsForProject,
  getNotesForCut,
  saveReviewNote,
  deleteReviewNote as dbDeleteNote,
  getLocalVideoBlobUrl,
  saveAudioBlob,
} from '@/lib/storage';

import {
  secondsToDisplayTimecode,
  timecodeToFrames,
} from '@/lib/timecode';

import { createRealtimeSession, SyncEvent } from '@/lib/realtimeSync';

interface ReviewPageProps {
  params: Promise<{
    token: string;
  }>;
}

// Portable base64url JSON decoder
function decodeToken(token: string) {
  try {
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      return JSON.parse(atob(token));
    } catch {
      return null;
    }
  }
}

export default function ClientReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client Reviewer Name
  const [authorName, setAuthorName] = useState<string>('Client');

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
  const realtimeSessionRef = useRef<{ broadcast: (e: any) => void; cleanup: () => void } | null>(null);
  const localUserIdRef = useRef<string>(`client_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

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

        // 1. Branding
        if (decoded.branding) {
          setBranding(decoded.branding);
        } else {
          const b = await getStudioBranding();
          setBranding(b);
        }

        // 2. Project
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

        // 3. Cut
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

        // 4. Notes
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

  // Connect to Realtime Session Room for Live Playhead and Notes Sync
  useEffect(() => {
    if (!cut) return;

    const session = createRealtimeSession(
      cut.id,
      project?.id || 'main',
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
  }, [cut?.id, project?.id, authorName]);

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
      <div className="h-screen bg-[#090c13] flex flex-col items-center justify-center p-4 text-center">
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 max-w-md space-y-2">
          <h2 className="text-sm font-bold">Access Restricted</h2>
          <p className="text-xs text-slate-400">{error || 'Unable to load project media cut.'}</p>
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

  const inTc =
    inTime !== null
      ? secondsToDisplayTimecode(
          inTime,
          project.fps,
          project.startTimecode,
          project.dropFrame
        )
      : null;

  const outTc =
    outTime !== null
      ? secondsToDisplayTimecode(
          outTime,
          project.fps,
          project.startTimecode,
          project.dropFrame
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
    if (permissions.viewOnly || !permissions.canComment) return;

    const noteId = `note_client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

    let tcOut: string | undefined = undefined;
    let frameOutNum: number | undefined = undefined;

    if (outTime !== null && inTime !== null && outTime > inTime) {
      tcOut = secondsToDisplayTimecode(
        outTime,
        project.fps,
        project.startTimecode,
        project.dropFrame
      );
      frameOutNum = timecodeToFrames(tcOut, project.fps, project.dropFrame);
    }

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
      timecodeOut: tcOut,
      frameOut: frameOutNum,
      colorGrade: data.colorGrade,
      drawingData: activeDrawingVector || data.drawingData,
      stillImageUrl: finalThumbnail || undefined,
      audioBlobUrl: audioUrl,
      authorName: authorName || 'Client',
      isResolved: false,
      createdAt: new Date().toISOString(),
    };

    await saveReviewNote(newNote);
    setNotes(prev => [...prev, newNote].sort((a, b) => a.frameNumber - b.frameNumber));

    // Broadcast to real-time session
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

  const handleTimelineSeek = (sec: number) => {
    videoPlayerRef.current?.seekTo(sec);
    if (hasControl) {
      realtimeSessionRef.current?.broadcast({
        type: 'SEEK',
        time: sec,
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden bg-[#090c13] text-slate-100 select-none">
      {/* Client Header */}
      <header className="min-h-[48px] bg-[#0c1018] border-b border-[#1c2438] px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div
            style={{ backgroundColor: branding.primaryColor || '#3b82f6' }}
            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-900/30 shrink-0"
          >
            {branding.name?.charAt(0) || 'S'}
          </div>
          <div>
            <span className="text-xs font-black text-white block leading-none truncate max-w-[120px] sm:max-w-[160px]">{branding.name}</span>
            <span className="text-[9px] text-slate-400 leading-none">Client Review Session</span>
          </div>

          <span className="text-slate-600 font-mono text-xs hidden xs:inline">/</span>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141b29] border border-[#222c42] text-xs font-bold text-slate-200">
            <span className="text-blue-400 truncate max-w-[100px] sm:max-w-[140px]">{project.name}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 truncate max-w-[90px] sm:max-w-[120px]">{cut.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Live Session Control Button */}
          <button
            type="button"
            onClick={() => setHasControl(!hasControl)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              hasControl
                ? 'bg-emerald-600/20 border border-emerald-500 text-emerald-300'
                : 'bg-[#141b29] border border-[#232d44] text-slate-400 hover:text-white'
            }`}
            title="Toggle session control"
          >
            <Radio className={`w-3.5 h-3.5 ${hasControl ? 'animate-pulse text-emerald-400' : 'text-slate-500'}`} />
            <span className="hidden xs:inline">{hasControl ? 'You Have Control' : 'Request Control'}</span>
            <span className="xs:hidden">{hasControl ? 'In Control' : 'Control'}</span>
          </button>

          {permissions.viewOnly && (
            <span className="px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
              View-Only
            </span>
          )}

          {permissions.canExport && !permissions.viewOnly && (
            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow transition active:scale-95"
            >
              Export
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace (Responsive) */}
      <main className="flex-1 p-2 sm:p-2.5 flex flex-col lg:flex-row gap-2 sm:gap-2.5 overflow-y-auto lg:overflow-hidden max-w-[1920px] w-full mx-auto min-h-0">
        <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
          <div className="flex-1 relative flex flex-col min-h-[280px] xs:min-h-[340px] sm:min-h-[420px] lg:min-h-0">
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
              onPlayStateChange={(playing) => {
                if (hasControl) {
                  realtimeSessionRef.current?.broadcast({
                    type: playing ? 'PLAY' : 'PAUSE',
                    time: videoPlayerRef.current?.getCurrentTime() || 0,
                  });
                }
              }}
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
            onSeek={handleTimelineSeek}
            onSelectNote={n => {
              setSelectedNote(n);
              const nFrames = timecodeToFrames(n.timecode, project.fps, project.dropFrame);
              const sFrames = timecodeToFrames(
                project.startTimecode || '01:00:00:00',
                project.fps,
                project.dropFrame
              );
              const rSec = Math.max(0, (nFrames - sFrames) / project.fps);
              videoPlayerRef.current?.seekTo(rSec);
              if (hasControl) {
                realtimeSessionRef.current?.broadcast({ type: 'SEEK', time: rSec });
              }
            }}
          />

          {!permissions.viewOnly && permissions.canComment && (
            <PresetKeys
              currentTc={currentTc}
              inTc={inTc}
              outTc={outTc}
              categories={PRESET_CATEGORIES}
              onClearRange={() => {
                setInTime(null);
                setOutTime(null);
              }}
              onAddNote={handleAddNote}
              onOpenNotekeys={() => {}}
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
          <div className="w-full lg:w-[320px] xl:w-[350px] flex flex-col min-h-[340px] lg:min-h-0 shrink-0">
            <NotesList
              notes={notes}
              selectedNoteId={selectedNote?.id || null}
              currentAuthorName={authorName}
              onChangeAuthorName={setAuthorName}
              onSeekToNote={n => {
                setSelectedNote(n);
                const nFrames = timecodeToFrames(n.timecode, project.fps, project.dropFrame);
                const sFrames = timecodeToFrames(
                  project.startTimecode || '01:00:00:00',
                  project.fps,
                  project.dropFrame
                );
                const rSec = Math.max(0, (nFrames - sFrames) / project.fps);
                videoPlayerRef.current?.seekTo(rSec);
                if (hasControl) {
                  realtimeSessionRef.current?.broadcast({ type: 'SEEK', time: rSec });
                }
              }}
              onToggleResolved={async noteId => {
                const t = notes.find(n => n.id === noteId);
                if (t) {
                  const updated = { ...t, isResolved: !t.isResolved };
                  await saveReviewNote(updated);
                  setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));
                  realtimeSessionRef.current?.broadcast({ type: 'NOTE_UPSERT', note: updated });
                }
              }}
              onDeleteNote={async noteId => {
                await dbDeleteNote(noteId);
                setNotes(prev => prev.filter(n => n.id !== noteId));
                realtimeSessionRef.current?.broadcast({ type: 'NOTE_DELETE', noteId });
              }}
              onUpdateNoteText={async (noteId, newText) => {
                const t = notes.find(n => n.id === noteId);
                if (t) {
                  const updated = { ...t, text: newText };
                  await saveReviewNote(updated);
                  setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));
                  realtimeSessionRef.current?.broadcast({ type: 'NOTE_UPSERT', note: updated });
                }
              }}
            />
          </div>
        )}
      </main>

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

      {/* Export Modal */}
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
