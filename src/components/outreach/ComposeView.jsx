import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Sparkles, Send, FileText, ChevronRight, ChevronLeft,
  CheckCircle2, AlertTriangle, Paperclip, Bell, RefreshCw, ExternalLink,
  Settings as SettingsIcon, Mail,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCredits } from '../../contexts/CreditsContext';
import {
  getAllResumesForUser,
  getResumeGroup,
  getResume,
  buildFullResume,
  compactResumeSummary,
  createGeneratedResume,
  logSentApplication,
  updateResumeMatchAnalysis,
  getUserSettings,
  listEmailTemplates,
} from '../../services/resumeService';
import { geminiService } from '../../services/geminiService';
import { generateDocxBlob } from '../../services/exportService';
import { sendGmail, validateEmail, getMessageIdHeader, GmailAuthError } from '../../services/gmailService';
import { analyticsService } from '../../services/analyticsService';

const STEPS = ['jd', 'pickBase', 'tailor', 'email', 'send', 'done'];
const STEP_LABEL = {
  jd: 'Job description',
  pickBase: 'Base resume',
  tailor: 'Tailoring',
  email: 'Email draft',
  send: 'Sending',
  done: 'Sent',
};

const sanitizeFilename = (name) =>
  String(name || 'Resume').replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'Resume';

const appendSignature = (body, signature) => {
  if (!signature || !signature.trim()) return body || '';
  const sig = signature.trim();
  if ((body || '').includes(sig)) return body;
  return `${(body || '').trimEnd()}\n\n—\n${sig}\n`;
};

