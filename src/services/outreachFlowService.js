import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';

const createOutreachFlowFn = httpsCallable(functions, 'createOutreachFlow');
const enqueueOutreachFlowFn = httpsCallable(functions, 'enqueueOutreachFlow');
const retryOutreachFlowFn = httpsCallable(functions, 'retryOutreachFlow');
const cancelOutreachFlowFn = httpsCallable(functions, 'cancelOutreachFlow');
const completeOutreachSendFn = httpsCallable(functions, 'completeOutreachSend');

export const OUTREACH_FLOW_STATUS = {
  draft: { label: 'Draft', tone: 'bg-neutral-100 text-neutral-700', percent: 0 },
  queued: { label: 'Queued', tone: 'bg-blue-100 text-blue-700', percent: 5 },
  tailoring: { label: 'Tailoring', tone: 'bg-violet-100 text-violet-700', percent: 35 },
  drafting_email: { label: 'Drafting email', tone: 'bg-amber-100 text-amber-700', percent: 70 },
  ready_to_send: { label: 'Ready', tone: 'bg-emerald-100 text-emerald-700', percent: 90 },
  review_required: { label: 'Review needed', tone: 'bg-orange-100 text-orange-700', percent: 55 },
  failed: { label: 'Failed', tone: 'bg-red-100 text-red-700', percent: 0 },
  canceled: { label: 'Canceled', tone: 'bg-neutral-100 text-neutral-500', percent: 100 },
  sent: { label: 'Sent', tone: 'bg-emerald-100 text-emerald-700', percent: 100 },
};

export const RUNNING_OUTREACH_FLOW_STATUSES = new Set(['queued', 'tailoring', 'drafting_email']);

export const isOutreachFlowRunning = (flow) => RUNNING_OUTREACH_FLOW_STATUSES.has(flow?.status);

export const isOutreachFlowActive = (flow) => (
  flow?.isActive !== false && flow?.archived !== true && flow?.status !== 'sent' && flow?.status !== 'canceled'
);

export const getOutreachFlowStatusMeta = (status) => (
  OUTREACH_FLOW_STATUS[status] || { label: status || 'Unknown', tone: 'bg-neutral-100 text-neutral-600', percent: 0 }
);

export const deriveOutreachFlowTitle = (flow) => {
  const subject = flow?.emailDraft?.subject;
  if (subject) return subject;
  if (flow?.title) return flow.title;
  const firstLine = String(flow?.jobDescription || '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine || 'Untitled outreach flow';
};

export const createOutreachFlow = async ({ jobDescription }) => {
  const result = await createOutreachFlowFn({ jobDescription });
  return result.data?.flowId;
};

export const enqueueOutreachFlow = async ({ flowId, sourceResumeId, mode, jobDescription, followUp }) => {
  await enqueueOutreachFlowFn({ flowId, sourceResumeId, mode, jobDescription, followUp });
};

export const retryOutreachFlow = async (flowId) => {
  await retryOutreachFlowFn({ flowId });
};

export const cancelOutreachFlow = async (flowId) => {
  await cancelOutreachFlowFn({ flowId });
};

export const completeOutreachSend = async ({ flowId, emailDraft, gmail }) => {
  const result = await completeOutreachSendFn({ flowId, emailDraft, gmail });
  return result.data?.sentApplicationId;
};

export const updateOutreachFlowDraft = async (flowId, patch) => {
  const allowed = {};
  ['jobDescription', 'sourceResumeId', 'emailDraft', 'followUp', 'archived'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(patch, key)) allowed[key] = patch[key];
  });
  if (Object.keys(allowed).length === 0) return;
  await updateDoc(doc(db, 'outreachFlows', flowId), {
    ...allowed,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToOutreachFlows = (userId, onNext, onError, max = 100) => {
  const flowsQuery = query(
    collection(db, 'outreachFlows'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(max),
  );
  return onSnapshot(
    flowsQuery,
    (snap) => onNext(snap.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  );
};

export const subscribeToOutreachFlowEvents = (flowId, onNext, onError) => {
  const eventsQuery = query(
    collection(db, 'outreachFlows', flowId, 'events'),
    orderBy('createdAtMs', 'asc'),
    limit(100),
  );
  return onSnapshot(
    eventsQuery,
    (snap) => onNext(snap.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  );
};
