'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ReviewNote, Project } from '@/lib/supabase';
import { secondsToDisplayTimecode, timecodeToFrames, framesToSeconds } from '@/lib/timecode';

interface TimelineScrubberProps {
  currentTime: number;
  duration: number;
  project: Project;
  notes: ReviewNote[];
  inTime: number | null;
  outTime: number | null;
  onSeek: (time: number) => void;
  onSelectNote: (note: ReviewNote) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentTime,
  duration,
  project,
  notes,
  inTime,
  outTime,
  onSeek,
  onSelectNote,
}) => {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const safeDuration = duration > 0 ? duration : 120;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  const getTimeFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    return percent * safeDuration;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const t = getTimeFromEvent(e);
    onSeek(t);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const t = getTimeFromEvent(e);
        onSeek(t);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, safeDuration]);

  const handleMouseMoveHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    setHoverPos(x);
    setHoverTime(percent * safeDuration);
  };

  // In/Out region calculations
  const inPercent = inTime !== null ? (inTime / safeDuration) * 100 : null;
  const outPercent = outTime !== null ? (outTime / safeDuration) * 100 : null;

  return (
    <div className="relative w-full py-2 select-none">
      {/* Timeline track */}
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveHover}
        onMouseLeave={() => setHoverTime(null)}
        className="h-9 bg-[#0b0e16] border border-[#1e273b] hover:border-[#2b3752] rounded-xl relative cursor-pointer group flex items-center overflow-hidden transition"
      >
        {/* Timeline tick grid */}
        <div className="absolute inset-0 flex justify-between px-3 pointer-events-none opacity-25">
          {[...Array(30)].map((_, i) => (
            <div key={i} className={`w-[1px] h-full ${i % 5 === 0 ? 'bg-slate-400' : 'bg-slate-700'}`} />
          ))}
        </div>

        {/* Selected In/Out region */}
        {inPercent !== null && outPercent !== null && outPercent > inPercent && (
          <div
            className="absolute top-0 bottom-0 bg-blue-500/25 border-x-2 border-blue-400 pointer-events-none z-10"
            style={{
              left: `${inPercent}%`,
              width: `${outPercent - inPercent}%`,
            }}
          />
        )}

        {/* Playhead Progress Fill */}
        <div
          className="h-full bg-blue-600/30 border-r-2 border-blue-400 pointer-events-none transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Note Markers Pins */}
        {notes.map(note => {
          const noteFrames = timecodeToFrames(note.timecode, project.fps, project.dropFrame);
          const startFrames = timecodeToFrames(
            project.startTimecode || '01:00:00:00',
            project.fps,
            project.dropFrame
          );
          const relativeSeconds = framesToSeconds(Math.max(0, noteFrames - startFrames), project.fps);
          const pinPercent = Math.min(100, Math.max(0, (relativeSeconds / safeDuration) * 100));

          const pinColor =
            note.category === 'editorial'
              ? '#3b82f6'
              : note.category === 'vfx'
              ? '#a855f7'
              : note.category === 'color'
              ? '#f97316'
              : '#10b981';

          return (
            <div
              key={note.id}
              onClick={e => {
                e.stopPropagation();
                onSeek(relativeSeconds);
                onSelectNote(note);
              }}
              style={{ left: `${pinPercent}%` }}
              className="absolute top-1 bottom-1 w-2 -ml-1 rounded-sm z-20 hover:scale-150 transition-transform flex items-center justify-center group/pin"
            >
              <div
                className="w-1.5 h-full rounded-full shadow-lg"
                style={{ backgroundColor: pinColor }}
              />
              {/* Pin Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover/pin:block bg-[#0e1420] border border-[#232d44] text-[10px] text-white px-2 py-1 rounded shadow-2xl whitespace-nowrap z-40 font-mono">
                <span className="font-bold text-blue-400">{note.timecode}</span> - {note.presetLabel}
              </div>
            </div>
          );
        })}

        {/* Playhead Indicator Line & Thumb */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-30 shadow-[0_0_10px_rgba(255,255,255,1)]"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="w-3 h-3 bg-white -ml-1.5 -top-1 absolute rounded-full shadow-xl" />
        </div>
      </div>

      {/* Hover Timecode Tooltip */}
      {hoverTime !== null && !isDragging && (
        <div
          className="absolute top-full mt-1 bg-[#141b29] border border-[#24314c] text-white text-[11px] font-mono px-2 py-0.5 rounded shadow-xl pointer-events-none z-40"
          style={{ left: `${hoverPos}px`, transform: 'translateX(-50%)' }}
        >
          {secondsToDisplayTimecode(hoverTime, project.fps, project.startTimecode, project.dropFrame)}
        </div>
      )}
    </div>
  );
};
