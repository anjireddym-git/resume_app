import React, { useEffect, useState } from 'react';
import {
  Loader2, ExternalLink, Send, BellOff, AlertTriangle, Paperclip,
  Clock, Sparkles, RefreshCw, Inbox, CheckCircle2, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getRepliesForApplication,
  markReplySeen,
  snoozeFollowUp,
  setFollowUpEnabled,
  recordFollowUpSent,
  getUserSettings,
} from '../../services/resumeService';
import { geminiService } from '../../services/geminiService';
import { sendGmail, GmailAuthError } from '../../services/gmailService';

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const SentDetailPanel = ({ user, application, onChange }) => {
  const { ensureGmailAccess } = useAuth();
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState(null); // { subject, body }
  const [drafting, setDrafting] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    getUserSettings(user.uid).then(setSettings).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (!application?.id) return;
    setLoadingReplies(true);
    getRepliesForApplication(application.id)
      .then((rs) => {
        setReplies(rs);
        // mark unread as seen
        rs.filter((r) => !r.seenAt).forEach((r) => markReplySeen(application.id, r.id).catch(() => {}));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingReplies(false));
    setDraft(null);
  }, [application?.id]);

  const handleDraftFollowUp = async () => {
    setDrafting(true); setError('');
    try {
      const sinceDays = Math.max(1, Math.floor((Date.now() - (application.sentAt?.toMillis?.() || Date.now())) / 86400000));
      const d = await geminiService.draftFollowUpEmail(
        { subject: application.subject, body: application.body },
        application.jobDescription || '',
        null,
        sinceDays,
      );
      let body = d.body || '';
      if (settings?.signature && !body.includes(settings.signature)) {
        body = `${body.trimEnd()}\n\n—\n${settings.signature}\n`;
      }
      setDraft({ subject: d.subject || `Re: ${application.subject}`, body });
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to draft follow-up.');
    } finally { setDrafting(false); }
  };

  const handleSendFollowUp = async () => {
    if (!draft) return;
    setBusy(true); setError('');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: false });
      await sendGmail({
        accessToken,
        fromEmail: user.email,
        fromName: user.displayName || undefined,
        to: application.recipientEmail,
        cc: application.cc || [],
        bcc: application.bcc || [],
        subject: draft.subject,
        body: draft.body,
        threadId: application.gmailThreadId,
        inReplyTo: application.gmailMessageIdHeader,
      });
      await recordFollowUpSent(application.id);
      setDraft(null);
      if (onChange) onChange();
    } catch (err) {
      console.error(err);
      if (err instanceof GmailAuthError) setError('Gmail rejected the access token. Try again.');
      else setError(err.message || 'Failed to send follow-up.');
    } finally { setBusy(false); }
  };

  const handleSnooze = async (days) => {
    try { await snoozeFollowUp(application.id, days); if (onChange) onChange(); }
    catch (e) { setError(e.message); }
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

  return (
    <div className="flex-1 overflow-y-auto p-5 lg:p-8 max-w-3xl">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" /> <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-neutral-900 break-words">{application.subject}</h2>
            <div className="text-xs text-neutral-500 mt-1">
              To <span className="text-neutral-900">{application.recipientName ? `${application.recipientName} <${application.recipientEmail}>` : application.recipientEmail}</span>
              {' · '}{formatDate(application.sentAt)}
            </div>
            {(application.cc?.length || 0) > 0 && <div className="text-xs text-neutral-500">Cc: {application.cc.join(', ')}</div>}
            {(application.bcc?.length || 0) > 0 && <div className="text-xs text-neutral-500">Bcc: {application.bcc.join(', ')}</div>}
          </div>
          <a
            href={`https://mail.google.com/mail/u/0/#sent/${application.gmailThreadId}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Gmail
          </a>
        </div>
        <pre className="text-sm text-neutral-800 whitespace-pre-wrap font-sans border-t border-neutral-100 pt-3">{application.body}</pre>
        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-600 p-2 bg-neutral-50 border border-neutral-200 rounded-lg">
          <Paperclip className="w-3.5 h-3.5" /> Resume DOCX attachment
        </div>
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

      {/* Replies */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5 mb-3">
          <Inbox className="w-4 h-4 text-neutral-400" /> Replies ({replies.length})
        </h3>
        {loadingReplies ? (
          <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-400 mx-auto" /></div>
        ) : replies.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500">
            No replies tracked yet. Enable reply tracking in Settings to be notified automatically.
          </div>
        ) : (
          <div className="space-y-2">
            {replies.map((r) => (
              <div key={r.id} className="p-3 border border-neutral-200 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-neutral-900 truncate">{r.subject || '(no subject)'}</div>
                    <div className="text-xs text-neutral-500 truncate">{r.from} · {formatDate(r.receivedAt)}</div>
                    <p className="text-xs text-neutral-700 mt-1.5">{r.snippet}</p>
                  </div>
                  <a
                    href={`https://mail.google.com/mail/u/0/#inbox/${r.threadId}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SentDetailPanel;
