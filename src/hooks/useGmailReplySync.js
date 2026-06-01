import { useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const fetchGmailHistoryFn = httpsCallable(functions, 'fetchGmailHistory');

/**
 * Consume Gmail Pub/Sub markers while any Outreach view is open.
 *
 * The Cloud Function stores the newest notification as pendingHistoryFetch.
 * History must still be fetched from the previously stored historyId so the
 * message that triggered the push is included.
 */
export default function useGmailReplySync(onSynced) {
  const { user, googleAccessToken, hasGmailReadScope } = useAuth();
  const inFlightRef = useRef(null);
  const completedRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return undefined;

    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const pendingHistoryId = snap.data()?.gmailWatch?.pendingHistoryFetch || null;
      if (!pendingHistoryId || pendingHistoryId === inFlightRef.current || pendingHistoryId === completedRef.current) return;

      // Never open an OAuth popup from a background listener. Manual Refresh
      // remains available when the current browser session lacks a read token.
      if (!googleAccessToken || !hasGmailReadScope) return;

      inFlightRef.current = pendingHistoryId;
      fetchGmailHistoryFn({ accessToken: googleAccessToken })
        .then(() => {
          completedRef.current = pendingHistoryId;
          if (onSynced) onSynced();
        })
        .catch((err) => console.warn('Automatic Gmail reply sync failed:', err.message))
        .finally(() => {
          inFlightRef.current = null;
        });
    }, (err) => console.warn('Gmail reply marker listener failed:', err.message));
  }, [googleAccessToken, hasGmailReadScope, onSynced, user?.uid]);
}
