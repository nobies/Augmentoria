'use client';

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Video,
  SplitSquareVertical,
  PenTool,
  X,
  EyeOff,
  Link as LinkIcon,
  ChevronsLeft,
  ChevronsRight,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Cut, Project, ReviewNote } from '@/lib/supabase';
import { secondsToDisplayTimecode, timecodeToFrames, framesToSeconds, STANDARD_FPS_LIST } from '@/lib/timecode';
import { ColorGradeSettings } from './ColorGradingPanel';

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
  getCurrentTime: () => number;
  pause: () => void;
  play: () => void;
  togglePlay: () => void;
  captureFrameThumbnail: () => string;
  getPosterDataUrl: () => string | null;
}

interface VideoPlayerProps {
  cut: Cut;
  project: Project;
  localVideoUrl: string | null;
  notes: ReviewNote[];
  selectedNote: ReviewNote | null;
  liveGrade?: ColorGradeSettings | null;
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
      liveGrade,
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

    // Vimeo instances
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

    const [vimeoPosterDataUrl, setVimeoPosterDataUrl] = useState<string | null>(null);

    // Compare Modes
    const [compareMode, setCompareMode] = useState<'split' | 'wipe' | 'fade' | 'a' | 'b'>('split');
    const [wipePosition, setWipePosition] = useState<number>(50);
    const [fadeOpacity, setFadeOpacity] = useState<number>(50);

    // Drawing Overlay
    const [activeOverlayImage, setActiveOverlayImage] = useState<string | null>(null);
    const [activeOverlayLabel, setActiveOverlayLabel] = useState<string | null>(null);
    const [showOverlay, setShowOverlay] = useState(true);

    const standaloneTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Compute live CSS filter style for Color Grading
    const gradeStyle = liveGrade
      ? {
          filter: `brightness(${liveGrade.brightness}%) contrast(${liveGrade.contrast}%) saturate(${liveGrade.saturation}%) hue-rotate(${liveGrade.temperature + liveGrade.hue}deg)`,
        }
      : {};

    // Fetch Vimeo High-Res Thumbnail
    useEffect(() => {
      if (cut.provider === 'vimeo' && cut.videoUrl) {
        fetch(`/api/thumbnail?url=${encodeURIComponent(cut.videoUrl)}`)
          .then(res => res.json())
          .then(data => {
            if (data.dataUrl) setVimeoPosterDataUrl(data.dataUrl);
          })
          .catch(() => {});
      } else {
        setVimeoPosterDataUrl(null);
      }
    }, [cut.provider, cut.videoUrl]);

