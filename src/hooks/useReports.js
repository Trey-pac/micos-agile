import { useState, useEffect, useCallback } from 'react';
import { subscribeReports, saveReportSnapshot } from '../services/reportService';

export function useReports(farmId) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!farmId) { setReports([]); setLoading(false); return; }
    setLoading(true);
    return subscribeReports(
      farmId,
      (data) => { setReports(data); setLoading(false); },
      (err) => { console.error('[useReports] error:', err); setError(err.message); setLoading(false); },
    );
  }, [farmId]);

  const saveReport = useCallback(async (data) => {
    if (!farmId) return;
    try { return await saveReportSnapshot(farmId, data); }
    catch (err) { console.error('[useReports] save error:', err); setError(err.message); }
  }, [farmId]);

  return { reports, loading, error, saveReport };
}
