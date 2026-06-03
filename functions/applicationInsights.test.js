import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  derivePipelineStatusFromApplication,
  normalizeJdAnalysis,
  normalizeReplyInsight,
  normalizeResumeDiff,
} = require('./applicationInsights');

describe('application insight helpers', () => {
  it('normalizes JD analysis into bounded CRM fields', () => {
    const normalized = normalizeJdAnalysis({
      roleTitle: 'Senior Backend Engineer',
      workMode: 'hybrid',
      requiredSkills: ['Node.js', 'PostgreSQL', 'AWS'],
      preferredSkills: ['Kafka'],
      responsibilities: ['Build APIs'],
      keywords: ['node', 'aws'],
      missingSignals: ['Visa not mentioned'],
    }, { model: 'test-model', provider: 'openai' });

    expect(normalized.roleTitle).toBe('Senior Backend Engineer');
    expect(normalized.workMode).toBe('hybrid');
    expect(normalized.requiredSkills).toEqual(['Node.js', 'PostgreSQL', 'AWS']);
    expect(normalized.meta.model).toBe('test-model');
  });

  it('falls back invalid reply actions to safe approval-required recommendations', () => {
    expect(normalizeReplyInsight({ category: 'positive', confidence: 88 }).recommendedAction).toBe('draft_reply');
    expect(normalizeReplyInsight({ category: 'rejection', recommendedAction: 'draft_reply' }).recommendedAction).toBe('close_rejected');
    expect(normalizeReplyInsight({ category: 'auto-reply' }).recommendedAction).toBe('snooze');
  });

  it('derives application pipeline status from reply and follow-up state', () => {
    expect(derivePipelineStatusFromApplication({
      replyInsights: { category: 'rejection' },
    })).toBe('rejected');

    expect(derivePipelineStatusFromApplication({
      followUp: { enabled: true, nextDueAt: new Date(Date.now() - 1000) },
    })).toBe('follow_up_due');

    expect(derivePipelineStatusFromApplication({
      pipelineStatusOverride: 'interviewing',
      replyInsights: { category: 'rejection' },
    })).toBe('interviewing');
  });

  it('keeps resume diff warnings separate from positive changes', () => {
    const diff = normalizeResumeDiff({
      keyChanges: ['Moved AWS skills higher'],
      jdReasons: ['JD requires cloud infrastructure'],
      unsupportedClaimWarnings: ['Review unverified 99.99% uptime claim'],
      sectionChanges: [{ section: 'Experience', before: 'Old', after: 'New', reason: 'Matches API work' }],
    });

    expect(diff.keyChanges).toHaveLength(1);
    expect(diff.unsupportedClaimWarnings[0]).toContain('99.99%');
    expect(diff.sectionChanges[0].section).toBe('Experience');
  });
});
