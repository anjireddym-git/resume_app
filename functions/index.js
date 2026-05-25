const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');
const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Define secrets (set via: firebase functions:secrets:set SECRET_NAME)
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const openaiApiKey = defineSecret('OPENAI_API_KEY');

// Helper to determine provider from model ID
function getProvider(modelId) {
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
    return 'openai';
  }
  return 'gemini';
}

// Stripe config
const CREDITS_PER_PURCHASE = 50;
const PRICE_AMOUNT = 200; // $2.00 in cents
const STRIPE_PRODUCT_ID = 'prod_Tb7WA0HOBjOx8h';

// ============================================================================
// AI Cloud Functions
// ============================================================================

/**
 * Main AI function - handles all AI operations
 * Checks credits, deducts on success, and calls appropriate AI method (Gemini or OpenAI)
 */
exports.callAI = onCall({ secrets: [geminiApiKey, openaiApiKey], timeoutSeconds: 300 }, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = request.auth.uid;
  const { action, data } = request.data;

  // Get user document and check credits
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found');
  }

  const userData = userDoc.data();
  const currentCredits = userData.credits || 0;

  if (currentCredits < 1) {
    throw new HttpsError('resource-exhausted', 'Insufficient credits. Please purchase more credits to continue.');
  }

  const model = data.model || 'gemini-2.5-pro';
  const provider = getProvider(model);
  
  // Initialize the appropriate AI client
  let aiClient;
  if (provider === 'openai') {
    aiClient = new OpenAI({ apiKey: openaiApiKey.value() });
  } else {
    aiClient = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  }

  try {
    let result;

    switch (action) {
      case 'updateResumeForJob':
        result = await updateResumeForJob(aiClient, model, provider, data.resume, data.jobDescription, data.fieldsToUpdate);
        break;
      case 'analyzeMatch':
        result = await analyzeMatch(aiClient, model, provider, data.resume, data.jobDescription);
        break;
      case 'generateSuggestions':
        result = await generateSuggestions(aiClient, model, provider, data.resume, data.jobDescription);
        break;
      case 'generateRefactoredHighlights':
        result = await generateRefactoredHighlights(aiClient, provider, data.context, data.highlights);
        break;
      case 'transformResumeForRole':
        result = await transformResumeForRole(aiClient, model, provider, data.resume, data.targetRole, data.fieldsToUpdate);
        break;
      case 'extractResumeFromFile':
        // Always use Gemini 3 Pro for file extraction (best multimodal accuracy)
        const geminiClient = new GoogleGenAI({ apiKey: geminiApiKey.value() });
        result = await extractResumeFromFile(geminiClient, 'gemini-3-pro-preview', 'gemini', data.base64Data, data.mimeType);
        break;
      case 'parseDocxToFieldMap':
        result = await parseDocxToFieldMap(aiClient, model, provider, data.base64Data);
        break;
      case 'editField':
        result = await editField(aiClient, model, provider, data.currentValue, data.userPrompt, data.fieldType);
        break;
      default:
        throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
    }

    // Deduct 1 credit on success
    await userRef.update({
      credits: admin.firestore.FieldValue.increment(-1)
    });

    return { success: true, data: result, creditsRemaining: currentCredits - 1 };
  } catch (error) {
    console.error('AI call error:', error);
    throw new HttpsError('internal', error.message || 'AI processing failed');
  }
});

// ============================================================================
// AI Helper Functions - Provider Agnostic
// ============================================================================

/**
 * Unified text generation function that works with both Gemini and OpenAI
 */
async function callAIText(aiClient, model, provider, prompt) {
  if (provider === 'openai') {
    const response = await aiClient.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  } else {
    // Gemini
    const response = await aiClient.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  }
}

/**
 * Transform resume for a target role (career pivot mode)
 * More aggressive rewriting for role/career changes
 */
async function transformResumeForRole(aiClient, model, provider, currentResume, targetRole, fieldsToUpdate = ['headline', 'summary', 'jobTitles', 'experience', 'skills', 'projects', 'internships', 'hackathons', 'certifications']) {
  const prompt = `You are an elite career pivot strategist and ATS optimization expert. Transform this resume to position the candidate as a TOP candidate for the target role.

CURRENT RESUME:
${JSON.stringify(currentResume, null, 2)}

TARGET ROLE/INSTRUCTION:
${targetRole}

═══════════════════════════════════════════════════════════════════════════════
CRITICAL CONTENT RULES (MUST FOLLOW):
═══════════════════════════════════════════════════════════════════════════════
1. EXPAND, NEVER REDUCE: Each experience entry must have AT LEAST the same number of bullet points as the original. Add more if needed.
2. MINIMUM BULLETS: Every experience/project must have 3-6 detailed, impactful bullet points.
3. PRESERVE ALL: Keep all original experiences, projects, education, and certifications. Do not remove anything.
4. ENHANCE QUALITY: Make every bullet point more impactful, not fewer bullets.

═══════════════════════════════════════════════════════════════════════════════
ACTION VERBS (Start EVERY bullet with one of these):
═══════════════════════════════════════════════════════════════════════════════
Architected, Developed, Engineered, Implemented, Designed, Built, Created, Optimized, Automated, Scaled, Led, Spearheaded, Delivered, Reduced, Increased, Accelerated, Streamlined, Transformed, Migrated, Deployed, Orchestrated, Integrated, Established

═══════════════════════════════════════════════════════════════════════════════
ATS OPTIMIZATION REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════
1. KEYWORD DENSITY: Naturally incorporate 15-25 industry-standard keywords for the target role
2. STANDARD TERMINOLOGY: Use exact terms ATS systems scan for (e.g., "CI/CD" not "continuous integration pipelines")
3. SKILLS FORMAT: List skills as comma-separated individual technologies for maximum ATS parsing
4. NO CREATIVE TITLES: Use standard job titles that match common searches

═══════════════════════════════════════════════════════════════════════════════
QUANTIFICATION REQUIREMENTS (Add to EVERY bullet where possible):
═══════════════════════════════════════════════════════════════════════════════
- Performance: "Reduced latency by 40%", "Improved throughput by 3x"
- Scale: "Processed 1M+ requests/day", "Managed 50TB data warehouse"  
- Business: "Saved $200K annually", "Increased revenue by 15%"
- Team: "Led team of 5 engineers", "Mentored 3 junior developers"
- Reliability: "Achieved 99.99% uptime", "Reduced incidents by 60%"

═══════════════════════════════════════════════════════════════════════════════
TRANSFORMATION INSTRUCTIONS:
═══════════════════════════════════════════════════════════════════════════════
1. **HEADLINE**: Rewrite to match the target role exactly (e.g., "Machine Learning Engineer" not "Software Developer")

2. **SUMMARY**: Completely rewrite (3-4 sentences) to:
   - Lead with years of experience + target role title
   - Highlight 3-4 most relevant technical skills
   - Mention scale/impact metrics
   - Express passion for the target domain

3. **JOB TITLES**: Where truthful, reframe titles to highlight relevant aspects (e.g., "Backend Developer" → "Python Developer" if pivoting to ML)

4. **EXPERIENCE HIGHLIGHTS**: Aggressively reframe EVERY bullet to emphasize:
   - Technologies/skills relevant to target role
   - Data, analytics, or domain knowledge that transfers
   - Problem-solving that applies to new field
   - Add metrics and quantifiable achievements
   - Use strong action verbs

5. **SKILLS**: 
   - Add relevant skills the candidate likely has but didn't emphasize
   - Reorganize to put target-role skills FIRST
   - Group by category (Languages, Frameworks, Tools, Cloud, Databases)
   - Include certifications-relevant technologies

6. **PROJECTS**: Reframe each project to:
   - Highlight tech stack relevant to target role
   - Add metrics where possible
   - Emphasize transferable patterns

═══════════════════════════════════════════════════════════════════════════════
STRICT RULES:
═══════════════════════════════════════════════════════════════════════════════
✗ NEVER invent jobs, companies, degrees, or certifications
✗ NEVER reduce the number of bullet points
✗ NEVER remove experiences or projects
✓ CAN add skills the candidate reasonably has based on their experience
✓ CAN reframe/rephrase highlights to emphasize different aspects
✓ CAN add reasonable metrics based on context
✓ MUST use industry-standard terminology for the target role
✓ If target mentions specific tech (e.g., "AWS"), emphasize any cloud/infrastructure experience

Return the complete transformed resume as valid JSON. No markdown, no code fences.`;

  let text = await callAIText(aiClient, model, provider, prompt);
  text = text.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim();
  return JSON.parse(text);
}

