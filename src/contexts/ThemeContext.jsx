import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from '../firebase';

const ThemeContext = createContext();

const STORAGE_KEY = 'mico-theme';
const MODES = ['light', 'dark', 'system'];

function resolveTheme(mode) {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

function applyTheme(mode) {
  const resolved = resolveTheme(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  // Update meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'dark' ? '#111827' : '#ffffff';
}

export function ThemeProvider({ children, userId, farmId }) {
  // Read from localStorage instantly (no flash)
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'light';
  });

  // Apply on mount + whenever theme changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Listen for system preference changes when mode is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Sync from Firestore on mount (non-blocking, localStorage wins first paint)
  useEffect(() => {
    if (!userId || !farmId) return;
    const ref = doc(getDb(), 'farms', farmId, 'userPrefs', userId);
    getDoc(ref).then(snap => {
      const firestoreTheme = snap.data()?.theme;
      if (firestoreTheme && MODES.includes(firestoreTheme)) {
        setThemeState(firestoreTheme);
      }
    }).catch(() => {}); // silent fail — localStorage is source of truth
  }, [userId, farmId]);

  const setTheme = useCallback((mode) => {
    if (!MODES.includes(mode)) return;
    setThemeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    // Persist to Firestore (fire-and-forget)
    if (userId && farmId) {
      const ref = doc(getDb(), 'farms', farmId, 'userPrefs', userId);
      setDoc(ref, { theme: mode }, { merge: true }).catch(() => {});
    }
  }, [userId, farmId]);

  const isDark = resolveTheme(theme) === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
