import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetCategory, AssetRecord } from './idb';
import { mediaStorage } from './mediaStorage';

export interface ProjectAsset extends AssetRecord {
  url: string;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  isPdf: boolean;
  isDoc: boolean;
  isPresentation: boolean;
  category: AssetCategory;
}

export function detectAssetCategory(file: { name: string; type?: string }): AssetCategory {
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();

  if (type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi|prores)$/i.test(name)) return 'video';
  if (type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg|psd|ai|tif|tiff)$/i.test(name)) {
    if (name.includes('storyboard') || name.includes('board') || name.includes('concept')) return 'storyboard';
    return 'image';
  }
  if (type.startsWith('audio/') || /\.(mp3|wav|aac|ogg|flac|m4a|aiff)$/i.test(name)) return 'audio';
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    if (name.includes('script') || name.includes('سكريبت')) return 'script';
    if (name.includes('brief') || name.includes('بريف')) return 'brief';
    if (name.includes('storyboard')) return 'storyboard';
    return 'document';
  }
  if (/\.(doc|docx|pages|rtf|txt|odt)$/i.test(name)) {
    if (name.includes('script') || name.includes('سكريبت')) return 'script';
    if (name.includes('brief') || name.includes('بريف')) return 'brief';
    return 'document';
  }
  if (/\.(ppt|pptx|key|keynote|odp)$/i.test(name)) return 'presentation';
  if (name.includes('storyboard')) return 'storyboard';
  if (name.includes('script')) return 'script';
  if (name.includes('brief')) return 'brief';
  return 'other';
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function decorateOne(r: AssetRecord): ProjectAsset {
  const category = r.category ?? detectAssetCategory(r);
  const name = r.name.toLowerCase();
  const type = (r.type || '').toLowerCase();
  return {
    ...r,
    category,
    url: URL.createObjectURL(r.blob),
    isImage: type.startsWith('image/') || category === 'image',
    isVideo: type.startsWith('video/') || category === 'video',
    isAudio: type.startsWith('audio/') || category === 'audio',
    isPdf: type === 'application/pdf' || name.endsWith('.pdf'),
    isDoc: /\.(doc|docx|pages|rtf|txt|odt|pdf)$/i.test(name) || category === 'document' || category === 'script' || category === 'brief',
    isPresentation: /\.(ppt|pptx|key|keynote|odp)$/i.test(name) || category === 'presentation'
  };
}

export function useProjectAssets(projectId: string | undefined) {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const urlsRef = useRef<string[]>([]);
  const refreshIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const refreshId = ++refreshIdRef.current;
    try {
      const recs = await mediaStorage.listProjectAssets(projectId);
      if (refreshId !== refreshIdRef.current) return;
      const decorated = recs.map(decorateOne);
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = decorated.map((asset) => asset.url);
      setAssets(decorated);
    } catch (err) {
      console.error('[assets] load failed', err);
    } finally {
      if (refreshId === refreshIdRef.current) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
    return () => {
      refreshIdRef.current += 1;
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, [refresh]);

  const add = useCallback(
    async (files: File | FileList | File[], meta?: { title?: string; category?: AssetCategory; note?: string }) => {
      if (!projectId) return;
      const list = files instanceof FileList ? Array.from(files) : Array.isArray(files) ? files : [files];
      if (!list.length) return;
      try {
        for (const file of list) {
          const cat = meta?.category ?? detectAssetCategory(file);
          await mediaStorage.saveAsset({
            id: `as-${Date.now()}-${Math.round(Math.random() * 999)}`,
            projectId,
            name: file.name,
            title: meta?.title?.trim() || undefined,
            category: cat,
            note: meta?.note?.trim() || undefined,
            type: file.type || 'application/octet-stream',
            size: file.size,
            blob: file,
            createdAt: Date.now()
          });
        }
        await refresh();
      } catch (err) {
        console.error('[assets] add failed', err);
      }
    },
    [projectId, refresh]
  );

  const addMany = useCallback(
    async (files: FileList | File[]) => {
      if (!projectId) return;
      try {
        for (const file of Array.from(files)) {
          const cat = detectAssetCategory(file);
          await mediaStorage.saveAsset({
            id: `as-${Date.now()}-${Math.round(Math.random() * 999)}`,
            projectId,
            name: file.name,
            category: cat,
            type: file.type || 'application/octet-stream',
            size: file.size,
            blob: file,
            createdAt: Date.now()
          });
        }
        await refresh();
      } catch (err) {
        console.error('[assets] addMany failed', err);
      }
    },
    [projectId, refresh]
  );

  const remove = useCallback(
    async (id: string): Promise<AssetRecord | null> => {
      try {
        const record = await mediaStorage.getAsset(id);
        await mediaStorage.deleteAsset(id);
        setAssets((prev) => {
          const target = prev.find((p) => p.id === id);
          if (target) {
            URL.revokeObjectURL(target.url);
            urlsRef.current = urlsRef.current.filter((url) => url !== target.url);
          }
          return prev.filter((p) => p.id !== id);
        });
        return record ?? null;
      } catch (err) {
        console.error('[assets] remove failed', err);
        return null;
      }
    },
    []
  );

  const restore = useCallback(
    async (record: AssetRecord) => {
      try {
        await mediaStorage.saveAsset(record);
        await refresh();
      } catch (err) {
        console.error('[assets] restore failed', err);
      }
    },
    [refresh]
  );

  const updateAsset = useCallback(
    async (id: string, patch: Partial<Pick<AssetRecord, 'title' | 'category' | 'note'>>) => {
      try {
        const rec = await mediaStorage.getAsset(id);
        if (!rec) return;
        const updated = { ...rec, ...patch };
        await mediaStorage.saveAsset(updated);
        setAssets((prev) => prev.map((p) => (p.id === id ? decorateOne(updated) : p)));
      } catch (err) {
        console.error('[assets] update failed', err);
      }
    },
    []
  );

  const updateNote = useCallback(
    async (id: string, note: string) => {
      await updateAsset(id, { note });
    },
    [updateAsset]
  );

  const assignToVersion = useCallback(
    async (assetId: string, version: string) => {
      if (!projectId) return;
      await mediaStorage.assignAssetToVersion(projectId, version, assetId);
    },
    [projectId]
  );

  return { assets, loading, add, addMany, remove, restore, updateAsset, updateNote, assignToVersion };
}
