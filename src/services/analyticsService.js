/**
 * Firebase Analytics Service
 * Provides comprehensive tracking for user actions, engagement, and feature usage
 */

import { analytics, logEvent, setUserId, setUserProperties } from '../lib/firebase';

// Event names - organized by category
export const ANALYTICS_EVENTS = {
  // Authentication Events
  AUTH: {
    LOGIN: 'login',
    LOGOUT: 'logout',
    SIGNUP: 'sign_up',
  },
  
  // Resume Management Events
  RESUME: {
    CREATE: 'resume_create',
    DELETE: 'resume_delete',
    SELECT: 'resume_select',
    SAVE: 'resume_save',
    DUPLICATE: 'resume_duplicate',
  },
  
  // Group Management Events
  GROUP: {
    CREATE: 'group_create',
    DELETE: 'group_delete',
    EDIT_SHARED: 'group_edit_shared',
  },
  
  // AI Feature Events
  AI: {
    OPTIMIZE_START: 'ai_optimize_start',
    OPTIMIZE_SUCCESS: 'ai_optimize_success',
    OPTIMIZE_ERROR: 'ai_optimize_error',
    TRANSFORM_START: 'ai_transform_start',
    TRANSFORM_SUCCESS: 'ai_transform_success',
    TRANSFORM_ERROR: 'ai_transform_error',
    MATCH_ANALYSIS: 'ai_match_analysis',
    AUTO_POPULATE: 'ai_auto_populate',
  },
  
  // Export Events
  EXPORT: {
    PDF: 'export_pdf',
    DOCX: 'export_docx',
    COPY_LINK: 'export_copy_link',
  },
  
  // Editing Events
  EDIT: {
    FIELD_UPDATE: 'field_update',
    SECTION_REORDER: 'section_reorder',
    SECTION_TOGGLE: 'section_toggle',
    FORMAT_CHANGE: 'format_change',
  },
  
  // Theme & Design Events
  DESIGN: {
    THEME_CHANGE: 'theme_change',
    TEMPLATE_CHANGE: 'template_change',
    COLOR_CHANGE: 'color_change',
    FONT_CHANGE: 'font_change',
  },
  
  // Credits & Monetization Events
  CREDITS: {
    PURCHASE_INITIATED: 'credits_purchase_initiated',
    PURCHASE_SUCCESS: 'credits_purchase_success',
    CREDITS_USED: 'credits_used',
    LOW_CREDITS_WARNING: 'low_credits_warning',
  },
  
  // Version History Events
  VERSION: {
    VIEW_HISTORY: 'version_history_view',
    RESTORE_VERSION: 'version_restore',
    CREATE_SNAPSHOT: 'version_snapshot_create',
  },
  
  // Import Events
  IMPORT: {
    START: 'import_start',
    SUCCESS: 'import_success',
    ERROR: 'import_error',
  },
  
  // Engagement Events
  ENGAGEMENT: {
    SESSION_START: 'session_start',
    FEATURE_DISCOVERY: 'feature_discovery',
    MODAL_OPEN: 'modal_open',
    MODAL_CLOSE: 'modal_close',
  },
  
  // Error Events
  ERROR: {
    API_ERROR: 'api_error',
    SAVE_ERROR: 'save_error',
    LOAD_ERROR: 'load_error',
  },
};

/**
 * Analytics Service Class
 * Wraps Firebase Analytics with convenient methods and error handling
 */
class AnalyticsService {
  constructor() {
    this.isEnabled = typeof window !== 'undefined' && analytics !== null;
    this.sessionStartTime = null;
  }

