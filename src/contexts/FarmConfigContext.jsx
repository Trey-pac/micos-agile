import { useState, useEffect, createContext, useContext } from 'react';
import { getFarmConfig } from '../services/farmService';

const FarmConfigContext = createContext(null);

/**
 * Default config for legacy farms that don't yet have a config doc.
 */
const DEFAULT_CONFIG = {
  name: "Mico's Micro Farm Workspace",
  logo: null,
  primaryColor: '#16a34a',
  accentColor: '#06b6d4',
  tagline: 'Keeping ourselves in line so we can take over the world',
  timezone: 'America/Boise',
  cutoffTime: '14:00',
  deliveryDays: ['tuesday', 'friday'],
  units: 'imperial',
  onboardingComplete: true,
};

/**
 * Provider — loads farm config from Firestore once, provides to children.
 * Used for white-label branding (farm name in header, colors, etc.)
 */
export function FarmConfigProvider({ farmId, children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) { setLoading(false); return; }

    let cancelled = false;
    (async () => {
      try {
        const c = await getFarmConfig(farmId);
        if (!cancelled && c) {
          setConfig({ ...DEFAULT_CONFIG, ...c });
        }
      } catch (err) {
        console.error('Failed to load farm config:', err);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [farmId]);

  return (
    <FarmConfigContext.Provider value={{ config, loading, setConfig }}>
      {children}
    </FarmConfigContext.Provider>
  );
}

/**
 * Hook — access farm config anywhere in the app.
 * Returns { config, loading }.
 */
export function useFarmConfig() {
  const ctx = useContext(FarmConfigContext);
  if (!ctx) return { config: DEFAULT_CONFIG, loading: false };
  return ctx;
}
