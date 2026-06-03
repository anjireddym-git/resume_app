import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  Loader2, ExternalLink, Send, BellOff, AlertTriangle, Paperclip,
  Clock, Sparkles, RefreshCw, Mail, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { functions } from '../../lib/firebase';
import {
  getRepliesForApplication,
  getOutgoingMessagesForApplication,
  buildFollowUpDraftContext,
  markReplySeen,
  snoozeFollowUp,
  setFollowUpEnabled,
  recordFollowUpSent,
  getUserSettings,
  listEmailTemplates,
} from '../../services/resumeService';
import { geminiService } from '../../services/geminiService';
import { sendGmail, getMessageIdHeader, GmailAuthError } from '../../services/gmailService';
import { buildOutreachUserContext } from '../../services/outreachAiContext';

const fetchGmailHistoryFn = httpsCallable(functions, 'fetchGmailHistory');

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const toMillis = (ts) => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  const value = new Date(ts).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const cleanSnippet = (snippet = '') => String(snippet)
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .split(/\sOn .{0,300}wrote:\s/i)[0]
  .split(/\s-{2,}\s*Original Message\s*-{2,}/i)[0]
  .trim();

const initialsFor = (value = '') => {
  const parts = String(value).replace(/<.*?>/g, '').trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || '?').toUpperCase();
};

