import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(new URL('./FlowsView.jsx', import.meta.url), 'utf8');

describe('outreach review-required surface contract', () => {
  it('loads reviewResumeId drafts for failed tailoring review', () => {
    expect(source).toContain('selectedFlow?.resultResumeId || selectedFlow?.reviewResumeId || null');
    expect(source).toContain('getResume(selectedPreviewResumeId)');
  });

  it('renders a review panel with generated resume preview and grouped issues', () => {
    expect(source).toContain('const ReviewRequiredPanel');
    expect(source).toContain('Generated resume needs review');
    expect(source).toContain('GeneratedDocxPreview');
    expect(source).toContain('buildReviewIssueGroups');
    expect(source).toContain('Blocking issues');
    expect(source).toContain('Quality warnings');
  });
});
