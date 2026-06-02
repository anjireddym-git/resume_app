import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FileText, RefreshCw, LogOut, User, ChevronDown, Loader2, Sparkles, History, Layers, Settings2, Save, AlertTriangle, Menu, X } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { CreditsProvider, useCredits } from './contexts/CreditsContext';
import LoginPage from './pages/LoginPage';
import FileBrowser from './components/FileBrowser';
import CreateGroupModal from './components/CreateGroupModal';
import CreateResumeModal from './components/CreateResumeModal';
import EditSharedModal from './components/EditSharedModal';
import AutoPopulateModal from './components/AutoPopulateModal';
import JobDescriptionModal from './components/JobDescriptionModal';
import OutreachWorkspace from './components/outreach';
import useOutreachCounts from './hooks/useOutreachCounts';
import VersionHistory from './components/VersionHistory';
import ResumeEditor from './components/ResumeEditor';
import GeneratedDocxPreview from './components/GeneratedDocxPreview';
import SyncStatusBadge from './components/SyncStatusBadge';
import SectionReorder from './components/SectionReorder';
import MatchAnalysis from './components/MatchAnalysis';
import ActionButtons from './components/ActionButtons';
import ThemeCustomizationModal from './components/ThemeCustomizationModal';
import ApiKeyInput from './components/ApiKeyInput';
import SplashScreen from './components/SplashScreen';
import CreditsDisplay from './components/CreditsDisplay';
import ResizableSplitPane from './components/ResizableSplitPane';
import { geminiService } from './services/geminiService';
import { analyticsService } from './services/analyticsService';
import { DEFAULT_SECTION_ORDER } from './config/templates';
import { normalizeSummaryToPoints } from './lib/summaryUtils';
import { buildCustomExperienceForSave } from './lib/resumeExperienceOverrides';
import { 
  getResumeGroup, 
  getResume, 
  updateResumeCustomData, 
  updateResumeMatchAnalysis,
  createResume,
  createGeneratedResume,
  buildFullResume,
  updateGroupSharedData,
  updateResumeSectionFormat,
  getResumesInGroup,
  updateGroupSectionLayout
} from './services/resumeService';
import useResumeEditor from './hooks/useResumeEditor';
import { drainDriveCleanup, syncResumeToDriveByIds } from './services/driveSyncService';

const INITIAL_RESUME_DATA = {};
const SIDEBAR_WIDTH_KEY = 'resumeSidebarWidth';
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 256;
const MAX_SIDEBAR_WIDTH = 560;

function getInitialSidebarWidth() {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
  try {
    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(stored)) {
      return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, stored));
    }
  } catch {
    // Ignore storage access issues; the default width is fine.
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

const OutreachTabs = ({ view, setView }) => {
  const { total } = useOutreachCounts();
  return (
    <div className="hidden sm:flex items-center gap-1 ml-3 pl-3 border-l border-neutral-200">
      <button
        onClick={() => setView('editor')}
        className={`h-7 px-3 rounded-md text-sm font-medium transition-colors ${
          view === 'editor' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-50'
        }`}
      >
        Editor
      </button>
      <button
        onClick={() => setView('outreach')}
        className={`h-7 px-3 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
          view === 'outreach' ? 'bg-blue-50 text-blue-700' : 'text-neutral-600 hover:bg-neutral-50'
        }`}
      >
        Outreach
        {total > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {total}
          </span>
        )}
      </button>
    </div>
  );
};

