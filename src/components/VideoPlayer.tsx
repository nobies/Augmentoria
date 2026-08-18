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
} from 'lucide-react';
import VimeoPlayer from '@vimeo/player';
import { Cut, Project } from '@/lib/supabase';
import { secondsToDisplayTimecode } from '@/lib/timecode';

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
  getCurrentTime: () => number;
  pause: () => void;
  play: () => void;
  togglePlay: () => void;
}

interface VideoPlayerProps {
  cut: Cut;
  project: Project;
  localVideoUrl: string | null;
  onTimeUpdate: (seconds: number) => void;
  onDurationChange: (duration: number) => void;
  onMarkIn: () => void;
  onMarkOut: () => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  (
    { cut, project, localVideoUrl, onTimeUpdate, onDurationChange, onMarkIn, onMarkOut },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const vimeoContainerRef = useRef<HTMLDivElement | null>(null);
    const vimeoPlayerInstanceRef = useRef<VimeoPlayer | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(120);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // Standalone timer
    const standaloneTimerRef = useRef<NodeJS.Timeout | null>(null);

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
          vimeoPlayerInstanceRef.current.setCurrentTime(clamped).catch(() => {});
        }
      },
      getVideoElement: () => videoRef.current,
      getCurrentTime: () => currentTime,
      pause: () => {
        if (cut.provider === 'local' || cut.provider === 'drive') {
          if (videoRef.current) videoRef.current.pause();
        } else if (cut.provider === 'vimeo' && vimeoPlayerInstanceRef.current) {
          vimeoPlayerInstanceRef.current.pause().catch(() => {});
        }
        setIsPlaying(false);
      },
      play: () => {
        if (cut.provider === 'local' || cut.provider === 'drive') {
          if (videoRef.current) videoRef.current.play();
        } else if (cut.provider === 'vimeo' && vimeoPlayerInstanceRef.current) {
          vimeoPlayerInstanceRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
      },
      togglePlay: () => {
        togglePlayback();
      },
    }));

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
        if (isPlaying) {
          vimeoPlayerInstanceRef.current.pause().catch(() => {});
          setIsPlaying(false);
        } else {
          vimeoPlayerInstanceRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      } else if (cut.provider === 'standalone') {
        setIsPlaying(!isPlaying);
      }
    };

    // Initialize Vimeo Player SDK
    useEffect(() => {
      if (cut.provider === 'vimeo' && vimeoContainerRef.current && cut.videoUrl) {
        // Destroy previous instance if any
        if (vimeoPlayerInstanceRef.current) {
          vimeoPlayerInstanceRef.current.destroy().catch(() => {});
        }

        vimeoContainerRef.current.innerHTML = '';

        try {
          const player = new VimeoPlayer(vimeoContainerRef.current, {
            url: cut.videoUrl as any,
            responsive: true,
            autoplay: false,
            controls: false, // We control playback via our professional studio transport
          });

          vimeoPlayerInstanceRef.current = player;

          player.on('loaded', async () => {
            try {
              const d = await player.getDuration();
              setDuration(d);
              onDurationChange(d);
            } catch (e) {}
          });

          player.on('play', () => setIsPlaying(true));
          player.on('pause', () => setIsPlaying(false));

          player.on('timeupdate', (data: { seconds: number; duration: number }) => {
            setCurrentTime(data.seconds);
            onTimeUpdate(data.seconds);
            if (data.duration && data.duration > 0) {
              setDuration(data.duration);
              onDurationChange(data.duration);
            }
          });

          player.on('ended', () => setIsPlaying(false));
        } catch (err) {
          console.error('Failed to init Vimeo Player:', err);
        }

        return () => {
          if (vimeoPlayerInstanceRef.current) {
            vimeoPlayerInstanceRef.current.destroy().catch(() => {});
          }
        };
      }
    }, [cut.provider, cut.videoUrl]);

    // Local Video Events
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
        vimeoPlayerInstanceRef.current.pause().catch(() => {});
        setIsPlaying(false);
        vimeoPlayerInstanceRef.current.setCurrentTime(targetTime).catch(() => {});
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
        {/* Main Video Screen Container (Fixed 16:9 Aspect Ratio) */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden select-none">
          {cut.provider === 'local' || cut.provider === 'drive' ? (
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
            <div className="w-full h-full relative flex items-center justify-center">
              <div ref={vimeoContainerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
              {/* Invisible Overlay to capture clicks and route to studio transport */}
              <div
                onClick={togglePlayback}
                className="absolute inset-0 cursor-pointer pointer-events-auto bg-transparent"
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
            /* Standalone SMPTE Clock Screen */
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

        {/* Studio Transport Control Bar */}
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
                  vimeoPlayerInstanceRef.current.setMuted(!isMuted).catch(() => {});
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
                  vimeoPlayerInstanceRef.current.requestFullscreen().catch(() => {});
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
