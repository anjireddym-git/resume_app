import React, { useCallback, useState } from 'react';
import {
  Sparkles, Send, Inbox, Bell, FileText, Settings,
} from 'lucide-react';
import useOutreachCounts from '../../hooks/useOutreachCounts';
import useGmailReplySync from '../../hooks/useGmailReplySync';
import ComposeView from './ComposeView';
import SentView from './SentView';
import RepliesView from './RepliesView';
import FollowUpsView from './FollowUpsView';
import TemplatesView from './TemplatesView';
import SettingsView from './SettingsView';

const NAV = [
  { id: 'compose',    label: 'Compose',    icon: Sparkles },
  { id: 'sent',       label: 'Sent',       icon: Send     },
  { id: 'replies',    label: 'Replies',    icon: Inbox    },
  { id: 'followups',  label: 'Follow-ups', icon: Bell     },
  { id: 'templates',  label: 'Templates',  icon: FileText },
  { id: 'settings',   label: 'Settings',   icon: Settings },
];

const OutreachWorkspace = ({ user, onResumeCreated }) => {
  const [view, setView] = useState('compose');
  // Selected sentApplication shown in SentView detail panel. Set when a reply
  // row is clicked in RepliesView and we want to jump to the application.
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [replySyncVersion, setReplySyncVersion] = useState(0);
  const counts = useOutreachCounts();
  const handleRepliesSynced = useCallback(() => setReplySyncVersion((version) => version + 1), []);
  useGmailReplySync(handleRepliesSynced);

  const openApplication = (id) => {
    setSelectedAppId(id);
    setView('sent');
  };

  const badgeFor = (id) => {
    if (id === 'replies' && counts.unseenReplies > 0) return counts.unseenReplies;
    if (id === 'followups' && counts.dueFollowUps > 0) return counts.dueFollowUps;
    return null;
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-neutral-50">
      {/* Left rail */}
      <nav className="w-48 bg-white border-r border-neutral-200 flex-shrink-0 py-3 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Outreach
        </div>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          const badge = badgeFor(id);
          return (
            <button
              key={id}
              onClick={() => { setView(id); if (id !== 'sent') setSelectedAppId(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{label}</span>
              {badge != null && (
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center ${
                  active ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {view === 'compose' && (
          <ComposeView
            user={user}
            onSent={(appId) => { setSelectedAppId(appId); setView('sent'); }}
            onResumeCreated={onResumeCreated}
            onGoToSettings={() => setView('settings')}
          />
        )}
        {view === 'sent' && (
          <SentView
            user={user}
            selectedAppId={selectedAppId}
            refreshKey={replySyncVersion}
            onSelect={setSelectedAppId}
            onCompose={() => setView('compose')}
          />
        )}
        {view === 'replies' && (
          <RepliesView user={user} onOpenApplication={openApplication} />
        )}
        {view === 'followups' && (
          <FollowUpsView user={user} onOpenApplication={openApplication} />
        )}
        {view === 'templates' && <TemplatesView user={user} />}
        {view === 'settings' && <SettingsView user={user} />}
      </main>
    </div>
  );
};

export default OutreachWorkspace;
