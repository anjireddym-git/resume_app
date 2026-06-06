import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Send, Clock, AlertTriangle, BellOff, CheckCircle2, Sparkles, ExternalLink, Bell,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToUnseenNotifications,
  markNotificationSeen,
  markFollowUpNotificationsSeenForApplication,
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

const REMINDER_SUBSCRIPTION_LIMIT = 2000;
const REMINDER_CLEANUP_LIMIT = 5000;

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const millis = new Date(value).getTime();
  return Number.isNaN(millis) ? 0 : millis;
};

const formatDueLabel = (value) => {
  const millis = toMillis(value);
  if (!millis) return 'due';
  const diffDays = Math.floor((Date.now() - millis) / 86400000);
  if (diffDays <= 0) return 'due today';
  if (diffDays === 1) return '1d overdue';
  return `${diffDays}d overdue`;
};

const groupFollowUpNotifications = (notifications) => {
  const groupsByApplication = new Map();

  notifications.forEach((notification) => {
    const sentApplicationId = notification.sentApplicationId || notification.id;
    const existing = groupsByApplication.get(sentApplicationId);
    const createdAtMillis = toMillis(notification.createdAt);
    const dueAtMillis = toMillis(notification.dueAt);

    if (!existing) {
      groupsByApplication.set(sentApplicationId, {
        id: sentApplicationId,
        sentApplicationId,
        subject: notification.subject || '(no subject)',
        recipientEmail: notification.recipientEmail || '',
        dueAt: notification.dueAt || notification.createdAt,
        dueAtMillis: dueAtMillis || createdAtMillis,
        latestCreatedAtMillis: createdAtMillis,
        notifications: [notification],
      });
      return;
    }

    existing.notifications.push(notification);
    if (dueAtMillis && (!existing.dueAtMillis || dueAtMillis < existing.dueAtMillis)) {
      existing.dueAt = notification.dueAt;
      existing.dueAtMillis = dueAtMillis;
    }
    if (createdAtMillis >= existing.latestCreatedAtMillis) {
      existing.latestCreatedAtMillis = createdAtMillis;
      existing.subject = notification.subject || existing.subject;
      existing.recipientEmail = notification.recipientEmail || existing.recipientEmail;
    }
  });

  return [...groupsByApplication.values()]
    .map((group) => ({
      ...group,
      reminderCount: group.notifications.length,
    }))
    .sort((a, b) => {
      if (a.dueAtMillis && b.dueAtMillis && a.dueAtMillis !== b.dueAtMillis) {
        return a.dueAtMillis - b.dueAtMillis;
      }
      return b.latestCreatedAtMillis - a.latestCreatedAtMillis;
    });
};

