import { useEffect, useState } from 'react';
import {
  collection,
  collectionGroup,
  doc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Live counts surfaced on the Outreach tab badge + sub-nav rows.
 *   - unseenReplies: replies subdocs with seenAt == null for this user's apps
 *   - dueFollowUps:  notifications type='follow-up-due' unseen
 *
 * Collection-group queries can't filter by a parent's userId server-side, so we
 * subscribe to the user's sentApplication ids (live) and filter replies client-
 * side.
 */
export default function useOutreachCounts() {
  const { user } = useAuth();
  const [unseenReplies, setUnseenReplies] = useState(0);
  const [dueFollowUps, setDueFollowUps] = useState(0);
  const [preferences, setPreferences] = useState({
    notifyOnReply: true,
    notifyOnFollowUpDue: true,
  });

  // Notification settings control badges without hiding the underlying
  // Follow-ups and Replies tabs.
  useEffect(() => {
    if (!user?.uid) return undefined;
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const settings = snap.data()?.outreachSettings || {};
      setPreferences({
        notifyOnReply: settings.notifyOnReply !== false,
        notifyOnFollowUpDue: settings.notifyOnFollowUpDue !== false,
      });
    });
  }, [user?.uid]);

  // follow-up-due notifications
  useEffect(() => {
    if (!user?.uid) { setDueFollowUps(0); return undefined; }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('seen', '==', false),
      where('type', '==', 'follow-up-due'),
    );
    return onSnapshot(q, (snap) => setDueFollowUps(snap.size), () => setDueFollowUps(0));
  }, [user?.uid]);

  // unseen replies: subscribe to user's sentApplication ids, then to all replies
  useEffect(() => {
    if (!user?.uid) { setUnseenReplies(0); return undefined; }
    let appIds = new Set();
    let allReplies = [];

    const recompute = () => {
      const count = allReplies.filter(
        (r) => !r.seenAt && appIds.has(r.parentId),
      ).length;
      setUnseenReplies(count);
    };

    const appsQ = query(
      collection(db, 'sentApplications'),
      where('userId', '==', user.uid),
    );
    const unsubApps = onSnapshot(appsQ, (snap) => {
      appIds = new Set(snap.docs.map((d) => d.id));
      recompute();
    });

    const repliesQ = query(
      collectionGroup(db, 'replies'),
      where('userId', '==', user.uid),
    );
    const unsubReplies = onSnapshot(
      repliesQ,
      (snap) => {
        allReplies = snap.docs.map((d) => ({
          id: d.id,
          parentId: d.ref.parent.parent?.id,
          seenAt: d.data().seenAt || null,
        }));
        recompute();
      },
      () => setUnseenReplies(0),
    );

    return () => { unsubApps(); unsubReplies(); };
  }, [user?.uid]);

  const visibleReplies = preferences.notifyOnReply ? unseenReplies : 0;
  const visibleFollowUps = preferences.notifyOnFollowUpDue ? dueFollowUps : 0;
  return {
    unseenReplies: visibleReplies,
    dueFollowUps: visibleFollowUps,
    total: visibleReplies + visibleFollowUps,
  };
}
