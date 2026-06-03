import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Send, Search, ExternalLink, Mail, Paperclip, Inbox,
  Sparkles, AlertTriangle, ChevronLeft,
} from 'lucide-react';
import {
  getSentApplications,
  getSentApplication,
} from '../../services/resumeService';
import SentDetailPanel from './SentDetailPanel';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'awaiting_reply', label: 'Awaiting' },
  { id: 'follow_up_due', label: 'Due' },
  { id: 'replied', label: 'Replied' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'closed', label: 'Closed' },
  { id: 'missing_insights', label: 'Missing insights' },
];

const STATUS_META = {
  awaiting_reply: { label: 'Awaiting reply', tone: 'bg-neutral-100 text-neutral-600' },
  follow_up_due: { label: 'Follow-up due', tone: 'bg-amber-100 text-amber-700' },
  replied: { label: 'Replied', tone: 'bg-emerald-100 text-emerald-700' },
  interviewing: { label: 'Interviewing', tone: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Rejected', tone: 'bg-red-100 text-red-700' },
  closed: { label: 'Closed', tone: 'bg-neutral-200 text-neutral-700' },
  archived: { label: 'Archived', tone: 'bg-neutral-100 text-neutral-500' },
};

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

const toMillis = (ts) => {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  const value = new Date(ts).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const hasInsights = (app) => !!(app.jdAnalysis && app.resumeDiff && app.interviewPrep);

const deriveStatus = (app) => {
  if (app.pipelineStatusOverride && STATUS_META[app.pipelineStatusOverride]) {
    return { id: app.pipelineStatusOverride, ...STATUS_META[app.pipelineStatusOverride] };
  }
  if (['replied', 'interviewing', 'rejected', 'closed', 'archived'].includes(app.pipelineStatus)) {
    return { id: app.pipelineStatus, ...STATUS_META[app.pipelineStatus] };
  }
  if (app.replyInsights?.category === 'rejection') return { id: 'rejected', ...STATUS_META.rejected };
  if ((app.replyCount || 0) > 0) return { id: 'replied', ...STATUS_META.replied };
  const dueAt = toMillis(app.followUp?.nextDueAt);
  if (app.followUp?.enabled && !app.followUp?.suppressedReason && dueAt && dueAt <= Date.now()) {
    return { id: 'follow_up_due', ...STATUS_META.follow_up_due };
  }
  return { id: 'awaiting_reply', ...STATUS_META.awaiting_reply };
};

const SentView = ({ user, selectedAppId, refreshKey, onSelect, onCompose }) => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true); setError('');
    try {
      const list = await getSentApplications(user.uid, 200);
      setApps(list);
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to load sent applications.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.uid, refreshKey]);

  useEffect(() => {
    if (!selectedAppId) { setSelectedApp(null); return; }
    setLoadingDetail(true);
    getSentApplication(selectedAppId)
      .then(setSelectedApp)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingDetail(false));
  }, [selectedAppId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((a) => {
      if (filter === 'missing_insights') {
        if (hasInsights(a)) return false;
      } else if (filter !== 'all') {
        const s = deriveStatus(a).id;
        if (s !== filter) return false;
      }
      if (!q) return true;
      return (a.subject || '').toLowerCase().includes(q)
        || (a.recipientEmail || '').toLowerCase().includes(q)
        || (a.recipientName || '').toLowerCase().includes(q)
        || (a.jdAnalysis?.roleTitle || '').toLowerCase().includes(q)
        || (a.jdAnalysis?.company || '').toLowerCase().includes(q);
    });
  }, [apps, filter, query]);

  const stats = useMemo(() => {
    const base = {
      all: apps.length,
      awaiting_reply: 0,
      follow_up_due: 0,
      replied: 0,
      interviewing: 0,
      rejected: 0,
      missing_insights: 0,
    };
    apps.forEach((app) => {
      const status = deriveStatus(app).id;
      if (Object.prototype.hasOwnProperty.call(base, status)) base[status] += 1;
      if (!hasInsights(app)) base.missing_insights += 1;
    });
    return base;
  }, [apps]);

  if (apps.length === 0 && !loading) {
    return (
      <div className="max-w-3xl mx-auto p-12 text-center">
        <Send className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
        <h2 className="text-lg font-semibold text-neutral-900">No outreach yet</h2>
        <p className="text-sm text-neutral-500 mt-1">Start by composing your first recruiter email.</p>
        <button
          onClick={onCompose}
          className="mt-4 h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Compose outreach
        </button>
      </div>
    );
  }

  // Detail view (mobile: takes over; desktop: side-by-side)
  return (
    <div className="h-full flex">
      {/* List pane */}
      <div className={`${selectedApp ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-96 border-r border-neutral-200 bg-white`}>
        <div className="p-4 border-b border-neutral-200 space-y-3">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Application CRM</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Outreach emails and reply follow-up pipeline.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Sent', stats.all],
              ['Awaiting', stats.awaiting_reply],
              ['Due', stats.follow_up_due],
              ['Replied', stats.replied],
              ['Interview', stats.interviewing],
              ['Rejected', stats.rejected],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">{label}</div>
                <div className="text-lg font-semibold text-neutral-900">{value}</div>
              </div>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject, recipient, role…"
              className="w-full h-9 pl-8 pr-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 text-xs rounded-full border ${
                  filter === f.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" /> <span>{error}</span>
            </div>
          )}
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-neutral-500">No matches.</div>
          ) : (
            filtered.map((a) => {
              const status = deriveStatus(a);
              const active = selectedAppId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => onSelect(a.id)}
                  className={`w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 ${active ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-neutral-500 truncate">{a.recipientEmail}</span>
                    <span className="text-[11px] text-neutral-400 flex-shrink-0">{formatDate(a.sentAt)}</span>
                  </div>
                  <div className="text-sm font-medium text-neutral-900 truncate">{a.subject || '(no subject)'}</div>
                  <div className="text-xs text-neutral-500 truncate mt-0.5">
                    {a.jdAnalysis?.roleTitle || 'Role not parsed'}
                    {a.jdAnalysis?.company ? ` · ${a.jdAnalysis.company}` : ''}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.tone}`}>{status.label}</span>
                    {!hasInsights(a) && (
                      <span className="text-[10px] text-amber-600">Needs insights</span>
                    )}
                    {(a.replyCount || 0) > 0 && (
                      <span className="text-[10px] text-neutral-500 flex items-center gap-0.5">
                        <Inbox className="w-3 h-3" />{a.replyCount}
                      </span>
                    )}
                    {(a.followUp?.sentCount || 0) > 0 && (
                      <span className="text-[10px] text-neutral-500">F/U {a.followUp.sentCount}</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className={`${selectedApp ? 'flex' : 'hidden lg:flex'} flex-col flex-1 bg-neutral-50`}>
        {selectedApp ? (
          <>
            <div className="lg:hidden p-3 border-b border-neutral-200 bg-white">
              <button onClick={() => onSelect(null)} className="text-sm text-neutral-600 hover:text-neutral-900 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
            <SentDetailPanel
              user={user}
              application={selectedApp}
              refreshKey={refreshKey}
              onChange={() => {
                // refresh list and detail
                load();
                getSentApplication(selectedApp.id).then(setSelectedApp).catch(() => {});
              }}
            />
          </>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
            <Mail className="w-12 h-12 mb-3" />
            <p className="text-sm">Select an application to see the email, replies, and follow-up options.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentView;
