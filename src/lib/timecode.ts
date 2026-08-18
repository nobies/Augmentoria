/**
 * SMPTE Timecode Engine
 * Supports standard frame rates: 23.976, 24, 25, 29.97 (DF/NDF), 30, 50, 59.94 (DF/NDF), 60 fps
 */

export interface TimecodeConfig {
  fps: number;
  dropFrame?: boolean;
  startTc?: string; // e.g. "01:00:00:00"
}

export const STANDARD_FPS_LIST = [
  { value: 23.976, label: '23.976 fps' },
  { value: 24, label: '24 fps' },
  { value: 25, label: '25 fps (PAL)' },
  { value: 29.97, label: '29.97 fps (NTSC)' },
  { value: 30, label: '30 fps' },
  { value: 50, label: '50 fps' },
  { value: 59.94, label: '59.94 fps' },
  { value: 60, label: '60 fps' },
];

/**
 * Convert seconds to total frames based on framerate
 */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(0, Math.floor(seconds * fps));
}

/**
 * Convert frames to seconds
 */
export function framesToSeconds(frames: number, fps: number): number {
  return Math.max(0, frames / fps);
}

/**
 * Parse timecode string "HH:MM:SS:FF" or "HH:MM:SS;FF" to total frame count
 */
export function timecodeToFrames(tc: string, fps: number, dropFrame = false): number {
  const clean = tc.trim();
  const parts = clean.split(/[:;]/).map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) {
    return 0;
  }
  const [hh, mm, ss, ff] = parts;
  const nominalFps = Math.round(fps);

  if (dropFrame && (nominalFps === 30 || nominalFps === 60)) {
    const dropFrames = nominalFps === 30 ? 2 : 4;
    const totalMinutes = hh * 60 + mm;
    const dropped = dropFrames * (totalMinutes - Math.floor(totalMinutes / 10));
    return (hh * 3600 + mm * 60 + ss) * nominalFps + ff - dropped;
  }

  return (hh * 3600 + mm * 60 + ss) * nominalFps + ff;
}

/**
 * Convert frame count to formatted SMPTE Timecode string "HH:MM:SS:FF"
 */
export function framesToTimecode(totalFrames: number, fps: number, dropFrame = false): string {
  let frames = Math.max(0, Math.floor(totalFrames));
  const nominalFps = Math.round(fps);
  const sep = dropFrame ? ';' : ':';

  if (dropFrame && (nominalFps === 30 || nominalFps === 60)) {
    const dropFrames = nominalFps === 30 ? 2 : 4;
    const framesPer10Min = Math.round(nominalFps * 600 - dropFrames * 9);
    const framesPerMin = Math.round(nominalFps * 60 - dropFrames);

    const d = Math.floor(frames / framesPer10Min);
    const m = frames % framesPer10Min;

    if (m > dropFrames) {
      frames += dropFrames * 9 * d + dropFrames * Math.floor((m - dropFrames) / framesPerMin);
    } else {
      frames += dropFrames * 9 * d;
    }
  }

  const ff = frames % nominalFps;
  const ss = Math.floor(frames / nominalFps) % 60;
  const mm = Math.floor(frames / (nominalFps * 60)) % 60;
  const hh = Math.floor(frames / (nominalFps * 3600));

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}${sep}${pad(ff)}`;
}

/**
 * Format seconds to displayed timecode string relative to start timecode
 */
export function secondsToDisplayTimecode(
  seconds: number,
  fps: number,
  startTc = '01:00:00:00',
  dropFrame = false
): string {
  const startFrames = timecodeToFrames(startTc, fps, dropFrame);
  const relativeFrames = secondsToFrames(seconds, fps);
  const totalFrames = startFrames + relativeFrames;
  return framesToTimecode(totalFrames, fps, dropFrame);
}

/**
 * Format seconds to simple duration string "MM:SS" or "HH:MM:SS"
 */
export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}
