import { describe, expect, it } from 'vitest';
import {
  deriveOutreachFlowTitle,
  getOutreachFlowStatusMeta,
  isOutreachFlowActive,
  isOutreachFlowRunning,
} from './outreachFlowService';

describe('outreach flow helpers', () => {
  it('derives the most useful visible title', () => {
    expect(deriveOutreachFlowTitle({
      emailDraft: { subject: 'Frontend Engineer at Acme' },
      title: 'Fallback',
    })).toBe('Frontend Engineer at Acme');

    expect(deriveOutreachFlowTitle({
      title: 'Saved title',
      jobDescription: 'First JD line',
    })).toBe('Saved title');

    expect(deriveOutreachFlowTitle({
      jobDescription: '\n\nSenior React Engineer\nRemote',
    })).toBe('Senior React Engineer');
  });

  it('classifies active and running states', () => {
    expect(isOutreachFlowRunning({ status: 'tailoring' })).toBe(true);
    expect(isOutreachFlowRunning({ status: 'ready_to_send' })).toBe(false);
    expect(isOutreachFlowActive({ status: 'ready_to_send', isActive: true })).toBe(true);
    expect(isOutreachFlowActive({ status: 'sent', isActive: false })).toBe(false);
    expect(isOutreachFlowActive({ status: 'draft', archived: true })).toBe(false);
  });

  it('falls back for unknown status metadata', () => {
    expect(getOutreachFlowStatusMeta('ready_to_send').label).toBe('Ready');
    expect(getOutreachFlowStatusMeta('unexpected').label).toBe('unexpected');
  });
});
