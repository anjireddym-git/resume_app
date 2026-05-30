import React, { useEffect, useState } from 'react';
import { Loader2, Inbox, Mail, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { doc, onSnapshot, collectionGroup, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { markReplySeen } from '../../services/resumeService';

const fetchGmailHistoryFn = httpsCallable(functions, 'fetchGmailHistory');
const startGmailWatchFn = httpsCallable(functions, 'startGmailWatch');

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const RepliesView = ({ user, onOpenApplication }) => {
  const { ensureGmailAccess, wasGmailReadGrantedBefore } = useAuth();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [watchEnabled, setWatchEnabled] = useState(false);
  const [pendingHistoryId, setPendingHistoryId] = useState(null);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data() || {};
      const watch = data.gmailWatch || {};
      setWatchEnabled(!!watch.enabledAt);
      setPendingHistoryId(watch.pendingHistoryFetch || null);
    });
    return unsub;
  }, [user?.uid]);

  const loadReplies = async () => {
    if (!user?.uid) return;
    setLoading(true); setError('');
    try {
      const q = query(collectionGroup(db, 'replies'), orderBy('receivedAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      const rows = [];
      snap.forEach((d) => {
        const parentId = d.ref.parent.parent?.id;
        rows.push({ id: d.id, sentApplicationId: parentId, ...d.data() });
      });
      setReplies(rows);
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to load replies.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadReplies(); /* eslint-disable-next-line */ }, [user?.uid]);

  useEffect(() => {
    if (!pendingHistoryId) return;
    (async () => {
      try {
        const accessToken = await ensureGmailAccess({ withReadonly: true });
        await fetchGmailHistoryFn({ accessToken, sinceHistoryId: pendingHistoryId });
        await loadReplies();
      } catch (err) { console.warn('history fetch failed:', err.message); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHistoryId]);

  const enableReplyTracking = async () => {
    setError('');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: true });
      await startGmailWatchFn({ accessToken });
      setWatchEnabled(true);
    } catch (err) { console.error(err); setError(err.message || 'Failed to enable reply tracking.'); }
  };

  const refreshNow = async () => {
    setError('');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: true });
      await fetchGmailHistoryFn({ accessToken });
      await loadReplies();
    } catch (err) { setError(err.message || 'Refresh failed.'); }
  };

  const handleOpen = async (r) => {
    if (!r.seenAt) {
      try { await markReplySeen(r.sentApplicationId, r.id); } catch {}
      setReplies((rs) => rs.map((x) => x.id === r.id ? { ...x, seenAt: new Date() } : x));
    }
    if (r.sentApplicationId && onOpenApplication) onOpenApplication(r.sentApplicationId);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Replies</h1>
          <p className="text-sm text-neutral-500 mt-1">Recruiter responses tracked from your Gmail inbox.</p>
        </div>
        <button
          onClick={refreshNow}
          className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {!watchEnabled && (
        <div className="mb-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Reply tracking is off</p>
          <p className="text-xs text-blue-800 mt-1">
            Enable it so we can watch your Gmail inbox for replies on threads started from this app. Requires a one-time Gmail read permission.
          </p>
          <button onClick={enableReplyTracking} className="mt-3 h-9 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Enable reply tracking
          </button>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl">
        {loading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" /></div>
        ) : replies.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-500">
            <Mail className="w-12 h-12 mx-auto text-neutral-300 mb-2" />
            No replies yet.{wasGmailReadGrantedBefore && " We'll show them here when they arrive."}
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {replies.map((r) => (
              <button
                key={r.id}
                onClick={() => handleOpen(r)}
                className={`w-full text-left px-4 py-3 hover:bg-neutral-50 flex items-start gap-3 ${
                  !r.seenAt ? 'bg-blue-50/40' : ''
                }`}
              >
                <Inbox className={`w-4 h-4 mt-1 flex-shrink-0 ${!r.seenAt ? 'text-blue-600' : 'text-neutral-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${!r.seenAt ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}>{r.from}</span>
                    <span className="text-[11px] text-neutral-400 flex-shrink-0">{formatDate(r.receivedAt)}</span>
                  </div>
                  <div className="text-sm text-neutral-900 truncate">{r.subject || '(no subject)'}</div>
                  <p className="text-xs text-neutral-600 line-clamp-2 mt-0.5">{r.snippet}</p>
                </div>
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${r.threadId}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0 mt-1"
                >
                  <ExternalLink className="w-3 h-3" /> Gmail
                </a>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RepliesView;