async function updateResumeForJob(aiClient, model, provider, currentResume, jobDescription, fieldsToUpdate = ['headline', 'summary', 'jobTitles', 'experience', 'skills', 'projects', 'internships', 'hackathons', 'certifications']) {
  const fieldDescriptions = {
    headline: 'personalInfo.title - Rewrite the professional headline to align with target role',
    summary: 'summary - Completely rewrite to position candidate for this specific role',
    jobTitles: 'experience[].position - Update job titles/roles to better align with target role while staying truthful',
    experience: 'experience[].highlights - Reframe each bullet to emphasize skills/technologies relevant to target job',
    skills: 'skills object - Reorganize and reframe skills to prioritize what the job needs',
    projects: 'projects array - Rewrite descriptions to emphasize technologies and outcomes relevant to target role',
    internships: 'internships array - Reframe internship experiences to highlight transferable skills for target role',
    hackathons: 'hackathons array - Emphasize relevant technologies, problem-solving, and outcomes that align with target job',
    certifications: 'certifications array - Reorder to prioritize most relevant certifications for this role',
  };

  const fieldsInstructions = fieldsToUpdate
    .map(f => fieldDescriptions[f])
    .filter(Boolean)
    .join('\n  - ');

  const allFields = ['headline', 'summary', 'jobTitles', 'experience', 'skills', 'projects', 'internships', 'hackathons', 'certifications'];
  const preserveFields = allFields.filter(f => !fieldsToUpdate.includes(f));

  const prompt = `You are an elite resume strategist and ATS optimization expert. Transform this resume to be a PERFECT, HIGH-RANKING match for the target job.

CURRENT RESUME:
${JSON.stringify(currentResume, null, 2)}

TARGET JOB DESCRIPTION:
${jobDescription}

FIELDS TO OPTIMIZE:
  - ${fieldsInstructions}

FIELDS TO PRESERVE EXACTLY:
  - ${preserveFields.length > 0 ? preserveFields.join(', ') : 'None'}
  - personalInfo (except headline/title if included above)
  - experience company names, locations, and dates
  - education

═══════════════════════════════════════════════════════════════════════════════
CRITICAL CONTENT RULES (MUST FOLLOW):
═══════════════════════════════════════════════════════════════════════════════
1. EXPAND, NEVER REDUCE: Each experience entry must have AT LEAST the same number of bullet points as the original. Add more if the original has fewer than 4.
2. MINIMUM BULLETS: Every experience/project must have 4-6 detailed, impactful bullet points.
3. PRESERVE ALL: Keep all original experiences, projects, education, and certifications. Do not remove anything.
4. ENHANCE QUALITY: Make every bullet point more impactful while maintaining or increasing quantity.

═══════════════════════════════════════════════════════════════════════════════
ACTION VERBS (Start EVERY bullet with one of these):
═══════════════════════════════════════════════════════════════════════════════
Architected, Developed, Engineered, Implemented, Designed, Built, Created, Optimized, Automated, Scaled, Led, Spearheaded, Delivered, Reduced, Increased, Accelerated, Streamlined, Transformed, Migrated, Deployed, Orchestrated, Integrated, Established, Pioneered, Championed

═══════════════════════════════════════════════════════════════════════════════
ATS OPTIMIZATION REQUIREMENTS:
═══════════════════════════════════════════════════════════════════════════════
1. KEYWORD EXTRACTION: Identify and incorporate ALL key technologies, skills, and terms from the job description
2. KEYWORD DENSITY: Naturally weave 20-30 job-specific keywords throughout the resume
3. EXACT MATCH: Use exact phrases from the JD where possible (e.g., if JD says "React.js", use "React.js" not just "React")
4. STANDARD TERMINOLOGY: Use industry-standard terms that ATS systems recognize
5. SKILLS ORGANIZATION: 
   - Put skills mentioned in JD FIRST in each category
   - Format as comma-separated list for maximum parsing
   - Include both acronyms and full names where applicable (e.g., "AWS, Amazon Web Services")

═══════════════════════════════════════════════════════════════════════════════
QUANTIFICATION REQUIREMENTS (Add to EVERY bullet where possible):
═══════════════════════════════════════════════════════════════════════════════
Include metrics that demonstrate impact:
- Performance: "Reduced latency by 40%", "Improved response time by 60%"
- Scale: "Handled 1M+ daily requests", "Processed 10TB of data"
- Business: "Increased revenue by $500K", "Reduced costs by 30%"
- Efficiency: "Automated 80% of manual processes", "Decreased deployment time by 75%"
- Team/Leadership: "Led team of 8 engineers", "Mentored 5 junior developers"
- Reliability: "Achieved 99.99% uptime", "Reduced production incidents by 70%"
- User Impact: "Served 2M+ active users", "Improved user retention by 25%"

═══════════════════════════════════════════════════════════════════════════════
SUMMARY REQUIREMENTS (3-4 impactful sentences):
═══════════════════════════════════════════════════════════════════════════════
- Sentence 1: Years of experience + role title matching JD + primary domain
- Sentence 2: Key technical skills that match JD requirements (list 4-5 specific technologies)
- Sentence 3: Scale/impact metrics from career highlights
- Sentence 4: Soft skills + what you bring to the role

═══════════════════════════════════════════════════════════════════════════════
STRICT RULES:
═══════════════════════════════════════════════════════════════════════════════
1. ✗ NEVER invent: jobs, companies, degrees, dates, certifications, or false metrics
2. ✗ NEVER reduce the number of bullet points or remove content
3. ✗ NEVER use generic phrases like "various projects" or "multiple technologies"
4. ✓ USE JOB KEYWORDS: Extract and naturally incorporate key terms from job description
5. ✓ QUANTIFY: Add reasonable metrics based on context where not present
6. ✓ ATS-FRIENDLY: Use standard terms that ATS systems recognize
7. ✓ PRESERVE STRUCTURE: Keep exact JSON schema
8. ✓ BE SPECIFIC: Use specific technologies, numbers, and outcomes

Return ONLY valid JSON. No markdown, no code fences.`;

  let text = await callAIText(aiClient, model, provider, prompt);
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(text);
}

