import { useSyncExternalStore } from 'react';

export interface Toast {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'danger' | 'success';
}

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function emit() {
  listeners.forEach((l) => l());
}

export function toast(t: Omit<Toast, 'id'> & { id?: string; durationMs?: number }) {
  const id = t.id ?? `t-${Date.now()}-${seq++}`;
  const { durationMs = 6000, ...rest } = t;
  toasts = [...toasts.filter((x) => x.id !== id), { ...rest, id }];
  emit();
  if (durationMs > 0) {
    window.setTimeout(() => dismissToast(id), durationMs);
  }
  return id;
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, () => toasts);
}