const FollowUpsView = ({ user, onOpenApplication }) => {
  const { ensureGmailAccess } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);

  const groups = useMemo(() => groupFollowUpNotifications(notifications), [notifications]);
  const foldedReminderCount = Math.max(0, notifications.length - groups.length);
  const activeDraftCount = Object.keys(drafts).length;

  useEffect(() => {
    if (!user?.uid) return undefined;
    setLoading(true);
    setError('');
    return subscribeToUnseenNotifications(
      user.uid,
      (nextNotifications) => {
        setNotifications(nextNotifications.filter((notification) => notification.type === 'follow-up-due'));
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to load follow-ups.');
        setLoading(false);
      },
      REMINDER_SUBSCRIPTION_LIMIT,
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

  const clearReminderGroup = async (group) => {
    try {
      await markFollowUpNotificationsSeenForApplication(
        user.uid,
        group.sentApplicationId,
        REMINDER_CLEANUP_LIMIT,
      );
    } catch (err) {
      console.warn('Grouped follow-up cleanup fell back to visible notifications:', err.message);
      await Promise.all(
        group.notifications.map((notification) => markNotificationSeen(notification.id).catch(() => null)),
      );
    }
    setNotifications((current) => current.filter(
      (notification) => (notification.sentApplicationId || notification.id) !== group.sentApplicationId,
    ));
  };

  const applyTemplate = (groupId, templateId) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setDrafts((current) => {
      const draft = current[groupId];
      if (!draft) return current;
      let body = template.body || draft.body;
      if (settings?.signature && !body.includes(settings.signature)) {
        body = `${body.trimEnd()}\n\n—\n${settings.signature}\n`;
      }
      return {
        ...current,
        [groupId]: {
          ...draft,
          subject: template.subject || draft.subject,
          body,
        },
      };
    });
  };

  const handleDraft = async (group) => {
    if (!group.sentApplicationId) return;
    setBusyId(group.id);
    setError('');
    try {
      const app = await getSentApplication(group.sentApplicationId);
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
      setDrafts((current) => ({
        ...current,
        [group.id]: {
          subject: draft.subject,
          body,
          app,
          latestMessageIdHeader: context.latestMessageIdHeader,
        },
      }));
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to draft follow-up.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSend = async (group) => {
    const draft = drafts[group.id];
    if (!draft) return;
    const { app } = draft;
    setBusyId(group.id);
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
      await recordFollowUpSent(group.sentApplicationId, {
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
      await clearReminderGroup(group);
      setDrafts((current) => {
        const { [group.id]: _, ...rest } = current;
        return rest;
      });
    } catch (err) {
      console.error(err);
      if (err instanceof GmailAuthError) setError('Gmail rejected the access token. Try again.');
      else setError(err.message || 'Failed to send follow-up.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSnooze = async (group, days = 3) => {
    setBusyId(group.id);
    setError('');
    try {
      await snoozeFollowUp(group.sentApplicationId, days);
      await clearReminderGroup(group);
      setDrafts((current) => {
        const { [group.id]: _, ...rest } = current;
        return rest;
      });
    } catch (err) {
      setError(err.message || 'Failed to snooze follow-up.');
    } finally {
      setBusyId(null);
    }
  };

  const handleStop = async (group) => {
    setBusyId(group.id);
    setError('');
    try {
      await setFollowUpEnabled(group.sentApplicationId, false);
      await clearReminderGroup(group);
      setDrafts((current) => {
        const { [group.id]: _, ...rest } = current;
        return rest;
      });
    } catch (err) {
      setError(err.message || 'Failed to stop follow-ups.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Follow-ups</h1>
          <p className="text-sm text-neutral-500 mt-1">{groups.length} applications need a decision.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-neutral-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Bell className="w-4 h-4 text-blue-500" />
            Due applications
          </div>
          <div className="mt-1 text-2xl font-semibold text-neutral-900">{groups.length}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Clock className="w-4 h-4 text-amber-500" />
            Folded reminders
          </div>
          <div className="mt-1 text-2xl font-semibold text-neutral-900">{foldedReminderCount}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Drafts open
          </div>
          <div className="mt-1 text-2xl font-semibold text-neutral-900">{activeDraftCount}</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl py-16 text-center text-sm text-neutral-500">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
          No follow-ups due.
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Queue</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Applications awaiting a follow-up.</p>
            </div>
            <div className="text-xs text-neutral-500">{notifications.length} reminder records</div>
          </div>

          <div className="divide-y divide-neutral-100">
            {groups.map((group) => {
              const draft = drafts[group.id];
              const isBusy = busyId === group.id;
              const sentCount = draft?.app?.followUp?.sentCount;
              const maxFollowUps = draft?.app?.followUp?.maxFollowUps;
              return (
                <div key={group.id} className="px-4 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-neutral-900 truncate max-w-full">
                          {group.subject || '(no subject)'}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDueLabel(group.dueAt)}
                        </span>
                        {group.reminderCount > 1 && (
                          <span className="text-xs text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">
                            {group.reminderCount} reminders
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                        <span className="truncate">to {group.recipientEmail || 'recipient unavailable'}</span>
                        {sentCount != null && maxFollowUps != null && (
                          <span>F/U {sentCount}/{maxFollowUps}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {!draft && (
                        <button
                          onClick={() => handleDraft(group)}
                          disabled={isBusy}
                          className="h-8 px-3 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          Draft
                        </button>
                      )}
                      <button
                        onClick={() => onOpenApplication && onOpenApplication(group.sentApplicationId)}
                        className="h-8 px-3 border border-neutral-200 text-neutral-700 rounded text-xs hover:bg-neutral-50 flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </button>
                      <button
                        onClick={() => handleSnooze(group, 3)}
                        disabled={isBusy}
                        className="h-8 px-3 border border-neutral-200 text-neutral-700 rounded text-xs hover:bg-neutral-50 disabled:opacity-50"
                      >
                        Snooze 3d
                      </button>
                      <button
                        onClick={() => handleStop(group)}
                        disabled={isBusy}
                        className="h-8 px-3 border border-neutral-200 text-neutral-700 rounded text-xs hover:bg-neutral-50 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <BellOff className="w-3.5 h-3.5" />
                        Stop
                      </button>
                    </div>
                  </div>

                  {draft && (
                    <div className="mt-3 border-t border-neutral-100 pt-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {templates.length > 0 ? (
                          <select
                            defaultValue=""
                            onChange={(event) => {
                              if (event.target.value) applyTemplate(group.id, event.target.value);
                              event.target.value = '';
                            }}
                            className="h-8 px-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                          >
                            <option value="">Insert template...</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>{template.name}</option>
                            ))}
                          </select>
                        ) : <span />}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDrafts((current) => {
                              const { [group.id]: _, ...rest } = current;
                              return rest;
                            })}
                            className="h-8 px-3 text-neutral-700 text-xs hover:bg-neutral-100 rounded"
                          >
                            Discard
                          </button>
                          <button
                            onClick={() => handleSend(group)}
                            disabled={isBusy}
                            className="h-8 px-3 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Send in thread
                          </button>
                        </div>
                      </div>
                      <input
                        value={draft.subject}
                        onChange={(event) => setDrafts((current) => ({
                          ...current,
                          [group.id]: { ...current[group.id], subject: event.target.value },
                        }))}
                        className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg"
                      />
                      <textarea
                        value={draft.body}
                        onChange={(event) => setDrafts((current) => ({
                          ...current,
                          [group.id]: { ...current[group.id], body: event.target.value },
                        }))}
                        className="w-full h-40 p-3 text-sm border border-neutral-200 rounded-lg font-mono resize-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUpsView;
