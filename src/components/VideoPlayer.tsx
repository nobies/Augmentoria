'use client';

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
} from 'lucide-react';
import { Cut, Project } from '@/lib/supabase';
import { secondsToDisplayTimecode } from '@/lib/timecode';

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
  getCurrentTime: () => number;
  pause: () => void;
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
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(120);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);

    // Standalone timer simulation
    const standaloneTimerRef = useRef<NodeJS.Timeout | null>(null);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (cut.provider === 'local' || cut.provider === 'drive') {
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, Math.min(seconds, duration));
          }
        } else if (cut.provider === 'standalone') {
          setCurrentTime(seconds);
          onTimeUpdate(seconds);
        }
      },
      getVideoElement: () => videoRef.current,
      getCurrentTime: () => currentTime,
      pause: () => {
        if (videoRef.current) videoRef.current.pause();
        setIsPlaying(false);
      },
    }));

    // Video events
    const handleTimeUpdate = () => {
      if (videoRef.current) {
        const t = videoRef.current.currentTime;
        setCurrentTime(t);
        onTimeUpdate(t);
      }
    };

    const handleLoadedMetadata = () => {
      if (videoRef.current) {
        const d = videoRef.current.duration || 120;
        setDuration(d);
        onDurationChange(d);
      }
    };

    const togglePlay = () => {
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
      } else if (cut.provider === 'standalone') {
        setIsPlaying(!isPlaying);
      }
    };

    // Standalone clock loop
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

    // Step 1 Frame
    const stepFrame = (frames: number) => {
      const frameDelta = frames / project.fps;
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
        const newTime = Math.max(0, Math.min(videoRef.current.currentTime + frameDelta, duration));
        videoRef.current.currentTime = newTime;
      } else {
        setCurrentTime(prev => {
          const next = Math.max(0, prev + frameDelta);
          onTimeUpdate(next);
          return next;
        });
      }
    };

    // Keyboard Shortcuts (Space, Left/Right arrow, J/K/L, I, O)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          togglePlay();
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          stepFrame(e.shiftKey ? -Math.round(project.fps) : -1);
        } else if (e.code === 'ArrowRight') {
          e.preventDefault();
          stepFrame(e.shiftKey ? Math.round(project.fps) : 1);
        } else if (e.key === 'j' || e.key === 'J') {
          stepFrame(-5);
        } else if (e.key === 'k' || e.key === 'K') {
          togglePlay();
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
    }, [isPlaying, duration, project.fps]);

    const videoSrc =
      cut.provider === 'local'
        ? localVideoUrl || cut.videoUrl || ''
        : cut.provider === 'drive'
        ? `/api/video/${cut.driveFileId}`
        : '';

    return (
      <div className="flex flex-col bg-[#0b0e16] border border-[#1e273b] rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Main Display Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {cut.provider === 'local' || cut.provider === 'drive' ? (
            videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-6 text-slate-500">
                <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No video file selected</p>
                <p className="text-xs text-slate-600 mt-1">Select or upload a video in Project Manager</p>
              </div>
            )
          ) : cut.provider === 'youtube' ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${cut.videoUrl?.split('v=')[1]?.split('&')[0] || ''}?enablejsapi=1`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : cut.provider === 'vimeo' ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4">
              <iframe
                src={`https://player.vimeo.com/video/${cut.videoUrl?.split('/').pop() || ''}`}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            /* Standalone SMPTE Timecode Clock Display */
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#0e131d] to-[#080b11] p-8">
              <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Standalone SMPTE Clock</span>
              </div>
              <div className="text-5xl md:text-7xl font-mono font-black text-blue-400 tracking-wider drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
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

          {/* Big Timecode Overlay at Top Right */}
          <div className="absolute top-3 right-3 bg-[#0d121c]/85 backdrop-blur-md border border-[#232d44] px-3 py-1.5 rounded-xl text-blue-400 font-mono text-sm font-bold shadow-lg tracking-wider flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
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

        {/* Transport & Control Bar */}
        <div className="h-12 bg-[#0e131f] border-t border-[#1d2538] px-4 flex items-center justify-between text-slate-300 select-none">
          {/* Left: Play/Pause, Frame Step, Shuttle J/K/L */}
          <div className="flex items-center gap-1.5">
            {/* Step -1 Sec */}
            <button
              onClick={() => stepFrame(-Math.round(project.fps))}
              title="Jump -1 Sec (Shift+Left)"
              className="p-1.5 rounded-lg hover:bg-[#1a2336] hover:text-white transition"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Step -1 Frame */}
            <button
              onClick={() => stepFrame(-1)}
              title="Previous Frame (Left Arrow / J)"
              className="p-1.5 rounded-lg hover:bg-[#1a2336] hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-900/30 active:scale-95"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Step +1 Frame */}
            <button
              onClick={() => stepFrame(1)}
              title="Next Frame (Right Arrow / L)"
              className="p-1.5 rounded-lg hover:bg-[#1a2336] hover:text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Step +1 Sec */}
            <button
              onClick={() => stepFrame(Math.round(project.fps))}
              title="Jump +1 Sec (Shift+Right)"
              className="p-1.5 rounded-lg hover:bg-[#1a2336] hover:text-white transition"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Center: In / Out Point Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkIn}
              className="px-2.5 py-1 rounded-lg bg-[#161f30] hover:bg-[#1f2c45] border border-[#232f48] text-xs font-semibold text-amber-400 transition"
              title="Mark In Point (I)"
            >
              Mark [In]
            </button>
            <button
              onClick={onMarkOut}
              className="px-2.5 py-1 rounded-lg bg-[#161f30] hover:bg-[#1f2c45] border border-[#232f48] text-xs font-semibold text-amber-400 transition"
              title="Mark Out Point (O)"
            >
              Mark [Out]
            </button>
          </div>

          {/* Right: Volume & Fullscreen */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-[#1a2336] hover:text-white transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current?.requestFullscreen) {
                  videoRef.current.requestFullscreen();
                }
              }}
              className="p-1.5 rounded-lg hover:bg-[#1a2336] hover:text-white transition"
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
