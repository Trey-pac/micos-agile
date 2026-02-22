/**
 * Shared date utilities — single source of truth for Firestore timestamp
 * parsing and date formatting across the entire app.
 *
 * Replaces 24+ copy-paste implementations scattered across components,
 * hooks, services, and utils.
 */

/**
 * Convert any Firestore-like value to a JS Date.
 * Handles: Firestore Timestamp (.toDate()), {seconds} obj, ISO string, Date.
 * @param {*} val - Firestore Timestamp, {seconds}, string, Date, or null
 * @returns {Date|null}
 */
export function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val) ? null : val;
  if (val.toDate) return val.toDate();                        // Firestore Timestamp
  if (val._seconds != null) return new Date(val._seconds * 1000); // Admin SDK serialized
  if (val.seconds != null) return new Date(val.seconds * 1000);   // Plain {seconds} obj
  const d = new Date(val);                                     // ISO string / number
  return isNaN(d) ? null : d;
}

/**
 * Convert any value to "YYYY-MM-DD" string (or null).
 * @param {*} val
 * @returns {string|null}
 */
export function toDateStr(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.split('T')[0];
  const d = toDate(val);
  return d ? d.toISOString().split('T')[0] : null;
}

/**
 * Short date: "Feb 10"
 * @param {*} val
 * @returns {string}
 */
export function formatShort(val) {
  const d = toDate(val);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Full date: "Feb 10, 2026"
 * @param {*} val
 * @returns {string}
 */
export function formatFull(val) {
  const d = toDate(val);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Date with time: "Feb 10, 2026, 3:45 PM"
 * @param {*} val
 * @returns {string}
 */
export function formatDateTime(val) {
  const d = toDate(val);
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

/**
 * Weekday + short date: "Fri, Feb 10"
 * @param {*} val
 * @returns {string}
 */
export function formatWeekday(val) {
  const d = toDate(val);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Relative time: "3h ago", "2d ago", "just now"
 * @param {*} val
 * @returns {string}
 */
export function timeAgo(val) {
  const d = toDate(val);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * ISO date key for grouping: "2026-02-10" via en-CA locale.
 * @param {Date} d
 * @returns {string}
 */
export function dateKey(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : toDate(d);
  return dt ? dt.toLocaleDateString('en-CA') : '';
}

/**
 * Month key for aggregation: "2026-02"
 * @param {*} val
 * @returns {string}
 */
export function monthKey(val) {
  const d = toDate(val);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Month label from key: "Feb 26" from "2026-02"
 * @param {string} key - "YYYY-MM" format
 * @returns {string}
 */
export function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
