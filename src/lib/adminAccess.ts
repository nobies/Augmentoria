import { useEffect, useState } from 'react';

const KEY = 'admin-unlocked';
const CODE = import.meta.env.VITE_ADMIN_CODE ?? 'augmentoria';

function notify() {
  window.dispatchEvent(new Event('admin-change'));
}

export function isAdminUnlocked() {
  return localStorage.getItem(KEY) === '1';
}

export function unlockAdmin(code: string) {
  if (code !== CODE) return false;
  localStorage.setItem(KEY, '1');
  notify();
  return true;
}

export function lockAdmin() {
  localStorage.removeItem(KEY);
  notify();
}

export function useIsAdmin() {
  const [value, setValue] = useState(isAdminUnlocked);

  useEffect(() => {
    const handler = () => setValue(isAdminUnlocked());
    window.addEventListener('admin-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('admin-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return value;
}
