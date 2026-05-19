import { functions, httpsCallable } from '../lib/firebase';

class AIService {
  constructor() {
    this.callAI = httpsCallable(functions, 'callAI');
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
    console.log('[AIService] Resume data sent:', JSON.stringify(currentResume, null, 2));
    
    try {
      console.log('[AIService] Calling Cloud Function...');
      const result = await this.callAI({
        action: 'transformResumeForRole',
        data: {
          resume: currentResume,
          targetRole,
          fieldsToUpdate,
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
    
    try {
      console.log('[AIService] Calling Cloud Function for match analysis...');
      const result = await this.callAI({
        action: 'analyzeMatch',
        data: {
          resume: currentResume,
          jobDescription,
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
