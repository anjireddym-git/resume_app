import React, { useEffect, useState } from 'react';
import { X, Loader2, Bell, Send, Clock, AlertTriangle, BellOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUnseenNotifications,
  markNotificationSeen,
  getSentApplication,
  getFollowUpDraftContext,
  snoozeFollowUp,
  setFollowUpEnabled,
  recordFollowUpSent,
  getUserSettings,
} from '../services/resumeService';
import { geminiService } from '../services/geminiService';
import { sendGmail, getMessageIdHeader, GmailAuthError } from '../services/gmailService';
import { buildOutreachUserContext } from '../services/outreachAiContext';

/**
 * FollowUpDashboard: shows follow-up reminders created by the scanDueFollowUps
 * scheduled Cloud Function. Each row lets the user draft an AI follow-up and
 * send it back into the same Gmail thread (uses In-Reply-To + threadId).
 */
const FollowUpDashboard = ({ isOpen, onClose }) => {
  const { user, ensureGmailAccess } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [settings, setSettings] = useState(null);

  // Per-item draft / preview state.
  const [drafts, setDrafts] = useState({}); // { [notificationId]: { subject, body } }

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError('');
    try {
      const [ns, nextSettings] = await Promise.all([
        getUnseenNotifications(user.uid, 100),
        getUserSettings(user.uid).catch(() => null),
      ]);
      const followUps = ns.filter((n) => n.type === 'follow-up-due');
      setItems(followUps);
      setSettings(nextSettings);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(); /* eslint-disable-next-line */ }, [isOpen]);

  const handleDraft = async (notif) => {
    setBusyId(notif.id);
    setError('');
    try {
      const app = await getSentApplication(notif.sentApplicationId);
      const context = await getFollowUpDraftContext(app);
      const draft = await geminiService.draftFollowUpEmail(
        context,
        app.jobDescription || '',
        null,
        buildOutreachUserContext(settings),
      );
      setDrafts((d) => ({ ...d, [notif.id]: {
        subject: draft.subject,
        body: draft.body,
        app,
        latestMessageIdHeader: context.latestMessageIdHeader,
      } }));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to draft follow-up.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSend = async (notif) => {
    const draft = drafts[notif.id];
    if (!draft) return;
    const { app } = draft;
    setBusyId(notif.id);
    setError('');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: false });
      const sendResp = await sendGmail({
        accessToken,
        fromEmail: user.email,
        fromName: user.displayName || undefined,
        to: app.recipientEmail,
        cc: app.cc || [],
        bcc: app.bcc || [],
        subject: draft.subject,
        body: draft.body,
        threadId: app.gmailThreadId,
        inReplyTo: draft.latestMessageIdHeader || app.gmailMessageIdHeader,
      });
      const messageIdHeader = await getMessageIdHeader(accessToken, sendResp.id);
      await recordFollowUpSent(notif.sentApplicationId, {
        gmailMessageId: sendResp.id,
        gmailMessageIdHeader: messageIdHeader,
        gmailThreadId: sendResp.threadId,
        from: user.email,
        to: app.recipientEmail,
        cc: app.cc || [],
        bcc: app.bcc || [],
        subject: draft.subject,
        body: draft.body,
      });
      await markNotificationSeen(notif.id);
      setItems((arr) => arr.filter((x) => x.id !== notif.id));
      setDrafts((d) => { const { [notif.id]: _, ...rest } = d; return rest; });
    } catch (err) {
      console.error(err);
      if (err instanceof GmailAuthError) {
        setError('Gmail rejected the access token. Try again and approve the permission prompt.');
      } else {
        setError(err.message || 'Failed to send follow-up.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleSnooze = async (notif, days = 3) => {
    try {
      await snoozeFollowUp(notif.sentApplicationId, days);
      await markNotificationSeen(notif.id);
      setItems((arr) => arr.filter((x) => x.id !== notif.id));
    } catch (err) { setError(err.message || 'Snooze failed.'); }
  };

  const handleStop = async (notif) => {
    try {
      await setFollowUpEnabled(notif.sentApplicationId, false);
      await markNotificationSeen(notif.id);
      setItems((arr) => arr.filter((x) => x.id !== notif.id));
    } catch (err) { setError(err.message || 'Failed to disable reminders.'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Follow-up Reminders</h2>
              <p className="text-xs text-neutral-500">Applications that haven't received a reply</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" /> <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-300 mb-2" />
              No follow-ups due. We'll notify you when an application has gone unanswered.
            </div>
          ) : (
            items.map((n) => {
              const draft = drafts[n.id];
              const isBusy = busyId === n.id;
              return (
                <div key={n.id} className="p-3 border border-neutral-200 rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 truncate">{n.subject || '(no subject)'}</p>
                      <p className="text-xs text-neutral-500 truncate">to {n.recipientEmail}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="w-3.5 h-3.5" /> due
                    </div>
                  </div>

                  {!draft ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDraft(n)}
                        disabled={isBusy}
                        className="h-8 px-3 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Draft follow-up
                      </button>
                      <button onClick={() => handleSnooze(n, 3)} className="h-8 px-3 border border-neutral-200 text-neutral-700 rounded text-xs hover:bg-neutral-50">
                        Snooze 3 days
                      </button>
                      <button onClick={() => handleStop(n)} className="h-8 px-3 border border-neutral-200 text-neutral-700 rounded text-xs hover:bg-neutral-50 flex items-center gap-1">
                        <BellOff className="w-3.5 h-3.5" /> Stop reminders
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 border-t border-neutral-100 pt-2">
                      <input
                        value={draft.subject}
                        onChange={(e) => setDrafts((d) => ({ ...d, [n.id]: { ...d[n.id], subject: e.target.value } }))}
                        className="w-full h-8 px-2 text-sm border border-neutral-200 rounded"
                      />
                      <textarea
                        value={draft.body}
                        onChange={(e) => setDrafts((d) => ({ ...d, [n.id]: { ...d[n.id], body: e.target.value } }))}
                        className="w-full h-32 p-2 text-sm border border-neutral-200 rounded font-mono resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setDrafts((d) => { const { [n.id]: _, ...rest } = d; return rest; })}
                          className="h-8 px-3 text-neutral-600 text-xs hover:bg-neutral-100 rounded"
                        >
                          Discard
                        </button>
                        <button
                          onClick={() => handleSend(n)}
                          disabled={isBusy}
                          className="h-8 px-3 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Send in same thread
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowUpDashboard;
