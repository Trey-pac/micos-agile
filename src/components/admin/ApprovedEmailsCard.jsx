import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { updateFarmConfig, getFarmConfig } from '../../services/farmService';

/**
 * ApprovedEmailsCard — Manages the approvedEmails whitelist for farm access control.
 * Admin-only. Used in SettingsPage's Team tab.
 */
export default function ApprovedEmailsCard({ farmId, user }) {
  const [approvedEmails, setApprovedEmails] = useState([]);
  const [newApprovedEmail, setNewApprovedEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await getFarmConfig(farmId);
        if (!cancelled) setApprovedEmails(config?.approvedEmails || []);
      } catch (err) {
        console.error('Failed to load approved emails:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [farmId]);

  const flash = (ok, text) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleAdd = useCallback(async () => {
    const email = newApprovedEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (approvedEmails.map((e) => e.toLowerCase()).includes(email)) {
      flash(false, 'Email already in list');
      return;
    }
    setSaving(true);
    try {
      const updated = [...approvedEmails, email];
      await updateFarmConfig(farmId, { approvedEmails: updated });
      setApprovedEmails(updated);
      setNewApprovedEmail('');
      flash(true, 'User added!');
    } catch (err) {
      console.error('Failed to add approved email:', err);
      flash(false, 'Failed to save');
    }
    setSaving(false);
  }, [newApprovedEmail, approvedEmails, farmId]);

  const handleRemove = useCallback(async (emailToRemove) => {
    if (emailToRemove.toLowerCase() === user?.email?.toLowerCase()) {
      flash(false, "Can't remove yourself");
      return;
    }
    if (approvedEmails.length <= 1) {
      flash(false, 'Must have at least one approved user');
      return;
    }
    setSaving(true);
    try {
      const updated = approvedEmails.filter((e) => e.toLowerCase() !== emailToRemove.toLowerCase());
      await updateFarmConfig(farmId, { approvedEmails: updated });
      setApprovedEmails(updated);
      flash(true, 'User removed');
    } catch (err) {
      console.error('Failed to remove approved email:', err);
      flash(false, 'Failed to save');
    }
    setSaving(false);
  }, [approvedEmails, farmId, user]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔒</span>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Approved Users</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Only these email addresses can sign in and access workspace data.
        Anyone not on this list will see an &quot;Access Denied&quot; screen.
      </p>

      {loading ? (
        <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
      ) : (
        <>
          <div className="space-y-2">
            {approvedEmails.map((email) => (
              <div key={email} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2.5">
                <span className="text-sm text-gray-700 dark:text-gray-300">{email}</span>
                <button
                  onClick={() => handleRemove(email)}
                  disabled={saving || email.toLowerCase() === user?.email?.toLowerCase()}
                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {email.toLowerCase() === user?.email?.toLowerCase() ? 'You' : 'Remove'}
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              value={newApprovedEmail}
              onChange={(e) => setNewApprovedEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="newuser@example.com"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAdd}
              disabled={!newApprovedEmail.trim() || saving}
              className="px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? '...' : '+ Add'}
            </motion.button>
          </div>

          {msg && (
            <p className={`text-xs font-semibold ${msg.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {msg.text}
            </p>
          )}

          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
            ⚠️ Removing all emails or yourself will lock everyone out.
            Changes take effect immediately for new sign-ins.
          </p>
        </>
      )}
    </div>
  );
}
