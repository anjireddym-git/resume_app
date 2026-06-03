import React, { useEffect, useRef, useState } from 'react';
import {
  Loader2, Mail, Shield, Bell, Settings as SettingsIcon, Save, CheckCircle2,
  AlertTriangle, X, Plus, ShieldCheck, ShieldAlert, RefreshCw,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import {
  getUserSettings, updateUserSettings, DEFAULT_OUTREACH_SETTINGS,
} from '../../services/resumeService';
import { formatGmailWatchError, validateEmail } from '../../services/gmailService';

const startGmailWatchFn = httpsCallable(functions, 'startGmailWatch');
const stopGmailWatchFn  = httpsCallable(functions, 'stopGmailWatch');

const TONES = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual',       label: 'Casual' },
  { id: 'enthusiastic', label: 'Enthusiastic' },
];

const SavedPill = ({ visible }) => visible ? (
  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
    <CheckCircle2 className="w-3 h-3" /> Saved
  </span>
) : null;

// Inline chips input for email addresses (comma or Enter to add).
const ChipsInput = ({ value, onChange, placeholder }) => {
  const [input, setInput] = useState('');
  const addChip = (raw) => {
    const v = raw.trim().replace(/,$/, '');
    if (!v) return;
    if (value.includes(v)) { setInput(''); return; }
    onChange([...value, v]);
    setInput('');
  };
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChip(input); }
    else if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="w-full min-h-[36px] px-2 py-1 border border-neutral-200 rounded-lg flex flex-wrap items-center gap-1.5 focus-within:border-neutral-400">
      {value.map((v) => {
        const valid = validateEmail(v);
        return (
          <span key={v} className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
            valid ? 'bg-neutral-100 text-neutral-700' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {!valid && <AlertTriangle className="w-3 h-3" />}
            {v}
            <button onClick={() => onChange(value.filter((x) => x !== v))} className="hover:text-neutral-900">
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => addChip(input)}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] h-7 text-sm outline-none bg-transparent"
      />
    </div>
  );
};

