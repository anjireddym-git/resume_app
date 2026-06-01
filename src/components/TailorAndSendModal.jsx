import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Loader2, Send, FileText, ChevronRight, ChevronLeft,
  CheckCircle2, AlertTriangle, Paperclip, Bell, ExternalLink, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditsContext';
import {
  getAllResumesForUser,
  getResumeGroup,
  getResume,
  buildFullResume,
  createGeneratedResume,
  logSentApplication,
  updateResumeMatchAnalysis,
} from '../services/resumeService';
import { geminiService } from '../services/geminiService';
import { generateDocxBlob } from '../services/exportService';
import { sendGmail, validateEmail, getMessageIdHeader, GmailAuthError } from '../services/gmailService';
import { analyticsService } from '../services/analyticsService';

/**
 * Five-step flow:
 *   1. paste JD
 *   2. user picks the base resume
 *   3. tailor resume → saved as new version + match analysis
 *   4. AI drafts recruiter email (To/CC/BCC/Subject/Body editable)
 *   5. send via user's Gmail account; optional follow-up scheduling
 */
const STEPS = ['jd', 'pickBase', 'tailor', 'email', 'send', 'done'];

const sanitizeFilename = (name) =>
  String(name || 'Resume').replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'Resume';

const TailorAndSendModal = ({ isOpen, onClose, currentResume, onResumeCreated }) => {
  const { user, ensureGmailAccess, hasGmailSendScope } = useAuth();
  const { credits, hasCredits } = useCredits();

  const [step, setStep] = useState('jd');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Step 1
  const [jobDescription, setJobDescription] = useState('');

  // Step 2
  const [allResumes, setAllResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [baseFullResume, setBaseFullResume] = useState(null);
  const [baseGroup, setBaseGroup] = useState(null);

  // Step 3
  const [tailoredResume, setTailoredResume] = useState(null);
  const [newResumeId, setNewResumeId] = useState(null);
  const [matchAnalysis, setMatchAnalysis] = useState(null);

  // Step 4
  const [emailDraft, setEmailDraft] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    recipientName: '',
    confidence: 0,
  });
  const [showCcBcc, setShowCcBcc] = useState(false);

  // Step 5
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [followUpDays, setFollowUpDays] = useState(7);
  const [maxFollowUps, setMaxFollowUps] = useState(3);
  const [sendResult, setSendResult] = useState(null);

  const reset = () => {
    setStep('jd');
    setError('');
    setBusy(false);
    setJobDescription('');
    setAllResumes([]);
    setSelectedBaseId(null);
    setBaseFullResume(null);
    setBaseGroup(null);
    setTailoredResume(null);
    setNewResumeId(null);
    setMatchAnalysis(null);
    setEmailDraft({ to: '', cc: '', bcc: '', subject: '', body: '', recipientName: '', confidence: 0 });
    setShowCcBcc(false);
    setFollowUpEnabled(true);
    setFollowUpDays(7);
    setMaxFollowUps(3);
    setSendResult(null);
  };

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  const handleClose = () => { reset(); onClose(); };

  // ── Step 1 → Step 2 ─────────────────────────────────────────────────────
  const handleSubmitJD = async () => {
    if (!jobDescription.trim()) { setError('Paste a job description to continue.'); return; }
    if (!hasCredits || credits < 2) {
      setError('You need at least 2 credits for this flow (resume tailor + email draft).');
      return;
    }
    setError('');
    setBusy(true);
    setStep('pickBase');
    setLoadingResumes(true);
    try {
      const resumes = await getAllResumesForUser(user.uid);
      if (resumes.length === 0) {
        setError('You have no resumes yet. Create one first.');
        setStep('jd');
        return;
      }
      setAllResumes(resumes);
      setSelectedBaseId(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load your resumes.');
      setStep('jd');
    } finally {
      setLoadingResumes(false);
      setBusy(false);
    }
  };

  // ── Step 2 → Step 3 ─────────────────────────────────────────────────────
  const handleConfirmBase = async () => {
    if (!selectedBaseId) { setError('Pick a base resume to continue.'); return; }
    setError('');
    setBusy(true);
    setStep('tailor');
    try {
      const resume = await getResume(selectedBaseId);
      const group = await getResumeGroup(resume.groupId);
      const full = buildFullResume(group, resume);
      setBaseFullResume(full);
      setBaseGroup(group);

      // Tailor (existing flow).
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

      // Match analysis (silent; do not block on failure).
      try {
        const analysis = await geminiService.analyzeMatch(updated, jobDescription);
        setMatchAnalysis(analysis);
        await updateResumeMatchAnalysis(newId, analysis.matchScore, analysis);
      } catch (e) { console.warn('match analysis failed:', e.message); }

      // Auto-advance into email-draft step (which itself triggers Gemini).
      await draftEmail(updated);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to tailor resume.');
      setStep('pickBase');
    } finally {
      setBusy(false);
    }
  };

  // ── Step 3 → Step 4 ─────────────────────────────────────────────────────
  const draftEmail = async (resumeForDraft) => {
    setStep('email');
    setBusy(true);
    try {
      const draft = await geminiService.generateRecruiterEmail(
        jobDescription,
        resumeForDraft || tailoredResume,
        { name: user.displayName || user.email, email: user.email },
      );
      setEmailDraft({
        to: draft.recipientEmail || '',
        cc: '',
        bcc: '',
        subject: draft.subject || '',
        body: draft.body || '',
        recipientName: draft.recipientName || '',
        confidence: draft.confidence ?? 0,
      });
      analyticsService.trackCreditsUsed('tailor_and_send_email_draft', 1);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to draft recruiter email.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerateEmail = async () => {
    setError('');
    if (!tailoredResume) return;
    await draftEmail(tailoredResume);
  };

  // ── Step 4 → Step 5 (validation) ───────────────────────────────────────
  const ccList = useMemo(() => emailDraft.cc.split(',').map((s) => s.trim()).filter(Boolean), [emailDraft.cc]);
  const bccList = useMemo(() => emailDraft.bcc.split(',').map((s) => s.trim()).filter(Boolean), [emailDraft.bcc]);

  const invalidEmails = useMemo(() => {
    const bad = [];
    if (emailDraft.to && !validateEmail(emailDraft.to)) bad.push(emailDraft.to);
    [...ccList, ...bccList].forEach((e) => { if (!validateEmail(e)) bad.push(e); });
    return bad;
  }, [emailDraft.to, ccList, bccList]);

  const canSend = !!emailDraft.to.trim() && validateEmail(emailDraft.to.trim())
    && !!emailDraft.subject.trim() && !!emailDraft.body.trim()
    && invalidEmails.length === 0;

  // ── Step 5: actually send ───────────────────────────────────────────────
  const handleSend = async () => {
    if (!canSend) {
      setError('Fix the highlighted email fields before sending.');
      return;
    }
    setError('');
    setBusy(true);
    setStep('send');
    try {
      // 1. Ensure gmail.send scope.
      const accessToken = await ensureGmailAccess({ withReadonly: followUpEnabled });
      if (!accessToken) throw new Error('Gmail access was not granted.');

      // 2. Generate DOCX attachment.
      const blob = await generateDocxBlob(tailoredResume);
      const filename = `${sanitizeFilename(user.displayName || 'Resume')}_${sanitizeFilename(emailDraft.subject)}.docx`;

      // 3. Send.
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

      // 4. Fetch Message-Id header so future follow-ups can thread cleanly.
      const messageIdHeader = await getMessageIdHeader(accessToken, sendResp.id);

      // 5. Persist sentApplications record.
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
          intervalDays: followUpDays,
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
        setError('Gmail rejected the access token. Click Send again and approve the Gmail permission popup.');
      } else {
        setError(err.message || 'Failed to send email.');
      }
      setStep('email');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  const stepIndex = STEPS.indexOf(step);
  const stepLabel = {
    jd: 'Paste the job description',
    pickBase: 'Choose a base resume',
    tailor: 'Tailoring your resume…',
    email: 'Review the recruiter email',
    send: 'Sending…',
    done: 'Sent!',
  }[step];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Tailor & Send to Recruiter</h2>
              <p className="text-xs text-neutral-500">Step {Math.min(stepIndex + 1, 5)} of 5 — {stepLabel}</p>
            </div>
          </div>
          <button onClick={handleClose} disabled={busy && step !== 'done'} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3">
          <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${((stepIndex) / (STEPS.length - 1)) * 100}%` }} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'jd' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-neutral-700">Job Description</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job posting here — including any recruiter contact info..."
                className="w-full h-64 p-3 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-neutral-400"
              />
              <p className="text-xs text-neutral-500">
                Uses 2 credits: 1 to tailor the resume and 1 to draft the recruiter email. You choose the base resume next.
              </p>
            </div>
          )}

          {step === 'pickBase' && (
            <div className="space-y-3">
              {loadingResumes ? (
                <div className="py-8 text-center"><Loader2 className="w-6 h-6 text-neutral-400 animate-spin mx-auto" /></div>
              ) : (
                <>
                  <label className="text-sm font-medium text-neutral-700">Choose base resume</label>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto">
                    {allResumes.map((r) => {
                      const isSelected = selectedBaseId === r.id;
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
                            </div>
                            <div className="text-xs text-neutral-500 truncate">
                              {r.matchScore != null ? `Stored match ${r.matchScore}%` : 'Ready to tailor for this job'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'tailor' && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-neutral-700">Tailoring resume, then drafting your email…</p>
            </div>
          )}

          {step === 'email' && (
            <div className="space-y-3">
              {matchAnalysis && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                  Match score after tailoring: <strong>{matchAnalysis.matchScore}/100</strong>
                </div>
              )}
              {emailDraft.confidence < 60 && !emailDraft.to && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  AI couldn't extract a recruiter email from the JD. Enter the recipient manually.
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

              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-xs text-blue-600 hover:underline"
              >
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
                    type="button"
                    onClick={handleRegenerateEmail}
                    disabled={busy}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                </div>
                <textarea
                  value={emailDraft.body}
                  onChange={(e) => setEmailDraft({ ...emailDraft, body: e.target.value })}
                  className="w-full h-56 p-3 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-neutral-400 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-600 p-2 bg-neutral-50 border border-neutral-200 rounded-lg">
                <Paperclip className="w-3.5 h-3.5" />
                Attachment: <strong>tailored resume.docx</strong> (generated on send)
              </div>

              <div className="border border-neutral-200 rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={followUpEnabled}
                    onChange={(e) => setFollowUpEnabled(e.target.checked)}
                  />
                  <Bell className="w-4 h-4 text-neutral-500" />
                  Remind me to follow up if no reply
                </label>
                {followUpEnabled && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 pl-6">
                    <span>after</span>
                    <input
                      type="number" min="1" max="60" value={followUpDays}
                      onChange={(e) => setFollowUpDays(parseInt(e.target.value, 10) || 7)}
                      className="w-16 h-7 px-2 border border-neutral-200 rounded"
                    />
                    <span>days, up to</span>
                    <input
                      type="number" min="1" max="10" value={maxFollowUps}
                      onChange={(e) => setMaxFollowUps(parseInt(e.target.value, 10) || 3)}
                      className="w-16 h-7 px-2 border border-neutral-200 rounded"
                    />
                    <span>reminders. Requires Gmail read access (prompted on send).</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'send' && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-neutral-700">Generating attachment and sending via Gmail…</p>
            </div>
          )}

          {step === 'done' && sendResult && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm text-neutral-800 font-medium">Email sent successfully!</p>
              <p className="text-xs text-neutral-500">A copy is in your Gmail Sent folder.</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <a
                  href={`https://mail.google.com/mail/u/0/#sent/${sendResult.gmailThreadId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" /> Open in Gmail
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              if (step === 'jd') handleClose();
              else if (step === 'pickBase') setStep('jd');
              else if (step === 'email') setStep('pickBase');
              else handleClose();
            }}
            disabled={busy}
            className="h-10 px-4 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 disabled:opacity-50 flex items-center gap-1.5"
          >
            {step === 'jd' || step === 'done' ? <X className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {step === 'jd' ? 'Cancel' : step === 'done' ? 'Close' : 'Back'}
          </button>

          {step === 'jd' && (
            <button
              onClick={handleSubmitJD}
              disabled={busy || !jobDescription.trim()}
              className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Choose resume
            </button>
          )}
          {step === 'pickBase' && (
            <button
              onClick={handleConfirmBase}
              disabled={busy || !selectedBaseId}
              className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              Tailor & draft email
            </button>
          )}
          {step === 'email' && (
            <button
              onClick={handleSend}
              disabled={busy || !canSend}
              className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {hasGmailSendScope ? 'Send via Gmail' : 'Authorize Gmail & send'}
            </button>
          )}
          {step === 'done' && (
            <button
              onClick={handleClose}
              className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TailorAndSendModal;
