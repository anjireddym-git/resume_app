import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');

describe('target role contract integration points', () => {
  it('feeds target role contract instructions into generation and repair prompts', () => {
    expect(source).toContain('buildTargetRoleContractContext(currentResume, jobDescription)');
    expect(source).toContain('buildTargetRoleContractContext(resume, jobDescription)');
    expect(source).toContain('buildTargetRoleContractContext(originalResume, jobDescription)');
    expect(source).toContain('targetContext.instructions');
  });

  it('emits target contract validation fields in streaming validator chunks', () => {
    expect(source).toContain('coverageIssues: validator.coverageIssues || []');
    expect(source).toContain('evidenceWarnings: validator.evidenceWarnings || []');
    expect(source).toContain('coverageReport: validator.coverageReport || null');
    expect(source).toContain('targetContract: repairedValidator.targetContract || null');
  });

  it('blocks email drafting but persists a review resume when hard issues remain', () => {
    expect(source).toContain("status: 'review_required'");
    expect(source).toContain('reviewResumeId');
    expect(source).toContain("reviewStatus: 'review_required'");
    expect(source).toContain('outreach-flow-worker-review-required');
    expect(source).toContain('validator,');
    expect(source).toContain('Tailored resume needs review before email drafting.');
  });
});
