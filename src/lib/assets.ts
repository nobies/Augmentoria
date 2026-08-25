import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetRecord } from './idb';
import { mediaStorage } from './mediaStorage';

export interface ProjectAsset extends AssetRecord {
  url: string;
  isImage: boolean;
  isVideo: boolean;
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function decorateOne(r: AssetRecord): ProjectAsset {
  return {
    ...r,
    url: URL.createObjectURL(r.blob),
    isImage: r.type.startsWith('image/'),
    isVideo: r.type.startsWith('video/')
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
    async (files: FileList | File[]) => {
      if (!projectId) return;
      try {
        for (const file of Array.from(files)) {
          await mediaStorage.saveAsset({
            id: `as-${Date.now()}-${Math.round(Math.random() * 999)}`,
            projectId,
            name: file.name,
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

  const remove = useCallback(
    async (id: string) => {
      try {
        await mediaStorage.deleteAsset(id);
        setAssets((prev) => {
          const target = prev.find((p) => p.id === id);
          if (target) {
            URL.revokeObjectURL(target.url);
            urlsRef.current = urlsRef.current.filter((url) => url !== target.url);
          }
          return prev.filter((p) => p.id !== id);
        });
      } catch (err) {
        console.error('[assets] remove failed', err);
      }
    },
    []
  );

  const updateNote = useCallback(
    async (id: string, note: string) => {
      try {
        const rec = await mediaStorage.getAsset(id);
        if (!rec) return;
        await mediaStorage.saveAsset({ ...rec, note });
        setAssets((prev) => prev.map((p) => (p.id === id ? { ...p, note } : p)));
      } catch (err) {
        console.error('[assets] note failed', err);
      }
    },
    []
  );

  const assignToVersion = useCallback(
    async (assetId: string, version: string) => {
      if (!projectId) return;
      await mediaStorage.assignAssetToVersion(projectId, version, assetId);
    },
    [projectId]
  );

  return { assets, loading, add, remove, updateNote, assignToVersion };
}