async function analyzeMatch(aiClient, model, provider, currentResume, jobDescription) {
  const prompt = `Analyze this resume against the job description. Return a JSON object with:
{
  "matchScore": <integer 0-100>,
  "matchedSkills": [<skills that match job requirements>],
  "missingSkills": [<critical skills from JD not found>],
  "strengths": [<what makes this candidate strong>],
  "improvements": [<specific changes to increase match score>],
  "careerGap": "<none|minor|moderate|major>",
  "pivotAdvice": "<brief advice if career gap is moderate or major>"
}

RESUME:
${JSON.stringify(currentResume, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON. No markdown.`;

  let text = await callAIText(aiClient, model, provider, prompt);
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(text);
}

async function generateSuggestions(aiClient, model, provider, currentResume, jobDescription) {
  const prompt = `Analyze this resume against the job description and provide 5-7 specific improvement suggestions.

RESUME:
${JSON.stringify(currentResume, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Return ONLY a JSON array of strings. No markdown.`;

  let text = await callAIText(aiClient, model, provider, prompt);
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(text);
}

async function generateRefactoredHighlights(aiClient, provider, resumeContext, baseHighlights) {
  const prompt = `You are an expert resume writer.
  
CONTEXT:
Headline: ${resumeContext.headline || 'N/A'}
Summary: ${resumeContext.summary || 'N/A'}
Top Skills: ${(resumeContext.skills || []).slice(0, 10).join(', ')}

TASK:
Refactor the following highlights to align with the candidate's persona.
Make them 25-50% more impactful using strong action verbs.

BASE HIGHLIGHTS:
${JSON.stringify(baseHighlights, null, 2)}

Return ONLY a JSON array of strings. No markdown.`;

  // Use a fast model for this helper task
  const fastModel = provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash';
  
  let text = await callAIText(aiClient, fastModel, provider, prompt);
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(text);
}

async function editField(aiClient, model, provider, currentValue, userPrompt, fieldType) {
  const fieldPrompts = {
    summary: `You are an expert resume writer. Rewrite the following professional summary based on the user's request.
    Current Summary: "{currentValue}"
    User Request: "{userPrompt}"
    
    Rules:
    - Maintain a professional, executive tone.
    - Focus on achievements and impact.
    - Keep it concise (3-4 sentences max unless asked otherwise).
    - Return ONLY the new summary text.`,
    
    experience_position: `Rewrite this job title to be more standard or impressive, based on the user's request.
    Current Title: "{currentValue}"
    User Request: "{userPrompt}"
    Return ONLY the new title text.`,
    
    experience_company: `Rewrite this company name/description based on the user's request.
    Current Value: "{currentValue}"
    User Request: "{userPrompt}"
    Return ONLY the new text.`,
    
    experience_highlight: `Refine this resume bullet point based on the user's request.
    Current Bullet: "{currentValue}"
    User Request: "{userPrompt}"
    
    Rules:
    - Use strong action verbs (e.g., Spearheaded, Engineered, Optimized).
    - Quantify results where possible or asked.
    - Keep it impactful and concise.
    - Return ONLY the new bullet point text.`,
    
    skill: `Rewrite this skill or skill list based on the user's request.
    Current Skill(s): "{currentValue}"
    User Request: "{userPrompt}"
    Return ONLY the new text.`,
    
    education: `Refine this education detail based on the user's request.
    Current Value: "{currentValue}"
    User Request: "{userPrompt}"
    Return ONLY the new text.`,

    project_description: `Refine this project description.
    Current Description: "{currentValue}"
    User Request: "{userPrompt}"
    Rules: 
    - Highlight technologies and outcomes.
    - Return ONLY the new description text.`,
    
    general: `Rewrite the following text based on the user's request.
    Current Text: "{currentValue}"
    User Request: "{userPrompt}"
    Return ONLY the new text.`
  };

  const specificPromptTemplate = fieldPrompts[fieldType] || fieldPrompts['general'];
  const prompt = specificPromptTemplate
    .replace('{currentValue}', currentValue || '')
    .replace('{userPrompt}', userPrompt);

  let text = await callAIText(aiClient, model, provider, prompt);
  // Remove quotes if the model adds them wrapper-style, but be careful not to remove internal quotes 
  // For simple text fields, usually just trimming is enough.
  return text.trim();
}