const Section = ({ icon: Icon, title, description, children, action }) => (
  <section className="bg-white border border-neutral-200 rounded-xl p-5">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-3">
        {Icon && <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-neutral-600" />
        </div>}
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
          {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const SettingsView = ({ user }) => {
  const { ensureGmailAccess, hasGmailSendScope, hasGmailReadScope } = useAuth();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedKey, setSavedKey] = useState(null);
  const [watchInfo, setWatchInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  // Debounce store: { key -> timeout }
  const timers = useRef({});

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true); setError('');
    try {
      const [s, snap] = await Promise.all([
        getUserSettings(user.uid),
        getDoc(doc(db, 'users', user.uid)),
      ]);
      setSettings(s);
      setWatchInfo(snap.data()?.gmailWatch || null);
    } catch (err) { setError(err.message || 'Failed to load settings.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.uid]);

  const persist = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      try {
        await updateUserSettings(user.uid, { [key]: value });
        setSavedKey(key);
        setTimeout(() => setSavedKey((k) => k === key ? null : k), 1500);
      } catch (err) { setError(err.message); }
    }, 600);
  };

  const persistFollowUp = (patch) => {
    setSettings((s) => ({ ...s, defaultFollowUp: { ...s.defaultFollowUp, ...patch } }));
    if (timers.current.defaultFollowUp) clearTimeout(timers.current.defaultFollowUp);
    timers.current.defaultFollowUp = setTimeout(async () => {
      try {
        await updateUserSettings(user.uid, { defaultFollowUp: patch });
        setSavedKey('defaultFollowUp');
        setTimeout(() => setSavedKey((k) => k === 'defaultFollowUp' ? null : k), 1500);
      } catch (err) { setError(err.message); }
    }, 600);
  };

  const handleReconnect = async () => {
    setError(''); setBusy(true);
    try { await ensureGmailAccess({ withReadonly: true }); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const handleToggleReplyTracking = async (next) => {
    setError(''); setBusy(true);
    try {
      if (next) {
        const accessToken = await ensureGmailAccess({ withReadonly: true });
        await startGmailWatchFn({ accessToken });
      } else {
        try { await stopGmailWatchFn({}); } catch (e) { console.warn('stopGmailWatch:', e.message); }
      }
      persist('replyTrackingEnabled', next);
      await load();
    } catch (err) { setError(formatGmailWatchError(err)); }
    finally { setBusy(false); }
  };

  if (loading || !settings) {
    return <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" /></div>;
  }

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : (typeof ts === 'number' ? new Date(ts) : new Date(ts));
    return d.toLocaleString();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 lg:p-8 space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-neutral-900">Outreach settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Defaults applied to every email you compose. Changes save automatically.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" /> <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <Section
        icon={Mail}
        title="Gmail connection"
        description={`Signed in as ${user.email}`}
        action={
          <button
            onClick={handleReconnect} disabled={busy}
            className="h-8 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Reconnect
          </button>
        }
      >
        <div className="flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 border ${
            hasGmailSendScope ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-50 text-neutral-500 border-neutral-200'
          }`}>
            {hasGmailSendScope ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            Send: {hasGmailSendScope ? 'granted' : 'not granted'}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 border ${
            hasGmailReadScope ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-50 text-neutral-500 border-neutral-200'
          }`}>
            {hasGmailReadScope ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
            Read: {hasGmailReadScope ? 'granted' : 'not granted'}
          </span>
        </div>
      </Section>

      <Section
        icon={Shield}
        title="Reply tracking"
        description="Subscribes to your inbox via Gmail watch so replies surface automatically."
        action={<SavedPill visible={savedKey === 'replyTrackingEnabled'} />}
      >
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!settings.replyTrackingEnabled}
            onChange={(e) => handleToggleReplyTracking(e.target.checked)}
            disabled={busy}
            className="w-4 h-4"
          />
          <span className="text-sm text-neutral-700">Enable reply tracking</span>
        </label>
        {watchInfo && (
          <div className="mt-3 text-xs text-neutral-500 space-y-0.5">
            <div>Watching: <span className="text-neutral-700">{watchInfo.emailAddress || user.email}</span></div>
            <div>Expires: <span className="text-neutral-700">{formatDate(watchInfo.expiration)}</span></div>
          </div>
        )}
      </Section>

      <Section
        icon={Bell}
        title="Default follow-up policy"
        description="Applied to new sends. You can override per-send in the Compose flow."
        action={<SavedPill visible={savedKey === 'defaultFollowUp'} />}
      >
        <label className="flex items-center gap-3 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={!!settings.defaultFollowUp.enabled}
            onChange={(e) => persistFollowUp({ enabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm text-neutral-700">Remind me to follow up by default</span>
        </label>
        <div className="grid grid-cols-3 gap-3 pl-6">
          <div>
            <label className="text-xs text-neutral-600">Interval</label>
            <input
              type="number" min="1" max="999"
              value={settings.defaultFollowUp.intervalValue ?? settings.defaultFollowUp.intervalDays ?? 7}
              onChange={(e) => {
                const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                const unit = settings.defaultFollowUp.intervalUnit || 'days';
                persistFollowUp({
                  intervalValue: v,
                  intervalUnit: unit,
                  ...(unit === 'days' ? { intervalDays: v } : {}),
                });
              }}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-600">Unit</label>
            <select
              value={settings.defaultFollowUp.intervalUnit || 'days'}
              onChange={(e) => {
                const unit = e.target.value;
                const v = settings.defaultFollowUp.intervalValue ?? settings.defaultFollowUp.intervalDays ?? 7;
                persistFollowUp({
                  intervalUnit: unit,
                  intervalValue: v,
                  ...(unit === 'days' ? { intervalDays: v } : {}),
                });
              }}
              className="w-full h-9 px-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-600">Max follow-ups</label>
            <input
              type="number" min="1" max="10"
              value={settings.defaultFollowUp.maxFollowUps}
              onChange={(e) => persistFollowUp({ maxFollowUps: Math.max(1, parseInt(e.target.value, 10) || 3) })}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
          </div>
        </div>
        {(settings.defaultFollowUp.intervalUnit && settings.defaultFollowUp.intervalUnit !== 'days') && (
          <p className="mt-2 pl-6 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 inline-block">
            Heads up: minute/hour intervals are intended for testing. The scheduler scans every 5 minutes.
          </p>
        )}
      </Section>

      <Section
        icon={Plus}
        title="Default CC / BCC"
        description="Auto-add these recipients to every outgoing email."
      >
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-neutral-600">Default CC</label>
              <SavedPill visible={savedKey === 'defaultCc'} />
            </div>
            <ChipsInput
              value={settings.defaultCc}
              onChange={(v) => persist('defaultCc', v)}
              placeholder="cc@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-neutral-600">Default BCC</label>
              <SavedPill visible={savedKey === 'defaultBcc'} />
            </div>
            <ChipsInput
              value={settings.defaultBcc}
              onChange={(v) => persist('defaultBcc', v)}
              placeholder="me@example.com (e.g. to BCC yourself)"
            />
          </div>
        </div>
      </Section>

      <Section
        icon={SettingsIcon}
        title="Email signature"
        description="Appended to every email body."
        action={<SavedPill visible={savedKey === 'signature'} />}
      >
        <textarea
          value={settings.signature}
          onChange={(e) => persist('signature', e.target.value)}
          placeholder={'Best,\nYour Name\nyour.email@example.com'}
          className="w-full h-28 p-3 text-sm border border-neutral-200 rounded-lg font-mono resize-none focus:outline-none focus:border-neutral-400"
        />
      </Section>

      <Section
        icon={Shield}
        title="Candidate context"
        description="Optional details for AI drafts."
      >
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-neutral-600">VISA Type</label>
            <SavedPill visible={savedKey === 'visaType'} />
          </div>
          <input
            type="text"
            value={settings.visaType || ''}
            onChange={(e) => persist('visaType', e.target.value)}
            placeholder="H-1B, F-1 OPT, GC EAD, Green Card, US Citizen"
            className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
          />
        </div>
      </Section>

      <Section
        icon={SettingsIcon}
        title="AI tone"
        description="Used when generating the recruiter email body."
        action={<SavedPill visible={savedKey === 'aiTone'} />}
      >
        <div className="inline-flex rounded-lg border border-neutral-200 overflow-hidden">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => persist('aiTone', t.id)}
              className={`px-3 py-1.5 text-xs font-medium ${
                settings.aiTone === t.id ? 'bg-blue-600 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={Bell} title="Notifications" description="Control in-app badges.">
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-neutral-700">Badge when a reply arrives</span>
            <div className="flex items-center gap-2">
              <SavedPill visible={savedKey === 'notifyOnReply'} />
              <input
                type="checkbox"
                checked={!!settings.notifyOnReply}
                onChange={(e) => persist('notifyOnReply', e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </label>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-neutral-700">Badge when a follow-up is due</span>
            <div className="flex items-center gap-2">
              <SavedPill visible={savedKey === 'notifyOnFollowUpDue'} />
              <input
                type="checkbox"
                checked={!!settings.notifyOnFollowUpDue}
                onChange={(e) => persist('notifyOnFollowUpDue', e.target.checked)}
                className="w-4 h-4"
              />
            </div>
          </label>
        </div>
      </Section>
    </div>
  );
};

export default SettingsView;
