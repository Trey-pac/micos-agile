import { useState, useEffect, useCallback } from 'react';
import {
  subscribeCropProfiles,
  addCropProfile as addService,
  updateCropProfile as updateService,
  deleteCropProfile as deleteService,
  seedDefaultCropProfiles,
} from '../services/cropProfileService';

/**
 * Crop profile hook — real-time Firestore subscription + CRUD.
 * Auto-seeds defaults on first load if collection is empty.
 */
export function useCropProfiles(farmId) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!farmId) { setProfiles([]); setLoading(false); return; }
    setLoading(true);

    const unsub = subscribeCropProfiles(
      farmId,
      (list) => {
        // If collection is empty on first load, seed defaults
        if (list.length === 0 && !seeding) {
          setSeeding(true);
          seedDefaultCropProfiles(farmId)
            .then((result) => {
              console.log('[useCropProfiles] Seed result:', result);
              setSeeding(false);
              // Snapshot listener will pick up the new docs automatically
            })
            .catch((err) => {
              console.error('[useCropProfiles] Seed error:', err);
              setSeeding(false);
            });
        } else {
          setProfiles(list);
          setLoading(false);
        }
      },
      (err) => {
        console.error('CropProfiles subscription error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [farmId]);

  const addProfile = useCallback(async (data) => {
    if (!farmId) return;
    try { return await addService(farmId, data); }
    catch (err) { console.error('Add crop profile error:', err); setError(err.message); }
  }, [farmId]);

  const editProfile = useCallback(async (profileId, updates) => {
    if (!farmId) return;
    try { await updateService(farmId, profileId, updates); }
    catch (err) { console.error('Edit crop profile error:', err); setError(err.message); }
  }, [farmId]);

  const removeProfile = useCallback(async (profileId) => {
    if (!farmId) return;
    try { await deleteService(farmId, profileId); }
    catch (err) { console.error('Delete crop profile error:', err); setError(err.message); }
  }, [farmId]);

  const activeProfiles = profiles.filter((p) => p.active !== false);

  return {
    profiles,
    activeProfiles,
    loading: loading || seeding,
    error,
    addProfile,
    editProfile,
    removeProfile,
  };
}