const ComposeView = ({ user, onSent, onResumeCreated, onGoToSettings }) => {
  const { ensureGmailAccess, hasGmailSendScope } = useAuth();
  const { credits, hasCredits } = useCredits();

  const [step, setStep] = useState('jd');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);

  const [jobDescription, setJobDescription] = useState('');

  const [allResumes, setAllResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [aiPick, setAiPick] = useState(null);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [baseGroup, setBaseGroup] = useState(null);

  const [tailoredResume, setTailoredResume] = useState(null);
  const [newResumeId, setNewResumeId] = useState(null);
  const [matchAnalysis, setMatchAnalysis] = useState(null);

  const [emailDraft, setEmailDraft] = useState({
    to: '', cc: '', bcc: '', subject: '', body: '', recipientName: '', confidence: 0,
  });
  const [showCcBcc, setShowCcBcc] = useState(false);

  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [followUpValue, setFollowUpValue] = useState(7);
  const [followUpUnit, setFollowUpUnit] = useState('days');
  const [maxFollowUps, setMaxFollowUps] = useState(3);
  const [sendResult, setSendResult] = useState(null);

  // Load user settings + templates on mount.
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const [s, t] = await Promise.all([getUserSettings(user.uid), listEmailTemplates(user.uid)]);
        setSettings(s);
        setTemplates(t);
        setFollowUpEnabled(!!s.defaultFollowUp.enabled);
        setFollowUpValue(s.defaultFollowUp.intervalValue ?? s.defaultFollowUp.intervalDays ?? 7);
        setFollowUpUnit(s.defaultFollowUp.intervalUnit || 'days');
        setMaxFollowUps(s.defaultFollowUp.maxFollowUps);
      } catch (e) { console.warn('settings load failed', e); }
    })();
  }, [user?.uid]);

  const reset = () => {
    setStep('jd'); setError(''); setBusy(false);
    setJobDescription(''); setAllResumes([]); setAiPick(null); setSelectedBaseId(null);
    setBaseGroup(null); setTailoredResume(null); setNewResumeId(null); setMatchAnalysis(null);
    setEmailDraft({ to: '', cc: '', bcc: '', subject: '', body: '', recipientName: '', confidence: 0 });
    setShowCcBcc(false); setSendResult(null);
    if (settings) {
      setFollowUpEnabled(!!settings.defaultFollowUp.enabled);
      setFollowUpValue(settings.defaultFollowUp.intervalValue ?? settings.defaultFollowUp.intervalDays ?? 7);
      setFollowUpUnit(settings.defaultFollowUp.intervalUnit || 'days');
      setMaxFollowUps(settings.defaultFollowUp.maxFollowUps);
    }
  };

  const handleSubmitJD = async () => {
    if (!jobDescription.trim()) { setError('Paste a job description to continue.'); return; }
    if (!hasCredits || credits < 2) {
      setError('You need at least 2 credits (resume tailor + email draft).');
      return;
    }
    setError(''); setBusy(true); setStep('pickBase'); setLoadingResumes(true);
    try {
      const resumes = await getAllResumesForUser(user.uid);
      if (resumes.length === 0) { setError('You have no resumes yet. Create one first.'); setStep('jd'); return; }
      setAllResumes(resumes);
      const summaries = [];
      const groupCache = new Map();
      for (const r of resumes.slice(0, 25)) {
        let group = groupCache.get(r.groupId);
        if (!group) { try { group = await getResumeGroup(r.groupId); groupCache.set(r.groupId, group); } catch { continue; } }
        const full = buildFullResume(group, r);
        summaries.push(compactResumeSummary(r, full));
      }
      const pick = await geminiService.pickBestResume(summaries, jobDescription);
      setAiPick(pick);
      setSelectedBaseId(pick.resumeId);
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to pick best resume.'); setStep('jd');
    } finally { setLoadingResumes(false); setBusy(false); }
  };

  const handleConfirmBase = async () => {
    if (!selectedBaseId) { setError('Pick a base resume to continue.'); return; }
    setError(''); setBusy(true); setStep('tailor');
    try {
      const resume = await getResume(selectedBaseId);
      const group = await getResumeGroup(resume.groupId);
      const full = buildFullResume(group, resume);
      setBaseGroup(group);
      const updated = await geminiService.updateResumeForJob(full, jobDescription);
      setTailoredResume(updated);
      const newId = await createGeneratedResume(user.uid, resume, updated, {
        mode: 'optimize',
        jobDescription,
        label: `Tailor & Send — ${new Date().toLocaleDateString()}`,
      });
      setNewResumeId(newId);
      analyticsService.trackAIOptimizeSuccess(0, 0, 'tailor_and_send');
      analyticsService.trackCreditsUsed('tailor_and_send', 1);
      try {
        const analysis = await geminiService.analyzeMatch(updated, jobDescription);
        setMatchAnalysis(analysis);
        await updateResumeMatchAnalysis(newId, analysis.matchScore, analysis);
      } catch (e) { console.warn('match analysis failed:', e.message); }
      await draftEmail(updated);
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to tailor resume.'); setStep('pickBase');
    } finally { setBusy(false); }
  };

  const draftEmail = async (resumeForDraft) => {
    setStep('email'); setBusy(true);
    try {
      const draft = await geminiService.generateRecruiterEmail(
        jobDescription,
        resumeForDraft || tailoredResume,
        { name: user.displayName || user.email, email: user.email, tone: settings?.aiTone },
      );
      setEmailDraft({
        to: draft.recipientEmail || '',
        cc: (settings?.defaultCc || []).join(', '),
        bcc: (settings?.defaultBcc || []).join(', '),
        subject: draft.subject || '',
        body: appendSignature(draft.body || '', settings?.signature),
        recipientName: draft.recipientName || '',
        confidence: draft.confidence ?? 0,
      });
      if ((settings?.defaultCc?.length || 0) + (settings?.defaultBcc?.length || 0) > 0) {
        setShowCcBcc(true);
      }
      analyticsService.trackCreditsUsed('tailor_and_send_email_draft', 1);
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to draft recruiter email.');
    } finally { setBusy(false); }
  };

  const handleRegenerateEmail = async () => {
    setError('');
    if (!tailoredResume) return;
    await draftEmail(tailoredResume);
  };

  const applyTemplate = (tplId) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    setEmailDraft((d) => ({
      ...d,
      subject: tpl.subject || d.subject,
      body: appendSignature(tpl.body || d.body, settings?.signature),
    }));
  };

  const ccList = useMemo(() => emailDraft.cc.split(',').map((s) => s.trim()).filter(Boolean), [emailDraft.cc]);
  const bccList = useMemo(() => emailDraft.bcc.split(',').map((s) => s.trim()).filter(Boolean), [emailDraft.bcc]);
  const invalidEmails = useMemo(() => {
    const bad = [];
    if (emailDraft.to && !validateEmail(emailDraft.to)) bad.push(emailDraft.to);
    [...ccList, ...bccList].forEach((e) => { if (!validateEmail(e)) bad.push(e); });
    return bad;
  }, [emailDraft.to, ccList, bccList]);
  const canSend = !!emailDraft.to.trim() && validateEmail(emailDraft.to.trim())
    && !!emailDraft.subject.trim() && !!emailDraft.body.trim() && invalidEmails.length === 0;

  const handleSend = async () => {
    if (!canSend) { setError('Fix the highlighted email fields before sending.'); return; }
    setError(''); setBusy(true); setStep('send');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: followUpEnabled });
      if (!accessToken) throw new Error('Gmail access was not granted.');
      const blob = await generateDocxBlob(tailoredResume);
      const filename = `${sanitizeFilename(user.displayName || 'Resume')}_${sanitizeFilename(emailDraft.subject)}.docx`;
      const sendResp = await sendGmail({
        accessToken,
        fromEmail: user.email,
        fromName: user.displayName || undefined,
        to: emailDraft.to.trim(),
        cc: ccList,
        bcc: bccList,
        subject: emailDraft.subject,
        body: emailDraft.body,
        attachment: {
          filename,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          blob,
        },
      });
      const messageIdHeader = await getMessageIdHeader(accessToken, sendResp.id);
      const sentAppId = await logSentApplication({
        userId: user.uid,
        resumeId: newResumeId,
        baseResumeId: selectedBaseId,
        groupId: baseGroup?.id || null,
        jobDescription,
        recipientEmail: emailDraft.to.trim(),
        recipientName: emailDraft.recipientName || null,
        cc: ccList,
        bcc: bccList,
        subject: emailDraft.subject,
        body: emailDraft.body,
        gmailMessageId: sendResp.id,
        gmailThreadId: sendResp.threadId,
        gmailMessageIdHeader: messageIdHeader,
        matchAnalysis,
        followUp: {
          enabled: followUpEnabled,
          intervalUnit: followUpUnit,
          intervalValue: followUpValue,
          intervalDays: followUpUnit === 'days' ? followUpValue : 0,
          maxFollowUps,
        },
      });
      setSendResult({ sentAppId, gmailMessageId: sendResp.id, gmailThreadId: sendResp.threadId });
      setStep('done');
      analyticsService.trackCreditsUsed('tailor_and_send_sent', 0);
      if (onResumeCreated) onResumeCreated(newResumeId, baseGroup?.id);
    } catch (err) {
      console.error(err);
      if (err instanceof GmailAuthError) {
        setError('Gmail rejected the access token. Click Send again and approve the popup.');
      } else { setError(err.message || 'Failed to send email.'); }
      setStep('email');
    } finally { setBusy(false); }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Compose outreach</h1>
          <p className="text-sm text-neutral-500 mt-1">Tailor a resume to a job description and email the recruiter — all in one flow.</p>
        </div>
        <div className="flex items-center gap-2">
          {step === 'done' ? (
            <button onClick={reset} className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50">
              Start new
            </button>
          ) : null}
        </div>
      </div>

      {/* Step indicator */}
      <ol className="flex items-center gap-2 mb-6 overflow-x-auto">
        {STEPS.filter((s) => s !== 'done').map((s, idx) => {
          const reached = idx <= Math.max(stepIndex, 0);
          const current = s === step;
          return (
            <li key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                current ? 'bg-blue-50 border-blue-200 text-blue-700'
                : reached ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-neutral-200 text-neutral-400'
              }`}>
                <span className="w-4 h-4 rounded-full inline-flex items-center justify-center bg-white border border-current text-[10px]">
                  {idx + 1}
                </span>
                {STEP_LABEL[s]}
              </div>
              {idx < STEPS.length - 2 && <ChevronRight className="w-3 h-3 text-neutral-300" />}
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main panel */}
        <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-5">
          {step === 'jd' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-700">Job description</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job posting here — include recruiter contact info if visible."
                className="w-full h-72 p-3 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-neutral-400"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">
                  Uses 2 credits: 1 for tailoring + 1 for the draft email. Resume pick is included.
                </p>
                <button
                  onClick={handleSubmitJD}
                  disabled={busy || !jobDescription.trim()}
                  className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Find best resume
                </button>
              </div>
            </div>
          )}

          {step === 'pickBase' && (
            <div className="space-y-3">
              {loadingResumes ? (
                <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-neutral-400 animate-spin mx-auto" /></div>
              ) : (
                <>
                  {aiPick && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                        <Sparkles className="w-4 h-4" /> AI pick (score {aiPick.score}/100)
                      </div>
                      <p className="text-xs text-blue-800 mt-1">{aiPick.reasoning}</p>
                    </div>
                  )}
                  <label className="text-sm font-medium text-neutral-700">Choose base resume</label>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {(aiPick?.ranking || allResumes.map((r) => ({ resumeId: r.id, score: null }))).map((rk) => {
                      const r = allResumes.find((x) => x.id === rk.resumeId);
                      if (!r) return null;
                      const isSelected = selectedBaseId === r.id;
                      const isAi = aiPick?.resumeId === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSelectedBaseId(r.id)}
                          className={`w-full p-3 rounded-lg border text-left flex items-start gap-3 ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <FileText className="w-4 h-4 text-neutral-400 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-neutral-900 truncate">{r.name}</span>
                              {isAi && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">AI PICK</span>}
                            </div>
                            <div className="text-xs text-neutral-500 truncate">
                              {r.matchScore != null && <span>stored match {r.matchScore}% · </span>}
                              {rk.score != null && <span>fit {rk.score}/100</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setStep('jd')}
                      className="h-9 px-3 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <button
                      onClick={handleConfirmBase}
                      disabled={busy || !selectedBaseId}
                      className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                      Tailor & draft email
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'tailor' && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-neutral-700">Tailoring resume, then drafting your email…</p>
            </div>
          )}

          {step === 'email' && (
            <div className="space-y-3">
              {matchAnalysis && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                  Match after tailoring: <strong>{matchAnalysis.matchScore}/100</strong>
                </div>
              )}
              {emailDraft.confidence < 60 && !emailDraft.to && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  AI couldn't extract a recruiter email from the JD. Enter the recipient manually.
                </div>
              )}

              {templates.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-neutral-600">Insert template</label>
                  <select
                    onChange={(e) => { if (e.target.value) { applyTemplate(e.target.value); e.target.value = ''; } }}
                    className="h-8 px-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
                  >
                    <option value="">Choose…</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-neutral-600">To</label>
                <input
                  type="email"
                  value={emailDraft.to}
                  onChange={(e) => setEmailDraft({ ...emailDraft, to: e.target.value })}
                  placeholder="recruiter@example.com"
                  className={`w-full h-9 px-3 text-sm border rounded-lg focus:outline-none ${
                    emailDraft.to && !validateEmail(emailDraft.to) ? 'border-red-300 focus:border-red-500' : 'border-neutral-200 focus:border-neutral-400'
                  }`}
                />
              </div>

              <button type="button" onClick={() => setShowCcBcc(!showCcBcc)} className="text-xs text-blue-600 hover:underline">
                {showCcBcc ? 'Hide' : 'Add'} CC / BCC
              </button>

              {showCcBcc && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-neutral-600">CC</label>
                    <input
                      value={emailDraft.cc}
                      onChange={(e) => setEmailDraft({ ...emailDraft, cc: e.target.value })}
                      placeholder="comma, separated"
                      className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-600">BCC</label>
                    <input
                      value={emailDraft.bcc}
                      onChange={(e) => setEmailDraft({ ...emailDraft, bcc: e.target.value })}
                      placeholder="comma, separated"
                      className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                    />
                  </div>
                </div>
              )}

              {invalidEmails.length > 0 && (
                <div className="text-xs text-red-600">Invalid email(s): {invalidEmails.join(', ')}</div>
              )}

              <div>
                <label className="text-xs font-medium text-neutral-600">Subject</label>
                <input
                  value={emailDraft.subject}
                  onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-600">Body</label>
                  <button
                    type="button" onClick={handleRegenerateEmail} disabled={busy}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <textarea
                  value={emailDraft.body}
                  onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
                  className="w-full h-64 p-3 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-neutral-400 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-600 p-2 bg-neutral-50 border border-neutral-200 rounded-lg">
                <Paperclip className="w-3.5 h-3.5" />
                Attachment: <strong>tailored resume.docx</strong> (generated on send)
              </div>

              <div className="border border-neutral-200 rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <input type="checkbox" checked={followUpEnabled} onChange={(e) => setFollowUpEnabled(e.target.checked)} />
                  <Bell className="w-4 h-4 text-neutral-500" />
                  Remind me to follow up if no reply
                </label>
                {followUpEnabled && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 pl-6">
                    <span>after</span>
                    <input type="number" min="1" max="999" value={followUpValue}
                      onChange={(e) => setFollowUpValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-16 h-7 px-2 border border-neutral-200 rounded" />
                    <select value={followUpUnit}
                      onChange={(e) => setFollowUpUnit(e.target.value)}
                      className="h-7 px-1.5 border border-neutral-200 rounded bg-white">
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                    <span>, up to</span>
                    <input type="number" min="1" max="10" value={maxFollowUps}
                      onChange={(e) => setMaxFollowUps(parseInt(e.target.value, 10) || 3)}
                      className="w-16 h-7 px-2 border border-neutral-200 rounded" />
                    <span>reminders</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <button
                  onClick={() => setStep('pickBase')}
                  className="h-9 px-3 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={busy || !canSend}
                  className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {hasGmailSendScope ? 'Send via Gmail' : 'Authorize Gmail & send'}
                </button>
              </div>
            </div>
          )}

          {step === 'send' && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-neutral-700">Generating attachment and sending via Gmail…</p>
            </div>
          )}

          {step === 'done' && sendResult && (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <p className="text-base text-neutral-800 font-medium">Email sent successfully</p>
              <p className="text-xs text-neutral-500">A copy is in your Gmail Sent folder.</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={`https://mail.google.com/mail/u/0/#sent/${sendResult.gmailThreadId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" /> Open in Gmail
                </a>
                <button
                  onClick={() => onSent && onSent(sendResult.sentAppId)}
                  className="text-sm text-neutral-700 hover:underline"
                >
                  View in Sent →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side panel: defaults / preview */}
        <aside className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-neutral-900">Defaults from Settings</h3>
              <button onClick={onGoToSettings} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <SettingsIcon className="w-3 h-3" /> Edit
              </button>
            </div>
            {!settings ? (
              <div className="text-xs text-neutral-400">Loading…</div>
            ) : (
              <dl className="text-xs space-y-1.5 text-neutral-600">
                <div className="flex justify-between gap-2"><dt>Default CC</dt><dd className="text-neutral-900 truncate max-w-[140px]">{settings.defaultCc.join(', ') || '—'}</dd></div>
                <div className="flex justify-between gap-2"><dt>Default BCC</dt><dd className="text-neutral-900 truncate max-w-[140px]">{settings.defaultBcc.join(', ') || '—'}</dd></div>
                <div className="flex justify-between gap-2"><dt>Signature</dt><dd className="text-neutral-900">{settings.signature ? 'On' : 'Off'}</dd></div>
                <div className="flex justify-between gap-2"><dt>AI tone</dt><dd className="text-neutral-900 capitalize">{settings.aiTone}</dd></div>
                <div className="flex justify-between gap-2"><dt>Follow-ups</dt><dd className="text-neutral-900">{settings.defaultFollowUp.enabled ? `Every ${settings.defaultFollowUp.intervalDays}d × ${settings.defaultFollowUp.maxFollowUps}` : 'Off'}</dd></div>
              </dl>
            )}
          </div>

          {step === 'email' && emailDraft.subject && (
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-neutral-900 mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" /> Preview
              </h3>
              <div className="text-xs text-neutral-600 space-y-1">
                <div><span className="text-neutral-400">To:</span> {emailDraft.to || '—'}</div>
                {ccList.length > 0 && <div><span className="text-neutral-400">Cc:</span> {ccList.join(', ')}</div>}
                {bccList.length > 0 && <div><span className="text-neutral-400">Bcc:</span> {bccList.join(', ')}</div>}
                <div><span className="text-neutral-400">Subject:</span> <span className="font-medium text-neutral-900">{emailDraft.subject}</span></div>
              </div>
              <pre className="mt-3 text-xs text-neutral-700 whitespace-pre-wrap font-sans border-t border-neutral-100 pt-3 max-h-72 overflow-y-auto">
                {emailDraft.body}
              </pre>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ComposeView;
