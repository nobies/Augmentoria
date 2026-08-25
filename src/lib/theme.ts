export interface ThemePreset {
  id: string;
  label: string;
  accent: string;
  dim: string;
  glow: string;
}

export const THEMES: ThemePreset[] = [
  { id: 'gold', label: 'Gold', accent: '#D9A441', dim: '#B58530', glow: '217, 164, 65' },
  { id: 'teal', label: 'Teal', accent: '#4FD1C5', dim: '#38A89D', glow: '79, 209, 197' },
  { id: 'violet', label: 'Violet', accent: '#A78BFA', dim: '#8B6FF0', glow: '167, 139, 250' },
  { id: 'rose', label: 'Rose', accent: '#FB7185', dim: '#E15A70', glow: '251, 113, 133' },
  { id: 'emerald', label: 'Emerald', accent: '#34D399', dim: '#1FA97C', glow: '52, 211, 153' },
  { id: 'sky', label: 'Sky', accent: '#38BDF8', dim: '#1FA3DB', glow: '56, 189, 248' }
];

const KEY = 'accent-theme';

export function currentThemeId() {
  return localStorage.getItem(KEY) ?? 'gold';
}

export function applyTheme(id: string) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-accent-dim', theme.dim);
  root.style.setProperty('--glow-rgb', theme.glow);
  localStorage.setItem(KEY, theme.id);
}

export function initTheme() {
  applyTheme(currentThemeId());
}
