import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Send, FileText, ChevronRight, ChevronLeft,
  CheckCircle2, AlertTriangle, Paperclip, Bell, RefreshCw, ExternalLink,
  Settings as SettingsIcon, Mail, Download, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCredits } from '../../contexts/CreditsContext';
import {
  getAllResumesForUser,
  getResumeGroup,
  getResume,
  buildFullResume,
  createGeneratedResume,
  logSentApplication,
  getUserSettings,
  listEmailTemplates,
  getResumeGroups,
} from '../../services/resumeService';
import { geminiService } from '../../services/geminiService';
import { exportToDOCX, generateDocxBlob } from '../../services/exportService';
import { sendGmail, validateEmail, getMessageIdHeader, GmailAuthError } from '../../services/gmailService';
import { analyticsService } from '../../services/analyticsService';
import { buildOutreachUserProfile } from '../../services/outreachAiContext';
import { calculateRuleBasedMatch } from '../../lib/ruleBasedMatch';
import AgentThinkingPane from '../AgentThinkingPane';
import GeneratedDocxPreview from '../GeneratedDocxPreview';
import { buildOutreachDocxRenderOptions, sanitizeOutreachFilename } from './outreachDocxOptions';
import ResumeLibraryPicker from './ResumeLibraryPicker';

const AGENT_FIELDS = ['headline', 'summary', 'jobTitles', 'experience', 'skills', 'projects', 'internships', 'hackathons', 'certifications'];
const MIN_OUTREACH_TAILOR_CREDITS = 1;
const STEPS = ['jd', 'pickBase', 'tailor', 'email', 'send', 'done'];
const STEP_LABEL = {
  jd: 'Job description',
  pickBase: 'Base resume',
  tailor: 'Tailoring',
  email: 'Email draft',
  send: 'Sending',
  done: 'Sent',
};

const appendSignature = (body, signature) => {
  if (!signature || !signature.trim()) return body || '';
  const sig = signature.trim();
  if ((body || '').includes(sig)) return body;
  return `${(body || '').trimEnd()}\n\n—\n${sig}\n`;
};

const createAgentStreamState = () => ({
  thoughts: [],
  answerPreview: '',
  usage: null,
  status: 'starting',
  elapsedMs: 0,
  validator: null,
  model: '',
  cost: null,
  error: '',
});

const reduceAgentStreamChunk = (state, chunk) => {
  if (!state) return state;
  switch (chunk.type) {
    case 'status':
      return {
        ...state,
        status: chunk.stage || state.status,
        model: chunk.model || state.model,
        cost: chunk.cost ?? state.cost,
      };
    case 'thought':
      return {
        ...state,
        thoughts: state.thoughts.length === 0
          ? [chunk.text || '']
          : [...state.thoughts.slice(0, -1), state.thoughts[state.thoughts.length - 1] + (chunk.text || '')],
        status: 'thinking',
      };
    case 'answer':
      return {
        ...state,
        answerPreview: `${state.answerPreview || ''}${chunk.text || ''}`,
        status: 'writing',
      };
    case 'usage':
      return { ...state, usage: chunk };
    case 'validator':
      return { ...state, validator: chunk, status: 'validating' };
    case 'persisted':
      return { ...state, status: 'persisting' };
    case 'error':
      return { ...state, error: chunk.message || 'Agent error', status: 'error' };
    default:
      return state;
  }
};

