import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DemoModeContext = createContext(null);

/**
 * DemoModeProvider — wraps the app and provides isDemoMode + toggle.
 *
 * When demo mode is ON:
 *   - All data hooks return demo data instead of Firestore data
 *   - No Firestore writes happen
 *   - A persistent banner shows at the top
 *
 * The demo data itself lives in src/data/demoData.js and is loaded lazily
 * to avoid bloating the main bundle when demo mode is off.
 */
export function DemoModeProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoData, setDemoData] = useState(null);

  const toggleDemoMode = useCallback(async () => {
    if (!isDemoMode) {
      // Turning ON — lazy-load demo data
      try {
        const mod = await import('../data/demoData.js');
        setDemoData(mod.createDemoSnapshot());
        setIsDemoMode(true);
      } catch (err) {
        console.error('Failed to load demo data:', err);
      }
    } else {
      // Turning OFF — clear demo data
      setIsDemoMode(false);
      setDemoData(null);
    }
  }, [isDemoMode]);

  // Mutation helper — updates a specific key in demoData
  const updateDemoData = useCallback((key, updater) => {
    setDemoData(prev => {
      if (!prev) return prev;
      const current = prev[key];
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [key]: next };
    });
  }, []);

  const value = useMemo(() => ({
    isDemoMode,
    demoData,
    toggleDemoMode,
    updateDemoData,
  }), [isDemoMode, demoData, toggleDemoMode, updateDemoData]);

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) return { isDemoMode: false, demoData: null, toggleDemoMode: () => {}, updateDemoData: () => {} };
  return ctx;
}