const SentDetailPanel = ({ user, application, refreshKey, onChange }) => {
  const { ensureGmailAccess } = useAuth();
  const [replies, setReplies] = useState([]);
  const [outgoingMessages, setOutgoingMessages] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshingThread, setRefreshingThread] = useState(false);

  const [draft, setDraft] = useState(null); // { subject, body }
  const [drafting, setDrafting] = useState(false);
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    Promise.all([getUserSettings(user.uid), listEmailTemplates(user.uid)])
      .then(([nextSettings, nextTemplates]) => {
        setSettings(nextSettings);
        setTemplates(nextTemplates);
      })
      .catch(() => {});
  }, [user?.uid]);

  const loadConversation = useCallback(async () => {
    if (!application?.id) return;
    setError('');
    setLoadingReplies(true);
    try {
      const [rs, sentMessages] = await Promise.all([
        getRepliesForApplication(application.id),
        getOutgoingMessagesForApplication(application.id).catch((err) => {
          // Keep the existing reply UI working before the outgoingMessages
          // Firestore rule is deployed. Follow-ups simply stay hidden until
          // that optional collection becomes readable.
          console.warn('Outgoing follow-up history unavailable:', err.message);
          return [];
        }),
      ]);
      setOutgoingMessages(sentMessages);
      setReplies(rs);
      // mark unread as seen
      rs.filter((r) => !r.seenAt).forEach((r) => markReplySeen(application.id, r.id).catch(() => {}));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingReplies(false);
    }
  }, [application?.id]);

  useEffect(() => {
    loadConversation();
    setDraft(null);
  }, [application?.id, loadConversation, refreshKey]);

  const handleDraftFollowUp = async () => {
    setDrafting(true); setError('');
    try {
      const context = buildFollowUpDraftContext(application, replies, outgoingMessages);
      const d = await geminiService.draftFollowUpEmail(
        context,
        application.jobDescription || '',
        null,
        buildOutreachUserContext(settings),
      );
      let body = d.body || '';
      if (settings?.signature && !body.includes(settings.signature)) {
        body = `${body.trimEnd()}\n\n—\n${settings.signature}\n`;
      }
      setDraft({ subject: d.subject || `Re: ${application.subject}`, body, latestMessageIdHeader: context.latestMessageIdHeader });
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to draft follow-up.');
    } finally { setDrafting(false); }
  };

  const handleSendFollowUp = async () => {
    if (!draft) return;
    setBusy(true); setError('');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: false });
      const sendResp = await sendGmail({
        accessToken,
        fromEmail: user.email,
        fromName: user.displayName || undefined,
        to: application.recipientEmail,
        cc: application.cc || [],
        bcc: application.bcc || [],
        subject: draft.subject,
        body: draft.body,
        threadId: application.gmailThreadId,
        inReplyTo: draft.latestMessageIdHeader || application.gmailMessageIdHeader,
      });
      const messageIdHeader = await getMessageIdHeader(accessToken, sendResp.id);
      await recordFollowUpSent(application.id, {
        gmailMessageId: sendResp.id,
        gmailMessageIdHeader: messageIdHeader,
        gmailThreadId: sendResp.threadId,
        from: user.email,
        to: application.recipientEmail,
        cc: application.cc || [],
        bcc: application.bcc || [],
        subject: draft.subject,
        body: draft.body,
      });
      await loadConversation();
      setDraft(null);
      if (onChange) onChange();
    } catch (err) {
      console.error(err);
      if (err instanceof GmailAuthError) setError('Gmail rejected the access token. Try again.');
      else setError(err.message || 'Failed to send follow-up.');
    } finally { setBusy(false); }
  };

  const applyTemplate = (templateId) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template || !draft) return;
    let body = template.body || draft.body;
    if (settings?.signature && !body.includes(settings.signature)) {
      body = `${body.trimEnd()}\n\n—\n${settings.signature}\n`;
    }
    setDraft({
      ...draft,
      subject: template.subject || draft.subject,
      body,
    });
  };

  const handleSnooze = async (days) => {
    try { await snoozeFollowUp(application.id, days); if (onChange) onChange(); }
    catch (e) { setError(e.message); }
  };

  const handleRefreshConversation = async () => {
    setRefreshingThread(true); setError('');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: true });
      await fetchGmailHistoryFn({ accessToken, backfillThreads: true });
      await loadConversation();
      if (onChange) onChange();
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to refresh Gmail thread.');
    } finally {
      setRefreshingThread(false);
    }
  };

  const handleStopReminders = async () => {
    try { await setFollowUpEnabled(application.id, false); if (onChange) onChange(); }
    catch (e) { setError(e.message); }
  };

  const handleEnableReminders = async () => {
    try { await setFollowUpEnabled(application.id, true); if (onChange) onChange(); }
    catch (e) { setError(e.message); }
  };

  const followUp = application.followUp || {};
  const conversation = useMemo(() => {
    const messages = [
      {
        id: `initial-${application.id}`,
        direction: 'outgoing',
        kind: 'initial',
        sender: user.displayName || user.email,
        recipient: application.recipientEmail,
        subject: application.subject,
        body: application.body,
        timestamp: application.sentAt,
        hasAttachment: true,
      },
      ...outgoingMessages.map((message) => ({
        id: message.id,
        direction: 'outgoing',
        kind: 'follow-up',
        sender: user.displayName || message.from || user.email,
        recipient: message.to || application.recipientEmail,
        subject: message.subject || `Re: ${application.subject}`,
        body: message.body || cleanSnippet(message.snippet),
        timestamp: message.sentAt,
      })),
      ...replies.map((reply) => ({
        id: reply.id,
        direction: 'incoming',
        kind: 'reply',
        sender: reply.from || application.recipientEmail,
        recipient: user.email,
        subject: reply.subject || `Re: ${application.subject}`,
        body: cleanSnippet(reply.body || reply.snippet),
        timestamp: reply.receivedAt,
      })),
    ];
    return messages.sort((a, b) => toMillis(a.timestamp) - toMillis(b.timestamp));
  }, [application, outgoingMessages, replies, user.displayName, user.email]);

  return (
    <div className="flex-1 overflow-y-auto p-5 lg:p-8 max-w-3xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" /> <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl mb-4 overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-neutral-200">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-neutral-900 break-words">{application.subject}</h2>
            <div className="text-xs text-neutral-500 mt-1">{conversation.length} messages in this thread</div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleRefreshConversation}
              disabled={refreshingThread}
              className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingThread ? 'animate-spin' : ''}`} /> Refresh thread
            </button>
            <a
              href={`https://mail.google.com/mail/u/0/#sent/${application.gmailThreadId}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Gmail
            </a>
          </div>
        </div>
        {loadingReplies ? (
          <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400 mx-auto" /></div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {conversation.map((message) => (
              <article key={message.id} className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    message.direction === 'incoming'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {initialsFor(message.sender)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-900">{message.sender}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            message.direction === 'incoming'
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
                            {message.kind === 'reply' ? 'Reply' : message.kind === 'follow-up' ? 'Follow-up sent' : 'Sent'}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          to {message.recipient || 'recipient'}
                        </div>
                      </div>
                      <time className="text-xs text-neutral-400 whitespace-nowrap">{formatDate(message.timestamp)}</time>
                    </div>
                    <pre className="text-sm text-neutral-800 whitespace-pre-wrap font-sans mt-3 leading-6">{message.body || '(No preview available)'}</pre>
                    {message.hasAttachment ? (
                      <div className="mt-3 flex items-center gap-2 text-xs text-neutral-600 px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg">
                        <Paperclip className="w-3.5 h-3.5" /> Resume DOCX attachment
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Follow-up controls */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-neutral-400" /> Follow-up
          </h3>
          <div className="text-xs text-neutral-500">
            {followUp.enabled ? (
              followUp.suppressedReason ? `Suppressed (${followUp.suppressedReason})` :
              `Sent ${followUp.sentCount || 0}/${followUp.maxFollowUps || 3}`
            ) : 'Disabled'}
          </div>
        </div>

        {!draft ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDraftFollowUp}
              disabled={drafting}
              className="h-9 px-3 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {drafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Draft follow-up
            </button>
            <button onClick={() => handleSnooze(3)} className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">
              Snooze 3 days
            </button>
            <button onClick={() => handleSnooze(7)} className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">
              Snooze 1 week
            </button>
            {followUp.enabled ? (
              <button onClick={handleStopReminders} className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50 flex items-center gap-1">
                <BellOff className="w-3.5 h-3.5" /> Stop reminders
              </button>
            ) : (
              <button onClick={handleEnableReminders} className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-xs hover:bg-neutral-50">
                Re-enable reminders
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {templates.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyTemplate(e.target.value);
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
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="w-full h-44 p-3 text-sm border border-neutral-200 rounded-lg font-mono resize-none focus:outline-none focus:border-neutral-400"
            />
            <div className="flex items-center justify-between">
              <button onClick={handleDraftFollowUp} disabled={drafting} className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50">
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
              <div className="flex gap-2">
                <button onClick={() => setDraft(null)} className="h-9 px-3 text-neutral-700 rounded-lg text-xs hover:bg-neutral-100">
                  Discard
                </button>
                <button
                  onClick={handleSendFollowUp}
                  disabled={busy}
                  className="h-9 px-3 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send in same thread
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {replies.length === 0 && !loadingReplies ? (
        <div className="text-xs text-neutral-500 flex items-center gap-1.5 px-1">
          <Mail className="w-3.5 h-3.5" /> No recruiter replies tracked yet.
        </div>
      ) : null}
    </div>
  );
};

export default SentDetailPanel;
