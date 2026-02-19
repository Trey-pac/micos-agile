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

  useEffect(() => {
    if (!farmId) { setLoading(false); return; }

    let membersLoaded = false;
    let invitesLoaded = false;
    const checkDone = () => {
      if (membersLoaded && invitesLoaded) setLoading(false);
    };

    const unsubMembers = subscribeFarmMembers(
      farmId,
      (data) => { setMembers(data); membersLoaded = true; checkDone(); },
      (err) => { console.error('Team members error:', err); setError(err.message); membersLoaded = true; checkDone(); }
    );

    const unsubInvites = subscribeFarmInvites(
      farmId,
      (data) => { setInvites(data); invitesLoaded = true; checkDone(); },
      (err) => { console.error('Team invites error:', err); setError(err.message); invitesLoaded = true; checkDone(); }
    );

    return () => { unsubMembers(); unsubInvites(); };
  }, [farmId]);

  return { members, invites, loading, error };
}
