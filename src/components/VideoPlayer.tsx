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
  Sliders,
  PenTool,
  X,
  Eye,
  EyeOff,
  Link as LinkIcon,
  ChevronsLeft,
  ChevronsRight,
  SkipBack,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Cut, Project, ReviewNote } from '@/lib/supabase';
import { secondsToDisplayTimecode, timecodeToFrames } from '@/lib/timecode';
import { ColorGradeSettings } from './ColorGradingPanel';
import { detectVideoProvider, getYouTubeId, getVimeoId } from '@/lib/videoUtils';

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
  onPlayStateChange?: (isPlaying: boolean) => void;
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
      onPlayStateChange,
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
    // HTML5 Video Ref
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Vimeo Refs
    const vimeoContainerRef = useRef<HTMLDivElement | null>(null);
    const vimeoPlayerInstanceRef = useRef<any>(null);

    // YouTube Refs
    const youtubeContainerRef = useRef<HTMLDivElement | null>(null);
    const youtubePlayerInstanceRef = useRef<any>(null);
    const youtubeTimerRef = useRef<any>(null);

    // Compare Dual Refs
    const vimeoCompareContainerARef = useRef<HTMLDivElement | null>(null);
    const vimeoCompareContainerBRef = useRef<HTMLDivElement | null>(null);
    const vimeoPlayerARef = useRef<any>(null);
    const vimeoPlayerBRef = useRef<any>(null);
    const youtubeCompareARef = useRef<any>(null);
    const youtubeCompareBRef = useRef<any>(null);
    const html5VideoARef = useRef<HTMLVideoElement | null>(null);
    const html5VideoBRef = useRef<HTMLVideoElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState<number>(cut.durationSeconds || 120);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    const [vimeoPosterDataUrl, setVimeoPosterDataUrl] = useState<string | null>(null);

    // Compare Modes: 'split' | 'wipe' | 'fade' | 'a' | 'b'
    const [compareMode, setCompareMode] = useState<'split' | 'wipe' | 'fade' | 'a' | 'b'>('split');
    const [wipePosition, setWipePosition] = useState<number>(50); // percentage 0 - 100
    const [fadeOpacity, setFadeOpacity] = useState<number>(50); // percentage 0 - 100

    // Drawing Overlay Visibility
    const [showMarkup, setShowMarkup] = useState(true);

    // Detect actual provider for Cut A and Cut B
    const providerA = detectVideoProvider(cut.videoUrl);
    const providerB = detectVideoProvider(cut.videoUrlB);

    const isCutVimeo = providerA === 'vimeo' || cut.provider === 'vimeo';
    const isCutYouTube = providerA === 'youtube' || cut.provider === 'youtube';
    const ytVideoIdA = getYouTubeId(cut.videoUrl);
    const ytVideoIdB = getYouTubeId(cut.videoUrlB);

    // Fetch Vimeo / YouTube High-Res Thumbnail
    useEffect(() => {
      if (isCutVimeo && cut.videoUrl) {
        fetch(`/api/thumbnail?url=${encodeURIComponent(cut.videoUrl)}`)
          .then(res => res.json())
          .then(data => {
            if (data.dataUrl) setVimeoPosterDataUrl(data.dataUrl);
          })
          .catch(() => {});
      } else if (isCutYouTube && ytVideoIdA) {
        setVimeoPosterDataUrl(`https://img.youtube.com/vi/${ytVideoIdA}/maxresdefault.jpg`);
      } else {
        setVimeoPosterDataUrl(null);
      }
    }, [isCutVimeo, isCutYouTube, cut.videoUrl, ytVideoIdA]);

    // Current Playhead Frame calculation
    const startFramesOffset = timecodeToFrames(
      project.startTimecode || '01:00:00:00',
      project.fps,
      project.dropFrame
    );
    const currentAbsoluteFrame = startFramesOffset + Math.round(currentTime * project.fps);

    // Active Note with Drawing strictly within its Frame or In/Out Range or when Selected
    const activeNoteWithMarkup = (() => {
      if (selectedNote && (selectedNote.drawingData || selectedNote.stillImageUrl)) {
        return selectedNote;
      }
      return notes.find(n => {
        if (!n.drawingData && !n.stillImageUrl) return false;
        const startF = timecodeToFrames(n.timecode, project.fps, project.dropFrame);
        const endF = n.timecodeOut
          ? timecodeToFrames(n.timecodeOut, project.fps, project.dropFrame)
          : startF;
        return (
          Math.abs(currentAbsoluteFrame - startF) <= 3 ||
          (currentAbsoluteFrame >= startF && currentAbsoluteFrame <= endF)
        );
      });
    })();

    // Active Note with Color Grade strictly within its Frame or Range
    const activeNoteWithGrade = (() => {
      if (selectedNote?.colorGrade) {
        const sStart = timecodeToFrames(selectedNote.timecode, project.fps, project.dropFrame);
        const sEnd = selectedNote.timecodeOut
          ? timecodeToFrames(selectedNote.timecodeOut, project.fps, project.dropFrame)
          : sStart;
        if (Math.abs(currentAbsoluteFrame - sStart) <= 1 || (currentAbsoluteFrame >= sStart && currentAbsoluteFrame <= sEnd)) {
          return selectedNote;
        }
      }
      return notes.find(n => {
        if (!n.colorGrade) return false;
        const startF = timecodeToFrames(n.timecode, project.fps, project.dropFrame);
        const endF = n.timecodeOut
          ? timecodeToFrames(n.timecodeOut, project.fps, project.dropFrame)
          : startF;
        return currentAbsoluteFrame >= startF && currentAbsoluteFrame <= endF;
      });
    })();

    // Determine active color grade to display
    const effectiveGrade = liveGrade || activeNoteWithGrade?.colorGrade || null;

    // Calculate temperature tint color & CSS filter
    const gradeStyle = effectiveGrade
      ? {
          filter: `brightness(${effectiveGrade.brightness}%) contrast(${effectiveGrade.contrast}%) saturate(${effectiveGrade.saturation}%) hue-rotate(${effectiveGrade.hue || 0}deg)`,
        }
      : {};

    const tempOverlayColor = effectiveGrade
      ? effectiveGrade.temperature > 0
        ? `rgba(255, 140, 0, ${Math.min(0.4, (effectiveGrade.temperature / 100) * 0.45)})`
        : effectiveGrade.temperature < 0
        ? `rgba(0, 150, 255, ${Math.min(0.4, (Math.abs(effectiveGrade.temperature) / 100) * 0.45)})`
        : 'transparent'
      : 'transparent';

    const tintOverlayColor = effectiveGrade
      ? effectiveGrade.tint > 0
        ? `rgba(255, 0, 150, ${Math.min(0.3, (effectiveGrade.tint / 100) * 0.35)})`
        : effectiveGrade.tint < 0
        ? `rgba(0, 255, 100, ${Math.min(0.3, (Math.abs(effectiveGrade.tint) / 100) * 0.35)})`
        : 'transparent'
      : 'transparent';

    // Capture Thumbnail (Safe with CORS / Tainted Canvas handling)
    const captureThumbnail = (): string => {
      try {
        // For YouTube and Vimeo: generate a branded frame thumbnail with timecode
        // (Cross-origin iframes prevent direct canvas capture)
        if ((isCutYouTube || isCutVimeo) && !videoRef.current?.videoWidth) {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          if (!ctx) return '';
          // Dark frame background
          ctx.fillStyle = '#0b0f19';
          ctx.fillRect(0, 0, 640, 360);
          // Gradient bar at bottom
          const grad = ctx.createLinearGradient(0, 300, 0, 360);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0.9)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 300, 640, 60);
          // Timecode text
          const tc = secondsToDisplayTimecode(
            currentTime,
            project.fps,
            project.startTimecode || '01:00:00:00',
            project.dropFrame
          );
          ctx.fillStyle = '#3b82f6';
          ctx.font = 'bold 28px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(tc, 320, 195);
          // Cut name
          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px sans-serif';
          ctx.fillText(cut.name || 'Video', 320, 230);
          // Provider badge
          ctx.fillStyle = isCutYouTube ? '#FF0000' : '#1AB7EA';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(isCutYouTube ? '▶ YouTube' : '▶ Vimeo', 16, 345);
          return canvas.toDataURL('image/jpeg', 0.88);
        }

        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        if (videoRef.current && videoRef.current.videoWidth > 0) {
          try {
            ctx.drawImage(videoRef.current, 0, 0, 640, 360);
            return canvas.toDataURL('image/jpeg', 0.88);
          } catch (taintErr) {
            // Video is cross-origin and tainted canvas. Generate a clean dark slate fallback.
            const cleanCanvas = document.createElement('canvas');
            cleanCanvas.width = 640;
            cleanCanvas.height = 360;
            const cleanCtx = cleanCanvas.getContext('2d');
            if (cleanCtx) {
              cleanCtx.fillStyle = '#0b0f19';
              cleanCtx.fillRect(0, 0, 640, 360);
              cleanCtx.fillStyle = '#3b82f6';
              cleanCtx.font = 'bold 20px monospace';
              cleanCtx.fillText(cut.name || 'Video Cut', 30, 180);
              return cleanCanvas.toDataURL('image/jpeg', 0.88);
            }
            return '';
          }
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 640, 360);
          return canvas.toDataURL('image/jpeg', 0.88);
        }
      } catch (err) {
        console.warn('captureThumbnail caught error:', err);
        return '';
      }
    };

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        const effectiveMax = duration && duration > 0 ? duration : 3600;
        const clamped = Math.max(0, Math.min(seconds, effectiveMax));
        setCurrentTime(clamped);
        onTimeUpdate(clamped);

        if (cut.provider === 'local' || cut.provider === 'drive' || providerA === 'web') {
          if (videoRef.current) videoRef.current.currentTime = clamped;
        } else if (isCutVimeo && vimeoPlayerInstanceRef.current) {
          try {
            vimeoPlayerInstanceRef.current.setCurrentTime(clamped).catch(() => {});
          } catch (e) {}
        } else if (isCutYouTube && youtubePlayerInstanceRef.current?.seekTo) {
          try {
            youtubePlayerInstanceRef.current.seekTo(clamped, true);
          } catch (e) {}
        } else if (cut.provider === 'compare') {
          try {
            vimeoPlayerARef.current?.setCurrentTime(clamped).catch(() => {});
            vimeoPlayerBRef.current?.setCurrentTime(clamped).catch(() => {});
            youtubeCompareARef.current?.seekTo?.(clamped, true);
            youtubeCompareBRef.current?.seekTo?.(clamped, true);
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
        pausePlayback();
      },
      play: () => {
        startPlayback();
      },
      togglePlay: () => {
        togglePlayback();
      },
    }));

    // Start playback helper
    const startPlayback = () => {
      if (cut.provider === 'local' || cut.provider === 'drive' || providerA === 'web') {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      } else if (isCutVimeo && vimeoPlayerInstanceRef.current) {
        try {
          vimeoPlayerInstanceRef.current.play().catch(() => {});
        } catch (e) {}
      } else if (isCutYouTube && youtubePlayerInstanceRef.current?.playVideo) {
        try {
          youtubePlayerInstanceRef.current.playVideo();
        } catch (e) {}
      } else if (cut.provider === 'compare') {
        try {
          vimeoPlayerARef.current?.play().catch(() => {});
          vimeoPlayerBRef.current?.play().catch(() => {});
          youtubeCompareARef.current?.playVideo?.();
          youtubeCompareBRef.current?.playVideo?.();
          html5VideoARef.current?.play().catch(() => {});
          html5VideoBRef.current?.play().catch(() => {});
        } catch (e) {}
      }
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };

    // Pause playback helper
    const pausePlayback = () => {
      if (cut.provider === 'local' || cut.provider === 'drive' || providerA === 'web') {
        if (videoRef.current) videoRef.current.pause();
      } else if (isCutVimeo && vimeoPlayerInstanceRef.current) {
        try {
          vimeoPlayerInstanceRef.current.pause().catch(() => {});
        } catch (e) {}
      } else if (isCutYouTube && youtubePlayerInstanceRef.current?.pauseVideo) {
        try {
          youtubePlayerInstanceRef.current.pauseVideo();
        } catch (e) {}
      } else if (cut.provider === 'compare') {
        try {
          vimeoPlayerARef.current?.pause().catch(() => {});
          vimeoPlayerBRef.current?.pause().catch(() => {});
          youtubeCompareARef.current?.pauseVideo?.();
          youtubeCompareBRef.current?.pauseVideo?.();
          html5VideoARef.current?.pause();
          html5VideoBRef.current?.pause();
        } catch (e) {}
      }
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    // Master Play/Pause Toggle
    const togglePlayback = () => {
      if (isPlaying) {
        pausePlayback();
      } else {
        startPlayback();
      }
    };

    // Step by Delta Seconds
    const stepDelta = (deltaSec: number) => {
      const targetTime = Math.max(0, Math.min(currentTime + deltaSec, duration || 1000));
      setCurrentTime(targetTime);
      onTimeUpdate(targetTime);

      if (cut.provider === 'local' || cut.provider === 'drive' || providerA === 'web') {
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
          videoRef.current.currentTime = targetTime;
        }
      } else if (isCutVimeo && vimeoPlayerInstanceRef.current) {
        try {
          vimeoPlayerInstanceRef.current.pause().catch(() => {});
          setIsPlaying(false);
          vimeoPlayerInstanceRef.current.setCurrentTime(targetTime).catch(() => {});
        } catch (e) {}
      } else if (isCutYouTube && youtubePlayerInstanceRef.current?.seekTo) {
        try {
          youtubePlayerInstanceRef.current.pauseVideo();
          setIsPlaying(false);
          youtubePlayerInstanceRef.current.seekTo(targetTime, true);
        } catch (e) {}
      } else if (cut.provider === 'compare') {
        try {
          vimeoPlayerARef.current?.pause().catch(() => {});
          vimeoPlayerBRef.current?.pause().catch(() => {});
          youtubeCompareARef.current?.pauseVideo?.();
          youtubeCompareBRef.current?.pauseVideo?.();
          html5VideoARef.current?.pause();
          html5VideoBRef.current?.pause();
          setIsPlaying(false);
          vimeoPlayerARef.current?.setCurrentTime(targetTime).catch(() => {});
          vimeoPlayerBRef.current?.setCurrentTime(targetTime).catch(() => {});
          youtubeCompareARef.current?.seekTo?.(targetTime, true);
          youtubeCompareBRef.current?.seekTo?.(targetTime, true);
          if (html5VideoARef.current) html5VideoARef.current.currentTime = targetTime;
          if (html5VideoBRef.current) html5VideoBRef.current.currentTime = targetTime;
        } catch (e) {}
      }
    };

    // Volume & Mute
    const handleVolumeChange = (newVol: number) => {
      setVolume(newVol);
      setIsMuted(newVol === 0);
      if (videoRef.current) {
        videoRef.current.volume = newVol;
        videoRef.current.muted = newVol === 0;
      }
      if (html5VideoARef.current) {
        html5VideoARef.current.volume = newVol;
        html5VideoARef.current.muted = newVol === 0;
      }
      if (html5VideoBRef.current) {
        html5VideoBRef.current.volume = 0;
        html5VideoBRef.current.muted = true;
      }
      if (vimeoPlayerInstanceRef.current) {
        try {
          vimeoPlayerInstanceRef.current.setVolume(newVol).catch(() => {});
        } catch (e) {}
      }
      if (youtubePlayerInstanceRef.current?.setVolume) {
        try {
          if (newVol === 0) youtubePlayerInstanceRef.current.mute();
          else {
            youtubePlayerInstanceRef.current.unMute();
            youtubePlayerInstanceRef.current.setVolume(newVol * 100);
          }
        } catch (e) {}
      }
      if (vimeoPlayerARef.current) {
        try {
          vimeoPlayerARef.current.setVolume(newVol).catch(() => {});
        } catch (e) {}
      }
      if (vimeoPlayerBRef.current) {
        try {
          vimeoPlayerBRef.current.setVolume(0).catch(() => {});
        } catch (e) {}
      }
    };

    const toggleMute = () => {
      if (isMuted) {
        handleVolumeChange(volume || 1);
      } else {
        handleVolumeChange(0);
      }
    };

    // ----------------------------------------------------
    // YOUTUBE PLAYER INITIALIZATION
    // ----------------------------------------------------
    useEffect(() => {
      if (isCutYouTube && ytVideoIdA && youtubeContainerRef.current) {
        let isMounted = true;

        const loadYT = () => {
          return new Promise<void>(resolve => {
            if ((window as any).YT && (window as any).YT.Player) {
              resolve();
              return;
            }
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            tag.async = true;
            (window as any).onYouTubeIframeAPIReady = () => resolve();
            document.body.appendChild(tag);
          });
        };

        loadYT().then(() => {
          if (!isMounted || !youtubeContainerRef.current) return;
          youtubeContainerRef.current.innerHTML = '';
          const playerDiv = document.createElement('div');
          youtubeContainerRef.current.appendChild(playerDiv);

          const YT = (window as any).YT;
          const player = new YT.Player(playerDiv, {
            videoId: ytVideoIdA,
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              enablejsapi: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
            },
            events: {
              onReady: () => {
                if (!isMounted) return;
                const grabDuration = () => {
                  try {
                    const d = player.getDuration?.();
                    if (d && d > 0) {
                      setDuration(d);
                      onDurationChange(d);
                      return true;
                    }
                  } catch (e) {}
                  return false;
                };
                if (!grabDuration()) {
                  const durInterval = setInterval(() => {
                    if (grabDuration()) clearInterval(durInterval);
                  }, 200);
                  setTimeout(() => clearInterval(durInterval), 5000);
                }
              },
              onStateChange: (event: any) => {
                if (!isMounted) return;
                if (event.data === YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                  if (youtubeTimerRef.current) clearInterval(youtubeTimerRef.current);
                  youtubeTimerRef.current = setInterval(() => {
                    if (player.getCurrentTime) {
                      const t = player.getCurrentTime();
                      setCurrentTime(t);
                      onTimeUpdate(t);
                    }
                  }, 100);
                } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                  setIsPlaying(false);
                  if (youtubeTimerRef.current) clearInterval(youtubeTimerRef.current);
                }
              },
            },
          });
          youtubePlayerInstanceRef.current = player;
        });

        return () => {
          isMounted = false;
          if (youtubeTimerRef.current) clearInterval(youtubeTimerRef.current);
          try {
            youtubePlayerInstanceRef.current?.destroy();
          } catch (e) {}
        };
      }
    }, [isCutYouTube, ytVideoIdA]);

    // ----------------------------------------------------
    // VIMEO PLAYER INITIALIZATION
    // ----------------------------------------------------
    useEffect(() => {
      if (isCutVimeo && cut.videoUrl && vimeoContainerRef.current) {
        let isMounted = true;
        const loadScript = () => {
          return new Promise<void>((resolve, reject) => {
            if ((window as any).Vimeo) {
              resolve();
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://player.vimeo.com/api/player.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Vimeo SDK'));
            document.body.appendChild(script);
          });
        };

        loadScript()
          .then(() => {
            if (!isMounted || !vimeoContainerRef.current) return;
            vimeoContainerRef.current.innerHTML = '';
            const Vimeo = (window as any).Vimeo;
            const player = new Vimeo.Player(vimeoContainerRef.current, {
              url: cut.videoUrl,
              responsive: true,
              controls: false,
              dnt: true,
            });
            vimeoPlayerInstanceRef.current = player;

            player.ready().then(async () => {
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
    }, [isCutVimeo, cut.videoUrl]);

    // ----------------------------------------------------
    // COMPARE MODE INITIALIZATION
    // ----------------------------------------------------
    useEffect(() => {
      if (cut.provider === 'compare') {
        let isMounted = true;

        if (providerA === 'vimeo' && cut.videoUrl && vimeoCompareContainerARef.current) {
          const Vimeo = (window as any).Vimeo;
          if (Vimeo) {
            vimeoCompareContainerARef.current.innerHTML = '';
            const pA = new Vimeo.Player(vimeoCompareContainerARef.current, {
              url: cut.videoUrl,
              responsive: true,
              controls: false,
              dnt: true,
            });
            vimeoPlayerARef.current = pA;
            pA.ready().then(async () => {
              const d = await pA.getDuration();
              if (isMounted && d > 0) {
                setDuration(d);
                onDurationChange(d);
              }
            });
            pA.on('timeupdate', (data: any) => {
              if (isMounted) {
                setCurrentTime(data.seconds);
                onTimeUpdate(data.seconds);
              }
            });
          }
        }

        if (providerB === 'vimeo' && cut.videoUrlB && vimeoCompareContainerBRef.current) {
          const Vimeo = (window as any).Vimeo;
          if (Vimeo) {
            vimeoCompareContainerBRef.current.innerHTML = '';
            const pB = new Vimeo.Player(vimeoCompareContainerBRef.current, {
              url: cut.videoUrlB,
              responsive: true,
              controls: false,
              dnt: true,
              muted: true,
            });
            vimeoPlayerBRef.current = pB;
          }
        }

        return () => {
          isMounted = false;
          try {
            vimeoPlayerARef.current?.destroy().catch(() => {});
            vimeoPlayerBRef.current?.destroy().catch(() => {});
          } catch (e) {}
        };
      }
    }, [cut.provider, cut.videoUrl, cut.videoUrlB, providerA, providerB]);

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

    // Synchronize HTML5 Compare Video A & B
    const handleCompareATimeUpdate = () => {
      if (html5VideoARef.current) {
        const t = html5VideoARef.current.currentTime;
        setCurrentTime(t);
        onTimeUpdate(t);
        if (html5VideoBRef.current && Math.abs(html5VideoBRef.current.currentTime - t) > 0.25) {
          html5VideoBRef.current.currentTime = t;
        }
      }
    };

    const handleCompareALoadedMetadata = () => {
      if (html5VideoARef.current) {
        const d = html5VideoARef.current.duration || 0;
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

    const videoSrc =
      cut.provider === 'local'
        ? localVideoUrl || cut.videoUrl || ''
        : cut.provider === 'drive'
        ? `/api/video/${cut.driveFileId}`
        : providerA === 'web'
        ? cut.videoUrl
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

        {/* MAIN VIDEO DISPLAY AREA (With Live Color Grade Filter & Tint Overlays) */}
        <div
          style={gradeStyle}
          className="relative flex-1 min-h-[220px] bg-black flex items-center justify-center overflow-hidden select-none transition-all duration-150"
        >
          {/* Temperature & Tint Color Grading Color Washes */}
          {tempOverlayColor !== 'transparent' && (
            <div
              className="absolute inset-0 pointer-events-none z-10 mix-blend-color transition-colors duration-150"
              style={{ backgroundColor: tempOverlayColor }}
            />
          )}
          {tintOverlayColor !== 'transparent' && (
            <div
              className="absolute inset-0 pointer-events-none z-10 mix-blend-color transition-colors duration-150"
              style={{ backgroundColor: tintOverlayColor }}
            />
          )}

          {/* 1. COMPARE MODE */}
          {cut.provider === 'compare' ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
              {/* Compare Mode Switcher & Controls Overlay */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#0c1018]/90 backdrop-blur-md border border-[#232d44] p-1 rounded-xl flex items-center gap-1.5 z-30 shadow-2xl">
                {(['split', 'wipe', 'fade', 'a', 'b'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCompareMode(m)}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                      compareMode === m
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
                        : 'text-slate-400 hover:text-white hover:bg-[#182030]'
                    }`}
                  >
                    {m}
                  </button>
                ))}

                {/* Wipe Position Slider */}
                {compareMode === 'wipe' && (
                  <div className="flex items-center gap-1.5 pl-2 border-l border-[#232d44]">
                    <span className="text-[9px] font-mono text-purple-300">Wipe:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={wipePosition}
                      onChange={e => setWipePosition(Number(e.target.value))}
                      className="w-20 accent-purple-500 cursor-pointer h-1.5"
                    />
                    <span className="text-[9px] font-mono text-slate-400">{wipePosition}%</span>
                  </div>
                )}

                {/* Fade Opacity Slider */}
                {compareMode === 'fade' && (
                  <div className="flex items-center gap-1.5 pl-2 border-l border-[#232d44]">
                    <span className="text-[9px] font-mono text-purple-300">Fade (B):</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={fadeOpacity}
                      onChange={e => setFadeOpacity(Number(e.target.value))}
                      className="w-20 accent-purple-500 cursor-pointer h-1.5"
                    />
                    <span className="text-[9px] font-mono text-slate-400">{fadeOpacity}%</span>
                  </div>
                )}
              </div>

              {/* SPLIT MODE */}
              {compareMode === 'split' && (
                <div className="w-full h-full flex">
                  <div className="w-1/2 h-full relative border-r border-slate-700 bg-black flex items-center justify-center">
                    <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-blue-600/80 text-[9px] font-bold text-white uppercase">
                      Clip A
                    </span>
                    {providerA === 'vimeo' ? (
                      <div ref={vimeoCompareContainerARef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video
                        ref={html5VideoARef}
                        src={cut.videoUrl}
                        playsInline
                        onTimeUpdate={handleCompareATimeUpdate}
                        onLoadedMetadata={handleCompareALoadedMetadata}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <div className="w-1/2 h-full relative bg-black flex items-center justify-center">
                    <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-purple-600/80 text-[9px] font-bold text-white uppercase">
                      Clip B
                    </span>
                    {providerB === 'vimeo' ? (
                      <div ref={vimeoCompareContainerBRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video
                        ref={html5VideoBRef}
                        src={cut.videoUrlB}
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* WIPE MODE */}
              {compareMode === 'wipe' && (
                <div className="w-full h-full relative">
                  <div className="absolute inset-0 w-full h-full">
                    {providerB === 'vimeo' ? (
                      <div ref={vimeoCompareContainerBRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoBRef} src={cut.videoUrlB} playsInline muted className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{ clipPath: `inset(0 ${100 - wipePosition}% 0 0)` }}
                  >
                    {providerA === 'vimeo' ? (
                      <div ref={vimeoCompareContainerARef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video
                        ref={html5VideoARef}
                        src={cut.videoUrl}
                        playsInline
                        onTimeUpdate={handleCompareATimeUpdate}
                        onLoadedMetadata={handleCompareALoadedMetadata}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)] z-20 cursor-ew-resize flex items-center justify-center"
                    style={{ left: `${wipePosition}%` }}
                  >
                    <div className="w-5 h-5 rounded-full bg-purple-600 border-2 border-white shadow flex items-center justify-center text-[8px] text-white font-bold">
                      ↔
                    </div>
                  </div>
                </div>
              )}

              {/* FADE MODE */}
              {compareMode === 'fade' && (
                <div className="w-full h-full relative">
                  <div className="absolute inset-0 w-full h-full">
                    {providerA === 'vimeo' ? (
                      <div ref={vimeoCompareContainerARef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video
                        ref={html5VideoARef}
                        src={cut.videoUrl}
                        playsInline
                        onTimeUpdate={handleCompareATimeUpdate}
                        onLoadedMetadata={handleCompareALoadedMetadata}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <div
                    className="absolute inset-0 w-full h-full pointer-events-none transition-opacity"
                    style={{ opacity: fadeOpacity / 100 }}
                  >
                    {providerB === 'vimeo' ? (
                      <div ref={vimeoCompareContainerBRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                    ) : (
                      <video ref={html5VideoBRef} src={cut.videoUrlB} playsInline muted className="w-full h-full object-contain" />
                    )}
                  </div>
                </div>
              )}

              {/* A ONLY MODE */}
              {compareMode === 'a' && (
                <div className="w-full h-full relative">
                  <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-blue-600/80 text-[9px] font-bold text-white uppercase">
                    Clip A (Primary)
                  </span>
                  {providerA === 'vimeo' ? (
                    <div ref={vimeoCompareContainerARef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                  ) : (
                    <video
                      ref={html5VideoARef}
                      src={cut.videoUrl}
                      playsInline
                      onTimeUpdate={handleCompareATimeUpdate}
                      onLoadedMetadata={handleCompareALoadedMetadata}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              )}

              {/* B ONLY MODE */}
              {compareMode === 'b' && (
                <div className="w-full h-full relative">
                  <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-purple-600/80 text-[9px] font-bold text-white uppercase">
                    Clip B (Compare)
                  </span>
                  {providerB === 'vimeo' ? (
                    <div ref={vimeoCompareContainerBRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
                  ) : (
                    <video ref={html5VideoBRef} src={cut.videoUrlB} playsInline muted className="w-full h-full object-contain" />
                  )}
                </div>
              )}
            </div>
          ) : isCutYouTube ? (
            /* 2. YOUTUBE PLAYER */
            <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
              <div ref={youtubeContainerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
              {/* Immediate High-Res Poster Backdrop before first play */}
              {!isPlaying && currentTime === 0 && vimeoPosterDataUrl && (
                <img
                  src={vimeoPosterDataUrl}
                  alt="YouTube Preview"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
                />
              )}
              <div onClick={togglePlayback} className="absolute inset-0 cursor-pointer bg-transparent z-15" />
            </div>
          ) : isCutVimeo ? (
            /* 3. VIMEO PLAYER */
            <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
              <div ref={vimeoContainerRef} className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
              {!isPlaying && currentTime === 0 && vimeoPosterDataUrl && (
                <img
                  src={vimeoPosterDataUrl}
                  alt="Vimeo Preview"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
                />
              )}
              <div onClick={togglePlayback} className="absolute inset-0 cursor-pointer bg-transparent z-15" />
            </div>
          ) : (
            /* 4. HTML5 / LOCAL / DIRECT MP4 PLAYER */
            videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                crossOrigin="anonymous"
                preload="auto"
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
          )}

          {/* On-Screen Drawing / Plate Markup / Still Overlay */}
          {activeNoteWithMarkup && showMarkup && (
            <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
              {activeNoteWithMarkup.drawingData ? (
                <img
                  src={activeNoteWithMarkup.drawingData}
                  alt="Markup"
                  className="w-full h-full object-contain"
                />
              ) : activeNoteWithMarkup.stillImageUrl ? (
                <img
                  src={activeNoteWithMarkup.stillImageUrl}
                  alt="Frame Still"
                  className="w-full h-full object-contain"
                />
              ) : null}
            </div>
          )}

          {/* Markup Visibility Toggle Button in Video Corner */}
          {activeNoteWithMarkup && (activeNoteWithMarkup.drawingData || activeNoteWithMarkup.stillImageUrl) && (
            <button
              type="button"
              onClick={() => setShowMarkup(!showMarkup)}
              className="absolute top-2 right-2 z-30 px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1.5 shadow-xl hover:bg-black transition active:scale-95 pointer-events-auto"
              title="Toggle Markup Visibility"
            >
              {showMarkup ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showMarkup ? 'Drawing ON' : 'Drawing OFF'}</span>
            </button>
          )}

          {/* Active Color Grade Badge in Corner if Active on Frame */}
          {effectiveGrade && (
            <div className="absolute top-2 left-2 z-30 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-purple-500/40 text-purple-300 text-[9px] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Grade: {effectiveGrade.preset !== 'none' ? effectiveGrade.preset : 'Live Color Correction'}</span>
            </div>
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
