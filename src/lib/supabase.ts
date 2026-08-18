import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface StudioBranding {
  id?: string;
  name: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  logoUrlDark?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  fps: number;
  dropFrame: boolean;
  startTimecode: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cut {
  id: string;
  projectId: string;
  name: string;
  provider: 'local' | 'drive' | 'youtube' | 'vimeo' | 'standalone' | 'compare';
  videoUrl?: string;
  videoUrlB?: string;
  driveFileId?: string;
  durationSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewNote {
  id: string;
  cutId: string;
  category: 'editorial' | 'vfx' | 'color' | 'sound' | 'general';
  presetLabel: string;
  text: string;
  frameNumber: number;
  timecode: string;
  timecodeOut?: string;
  frameOut?: number;
  drawingData?: string; // base64 / vector paths
  stillImageUrl?: string;
  audioBlobUrl?: string; // local or cloud audio URL
  authorName: string;
  isResolved: boolean;
  createdAt?: string;
}