  /**
   * Initialize analytics for a user session
   */
  initSession(userId, userProperties = {}) {
    if (!this.isEnabled) return;
    
    try {
      this.sessionStartTime = Date.now();
      
      // Set user ID for cross-session tracking
      if (userId) {
        setUserId(analytics, userId);
      }
      
      // Set user properties
      if (Object.keys(userProperties).length > 0) {
        setUserProperties(analytics, userProperties);
      }
      
      this.trackEvent(ANALYTICS_EVENTS.ENGAGEMENT.SESSION_START, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Analytics initSession error:', error);
    }
  }

  /**
   * Clear user data on logout
   */
  clearUser() {
    if (!this.isEnabled) return;
    
    try {
      setUserId(analytics, null);
      this.sessionStartTime = null;
    } catch (error) {
      console.warn('Analytics clearUser error:', error);
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName, params = {}) {
    if (!this.isEnabled) return;
    
    try {
      // Add session duration if available
      if (this.sessionStartTime) {
        params.session_duration_seconds = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      }
      
      // Add timestamp
      params.event_timestamp = new Date().toISOString();
      
      logEvent(analytics, eventName, params);
    } catch (error) {
      console.warn('Analytics trackEvent error:', error);
    }
  }

  // ==================== Authentication ====================
  
  trackLogin(method = 'google') {
    this.trackEvent(ANALYTICS_EVENTS.AUTH.LOGIN, { method });
  }

  trackLogout() {
    const sessionDuration = this.sessionStartTime 
      ? Math.floor((Date.now() - this.sessionStartTime) / 1000)
      : 0;
    
    this.trackEvent(ANALYTICS_EVENTS.AUTH.LOGOUT, {
      session_duration_seconds: sessionDuration,
    });
  }

  trackSignup(method = 'google') {
    this.trackEvent(ANALYTICS_EVENTS.AUTH.SIGNUP, { method });
  }

  // ==================== Resume Management ====================

  trackResumeCreate(groupId, resumeName) {
    this.trackEvent(ANALYTICS_EVENTS.RESUME.CREATE, {
      group_id: groupId,
      resume_name: resumeName,
    });
  }

  trackResumeDelete(resumeId) {
    this.trackEvent(ANALYTICS_EVENTS.RESUME.DELETE, {
      resume_id: resumeId,
    });
  }

  trackResumeSelect(groupId, resumeId) {
    this.trackEvent(ANALYTICS_EVENTS.RESUME.SELECT, {
      group_id: groupId,
      resume_id: resumeId,
    });
  }

  trackResumeSave(resumeId, hasChanges) {
    this.trackEvent(ANALYTICS_EVENTS.RESUME.SAVE, {
      resume_id: resumeId,
      had_changes: hasChanges,
    });
  }

  trackResumeDuplicate(sourceId, newId) {
    this.trackEvent(ANALYTICS_EVENTS.RESUME.DUPLICATE, {
      source_resume_id: sourceId,
      new_resume_id: newId,
    });
  }

  // ==================== Group Management ====================

  trackGroupCreate(groupName) {
    this.trackEvent(ANALYTICS_EVENTS.GROUP.CREATE, {
      group_name: groupName,
    });
  }

  trackGroupDelete(groupId) {
    this.trackEvent(ANALYTICS_EVENTS.GROUP.DELETE, {
      group_id: groupId,
    });
  }

  trackGroupEditShared(groupId) {
    this.trackEvent(ANALYTICS_EVENTS.GROUP.EDIT_SHARED, {
      group_id: groupId,
    });
  }

  // ==================== AI Features ====================

  trackAIOptimizeStart(fieldsToUpdate, mode = 'job') {
    this.trackEvent(ANALYTICS_EVENTS.AI.OPTIMIZE_START, {
      fields_count: fieldsToUpdate.length,
      fields: fieldsToUpdate.join(','),
      mode,
    });
  }

  trackAIOptimizeSuccess(matchScoreBefore, matchScoreAfter, mode = 'job') {
    this.trackEvent(ANALYTICS_EVENTS.AI.OPTIMIZE_SUCCESS, {
      match_score_before: matchScoreBefore,
      match_score_after: matchScoreAfter,
      score_improvement: matchScoreAfter - matchScoreBefore,
      mode,
    });
  }

  trackAIOptimizeError(errorMessage, mode = 'job') {
    this.trackEvent(ANALYTICS_EVENTS.AI.OPTIMIZE_ERROR, {
      error_message: errorMessage?.substring(0, 100),
      mode,
    });
  }

  trackAIMatchAnalysis(matchScore) {
    this.trackEvent(ANALYTICS_EVENTS.AI.MATCH_ANALYSIS, {
      match_score: matchScore,
    });
  }

  trackAIAutoPopulate(groupId, source) {
    this.trackEvent(ANALYTICS_EVENTS.AI.AUTO_POPULATE, {
      group_id: groupId,
      source,
    });
  }

  // ==================== Export ====================

  trackExportPDF(resumeId, template) {
    this.trackEvent(ANALYTICS_EVENTS.EXPORT.PDF, {
      resume_id: resumeId,
      template,
    });
  }

  trackExportDOCX(resumeId) {
    this.trackEvent(ANALYTICS_EVENTS.EXPORT.DOCX, {
      resume_id: resumeId,
    });
  }

  trackCopyLink(resumeId) {
    this.trackEvent(ANALYTICS_EVENTS.EXPORT.COPY_LINK, {
      resume_id: resumeId,
    });
  }

  // ==================== Editing ====================

  trackFieldUpdate(sectionName, fieldName) {
    this.trackEvent(ANALYTICS_EVENTS.EDIT.FIELD_UPDATE, {
      section: sectionName,
      field: fieldName,
    });
  }

  trackSectionReorder(sectionOrder) {
    this.trackEvent(ANALYTICS_EVENTS.EDIT.SECTION_REORDER, {
      new_order: sectionOrder.join(','),
    });
  }

  trackSectionToggle(sectionId, isVisible) {
    this.trackEvent(ANALYTICS_EVENTS.EDIT.SECTION_TOGGLE, {
      section_id: sectionId,
      is_visible: isVisible,
    });
  }

  trackFormatChange(sectionId, formatId) {
    this.trackEvent(ANALYTICS_EVENTS.EDIT.FORMAT_CHANGE, {
      section_id: sectionId,
      format_id: formatId,
    });
  }

  // ==================== Theme & Design ====================

  trackThemeChange(themeName) {
    this.trackEvent(ANALYTICS_EVENTS.DESIGN.THEME_CHANGE, {
      theme_name: themeName,
    });
  }

  trackTemplateChange(templateId) {
    this.trackEvent(ANALYTICS_EVENTS.DESIGN.TEMPLATE_CHANGE, {
      template_id: templateId,
    });
  }

  trackColorChange(colorType, colorValue) {
    this.trackEvent(ANALYTICS_EVENTS.DESIGN.COLOR_CHANGE, {
      color_type: colorType,
      color_value: colorValue,
    });
  }

  trackFontChange(fontType, fontName) {
    this.trackEvent(ANALYTICS_EVENTS.DESIGN.FONT_CHANGE, {
      font_type: fontType,
      font_name: fontName,
    });
  }

  // ==================== Credits & Monetization ====================

  trackCreditsPurchaseInitiated(creditAmount, price) {
    this.trackEvent(ANALYTICS_EVENTS.CREDITS.PURCHASE_INITIATED, {
      credit_amount: creditAmount,
      price,
      currency: 'USD',
    });
  }

  trackCreditsPurchaseSuccess(creditAmount, price) {
    this.trackEvent(ANALYTICS_EVENTS.CREDITS.PURCHASE_SUCCESS, {
      credit_amount: creditAmount,
      price,
      currency: 'USD',
      value: price, // For revenue tracking
    });
  }

  trackCreditsUsed(action, creditsUsed) {
    this.trackEvent(ANALYTICS_EVENTS.CREDITS.CREDITS_USED, {
      action,
      credits_used: creditsUsed,
    });
  }

  trackLowCreditsWarning(remainingCredits) {
    this.trackEvent(ANALYTICS_EVENTS.CREDITS.LOW_CREDITS_WARNING, {
      remaining_credits: remainingCredits,
    });
  }

  // ==================== Version History ====================

  trackVersionHistoryView(resumeId, versionCount) {
    this.trackEvent(ANALYTICS_EVENTS.VERSION.VIEW_HISTORY, {
      resume_id: resumeId,
      version_count: versionCount,
    });
  }

  trackVersionRestore(resumeId, versionId) {
    this.trackEvent(ANALYTICS_EVENTS.VERSION.RESTORE_VERSION, {
      resume_id: resumeId,
      version_id: versionId,
    });
  }

  trackVersionSnapshotCreate(resumeId, label) {
    this.trackEvent(ANALYTICS_EVENTS.VERSION.CREATE_SNAPSHOT, {
      resume_id: resumeId,
      snapshot_label: label?.substring(0, 50),
    });
  }

  // ==================== Import ====================

  trackImportStart(fileType) {
    this.trackEvent(ANALYTICS_EVENTS.IMPORT.START, {
      file_type: fileType,
    });
  }

  trackImportSuccess(fileType, sectionsImported) {
    this.trackEvent(ANALYTICS_EVENTS.IMPORT.SUCCESS, {
      file_type: fileType,
      sections_imported: sectionsImported,
    });
  }

  trackImportError(fileType, errorMessage) {
    this.trackEvent(ANALYTICS_EVENTS.IMPORT.ERROR, {
      file_type: fileType,
      error_message: errorMessage?.substring(0, 100),
    });
  }

  // ==================== Engagement ====================

  trackFeatureDiscovery(featureName) {
    this.trackEvent(ANALYTICS_EVENTS.ENGAGEMENT.FEATURE_DISCOVERY, {
      feature_name: featureName,
    });
  }

  trackModalOpen(modalName) {
    this.trackEvent(ANALYTICS_EVENTS.ENGAGEMENT.MODAL_OPEN, {
      modal_name: modalName,
    });
  }

  trackModalClose(modalName, action = 'close') {
    this.trackEvent(ANALYTICS_EVENTS.ENGAGEMENT.MODAL_CLOSE, {
      modal_name: modalName,
      action, // 'close', 'submit', 'cancel'
    });
  }

  // ==================== Errors ====================

  trackAPIError(endpoint, errorCode, errorMessage) {
    this.trackEvent(ANALYTICS_EVENTS.ERROR.API_ERROR, {
      endpoint,
      error_code: errorCode,
      error_message: errorMessage?.substring(0, 100),
    });
  }

  trackSaveError(resumeId, errorMessage) {
    this.trackEvent(ANALYTICS_EVENTS.ERROR.SAVE_ERROR, {
      resume_id: resumeId,
      error_message: errorMessage?.substring(0, 100),
    });
  }

  trackLoadError(resourceType, resourceId, errorMessage) {
    this.trackEvent(ANALYTICS_EVENTS.ERROR.LOAD_ERROR, {
      resource_type: resourceType,
      resource_id: resourceId,
      error_message: errorMessage?.substring(0, 100),
    });
  }

  // ==================== Page Views ====================

  trackPageView(pageName, pageParams = {}) {
    this.trackEvent('page_view', {
      page_name: pageName,
      ...pageParams,
    });
  }

  // ==================== Custom Timing ====================

  trackTiming(category, variable, timeMs, label = '') {
    this.trackEvent('timing_complete', {
      timing_category: category,
      timing_variable: variable,
      timing_value: timeMs,
      timing_label: label,
    });
  }

  // ==================== User Flow ====================

  trackUserFlow(flowName, step, totalSteps) {
    this.trackEvent('user_flow', {
      flow_name: flowName,
      step,
      total_steps: totalSteps,
      completion_percentage: Math.round((step / totalSteps) * 100),
    });
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Default export
export default analyticsService;
