import { useCallback, useEffect, useState } from 'react';
import { idb } from '../lib/idb';
import type { Collection, ImageRecord } from '../lib/idb';

export interface CollectionImage extends ImageRecord {
  url: string;
}

export interface CollectionSettings {
  enabled: boolean;
  opacity: number;
  interval: number;
}

const DEFAULTS: CollectionSettings = { enabled: true, opacity: 0.9, interval: 7 };

function loadSettings(collection: Collection): CollectionSettings {
  try {
    const raw = localStorage.getItem(`${collection}-settings`);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useCollectionMedia(collection: Collection) {
  const [images, setImages] = useState<CollectionImage[]>([]);
  const [settings, setSettings] = useState<CollectionSettings>(() => loadSettings(collection));

  useEffect(() => {
    localStorage.setItem(`${collection}-settings`, JSON.stringify(settings));
  }, [collection, settings]);

  useEffect(() => {
    let alive = true;
    idb.all(collection).then((recs) => {
      if (!alive) return;
      const sorted = [...recs].sort((a, b) => a.createdAt - b.createdAt);
      setImages(sorted.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) })));
    });
    return () => {
      alive = false;
    };
  }, [collection]);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      for (const file of list) {
        await idb.put(collection, {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          blob: file,
          active: true,
          createdAt: Date.now()
        });
      }
      const recs = await idb.all(collection);
      setImages((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        const urls = new Map(prev.map((p) => [p.id, p.url]));
        return [...recs]
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((r) => ({ ...r, url: urls.get(r.id) ?? URL.createObjectURL(r.blob) }));
      });
    },
    [collection]
  );

  const remove = useCallback(
    async (id: string) => {
      await idb.del(collection, id);
      setImages((prev) => {
        const target = prev.find((p) => p.id === id);
        if (target) URL.revokeObjectURL(target.url);
        return prev.filter((p) => p.id !== id);
      });
    },
    [collection]
  );

  const toggleActive = useCallback(
    (id: string) => {
      setImages((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, active: !p.active };
          idb.put(collection, { id: p.id, name: p.name, type: p.type, blob: p.blob, active: next.active, createdAt: p.createdAt });
          return next;
        })
      );
    },
    [collection]
  );

  const updateSettings = useCallback((patch: Partial<CollectionSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  return { images, settings, addFiles, remove, toggleActive, updateSettings };
}