// ----------------------------------------------------------------------------
// DOCX layout extraction (Phase 2)
// Parses the raw XML inside the .docx ZIP to recover page margins, column
// count, dominant font family/size, and heading colors. Returns a partial
// layoutConfig object; missing fields are filled by the client.
// ----------------------------------------------------------------------------
async function extractLayoutFromDocx(buffer) {
  try {
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(buffer);

    const readSafe = async (path) => {
      const f = zip.file(path);
      return f ? await f.async('string') : '';
    };

    const documentXml = await readSafe('word/document.xml');
    const stylesXml = await readSafe('word/styles.xml');
    const themeXml = await readSafe('word/theme/theme1.xml');

    const layout = {};

    // ---- Page margins (<w:pgMar w:top=".." w:right=".." w:bottom=".." w:left=".." />)
    // Values are twentieths of a point; 1 pt = 20 twips.
    const pgMarMatch = documentXml.match(/<w:pgMar\b[^/]*\/>/);
    if (pgMarMatch) {
      const tag = pgMarMatch[0];
      const get = (attr) => {
        const m = tag.match(new RegExp(`w:${attr}="(-?\\d+)"`));
        return m ? Math.round(parseInt(m[1], 10) / 20) : undefined;
      };
      const top = get('top'), right = get('right'), bottom = get('bottom'), left = get('left');
      if (top || right || bottom || left) {
        layout.pageMargins = {
          top: top ?? 36,
          right: right ?? 40,
          bottom: bottom ?? 36,
          left: left ?? 40,
        };
      }
    }

    // ---- Column count (<w:cols w:num="2" .../>)
    const colsMatch = documentXml.match(/<w:cols\b[^/]*\/>/);
    if (colsMatch) {
      const numMatch = colsMatch[0].match(/w:num="(\d+)"/);
      if (numMatch) {
        const n = parseInt(numMatch[1], 10);
        layout.columns = n >= 2 ? 2 : 1;
      }
    }

    // ---- Dominant body font (first <w:rFonts w:ascii="..."/> in styles.xml)
    const fontMatch = stylesXml.match(/<w:rFonts\b[^>]*w:ascii="([^"]+)"/);
    const bodyFont = fontMatch ? fontMatch[1] : null;

    // ---- Default body font size (<w:sz w:val="22"/> in docDefaults; in half-points)
    const szMatch = stylesXml.match(/<w:docDefaults>[\s\S]*?<w:sz\s+w:val="(\d+)"/);
    const bodySize = szMatch ? Math.round(parseInt(szMatch[1], 10) / 2) : null;

    // ---- Heading 1 color (first <w:color w:val=".."/> inside Heading1 style)
    const heading1Block = stylesXml.match(/<w:style[^>]*w:styleId="Heading1"[\s\S]*?<\/w:style>/);
    let headingColor = null;
    if (heading1Block) {
      const cm = heading1Block[0].match(/<w:color\s+w:val="([0-9a-fA-F]{6})"/);
      if (cm) headingColor = '#' + cm[1].toLowerCase();
    }

    // ---- Heading 1 font size
    const h1SizeMatch = heading1Block ? heading1Block[0].match(/<w:sz\s+w:val="(\d+)"/) : null;
    const headingSize = h1SizeMatch ? Math.round(parseInt(h1SizeMatch[1], 10) / 2) : null;

    // ---- Theme accent color (first <a:srgbClr val=".."/> in theme1.xml)
    let accentColor = null;
    if (themeXml) {
      const acc = themeXml.match(/<a:accent1>[\s\S]*?<a:srgbClr\s+val="([0-9a-fA-F]{6})"/);
      if (acc) accentColor = '#' + acc[1].toLowerCase();
    }

    // ---- Build partial fonts object
    if (bodyFont || bodySize) {
      layout.fonts = {
        body: { ...(bodyFont ? { family: bodyFont } : {}), ...(bodySize ? { size: bodySize } : {}) },
      };
      if (bodyFont) {
        layout.fonts.name = { family: bodyFont };
        layout.fonts.sectionHeader = { family: bodyFont };
      }
      if (headingSize) {
        layout.fonts.sectionHeader = { ...(layout.fonts.sectionHeader || {}), size: headingSize };
      }
      if (headingColor) {
        layout.fonts.sectionHeader = { ...(layout.fonts.sectionHeader || {}), color: headingColor };
      }
    }

    // ---- Colors
    if (headingColor || accentColor) {
      layout.colors = {
        primary: headingColor || accentColor,
      };
    }

    // ---- Section header style heuristic: if Heading1 has bottom border -> underline
    if (heading1Block && /<w:bdr[^>]*w:val="single"/.test(heading1Block[0])) {
      layout.sectionHeader = { style: 'underline' };
    }

    console.log('[docx-layout] extracted:', JSON.stringify(layout));
    return layout;
  } catch (err) {
    console.warn('[docx-layout] extraction failed (non-fatal):', err.message);
    return {};
  }
}