    // Capture Thumbnail
    const captureThumbnail = (): string => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      if (videoRef.current && videoRef.current.videoWidth > 0) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 360);
      } else if (vimeoPosterDataUrl) {
        const img = new Image();
        img.src = vimeoPosterDataUrl;
        ctx.drawImage(img, 0, 0, 640, 360);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 640, 360);
      }

      return canvas.toDataURL('image/jpeg', 0.88);
    };

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        const clamped = Math.max(0, Math.min(seconds, duration || 1000));
        setCurrentTime(clamped);
        onTimeUpdate(clamped);

        if (cut.provider === 'local' || cut.provider === 'drive') {
          if (videoRef.current) videoRef.current.currentTime = clamped;
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
      getPosterDataUrl: () => vimeoPosterDataUrl,
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

    // Step by Delta Seconds
    const stepDelta = (deltaSec: number) => {
      const targetTime = Math.max(0, Math.min(currentTime + deltaSec, duration || 1000));
      setCurrentTime(targetTime);
      onTimeUpdate(targetTime);

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
      }
    };

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
          stepDelta(-1 / project.fps);
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          stepDelta(1 / project.fps);
        } else if (e.key === 'j' || e.key === 'J') {
          stepDelta(-5 / project.fps);
        } else if (e.key === 'k' || e.key === 'K') {
          togglePlayback();
        } else if (e.key === 'l' || e.key === 'L') {
          stepDelta(5 / project.fps);
        } else if (e.key === 'i' || e.key === 'I') {
          onMarkIn();
        } else if (e.key === 'o' || e.key === 'O') {
          onMarkOut();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, duration, project.fps, currentTime]);

    const isVimeoA = Boolean(cut.videoUrl?.includes('vimeo.com'));
    const isVimeoB = Boolean(cut.videoUrlB?.includes('vimeo.com'));

    const videoSrc =
      cut.provider === 'local'
        ? localVideoUrl || cut.videoUrl || ''
        : cut.provider === 'drive'
        ? `/api/video/${cut.driveFileId}`
        : '';

    return (
      <div className="flex flex-col bg-[#0b0e16] border border-[#1e273b] rounded-2xl overflow-hidden shadow-2xl flex-1 min-h-0">
        {/* TOP LCD & QUICK BAR (Exact Screenshot 1 Style) */}
        <div className="bg-[#0e131f] border-b border-[#1d2538] px-3 py-2 flex items-center justify-between text-slate-300 shrink-0 select-none">
          {/* Reset / Start Jump Button */}
          <button
            onClick={() => stepDelta(-currentTime)}
            title="Reset / Return to Start"
            className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Big LCD Digital Timecode Display */}
          <div className="flex items-center gap-3">
            <div className="font-mono text-2xl font-black text-blue-400 tracking-widest drop-shadow-[0_0_12px_rgba(59,130,246,0.4)]">
              {secondsToDisplayTimecode(
                currentTime,
                project.fps,
                project.startTimecode,
                project.dropFrame
              )}
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-mono font-bold text-slate-400 leading-none">{project.fps}</span>
              <span className="block text-[9px] font-mono text-slate-500 leading-none">{project.dropFrame ? 'DF' : 'NDF'}</span>
            </div>
          </div>

          {/* Right: Compare & Add Video quick buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenAddMedia}
              className="p-1.5 rounded-lg bg-[#141b29] hover:bg-[#1f283d] text-slate-300 hover:text-blue-400 border border-[#232d44] transition"
              title="Add Video Link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenCompare}
              className={`p-1.5 rounded-lg border transition ${
                cut.provider === 'compare'
                  ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                  : 'bg-[#141b29] border-[#232d44] text-slate-300 hover:text-purple-300'
              }`}
              title="Compare Clips"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MAIN VIDEO DISPLAY AREA (With Live Color Grade Filter) */}
        <div
          style={gradeStyle}
          className="relative flex-1 min-h-[240px] bg-black flex items-center justify-center overflow-hidden select-none transition-all duration-150"
        >
          {cut.provider === 'compare' ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              {/* Compare Mode Switcher */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 bg-[#0c1018]/90 backdrop-blur-md border border-[#232d44] p-1 rounded-xl flex items-center gap-1 z-30 shadow-2xl">
                {['split', 'wipe', 'fade', 'a', 'b'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCompareMode(m as any)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize transition ${
                      compareMode === m ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Compare Screen */}
              {compareMode === 'split' && (
                <div className="w-full h-full flex">
                  <div className="w-1/2 h-full relative border-r border-slate-700">
                    {isVimeoA ? (
                      <div ref={vimeoCompareContainerARef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoARef} src={cut.videoUrl} playsInline className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="w-1/2 h-full relative">
                    {isVimeoB ? (
                      <div ref={vimeoCompareContainerBRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoBRef} src={cut.videoUrlB} playsInline className="w-full h-full object-contain" />
                    )}
                  </div>
                </div>
              )}

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
              </div>
            )
          ) : cut.provider === 'vimeo' ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              <div ref={vimeoContainerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
              <div onClick={togglePlayback} className="absolute inset-0 cursor-pointer bg-transparent z-10" />
            </div>
          ) : (
            <div onClick={togglePlayback} className="w-full h-full flex items-center justify-center bg-[#090d14] cursor-pointer">
              <span className="font-mono text-4xl font-bold text-blue-400">
                {secondsToDisplayTimecode(currentTime, project.fps, project.startTimecode, project.dropFrame)}
              </span>
            </div>
          )}

          {/* On-Screen Drawing Overlay */}
          {activeOverlayImage && showOverlay && (
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
              <img src={activeOverlayImage} alt="Markup" className="w-full h-full object-contain" />
            </div>
          )}
        </div>

        {/* BOTTOM MASTER SHUTTLE & PRECISION STEPPERS (Exact Screenshot 1) */}
        <div className="bg-[#0e131f] border-t border-[#1d2538] p-2 flex flex-col gap-2 shrink-0 select-none">
          {/* Row 1: Shuttle 4 Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => stepDelta(-currentTime)}
              title="Jump to Start (|<<)"
              className="py-1.5 rounded-xl bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] flex items-center justify-center transition active:scale-95 text-slate-300"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => stepDelta(-5)}
              title="Shuttle Reverse (<<)"
              className="py-1.5 rounded-xl bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] flex items-center justify-center transition active:scale-95 text-slate-300"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlayback}
              title="Play / Pause (>)"
              className={`py-1.5 rounded-xl border flex items-center justify-center transition active:scale-95 ${
                isPlaying
                  ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                  : 'bg-[#141b29] hover:bg-[#1f283d] border-[#232d44] text-slate-200'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => stepDelta(5)}
              title="Shuttle Fast Forward (>>)"
              className="py-1.5 rounded-xl bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] flex items-center justify-center transition active:scale-95 text-slate-300"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: Precision Stepping Pills (FRAME, SEC, MIN with [-] [+]) */}
          <div className="grid grid-cols-3 gap-2">
            {/* FRAME Column */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">FRAME</span>
              <div className="flex items-center gap-1 w-full">
                <button
                  onClick={() => stepDelta(-1 / project.fps)}
                  className="flex-1 py-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] text-xs font-mono font-bold text-slate-300 transition active:scale-95"
                >
                  -
                </button>
                <button
                  onClick={() => stepDelta(1 / project.fps)}
                  className="flex-1 py-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] text-xs font-mono font-bold text-slate-300 transition active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* SEC Column */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">SEC</span>
              <div className="flex items-center gap-1 w-full">
                <button
                  onClick={() => stepDelta(-1)}
                  className="flex-1 py-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] text-xs font-mono font-bold text-slate-300 transition active:scale-95"
                >
                  -
                </button>
                <button
                  onClick={() => stepDelta(1)}
                  className="flex-1 py-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] text-xs font-mono font-bold text-slate-300 transition active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* MIN Column */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">MIN</span>
              <div className="flex items-center gap-1 w-full">
                <button
                  onClick={() => stepDelta(-60)}
                  className="flex-1 py-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] text-xs font-mono font-bold text-slate-300 transition active:scale-95"
                >
                  -
                </button>
                <button
                  onClick={() => stepDelta(60)}
                  className="flex-1 py-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] text-xs font-mono font-bold text-slate-300 transition active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
