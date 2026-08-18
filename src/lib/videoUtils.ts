/**
 * Video Utilities for PostFlow Studio
 * Robust detection and parsing of Vimeo, YouTube, and direct HTML5/MP4 URLs.
 */

export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

export function getVimeoId(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/(?:\d+\/)?video\/|video\/|)(\d+))/);
  return match ? match[1] : null;
}

export function detectVideoProvider(url?: string | null): 'youtube' | 'vimeo' | 'local' | 'web' {
  if (!url) return 'local';
  if (getYouTubeId(url)) return 'youtube';
  if (getVimeoId(url) || url.includes('vimeo.com')) return 'vimeo';
  if (url.startsWith('blob:') || url.startsWith('data:')) return 'local';
  if (url.startsWith('http://') || url.startsWith('https://')) return 'web';
  return 'local';
}
