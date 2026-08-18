import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Project, Cut, ReviewNote, StudioBranding, supabase, isSupabaseConfigured } from './supabase';

interface MediaDB extends DBSchema {
  branding: {
    key: string;
    value: StudioBranding;
  };
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-date': string };
  };
  cuts: {
    key: string;
    value: Cut;
    indexes: { 'by-project': string };
  };
  notes: {
    key: string;
    value: ReviewNote;
    indexes: { 'by-cut': string };
  };
  videoFiles: {
    key: string; // cutId
    value: { cutId: string; blob: Blob; fileName: string };
  };
  audioFiles: {
    key: string; // noteId
    value: { noteId: string; blob: Blob };
  };
}

const DB_NAME = 'media_dashboard_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MediaDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<MediaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('branding')) {
          db.createObjectStore('branding');
        }
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('by-date', 'createdAt');
        }
        if (!db.objectStoreNames.contains('cuts')) {
          const cutStore = db.createObjectStore('cuts', { keyPath: 'id' });
          cutStore.createIndex('by-project', 'projectId');
        }
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('by-cut', 'cutId');
        }
        if (!db.objectStoreNames.contains('videoFiles')) {
          db.createObjectStore('videoFiles', { keyPath: 'cutId' });
        }
        if (!db.objectStoreNames.contains('audioFiles')) {
          db.createObjectStore('audioFiles', { keyPath: 'noteId' });
        }
      },
    });
  }
  return dbPromise;
}

// ----------------------------------------------------
// BRANDING
// ----------------------------------------------------
export async function getStudioBranding(): Promise<StudioBranding> {
  const defaultBranding: StudioBranding = {
    name: 'Studio',
    tagline: 'Post-Production Suite',
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
  };

  const db = await getDB();
  if (!db) return defaultBranding;

  const local = await db.get('branding', 'current');
  if (local) return local;

  return defaultBranding;
}

export async function saveStudioBranding(branding: StudioBranding): Promise<void> {
  const db = await getDB();
  if (db) {
    await db.put('branding', branding, 'current');
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('studios').upsert({
        id: branding.id || '00000000-0000-0000-0000-000000000001',
        name: branding.name,
        tagline: branding.tagline,
        primary_color: branding.primaryColor,
        secondary_color: branding.secondaryColor,
        logo_url: branding.logoUrl || '',
      });
    } catch (e) {
      console.warn('Supabase sync error (branding):', e);
    }
  }
}

// ----------------------------------------------------
// PROJECTS
// ----------------------------------------------------
export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  if (!db) return [];

  const localProjects = await db.getAll('projects');
  if (localProjects.length > 0) {
    return localProjects.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  // Fallback default initial project
  const initialProject: Project = {
    id: 'proj_default',
    name: 'Commercial Cut 01',
    description: 'Main commercial review cut',
    fps: 25,
    dropFrame: false,
    startTimecode: '01:00:00:00',
    createdAt: new Date().toISOString(),
  };

  const initialCut: Cut = {
    id: 'cut_default',
    projectId: 'proj_default',
    name: 'Cut 1 - Work in Progress',
    provider: 'standalone',
    durationSeconds: 120,
    createdAt: new Date().toISOString(),
  };

  await db.put('projects', initialProject);
  await db.put('cuts', initialCut);

  return [initialProject];
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  if (db) {
    await db.put('projects', project);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('projects').upsert({
        id: project.id,
        name: project.name,
        description: project.description || '',
        fps: project.fps,
        drop_frame: project.dropFrame,
        start_timecode: project.startTimecode,
      });
    } catch (e) {
      console.warn('Supabase sync error (project):', e);
    }
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getDB();
  if (db) {
    await db.delete('projects', projectId);
    // Delete associated cuts and notes
    const cuts = await db.getAllFromIndex('cuts', 'by-project', projectId);
    for (const cut of cuts) {
      await deleteCut(cut.id);
    }
  }
}

