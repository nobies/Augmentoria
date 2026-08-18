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
  EyeOff,
  Link as LinkIcon,
  Sliders,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Cut, Project, ReviewNote } from '@/lib/supabase';
import { secondsToDisplayTimecode, timecodeToFrames, framesToSeconds, STANDARD_FPS_LIST } from '@/lib/timecode';

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
  onOpenAddMedia: () => void;
  onOpenCompare: () => void;
  onUpdateFps: (fps: number) => void;
  onUpdateStartTc: (tc: string) => void;
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
      onOpenAddMedia,
      onOpenCompare,
      onUpdateFps,
      onUpdateStartTc,
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

    // HTML5 Compare Dual instances
    const html5VideoARef = useRef<HTMLVideoElement | null>(null);
    const html5VideoBRef = useRef<HTMLVideoElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // Compare Modes: 'split' (side-by-side) | 'wipe' (split slider) | 'fade' (crossfade opacity) | 'a' | 'b'
    const [compareMode, setCompareMode] = useState<'split' | 'wipe' | 'fade' | 'a' | 'b'>('split');
    const [wipePosition, setWipePosition] = useState<number>(50); // 0 to 100%
    const [fadeOpacity, setFadeOpacity] = useState<number>(50); // 0 to 100%

    // On-Screen Drawing Overlay state
    const [activeOverlayImage, setActiveOverlayImage] = useState<string | null>(null);
    const [activeOverlayLabel, setActiveOverlayLabel] = useState<string | null>(null);
    const [showOverlay, setShowOverlay] = useState(true);

    // Standalone clock timer
    const standaloneTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Helper: Capture clean thumbnail still
    const captureThumbnail = (): string => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      if (videoRef.current && videoRef.current.videoWidth > 0) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 360);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 640, 50);
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(project.name.toUpperCase(), 20, 32);

        const tc = secondsToDisplayTimecode(
          currentTime,
          project.fps,
          project.startTimecode,
          project.dropFrame
        );
        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 50px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tc, 320, 200);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px monospace';
        ctx.fillText(`${project.fps} FPS • ${cut.name}`, 320, 245);
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
            if (html5VideoARef.current) html5VideoARef.current.currentTime = clamped;
            if (html5VideoBRef.current) html5VideoBRef.current.currentTime = clamped;
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
            html5VideoARef.current?.pause();
            html5VideoBRef.current?.pause();
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
            html5VideoARef.current?.play();
            html5VideoBRef.current?.play();
          } catch (e) {}
        }
        setIsPlaying(true);
      },
      togglePlay: () => {
        togglePlayback();
      },
    }));

    // Strict Frame/Range Binding for Drawings
    useEffect(() => {
      const startFrames = timecodeToFrames(
        project.startTimecode || '01:00:00:00',
        project.fps,
        project.dropFrame
      );

      const activeNote = notes.find(n => {
        if (!n.drawingData) return false;
        const nFrames = timecodeToFrames(n.timecode, project.fps, project.dropFrame);
        const inSec = framesToSeconds(Math.max(0, nFrames - startFrames), project.fps);

        if (n.timecodeOut) {
          const outFrames = timecodeToFrames(n.timecodeOut, project.fps, project.dropFrame);
          const outSec = framesToSeconds(Math.max(0, outFrames - startFrames), project.fps);
          return currentTime >= inSec - 0.05 && currentTime <= outSec + 0.05;
        }

        const oneFrameSec = 1 / project.fps;
        return Math.abs(currentTime - inSec) <= oneFrameSec * 1.5;
      });

      if (activeNote && activeNote.drawingData) {
        setActiveOverlayImage(activeNote.drawingData);
        setActiveOverlayLabel(`${activeNote.timecode} - ${activeNote.presetLabel}`);
      } else {
        setActiveOverlayImage(null);
        setActiveOverlayLabel(null);
      }
    }, [currentTime, notes, project]);

    // Toggle Play/Pause
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
            html5VideoARef.current?.pause();
            html5VideoBRef.current?.pause();
            setIsPlaying(false);
          } else {
            vimeoPlayerARef.current?.play().catch(() => {});
            vimeoPlayerBRef.current?.play().catch(() => {});
            html5VideoARef.current?.play();
            html5VideoBRef.current?.play();
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
                if (isMounted && d > 0) {
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

    // Compare Mode: Dual Vimeo / Local Instances Loader
    const isVimeoA = Boolean(cut.videoUrl?.includes('vimeo.com'));
    const isVimeoB = Boolean(cut.videoUrlB?.includes('vimeo.com'));

    useEffect(() => {
      let isMounted = true;

      if (cut.provider === 'compare' && isVimeoA && isVimeoB && cut.videoUrl && cut.videoUrlB) {
        if (vimeoCompareContainerARef.current) vimeoCompareContainerARef.current.innerHTML = '';
        if (vimeoCompareContainerBRef.current) vimeoCompareContainerBRef.current.innerHTML = '';

        import('@vimeo/player')
          .then(module => {
            if (!isMounted || !vimeoCompareContainerARef.current || !vimeoCompareContainerBRef.current) return;
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
                if (isMounted && d > 0) {
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
            console.error('Compare Vimeo error:', err);
          });

        return () => {
          isMounted = false;
          try {
            vimeoPlayerARef.current?.destroy().catch(() => {});
            vimeoPlayerBRef.current?.destroy().catch(() => {});
          } catch (e) {}
        };
      }
    }, [cut.provider, cut.videoUrl, cut.videoUrlB, isVimeoA, isVimeoB]);

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
        const d = videoRef.current.duration || 0;
        if (d > 0) {
          setDuration(d);
          onDurationChange(d);
        }
      }
    };

    // Frame Stepping
    const stepFrame = (frames: number) => {
      const delta = frames / project.fps;
      const targetTime = Math.max(0, Math.min(currentTime + delta, duration || 1000));

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
          html5VideoARef.current?.pause();
          html5VideoBRef.current?.pause();
          setIsPlaying(false);
          vimeoPlayerARef.current?.setCurrentTime(targetTime).catch(() => {});
          vimeoPlayerBRef.current?.setCurrentTime(targetTime).catch(() => {});
          if (html5VideoARef.current) html5VideoARef.current.currentTime = targetTime;
          if (html5VideoBRef.current) html5VideoBRef.current.currentTime = targetTime;
        } catch (e) {}
      } else {
        setCurrentTime(targetTime);
        onTimeUpdate(targetTime);
      }
    };

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
      <div className="flex flex-col bg-[#0b0e16] border border-[#1e273b] rounded-2xl overflow-hidden shadow-2xl flex-1 min-h-0">
        {/* Top Embedded Control Bar inside Video Player */}
        <div className="h-10 bg-[#0e131f] border-b border-[#1d2538] px-3 flex items-center justify-between text-slate-300 text-xs shrink-0 select-none">
          {/* Left: Quick Actions (Add Video Link & Compare) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddMedia}
              className="px-2.5 py-1 rounded-lg bg-[#161f30] hover:bg-[#202d45] border border-[#263552] text-slate-200 hover:text-white flex items-center gap-1.5 transition active:scale-95 text-[11px] font-bold"
            >
              <LinkIcon className="w-3 h-3 text-blue-400" />
              <span>Add Video / Link</span>
            </button>

            <button
              type="button"
              onClick={onOpenCompare}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition ${
                cut.provider === 'compare'
                  ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow'
                  : 'bg-[#161f30] border-[#263552] text-slate-300 hover:text-purple-300'
              }`}
            >
              <SplitSquareVertical className="w-3 h-3 text-purple-400" />
              <span>Compare Clips</span>
            </button>
          </div>

          {/* Right: Embedded FPS, Start TC & Big LCD Timecode */}
          <div className="flex items-center gap-2">
            {/* FPS Selector */}
            <div className="flex items-center gap-1 bg-[#090d14] px-2 py-0.5 rounded-lg border border-[#232d44]">
              <span className="text-[10px] uppercase font-bold text-slate-500">FPS</span>
              <select
                value={project.fps}
                onChange={e => onUpdateFps(Number(e.target.value))}
                className="bg-transparent text-[11px] font-bold text-blue-400 focus:outline-none cursor-pointer"
              >
                {STANDARD_FPS_LIST.map(f => (
                  <option key={f.value} value={f.value} className="bg-[#111724] text-white">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start TC input */}
            <div className="flex items-center gap-1 bg-[#090d14] px-2 py-0.5 rounded-lg border border-[#232d44]">
              <span className="text-[10px] uppercase font-bold text-slate-500">Start</span>
              <input
                type="text"
                value={project.startTimecode}
                onChange={e => onUpdateStartTc(e.target.value)}
                className="w-16 bg-transparent text-[11px] font-mono font-bold text-slate-200 text-center focus:outline-none focus:text-blue-400"
                placeholder="01:00:00:00"
              />
            </div>

            {/* LCD Timecode Indicator */}
            <div className="bg-[#090d14] px-2.5 py-0.5 rounded-lg border border-[#232d44] font-mono text-xs font-black text-blue-400 tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
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
        </div>

        {/* Main Video Display Area (Flexible Proportion) */}
        <div className="relative flex-1 min-h-[260px] bg-black flex items-center justify-center overflow-hidden select-none">
          {cut.provider === 'compare' ? (
            /* COMPARE ENGINE: Supports Split 50/50, Wipe Slider, Fade Crossfade, A/B */
            <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
              {/* Compare Mode Switcher Top Center */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 bg-[#0c1018]/90 backdrop-blur-md border border-[#232d44] p-1 rounded-xl flex items-center gap-1 z-30 shadow-2xl">
                <button
                  type="button"
                  onClick={() => setCompareMode('split')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    compareMode === 'split' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Split 50/50
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('wipe')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    compareMode === 'wipe' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Wipe
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('fade')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    compareMode === 'fade' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fade
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('a')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    compareMode === 'a' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Clip A
                </button>
                <button
                  type="button"
                  onClick={() => setCompareMode('b')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    compareMode === 'b' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Clip B
                </button>
              </div>

              {/* 1. SIDE BY SIDE (SPLIT 50/50) */}
              {compareMode === 'split' && (
                <div className="w-full h-full flex">
                  <div className="w-1/2 h-full relative border-r border-slate-700">
                    {isVimeoA ? (
                      <div ref={vimeoCompareContainerARef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoARef} src={cut.videoUrl} playsInline className="w-full h-full object-contain" />
                    )}
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-blue-600/80 text-white text-[10px] font-bold z-20">
                      Clip A
                    </span>
                  </div>
                  <div className="w-1/2 h-full relative">
                    {isVimeoB ? (
                      <div ref={vimeoCompareContainerBRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoBRef} src={cut.videoUrlB} playsInline className="w-full h-full object-contain" />
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-purple-600/80 text-white text-[10px] font-bold z-20">
                      Clip B
                    </span>
                  </div>
                </div>
              )}

              {/* 2. WIPE MODE (Interactive vertical divider slider) */}
              {compareMode === 'wipe' && (
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                  {/* Clip A (Background Full) */}
                  <div className="absolute inset-0 w-full h-full">
                    {isVimeoA ? (
                      <div ref={vimeoCompareContainerARef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoARef} src={cut.videoUrl} playsInline className="w-full h-full object-contain" />
                    )}
                  </div>

                  {/* Clip B (Foreground Clipped by Wipe Position) */}
                  <div
                    style={{ clipPath: `inset(0 0 0 ${wipePosition}%)` }}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {isVimeoB ? (
                      <div ref={vimeoCompareContainerBRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoBRef} src={cut.videoUrlB} playsInline className="w-full h-full object-contain" />
                    )}
                  </div>

                  {/* Wipe Vertical Divider Line */}
                  <div
                    style={{ left: `${wipePosition}%` }}
                    className="absolute top-0 bottom-0 w-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] pointer-events-none z-20"
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-8 h-8 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-black shadow-2xl">
                      ⇔
                    </div>
                  </div>

                  {/* Wipe Control Slider Bar Bottom Center */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0c1018]/90 backdrop-blur-md border border-[#232d44] px-3 py-1.5 rounded-xl flex items-center gap-2 z-30 shadow-2xl">
                    <span className="text-[10px] font-bold text-blue-400">Clip A</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={wipePosition}
                      onChange={e => setWipePosition(Number(e.target.value))}
                      className="w-36 cursor-ew-resize accent-purple-500"
                    />
                    <span className="text-[10px] font-bold text-purple-400">Clip B</span>
                  </div>
                </div>
              )}

              {/* 3. FADE MODE (Crossfade / Onion Skin Opacity Slider) */}
              {compareMode === 'fade' && (
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                  {/* Clip A (Full Base) */}
                  <div className="absolute inset-0 w-full h-full">
                    {isVimeoA ? (
                      <div ref={vimeoCompareContainerARef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoARef} src={cut.videoUrl} playsInline className="w-full h-full object-contain" />
                    )}
                  </div>

                  {/* Clip B (Overlay with Opacity) */}
                  <div
                    style={{ opacity: fadeOpacity / 100 }}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {isVimeoB ? (
                      <div ref={vimeoCompareContainerBRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoBRef} src={cut.videoUrlB} playsInline className="w-full h-full object-contain" />
                    )}
                  </div>

                  {/* Fade Control Slider Bar Bottom Center */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0c1018]/90 backdrop-blur-md border border-[#232d44] px-3 py-1.5 rounded-xl flex items-center gap-2 z-30 shadow-2xl">
                    <span className="text-[10px] font-bold text-blue-400">Clip A</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fadeOpacity}
                      onChange={e => setFadeOpacity(Number(e.target.value))}
                      className="w-36 cursor-pointer accent-purple-500"
                    />
                    <span className="text-[10px] font-bold text-purple-400">Clip B ({fadeOpacity}%)</span>
                  </div>
                </div>
              )}

              {/* 4. A / B FULL TOGGLE */}
              {compareMode === 'a' && (
                <div className="w-full h-full relative">
                  {isVimeoA ? (
                    <div ref={vimeoCompareContainerARef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                  ) : (
                    <video ref={html5VideoARef} src={cut.videoUrl} playsInline className="w-full h-full object-contain" />
                  )}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-blue-600/80 text-white text-[10px] font-bold z-20">
                    Clip A (Solo)
                  </span>
                </div>
              )}

              {compareMode === 'b' && (
                <div className="w-full h-full relative">
                  {isVimeoB ? (
                    <div ref={vimeoCompareContainerBRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                  ) : (
                    <video ref={html5VideoBRef} src={cut.videoUrlB} playsInline className="w-full h-full object-contain" />
                  )}
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-purple-600/80 text-white text-[10px] font-bold z-20">
                    Clip B (Solo)
                  </span>
                </div>
              )}

              {/* Click to Play/Pause Overlay */}
              <div onClick={togglePlayback} className="absolute inset-0 cursor-pointer bg-transparent z-10" />
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
              <div className="text-center p-6 text-slate-500 cursor-pointer" onClick={onOpenAddMedia}>
                <Video className="w-10 h-10 mx-auto mb-2 opacity-50 text-blue-400" />
                <p className="text-xs font-semibold text-slate-300">Click to Add Video Link or File</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Vimeo, YouTube, MP4, MOV</p>
              </div>
            )
          ) : cut.provider === 'vimeo' ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <div ref={vimeoContainerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
              <div onClick={togglePlayback} className="absolute inset-0 cursor-pointer bg-transparent z-10" />
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
              className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0e131d] to-[#080b11] p-6 cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5 mb-2 text-slate-500 text-[11px] uppercase tracking-widest font-semibold">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>SMPTE Master Clock {isPlaying ? '(RUNNING)' : '(PAUSED)'}</span>
              </div>
              <div className="text-4xl md:text-6xl font-mono font-black text-blue-400 tracking-wider drop-shadow-[0_0_25px_rgba(59,130,246,0.35)]">
                {secondsToDisplayTimecode(
                  currentTime,
                  project.fps,
                  project.startTimecode,
                  project.dropFrame
                )}
              </div>
              <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center gap-3">
                <span>{project.fps} FPS</span>
                <span>•</span>
                <span>{project.dropFrame ? 'DROP FRAME' : 'NON-DROP FRAME'}</span>
              </div>
            </div>
          )}

          {/* ACTIVE ON-SCREEN DRAWING OVERLAY LAYER */}
          {activeOverlayImage && showOverlay && (
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center animate-in fade-in duration-100">
              <img
                src={activeOverlayImage}
                alt="Frame Markup"
                className="w-full h-full object-contain pointer-events-none"
              />

              <div className="absolute bottom-3 left-3 bg-[#0d121c]/90 backdrop-blur-md border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-2xl flex items-center gap-1.5 pointer-events-auto">
                <PenTool className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>{activeOverlayLabel || 'Markup Active'}</span>
                <button
                  onClick={() => setShowOverlay(!showOverlay)}
                  className="p-0.5 text-slate-400 hover:text-white"
                  title="Hide overlay"
                >
                  <EyeOff className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setActiveOverlayImage(null)}
                  className="p-0.5 text-slate-400 hover:text-red-400"
                  title="Dismiss markup"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transport Control Bar */}
        <div className="h-11 bg-[#0e131f] border-t border-[#1d2538] px-3 flex items-center justify-between text-slate-300 shrink-0 select-none">
          {/* Frame Steps & Play/Pause */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => stepFrame(-Math.round(project.fps))}
              title="Jump -1 Sec (Shift+Left)"
              className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => stepFrame(-1)}
              title="Previous Frame (Left Arrow / J)"
              className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayback}
              className={`p-1.5 rounded-lg text-white transition shadow active:scale-95 flex items-center gap-1 px-3 font-bold text-[11px] ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
              title="Play / Pause (Space / K)"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={() => stepFrame(1)}
              title="Next Frame (Right Arrow / L)"
              className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => stepFrame(Math.round(project.fps))}
              title="Jump +1 Sec (Shift+Right)"
              className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: In / Out Point Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onMarkIn}
              className="px-2.5 py-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] border border-[#232d44] text-[11px] font-bold text-amber-400 transition"
              title="Set In Point (I)"
            >
              [ IN ]
            </button>
            <button
              onClick={onMarkOut}
              className="px-2.5 py-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] border border-[#232d44] text-[11px] font-bold text-amber-400 transition"
              title="Set Out Point (O)"
            >
              [ OUT ]
            </button>
          </div>

          {/* Right: Volume & Fullscreen */}
          <div className="flex items-center gap-1.5">
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
              className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
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
              className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