const ComposeView = ({ user, onSent, onResumeCreated, onGoToSettings }) => {
  const { ensureGmailAccess, hasGmailSendScope } = useAuth();
  const { credits } = useCredits();

  const [step, setStep] = useState('jd');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);

  const [jobDescription, setJobDescription] = useState('');

  const [allResumes, setAllResumes] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [baseGroup, setBaseGroup] = useState(null);

  const [tailoredResume, setTailoredResume] = useState(null);
  const [newResumeId, setNewResumeId] = useState(null);
  const [resumeSelectionMode, setResumeSelectionMode] = useState('tailored');
  const [matchAnalysis, setMatchAnalysis] = useState(null);
  const [agentStream, setAgentStream] = useState(null);

  const [emailDraft, setEmailDraft] = useState({
    to: '', cc: '', bcc: '', subject: '', body: '', recipientName: '', confidence: 0,
  });
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [downloadingAttachment, setDownloadingAttachment] = useState(false);

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
    setJobDescription(''); setAllResumes([]); setAllGroups([]); setSelectedBaseId(null);
    setBaseGroup(null); setTailoredResume(null); setNewResumeId(null); setMatchAnalysis(null);
    setResumeSelectionMode('tailored');
    setAgentStream(null);
    setEmailDraft({ to: '', cc: '', bcc: '', subject: '', body: '', recipientName: '', confidence: 0 });
    setShowCcBcc(false); setShowAttachmentPreview(false); setSendResult(null);
    if (settings) {
      setFollowUpEnabled(!!settings.defaultFollowUp.enabled);
      setFollowUpValue(settings.defaultFollowUp.intervalValue ?? settings.defaultFollowUp.intervalDays ?? 7);
      setFollowUpUnit(settings.defaultFollowUp.intervalUnit || 'days');
      setMaxFollowUps(settings.defaultFollowUp.maxFollowUps);
    }
  };

  const handleSubmitJD = async () => {
    if (!jobDescription.trim()) { setError('Paste a job description to continue.'); return; }
    setError(''); setBusy(true); setStep('pickBase'); setLoadingResumes(true);
    try {
      const [resumes, groups] = await Promise.all([
        getAllResumesForUser(user.uid),
        getResumeGroups(user.uid),
      ]);
      if (resumes.length === 0) { setError('You have no resumes yet. Create one first.'); setStep('jd'); return; }
      setAllResumes(resumes);
      setAllGroups(groups);
      setSelectedBaseId(null);
    } catch (err) {
      console.error(err); setError(err.message || 'Failed to load your resumes.'); setStep('jd');
    } finally { setLoadingResumes(false); setBusy(false); }
  };

  const resolveSelectedBase = async () => {
    if (!selectedBaseId) { setError('Pick a base resume to continue.'); return; }
    const resume = allResumes.find((item) => item.id === selectedBaseId) || await getResume(selectedBaseId);
    const group = allGroups.find((item) => item.id === resume.groupId) || await getResumeGroup(resume.groupId);
    return { resume, group, full: buildFullResume(group, resume) };
  };

  const handleUseSelectedResumeAsIs = async () => {
    setError('');
    setResumeSelectionMode('existing');
    setBusy(true);
    try {
      const selected = await resolveSelectedBase();
      if (!selected) return;
      setBaseGroup(selected.group);
      setTailoredResume(selected.full);
      setNewResumeId(selected.resume.id);
      setMatchAnalysis(null);
      setAgentStream(null);
      await draftEmail(selected.full);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to prepare the selected resume.');
      setStep('pickBase');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmBase = async () => {
    if (!selectedBaseId) { setError('Pick a base resume to continue.'); return; }
    if (credits < MIN_OUTREACH_TAILOR_CREDITS) {
      setError('Tailoring needs 1 credit. Use the selected resume as-is or add credits.');
      return;
    }
    setError(''); setBusy(true); setStep('tailor');
    setAgentStream(createAgentStreamState());
    setResumeSelectionMode('tailored');
    const startedAt = Date.now();
    const elapsedTimer = setInterval(() => {
      setAgentStream((state) => state ? { ...state, elapsedMs: Date.now() - startedAt } : state);
    }, 250);
    try {
      const resume = await getResume(selectedBaseId);
      const group = await getResumeGroup(resume.groupId);
      const full = buildFullResume(group, resume);
      setBaseGroup(group);
      const label = `Tailor & Send - ${new Date().toLocaleDateString()}`;
      const final = await geminiService.streamResumeAgent(
        full,
        jobDescription,
        AGENT_FIELDS,
        (chunk) => setAgentStream((state) => reduceAgentStreamChunk(state, chunk)),
        {
          sourceResumeId: resume.id,
          mode: 'job',
          label,
        },
      );
      const updated = final?.resume;
      if (!updated) throw new Error(final?.error || 'AI returned an empty tailored resume.');
      setTailoredResume(updated);
      const validatorOk = final?.validator?.ok !== false;
      setAgentStream((state) => state ? {
        ...state,
        status: validatorOk ? 'done' : 'review-required',
        validator: final?.validator || state.validator,
        elapsedMs: Date.now() - startedAt,
      } : state);
      if (!validatorOk) {
        const issues = (final?.validator?.issues || []).slice(0, 3).join('; ');
        setError(`AI output needs review before saving${issues ? `: ${issues}` : '.'}`);
        return;
      }

      let newId = final?.newResumeId || null;
      if (!newId) {
        console.warn('[Outreach] Streaming agent did not persist; falling back to client save.');
        newId = await createGeneratedResume(user.uid, resume, updated, {
          mode: 'optimize',
          jobDescription,
          fieldsToUpdate: AGENT_FIELDS,
          label,
          aiTrace: {
            thoughts: final?.aiTrace?.thoughts || '',
            usage: final?.usage || null,
            model: final?.aiTrace?.model || '',
            validator: final?.validator || null,
            savedAt: new Date().toISOString(),
          },
          aiMetadata: final?.metadata || null,
        });
      }
      let resumeForEmail = updated;
      if (newId) {
        try {
          const persistedResume = await getResume(newId);
          resumeForEmail = buildFullResume(group, persistedResume);
          setTailoredResume(resumeForEmail);
        } catch (hydrateErr) {
          console.warn('[Outreach] Could not hydrate persisted tailored resume before email draft:', hydrateErr);
        }
      }

      setNewResumeId(newId);
      analyticsService.trackAIOptimizeSuccess(0, 0, 'tailor_and_send');
      analyticsService.trackCreditsUsed('tailor_and_send', 1);
      const ruleMatch = calculateRuleBasedMatch(jobDescription, resumeForEmail);
      setMatchAnalysis(ruleMatch ? { matchScore: ruleMatch.score, source: 'rule' } : null);
      await draftEmail(resumeForEmail);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to tailor resume.');
      setAgentStream((state) => state ? {
        ...state,
        status: 'error',
        error: err.message || 'Failed to tailor resume.',
        elapsedMs: Date.now() - startedAt,
      } : state);
    } finally {
      clearInterval(elapsedTimer);
      setBusy(false);
    }
  };

  const draftEmail = async (resumeForDraft) => {
    setStep('email'); setBusy(true);
    try {
      const draft = await geminiService.generateRecruiterEmail(
        jobDescription,
        resumeForDraft || tailoredResume,
        buildOutreachUserProfile(user, settings),
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
      analyticsService.trackCreditsUsed('tailor_and_send_email_draft', 0);
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
  const attachmentRenderOptions = useMemo(
    () => buildOutreachDocxRenderOptions(baseGroup, tailoredResume),
    [baseGroup, tailoredResume]
  );
  const attachmentFilename = useMemo(() => (
    `${sanitizeOutreachFilename(user.displayName || 'Resume')}_${sanitizeOutreachFilename(emailDraft.subject || 'Tailored_Resume')}.docx`
  ), [emailDraft.subject, user.displayName]);

  const handleDownloadAttachment = async () => {
    if (!tailoredResume) return;
    setDownloadingAttachment(true);
    setError('');
    try {
      await exportToDOCX(tailoredResume, attachmentFilename, attachmentRenderOptions);
    } catch (err) {
      setError(err?.message || 'Could not generate the outreach DOCX attachment.');
    } finally {
      setDownloadingAttachment(false);
    }
  };

  const handleSend = async () => {
    if (!canSend) { setError('Fix the highlighted email fields before sending.'); return; }
    setError(''); setBusy(true); setStep('send');
    try {
      const accessToken = await ensureGmailAccess({ withReadonly: followUpEnabled });
      if (!accessToken) throw new Error('Gmail access was not granted.');
      const blob = await generateDocxBlob(tailoredResume, attachmentRenderOptions);
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
          filename: attachmentFilename,
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
      if (resumeSelectionMode === 'tailored' && onResumeCreated) onResumeCreated(newResumeId, baseGroup?.id);
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
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem] gap-6">
        {/* Main panel */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 min-w-0">
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
                  Draft an email with an existing resume for free, or use 1 credit to tailor a new child resume first.
                </p>
                <button
                  onClick={handleSubmitJD}
                  disabled={busy || !jobDescription.trim()}
                  className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Choose resume
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
                  <div>
                    <h2 className="text-sm font-semibold text-neutral-900">Choose the resume to send</h2>
                    <p className="text-xs text-neutral-500 mt-1">
                      Preview the exact resume first, then send it as-is or create a tailored child resume for this job.
                    </p>
                  </div>
                  <ResumeLibraryPicker
                    groups={allGroups}
                    resumes={allResumes}
                    selectedResumeId={selectedBaseId}
                    onSelectResume={setSelectedBaseId}
                    loading={loadingResumes}
                    jobDescription={jobDescription}
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
                    <button
                      onClick={() => setStep('jd')}
                      className="h-9 px-3 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={handleUseSelectedResumeAsIs}
                        disabled={busy || !selectedBaseId}
                        className="h-10 px-4 border border-neutral-200 bg-white text-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {busy && resumeSelectionMode === 'existing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        Use as-is & draft email
                      </button>
                      <button
                        onClick={handleConfirmBase}
                        disabled={busy || !selectedBaseId || credits < MIN_OUTREACH_TAILOR_CREDITS}
                        title={credits < MIN_OUTREACH_TAILOR_CREDITS ? 'Tailoring needs 1 credit' : undefined}
                        className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {busy && resumeSelectionMode === 'tailored' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        Tailor & draft email
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'tailor' && (
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Tailoring resume for this job</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  The agent is aligning the role, skills, and recent experience before drafting your email.
                  {agentStream?.cost ? ` This tailoring run uses ${agentStream.cost} credits.` : ''}
                </p>
              </div>
              <div className="h-[28rem]">
                <AgentThinkingPane
                  thoughts={agentStream?.thoughts || []}
                  answerPreview={agentStream?.answerPreview || ''}
                  usage={agentStream?.usage}
                  status={agentStream?.status || 'starting'}
                  elapsedMs={agentStream?.elapsedMs || 0}
                  validator={agentStream?.validator}
                  model={agentStream?.model || ''}
                  error={agentStream?.error || ''}
                />
              </div>
              {agentStream?.status === 'error' && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setStep('pickBase')}
                    className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50"
                  >
                    Back to resume selection
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'email' && (
            <div className="space-y-3">
              {matchAnalysis && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                  Rule match after tailoring: <strong>{matchAnalysis.matchScore}/100</strong>
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
                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  Attachment: <strong>{attachmentFilename}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAttachmentPreview((v) => !v)}
                  className="h-7 px-2 rounded border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 inline-flex items-center gap-1"
                >
                  {showAttachmentPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showAttachmentPreview ? 'Hide' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadAttachment}
                  disabled={downloadingAttachment || !tailoredResume}
                  className="h-7 px-2 rounded border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {downloadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  DOCX
                </button>
              </div>

              {showAttachmentPreview && tailoredResume && (
                <div className="h-[520px] overflow-hidden rounded-lg border border-neutral-200 bg-white">
                  <GeneratedDocxPreview
                    resumeData={tailoredResume}
                    renderOptions={attachmentRenderOptions}
                    debounceMs={100}
                  />
                </div>
              )}

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
                <div className="flex justify-between gap-2"><dt>VISA Type</dt><dd className="text-neutral-900 truncate max-w-[140px]">{settings.visaType || '—'}</dd></div>
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
