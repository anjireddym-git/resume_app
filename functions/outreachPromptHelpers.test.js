import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  buildRecruiterEmailPrompt,
  extractWorkAuthorizationSignal,
  prepareFollowUpEmailPrompt,
} = require('./outreachPromptHelpers');

const tailoredResume = {
  personalInfo: { title: 'Software Engineer' },
  summary: 'Built production React and Node.js systems.',
  skills: { frontend: ['React', 'TypeScript'], backend: ['Node.js'] },
  experience: [{
    position: 'Software Engineer',
    company: 'Acme',
    highlights: ['Built React dashboards backed by Node.js APIs.'],
  }],
};

describe('outreach prompt helpers', () => {
  it('frames initial recruiter emails as very short human notes with conditional VISA context', () => {
    const prompt = buildRecruiterEmailPrompt({
      jobDescription: 'Frontend Engineer role using React. Applicants must be authorized to work in the US.',
      tailoredResume,
      userProfile: {
        name: 'Anji',
        email: 'anji@example.com',
        tone: 'enthusiastic',
        visaType: 'H-1B',
      },
    });

    expect(prompt).toContain('quick human note');
    expect(prompt).toContain('exactly 2 sentences, 35-55 words');
    expect(prompt).toContain('VISA TYPE / WORK AUTHORIZATION CONTEXT: H-1B');
    expect(prompt).toContain('Only mention VISA Type / work authorization if the job description explicitly asks');
    expect(prompt).toContain('Avoid anything that sounds AI-generated');
    expect(prompt).toContain('"recipientEmail"');
  });

  it('frames follow-ups as shorter thread-aware notes with conditional VISA use', () => {
    const { prompt, subjectFallback } = prepareFollowUpEmailPrompt({
      originalEmail: { subject: 'Frontend Engineer - React' },
      jobDescription: 'Frontend Engineer role using React.',
      userContext: { tone: 'casual', visaType: 'F-1 OPT' },
      threadMessages: [{
        direction: 'outgoing',
        kind: 'initial-outreach',
        subject: 'Frontend Engineer - React',
        body: 'Hi Sam, I applied for the Frontend Engineer role.',
      }],
      timingContext: { followUpNumber: 1, elapsedSinceLastOutgoing: '7 days' },
    });

    expect(prompt).toContain('1-2 short sentences, 25-45 words');
    expect(prompt).toContain('VISA TYPE / WORK AUTHORIZATION CONTEXT: F-1 OPT');
    expect(prompt).toContain('Mention VISA Type / work authorization only if the JD or thread asks');
    expect(prompt).toContain('Read the latest messages first');
    expect(subjectFallback).toBe('Re: Frontend Engineer - React');
  });

  it('prefers explicit user VISA Type over resume-derived authorization signals', () => {
    expect(extractWorkAuthorizationSignal(tailoredResume, { visaType: 'GC EAD' })).toBe('GC EAD');
  });
});
