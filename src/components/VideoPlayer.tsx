'use client';

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Tv,
  SplitSquareVertical,
  PenTool,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Cut, Project, ReviewNote } from '@/lib/supabase';
import { secondsToDisplayTimecode, timecodeToFrames, framesToSeconds } from '@/lib/timecode';

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
  getCurrentTime: () => number;
  pause: () => void;
  play: () => void;
  togglePlay: () => void;
  captureFrameThumbnail: () => string;
}

interface VideoPlayerProps {
  cut: Cut;
  project: Project;
  localVideoUrl: string | null;
  notes: ReviewNote[];
  selectedNote: ReviewNote | null;
  onTimeUpdate: (seconds: number) => void;
  onDurationChange: (duration: number) => void;
  onMarkIn: () => void;
  onMarkOut: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  (
    {
      cut,
      project,
      localVideoUrl,
      notes,
      selectedNote,
      onTimeUpdate,
      onDurationChange,
      onMarkIn,
      onMarkOut,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Vimeo single instance
    const vimeoContainerRef = useRef<HTMLDivElement | null>(null);
    const vimeoPlayerInstanceRef = useRef<any>(null);

    // Vimeo Compare Dual instances
    const vimeoCompareContainerARef = useRef<HTMLDivElement | null>(null);
    const vimeoCompareContainerBRef = useRef<HTMLDivElement | null>(null);
    const vimeoPlayerARef = useRef<any>(null);
    const vimeoPlayerBRef = useRef<any>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(120);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // Compare view mode: 'split' | 'a' | 'b'
    const [compareView, setCompareView] = useState<'split' | 'a' | 'b'>('split');

    // On-Screen Drawing Overlay state
    const [activeOverlayImage, setActiveOverlayImage] = useState<string | null>(null);
    const [showOverlay, setShowOverlay] = useState(true);

    // Standalone clock timer
    const standaloneTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Helper: Capture a clean thumbnail still from current video or LCD
    const captureThumbnail = (): string => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      if (videoRef.current && videoRef.current.videoWidth > 0) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 360);
      } else {
        // Fallback stylish LCD slate preview for Vimeo/Standalone
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 640, 360);
        // Header
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 640, 60);
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(project.name.toUpperCase(), 24, 38);

        // Big Timecode
        const tc = secondsToDisplayTimecode(
          currentTime,
          project.fps,
          project.startTimecode,
          project.dropFrame
        );
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 54px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tc, 320, 200);

        // Subtitle
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px monospace';
        ctx.fillText(`${project.fps} FPS • ${cut.name}`, 320, 250);
      }

      return canvas.toDataURL('image/jpeg', 0.85);
    };

    // Expose control handles to parent
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        const clamped = Math.max(0, Math.min(seconds, duration || 1000));
        setCurrentTime(clamped);
        onTimeUpdate(clamped);

        if (cut.provider === 'local' || cut.provider === 'drive') {
          if (videoRef.current) {
            videoRef.current.currentTime = clamped;
          }
        } else if (cut.provider === 'vimeo' && vimeoPlayerInstanceRef.current) {
          try {
            vimeoPlayerInstanceRef.current.setCurrentTime(clamped).catch(() => {});
          } catch (e) {}
        } else if (cut.provider === 'compare') {
          try {
            vimeoPlayerARef.current?.setCurrentTime(clamped).catch(() => {});
            vimeoPlayerBRef.current?.setCurrentTime(clamped).catch(() => {});
          } catch (e) {}
        }
      },
      getVideoElement: () => videoRef.current,
      getCurrentTime: () => currentTime,
      captureFrameThumbnail: captureThumbnail,
      pause: () => {
        if (cut.provider === 'local' || cut.provider === 'drive') {
          if (videoRef.current) videoRef.current.pause();
        } else if (cut.provider === 'vimeo' && vimeoPlayerInstanceRef.current) {
          try {
            vimeoPlayerInstanceRef.current.pause().catch(() => {});
          } catch (e) {}
        } else if (cut.provider === 'compare') {
          try {
            vimeoPlayerARef.current?.pause().catch(() => {});
            vimeoPlayerBRef.current?.pause().catch(() => {});
          } catch (e) {}
        }
        setIsPlaying(false);
      },
      play: () => {
        if (cut.provider === 'local' || cut.provider === 'drive') {
          if (videoRef.current) videoRef.current.play();
        } else if (cut.provider === 'vimeo' && vimeoPlayerInstanceRef.current) {
          try {
            vimeoPlayerInstanceRef.current.play().catch(() => {});
          } catch (e) {}
        } else if (cut.provider === 'compare') {
          try {
            vimeoPlayerARef.current?.play().catch(() => {});
            vimeoPlayerBRef.current?.play().catch(() => {});
          } catch (e) {}
        }
        setIsPlaying(true);
      },
      togglePlay: () => {
        togglePlayback();
      },
    }));

    // Detect if current time matches a note with drawing or if a note is explicitly selected
    useEffect(() => {
      if (selectedNote && selectedNote.drawingData) {
        setActiveOverlayImage(selectedNote.drawingData);
        setShowOverlay(true);
        return;
      }

      // Check notes at current playback position (within 1 second window)
      const currentTc = secondsToDisplayTimecode(
        currentTime,
        project.fps,
        project.startTimecode,
        project.dropFrame
      );

      const matchingNote = notes.find(n => {
        if (!n.drawingData) return false;
        const nFrames = timecodeToFrames(n.timecode, project.fps, project.dropFrame);
        const sFrames = timecodeToFrames(
          project.startTimecode || '01:00:00:00',
          project.fps,
          project.dropFrame
        );
        const noteSec = framesToSeconds(Math.max(0, nFrames - sFrames), project.fps);

        if (n.timecodeOut) {
          const outFrames = timecodeToFrames(n.timecodeOut, project.fps, project.dropFrame);
          const outSec = framesToSeconds(Math.max(0, outFrames - sFrames), project.fps);
          return currentTime >= noteSec && currentTime <= outSec;
        }

        return Math.abs(currentTime - noteSec) < 0.5;
      });

      if (matchingNote && matchingNote.drawingData) {
        setActiveOverlayImage(matchingNote.drawingData);
      } else if (!selectedNote) {
        setActiveOverlayImage(null);
      }
    }, [currentTime, selectedNote, notes, project]);

    // Toggle Play/Pause across all modes
    const togglePlayback = () => {
      if (cut.provider === 'local' || cut.provider === 'drive') {
        if (videoRef.current) {
          if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
          } else {
            videoRef.current.play();
            setIsPlaying(true);
          }
        }
      } else if (cut.provider === 'vimeo' && vimeoPlayerInstanceRef.current) {
        try {
          if (isPlaying) {
            vimeoPlayerInstanceRef.current.pause().catch(() => {});
            setIsPlaying(false);
          } else {
            vimeoPlayerInstanceRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        } catch (e) {}
      } else if (cut.provider === 'compare') {
        try {
          if (isPlaying) {
            vimeoPlayerARef.current?.pause().catch(() => {});
            vimeoPlayerBRef.current?.pause().catch(() => {});
            setIsPlaying(false);
          } else {
            vimeoPlayerARef.current?.play().catch(() => {});
            vimeoPlayerBRef.current?.play().catch(() => {});
            setIsPlaying(true);
          }
        } catch (e) {}
      } else if (cut.provider === 'standalone') {
        setIsPlaying(!isPlaying);
      }
    };

    // Single Vimeo Instance Loader
    useEffect(() => {
      let isMounted = true;

      if (cut.provider === 'vimeo' && vimeoContainerRef.current && cut.videoUrl) {
        if (vimeoPlayerInstanceRef.current) {
          try {
            vimeoPlayerInstanceRef.current.destroy().catch(() => {});
          } catch (e) {}
        }

        vimeoContainerRef.current.innerHTML = '';

        import('@vimeo/player')
          .then(module => {
            if (!isMounted || !vimeoContainerRef.current) return;
            const Vimeo = module.default || module;
            const player = new (Vimeo as any)(vimeoContainerRef.current, {
              url: cut.videoUrl,
              responsive: true,
              autoplay: false,
              controls: false,
            });

            vimeoPlayerInstanceRef.current = player;

            player.on('loaded', async () => {
              try {
                const d = await player.getDuration();
                if (isMounted) {
                  setDuration(d);
                  onDurationChange(d);
                }
              } catch (e) {}
            });

            player.on('play', () => {
              if (isMounted) setIsPlaying(true);
            });

            player.on('pause', () => {
              if (isMounted) setIsPlaying(false);
            });

            player.on('timeupdate', (data: { seconds: number; duration: number }) => {
              if (isMounted) {
                setCurrentTime(data.seconds);
                onTimeUpdate(data.seconds);
                if (data.duration && data.duration > 0) {
                  setDuration(data.duration);
                  onDurationChange(data.duration);
                }
              }
            });

            player.on('ended', () => {
              if (isMounted) setIsPlaying(false);
            });
          })
          .catch(err => {
            console.error('Vimeo SDK error:', err);
          });

        return () => {
          isMounted = false;
          if (vimeoPlayerInstanceRef.current) {
            try {
              vimeoPlayerInstanceRef.current.destroy().catch(() => {});
            } catch (e) {}
          }
        };
      }
    }, [cut.provider, cut.videoUrl]);

    // Compare Mode: Dual Vimeo Instances Loader
    useEffect(() => {
      let isMounted = true;

      if (
        cut.provider === 'compare' &&
        vimeoCompareContainerARef.current &&
        vimeoCompareContainerBRef.current &&
        cut.videoUrl &&
        cut.videoUrlB
      ) {
        vimeoCompareContainerARef.current.innerHTML = '';
        vimeoCompareContainerBRef.current.innerHTML = '';

        import('@vimeo/player')
          .then(module => {
            if (!isMounted) return;
            const Vimeo = module.default || module;

            const playerA = new (Vimeo as any)(vimeoCompareContainerARef.current, {
              url: cut.videoUrl,
              responsive: true,
              autoplay: false,
              controls: false,
            });
            vimeoPlayerARef.current = playerA;

            const playerB = new (Vimeo as any)(vimeoCompareContainerBRef.current, {
              url: cut.videoUrlB,
              responsive: true,
              autoplay: false,
              controls: false,
              muted: true,
            });
            vimeoPlayerBRef.current = playerB;

            playerA.on('loaded', async () => {
              try {
                const d = await playerA.getDuration();
                if (isMounted) {
                  setDuration(d);
                  onDurationChange(d);
                }
              } catch (e) {}
            });

            playerA.on('play', () => {
              if (isMounted) {
                setIsPlaying(true);
                playerB.play().catch(() => {});
              }
            });

            playerA.on('pause', () => {
              if (isMounted) {
                setIsPlaying(false);
                playerB.pause().catch(() => {});
              }
            });

            playerA.on('timeupdate', (data: { seconds: number; duration: number }) => {
              if (isMounted) {
                setCurrentTime(data.seconds);
                onTimeUpdate(data.seconds);
                playerB.getCurrentTime().then((bTime: number) => {
                  if (Math.abs(bTime - data.seconds) > 0.3) {
                    playerB.setCurrentTime(data.seconds).catch(() => {});
                  }
                });
              }
            });
          })
          .catch(err => {
            console.error('Compare Vimeo SDK error:', err);
          });

        return () => {
          isMounted = false;
          try {
            vimeoPlayerARef.current?.destroy().catch(() => {});
            vimeoPlayerBRef.current?.destroy().catch(() => {});
          } catch (e) {}
        };
      }
    }, [cut.provider, cut.videoUrl, cut.videoUrlB]);

    // Local HTML5 Video Events
    const handleHtml5TimeUpdate = () => {
      if (videoRef.current) {
        const t = videoRef.current.currentTime;
        setCurrentTime(t);
        onTimeUpdate(t);
      }
    };

    const handleHtml5LoadedMetadata = () => {
      if (videoRef.current) {
        const d = videoRef.current.duration || 120;
        setDuration(d);
        onDurationChange(d);
      }
    };

    // Frame Stepping
    const stepFrame = (frames: number) => {
      const delta = frames / project.fps;
      const targetTime = Math.max(0, Math.min(currentTime + delta, duration));

      if (cut.provider === 'local' || cut.provider === 'drive') {
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
          videoRef.current.currentTime = targetTime;
        }
      } else if (cut.provider === 'vimeo' && vimeoPlayerInstanceRef.current) {
        try {
          vimeoPlayerInstanceRef.current.pause().catch(() => {});
          setIsPlaying(false);
          vimeoPlayerInstanceRef.current.setCurrentTime(targetTime).catch(() => {});
        } catch (e) {}
      } else if (cut.provider === 'compare') {
        try {
          vimeoPlayerARef.current?.pause().catch(() => {});
          vimeoPlayerBRef.current?.pause().catch(() => {});
          setIsPlaying(false);
          vimeoPlayerARef.current?.setCurrentTime(targetTime).catch(() => {});
          vimeoPlayerBRef.current?.setCurrentTime(targetTime).catch(() => {});
        } catch (e) {}
      } else {
        setCurrentTime(targetTime);
        onTimeUpdate(targetTime);
      }
    };

    // Standalone timer
    useEffect(() => {
      if (cut.provider === 'standalone' && isPlaying) {
        standaloneTimerRef.current = setInterval(() => {
          setCurrentTime(prev => {
            const next = prev + 1 / project.fps;
            onTimeUpdate(next);
            return next;
          });
        }, 1000 / project.fps);
      } else {
        if (standaloneTimerRef.current) clearInterval(standaloneTimerRef.current);
      }
      return () => {
        if (standaloneTimerRef.current) clearInterval(standaloneTimerRef.current);
      };
    }, [isPlaying, cut.provider, project.fps, onTimeUpdate]);

    // Keyboard Shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          togglePlayback();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          stepFrame(e.shiftKey ? -Math.round(project.fps) : -1);
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          stepFrame(e.shiftKey ? Math.round(project.fps) : 1);
        } else if (e.key === 'j' || e.key === 'J') {
          stepFrame(-5);
        } else if (e.key === 'k' || e.key === 'K') {
          togglePlayback();
        } else if (e.key === 'l' || e.key === 'L') {
          stepFrame(5);
        } else if (e.key === 'i' || e.key === 'I') {
          onMarkIn();
        } else if (e.key === 'o' || e.key === 'O') {
          onMarkOut();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, duration, project.fps, currentTime]);

    const videoSrc =
      cut.provider === 'local'
        ? localVideoUrl || cut.videoUrl || ''
        : cut.provider === 'drive'
        ? `/api/video/${cut.driveFileId}`
        : '';

    return (
      <div className="flex flex-col bg-[#0b0e16] border border-[#1e273b] rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Main Video Display Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden select-none">
          {cut.provider === 'compare' ? (
            /* Compare Dual Screen */
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <div className="w-full h-full flex">
                {/* Clip A View */}
                <div
                  className={`relative transition-all duration-200 ${
                    compareView === 'split'
                      ? 'w-1/2 border-r border-slate-700'
                      : compareView === 'a'
                      ? 'w-full'
                      : 'hidden'
                  }`}
                >
                  <div
                    ref={vimeoCompareContainerARef}
                    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-blue-600/80 text-white text-[10px] font-bold z-20">
                    Clip A (Cut 1)
                  </span>
                </div>

                {/* Clip B View */}
                <div
                  className={`relative transition-all duration-200 ${
                    compareView === 'split'
                      ? 'w-1/2'
                      : compareView === 'b'
                      ? 'w-full'
                      : 'hidden'
                  }`}
                >
                  <div
                    ref={vimeoCompareContainerBRef}
                    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
                  />
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-purple-600/80 text-white text-[10px] font-bold z-20">
                    Clip B (Compare)
                  </span>
                </div>
              </div>

              {/* Master Overlay Click to Play/Pause */}
              <div
                onClick={togglePlayback}
                className="absolute inset-0 cursor-pointer pointer-events-auto bg-transparent z-10"
              />

              {/* Compare Mode Switcher Top Center */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#0c1018]/90 backdrop-blur-md border border-[#232d44] p-1 rounded-xl flex items-center gap-1 z-20 shadow-2xl">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setCompareView('split');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    compareView === 'split'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Split 50/50
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setCompareView('a');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    compareView === 'a'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Clip A
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setCompareView('b');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    compareView === 'b'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Clip B
                </button>
              </div>
            </div>
          ) : cut.provider === 'local' || cut.provider === 'drive' ? (
            videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                onTimeUpdate={handleHtml5TimeUpdate}
                onLoadedMetadata={handleHtml5LoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlayback}
                className="w-full h-full object-contain cursor-pointer"
              />
            ) : (
              <div className="text-center p-6 text-slate-500">
                <Video className="w-12 h-12 mx-auto mb-2 opacity-50 text-blue-400" />
                <p className="text-sm font-semibold text-slate-300">No video selected</p>
                <p className="text-xs text-slate-500 mt-1">Paste a Vimeo/YouTube link or upload file above</p>
              </div>
            )
          ) : cut.provider === 'vimeo' ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <div ref={vimeoContainerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
              <div
                onClick={togglePlayback}
                className="absolute inset-0 cursor-pointer pointer-events-auto bg-transparent z-10"
              />
            </div>
          ) : cut.provider === 'youtube' ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${cut.videoUrl?.split('v=')[1]?.split('&')[0] || ''}?enablejsapi=1&controls=0`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            /* Standalone Clock */
            <div
              onClick={togglePlayback}
              className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0e131d] to-[#080b11] p-8 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Standalone SMPTE Clock {isPlaying ? '(RUNNING)' : '(PAUSED)'}</span>
              </div>
              <div className="text-5xl md:text-7xl font-mono font-black text-blue-400 tracking-wider drop-shadow-[0_0_25px_rgba(59,130,246,0.35)]">
                {secondsToDisplayTimecode(
                  currentTime,
                  project.fps,
                  project.startTimecode,
                  project.dropFrame
                )}
              </div>
              <div className="mt-4 text-xs font-mono text-slate-400 flex items-center gap-4">
                <span>{project.fps} FPS</span>
                <span>•</span>
                <span>{project.dropFrame ? 'DROP FRAME' : 'NON-DROP FRAME'}</span>
              </div>
            </div>
          )}

          {/* ACTIVE ON-SCREEN DRAWING OVERLAY LAYER */}
          {activeOverlayImage && showOverlay && (
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center animate-in fade-in">
              <img
                src={activeOverlayImage}
                alt="Frame Markup"
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Overlay Indicator Badge with Toggle */}
              <div className="absolute bottom-3 left-3 bg-[#0d121c]/90 backdrop-blur-md border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-auto">
                <PenTool className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Frame Drawing Active</span>
                <button
                  onClick={() => setShowOverlay(!showOverlay)}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title="Hide markup overlay"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveOverlayImage(null)}
                  className="p-1 text-slate-400 hover:text-red-400 transition"
                  title="Dismiss markup"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Big LCD Timecode Overlay Top Right */}
          <div className="absolute top-3 right-3 bg-[#0c1018]/90 backdrop-blur-md border border-[#232d44] px-3.5 py-1.5 rounded-xl text-blue-400 font-mono text-sm font-black shadow-2xl tracking-widest flex items-center gap-2 pointer-events-none z-20">
            <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>
              {secondsToDisplayTimecode(
                currentTime,
                project.fps,
                project.startTimecode,
                project.dropFrame
              )}
            </span>
          </div>
        </div>

        {/* Transport Control Bar */}
        <div className="h-14 bg-[#0e131f] border-t border-[#1d2538] px-4 flex items-center justify-between text-slate-300 select-none">
          {/* Left: Frame Steps & Play/Pause */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => stepFrame(-Math.round(project.fps))}
              title="Jump -1 Sec (Shift+Left)"
              className="p-2 rounded-xl bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition active:scale-95"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => stepFrame(-1)}
              title="Previous Frame (Left Arrow / J)"
              className="p-2 rounded-xl bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayback}
              className={`p-2.5 rounded-xl text-white transition shadow-lg active:scale-95 flex items-center gap-1.5 px-4 font-bold text-xs ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'
              }`}
              title="Play / Pause (Space / K)"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={() => stepFrame(1)}
              title="Next Frame (Right Arrow / L)"
              className="p-2 rounded-xl bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => stepFrame(Math.round(project.fps))}
              title="Jump +1 Sec (Shift+Right)"
              className="p-2 rounded-xl bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition active:scale-95"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Center: In / Out Point Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkIn}
              className="px-3 py-1.5 rounded-xl bg-[#141b29] hover:bg-[#1f283d] border border-[#232d44] text-xs font-bold text-amber-400 transition active:scale-95"
              title="Set In Point (I)"
            >
              [ IN ]
            </button>
            <button
              onClick={onMarkOut}
              className="px-3 py-1.5 rounded-xl bg-[#141b29] hover:bg-[#1f283d] border border-[#232d44] text-xs font-bold text-amber-400 transition active:scale-95"
              title="Set Out Point (O)"
            >
              [ OUT ]
            </button>
          </div>

          {/* Right: Volume & Fullscreen */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                } else if (vimeoPlayerInstanceRef.current) {
                  try {
                    vimeoPlayerInstanceRef.current.setMuted(!isMuted).catch(() => {});
                  } catch (e) {}
                  setIsMuted(!isMuted);
                }
              }}
              className="p-2 rounded-xl bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current?.requestFullscreen) {
                  videoRef.current.requestFullscreen();
                } else if (vimeoPlayerInstanceRef.current) {
                  try {
                    vimeoPlayerInstanceRef.current.requestFullscreen().catch(() => {});
                  } catch (e) {}
                }
              }}
              className="p-2 rounded-xl bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
