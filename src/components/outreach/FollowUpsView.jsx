import React, { useEffect, useState } from 'react';
import { Loader2, Bell, Send, Clock, AlertTriangle, BellOff, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToUnseenNotifications,
  markNotificationSeen,
  getSentApplication,
  getFollowUpDraftContext,
  snoozeFollowUp,
  setFollowUpEnabled,
  recordFollowUpSent,
  getUserSettings,
  listEmailTemplates,
} from '../../services/resumeService';
import { geminiService } from '../../services/geminiService';
import { sendGmail, getMessageIdHeader, GmailAuthError } from '../../services/gmailService';
import { buildOutreachUserContext } from '../../services/outreachAiContext';

const FollowUpsView = ({ user, onOpenApplication }) => {
  const { ensureGmailAccess } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    setLoading(true); setError('');
    return subscribeToUnseenNotifications(
      user.uid,
      (ns) => {
        setItems(ns.filter((n) => n.type === 'follow-up-due'));
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to load follow-ups.');
        setLoading(false);
      },
      100,
    );
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid) return;
    Promise.all([getUserSettings(user.uid), listEmailTemplates(user.uid)])
      .then(([nextSettings, nextTemplates]) => {
        setSettings(nextSettings);
        setTemplates(nextTemplates);
      })
      .catch(() => {});
  }, [user?.uid]);

  const applyTemplate = (notificationId, templateId) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setDrafts((current) => {
      const draft = current[notificationId];
      if (!draft) return current;
      let body = template.body || draft.body;
      if (settings?.signature && !body.includes(settings.signature)) {
        body = `${body.trimEnd()}\n\n—\n${settings.signature}\n`;
      }
      return {
        ...current,
        [notificationId]: {
          ...draft,
          subject: template.subject || draft.subject,
          body,
        },
      };
    });
  };

  const handleDraft = async (notif) => {
    setBusyId(notif.id); setError('');
    try {
      const app = await getSentApplication(notif.sentApplicationId);
      const context = await getFollowUpDraftContext(app);
      const draft = await geminiService.draftFollowUpEmail(
        context,
        app.jobDescription || '',
        null,
        buildOutreachUserContext(settings),
      );
      let body = draft.body || '';
      if (settings?.signature && !body.includes(settings.signature)) {
        body = `${body.trimEnd()}\n\n—\n${settings.signature}\n`;
      }
      setDrafts((d) => ({ ...d, [notif.id]: {
        subject: draft.subject,
        body,
        app,
        latestMessageIdHeader: context.latestMessageIdHeader,
      } }));
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to draft follow-up.');
    } finally { setBusyId(null); }
  };

  const handleSend = async (notif) => {
    const draft = drafts[notif.id]; if (!draft) return;
    const { app } = draft;
    setBusyId(notif.id); setError('');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: false });
      const sendResp = await sendGmail({
        accessToken,
        fromEmail: user.email,
        fromName: user.displayName || undefined,
        to: app.recipientEmail,
        cc: app.cc || [], bcc: app.bcc || [],
        subject: draft.subject, body: draft.body,
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
      if (err instanceof GmailAuthError) setError('Gmail rejected the access token. Try again.');
      else setError(err.message || 'Failed to send follow-up.');
    } finally { setBusyId(null); }
  };

  const handleSnooze = async (notif, days = 3) => {
    try {
      await snoozeFollowUp(notif.sentApplicationId, days);
      await markNotificationSeen(notif.id);
      setItems((arr) => arr.filter((x) => x.id !== notif.id));
    } catch (err) { setError(err.message); }
  };

  const handleStop = async (notif) => {
    try {
      await setFollowUpEnabled(notif.sentApplicationId, false);
      await markNotificationSeen(notif.id);
      setItems((arr) => arr.filter((x) => x.id !== notif.id));
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Follow-ups ({items.length})</h1>
          <p className="text-sm text-neutral-500 mt-1">Applications that haven't received a reply.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl py-16 text-center text-sm text-neutral-500">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
          No follow-ups due. We'll notify you when an application has gone unanswered.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const draft = drafts[n.id];
            const isBusy = busyId === n.id;
            return (
              <div key={n.id} className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 truncate">{n.subject || '(no subject)'}</p>
                    <p className="text-xs text-neutral-500 truncate">to {n.recipientEmail}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-600 flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" /> due
                  </div>
                </div>

                {!draft ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDraft(n)} disabled={isBusy}
                      className="h-8 px-3 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Draft follow-up
                    </button>
                    <button onClick={() => onOpenApplication && onOpenApplication(n.sentApplicationId)} className="h-8 px-3 border border-neutral-200 text-neutral-700 rounded text-xs hover:bg-neutral-50 flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </button>
                    <button onClick={() => handleSnooze(n, 3)} className="h-8 px-3 border border-neutral-200 text-neutral-700 rounded text-xs hover:bg-neutral-50">
                      Snooze 3 days
                    </button>
                    <button onClick={() => handleStop(n)} className="h-8 px-3 border border-neutral-200 text-neutral-700 rounded text-xs hover:bg-neutral-50 flex items-center gap-1">
                      <BellOff className="w-3.5 h-3.5" /> Stop
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 border-t border-neutral-100 pt-3">
                    {templates.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) applyTemplate(n.id, e.target.value);
                          e.target.value = '';
                        }}
                        className="h-8 px-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                      >
                        <option value="">Insert template...</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>{template.name}</option>
                        ))}
                      </select>
                    )}
                    <input
                      value={draft.subject}
                      onChange={(e) => setDrafts((d) => ({ ...d, [n.id]: { ...d[n.id], subject: e.target.value } }))}
                      className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg"
                    />
                    <textarea
                      value={draft.body}
                      onChange={(e) => setDrafts((d) => ({ ...d, [n.id]: { ...d[n.id], body: e.target.value } }))}
                      className="w-full h-40 p-3 text-sm border border-neutral-200 rounded-lg font-mono resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDrafts((d) => { const { [n.id]: _, ...rest } = d; return rest; })}
                        className="h-9 px-3 text-neutral-700 text-xs hover:bg-neutral-100 rounded"
                      >
                        Discard
                      </button>
                      <button
                        onClick={() => handleSend(n)} disabled={isBusy}
                        className="h-9 px-3 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send in same thread
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FollowUpsView;
