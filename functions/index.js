const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
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
const llmProvider = defineString('LLM_PROVIDER', { default: 'gemini' });
const modelName = defineString('MODEL_NAME', { default: 'gemini-2.5-pro' });

// Stripe config
const CREDITS_PER_PURCHASE = 50;
const PRICE_AMOUNT = 500; // $5.00 in cents
const STRIPE_PRODUCT_ID = 'prod_UXfqMUL4G8rS8I';

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

  const model = modelName.value();
  const provider = llmProvider.value();

  // Initialize the appropriate AI client
  let aiClient;
  if (provider === 'openai') {
    aiClient = new OpenAI({ apiKey: openaiApiKey.value().trim() });
  } else {
    aiClient = new GoogleGenAI({ apiKey: geminiApiKey.value().trim() });
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
        result = await extractResumeFromFile(aiClient, model, provider, data.base64Data, data.mimeType);
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

  let text = await callAIText(aiClient, modelName.value(), provider, prompt);
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

async function extractResumeFromFile(aiClient, model, provider, base64Data, mimeType) {
  const mammoth = require('mammoth');
  
  const prompt = `Extract all resume information into structured JSON format:
{
  "personalInfo": { "name": "", "title": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "" },
  "summary": "",
  "experience": [{ "company": "", "position": "", "location": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM or Present", "highlights": [] }],
  "education": [{ "institution": "", "degree": "", "location": "", "graduationDate": "YYYY-MM", "gpa": "", "highlights": [] }],
  "skills": { "languages": [], "frameworks": [], "tools": [], "databases": [], "other": [] },
  "projects": [{ "name": "", "description": "", "technologies": [], "highlights": [] }],
  "certifications": [{ "name": "", "issuer": "", "date": "YYYY-MM" }]
}

Return ONLY valid JSON.`;

  const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isPdf = mimeType === 'application/pdf';
  
  // Default structure for response
  const defaultStructure = {
    personalInfo: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', github: '' },
    summary: '',
    experience: [],
    education: [],
    skills: { languages: [], frameworks: [], tools: [], databases: [] },
    projects: [],
    certifications: []
  };

  // For Gemini with PDF, try direct file upload first
  if (provider === 'gemini' && isPdf) {
    try {
      console.log(`Attempting direct file extraction with Gemini for MIME type: ${mimeType}`);
      
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
        ]
      });

      let text = response.text;
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const resumeData = JSON.parse(text);
      console.log('Direct extraction successful');
      
      return {
        ...defaultStructure,
        ...resumeData,
        personalInfo: { ...defaultStructure.personalInfo, ...resumeData.personalInfo },
        skills: { ...defaultStructure.skills, ...resumeData.skills }
      };
    } catch (directError) {
      console.log('Direct extraction failed, falling back to text extraction:', directError.message);
    }
  }

  // For DOCX or OpenAI provider, extract text first then send to AI
  console.log('Using text extraction approach...');
  
  try {
    let extractedText = '';
    
    if (isDocx) {
      // Convert base64 to buffer for mammoth
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Use convertToHtml to preserve structure (bullets, headings, paragraphs)
      // then convert to structured text format that preserves sections
      const mammothResult = await mammoth.convertToHtml({ buffer });
      const htmlContent = mammothResult.value;
      
      // Convert HTML to structured text that preserves formatting
      // This helps the AI better identify resume sections
      extractedText = htmlContent
        // Preserve line breaks for major elements
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        // Add bullet markers for list items
        .replace(/<li[^>]*>/gi, '• ')
        // Add section markers for headings
        .replace(/<h1[^>]*>/gi, '\n=== ')
        .replace(/<h2[^>]*>/gi, '\n== ')
        .replace(/<h3[^>]*>/gi, '\n= ')
        .replace(/<h[4-6][^>]*>/gi, '\n')
        // Preserve bold text markers (often used for job titles, companies)
        .replace(/<strong[^>]*>|<b[^>]*>/gi, '**')
        .replace(/<\/strong>|<\/b>/gi, '**')
        // Remove all remaining HTML tags
        .replace(/<[^>]+>/g, '')
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&bull;/g, '•')
        // Clean up excessive whitespace while preserving structure
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
      
      console.log(`DOCX HTML extraction found ${mammothResult.messages?.length || 0} warnings`);
    } else if (isPdf) {
      // For OpenAI with PDF, we need to use a different approach
      // Since there's no pdftotext built-in, we'll try Gemini-style direct for now
      // or throw an error asking for DOCX
      if (provider === 'openai') {
        throw new Error('OpenAI models cannot directly process PDF files. Please upload a DOCX file or use a Gemini model for PDF processing.');
      }
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content extracted from file');
    }
    
    console.log(`Extracted ${extractedText.length} characters from file`);
    
    // Send extracted text to AI for structured parsing
    const textPrompt = `${prompt}

RESUME TEXT:
${extractedText}`;

    let responseText = await callAIText(aiClient, model, provider, textPrompt);
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const resumeData = JSON.parse(responseText);
    console.log('Text extraction approach successful');
    
    return {
      ...defaultStructure,
      ...resumeData,
      personalInfo: { ...defaultStructure.personalInfo, ...resumeData.personalInfo },
      skills: { ...defaultStructure.skills, ...resumeData.skills }
    };
  } catch (extractError) {
    console.error('Text extraction failed:', extractError.message);
    throw new Error(`Failed to extract resume data: ${extractError.message}`);
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

  const stripe = new Stripe(stripeSecretKey.value().trim());

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

  const stripe = new Stripe(stripeSecretKey.value().trim());
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret.value().trim());
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
