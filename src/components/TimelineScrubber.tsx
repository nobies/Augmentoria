'use client';

import React, { useRef, useState } from 'react';
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

  const safeDuration = duration > 0 ? duration : 100;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    setHoverPos(x);
    setHoverTime(percent * safeDuration);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    onSeek(percent * safeDuration);
  };

  // Compute In/Out positions
  const inPercent = inTime !== null ? (inTime / safeDuration) * 100 : null;
  const outPercent = outTime !== null ? (outTime / safeDuration) * 100 : null;

  return (
    <div className="relative w-full py-3 select-none">
      {/* Timeline track container */}
      <div
        ref={barRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="h-8 bg-[#0b0e16] border border-[#1e273b] rounded-xl relative cursor-pointer group flex items-center overflow-hidden"
      >
        {/* Sub-grid timeline ticks */}
        <div className="absolute inset-0 flex justify-between px-2 pointer-events-none opacity-20">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-[1px] h-full bg-slate-400" />
          ))}
        </div>

        {/* In/Out selected region background */}
        {inPercent !== null && outPercent !== null && outPercent > inPercent && (
          <div
            className="absolute top-0 bottom-0 bg-blue-500/20 border-x border-blue-400/50 pointer-events-none"
            style={{
              left: `${inPercent}%`,
              width: `${outPercent - inPercent}%`,
            }}
          />
        )}

        {/* Progress Fill Bar */}
        <div
          className="h-full bg-blue-600/30 border-r-2 border-blue-400 pointer-events-none transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Note Markers Pins */}
        {notes.map(note => {
          // Convert note frame/timecode to seconds
          const noteFrames = timecodeToFrames(note.timecode, project.fps, project.dropFrame);
          const startFrames = timecodeToFrames(project.startTimecode || '01:00:00:00', project.fps, project.dropFrame);
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
              className="absolute top-1 bottom-1 w-2 -ml-1 rounded-sm z-10 hover:scale-125 transition-transform flex items-center justify-center group/pin"
            >
              <div
                className="w-1.5 h-full rounded-full shadow"
                style={{ backgroundColor: pinColor }}
              />
              {/* Pin tooltip */}
              <div className="absolute bottom-full mb-1.5 hidden group-hover/pin:block bg-[#111723] border border-[#232d44] text-[10px] text-white px-2 py-1 rounded shadow-xl whitespace-nowrap z-30 font-mono">
                <span className="font-bold">{note.timecode}</span> - {note.presetLabel}
              </div>
            </div>
          );
        })}

        {/* Playhead Cursor */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="w-2.5 h-2.5 bg-white -ml-1 -top-1 absolute rounded-full shadow" />
        </div>
      </div>

      {/* Hover preview tooltip */}
      {hoverTime !== null && (
        <div
          className="absolute top-full mt-1 bg-[#161f30] border border-[#24314c] text-white text-[11px] font-mono px-2 py-0.5 rounded shadow-xl pointer-events-none z-30"
          style={{ left: `${hoverPos}px`, transform: 'translateX(-50%)' }}
        >
          {secondsToDisplayTimecode(hoverTime, project.fps, project.startTimecode, project.dropFrame)}
        </div>
      )}
    </div>
  );
};