async function extractResumeFromFile(aiClient, model, provider, base64Data, mimeType) {
  const mammoth = require('mammoth');

  // Prompt that asks for BOTH content and visual layout in one call.
  // We use a wrapper object so the model returns a single JSON with two keys.
  const prompt = `You are a resume parser. From the provided resume file, extract TWO things:

1) "content": structured resume data
2) "layout": a description of the resume's VISUAL layout (fonts, colors, columns, header style)

Return ONLY a single JSON object with this exact shape:
{
  "content": {
    "personalInfo": { "name": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "" },
    "summary": "",
    "experience": [{ "company": "", "position": "", "location": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM or Present", "highlights": [] }],
    "education": [{ "institution": "", "degree": "", "location": "", "graduationDate": "YYYY-MM", "gpa": "", "highlights": [] }],
    "skills": { "languages": [], "frameworks": [], "tools": [], "databases": [], "other": [] },
    "projects": [{ "name": "", "description": "", "technologies": [], "highlights": [] }],
    "certifications": [{ "name": "", "issuer": "", "date": "YYYY-MM" }],
    "customSections": [{ "id": "publications", "title": "Publications", "content": "markdown text..." }]
  },
  "layout": {
    "columns": 1,
    "columnSplit": 0.33,
    "columnAssignment": { "skills": "left", "education": "left", "experience": "right" },
    "pageMargins": { "top": 36, "right": 40, "bottom": 36, "left": 40 },
    "header": { "layout": "centered", "contactStyle": "row", "showTitle": true },
    "fonts": {
      "name":          { "family": "Helvetica", "size": 22, "weight": "bold",   "color": "#111111" },
      "title":         { "family": "Helvetica", "size": 11, "weight": "normal", "color": "#555555" },
      "sectionHeader": { "family": "Helvetica", "size": 11, "weight": "bold",   "color": "#111111" },
      "body":          { "family": "Helvetica", "size": 10, "weight": "normal", "color": "#222222" },
      "dates":         { "family": "Helvetica", "size":  9, "weight": "normal", "color": "#666666" }
    },
    "colors": { "primary": "#111111", "text": "#222222", "muted": "#666666", "background": "#ffffff", "sidebarBg": "#f5f5f5", "divider": "#dddddd" },
    "sectionHeader": { "style": "underline", "uppercase": true, "spacingTop": 10, "spacingBottom": 4 },
    "spacing": { "sectionGap": 10, "itemGap": 6, "bulletGap": 2, "lineHeight": 1.4 },
    "sectionOrder": ["summary", "skills", "experience", "education", "projects", "certifications"]
  }
}

LAYOUT RULES:
- "columns": 2 ONLY if the resume clearly has a sidebar (e.g., contact/skills column on the left, experience on the right). Otherwise 1.
- "header.layout": "centered" if name is centered, "left" if left-aligned, "twoColumn" if name on one side and contact on the other.
- "sectionHeader.style": "underline" if section titles have a horizontal line under them; "background" if they have a colored block behind; "border-left" for left bars; "uppercase" for ALL-CAPS only; "plain" otherwise.
- "fonts.*.family": use the closest web-safe family name ("Helvetica", "Arial", "Times New Roman", "Georgia", "Courier", "Verdana").
- Colors must be 6-digit hex like "#1a2b3c". Use the actual colors you observe.
- "customSections": include ONLY sections that are NOT one of {summary, experience, education, skills, projects, certifications, internships, hackathons}. Keep custom section content as plain text / markdown.

Return ONLY valid JSON. No prose, no markdown fences.`;

  const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPdf = mimeType === 'application/pdf';

  // Default content structure (filled in if model omits fields).
  const defaultContent = {
    personalInfo: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', github: '' },
    summary: '',
    experience: [],
    education: [],
    skills: { languages: [], frameworks: [], tools: [], databases: [] },
    projects: [],
    certifications: [],
    customSections: []
  };

  // Helper: parse the wrapper { content, layout } shape, tolerating either a
  // bare resume object (legacy) or the new wrapper. Robust to surrounding
  // prose and partial fences.
  const parseWrapper = (text) => {
    if (!text || typeof text !== 'string') {
      throw new Error('AI returned empty response');
    }
    // Strip code fences.
    let cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

    // If there's surrounding prose, grab the first balanced {...} block.
    if (!cleaned.startsWith('{')) {
      const start = cleaned.indexOf('{');
      if (start === -1) {
        console.error('No JSON object found in AI response. Raw text:', text.slice(0, 500));
        throw new Error('AI response did not contain JSON');
      }
      let depth = 0, end = -1;
      for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end === -1) {
        console.error('Unbalanced JSON in AI response. Raw text:', text.slice(0, 500));
        throw new Error('AI response JSON was malformed');
      }
      cleaned = cleaned.slice(start, end + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON.parse failed. Cleaned text:', cleaned.slice(0, 500));
      throw new Error('AI response was not valid JSON: ' + e.message);
    }

    if (parsed && (parsed.content || parsed.layout)) {
      return {
        content: parsed.content || {},
        layout: parsed.layout || {},
      };
    }
    // Legacy bare resume -> treat as content only.
    return { content: parsed, layout: {} };
  };

  const finalize = (content, layout) => {
    const merged = {
      ...defaultContent,
      ...content,
      personalInfo: { ...defaultContent.personalInfo, ...(content?.personalInfo || {}) },
      skills: { ...defaultContent.skills, ...(content?.skills || {}) },
      customSections: Array.isArray(content?.customSections) ? content.customSections : [],
    };
    return { content: merged, layout: layout || {} };
  };

  // ----- Pre-parse DOCX layout from raw XML (no AI cost) ------------------
  let docxLayoutHint = {};
  let docxBuffer = null;
  if (isDocx) {
    docxBuffer = Buffer.from(base64Data, 'base64');
    docxLayoutHint = await extractLayoutFromDocx(docxBuffer);
  }

  // ----- Path 1: Gemini + PDF -> direct file upload ------------------------
  if (provider === 'gemini' && isPdf) {
    try {
      console.log(`Attempting direct PDF extraction with Gemini (${mimeType})`);

      const response = await aiClient.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
        }
      });

      const rawText = response.text;
      console.log('Gemini direct PDF response length:', rawText?.length || 0);
      const { content, layout } = parseWrapper(rawText);
      const contentKeys = Object.keys(content || {});
      console.log('Direct PDF extraction successful. Content keys:', contentKeys.join(','));
      if (contentKeys.length === 0 || (!content.personalInfo && !content.experience && !content.summary)) {
        console.error('Direct PDF extraction returned empty content. Falling back. Raw:', rawText?.slice(0, 500));
        throw new Error('Direct extraction returned empty content');
      }
      return finalize(content, layout);
    } catch (directError) {
      console.log('Direct extraction failed, falling back to text:', directError.message);
    }

    // ----- Path 1b: Gemini + PDF retry with simpler content-only prompt ----
    try {
      console.log('Retrying PDF extraction with simpler content-only prompt');
      const simplePrompt = `Extract structured resume data from the attached file as JSON. Return ONLY valid JSON (no prose, no markdown) with this shape:
{
  "personalInfo": { "name": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "" },
  "summary": "",
  "experience": [{ "company": "", "position": "", "location": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM or Present", "highlights": [] }],
  "education": [{ "institution": "", "degree": "", "location": "", "graduationDate": "YYYY-MM", "gpa": "", "highlights": [] }],
  "skills": { "languages": [], "frameworks": [], "tools": [], "databases": [], "other": [] },
  "projects": [{ "name": "", "description": "", "technologies": [], "highlights": [] }],
  "certifications": [{ "name": "", "issuer": "", "date": "YYYY-MM" }]
}`;
      const response = await aiClient.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: base64Data } }, { text: simplePrompt }] }],
        config: { responseMimeType: 'application/json' },
      });
      const rawText = response.text;
      console.log('Gemini PDF retry response length:', rawText?.length || 0);
      const { content } = parseWrapper(rawText);
      if (!content || (!content.personalInfo && !content.experience && !content.summary)) {
        throw new Error('Retry returned empty content');
      }
      console.log('PDF retry extraction successful');
      return finalize(content, {});
    } catch (retryError) {
      console.error('PDF retry also failed:', retryError.message);
      // If we have no text path available for PDF, surface a clear error.
      if (isPdf) {
        throw new Error(`PDF extraction failed: ${retryError.message}`);
      }
    }
  }

  // ----- Path 2: DOCX / OpenAI -> text extraction first --------------------
  console.log('Using text extraction approach...');

  try {
    let extractedText = '';

    if (isDocx) {
      const mammothResult = await mammoth.convertToHtml({ buffer: docxBuffer });
      const htmlContent = mammothResult.value;

      extractedText = htmlContent
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<h1[^>]*>/gi, '\n=== ')
        .replace(/<h2[^>]*>/gi, '\n== ')
        .replace(/<h3[^>]*>/gi, '\n= ')
        .replace(/<h[4-6][^>]*>/gi, '\n')
        .replace(/<strong[^>]*>|<b[^>]*>/gi, '**')
        .replace(/<\/strong>|<\/b>/gi, '**')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&bull;/g, '•')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

      console.log(`DOCX HTML extraction found ${mammothResult.messages?.length || 0} warnings`);
    } else if (isPdf) {
      if (provider === 'openai') {
        throw new Error('OpenAI models cannot directly process PDF files. Please upload a DOCX file or use a Gemini model for PDF processing.');
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content extracted from file');
    }

    console.log(`Extracted ${extractedText.length} characters from file`);

    const textPrompt = `${prompt}

RESUME TEXT:
${extractedText}`;

    // Use callAIText for text extraction — avoids responseMimeType which can
    // cause Gemini to return the schema template with empty placeholder values.
    const responseText = await callAIText(aiClient, model, provider, textPrompt);
    console.log('Text extraction response length:', responseText?.length || 0);
    let content, layout;
    try {
      ({ content, layout } = parseWrapper(responseText));
    } catch (parseErr) {
      // Retry once with simpler content-only prompt (no wrapper, no layout)
      console.log('Wrapper parse failed, retrying with simpler prompt:', parseErr.message);
      const simplePrompt = `Extract resume data from the following text. Return ONLY a valid JSON object — no prose, no markdown fences — with these keys: personalInfo (name, title, email, phone, location, linkedin, github), summary (string), experience (array of {company, position, location, startDate, endDate, highlights[]}), education (array of {institution, degree, location, graduationDate, gpa}), skills ({languages, frameworks, tools, databases, other} — all arrays), projects (array of {name, description, technologies[], highlights[]}), certifications (array of {name, issuer, date}). Fill in the ACTUAL values from the resume text — do not leave any field empty if the information is present.\n\nRESUME TEXT:\n${extractedText}`;
      const retryText = await callAIText(aiClient, model, provider, simplePrompt);
      ({ content, layout } = parseWrapper(retryText));
    }
    if (!content || (!content.personalInfo && !content.experience && !content.summary)) {
      throw new Error('Text extraction returned empty resume content');
    }
    console.log('Text extraction approach successful. Content keys:', Object.keys(content).join(','));
    console.log('Extracted personalInfo:', JSON.stringify(content.personalInfo || {}));
    console.log('Experience count:', (content.experience || []).length, '| Skills keys:', Object.keys(content.skills || {}).join(','));

    // For DOCX, merge XML-extracted layout hints OVER the AI-detected layout
    // since the XML is authoritative for margins / column counts / fonts.
    const mergedLayout = deepMergeLayout(layout || {}, docxLayoutHint);

    return finalize(content, mergedLayout);
  } catch (extractError) {
    console.error('Text extraction failed:', extractError.message);
    throw new Error(`Failed to extract resume data: ${extractError.message}`);
  }
}

