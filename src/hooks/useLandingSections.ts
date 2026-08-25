import { useCallback, useEffect, useState } from 'react';
import { idb } from '../lib/idb';
import type { ImageRecord } from '../lib/idb';
import { DEFAULT_SECTIONS, STORAGE_KEY } from '../lib/pageSections';
import type { LandingSection, SectionData, SectionType } from '../lib/pageSections';

export interface PageImage extends ImageRecord {
  url: string;
}

function loadSections(): LandingSection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SECTIONS;
    const parsed = JSON.parse(raw) as LandingSection[];
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SECTIONS;
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function persist(sections: LandingSection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
}

export function useLandingSections() {
  const [sections, setSections] = useState<LandingSection[]>(loadSections);
  const [images, setImages] = useState<PageImage[]>([]);

  useEffect(() => {
    let alive = true;
    idb.all('page').then((recs) => {
      if (!alive) return;
      setImages(recs.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) })));
    });
    return () => {
      alive = false;
    };
  }, []);

  const commit = useCallback((next: LandingSection[]) => {
    setSections(next);
    persist(next);
  }, []);

  const updateData = useCallback(
    (id: string, patch: Partial<SectionData>) => {
      commit(sections.map((s) => (s.id === id ? { ...s, data: { ...s.data, ...patch } } : s)));
    },
    [sections, commit]
  );

  const toggleVisible = useCallback(
    (id: string) => {
      commit(sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
    },
    [sections, commit]
  );

  const move = useCallback(
    (id: string, dir: -1 | 1) => {
      const idx = sections.findIndex((s) => s.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= sections.length) return;
      const next = [...sections];
      [next[idx], next[target]] = [next[target], next[idx]];
      commit(next);
    },
    [sections, commit]
  );

  const addSection = useCallback(
    (type: SectionType) => {
      commit([...sections, { id: `s-${Date.now()}`, type, visible: true, data: {} }]);
    },
    [sections, commit]
  );

  const removeSection = useCallback(
    (id: string) => {
      commit(sections.filter((s) => s.id !== id));
    },
    [sections, commit]
  );

  const resetAll = useCallback(() => commit(DEFAULT_SECTIONS.map((s) => ({ ...s, data: { ...s.data } }))), [commit]);

  const addImages = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const ids: string[] = [];
    for (const file of list) {
      const id = crypto.randomUUID();
      ids.push(id);
      await idb.put('page', { id, name: file.name, type: file.type, blob: file, active: true, createdAt: Date.now() });
    }
    const recs = await idb.all('page');
    setImages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return recs.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) }));
    });
    return ids;
  }, []);

  const imageUrl = useCallback((id?: string) => images.find((i) => i.id === id)?.url ?? '', [images]);

  return { sections, images, updateData, toggleVisible, move, addSection, removeSection, resetAll, addImages, imageUrl };
}
