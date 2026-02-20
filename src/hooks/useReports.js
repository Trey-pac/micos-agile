import { useState, useEffect, useCallback } from 'react';
import { subscribeReports, saveReportSnapshot } from '../services/reportService';

export function useReports(farmId) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) { setReports([]); setLoading(false); return; }
    setLoading(true);
    return subscribeReports(
      farmId,
      (data) => { setReports(data); setLoading(false); },
      (err) => { console.error('[useReports] error:', err); setLoading(false); },
    );
  }, [farmId]);

  const saveReport = useCallback(async (data) => {
    if (!farmId) return;
    return saveReportSnapshot(farmId, data);
  }, [farmId]);

  return { reports, loading, saveReport };
}
