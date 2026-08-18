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

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('studios').select('*').limit(1).single();
      if (data && !error) {
        const cloudBranding: StudioBranding = {
          id: data.id,
          name: data.name || 'Studio',
          tagline: data.tagline || 'Post-Production Suite',
          primaryColor: data.primary_color || '#3b82f6',
          secondaryColor: data.secondary_color || '#10b981',
          logoUrl: data.logo_url,
          logoUrlDark: data.logo_url_dark,
        };
        const db = await getDB();
        if (db) await db.put('branding', cloudBranding, 'current');
        return cloudBranding;
      }
    } catch (e) {
      console.warn('Supabase fetch error (branding):', e);
    }
  }

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
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error && data.length > 0) {
        const cloudProjects: Project[] = data.map(d => ({
          id: d.id,
          name: d.name,
          description: d.description,
          fps: Number(d.fps) || 25,
          dropFrame: Boolean(d.drop_frame),
          startTimecode: d.start_timecode || '01:00:00:00',
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const db = await getDB();
        if (db) {
          for (const p of cloudProjects) {
            await db.put('projects', p);
          }
        }
        return cloudProjects;
      }
    } catch (e) {
      console.warn('Supabase fetch error (projects):', e);
    }
  }

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

  if (isSupabaseConfigured && supabase) {
    saveProject(initialProject);
    saveCut(initialCut);
  }

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
        status: 'active',
        updated_at: new Date().toISOString(),
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
    const cuts = await db.getAllFromIndex('cuts', 'by-project', projectId);
    for (const cut of cuts) {
      await deleteCut(cut.id);
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('projects').delete().eq('id', projectId);
    } catch (e) {
      console.warn('Supabase sync error (delete project):', e);
    }
  }
}

// ----------------------------------------------------
// CUTS / VERSIONS
// ----------------------------------------------------
export async function getCutsForProject(projectId: string): Promise<Cut[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('cuts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (data && !error && data.length > 0) {
        const cloudCuts: Cut[] = data.map(d => ({
          id: d.id,
          projectId: d.project_id,
          name: d.name,
          provider: d.provider as any,
          videoUrl: d.video_url,
          videoUrlB: d.video_url_b,
          driveFileId: d.drive_file_id,
          durationSeconds: Number(d.duration_seconds) || 0,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));

        const db = await getDB();
        if (db) {
          for (const c of cloudCuts) {
            await db.put('cuts', c);
          }
        }
        return cloudCuts;
      }
    } catch (e) {
      console.warn('Supabase fetch error (cuts):', e);
    }
  }

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
        video_url_b: cut.videoUrlB || '',
        drive_file_id: cut.driveFileId || '',
        duration_seconds: cut.durationSeconds || 0,
        updated_at: new Date().toISOString(),
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

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('cuts').delete().eq('id', cutId);
    } catch (e) {
      console.warn('Supabase sync error (delete cut):', e);
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
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('cut_id', cutId)
        .order('frame_number', { ascending: true });

      if (data && !error) {
        const cloudNotes: ReviewNote[] = data.map(d => ({
          id: d.id,
          cutId: d.cut_id,
          category: d.category as any,
          presetLabel: d.preset_label,
          text: d.text || '',
          frameNumber: Number(d.frame_number) || 0,
          timecode: d.timecode,
          timecodeOut: d.timecode_out,
          frameOut: d.frame_out ? Number(d.frame_out) : undefined,
          drawingData: d.drawing_data,
          colorGrade: d.color_grade,
          stillImageUrl: d.still_image_url,
          audioBlobUrl: d.audio_url,
          authorName: d.author_name || 'Reviewer',
          isResolved: Boolean(d.is_resolved),
          createdAt: d.created_at,
        }));

        const db = await getDB();
        if (db) {
          for (const n of cloudNotes) {
            await db.put('notes', n);
          }
        }
        return cloudNotes;
      }
    } catch (e) {
      console.warn('Supabase fetch error (notes):', e);
    }
  }

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
        color_grade: note.colorGrade || null,
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

  // Upload to Supabase Storage if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const fileName = `${noteId}.webm`;
      const { data, error } = await supabase.storage
        .from('media-audio')
        .upload(fileName, blob, { upsert: true });

      if (data && !error) {
        const { data: publicUrlData } = supabase.storage
          .from('media-audio')
          .getPublicUrl(fileName);
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.warn('Supabase storage audio upload error:', e);
    }
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
