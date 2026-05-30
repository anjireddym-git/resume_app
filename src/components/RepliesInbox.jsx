import React, { useEffect, useState } from 'react';
import { X, Loader2, Mail, ExternalLink, RefreshCw, AlertTriangle, Inbox } from 'lucide-react';
import { doc, onSnapshot, collectionGroup, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { markReplySeen } from '../services/resumeService';

const fetchGmailHistoryFn = httpsCallable(functions, 'fetchGmailHistory');
const startGmailWatchFn = httpsCallable(functions, 'startGmailWatch');

/**
 * RepliesInbox lists recruiter replies tied to sentApplications. It also acts
 * as the live "history puller": when the Cloud Function flags
 * users/{uid}.gmailWatch.pendingHistoryFetch, this component fetches the diff
 * using the user's OAuth token and writes reply subdocs.
 */
const RepliesInbox = ({ isOpen, onClose }) => {
  const { user, ensureGmailAccess, wasGmailReadGrantedBefore } = useAuth();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [watchEnabled, setWatchEnabled] = useState(false);
  const [pendingHistoryId, setPendingHistoryId] = useState(null);

  // Subscribe to the user doc to detect pending history pushes from Gmail.
  useEffect(() => {
    if (!isOpen || !user?.uid) return undefined;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data() || {};
      const watch = data.gmailWatch || {};
      setWatchEnabled(!!watch.enabledAt);
      setPendingHistoryId(watch.pendingHistoryFetch || null);
    });
    return unsub;
  }, [isOpen, user?.uid]);

  // When a push arrives, fetch + persist matches automatically.
  useEffect(() => {
    if (!isOpen || !pendingHistoryId) return;
    (async () => {
      try {
        const accessToken = await ensureGmailAccess({ withReadonly: true });
        await fetchGmailHistoryFn({ accessToken, sinceHistoryId: pendingHistoryId });
        await loadReplies();
      } catch (err) {
        console.warn('history fetch failed:', err.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pendingHistoryId]);

  const loadReplies = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError('');
    try {
      // Reply subdocs are under sentApplications/*/replies. Use a collection group.
      const q = query(
        collectionGroup(db, 'replies'),
        orderBy('receivedAt', 'desc'),
        limit(50),
      );
      const snap = await getDocs(q);
      const rows = [];
      snap.forEach((d) => {
        const parentId = d.ref.parent.parent?.id;
        rows.push({ id: d.id, sentApplicationId: parentId, ...d.data() });
      });
      setReplies(rows);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load replies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const enableReplyTracking = async () => {
    setError('');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: true });
      await startGmailWatchFn({ accessToken });
      setWatchEnabled(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to enable reply tracking.');
    }
  };

  const refreshNow = async () => {
    setError('');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: true });
      await fetchGmailHistoryFn({ accessToken });
      await loadReplies();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Refresh failed.');
    }
  };

  const handleMarkSeen = async (reply) => {
    try { await markReplySeen(reply.sentApplicationId, reply.id); } catch {}
    setReplies((rs) => rs.map((r) => (r.id === reply.id ? { ...r, seenAt: new Date() } : r)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Recruiter Replies</h2>
              <p className="text-xs text-neutral-500">Tracked from your Gmail inbox</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshNow} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg" title="Refresh now">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" /> <span>{error}</span>
            </div>
          )}

          {!watchEnabled && (
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Reply tracking is off</p>
              <p className="text-xs text-blue-800 mt-1">
                Enable it to let us watch your Gmail inbox for replies on threads started from this app. Requires a one-time Gmail read permission.
              </p>
              <button
                onClick={enableReplyTracking}
                className="mt-3 h-9 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Enable reply tracking
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" /></div>
          ) : replies.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              <Mail className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
              No replies yet.{wasGmailReadGrantedBefore && ' We\'ll show them here when they arrive.'}
            </div>
          ) : (
            replies.map((r) => (
              <div
                key={r.id}
                className={`p-3 border rounded-lg ${r.seenAt ? 'border-neutral-200 bg-white' : 'border-blue-200 bg-blue-50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 truncate">{r.subject || '(no subject)'}</p>
                    <p className="text-xs text-neutral-500 truncate">{r.from}</p>
                    <p className="text-xs text-neutral-700 mt-1.5 line-clamp-2">{r.snippet}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <a
                      href={`https://mail.google.com/mail/u/0/#inbox/${r.threadId}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                    {!r.seenAt && (
                      <button onClick={() => handleMarkSeen(r)} className="text-xs text-neutral-500 hover:underline">
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RepliesInbox;
