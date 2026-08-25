import { useCallback, useEffect, useState } from 'react';
import { idb } from './idb';
import type { AssetRecord } from './idb';

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

  const refresh = useCallback(async () => {
    if (!projectId) return;
    try {
      const recs = await idb.all<AssetRecord>('assets');
      if (projectId) {
        setAssets(
          recs
            .filter((r) => r.projectId === projectId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(decorateOne)
        );
      }
    } catch (err) {
      console.error('[assets] load failed', err);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (files: FileList | File[]) => {
      if (!projectId) return;
      try {
        for (const file of Array.from(files)) {
          await idb.put('assets', {
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
        await idb.del('assets', id);
        setAssets((prev) => {
          const target = prev.find((p) => p.id === id);
          if (target) URL.revokeObjectURL(target.url);
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
        const recs = await idb.all<AssetRecord>('assets');
        const rec = recs.find((r) => r.id === id);
        if (!rec) return;
        await idb.put('assets', { ...rec, note });
        setAssets((prev) => prev.map((p) => (p.id === id ? { ...p, note } : p)));
      } catch (err) {
        console.error('[assets] note failed', err);
      }
    },
    []
  );

  return { assets, add, remove, updateNote };
}
