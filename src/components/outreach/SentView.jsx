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
  { id: 'all',      label: 'All' },
  { id: 'awaiting', label: 'Awaiting reply' },
  { id: 'replied',  label: 'Replied' },
  { id: 'followup', label: 'Follow-up due' },
];

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

const deriveStatus = (app) => {
  if ((app.replyCount || 0) > 0) return { id: 'replied', label: 'Replied', tone: 'bg-emerald-100 text-emerald-700' };
  if ((app.followUp?.sentCount || 0) > 0) return { id: 'followup', label: 'Follow-up sent', tone: 'bg-amber-100 text-amber-700' };
  return { id: 'awaiting', label: 'Awaiting reply', tone: 'bg-neutral-100 text-neutral-600' };
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
      if (filter !== 'all') {
        const s = deriveStatus(a).id;
        if (s !== filter) return false;
      }
      if (!q) return true;
      return (a.subject || '').toLowerCase().includes(q)
        || (a.recipientEmail || '').toLowerCase().includes(q)
        || (a.recipientName || '').toLowerCase().includes(q);
    });
  }, [apps, filter, query]);

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
        <div className="p-4 border-b border-neutral-200 space-y-2">
          <h1 className="text-lg font-semibold text-neutral-900">Sent ({apps.length})</h1>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subject, recipient…"
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
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.tone}`}>{status.label}</span>
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