// Shallow-ish deep merge for layout hint objects (XML wins over AI guess).
function deepMergeLayout(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = { ...base };
  for (const k of Object.keys(override)) {
    const a = base[k];
    const b = override[k];
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      out[k] = deepMergeLayout(a, b);
    } else {
      out[k] = b;
    }
  }
  return out;
}

// ============================================================================
// DOCX Field-Map Parsing (new DOCX-native pipeline)
// ============================================================================

/**
 * Walk a DOCX XML string and produce a flat list of paragraphs in document
 * order. Mirrors the client-side walker in src/services/docxXmlService.js so
 * paragraph IDs match between client and server.
 *
 * Returns: [{ pId, plainText }]
 */
function walkParagraphsForServer(xml) {
  const out = [];
  const tblRegex = /<w:tbl(\s[^>]*)?>([\s\S]*?)<\/w:tbl>/g;
  const tables = [];
  let m;
  while ((m = tblRegex.exec(xml)) !== null) {
    tables.push({ start: m.index, end: m.index + m[0].length, body: m[2] });
  }

  const buildRecord = (pId, pBlock) => {
    const runRegex = /<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
    let text = '';
    let rm;
    while ((rm = runRegex.exec(pBlock)) !== null) {
      const runBody = rm[2];
      const textRegex = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let tm;
      while ((tm = textRegex.exec(runBody)) !== null) {
        text += tm[2];
      }
    }
    return {
      pId,
      plainText: text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"),
    };
  };

  tables.forEach((tbl, tIdx) => {
    const rowRegex = /<w:tr(\s[^>]*)?>([\s\S]*?)<\/w:tr>/g;
    let rowMatch;
    let rowIdx = 0;
    while ((rowMatch = rowRegex.exec(tbl.body)) !== null) {
      const cellRegex = /<w:tc(\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
      let cellMatch;
      let cellIdx = 0;
      while ((cellMatch = cellRegex.exec(rowMatch[2])) !== null) {
        const cellPRegex = /<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
        let cellPMatch;
        let cellPIdx = 0;
        while ((cellPMatch = cellPRegex.exec(cellMatch[2])) !== null) {
          out.push(buildRecord(`t${tIdx}.r${rowIdx}.c${cellIdx}.p${cellPIdx}`, cellPMatch[0]));
          cellPIdx++;
        }
        cellIdx++;
      }
      rowIdx++;
    }
  });

  const pRegex = /<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let topLevelPIdx = 0;
  while ((m = pRegex.exec(xml)) !== null) {
    const start = m.index;
    const inTable = tables.some((t) => start >= t.start && start < t.end);
    if (inTable) continue;
    out.push(buildRecord(`p${topLevelPIdx}`, m[0]));
    topLevelPIdx++;
  }
  return out;
}

/**
 * Parse a DOCX file into a field map suitable for the new DOCX-native editor.
 *
 * Pipeline:
 *   1. Unzip the DOCX with JSZip.
 *   2. Walk word/document.xml → list of { pId, plainText } paragraphs.
 *   3. Ask the AI to classify each paragraph into a logical field.
 *   4. Resolve the AI's classification into a field-ID → { nodeIds[] } map.
 *      For paragraphs with multiple logical fields (e.g. "Google · NYC ·
 *      2022 – Present"), the AI returns sub-spans by substring; we map each
 *      span to its containing run IDs.
 *
 * Output:
 *   {
 *     sections: [{ id, label, type }],
 *     fields: {
 *       [fieldId]: {
 *         sectionId, itemIndex, fieldType, label, value, nodeIds: [pId.rN, ...]
 *       }
 *     },
 *     extractedText: "...flat reconstruction for AI matching..."
 *   }
 */
async function parseDocxToFieldMap(aiClient, model, provider, base64Data) {
  const JSZip = require('jszip');

  if (!base64Data) throw new HttpsError('invalid-argument', 'base64Data is required');

  const buffer = Buffer.from(base64Data, 'base64');
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new HttpsError('invalid-argument', 'Invalid DOCX: missing document.xml');

  const paragraphs = walkParagraphsForServer(docXml);

  // Skip empty paragraphs from AI classification but keep them in the index so
  // pIds remain consistent with the client.
  const nonEmpty = paragraphs.filter((p) => p.plainText.trim().length > 0);

  const numberedText = nonEmpty
    .map((p, i) => `[${i}] (${p.pId}) ${p.plainText}`)
    .join('\n');

  const prompt = `You are a resume structure analyzer. Below is the linear text of a resume DOCX, one paragraph per line, with an index and a paragraph ID:

${numberedText}

Classify EVERY paragraph into a logical field. Return STRICT JSON in this exact shape:

{
  "sections": [
    { "id": "header",      "label": "Header",      "type": "header" },
    { "id": "summary",     "label": "Summary",     "type": "summary" },
    { "id": "experience",  "label": "Experience",  "type": "experience" },
    { "id": "education",   "label": "Education",   "type": "education" },
    { "id": "skills",      "label": "Skills",      "type": "skills" },
    { "id": "projects",    "label": "Projects",    "type": "projects" },
    { "id": "certifications", "label": "Certifications", "type": "certifications" }
  ],
  "assignments": [
    { "pId": "p0", "section": "header", "item": 0, "field": "name" },
    { "pId": "p1", "section": "header", "item": 0, "field": "contact",
      "splits": [
        { "text": "john@email.com", "field": "email" },
        { "text": "555-1234",       "field": "phone" },
        { "text": "linkedin.com/in/jdoe", "field": "linkedin" }
      ]
    },
    { "pId": "p2", "section": "experience", "item": -1, "field": "section-header" },
    { "pId": "p3", "section": "experience", "item": 0,  "field": "position" },
    { "pId": "p4", "section": "experience", "item": 0,  "field": "company-line",
      "splits": [
        { "text": "Google",            "field": "company" },
        { "text": "NYC",               "field": "location" },
        { "text": "2022 - Present",    "field": "dates" }
      ]
    },
    { "pId": "p5", "section": "experience", "item": 0,  "field": "highlight", "highlightIndex": 0 }
  ]
}

RULES:
- Include "sections" ONLY for sections that actually appear in this resume; preserve their order of appearance.
- Every paragraph in the input MUST appear in "assignments" exactly once, identified by its pId.
- "section" must be one of the section ids you listed above, OR "unknown" if you cannot classify.
- "item" is the 0-based index of the entry within the section (e.g. experience 0, 1, 2...). Use -1 for section headers and for fields that are not part of a repeating item (e.g. summary text, skill lists).
- "field" semantic vocabulary:
    header:        name | title | contact | email | phone | location | linkedin | github | website
    summary:       summary
    experience:    section-header | position | company | dates | location | company-line | highlight | environment
    education:     section-header | institution | degree | dates | location | gpa | highlight
    skills:        section-header | skill-line | category
    projects:      section-header | name | description | technologies | highlight | link
    certifications:section-header | certification
    unknown:       unknown
- "splits" is REQUIRED when one paragraph holds multiple logical fields on a single line (e.g. "Company · Location · Dates"). Each split.text MUST be a substring that appears verbatim in the paragraph text. Splits should cover the whole line (separators may be omitted).
- "highlightIndex" is the 0-based bullet index within the parent item (only for "highlight" fields).
- Return JSON ONLY. No code fences, no prose.`;

  const raw = await callAIText(aiClient, model, provider, prompt);
  const parsed = parseStrictJson(raw);

  if (!parsed || !Array.isArray(parsed.assignments)) {
    throw new HttpsError('internal', 'AI did not return a valid field-map structure');
  }

  // Build paragraph-text lookup so we can resolve splits to run IDs.
  const pTextById = new Map(paragraphs.map((p) => [p.pId, p.plainText]));
  // Build run index per paragraph: pId -> [{ rId, text }]
  const runsByParagraph = indexRunsServerSide(docXml);

  const fields = {};
  const extractedTextParts = [];

  for (const a of parsed.assignments) {
    const pId = a.pId;
    const runs = runsByParagraph.get(pId) || [];
    if (runs.length === 0) continue;

    const section = a.section || 'unknown';
    const itemIndex = typeof a.item === 'number' ? a.item : -1;
    const baseId = `${section}-${itemIndex}-${a.field || 'text'}`;

    if (Array.isArray(a.splits) && a.splits.length > 0) {
      // Resolve each split to the runs whose concatenated text contains its substring.
      const paraText = pTextById.get(pId) || '';
      for (let s = 0; s < a.splits.length; s++) {
        const sp = a.splits[s];
        const spText = String(sp?.text ?? '').trim();
        if (!spText) continue;
        const startOffset = paraText.indexOf(spText);
        if (startOffset === -1) continue;
        const endOffset = startOffset + spText.length;
        const nodeIds = runsOverlapping(runs, startOffset, endOffset);
        if (nodeIds.length === 0) continue;
        const splitField = sp.field || `${a.field}-${s}`;
        const fieldId = `${section}-${itemIndex}-${splitField}${s > 0 ? `-${s}` : ''}`;
        fields[fieldId] = {
          sectionId: section,
          itemIndex,
          fieldType: splitField,
          label: splitField,
          value: spText,
          nodeIds,
          pId,
        };
        extractedTextParts.push(spText);
      }
    } else {
      // Whole paragraph maps to a single field.
      const nodeIds = runs.map((r) => r.rId);
      const fullText = pTextById.get(pId) || '';
      // Skip pure section-header rows from the editable field set, but still
      // track them for context.
      const isHeader = a.field === 'section-header';
      let fieldId = baseId;
      if (a.field === 'highlight' && typeof a.highlightIndex === 'number') {
        fieldId = `${section}-${itemIndex}-highlight-${a.highlightIndex}`;
      } else if (fields[fieldId]) {
        // Disambiguate accidental duplicates.
        fieldId = `${fieldId}-${pId}`;
      }
      fields[fieldId] = {
        sectionId: section,
        itemIndex,
        fieldType: a.field || 'text',
        label: a.field || 'text',
        value: fullText,
        nodeIds,
        pId,
        isHeader: isHeader || undefined,
      };
      extractedTextParts.push(fullText);
    }
  }

  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
  return {
    sections,
    fields,
    extractedText: extractedTextParts.join('\n'),
  };
}

/**
 * Per-paragraph run index used by parseDocxToFieldMap to resolve splits to
 * specific runs. Each run record carries its start/end character offsets
 * within the paragraph's plain text so we can match substring spans.
 */
function indexRunsServerSide(xml) {
  const out = new Map();

  const indexParagraph = (pId, pBlock) => {
    const runRegex = /<w:r(\s[^>]*)?>([\s\S]*?)<\/w:r>/g;
    const records = [];
    let rIdx = 0;
    let offset = 0;
    let rm;
    while ((rm = runRegex.exec(pBlock)) !== null) {
      const runBody = rm[2];
      const textRegex = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let text = '';
      let tm;
      while ((tm = textRegex.exec(runBody)) !== null) {
        text += tm[2];
      }
      text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      const start = offset;
      const end = offset + text.length;
      records.push({ rId: `${pId}.r${rIdx}`, text, start, end });
      offset = end;
      rIdx++;
    }
    out.set(pId, records);
  };

  const tblRegex = /<w:tbl(\s[^>]*)?>([\s\S]*?)<\/w:tbl>/g;
  const tables = [];
  let m;
  while ((m = tblRegex.exec(xml)) !== null) {
    tables.push({ start: m.index, end: m.index + m[0].length, body: m[2] });
  }

  tables.forEach((tbl, tIdx) => {
    const rowRegex = /<w:tr(\s[^>]*)?>([\s\S]*?)<\/w:tr>/g;
    let rowMatch;
    let rowIdx = 0;
    while ((rowMatch = rowRegex.exec(tbl.body)) !== null) {
      const cellRegex = /<w:tc(\s[^>]*)?>([\s\S]*?)<\/w:tc>/g;
      let cellMatch;
      let cellIdx = 0;
      while ((cellMatch = cellRegex.exec(rowMatch[2])) !== null) {
        const cellPRegex = /<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
        let cellPMatch;
        let cellPIdx = 0;
        while ((cellPMatch = cellPRegex.exec(cellMatch[2])) !== null) {
          indexParagraph(`t${tIdx}.r${rowIdx}.c${cellIdx}.p${cellPIdx}`, cellPMatch[0]);
          cellPIdx++;
        }
        cellIdx++;
      }
      rowIdx++;
    }
  });

  const pRegex = /<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let topLevelPIdx = 0;
  while ((m = pRegex.exec(xml)) !== null) {
    const start = m.index;
    const inTable = tables.some((t) => start >= t.start && start < t.end);
    if (inTable) continue;
    indexParagraph(`p${topLevelPIdx}`, m[0]);
    topLevelPIdx++;
  }

  return out;
}

/**
 * Return the run IDs whose character ranges overlap [startOffset, endOffset).
 */
function runsOverlapping(runs, startOffset, endOffset) {
  const ids = [];
  for (const r of runs) {
    if (r.end <= startOffset) continue;
    if (r.start >= endOffset) break;
    ids.push(r.rId);
  }
  return ids;
}

/**
 * Parse a strict-JSON AI response, tolerating optional code fences and
 * surrounding prose.
 */
function parseStrictJson(text) {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const startObj = cleaned.indexOf('{');
    const startArr = cleaned.indexOf('[');
    const startIdx = startObj === -1 ? startArr : (startArr === -1 ? startObj : Math.min(startObj, startArr));
    if (startIdx === -1) return null;
    cleaned = cleaned.slice(startIdx);
  }
  // Balance scan
  const open = cleaned[0];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let end = -1;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(0, end + 1));
  } catch (e) {
    console.error('parseStrictJson failed:', e.message, cleaned.slice(0, 300));
    return null;
  }
}

