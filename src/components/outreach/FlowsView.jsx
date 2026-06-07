import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckCircle2,
  ChevronLeft,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCredits } from '../../contexts/CreditsContext';
import {
  buildFullResume,
  getAllResumesForUser,
  getResume,
  getResumeGroup,
  getResumeGroups,
  getSentApplications,
  getUserSettings,
  listEmailTemplates,
} from '../../services/resumeService';
import {
  cancelOutreachFlow,
  completeOutreachSend,
  createOutreachFlow,
  deriveOutreachFlowTitle,
  enqueueOutreachFlow,
  getOutreachFlowStatusMeta,
  isOutreachFlowRunning,
  retryOutreachFlow,
  subscribeToOutreachFlowEvents,
  subscribeToOutreachFlows,
  updateOutreachFlowDraft,
} from '../../services/outreachFlowService';
import { exportToDOCX, generateDocxBlob } from '../../services/exportService';
import { getMessageIdHeader, GmailAuthError, sendGmail, validateEmail } from '../../services/gmailService';
import AgentThinkingPane from '../AgentThinkingPane';
import GeneratedDocxPreview from '../GeneratedDocxPreview';
import ResumeLibraryPicker from './ResumeLibraryPicker';
import { buildOutreachDocxRenderOptions, sanitizeOutreachFilename } from './outreachDocxOptions';

const MIN_OUTREACH_TAILOR_CREDITS = 1;

const emptyEmailDraft = {
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: '',
  recipientName: '',
  confidence: 0,
};

const defaultFollowUp = {
  enabled: true,
  intervalDays: 7,
  intervalUnit: 'days',
  intervalValue: 7,
  maxFollowUps: 3,
};

const FILTERS = [
  { id: 'active', label: 'Active' },
  { id: 'ready', label: 'Ready' },
  { id: 'running', label: 'Running' },
  { id: 'issues', label: 'Issues' },
  { id: 'sent', label: 'Sent' },
  { id: 'all', label: 'All' },
];

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const extractEmailsFromText = (text = '') => (
  [...new Set((String(text || '').match(EMAIL_REGEX) || []).map((email) => email.toLowerCase()))]
);

const formatDate = (value) => {
  if (!value) return '';
  const d = value.toDate ? value.toDate() : new Date(value);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return 'Now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return d.toLocaleDateString();
};

const splitEmailList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const getApplicationEmails = (app) => [
  app.recipientEmail,
  ...(Array.isArray(app.cc) ? app.cc : []),
  ...(Array.isArray(app.bcc) ? app.bcc : []),
].map((email) => String(email || '').trim().toLowerCase()).filter(Boolean);

const emailMatchesApplication = (emails, app) => {
  const target = new Set(emails);
  return getApplicationEmails(app).filter((email) => target.has(email));
};

const StatusPill = ({ status }) => {
  const meta = getOutreachFlowStatusMeta(status);
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.tone}`}>
      {meta.label}
    </span>
  );
};

const buildAttachmentFilename = (user, subject) => (
  `${sanitizeOutreachFilename(user?.displayName || 'Resume')}_${sanitizeOutreachFilename(subject || 'Tailored_Resume')}.docx`
);

const FlowListItem = ({ flow, active, onSelect }) => {
  const title = deriveOutreachFlowTitle(flow);
  const progress = flow.progress?.percent ?? getOutreachFlowStatusMeta(flow.status).percent;
  return (
    <button
      type="button"
      onClick={() => onSelect(flow.id)}
      className={`w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 ${active ? 'bg-blue-50' : 'bg-white'}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <StatusPill status={flow.status} />
        <span className="text-[11px] text-neutral-400 flex-shrink-0">{formatDate(flow.updatedAt)}</span>
      </div>
      <div className="text-sm font-medium text-neutral-900 truncate">{title}</div>
      <div className="mt-1 text-xs text-neutral-500 truncate">
        {flow.sourceResumeName || 'No resume selected'}
      </div>
      {isOutreachFlowRunning(flow) && (
        <div className="mt-2 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${Math.max(5, Math.min(100, progress))}%` }} />
        </div>
      )}
    </button>
  );
};

