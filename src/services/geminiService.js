import { functions, httpsCallable } from '../lib/firebase';

// Available AI models (December 2025)
// Organized by provider for UI grouping
export const AI_MODELS = {
  // Gemini Models - December 2025 Latest
  'gemini-3-pro-preview': {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    description: 'Most intelligent - 1M context (Nov 2025)',
    provider: 'gemini'
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced thinking for complex tasks',
    provider: 'gemini'
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Best price-performance, fast',
    provider: 'gemini'
  },
  // OpenAI Models - December 2025 Latest
  'gpt-5.2-pro': {
    id: 'gpt-5.2-pro',
    name: 'GPT-5.2 Pro',
    description: 'Most capable model for professional work',
    provider: 'openai'
  },
  'gpt-5.2': {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'Latest GPT with advanced reasoning (Dec 2025)',
    provider: 'openai'
  },
  'gpt-5.1': {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    description: 'Enhanced intelligence & reasoning',
    provider: 'openai'
  },
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    description: 'Multimodal flagship model',
    provider: 'openai'
  },
  'o3': {
    id: 'o3',
    name: 'o3',
    description: 'Most powerful reasoning model',
    provider: 'openai'
  },
  'o3-mini': {
    id: 'o3-mini',
    name: 'o3-mini',
    description: 'Fast & efficient reasoning',
    provider: 'openai'
  },
  'o1-pro': {
    id: 'o1-pro',
    name: 'o1-pro',
    description: 'Max compute for accuracy',
    provider: 'openai'
  },
  'o1': {
    id: 'o1',
    name: 'o1',
    description: 'Advanced reasoning',
    provider: 'openai'
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Multimodal model',
    provider: 'openai'
  },
};

// Legacy export for backward compatibility
export const GEMINI_MODELS = AI_MODELS;

class AIService {
  constructor() {
    this.model = 'gemini-2.5-pro';
    this.callAI = httpsCallable(functions, 'callAI');
  }

  setModel(modelId) {
    if (AI_MODELS[modelId]) {
      this.model = modelId;
    }
  }

  getModel() {
    return this.model;
  }

  // Always return true since we use Cloud Functions now
  isInitialized() {
    return true;
  }

  // Legacy method - no longer needed with Cloud Functions
  initialize(apiKey) {
    // No-op: API key is now stored in Cloud Functions secrets
    console.log('GeminiService: Using Cloud Functions (API key stored server-side)');
  }

  async updateResumeForJob(currentResume, jobDescription, fieldsToUpdate = ['headline', 'summary', 'jobTitles', 'experience', 'skills', 'projects', 'internships', 'hackathons', 'certifications']) {
    console.log('[AIService] updateResumeForJob called');
    console.log('[AIService] Fields to update:', fieldsToUpdate);
    console.log('[AIService] Model:', this.model);
    console.log('[AIService] Resume data sent:', JSON.stringify(currentResume, null, 2));
    console.log('[AIService] Job description length:', jobDescription?.length);
    
    try {
      console.log('[AIService] Calling Cloud Function...');
      const result = await this.callAI({
        action: 'updateResumeForJob',
        data: {
          resume: currentResume,
          jobDescription,
          fieldsToUpdate,
          model: this.model,
        }
      });
      
      console.log('[AIService] Cloud Function response:', JSON.stringify(result.data, null, 2));
      
      if (!result.data?.success) {
        console.error('[AIService] AI processing failed:', result.data?.error);
        throw new Error(result.data?.error || 'AI processing failed');
      }
      
      console.log('[AIService] updateResumeForJob SUCCESS');
      return result.data.data;
    } catch (error) {
      console.error('[AIService] Error updating resume:', error);
      console.error('[AIService] Error details:', { code: error.code, message: error.message });
      // Extract Firebase Functions error message
      if (error.code === 'functions/resource-exhausted') {
        throw new Error('Insufficient credits. Please purchase more credits to continue.');
      }
      throw new Error(error.message || 'Failed to update resume');
    }
  }

