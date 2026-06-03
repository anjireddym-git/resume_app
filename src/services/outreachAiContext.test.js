import { describe, expect, it } from 'vitest';
import { buildOutreachUserContext, buildOutreachUserProfile } from './outreachAiContext';

describe('outreach AI context helpers', () => {
  it('passes VISA Type and tone into initial recruiter email context', () => {
    expect(buildOutreachUserProfile(
      { displayName: 'Anji', email: 'anji@example.com' },
      { aiTone: 'casual', visaType: 'H-1B' },
    )).toEqual({
      name: 'Anji',
      email: 'anji@example.com',
      tone: 'casual',
      visaType: 'H-1B',
    });
  });

  it('passes VISA Type and tone into follow-up context', () => {
    expect(buildOutreachUserContext({ aiTone: 'enthusiastic', visaType: 'GC EAD' })).toEqual({
      tone: 'enthusiastic',
      visaType: 'GC EAD',
    });
  });
});
