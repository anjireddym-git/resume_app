import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTREACH_SETTINGS, buildFullResume } from './resumeService';

describe('buildFullResume', () => {
  it('uses shared education until the resume has an explicit education override', () => {
    const group = {
      sharedData: {
        education: [{ degree: 'MS', institution: 'Shared University' }],
      },
    };

    expect(buildFullResume(group, { customData: { education: [] } }).education).toEqual([
      { degree: 'MS', institution: 'Shared University' },
    ]);

    expect(buildFullResume(group, {
      customData: {
        education: [],
        educationOverride: true,
      },
    }).education).toEqual([]);
  });
});

describe('outreach settings defaults', () => {
  it('includes a free-text VISA Type default', () => {
    expect(DEFAULT_OUTREACH_SETTINGS.visaType).toBe('');
  });
});
