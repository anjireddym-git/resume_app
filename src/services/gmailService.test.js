import { describe, expect, it } from 'vitest';
import { buildMimeMessage, encodeMimeHeaderValue } from './gmailService';

describe('gmailService MIME encoding', () => {
  it('RFC-2047 encodes non-ASCII subject text before Gmail send', async () => {
    const subject = 'Data Scientist – Python, Azure & Agentic AI/ML Experience';
    const raw = await buildMimeMessage({
      fromName: 'Anji Reddy Modugula',
      fromEmail: 'anji@example.com',
      to: 'recruiter@example.com',
      subject,
      body: 'Hi Karthik, I am currently on H-1B work authorization.',
    });

    expect(raw).toContain('Subject: =?UTF-8?B?');
    expect(raw).not.toContain(`Subject: ${subject}`);
    expect(raw).not.toContain('Â');
  });

  it('base64 encodes text body parts so Unicode punctuation is valid MIME', async () => {
    const body = 'Hello — I have attached my resume.';
    const raw = await buildMimeMessage({
      fromEmail: 'anji@example.com',
      to: 'recruiter@example.com',
      subject: 'Data Scientist - Python',
      body,
    });

    expect(raw).toContain('Subject: Data Scientist - Python');
    expect(raw).toContain('Content-Transfer-Encoding: base64');
    expect(raw).not.toContain(body);
  });

  it('keeps plain ASCII subjects readable', () => {
    expect(encodeMimeHeaderValue('Data Scientist - Python')).toBe('Data Scientist - Python');
  });
});
