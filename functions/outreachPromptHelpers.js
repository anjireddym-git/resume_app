function normalizeOutreachSubject(subject = '') {
  return String(subject || '')
    .replace(/[–—−]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 160);
}

function collectTopSkills(tailoredResume = {}) {
  const skills = tailoredResume?.skills || {};
  if (Array.isArray(skills)) {
    return skills
      .flatMap((entry) => [
        entry?.label,
        ...(Array.isArray(entry?.items) ? entry.items : []),
      ])
      .filter(Boolean)
      .slice(0, 15);
  }

  return Object.values(skills)
    .flatMap((items) => (Array.isArray(items) ? items : [items]))
    .filter(Boolean)
    .slice(0, 15);
}

function extractWorkAuthorizationSignal(tailoredResume = {}, userProfile = {}) {
  const explicit = userProfile?.workAuthorization || userProfile?.visaStatus || userProfile?.visaType;
  if (explicit) return String(explicit).trim();

  const skills = tailoredResume?.skills || {};
  const skillText = Array.isArray(skills)
    ? skills.flatMap((entry) => [entry?.label, ...(entry?.items || [])]).join(' ')
    : Object.entries(skills).flatMap(([label, items]) => [label, ...(Array.isArray(items) ? items : [])]).join(' ');
  const resumeText = [
    tailoredResume?.summary,
    tailoredResume?.personalInfo?.title,
    skillText,
    ...(tailoredResume?.experience || []).flatMap((exp) => [
      exp?.position,
      exp?.company,
      ...(exp?.highlights || []),
    ]),
  ].filter(Boolean).join(' ');

  const patterns = [
    { re: /\bH[-\s]?1B\b/i, label: 'H-1B' },
    { re: /\bH[-\s]?4\s*EAD\b/i, label: 'H-4 EAD' },
    { re: /\bGC\s*EAD\b/i, label: 'GC EAD' },
    { re: /\bOPT\b/i, label: 'OPT' },
    { re: /\bCPT\b/i, label: 'CPT' },
    { re: /\bGreen Card\b/i, label: 'Green Card' },
    { re: /\bUS Citizen\b/i, label: 'US Citizen' },
  ];
  return patterns.find((item) => item.re.test(resumeText))?.label || '';
}

function normalizeTone(tone) {
  if (tone === 'casual' || tone === 'enthusiastic') return tone;
  return 'professional';
}

function toneInstruction(tone) {
  const normalized = normalizeTone(tone);
  if (normalized === 'casual') return 'slightly warm and conversational, but still direct and brief';
  if (normalized === 'enthusiastic') return 'interested and positive, but not hype, salesy, or over-polished';
  return 'plain, respectful, direct, and not stiff';
}

function buildRecruiterEmailPrompt({ jobDescription = '', tailoredResume = {}, userProfile = {} } = {}) {
  const name = userProfile?.name || 'Candidate';
  const email = userProfile?.email || '';
  const workAuthorization = extractWorkAuthorizationSignal(tailoredResume, userProfile);
  const tone = normalizeTone(userProfile?.tone);

  return `Draft a quick human note from a candidate to a recruiter for a specific job posting.
Write like a real person: simple, direct, and specific. Avoid anything that sounds AI-generated, overly polished, or like a sales pitch.

CANDIDATE:
Name: ${name}
Email: ${email}
Tone setting: ${tone} (${toneInstruction(tone)})
VISA TYPE / WORK AUTHORIZATION CONTEXT: ${workAuthorization || 'Not provided'}
Only mention VISA Type / work authorization if the job description explicitly asks about authorization, sponsorship, visa status, or work eligibility.

TAILORED RESUME (compact):
${JSON.stringify({
    headline: tailoredResume?.personalInfo?.title || '',
    summary: tailoredResume?.summary || '',
    topSkills: collectTopSkills(tailoredResume),
    topExperience: (tailoredResume?.experience || []).slice(0, 3).map((e) => ({
      position: e.position || '',
      company: e.company || '',
      highlights: (e.highlights || []).slice(0, 3),
    })),
  }, null, 2)}

JOB DESCRIPTION:
${jobDescription}

TASKS:
1. Extract the most likely recruiter / hiring manager email address from the JD. Look for "apply to", "send resume to", "contact:", an explicit @ in body, etc. If multiple candidates exist, pick the most specific. If NONE is present, return null.
2. Extract recruiter / hiring manager name if mentioned, else null.
3. Write the email:
   - Subject: ASCII only. Use a normal hyphen "-", never an en dash, em dash, smart quote, emoji, bullet, or decorative symbol. Keep it under 80 characters and include the role title or core role.
   - Body: exactly 2 sentences, 35-55 words total, one paragraph, plain text only.
   - Sentence 1 should greet the recruiter by first name if known and mention the target role plus one clear, resume-backed fit.
   - Sentence 2 should mention the attached resume and invite a next step in a natural way.
   - Include VISA Type / work authorization only if the JD asks about authorization, sponsorship, visa status, or work eligibility.
   - Use one concrete JD/resume match. Do not stack a long list of technologies.
   - Do not use "I hope this email finds you well", "perfect fit", "circling back", "I am excited to apply", "please reach out to me", "discuss further", or similar filler.
   - No bullet points, no lists, no signature block, no hype.
4. Confidence is your 0-100 estimate that the extracted recipient address actually belongs to a recruiter for THIS role.

Return STRICT JSON only:
{
  "recipientEmail": "<email or null>",
  "recipientName": "<string or null>",
  "subject": "<subject line>",
  "body": "<plain-text email body, use \\n for line breaks>",
  "confidence": <integer 0-100>
}`;
}