function App() {
  const {
    user,
    isAuthenticated,
    loading: authLoading,
    signOut,
    updatePreferences,
    getGoogleAccessToken,
    connectGoogleDrive,
    retryDriveSync,
    disconnectGoogleDrive,
    invalidateGoogleAccessToken,
    hasGoogleDriveAccess,
    driveSyncEnabled,
  } = useAuth();
  const { credits, hasCredits, purchaseCredits } = useCredits();
  
  const [showSplash, setShowSplash] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateResume, setShowCreateResume] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [agentStream, setAgentStream] = useState(null); // null | { active, thoughts[], answerPreview, usage, status, elapsedMs, validator, model, error }
  const [view, setView] = useState('editor'); // 'editor' | 'outreach'
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [createResumeGroupId, setCreateResumeGroupId] = useState(null);
  const [showEditShared, setShowEditShared] = useState(false);
  const [editSharedGroup, setEditSharedGroup] = useState(null);
  const [showAutoPopulate, setShowAutoPopulate] = useState(false);
  const [autoPopulateGroup, setAutoPopulateGroup] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(getInitialSidebarWidth);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  
  // Theme Design Modal State
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [designResumeData, setDesignResumeData] = useState(null);
  const [designResumeRecord, setDesignResumeRecord] = useState(null);
  const [designGroup, setDesignGroup] = useState(null);
  const [designSyncing, setDesignSyncing] = useState(false);
  const [designSyncError, setDesignSyncError] = useState('');
  
  // Current selection
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [currentResume, setCurrentResume] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Editor state
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [apiKeySet, setApiKeySet] = useState(true);
  const [matchAnalysis, setMatchAnalysis] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const [showLayoutPanel, setShowLayoutPanel] = useState(false);
  // Drive sync status: idle | syncing | synced | error | auth-error
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncError, setSyncError] = useState('');

  // Template & layout state
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTION_ORDER);
  const [visibleSections, setVisibleSections] = useState(DEFAULT_SECTION_ORDER);

  const resumeRef = useRef(null);
  const resumeDataRef = useRef({}); // Keep track of latest resume data
  const sidebarPanelRef = useRef(null);
  const sidebarWidthRef = useRef(sidebarWidth);
  
  const {
    resumeData,
    setResumeData,
    updateField,
    addItem,
    removeItem,
    reset: resetEditor,
  } = useResumeEditor(INITIAL_RESUME_DATA);

  // Keep ref in sync with state
  useEffect(() => {
    resumeDataRef.current = resumeData;
  }, [resumeData]);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handlePointerMove = (event) => {
      const left = sidebarPanelRef.current?.getBoundingClientRect()?.left || 0;
      const nextWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, event.clientX - left)
      );
      sidebarWidthRef.current = nextWidth;
      setSidebarWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizingSidebar(false);
      try {
        window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(sidebarWidthRef.current)));
      } catch {
        // Persistence is a convenience; resizing should still work without it.
      }
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizingSidebar]);

  const currentRenderOptions = useMemo(() => ({
    sectionOrder: sectionOrder.filter((s) => visibleSections.includes(s)),
    visibleSections,
    themeConfig: currentGroup?.themeConfig,
    sectionFormats: resumeData?.sectionFormats || {},
    customSectionDefs: currentGroup?.customSectionDefs || resumeData?.customSectionDefs || [],
  }), [
    sectionOrder,
    visibleSections,
    currentGroup?.themeConfig,
    currentGroup?.customSectionDefs,
    resumeData?.sectionFormats,
    resumeData?.customSectionDefs,
  ]);

  // Gemini service is initialized automatically via Cloud Functions
  // No need for API key initialization on frontend

  // Load resume when selected
  const loadData = useCallback(async () => {
    if (!selectedGroupId || !selectedResumeId) {
      setCurrentGroup(null);
      setCurrentResume(null);
      setResumeData({});
      return;
    }

    setDataLoading(true);
    try {
      const [group, resume] = await Promise.all([
        getResumeGroup(selectedGroupId),
        getResume(selectedResumeId)
      ]);
      
      // If resume or group not found (deleted), clear selection
      if (!group || !resume) {
        console.log('Resume or group not found, clearing selection');
        setSelectedGroupId(null);
        setSelectedResumeId(null);
        setCurrentGroup(null);
        setCurrentResume(null);
        setResumeData({});
        return;
      }
      
      setCurrentGroup(group);
      setCurrentResume(resume);
      setJobDescription(resume.jobDescription || '');
      setMatchAnalysis(resume.matchAnalysis || null);
      
      // Load section order and visibility from group (or use defaults)
      setSectionOrder(group.sectionOrder || DEFAULT_SECTION_ORDER);
      setVisibleSections(group.visibleSections || DEFAULT_SECTION_ORDER);
      
      // Build full resume data
      const fullResume = buildFullResume(group, resume);
      setResumeData(fullResume);
      resetEditor(fullResume);
      setHasUnsavedChanges(false); // Reset unsaved changes on load
    } catch (err) {
      console.error('Failed to load resume:', err);
      // Resume or group might be deleted, clear selection
      setSelectedGroupId(null);
      setSelectedResumeId(null);
      setCurrentGroup(null);
      setCurrentResume(null);
      setResumeData({});
    } finally {
      setDataLoading(false);
    }
  }, [selectedGroupId, selectedResumeId, setResumeData, resetEditor]);

  // Load resume when selected
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Restore last selection from user preferences
  useEffect(() => {
    if (user?.preferences?.currentGroupId) {
      setSelectedGroupId(user.preferences.currentGroupId);
      if (user.preferences.currentResumeId) {
        setSelectedResumeId(user.preferences.currentResumeId);
      }
    }
  }, [user?.preferences]);

  const handleSelectResume = async (groupId, resumeId) => {
    // Check for unsaved changes before navigating
    if (hasUnsavedChanges) {
      setPendingNavigation({ groupId, resumeId });
      setShowUnsavedWarning(true);
      return;
    }
    
    setSelectedGroupId(groupId);
    setSelectedResumeId(resumeId);
    
    // Track resume selection
    analyticsService.trackResumeSelect(groupId, resumeId);
    
    // Save to preferences
    await updatePreferences({
      currentGroupId: groupId,
      currentResumeId: resumeId
    });
  };

  // Complete navigation after saving/discarding
  const completeNavigation = async (groupId, resumeId) => {
    setSelectedGroupId(groupId);
    setSelectedResumeId(resumeId);
    setHasUnsavedChanges(false);
    
    await updatePreferences({
      currentGroupId: groupId,
      currentResumeId: resumeId
    });
  };

  const handleCreateResume = (groupId) => {
    setCreateResumeGroupId(groupId);
    setShowCreateResume(true);
  };

  const handleResumeCreated = (resumeId) => {
    setRefreshTrigger(prev => prev + 1);
    if (createResumeGroupId) {
      setSelectedGroupId(createResumeGroupId);
      setSelectedResumeId(resumeId);
      // Track resume creation
      analyticsService.trackResumeCreate(createResumeGroupId, 'New Resume');
    }
  };

  const handleGroupCreated = (groupId) => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedGroupId(groupId);
    // Track group creation
    analyticsService.trackGroupCreate('New Group');
  };

  const handleApiKeySet = (apiKey) => {
    try {
      geminiService.initialize(apiKey);
      setApiKeySet(true);
      setError('');
    } catch (err) {
      setError('Failed to initialize API.');
      setApiKeySet(false);
    }
  };

  const handleCheckMatch = async (jd) => {
    const jobDesc = jd || jobDescription;
    if (!jobDesc.trim() || !currentResume) return;
    
    // Check credits before AI action
    if (!hasCredits) {
      setError('No credits remaining. Please purchase credits to use AI features.');
      analyticsService.trackLowCreditsWarning(0);
      return;
    }
    
    setIsAnalyzing(true);
    setError('');
    try {
      const analysis = await geminiService.analyzeMatch(resumeData, jobDesc);
      setMatchAnalysis(analysis);
      setJobDescription(jobDesc);
      await updateResumeMatchAnalysis(currentResume.id, analysis.matchScore, analysis);
      // Track match analysis
      analyticsService.trackAIMatchAnalysis(analysis.matchScore);
    } catch (err) {
      setError(err.message || 'Failed to analyze match.');
      analyticsService.trackAIOptimizeError(err.message, 'match_analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateWithAI = async (jd, fieldsToUpdate = ['headline', 'summary', 'jobTitles', 'experience', 'skills', 'projects', 'internships', 'hackathons', 'certifications'], mode = 'job') => {
    const inputText = jd || jobDescription;
    console.log('[AI Update] Starting...', { mode, fieldsToUpdate, inputLength: inputText?.length });
    
    if (!inputText.trim() || !currentResume) {
      console.log('[AI Update] Missing input or current resume', { hasInput: !!inputText.trim(), hasResume: !!currentResume });
      return;
    }
    
    // Check credits before AI action
    if (!hasCredits) {
      console.log('[AI Update] No credits available');
      setShowJobModal(false);
      setError('No credits remaining. Please purchase credits to use AI features.');
      analyticsService.trackLowCreditsWarning(0);
      return;
    }
    
    // Track AI optimization start
    analyticsService.trackAIOptimizeStart(fieldsToUpdate, mode);
    const previousScore = matchAnalysis?.matchScore || 0;
    
    // Keep modal open during streaming so the thinking pane is visible.
    setIsLoading(true);
    setIsAnalyzing(true);
    setError('');
    setAgentStream({
      active: true,
      thoughts: [],
      answerPreview: '',
      usage: null,
      status: 'thinking',
      elapsedMs: 0,
      validator: null,
      model: '',
      error: '',
    });
    const startedAt = Date.now();
    const elapsedTimer = setInterval(() => {
      setAgentStream((s) => (s ? { ...s, elapsedMs: Date.now() - startedAt } : s));
    }, 250);
    
    try {
      console.log(`[AI Update] ${mode === 'transform' ? 'Transform' : 'Optimize'} mode via streaming agent...`);

      const final = await geminiService.streamResumeAgent(
        resumeData,
        inputText,
        fieldsToUpdate,
        (chunk) => {
          setAgentStream((s) => {
            if (!s) return s;
            switch (chunk.type) {
              case 'status':
                return { ...s, status: chunk.stage || s.status, model: chunk.model || s.model };
              case 'thought':
                // OpenAI streams reasoning as tiny word-level deltas; Gemini
                // sends full paragraphs. Always concatenate onto the last entry
                // so we build one readable block instead of a word-per-line list.
                return {
                  ...s,
                  thoughts: s.thoughts.length === 0
                    ? [chunk.text || '']
                    : [...s.thoughts.slice(0, -1), s.thoughts[s.thoughts.length - 1] + (chunk.text || '')],
                  status: 'thinking',
                };
              case 'answer':
                return { ...s, answerPreview: (s.answerPreview || '') + (chunk.text || ''), status: 'writing' };
              case 'usage':
                return { ...s, usage: chunk };
              case 'validator':
                return { ...s, validator: { ok: chunk.ok, issues: chunk.issues || [] }, status: 'validating' };
              case 'persisted':
                return { ...s, status: 'persisting' };
              case 'error':
                return { ...s, error: chunk.message || 'Agent error', status: 'error' };
              default:
                return s;
            }
          });
        },
        {
          sourceResumeId: currentResume.id,
          mode,
          label: mode === 'transform'
            ? `Transformed for ${inputText.substring(0, 50)}...`
            : `Optimized for ${fieldsToUpdate.join(', ')}`,
        }
      );

      const updatedResume = final?.resume;
      if (!updatedResume) {
        throw new Error(final?.error || 'AI returned empty response');
      }

      const validatorOk = final?.validator?.ok !== false;

      setJobDescription(inputText);
      setAgentStream((s) => (s ? {
        ...s,
        status: validatorOk ? 'done' : 'review-required',
        validator: final?.validator || s.validator,
        elapsedMs: Date.now() - startedAt,
      } : s));

      // Track AI optimization success
      analyticsService.trackAIOptimizeSuccess(previousScore, 0, mode);
      analyticsService.trackCreditsUsed(mode === 'transform' ? 'ai_transform' : 'ai_optimize', 1);

      console.log('[AI Update] Creating generated child resume...');
      // Prefer the server-persisted resume ID (Cloud Function already wrote
      // the doc when validator.ok). Otherwise fall back to client save.
      let newResumeId = final?.newResumeId || null;
      if (!newResumeId) {
        console.warn('[AI Update] Server did not persist; falling back to client save.');
        newResumeId = await createGeneratedResume(user.uid, currentResume, updatedResume, {
          mode,
          jobDescription: inputText,
          fieldsToUpdate,
          label: mode === 'transform'
            ? `Transformed for ${inputText.substring(0, 50)}...`
            : `Optimized for ${fieldsToUpdate.join(', ')}`,
          aiTrace: {
            thoughts: (final?.aiTrace?.thoughts) || '',
            usage: final?.usage || null,
            model: final?.aiTrace?.model || '',
            validator: final?.validator || null,
            savedAt: new Date().toISOString(),
          },
          aiMetadata: final?.metadata || null,
        });
      }

      setRefreshTrigger(prev => prev + 1);
      setHasUnsavedChanges(false);
      setSelectedGroupId(currentResume.groupId);
      setSelectedResumeId(newResumeId);
      setResumeData({
        ...updatedResume,
        summary: normalizeSummaryToPoints(updatedResume.summary || ''),
      });
      await updatePreferences({
        currentGroupId: currentResume.groupId,
        currentResumeId: newResumeId,
      });
      console.log('[AI Update] Generated child resume created:', newResumeId);

      // Auto-close on clean success; leave open on validator soft-fail so the
      // user can review the issues panel before dismissing.
      if (validatorOk) {
        setTimeout(() => {
          setAgentStream(null);
          setShowJobModal(false);
        }, 800);
      }
    } catch (err) {
      console.error('[AI Update] ERROR:', err);
      console.error('[AI Update] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(err.message || 'Failed to optimize resume.');
      setAgentStream((s) => (s ? { ...s, status: 'error', error: err.message || 'Failed' } : s));
      analyticsService.trackAIOptimizeError(err.message, mode);
    } finally {
      clearInterval(elapsedTimer);
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  const handleFieldUpdate = (path, value) => {
    // Update local state only - don't auto-save
    updateField(path, value);
    setHasUnsavedChanges(true);
  };

  // Handle section format changes - save immediately to Firebase
  const handleFormatChange = async (sectionId, formatId) => {
    if (!currentResume) return;
    
    // Track format change
    analyticsService.trackFormatChange(sectionId, formatId);
    
    try {
      // Update local state immediately for responsive UI
      setResumeData(prev => ({
        ...prev,
        sectionFormats: {
          ...prev.sectionFormats,
          [sectionId]: formatId
        }
      }));
      
      // Save to Firebase
      await updateResumeSectionFormat(currentResume.id, sectionId, formatId);
    } catch (err) {
      console.error('Failed to save format:', err);
    }
  };

  // Save all changes to Firebase
  /**
   * Sync the current resume to Google Drive in the background. Creates the
   * Google Doc on first call, updates it on subsequent calls. Failures are
   * logged and reflected in syncStatus; never blocks the user.
   */
  const autoSyncToDrive = useCallback(async (latestData, { force = false, accessToken = null, renderOptions = null } = {}) => {
    if (!currentResume || !currentGroup || (!driveSyncEnabled && !force)) return;
    setSyncStatus('syncing');
    setSyncError('');
    try {
      const result = await syncResumeToDriveByIds({
        getAccessToken: accessToken ? async () => accessToken : getGoogleAccessToken,
        groupId: currentGroup.id,
        resume: currentResume,
        resumeData: latestData || resumeDataRef.current,
        renderOptions: renderOptions || currentRenderOptions,
      });
      setCurrentResume((prev) => prev ? {
        ...prev,
        driveFileId: result.fileId,
        driveFolderId: result.folderId,
        driveWebViewLink: result.webViewLink,
      } : prev);
      setSyncStatus('synced');
    } catch (err) {
      if (err?.kind === 'authorization-required') {
        console.warn('Drive auto-sync needs reconnection');
        invalidateGoogleAccessToken('Google Drive authorization expired. Reconnect to resume syncing.');
        setSyncStatus('auth-error');
      } else {
        console.error('Drive auto-sync failed:', err);
        setSyncError(
          err?.kind === 'api-disabled'
            ? 'Google Drive API is disabled for this project. Enable it in Google Cloud Console.'
            : err?.message || 'Drive sync failed. Click to retry.'
        );
        setSyncStatus('error');
      }
    }
  }, [currentResume, currentGroup, driveSyncEnabled, getGoogleAccessToken, invalidateGoogleAccessToken, currentRenderOptions]);

  // Auto-sync resume to Drive whenever a new resume is opened that isn't yet
  // backed by a Google Doc. Must be after autoSyncToDrive definition.
  // Gated on hasGoogleDriveAccess so we don't trigger 401s + a noisy
  // "Reconnect needed" badge for users who haven't granted Drive scope.
  const autoSyncedRef = useRef(new Set());
  useEffect(() => {
    if (!currentResume?.id || !currentGroup?.id) return;
    if (!driveSyncEnabled) {
      setSyncStatus('idle');
      return;
    }
    if (!hasGoogleDriveAccess) {
      setSyncStatus('auth-error');
      return;
    }
    if (currentResume.driveFileId) {
      setSyncStatus('synced');
      return;
    }
    if (autoSyncedRef.current.has(currentResume.id)) return;
    autoSyncedRef.current.add(currentResume.id);
    autoSyncToDrive(resumeDataRef.current);
  }, [currentResume?.id, currentGroup?.id, currentResume?.driveFileId, driveSyncEnabled, hasGoogleDriveAccess, autoSyncToDrive]);

  useEffect(() => {
    if (!hasGoogleDriveAccess || !user?.uid) return;
    drainDriveCleanup({ getAccessToken: getGoogleAccessToken, userId: user.uid }).catch((err) => {
      if (err?.kind === 'authorization-required') {
        invalidateGoogleAccessToken('Google Drive authorization expired. Reconnect to finish cleanup.');
        setSyncStatus('auth-error');
      } else {
        console.warn('Drive cleanup failed:', err);
      }
    });
  }, [getGoogleAccessToken, hasGoogleDriveAccess, invalidateGoogleAccessToken, user?.uid]);

  const handleEnableDriveSync = useCallback(async () => {
    try {
      const accessToken = await connectGoogleDrive();
      await autoSyncToDrive(resumeDataRef.current, { force: true, accessToken });
    } catch (err) {
      setSyncError(err?.message || 'Could not enable Drive sync.');
      setSyncStatus('auth-error');
    }
  }, [autoSyncToDrive, connectGoogleDrive]);

  const handleReconnectDrive = useCallback(async () => {
    try {
      const accessToken = await retryDriveSync();
      await autoSyncToDrive(resumeDataRef.current, { force: true, accessToken });
    } catch (err) {
      setSyncError(err?.message || 'Could not reconnect Google Drive.');
      setSyncStatus('auth-error');
    }
  }, [autoSyncToDrive, retryDriveSync]);

  const handleRetryDriveSync = useCallback(() => {
    autoSyncToDrive(resumeDataRef.current);
  }, [autoSyncToDrive]);

  const handleDisconnectDrive = useCallback(async () => {
    await disconnectGoogleDrive();
    setSyncStatus('idle');
    setSyncError('');
  }, [disconnectGoogleDrive]);

  const handleSave = async () => {
    if (!currentResume || !hasUnsavedChanges) return;
    
    // Use ref to get the latest data
    const dataToSave = resumeDataRef.current;
    console.log('Saving data:', dataToSave);
    
    setIsSaving(true);
    try {
      // Sanitize data - Firebase doesn't accept undefined values
      const sanitizedData = {
        personalInfo: dataToSave.personalInfo || {},
        summary: dataToSave.summary || '',
        experience: buildCustomExperienceForSave(
          dataToSave.experience || [],
          currentGroup?.sharedData?.experience || []
        ),
        education: dataToSave.education || [],
        skills: dataToSave.skills || {},
        projects: dataToSave.projects || [],
        certifications: dataToSave.certifications || [],
        internships: dataToSave.internships || [],
        hackathons: dataToSave.hackathons || [],
      };
      
      await updateResumeCustomData(currentResume.id, sanitizedData);
      setHasUnsavedChanges(false);
      // Track resume save
      analyticsService.trackResumeSave(currentResume.id, true);
      console.log('Save successful');

      if (driveSyncEnabled) {
        autoSyncToDrive(dataToSave).catch((e) => console.warn('Auto-sync failed:', e));
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save changes');
      analyticsService.trackSaveError(currentResume.id, err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle navigation with unsaved changes warning
  const handleResumeSelect = (groupId, resumeId) => {
    if (hasUnsavedChanges) {
      setPendingNavigation({ groupId, resumeId });
      setShowUnsavedWarning(true);
    } else {
      setSelectedGroupId(groupId);
      setSelectedResumeId(resumeId);
    }
  };

  const confirmNavigation = async () => {
    if (pendingNavigation) {
      await completeNavigation(pendingNavigation.groupId, pendingNavigation.resumeId);
      setPendingNavigation(null);
    }
    setShowUnsavedWarning(false);
  };

  const cancelNavigation = () => {
    setPendingNavigation(null);
    setShowUnsavedWarning(false);
  };

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const syncDesignDocToDrive = useCallback(async (
    themeConfigOverride,
    { interactive = false, groupOverride = null } = {}
  ) => {
    const baseGroup = groupOverride || designGroup;
    const resumeRecord = designResumeRecord;
    const sourceResumeData = currentResume?.id === resumeRecord?.id
      ? resumeDataRef.current
      : designResumeData;

    if (!baseGroup?.id || !resumeRecord?.id || !sourceResumeData) {
      setDesignSyncError('Select a saved resume before syncing a Google Docs copy.');
      return null;
    }

    if (!hasGoogleDriveAccess && !interactive) {
      setDesignSyncError('Connect Google Drive to update this Google Docs copy.');
      return null;
    }

    setDesignSyncing(true);
    setDesignSyncError('');

    try {
      const accessToken = !hasGoogleDriveAccess && interactive
        ? await connectGoogleDrive()
        : null;
      const nextThemeConfig = themeConfigOverride || baseGroup.themeConfig;
      const nextSectionOrder = baseGroup.sectionOrder || DEFAULT_SECTION_ORDER;
      const nextVisibleSections = baseGroup.visibleSections || nextSectionOrder;
      const renderOptions = {
        sectionOrder: nextSectionOrder.filter((section) => nextVisibleSections.includes(section)),
        visibleSections: nextVisibleSections,
        themeConfig: nextThemeConfig,
        sectionFormats: sourceResumeData?.sectionFormats || {},
        customSectionDefs: baseGroup.customSectionDefs || sourceResumeData?.customSectionDefs || [],
      };
      const result = await syncResumeToDriveByIds({
        getAccessToken: accessToken ? async () => accessToken : getGoogleAccessToken,
        groupId: baseGroup.id,
        resume: resumeRecord,
        resumeData: {
          ...sourceResumeData,
          themeConfig: nextThemeConfig,
        },
        renderOptions,
      });
      const driveMetadata = {
        driveFileId: result.fileId,
        driveFolderId: result.folderId,
        driveWebViewLink: result.webViewLink,
      };

      setDesignResumeRecord((prev) => (
        prev?.id === resumeRecord.id ? { ...prev, ...driveMetadata } : prev
      ));
      if (currentResume?.id === resumeRecord.id) {
        setCurrentResume((prev) => (prev ? { ...prev, ...driveMetadata } : prev));
        setSyncStatus('synced');
      }
      return result;
    } catch (err) {
      if (err?.kind === 'authorization-required') {
        invalidateGoogleAccessToken('Google Drive authorization expired. Reconnect to update the Google Docs copy.');
        setDesignSyncError('Reconnect Google Drive to update this Google Docs copy.');
        if (currentResume?.id === resumeRecord.id) setSyncStatus('auth-error');
      } else {
        const message = err?.kind === 'api-disabled'
          ? 'Google Drive API is disabled for this project.'
          : err?.message || 'Could not update the Google Docs copy.';
        setDesignSyncError(message);
        if (currentResume?.id === resumeRecord.id) {
          setSyncError(message);
          setSyncStatus('error');
        }
      }
      return null;
    } finally {
      setDesignSyncing(false);
    }
  }, [
    connectGoogleDrive,
    currentResume?.id,
    designGroup,
    designResumeData,
    designResumeRecord,
    getGoogleAccessToken,
    hasGoogleDriveAccess,
    invalidateGoogleAccessToken,
  ]);

  // Show splash
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Show loading
  const handleEditShared = (group) => {
    setEditSharedGroup(group);
    setShowEditShared(true);
  };

  const handleSaveSharedData = async (groupId, sharedData) => {
    await updateGroupSharedData(groupId, sharedData);
    setRefreshTrigger(prev => prev + 1);
    // Track group shared data edit
    analyticsService.trackGroupEditShared(groupId);
    
    // Reload current data if we're editing the active group
    if (selectedGroupId === groupId && selectedResumeId) {
      loadData();
    }
  };

  const handleAutoPopulate = (group) => {
    setAutoPopulateGroup(group);
    setShowAutoPopulate(true);
    // Track modal open
    analyticsService.trackModalOpen('auto_populate');
  };

  const handleAutoPopulateComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    // Track auto populate action
    analyticsService.trackAIAutoPopulate(autoPopulateGroup?.id, 'document_import');
  };

  const handleEditDesign = async (group, resumeId) => {
    // We need both the group (for theme) and the resume (for content preview)
    // If no resumeId is passed, try to find the first one or create a dummy one
    
    let targetResume = null;
    let targetResumeRecord = null;
    
    try {
      if (resumeId) {
        if (selectedResumeId === resumeId && currentResume?.id === resumeId && resumeData) {
          targetResume = resumeData;
          targetResumeRecord = currentResume;
        } else {
          // Fetch specific resume
           const resume = await getResume(resumeId);
           targetResumeRecord = resume;
           targetResume = buildFullResume(group, resume);
        }
      } else {
        if (selectedGroupId === group.id && currentResume?.id && resumeDataRef.current) {
          targetResumeRecord = currentResume;
          targetResume = resumeDataRef.current;
        } else {
          // Try to get first resume in group to use as preview
          const resumes = await getResumesInGroup(group.id, user.uid);
          if (resumes.length > 0) {
            targetResumeRecord = resumes[0];
            targetResume = buildFullResume(group, targetResumeRecord);
          } else {
            // No resumes in group? Just use placeholder data or shared data
            targetResume = {
              personalInfo: group.sharedData?.personalInfo || {},
              experience: group.sharedData?.experience || [],
              education: group.sharedData?.education || [],
            };
          }
        }
      }

      setDesignGroup(group);
      setDesignResumeData(targetResume);
      setDesignResumeRecord(targetResumeRecord);
      setDesignSyncError('');
      setDesignSyncing(false);
      setShowDesignModal(true);
      // Track design modal open
      analyticsService.trackModalOpen('theme_customization');
    } catch (err) {
      console.error('Failed to load design context:', err);
      analyticsService.trackLoadError('design', group?.id, err.message);
    }
  };

  const handleDesignUpdate = async (nextThemeConfig = null) => {
    setRefreshTrigger(prev => prev + 1);
    // Track theme design update
    analyticsService.trackThemeChange(nextThemeConfig?.preset || designGroup?.themeConfig?.preset || 'custom');
    
    // Reload the designed group so the dashboard and managed Google Doc use
    // the same saved theme settings.
    if (designGroup?.id) {
        try {
          // Reload the group that was just designed
          const updatedGroup = await getResumeGroup(designGroup.id);
          const groupForSync = updatedGroup || {
            ...designGroup,
            themeConfig: nextThemeConfig || designGroup.themeConfig,
          };

          setDesignGroup(groupForSync);
          
          // If we're viewing the same group, update currentGroup.
          if (selectedGroupId === designGroup.id) {
            setCurrentGroup(groupForSync);
          }
        } catch (err) {
          console.error('Failed to reload group:', err);
        }
    }
  };



  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Header */}
      <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <FileText className="w-5 h-5 text-neutral-900" strokeWidth={1.5} />
          <span className="font-medium text-neutral-900">Resume</span>
          <OutreachTabs view={view} setView={setView} />
        </div>

        <div className="flex items-center gap-3">
          {/* Credits Display */}
          <CreditsDisplay />
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="hidden sm:flex h-8 px-3 rounded-md text-sm text-neutral-600 hover:bg-neutral-100 items-center gap-1"
          >
            Settings
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-8 w-8 rounded-full overflow-hidden border-2 border-neutral-200 hover:border-neutral-300"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-full h-full p-1.5 text-neutral-400" />
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b border-neutral-100">
                  <p className="text-sm font-medium text-neutral-900">{user?.displayName}</p>
                  <p className="text-xs text-neutral-500">{user?.email}</p>
                </div>
                <button
                  onClick={() => { signOut(); setShowUserMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b border-neutral-200 px-4 py-3">
          <ApiKeyInput 
            onApiKeySet={handleApiKeySet} 
            isSet={apiKeySet}
          />
        </div>
      )}

      {/* Main Content */}
      {view === 'outreach' ? (
        <OutreachWorkspace
          user={user}
          onResumeCreated={(newId, groupId) => {
            if (groupId) setSelectedGroupId(groupId);
            if (newId) setSelectedResumeId(newId);
            setRefreshTrigger((p) => p + 1);
          }}
        />
      ) : (
      <div className="flex-1 min-w-0 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Left Sidebar - File Browser */}
        <div
          ref={sidebarPanelRef}
          style={{ '--sidebar-width': `${sidebarWidth}px` }}
          className={`
          fixed inset-y-0 left-0 z-50 w-[min(20rem,85vw)] bg-white border-r border-neutral-200
          transform transition-transform duration-300 ease-in-out
          md:relative md:w-[var(--sidebar-width)] md:translate-x-0 md:z-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        >
          {/* Mobile Sidebar Header */}
          <div className="h-14 border-b border-neutral-200 flex items-center justify-between px-4 md:hidden">
            <span className="font-medium text-neutral-900">Resumes</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 -mr-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <FileBrowser
            onSelectResume={(groupId, resumeId) => {
              handleSelectResume(groupId, resumeId);
              setSidebarOpen(false); // Close sidebar on mobile after selection
            }}
            selectedResumeId={selectedResumeId}
            selectedGroupId={selectedGroupId}
            onCreateGroup={() => { setShowCreateGroup(true); setSidebarOpen(false); }}
            onCreateResume={(groupId) => {
              setCreateResumeGroupId(groupId);
              setShowCreateResume(true);
              setSidebarOpen(false);
            }}
            onEditShared={(group) => { handleEditShared(group); setSidebarOpen(false); }}
            onAutoPopulate={(group) => { handleAutoPopulate(group); setSidebarOpen(false); }}
            onEditDesign={(group, resumeId) => { handleEditDesign(group, resumeId); setSidebarOpen(false); }}
            refreshTrigger={refreshTrigger}
          />
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize resume browser"
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuemax={MAX_SIDEBAR_WIDTH}
            aria-valuenow={Math.round(sidebarWidth)}
            tabIndex={0}
            title="Drag to resize"
            onPointerDown={(event) => {
              event.preventDefault();
              setIsResizingSidebar(true);
            }}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              setSidebarWidth((current) => {
                let next;
                if (event.key === 'Home') {
                  next = MIN_SIDEBAR_WIDTH;
                } else if (event.key === 'End') {
                  next = MAX_SIDEBAR_WIDTH;
                } else {
                  const delta = event.key === 'ArrowRight' ? 24 : -24;
                  next = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, current + delta));
                }
                try {
                  window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(next)));
                } catch {
                  // Persistence is a convenience; keyboard resizing still works without it.
                }
                return next;
              });
            }}
            className={`absolute right-0 top-0 hidden h-full w-2 translate-x-1 cursor-col-resize md:block ${
              isResizingSidebar ? 'bg-blue-400/40' : 'hover:bg-blue-400/25'
            }`}
          />
        </div>

        {/* Main Area */}
        <div className="flex-1 min-w-0 flex overflow-hidden">
          {selectedResumeId && currentResume ? (
            <>
              {/* Left Panel - Web Editor + Controls */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
                {/* Toolbar */}
                <div className="min-h-14 border-b border-neutral-200 bg-white px-3 md:px-4 py-2 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    {/* Optimize Button */}
                    <button
                      onClick={() => setShowJobModal(true)}
                      disabled={!apiKeySet || isLoading || !hasCredits}
                      className="h-9 px-3 md:px-4 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
                      title={!hasCredits ? 'No credits - purchase credits to continue' : 'Optimize resume for job'}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">Optimize</span>
                    </button>

                    {/* History Button */}
                    <button
                      onClick={() => setShowVersionHistory(true)}
                      className="h-9 px-3 border border-neutral-200 text-neutral-600 rounded-lg text-sm font-medium hover:bg-neutral-50 flex items-center gap-2"
                      title="Version History"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* Layout Button - hidden on mobile */}
                    <button
                      onClick={() => setShowLayoutPanel(!showLayoutPanel)}
                      className={`hidden md:flex h-9 px-3 border rounded-lg text-sm font-medium items-center gap-2 ${
                        showLayoutPanel 
                          ? 'border-neutral-900 bg-neutral-900 text-white' 
                          : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                    
                    {/* Match Score Badge */}
                    {matchAnalysis && (
                      <div className={`px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium ${
                        matchAnalysis.matchScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        matchAnalysis.matchScore >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {matchAnalysis.matchScore}%<span className="hidden sm:inline"> Match</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                    {/* Save Button - shows when there are unsaved changes */}
                    {hasUnsavedChanges && (
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-9 px-3 md:px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-all animate-pulse"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
                      </button>
                    )}

                    {/* Template Selector removed — PDF support removed */}

                    <ActionButtons
                      resumeRef={resumeRef}
                      resumeData={resumeData}
                      renderOptions={currentRenderOptions}
                      hasChanges={hasUnsavedChanges}
                      currentResume={currentResume}
                    />
                  </div>
                </div>

                {/* AI Processing Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm mx-4 text-center border border-neutral-100">
                      <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                        {isAnalyzing ? 'Transforming Resume...' : 'Optimizing Resume...'}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        AI is tailoring your resume. This may take a few seconds.
                      </p>
                      <div className="mt-4 flex justify-center gap-1">
                        <div className="w-2 h-2 bg-neutral-900 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-neutral-900 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-neutral-900 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Area - Resizable Split Pane (desktop) / Editor only (mobile) */}
                <div className="flex-1 min-w-0 flex overflow-hidden">
                  {/* Layout Panel (collapsible) */}
                  {showLayoutPanel && (
                    <div className="w-56 border-r border-neutral-200 bg-white p-4 overflow-y-auto flex-shrink-0">
                      <h3 className="text-sm font-medium text-neutral-900 mb-3">Section Order</h3>
                      <SectionReorder
                        sections={sectionOrder}
                        visibleSections={visibleSections}
                        onReorder={async (newOrder) => {
                          setSectionOrder(newOrder);
                          // Track section reorder
                          analyticsService.trackSectionReorder(newOrder);
                          // Persist to Firestore
                          if (selectedGroupId) {
                            try {
                              await updateGroupSectionLayout(selectedGroupId, newOrder, visibleSections);
                            } catch (err) {
                              console.error('Failed to save section order:', err);
                            }
                          }
                        }}
                        onToggleVisibility={async (id) => {
                          const newVisibleSections = visibleSections.includes(id)
                            ? visibleSections.filter(s => s !== id)
                            : [...visibleSections, id];
                          setVisibleSections(newVisibleSections);
                          // Track section toggle
                          analyticsService.trackSectionToggle(id, !visibleSections.includes(id));
                          // Persist to Firestore
                          if (selectedGroupId) {
                            try {
                              await updateGroupSectionLayout(selectedGroupId, sectionOrder, newVisibleSections);
                            } catch (err) {
                              console.error('Failed to save section visibility:', err);
                            }
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Desktop: Resizable Split Pane */}
                  <div className="hidden lg:flex flex-1 min-w-0 overflow-hidden">
                    <ResizableSplitPane
                      defaultLeftWidth={55}
                      minLeftWidth={30}
                      maxLeftWidth={80}
                      leftLabel="Editor"
                      rightLabel="Preview"
                      left={
                        <div className="flex-1 min-w-0 overflow-hidden bg-white">
                          <ResumeEditor
                            resumeData={resumeData}
                            onUpdate={handleFieldUpdate}
                            onFormatChange={handleFormatChange}
                          />
                        </div>
                      }
                      right={
                        <div className="flex-1 min-w-0 flex flex-col bg-neutral-100 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-neutral-400">DOCX Preview</div>
                            <SyncStatusBadge
                              status={syncStatus}
                              enabled={driveSyncEnabled}
                              error={syncError}
                              onEnable={handleEnableDriveSync}
                              onReconnect={handleReconnectDrive}
                              onRetry={handleRetryDriveSync}
                              onDisconnect={handleDisconnectDrive}
                            />
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden bg-white rounded-lg shadow-sm border border-neutral-200">
                            <GeneratedDocxPreview
                              resumeData={resumeData}
                              renderOptions={currentRenderOptions}
                            />
                          </div>
                        </div>
                      }
                    />
                  </div>

                  {/* Mobile: Editor only */}
                  <div className="lg:hidden flex-1 min-w-0 overflow-hidden">
                    <ResumeEditor
                      resumeData={resumeData}
                      onUpdate={handleFieldUpdate}
                      onFormatChange={handleFormatChange}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center bg-[#fafafa]">
              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-neutral-400" />
                </div>
                <h2 className="text-lg font-medium text-neutral-900 mb-2">No resume selected</h2>
                <p className="text-sm text-neutral-500 mb-4">Select a resume from the sidebar or create a new group</p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="h-10 px-4 bg-neutral-900 text-white rounded-lg text-sm font-medium"
                >
                  Create Resume Group
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onComplete={handleGroupCreated}
      />
      
      <CreateResumeModal
        isOpen={showCreateResume}
        onClose={() => setShowCreateResume(false)}
        groupId={createResumeGroupId}
        onComplete={handleResumeCreated}
      />

      <EditSharedModal
        isOpen={showEditShared}
        onClose={() => setShowEditShared(false)}
        group={editSharedGroup}
        onSave={handleSaveSharedData}
      />

      <AutoPopulateModal
        isOpen={showAutoPopulate}
        onClose={() => setShowAutoPopulate(false)}
        group={autoPopulateGroup}
        onComplete={handleAutoPopulateComplete}
      />

      <ThemeCustomizationModal
        isOpen={showDesignModal}
        onClose={() => {
          setShowDesignModal(false);
          setDesignSyncError('');
        }}
        resumeData={designResumeData}
        group={designGroup}
        driveFileId={designResumeRecord?.driveFileId}
        onUpdate={handleDesignUpdate}
        onSyncNow={(themeConfig) => syncDesignDocToDrive(themeConfig, { interactive: true })}
        isSyncing={designSyncing}
        syncError={designSyncError}
      />


      <JobDescriptionModal
        isOpen={showJobModal}
        onClose={() => { setShowJobModal(false); setAgentStream(null); }}
        onOptimize={handleUpdateWithAI}
        onCheckMatch={handleCheckMatch}
        isLoading={isLoading}
        isAnalyzing={isAnalyzing}
        initialJobDescription={jobDescription}
        agentStream={agentStream}
      />

      {/* Version History Modal */}
      <VersionHistory
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        resumeId={selectedResumeId}
        onRestore={(restoredCustomData) => {
          // Rebuild full resume with restored data
          if (currentGroup) {
            const fullResume = buildFullResume(currentGroup, { customData: restoredCustomData });
            setResumeData(fullResume);
            setMatchAnalysis(null);
          }
        }}
      />

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Unsaved Changes</h3>
            </div>
            <p className="text-neutral-600 mb-6">
              You have unsaved changes. Do you want to save before leaving?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={confirmNavigation}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Discard
              </button>
              <button
                onClick={async () => {
                  await handleSave();
                  confirmNavigation();
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap App with CreditsProvider
function AppWithProviders() {
  return (
    <CreditsProvider>
      <App />
    </CreditsProvider>
  );
}

export default AppWithProviders;