// ============================================================================
// Stripe Cloud Functions
// ============================================================================

/**
 * Create a Stripe checkout session for purchasing credits
 */
exports.createCheckoutSession = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = request.auth.uid;
  
  // Check if user can purchase (credits < 5)
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  const currentCredits = userDoc.exists ? (userDoc.data().credits || 0) : 0;

  if (currentCredits >= 5) {
    throw new HttpsError('failed-precondition', 'You can only purchase credits when you have less than 5 remaining.');
  }

  const stripe = new Stripe(stripeSecretKey.value());

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: STRIPE_PRODUCT_ID,
            unit_amount: PRICE_AMOUNT,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.rawRequest?.headers?.origin || 'http://localhost:5173'}?payment=success`,
      cancel_url: `${request.rawRequest?.headers?.origin || 'http://localhost:5173'}?payment=cancelled`,
      metadata: {
        userId: userId,
        credits: CREDITS_PER_PURCHASE.toString(),
      },
    });

    // Create pending transaction
    await db.collection('users').doc(userId).collection('transactions').add({
      type: 'purchase',
      amount: CREDITS_PER_PURCHASE,
      dollarAmount: PRICE_AMOUNT / 100,
      status: 'pending',
      stripeSessionId: session.id,
      stripePaymentIntentId: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { sessionId: session.id, url: session.url };
  } catch (error) {
    console.error('Stripe session error:', error);
    throw new HttpsError('internal', 'Failed to create checkout session');
  }
});

/**
 * Stripe webhook handler for payment events
 */
exports.stripeWebhook = onRequest({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const stripe = new Stripe(stripeSecretKey.value());
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value());
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || '50', 10);

    if (userId) {
      try {
        const userRef = db.collection('users').doc(userId);
        
        // Add credits to user
        await userRef.update({
          credits: admin.firestore.FieldValue.increment(credits)
        });

        // Update transaction status
        const transactionsRef = db.collection('users').doc(userId).collection('transactions');
        const pendingTx = await transactionsRef
          .where('stripeSessionId', '==', session.id)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        if (!pendingTx.empty) {
          await pendingTx.docs[0].ref.update({
            status: 'completed',
            stripePaymentIntentId: session.payment_intent || '',
          });
        }

        console.log(`Added ${credits} credits to user ${userId}`);
      } catch (error) {
        console.error('Error updating user credits:', error);
      }
    }
  }

  res.status(200).json({ received: true });
});

/**
 * Get user's current credits
 */
exports.getCredits = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in');
  }

  const userId = request.auth.uid;
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { credits: 0 };
  }

  return { credits: userDoc.data().credits || 0 };
});