function prepareFollowUpEmailPrompt(data = {}) {
  const {
    originalEmail = {},
    jobDescription = '',
    threadMessages = [],
    timingContext = {},
    userContext = {},
  } = data;
  const fallbackDays = Math.max(1, parseInt(data.daysSince || 7, 10));
  const messages = Array.isArray(threadMessages) && threadMessages.length > 0
    ? threadMessages
    : [{
        direction: 'outgoing',
        kind: 'initial-outreach',
        subject: originalEmail.subject || '',
        body: originalEmail.body || '',
      }];
  const recentMessages = messages.slice(-12).map((message) => ({
    direction: message.direction || 'unknown',
    kind: message.kind || 'email',
    from: String(message.from || '').slice(0, 180),
    to: String(message.to || '').slice(0, 180),
    sentAt: message.sentAt || null,
    subject: String(message.subject || '').slice(0, 300),
    body: String(message.body || '').slice(0, 3000),
  }));
  const latest = recentMessages[recentMessages.length - 1] || {};
  const timing = {
    generatedAt: timingContext.generatedAt || new Date().toISOString(),
    followUpNumber: timingContext.followUpNumber || 1,
    latestMessageDirection: timingContext.latestMessageDirection || latest.direction || 'outgoing',
    latestMessageAt: timingContext.latestMessageAt || latest.sentAt || null,
    elapsedSinceLatestMessage: timingContext.elapsedSinceLatestMessage || `${fallbackDays} days`,
    lastOutgoingAt: timingContext.lastOutgoingAt || null,
    elapsedSinceLastOutgoing: timingContext.elapsedSinceLastOutgoing || `${fallbackDays} days`,
    lastIncomingAt: timingContext.lastIncomingAt || null,
  };
  const visaType = String(userContext?.visaType || '').trim();
  const tone = normalizeTone(userContext?.tone);

  return {
    prompt: `Draft the next concise email in an existing recruiter outreach thread.
Write like a real person sending a quick note: simple, specific, and low-pressure. Avoid AI-generated polish, filler, and buzzword lists.

CANDIDATE CONTEXT:
Tone setting: ${tone} (${toneInstruction(tone)})
VISA TYPE / WORK AUTHORIZATION CONTEXT: ${visaType || 'Not provided'}
Only mention VISA Type / work authorization if the job description or the actual email thread asks about authorization, sponsorship, visa status, or work eligibility.

THREAD TIMING FACTS:
${JSON.stringify(timing, null, 2)}

THREAD MESSAGES IN CHRONOLOGICAL ORDER:
${JSON.stringify(recentMessages, null, 2)}

JOB DESCRIPTION SUMMARY (secondary context only):
${jobDescription.slice(0, 800)}

GUIDELINES:
- Read the latest messages first. Write the natural next message for this actual thread.
- If the latest message is incoming, respond to or acknowledge the recruiter's latest note. Do NOT claim that they never replied.
- If the latest message is outgoing and unanswered, write a gentle follow-up without repeating earlier follow-up wording.
- Use timing language only when it is accurate. Never say "last week", "a few days ago", or similar unless THREAD TIMING FACTS support it. Usually omit elapsed-time wording when only minutes or hours have passed.
- Write 1-2 short sentences, 25-45 words total, one plain paragraph.
- Keep it calm, human, and specific. No pressure, no apology, no buzzword list, no bullet points.
- Mention VISA Type / work authorization only if the JD or thread asks about authorization, sponsorship, visa status, or work eligibility.
- Do NOT add a signature or sign-off - the app appends it automatically.
- Return only the new email text. Do not quote previous messages.
- Plain text only.
- Keep the existing Gmail thread subject, normally "Re: ${originalEmail.subject || latest.subject || ''}".

Return STRICT JSON:
{
  "subject": "<usually 'Re: ' + original subject>",
  "body": "<plain-text body>"
}`,
    subjectFallback: `Re: ${originalEmail.subject || latest.subject || ''}`,
    recentMessages,
    timing,
  };
}

module.exports = {
  buildRecruiterEmailPrompt,
  collectTopSkills,
  extractWorkAuthorizationSignal,
  normalizeOutreachSubject,
  normalizeTone,
  prepareFollowUpEmailPrompt,
};