  async transformResumeForRole(currentResume, targetRole, fieldsToUpdate = ['headline', 'summary', 'jobTitles', 'experience', 'skills', 'projects', 'internships', 'hackathons', 'certifications']) {
    console.log('[AIService] transformResumeForRole called');
    console.log('[AIService] Target role:', targetRole);
    console.log('[AIService] Fields to update:', fieldsToUpdate);
    console.log('[AIService] Model:', this.model);
    console.log('[AIService] Resume data sent:', JSON.stringify(currentResume, null, 2));
    
    try {
      console.log('[AIService] Calling Cloud Function...');
      const result = await this.callAI({
        action: 'transformResumeForRole',
        data: {
          resume: currentResume,
          targetRole,
          fieldsToUpdate,
          model: this.model,
        }
      });
      
      console.log('[AIService] Cloud Function response:', JSON.stringify(result.data, null, 2));
      
      if (!result.data?.success) {
        console.error('[AIService] AI processing failed:', result.data?.error);
        throw new Error(result.data?.error || 'AI processing failed');
      }
      
      console.log('[AIService] transformResumeForRole SUCCESS');
      return result.data.data;
    } catch (error) {
      console.error('[AIService] Error transforming resume:', error);
      console.error('[AIService] Error details:', { code: error.code, message: error.message });
      if (error.code === 'functions/resource-exhausted') {
        throw new Error('Insufficient credits. Please purchase more credits to continue.');
      }
      throw new Error(error.message || 'Failed to transform resume');
    }
  }

  async generateSuggestions(currentResume, jobDescription) {
    try {
      const result = await this.callAI({
        action: 'generateSuggestions',
        data: {
          resume: currentResume,
          jobDescription,
          model: this.model,
        }
      });
      
      if (!result.data?.success) {
        throw new Error(result.data?.error || 'AI processing failed');
      }
      
      return result.data.data;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      if (error.code === 'functions/resource-exhausted') {
        throw new Error('Insufficient credits. Please purchase more credits to continue.');
      }
      throw new Error(error.message || 'Failed to generate suggestions');
    }
  }

  async analyzeMatch(currentResume, jobDescription) {
    console.log('[AIService] analyzeMatch called');
    console.log('[AIService] Model:', this.model);
    
    try {
      console.log('[AIService] Calling Cloud Function for match analysis...');
      const result = await this.callAI({
        action: 'analyzeMatch',
        data: {
          resume: currentResume,
          jobDescription,
          model: this.model,
        }
      });
      
      console.log('[AIService] analyzeMatch response:', JSON.stringify(result.data, null, 2));
      
      if (!result.data?.success) {
        console.error('[AIService] analyzeMatch failed:', result.data?.error);
        throw new Error(result.data?.error || 'AI processing failed');
      }
      
      console.log('[AIService] analyzeMatch SUCCESS');
      return result.data.data;
    } catch (error) {
      console.error('[AIService] Error analyzing match:', error);
      console.error('[AIService] Error details:', { code: error.code, message: error.message });
      if (error.code === 'functions/resource-exhausted') {
        throw new Error('Insufficient credits. Please purchase more credits to continue.');
      }
      throw new Error(error.message || 'Failed to analyze match');
    }
  }

  async generateRefactoredHighlights(resumeContext, baseHighlights) {
    try {
      const result = await this.callAI({
        action: 'generateRefactoredHighlights',
        data: {
          context: resumeContext,
          highlights: baseHighlights,
        }
      });
      
      if (!result.data?.success) {
        // Fallback to original highlights on error
        return baseHighlights;
      }
      
      return result.data.data;
    } catch (error) {
      console.error('Error refactoring highlights:', error);
      // Fallback to base highlights if AI fails
      return baseHighlights;
    }
  }

  async editFieldWithAI(currentValue, userPrompt, fieldType = 'general') {
    try {
      const result = await this.callAI({
        action: 'editField',
        data: {
          currentValue,
          userPrompt,
          fieldType,
          model: this.model,
        }
      });
      
      if (!result.data?.success) {
        throw new Error(result.data?.error || 'AI processing failed');
      }
      
      return result.data.data;
    } catch (error) {
      console.error('Error editing field:', error);
      if (error.code === 'functions/resource-exhausted') {
        throw new Error('Insufficient credits. Please purchase more credits to continue.');
      }
      throw new Error(error.message || 'Failed to edit field');
    }
  }
}

// Singleton instance
const aiService = new AIService();
export const geminiService = aiService; // Legacy alias
export { aiService };
export default aiService;
