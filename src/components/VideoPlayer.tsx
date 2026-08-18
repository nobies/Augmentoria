'use client';

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Video,
  SplitSquareVertical,
  PenTool,
  X,
  Eye,
  EyeOff,
  Link as LinkIcon,
  ChevronsLeft,
  ChevronsRight,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Cut, Project, ReviewNote } from '@/lib/supabase';
import { secondsToDisplayTimecode, timecodeToFrames, framesToSeconds } from '@/lib/timecode';
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
  inTime?: number | null;
  outTime?: number | null;
  onTimeUpdate: (seconds: number) => void;
  onDurationChange: (duration: number) => void;
  onMarkIn: () => void;
  onMarkOut: () => void;
  onClearRange?: () => void;
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
      inTime,
      outTime,
      onTimeUpdate,
      onDurationChange,
      onMarkIn,
      onMarkOut,
      onClearRange,
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

    // Drawing Overlay Visibility
    const [showMarkup, setShowMarkup] = useState(true);

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

    // Check if current frame or range has markup/drawing
    const currentFrame = Math.round(currentTime * project.fps);
    const activeNoteWithMarkup = selectedNote?.drawingData
      ? selectedNote
      : notes.find(n => {
          if (!n.drawingData) return false;
          const startF = timecodeToFrames(n.timecode, project.fps, project.dropFrame);
          const endF = n.timecodeOut
            ? timecodeToFrames(n.timecodeOut, project.fps, project.dropFrame)
            : startF + 1;
          return currentFrame >= startF && currentFrame <= endF;
        });

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

    // Volume & Mute
    const handleVolumeChange = (newVol: number) => {
      setVolume(newVol);
      setIsMuted(newVol === 0);
      if (videoRef.current) videoRef.current.volume = newVol;
      if (vimeoPlayerInstanceRef.current) {
        try {
          vimeoPlayerInstanceRef.current.setVolume(newVol).catch(() => {});
        } catch (e) {}
      }
    };

    const toggleMute = () => {
      if (isMuted) {
        setIsMuted(false);
        handleVolumeChange(volume || 0.8);
      } else {
        setIsMuted(true);
        if (videoRef.current) videoRef.current.volume = 0;
        if (vimeoPlayerInstanceRef.current) {
          try {
            vimeoPlayerInstanceRef.current.setVolume(0).catch(() => {});
          } catch (e) {}
        }
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
        {/* TOP LCD & BAR (Screenshot 1 Style) */}
        <div className="bg-[#0e131f] border-b border-[#1d2538] px-3 py-1.5 flex items-center justify-between text-slate-300 shrink-0 select-none">
          {/* Reset / Start Jump Button */}
          <button
            onClick={() => stepDelta(-currentTime)}
            title="Reset / Return to Start"
            className="p-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] transition active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* LCD Timecode Display */}
          <div className="flex items-center gap-2.5">
            <div className="font-mono text-xl font-black text-blue-400 tracking-widest drop-shadow-[0_0_10px_rgba(59,130,246,0.35)]">
              {secondsToDisplayTimecode(
                currentTime,
                project.fps,
                project.startTimecode,
                project.dropFrame
              )}
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-mono font-bold text-slate-400 leading-none">{project.fps}</span>
              <span className="block text-[8px] font-mono text-slate-500 leading-none">{project.dropFrame ? 'DF' : 'NDF'}</span>
            </div>
          </div>

          {/* Right: Compare & Add Video quick buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenAddMedia}
              className="p-1 rounded-lg bg-[#141b29] hover:bg-[#1f283d] text-slate-300 hover:text-blue-400 border border-[#232d44] transition"
              title="Add Video Link"
            >
              <LinkIcon className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onOpenCompare}
              className={`p-1 rounded-lg border transition ${
                cut.provider === 'compare'
                  ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                  : 'bg-[#141b29] border-[#232d44] text-slate-300 hover:text-purple-300'
              }`}
              title="Compare Clips"
            >
              <SplitSquareVertical className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* MAIN VIDEO DISPLAY AREA (With Live Color Grade Filter) */}
        <div
          style={gradeStyle}
          className="relative flex-1 min-h-[220px] bg-black flex items-center justify-center overflow-hidden select-none transition-all duration-150"
        >
          {cut.provider === 'compare' ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              {/* Compare Mode Switcher */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#0c1018]/90 backdrop-blur-md border border-[#232d44] p-0.5 rounded-lg flex items-center gap-1 z-30 shadow-2xl">
                {['split', 'wipe', 'fade', 'a', 'b'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCompareMode(m as any)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold capitalize transition ${
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
              <div className="text-center p-4 text-slate-500 cursor-pointer" onClick={onOpenAddMedia}>
                <Video className="w-8 h-8 mx-auto mb-1.5 opacity-50 text-blue-400" />
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
              <span className="font-mono text-3xl font-bold text-blue-400">
                {secondsToDisplayTimecode(currentTime, project.fps, project.startTimecode, project.dropFrame)}
              </span>
            </div>
          )}

          {/* On-Screen Drawing Markup Overlay */}
          {activeNoteWithMarkup?.drawingData && showMarkup && (
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
              <img
                src={activeNoteWithMarkup.drawingData}
                alt="Markup"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Markup Visibility Toggle Button in Video Corner */}
          {activeNoteWithMarkup?.drawingData && (
            <button
              type="button"
              onClick={() => setShowMarkup(!showMarkup)}
              className="absolute top-2 right-2 z-30 px-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-lg hover:bg-black transition"
              title="Toggle Markup Visibility"
            >
              {showMarkup ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{showMarkup ? 'Markup ON' : 'Markup OFF'}</span>
            </button>
          )}
        </div>

        {/* BOTTOM MASTER SHUTTLE & COMPACT PRECISION STEPPERS */}
        <div className="bg-[#0e131f] border-t border-[#1d2538] p-1.5 flex flex-col gap-1.5 shrink-0 select-none">
          {/* Row 1: Slim Shuttle & In/Out & Volume Controls */}
          <div className="flex items-center justify-between gap-2">
            {/* In / Out Markers */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onMarkIn}
                className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition active:scale-95 ${
                  inTime !== null
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#141b29] border-[#232d44] text-slate-300 hover:text-white'
                }`}
                title="Mark In [I]"
              >
                IN
              </button>
              <button
                type="button"
                onClick={onMarkOut}
                className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition active:scale-95 ${
                  outTime !== null
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-[#141b29] border-[#232d44] text-slate-300 hover:text-white'
                }`}
                title="Mark Out [O]"
              >
                OUT
              </button>
              {(inTime !== null || outTime !== null) && onClearRange && (
                <button
                  type="button"
                  onClick={onClearRange}
                  className="px-1.5 py-1 rounded-lg text-slate-500 hover:text-white text-[10px]"
                  title="Clear Range"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Shuttle 4 Buttons (Slim & Compact) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => stepDelta(-currentTime)}
                title="Jump to Start (|<<)"
                className="h-7 w-7 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] flex items-center justify-center transition active:scale-95 text-slate-300"
              >
                <SkipBack className="w-3 h-3" />
              </button>

              <button
                onClick={() => stepDelta(-5)}
                title="Shuttle Reverse (<<)"
                className="h-7 w-7 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] flex items-center justify-center transition active:scale-95 text-slate-300"
              >
                <ChevronsLeft className="w-3 h-3" />
              </button>

              <button
                onClick={togglePlayback}
                title="Play / Pause [Space]"
                className={`h-7 px-3 rounded-lg border flex items-center justify-center transition active:scale-95 text-xs font-bold ${
                  isPlaying
                    ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                    : 'bg-[#141b29] hover:bg-[#1f283d] border-[#232d44] text-slate-200'
                }`}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>

              <button
                onClick={() => stepDelta(5)}
                title="Shuttle Fast Forward (>>)"
                className="h-7 w-7 rounded-lg bg-[#141b29] hover:bg-[#1f283d] hover:text-white border border-[#232d44] flex items-center justify-center transition active:scale-95 text-slate-300"
              >
                <ChevronsRight className="w-3 h-3" />
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-400 hover:text-white p-1 transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={e => handleVolumeChange(Number(e.target.value))}
                className="w-14 accent-blue-500 cursor-pointer"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>
          </div>

          {/* Row 2: Precision Stepping Pills (FRAME, SEC, MIN with [-] [+]) */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* FRAME Column */}
            <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-[#141b29] border border-[#202a3f]">
              <span className="text-[8px] font-mono font-black text-slate-500 uppercase">FRAME</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => stepDelta(-1 / project.fps)}
                  className="w-5 h-5 rounded bg-[#0d121c] hover:bg-[#1a2336] text-slate-300 text-xs font-mono font-bold flex items-center justify-center transition"
                >
                  -
                </button>
                <button
                  onClick={() => stepDelta(1 / project.fps)}
                  className="w-5 h-5 rounded bg-[#0d121c] hover:bg-[#1a2336] text-slate-300 text-xs font-mono font-bold flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* SEC Column */}
            <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-[#141b29] border border-[#202a3f]">
              <span className="text-[8px] font-mono font-black text-slate-500 uppercase">SEC</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => stepDelta(-1)}
                  className="w-5 h-5 rounded bg-[#0d121c] hover:bg-[#1a2336] text-slate-300 text-xs font-mono font-bold flex items-center justify-center transition"
                >
                  -
                </button>
                <button
                  onClick={() => stepDelta(1)}
                  className="w-5 h-5 rounded bg-[#0d121c] hover:bg-[#1a2336] text-slate-300 text-xs font-mono font-bold flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* MIN Column */}
            <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-[#141b29] border border-[#202a3f]">
              <span className="text-[8px] font-mono font-black text-slate-500 uppercase">MIN</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => stepDelta(-60)}
                  className="w-5 h-5 rounded bg-[#0d121c] hover:bg-[#1a2336] text-slate-300 text-xs font-mono font-bold flex items-center justify-center transition"
                >
                  -
                </button>
                <button
                  onClick={() => stepDelta(60)}
                  className="w-5 h-5 rounded bg-[#0d121c] hover:bg-[#1a2336] text-slate-300 text-xs font-mono font-bold flex items-center justify-center transition"
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