const EmailHistoryPanel = ({ emails = [], sentApplications = [], loading, error, embedded = false }) => {
  const matches = useMemo(() => (
    sentApplications
      .map((app) => ({ app, matchedEmails: emailMatchesApplication(emails, app) }))
      .filter((item) => item.matchedEmails.length > 0)
      .sort((a, b) => {
        const aTime = a.app.sentAt?.toMillis?.() || new Date(a.app.sentAt || 0).getTime();
        const bTime = b.app.sentAt?.toMillis?.() || new Date(b.app.sentAt || 0).getTime();
        return bTime - aTime;
      })
  ), [emails, sentApplications]);

  return (
    <aside className={embedded
      ? 'border-t xl:border-t-0 xl:border-l border-neutral-200 pt-4 xl:pt-0 xl:pl-5 h-fit'
      : 'bg-white border border-neutral-200 rounded-xl p-4 h-fit lg:sticky lg:top-6'}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Previous emails</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Matched from recruiter emails in recent sent outreach.</p>
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
      </div>

      {emails.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {emails.map((email) => (
            <span key={email} className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium break-all">
              {email}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
          Paste a JD with an email address and prior outreach to that address will show here.
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {emails.length > 0 && !loading && matches.length === 0 && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          No previous outreach found in recent sent history for the extracted email{emails.length > 1 ? 's' : ''}.
        </div>
      )}

      {matches.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-neutral-500">
            {matches.length} previous email{matches.length === 1 ? '' : 's'} found
          </div>
          {matches.slice(0, 12).map(({ app, matchedEmails }) => (
            <div key={app.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs text-neutral-500 truncate">
                    {matchedEmails.join(', ')}
                  </div>
                  <div className="text-sm font-medium text-neutral-900 line-clamp-2 mt-0.5">
                    {app.subject || '(no subject)'}
                  </div>
                </div>
                <span className="text-[11px] text-neutral-400 flex-shrink-0">{formatDate(app.sentAt)}</span>
              </div>
              {app.jdAnalysis?.roleTitle && (
                <div className="mt-1 text-xs text-neutral-500 truncate">
                  {app.jdAnalysis.roleTitle}{app.jdAnalysis.company ? ` · ${app.jdAnalysis.company}` : ''}
                </div>
              )}
              {app.body && (
                <p className="mt-2 text-xs text-neutral-600 line-clamp-3">
                  {String(app.body).replace(/\s+/g, ' ').trim()}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                {(app.replyCount || 0) > 0 && <span>{app.replyCount} repl{app.replyCount === 1 ? 'y' : 'ies'}</span>}
                {(app.followUp?.sentCount || 0) > 0 && <span>F/U {app.followUp.sentCount}</span>}
                {app.gmailThreadId && (
                  <a
                    href={`https://mail.google.com/mail/u/0/#sent/${app.gmailThreadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Gmail <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {matches.length > 12 && (
            <div className="text-xs text-neutral-500 text-center pt-1">
              Showing latest 12 matches.
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

const NewFlowForm = ({ onCreate, onDiscard, busy, sentApplications, sentApplicationsLoading, sentApplicationsError }) => {
  const [jobDescription, setJobDescription] = useState('');
  const extractedEmails = useMemo(() => extractEmailsFromText(jobDescription), [jobDescription]);
  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="min-w-0">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold text-neutral-900">New outreach flow</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Paste a job description. The flow is saved immediately after creation and can run alongside other jobs.
            </p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
            <label className="text-sm font-medium text-neutral-700">Job description</label>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full job posting here."
              className="w-full h-80 p-3 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-neutral-400"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onDiscard}
                className="h-10 px-3 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 inline-flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Discard
              </button>
              <button
                type="button"
                onClick={() => onCreate(jobDescription)}
                disabled={busy || !jobDescription.trim()}
                className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create flow
              </button>
            </div>
          </div>
        </div>
        <EmailHistoryPanel
          emails={extractedEmails}
          sentApplications={sentApplications}
          loading={sentApplicationsLoading}
          error={sentApplicationsError}
        />
      </div>
    </div>
  );
};

const RunningPanel = ({ flow, events }) => {
  const thoughts = events.length
    ? events.map((event) => event.message).filter(Boolean)
    : [flow.progress?.message || 'Processing outreach flow.'];
  const status = flow.status === 'tailoring' ? 'thinking' : 'writing';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Processing</h2>
        <p className="text-xs text-neutral-500 mt-1">{flow.progress?.message || 'The worker is processing this flow.'}</p>
      </div>
      <div className="h-[28rem]">
        <AgentThinkingPane
          thoughts={thoughts}
          answerPreview=""
          usage={null}
          status={status}
          elapsedMs={0}
          validator={flow.validator}
          model=""
          error={flow.error?.message || ''}
        />
      </div>
    </div>
  );
};

const uniqueIssues = (items = []) => [...new Set((items || []).filter(Boolean))];

const buildReviewIssueGroups = (flow) => {
  const validator = flow?.validator || {};
  const errorIssues = flow?.error?.issues || [];
  const hard = uniqueIssues([
    ...(validator.hardIssues || []),
    ...(validator.qualityIssues || []),
  ]);
  const soft = uniqueIssues(validator.softIssues || []);
  const evidence = uniqueIssues((validator.evidenceWarnings || []).map((issue) => `Evidence: ${issue}`));
  const fallback = uniqueIssues(errorIssues)
    .filter((issue) => !hard.includes(issue) && !soft.includes(issue) && !evidence.includes(issue));

  return [
    { id: 'hard', label: 'Blocking issues', tone: 'border-red-200 bg-red-50 text-red-800', items: hard },
    { id: 'soft', label: 'Quality warnings', tone: 'border-amber-200 bg-amber-50 text-amber-900', items: soft },
    { id: 'evidence', label: 'Evidence warnings', tone: 'border-blue-200 bg-blue-50 text-blue-900', items: evidence },
    { id: 'other', label: 'Other validator output', tone: 'border-neutral-200 bg-neutral-50 text-neutral-700', items: fallback },
  ].filter((group) => group.items.length > 0);
};

const ReviewIssueGroup = ({ group }) => (
  <div className={`rounded-lg border p-3 ${group.tone}`}>
    <div className="text-xs font-semibold mb-2">{group.label}</div>
    <div className="space-y-1 text-xs leading-relaxed max-h-40 overflow-auto pr-1">
      {group.items.map((issue) => <div key={issue}>- {issue}</div>)}
    </div>
  </div>
);

const ReviewRequiredPanel = ({ user, flow, resultBundle, onRetry, onArchive }) => {
  const [showPreview, setShowPreview] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const issueGroups = useMemo(() => buildReviewIssueGroups(flow), [flow]);
  const renderOptions = resultBundle
    ? buildOutreachDocxRenderOptions(resultBundle.group, resultBundle.full)
    : null;
  const filename = buildAttachmentFilename(user, `${deriveOutreachFlowTitle(flow)} Review`);

  const downloadReviewDraft = async () => {
    if (!resultBundle?.full || !renderOptions) return;
    setDownloading(true);
    try {
      await exportToDOCX(resultBundle.full, filename, renderOptions);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Generated resume needs review</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Email drafting is paused until the blocking resume issues are repaired.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="h-9 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Retry repair
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 inline-flex items-center gap-1.5"
          >
            <Archive className="w-4 h-4" /> Archive
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
        <div className="min-w-0 rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="h-11 px-3 border-b border-neutral-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-neutral-700 truncate">
                {resultBundle?.resume?.name || 'Review draft'}
              </div>
              <div className="text-[11px] text-neutral-500 truncate">
                {flow.reviewResumeId ? `Review resume ${flow.reviewResumeId}` : 'No review resume saved yet'}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPreview((value) => !value)}
                disabled={!resultBundle?.full}
                className="h-7 px-2 rounded border border-neutral-200 bg-white text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 inline-flex items-center gap-1"
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? 'Hide' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={downloadReviewDraft}
                disabled={downloading || !resultBundle?.full}
                className="h-7 px-2 rounded border border-neutral-200 bg-white text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 inline-flex items-center gap-1"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                DOCX
              </button>
            </div>
          </div>
          {showPreview && resultBundle?.full ? (
            <div className="h-[620px] bg-neutral-100">
              <GeneratedDocxPreview
                resumeData={resultBundle.full}
                renderOptions={renderOptions}
                debounceMs={100}
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-neutral-500">
              {resultBundle?.full ? 'Preview hidden.' : 'No generated review draft was saved for this run.'}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          {issueGroups.length > 0 ? (
            issueGroups.map((group) => <ReviewIssueGroup key={group.id} group={group} />)
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
              No validator details were saved for this run.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const DraftPanel = ({
  flow,
  allGroups,
  allResumes,
  selectedBaseId,
  setSelectedBaseId,
  jobDescriptionDraft,
  setJobDescriptionDraft,
  startFlow,
  busyAction,
  credits,
  loadingLibrary,
  sentApplications,
  sentApplicationsLoading,
  sentApplicationsError,
}) => (
  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
    <div className="space-y-4 min-w-0">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Job description</h2>
        <p className="text-xs text-neutral-500 mt-1">Changes save automatically while this flow is still a draft.</p>
      </div>
      <textarea
        value={jobDescriptionDraft}
        onChange={(event) => setJobDescriptionDraft(event.target.value)}
        className="w-full h-56 p-3 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-neutral-400"
      />

      <div className="pt-2 border-t border-neutral-100">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-neutral-900">Choose the resume to send</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Send the selected resume as-is or create a tailored child resume for this job.
          </p>
        </div>
        <ResumeLibraryPicker
          groups={allGroups}
          resumes={allResumes}
          selectedResumeId={selectedBaseId}
          onSelectResume={setSelectedBaseId}
          loading={loadingLibrary}
          jobDescription={jobDescriptionDraft || flow.jobDescription || ''}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-neutral-100">
        <button
          type="button"
          onClick={() => startFlow('existing')}
          disabled={busyAction || !selectedBaseId}
          className="h-10 px-4 border border-neutral-200 bg-white text-neutral-800 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busyAction === 'existing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Use as-is & draft email
        </button>
        <button
          type="button"
          onClick={() => startFlow('tailored')}
          disabled={busyAction || !selectedBaseId || credits < MIN_OUTREACH_TAILOR_CREDITS}
          title={credits < MIN_OUTREACH_TAILOR_CREDITS ? 'Tailoring needs 1 credit' : undefined}
          className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busyAction === 'tailored' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Tailor & draft email
        </button>
      </div>
    </div>
    <EmailHistoryPanel
      emails={extractEmailsFromText(jobDescriptionDraft || flow.jobDescription || '')}
      sentApplications={sentApplications}
      loading={sentApplicationsLoading}
      error={sentApplicationsError}
      embedded={true}
    />
  </div>
);

const ReadyPanel = ({
  user,
  flow,
  emailDraft,
  setEmailDraft,
  markEmailDirty,
  followUp,
  setFollowUp,
  markFollowUpDirty,
  templates,
  resultBundle,
  sending,
  onSend,
  onRetry,
  onArchive,
}) => {
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [downloadingAttachment, setDownloadingAttachment] = useState(false);
  const ccList = useMemo(() => splitEmailList(emailDraft.cc), [emailDraft.cc]);
  const bccList = useMemo(() => splitEmailList(emailDraft.bcc), [emailDraft.bcc]);
  const invalidEmails = useMemo(() => {
    const bad = [];
    if (emailDraft.to && !validateEmail(emailDraft.to)) bad.push(emailDraft.to);
    [...ccList, ...bccList].forEach((item) => {
      if (!validateEmail(item)) bad.push(item);
    });
    return bad;
  }, [bccList, ccList, emailDraft.to]);
  const canSend = !!emailDraft.to.trim()
    && validateEmail(emailDraft.to.trim())
    && !!emailDraft.subject.trim()
    && !!emailDraft.body.trim()
    && invalidEmails.length === 0
    && !!resultBundle?.full;
  const renderOptions = resultBundle
    ? buildOutreachDocxRenderOptions(resultBundle.group, resultBundle.full)
    : null;
  const filename = buildAttachmentFilename(user, emailDraft.subject);

  const applyTemplate = (templateId) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setEmailDraft((draft) => ({
      ...draft,
      subject: template.subject || draft.subject,
      body: template.body || draft.body,
    }));
    markEmailDirty();
  };

  const downloadAttachment = async () => {
    if (!resultBundle?.full || !renderOptions) return;
    setDownloadingAttachment(true);
    try {
      await exportToDOCX(resultBundle.full, filename, renderOptions);
    } finally {
      setDownloadingAttachment(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Review email</h2>
          <p className="text-xs text-neutral-500 mt-1">Edits save automatically before sending.</p>
        </div>
        <button
          type="button"
          onClick={onArchive}
          className="h-8 px-2 text-xs border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 inline-flex items-center gap-1"
        >
          <Archive className="w-3.5 h-3.5" /> Archive
        </button>
      </div>

      {emailDraft.confidence < 60 && !emailDraft.to && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          AI could not extract a recruiter email from the JD. Enter the recipient manually.
        </div>
      )}

      {templates.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-600">Insert template</label>
          <select
            onChange={(event) => {
              if (event.target.value) applyTemplate(event.target.value);
              event.target.value = '';
            }}
            className="h-8 px-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white"
          >
            <option value="">Choose...</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-neutral-600">To</label>
        <input
          type="email"
          value={emailDraft.to}
          onChange={(event) => {
            setEmailDraft({ ...emailDraft, to: event.target.value });
            markEmailDirty();
          }}
          placeholder="recruiter@example.com"
          className={`w-full h-9 px-3 text-sm border rounded-lg focus:outline-none ${
            emailDraft.to && !validateEmail(emailDraft.to) ? 'border-red-300 focus:border-red-500' : 'border-neutral-200 focus:border-neutral-400'
          }`}
        />
      </div>

      <button type="button" onClick={() => setShowCcBcc((value) => !value)} className="text-xs text-blue-600 hover:underline">
        {showCcBcc ? 'Hide' : 'Add'} CC / BCC
      </button>

      {showCcBcc && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-neutral-600">CC</label>
            <input
              value={emailDraft.cc}
              onChange={(event) => {
                setEmailDraft({ ...emailDraft, cc: event.target.value });
                markEmailDirty();
              }}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">BCC</label>
            <input
              value={emailDraft.bcc}
              onChange={(event) => {
                setEmailDraft({ ...emailDraft, bcc: event.target.value });
                markEmailDirty();
              }}
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
          onChange={(event) => {
            setEmailDraft({ ...emailDraft, subject: event.target.value });
            markEmailDirty();
          }}
          className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-neutral-600">Body</label>
        <textarea
          value={emailDraft.body}
          onChange={(event) => {
            setEmailDraft({ ...emailDraft, body: event.target.value });
            markEmailDirty();
          }}
          className="w-full h-64 p-3 text-sm border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-neutral-400 font-mono"
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-600 p-2 bg-neutral-50 border border-neutral-200 rounded-lg">
        <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="min-w-0 flex-1 truncate">Attachment: <strong>{filename}</strong></span>
        <button
          type="button"
          onClick={() => setShowAttachmentPreview((value) => !value)}
          disabled={!resultBundle?.full}
          className="h-7 px-2 rounded border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 inline-flex items-center gap-1"
        >
          {showAttachmentPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showAttachmentPreview ? 'Hide' : 'Preview'}
        </button>
        <button
          type="button"
          onClick={downloadAttachment}
          disabled={downloadingAttachment || !resultBundle?.full}
          className="h-7 px-2 rounded border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 inline-flex items-center gap-1"
        >
          {downloadingAttachment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          DOCX
        </button>
      </div>

      {showAttachmentPreview && resultBundle?.full && (
        <div className="h-[520px] overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <GeneratedDocxPreview
            resumeData={resultBundle.full}
            renderOptions={renderOptions}
            debounceMs={100}
          />
        </div>
      )}

      <div className="border border-neutral-200 rounded-lg p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input
            type="checkbox"
            checked={!!followUp.enabled}
            onChange={(event) => {
              setFollowUp({ ...followUp, enabled: event.target.checked });
              markFollowUpDirty();
            }}
          />
          <Bell className="w-4 h-4 text-neutral-500" />
          Remind me to follow up if no reply
        </label>
        {followUp.enabled && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 pl-6">
            <span>after</span>
            <input
              type="number"
              min="1"
              max="999"
              value={followUp.intervalValue ?? followUp.intervalDays ?? 7}
              onChange={(event) => {
                setFollowUp({ ...followUp, intervalValue: Math.max(1, parseInt(event.target.value, 10) || 1) });
                markFollowUpDirty();
              }}
              className="w-16 h-7 px-2 border border-neutral-200 rounded"
            />
            <select
              value={followUp.intervalUnit || 'days'}
              onChange={(event) => {
                setFollowUp({ ...followUp, intervalUnit: event.target.value });
                markFollowUpDirty();
              }}
              className="h-7 px-1.5 border border-neutral-200 rounded bg-white"
            >
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
            <span>, up to</span>
            <input
              type="number"
              min="1"
              max="10"
              value={followUp.maxFollowUps || 3}
              onChange={(event) => {
                setFollowUp({ ...followUp, maxFollowUps: parseInt(event.target.value, 10) || 3 });
                markFollowUpDirty();
              }}
              className="w-16 h-7 px-2 border border-neutral-200 rounded"
            />
            <span>reminders</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
        <button
          type="button"
          onClick={onRetry}
          className="h-9 px-3 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-100 inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" /> Redraft
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !canSend}
          className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send via Gmail
        </button>
      </div>
    </div>
  );
};

const FlowDetail = ({
  user,
  flow,
  events,
  allGroups,
  allResumes,
  loadingLibrary,
  selectedBaseId,
  setSelectedBaseId,
  jobDescriptionDraft,
  setJobDescriptionDraft,
  startFlow,
  busyAction,
  credits,
  sentApplications,
  sentApplicationsLoading,
  sentApplicationsError,
  emailDraft,
  setEmailDraft,
  markEmailDirty,
  followUp,
  setFollowUp,
  markFollowUpDirty,
  templates,
  resultBundle,
  sending,
  sendReadyFlow,
  retryFlow,
  cancelFlow,
  archiveFlow,
}) => {
  if (!flow) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
        <FileText className="w-12 h-12 mb-3" />
        <p className="text-sm">Select a flow or create a new one.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusPill status={flow.status} />
            {flow.mode && <span className="text-xs text-neutral-500 capitalize">{flow.mode}</span>}
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 truncate">{deriveOutreachFlowTitle(flow)}</h1>
          <p className="text-sm text-neutral-500 mt-1 truncate">{flow.sourceResumeName || 'No resume selected'}</p>
        </div>
        {isOutreachFlowRunning(flow) && (
          <button
            type="button"
            onClick={cancelFlow}
            className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 inline-flex items-center gap-1.5"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        )}
        {flow.status === 'draft' && (
          <button
            type="button"
            onClick={archiveFlow}
            className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 inline-flex items-center gap-1.5"
          >
            <Archive className="w-4 h-4" /> Archive
          </button>
        )}
      </div>

      {flow.error?.message && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{flow.error.message}</span>
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl p-5 min-w-0">
        {flow.status === 'draft' && (
          <DraftPanel
            flow={flow}
            allGroups={allGroups}
            allResumes={allResumes}
            selectedBaseId={selectedBaseId}
            setSelectedBaseId={setSelectedBaseId}
            jobDescriptionDraft={jobDescriptionDraft}
            setJobDescriptionDraft={setJobDescriptionDraft}
            startFlow={startFlow}
            busyAction={busyAction}
            credits={credits}
            loadingLibrary={loadingLibrary}
            sentApplications={sentApplications}
            sentApplicationsLoading={sentApplicationsLoading}
            sentApplicationsError={sentApplicationsError}
          />
        )}

        {isOutreachFlowRunning(flow) && <RunningPanel flow={flow} events={events} />}

        {flow.status === 'ready_to_send' && (
          <ReadyPanel
            user={user}
            flow={flow}
            emailDraft={emailDraft}
            setEmailDraft={setEmailDraft}
            markEmailDirty={markEmailDirty}
            followUp={followUp}
            setFollowUp={setFollowUp}
            markFollowUpDirty={markFollowUpDirty}
            templates={templates}
            resultBundle={resultBundle}
            sending={sending}
            onSend={sendReadyFlow}
            onRetry={retryFlow}
            onArchive={archiveFlow}
          />
        )}

        {flow.status === 'review_required' && (
          <ReviewRequiredPanel
            user={user}
            flow={flow}
            resultBundle={resultBundle}
            onRetry={retryFlow}
            onArchive={archiveFlow}
          />
        )}

        {['failed', 'canceled'].includes(flow.status) && (
          <div className="py-12 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <p className="text-sm font-medium text-neutral-800">
              {flow.status === 'canceled' ? 'Flow canceled' : 'Flow failed'}
            </p>
            {flow.validator?.issues?.length > 0 && (
              <div className="max-w-2xl mx-auto text-left text-xs text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                {flow.validator.issues.slice(0, 6).map((issue) => <div key={issue}>- {issue}</div>)}
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={retryFlow}
                className="h-9 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <button
                type="button"
                onClick={archiveFlow}
                className="h-9 px-3 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 inline-flex items-center gap-1.5"
              >
                <Archive className="w-4 h-4" /> Archive
              </button>
            </div>
          </div>
        )}

        {flow.status === 'sent' && (
          <div className="py-12 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <p className="text-base text-neutral-800 font-medium">Email sent successfully</p>
            <p className="text-xs text-neutral-500">This flow is linked to Sent outreach history.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const FlowsView = ({ user, onSent, onResumeCreated }) => {
  const { ensureGmailAccess } = useAuth();
  const { credits } = useCredits();
  const [flows, setFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [allResumes, setAllResumes] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [sentApplications, setSentApplications] = useState([]);
  const [sentApplicationsLoading, setSentApplicationsLoading] = useState(false);
  const [sentApplicationsError, setSentApplicationsError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const [selectedBaseId, setSelectedBaseId] = useState(null);
  const [jobDescriptionDraft, setJobDescriptionDraft] = useState('');
  const [jobDescriptionDirty, setJobDescriptionDirty] = useState(false);
  const [emailDraft, setEmailDraft] = useState(emptyEmailDraft);
  const [emailDirty, setEmailDirty] = useState(false);
  const [followUp, setFollowUp] = useState(defaultFollowUp);
  const [followUpDirty, setFollowUpDirty] = useState(false);
  const [resultBundle, setResultBundle] = useState(null);

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.id === selectedFlowId) || null,
    [flows, selectedFlowId],
  );

  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeToOutreachFlows(
      user.uid,
      (items) => {
        setFlows(items);
        setSelectedFlowId((current) => {
          if (current && items.some((item) => item.id === current)) return current;
          return items.find((item) => item.status !== 'sent' && !item.archived)?.id || items[0]?.id || null;
        });
      },
      (err) => setError(err.message || 'Failed to load outreach flows.'),
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    let alive = true;
    setLoadingLibrary(true);
    Promise.all([
      getAllResumesForUser(user.uid),
      getResumeGroups(user.uid),
      listEmailTemplates(user.uid),
      getUserSettings(user.uid),
    ])
      .then(([resumes, groups, emailTemplates, loadedSettings]) => {
        if (!alive) return;
        setAllResumes(resumes);
        setAllGroups(groups);
        setTemplates(emailTemplates);
        setSettings(loadedSettings);
      })
      .catch((err) => setError(err.message || 'Failed to load resume library.'))
      .finally(() => { if (alive) setLoadingLibrary(false); });
    return () => { alive = false; };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    let alive = true;
    setSentApplicationsLoading(true);
    setSentApplicationsError('');
    getSentApplications(user.uid, 1000)
      .then((items) => {
        if (alive) setSentApplications(items);
      })
      .catch((err) => {
        if (alive) setSentApplicationsError(err.message || 'Failed to load previous sent emails.');
      })
      .finally(() => {
        if (alive) setSentApplicationsLoading(false);
      });
    return () => { alive = false; };
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedFlow?.id) {
      setEvents([]);
      return undefined;
    }
    return subscribeToOutreachFlowEvents(
      selectedFlow.id,
      setEvents,
      () => setEvents([]),
    );
  }, [selectedFlow?.id]);

  useEffect(() => {
    if (!selectedFlow) return;
    setSelectedBaseId(selectedFlow.sourceResumeId || null);
    setJobDescriptionDraft(selectedFlow.jobDescription || '');
    setJobDescriptionDirty(false);
    setEmailDraft({ ...emptyEmailDraft, ...(selectedFlow.emailDraft || {}) });
    setEmailDirty(false);
    setFollowUp({ ...(settings?.defaultFollowUp || defaultFollowUp), ...(selectedFlow.followUp || {}) });
    setFollowUpDirty(false);
  }, [selectedFlow?.id, selectedFlow?.status, settings?.defaultFollowUp]);

  useEffect(() => {
    if (!selectedFlow?.id || selectedFlow.status !== 'draft' || !jobDescriptionDirty) return undefined;
    const timer = setTimeout(() => {
      updateOutreachFlowDraft(selectedFlow.id, { jobDescription: jobDescriptionDraft })
        .then(() => setJobDescriptionDirty(false))
        .catch((err) => setError(err.message || 'Failed to save job description.'));
    }, 600);
    return () => clearTimeout(timer);
  }, [jobDescriptionDirty, jobDescriptionDraft, selectedFlow?.id, selectedFlow?.status]);

  useEffect(() => {
    if (!selectedFlow?.id || selectedFlow.status !== 'ready_to_send' || (!emailDirty && !followUpDirty)) return undefined;
    const timer = setTimeout(() => {
      updateOutreachFlowDraft(selectedFlow.id, {
        ...(emailDirty ? { emailDraft } : {}),
        ...(followUpDirty ? { followUp } : {}),
      })
        .then(() => {
          setEmailDirty(false);
          setFollowUpDirty(false);
        })
        .catch((err) => setError(err.message || 'Failed to save email draft.'));
    }, 700);
    return () => clearTimeout(timer);
  }, [emailDirty, emailDraft, followUp, followUpDirty, selectedFlow?.id, selectedFlow?.status]);

  useEffect(() => {
    if (!selectedBaseId || !selectedFlow?.id || selectedFlow.status !== 'draft') return;
    if (selectedBaseId === selectedFlow.sourceResumeId) return;
    updateOutreachFlowDraft(selectedFlow.id, { sourceResumeId: selectedBaseId })
      .catch((err) => setError(err.message || 'Failed to save selected resume.'));
  }, [selectedBaseId, selectedFlow?.id, selectedFlow?.sourceResumeId, selectedFlow?.status]);

  const selectedPreviewResumeId = selectedFlow?.resultResumeId || selectedFlow?.reviewResumeId || null;

  useEffect(() => {
    if (!selectedPreviewResumeId) {
      setResultBundle(null);
      return;
    }
    let alive = true;
    setResultBundle(null);
    getResume(selectedPreviewResumeId)
      .then(async (resume) => {
        const group = await getResumeGroup(resume.groupId);
        if (!alive) return;
        setResultBundle({ resume, group, full: buildFullResume(group, resume) });
      })
      .catch((err) => setError(err.message || 'Failed to load generated resume.'))
      .finally(() => {});
    return () => { alive = false; };
  }, [selectedPreviewResumeId]);

  const filteredFlows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flows.filter((flow) => {
      if (flow.archived && filter !== 'all') return false;
      if (filter === 'active' && (flow.status === 'sent' || flow.status === 'canceled')) return false;
      if (filter === 'ready' && flow.status !== 'ready_to_send') return false;
      if (filter === 'running' && !isOutreachFlowRunning(flow)) return false;
      if (filter === 'issues' && !['failed', 'review_required'].includes(flow.status)) return false;
      if (filter === 'sent' && flow.status !== 'sent') return false;
      if (!q) return true;
      return deriveOutreachFlowTitle(flow).toLowerCase().includes(q)
        || String(flow.sourceResumeName || '').toLowerCase().includes(q)
        || String(flow.jobDescription || '').toLowerCase().includes(q);
    });
  }, [filter, flows, search]);

  const handleCreate = async (jobDescription) => {
    setCreating(true);
    setError('');
    try {
      const flowId = await createOutreachFlow({ jobDescription });
      setSelectedFlowId(flowId);
      setShowNew(false);
    } catch (err) {
      setError(err.message || 'Failed to create outreach flow.');
    } finally {
      setCreating(false);
    }
  };

  const startFlow = async (mode) => {
    if (!selectedFlow?.id || !selectedBaseId) return;
    setBusyAction(mode);
    setError('');
    try {
      await enqueueOutreachFlow({
        flowId: selectedFlow.id,
        sourceResumeId: selectedBaseId,
        mode,
        jobDescription: jobDescriptionDraft,
        followUp,
      });
    } catch (err) {
      setError(err.message || 'Failed to start outreach flow.');
    } finally {
      setBusyAction('');
    }
  };

  const retryFlow = async () => {
    if (!selectedFlow?.id) return;
    setBusyAction('retry');
    setError('');
    try {
      await retryOutreachFlow(selectedFlow.id);
    } catch (err) {
      setError(err.message || 'Failed to retry flow.');
    } finally {
      setBusyAction('');
    }
  };

  const cancelFlow = async () => {
    if (!selectedFlow?.id) return;
    setBusyAction('cancel');
    setError('');
    try {
      await cancelOutreachFlow(selectedFlow.id);
    } catch (err) {
      setError(err.message || 'Failed to cancel flow.');
    } finally {
      setBusyAction('');
    }
  };

  const archiveFlow = async () => {
    if (!selectedFlow?.id) return;
    try {
      await updateOutreachFlowDraft(selectedFlow.id, { archived: true });
      setSelectedFlowId(null);
      setShowNew(false);
    } catch (err) {
      setError(err.message || 'Failed to archive flow.');
    }
  };

  const sendReadyFlow = async () => {
    if (!selectedFlow?.id || !resultBundle?.full) return;
    setSending(true);
    setError('');
    try {
      if (emailDirty || followUpDirty) {
        await updateOutreachFlowDraft(selectedFlow.id, {
          ...(emailDirty ? { emailDraft } : {}),
          ...(followUpDirty ? { followUp } : {}),
        });
        setEmailDirty(false);
        setFollowUpDirty(false);
      }
      const ccList = splitEmailList(emailDraft.cc);
      const bccList = splitEmailList(emailDraft.bcc);
      const accessToken = await ensureGmailAccess({ withReadonly: followUp.enabled });
      const renderOptions = buildOutreachDocxRenderOptions(resultBundle.group, resultBundle.full);
      const blob = await generateDocxBlob(resultBundle.full, renderOptions);
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
          filename: buildAttachmentFilename(user, emailDraft.subject),
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          blob,
        },
      });
      const messageIdHeader = await getMessageIdHeader(accessToken, sendResp.id);
      const sentApplicationId = await completeOutreachSend({
        flowId: selectedFlow.id,
        emailDraft,
        gmail: {
          gmailMessageId: sendResp.id,
          gmailThreadId: sendResp.threadId,
          gmailMessageIdHeader: messageIdHeader,
        },
      });
      if (selectedFlow.mode === 'tailored' && selectedFlow.resultResumeId && onResumeCreated) {
        onResumeCreated(selectedFlow.resultResumeId, selectedFlow.groupId);
      }
      if (onSent) onSent(sentApplicationId);
    } catch (err) {
      if (err instanceof GmailAuthError) {
        setError('Gmail rejected the access token. Click Send again and approve the popup.');
      } else {
        setError(err.message || 'Failed to send email.');
      }
    } finally {
      setSending(false);
    }
  };

  const selectedVisible = !!selectedFlow && !showNew;

  return (
    <div className="h-full flex bg-neutral-50">
      <div className={`${selectedVisible ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-96 border-r border-neutral-200 bg-white`}>
        <div className="p-4 border-b border-neutral-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-neutral-900">Outreach flows</h1>
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="h-8 px-2.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search flows..."
              className="w-full h-9 pl-8 pr-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`px-2.5 py-1 text-xs rounded-full border ${
                  filter === item.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="ml-auto text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {filteredFlows.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500 px-6">
              No flows match this view.
            </div>
          ) : (
            filteredFlows.map((flow) => (
              <FlowListItem
                key={flow.id}
                flow={flow}
                active={flow.id === selectedFlowId && !showNew}
                onSelect={(id) => {
                  setSelectedFlowId(id);
                  setShowNew(false);
                }}
              />
            ))
          )}
        </div>
      </div>

      <div className={`${selectedVisible || showNew ? 'flex' : 'hidden lg:flex'} flex-col flex-1 min-w-0 bg-neutral-50`}>
        {selectedVisible && (
          <div className="lg:hidden p-3 border-b border-neutral-200 bg-white">
            <button
              type="button"
              onClick={() => setSelectedFlowId(null)}
              className="text-sm text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {showNew ? (
            <NewFlowForm
              onCreate={handleCreate}
              onDiscard={() => setShowNew(false)}
              busy={creating}
              sentApplications={sentApplications}
              sentApplicationsLoading={sentApplicationsLoading}
              sentApplicationsError={sentApplicationsError}
            />
          ) : (
            <FlowDetail
              user={user}
              flow={selectedFlow}
              events={events}
              allGroups={allGroups}
              allResumes={allResumes}
              loadingLibrary={loadingLibrary}
              selectedBaseId={selectedBaseId}
              setSelectedBaseId={setSelectedBaseId}
              jobDescriptionDraft={jobDescriptionDraft}
              setJobDescriptionDraft={(value) => {
                setJobDescriptionDraft(value);
                setJobDescriptionDirty(true);
              }}
              startFlow={startFlow}
              busyAction={busyAction}
              credits={credits}
              sentApplications={sentApplications}
              sentApplicationsLoading={sentApplicationsLoading}
              sentApplicationsError={sentApplicationsError}
              emailDraft={emailDraft}
              setEmailDraft={setEmailDraft}
              markEmailDirty={() => setEmailDirty(true)}
              followUp={followUp}
              setFollowUp={setFollowUp}
              markFollowUpDirty={() => setFollowUpDirty(true)}
              templates={templates}
              resultBundle={resultBundle}
              sending={sending}
              sendReadyFlow={sendReadyFlow}
              retryFlow={retryFlow}
              cancelFlow={cancelFlow}
              archiveFlow={archiveFlow}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FlowsView;
