import { onSnapshot } from 'firebase/firestore';

/**
 * Drop-in replacement for Firestore's onSnapshot that retries on
 * permission-denied errors. Handles the race condition where the user
 * doc may not have propagated to the server when subscriptions start.
 *
 * Same signature as onSnapshot: (query, onData, onError) => unsubscribe
 *
 * @param {import('firebase/firestore').Query} queryRef - Firestore query
 * @param {Function} onData  - Success callback (snapshot)
 * @param {Function} onError - Error callback (only called after retries exhausted)
 * @param {number}   [maxRetries=3] - Number of retries before giving up
 * @param {number}   [delayMs=2000] - Base delay between retries (multiplied by attempt)
 * @returns {Function} unsubscribe function
 */
export function resilientSnapshot(queryRef, onData, onError, maxRetries = 3, delayMs = 2000) {
  let attempt = 0;
  let currentUnsub = null;
  let retryTimer = null;
  let cancelled = false;

  function trySubscribe() {
    if (cancelled) return;

    currentUnsub = onSnapshot(
      queryRef,
      (snapshot) => {
        attempt = 0; // Reset on success — connection is healthy
        onData(snapshot);
      },
      (err) => {
        if (cancelled) return;

        const isPermission = err.code === 'permission-denied' ||
          err.message?.includes('permission') ||
          err.message?.includes('Missing or insufficient');

        if (isPermission && attempt < maxRetries) {
          attempt++;
          console.warn(
            `[resilientSnapshot] Permission denied — retry ${attempt}/${maxRetries} in ${delayMs * attempt}ms`
          );
          if (currentUnsub) { currentUnsub(); currentUnsub = null; }
          retryTimer = setTimeout(trySubscribe, delayMs * attempt);
        } else {
          onError(err);
        }
      }
    );
  }

  trySubscribe();

  return () => {
    cancelled = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (currentUnsub) currentUnsub();
  };
}