// ----------------------------------------------------
// CUTS / VERSIONS
// ----------------------------------------------------
export async function getCutsForProject(projectId: string): Promise<Cut[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAllFromIndex('cuts', 'by-project', projectId);
}

export async function saveCut(cut: Cut): Promise<void> {
  const db = await getDB();
  if (db) {
    await db.put('cuts', cut);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('cuts').upsert({
        id: cut.id,
        project_id: cut.projectId,
        name: cut.name,
        provider: cut.provider,
        video_url: cut.videoUrl || '',
        drive_file_id: cut.driveFileId || '',
        duration_seconds: cut.durationSeconds || 0,
      });
    } catch (e) {
      console.warn('Supabase sync error (cut):', e);
    }
  }
}

export async function deleteCut(cutId: string): Promise<void> {
  const db = await getDB();
  if (db) {
    await db.delete('cuts', cutId);
    await db.delete('videoFiles', cutId);
    const notes = await db.getAllFromIndex('notes', 'by-cut', cutId);
    for (const n of notes) {
      await db.delete('notes', n.id);
      await db.delete('audioFiles', n.id);
    }
  }
}

// ----------------------------------------------------
// VIDEO BLOB CACHE
// ----------------------------------------------------
export async function saveLocalVideoFile(cutId: string, file: File): Promise<string> {
  const db = await getDB();
  if (db) {
    await db.put('videoFiles', { cutId, blob: file, fileName: file.name });
  }
  return URL.createObjectURL(file);
}

export async function getLocalVideoBlobUrl(cutId: string): Promise<string | null> {
  const db = await getDB();
  if (!db) return null;
  const item = await db.get('videoFiles', cutId);
  if (item && item.blob) {
    return URL.createObjectURL(item.blob);
  }
  return null;
}

// ----------------------------------------------------
// REVIEW NOTES
// ----------------------------------------------------
export async function getNotesForCut(cutId: string): Promise<ReviewNote[]> {
  const db = await getDB();
  if (!db) return [];
  const notes = await db.getAllFromIndex('notes', 'by-cut', cutId);
  return notes.sort((a, b) => a.frameNumber - b.frameNumber);
}

export async function saveReviewNote(note: ReviewNote): Promise<void> {
  const db = await getDB();
  if (db) {
    await db.put('notes', note);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('notes').upsert({
        id: note.id,
        cut_id: note.cutId,
        category: note.category,
        preset_label: note.presetLabel,
        text: note.text,
        frame_number: note.frameNumber,
        timecode: note.timecode,
        timecode_out: note.timecodeOut || null,
        frame_out: note.frameOut || null,
        drawing_data: note.drawingData || null,
        still_image_url: note.stillImageUrl || null,
        audio_url: note.audioBlobUrl || null,
        author_name: note.authorName,
        is_resolved: note.isResolved,
      });
    } catch (e) {
      console.warn('Supabase sync error (note):', e);
    }
  }
}

export async function deleteReviewNote(noteId: string): Promise<void> {
  const db = await getDB();
  if (db) {
    await db.delete('notes', noteId);
    await db.delete('audioFiles', noteId);
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('notes').delete().eq('id', noteId);
    } catch (e) {
      console.warn('Supabase sync error (delete note):', e);
    }
  }
}

// ----------------------------------------------------
// VOICE AUDIO COMMENTS CACHE
// ----------------------------------------------------
export async function saveAudioBlob(noteId: string, blob: Blob): Promise<string> {
  const db = await getDB();
  if (db) {
    await db.put('audioFiles', { noteId, blob });
  }
  return URL.createObjectURL(blob);
}

export async function getAudioBlobUrl(noteId: string): Promise<string | null> {
  const db = await getDB();
  if (!db) return null;
  const item = await db.get('audioFiles', noteId);
  if (item && item.blob) {
    return URL.createObjectURL(item.blob);
  }
  return null;
}
