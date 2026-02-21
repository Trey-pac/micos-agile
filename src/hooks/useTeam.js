import { useState, useEffect } from 'react';
import { subscribeFarmMembers, subscribeFarmInvites } from '../services/userService';

/**
 * Real-time hook for farm team members + pending invites.
 *
 * Returns:
 *   members  — [{id, email, displayName, photoURL, role, createdAt}, ...]
 *   invites  — [{id, email, role, status, createdAt}, ...]
 *   loading  — true while initial data loads
 *   error    — error message if subscription fails
 */
export function useTeam(farmId) {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!farmId) { setLoading(false); return; }

    setError(null);
    let membersLoaded = false;
    let invitesLoaded = false;
    let retryTimer;
    const checkDone = () => {
      if (membersLoaded && invitesLoaded) setLoading(false);
    };

    const unsubMembers = subscribeFarmMembers(
      farmId,
      (data) => { setMembers(data); setError(null); membersLoaded = true; checkDone(); },
      (err) => {
        console.error('Team members error:', err?.code, err?.message);
        setError(err.message); membersLoaded = true; checkDone();
        if (retryKey < 3) retryTimer = setTimeout(() => setRetryKey(k => k + 1), 3000);
      }
    );

    const unsubInvites = subscribeFarmInvites(
      farmId,
      (data) => { setInvites(data); invitesLoaded = true; checkDone(); },
      (err) => {
        console.error('Team invites error:', err?.code, err?.message);
        setError(err.message); invitesLoaded = true; checkDone();
        if (retryKey < 3) retryTimer = setTimeout(() => setRetryKey(k => k + 1), 3000);
      }
    );

    return () => { unsubMembers(); unsubInvites(); if (retryTimer) clearTimeout(retryTimer); };
  }, [farmId, retryKey]);

  return { members, invites, loading, error };
}
