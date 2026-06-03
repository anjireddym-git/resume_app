import React, { useMemo, useState, useRef } from 'react';
import { X, Upload, Loader2, FileText, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditsContext';
import { createResumeGroup, createResume } from '../services/resumeService';
import { extractResumeFromFile } from '../services/documentParser';
import { geminiService } from '../services/geminiService';
import ThemeEditor from './ThemeEditor';
import GeneratedDocxPreview from './GeneratedDocxPreview';
import { DEFAULT_THEME_CONFIG } from '../config/themeConfig';
import { buildSectionOrder, buildCustomSectionDefs, buildCustomSectionsMap } from '../services/layoutExtractionService';
import { normalizeSummaryToPoints } from '../lib/summaryUtils';

const CreateGroupModal = ({ isOpen, onClose, onComplete }) => {
  const { user } = useAuth();
  const { credits } = useCredits();
  const [step, setStep] = useState('name'); // 'name' | 'resume' | 'design' | 'creating'
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  
  // Form data
  const [groupName, setGroupName] = useState('');
  const [resumeData, setResumeData] = useState(null);
  const [themeConfig, setThemeConfig] = useState(DEFAULT_THEME_CONFIG);
  const [error, setError] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (credits < 1) {
      setError('Importing a resume uses 1 credit. Add credits to continue.');
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    setError('');
    try {
      const { content } = await extractResumeFromFile(geminiService, file);
      console.log('Resume import response:', { contentKeys: Object.keys(content || {}) });
      if (!content || (!content.personalInfo && !content.experience && !content.summary)) {
        throw new Error('AI returned empty resume content. Try a different file or model.');
      }
      setResumeData({
        ...content,
        summary: normalizeSummaryToPoints(content.summary || ''),
      });
    } catch (err) {
      console.error('Import failed:', err);
      setError(err?.message || 'Failed to import resume. Please try again.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleComplete = async () => {
    if (!resumeData) {
      setError('Please import a resume first');
      return;
    }

    setStep('creating');
    setIsLoading(true);
    try {
      // Extract shared data from resume
      const sharedData = {
        personalInfo: resumeData.personalInfo || {},
        experience: (resumeData.experience || []).map(exp => ({
          company: exp.company,
          position: exp.position,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
        })),
        education: resumeData.education || [],
      };

      // Custom sections (Phase 1)
      const customSectionDefs = buildCustomSectionDefs(resumeData);
      const customSectionsMap = buildCustomSectionsMap(resumeData);
      const sectionOrder = buildSectionOrder(resumeData);

      // Create group with extracted content; visual styling always comes from the app theme/template.
      const groupId = await createResumeGroup(user.uid, {
        name: groupName,
        personalInfo: sharedData.personalInfo,
        experience: sharedData.experience,
        education: sharedData.education,
        themeConfig: themeConfig,
        layoutSource: 'template',
        customSectionDefs,
        sectionOrder,
        visibleSections: sectionOrder,
      });

      // Create first resume with full custom data
      await createResume(user.uid, groupId, {
        name: 'Base Resume',
        summary: resumeData.summary || '',
        experience: (resumeData.experience || []).map(exp => ({
          highlights: exp.highlights || [],
          environment: exp.environment || '',
        })),
        skills: resumeData.skills || {},
        projects: resumeData.projects || [],
        certifications: resumeData.certifications || [],
        internships: resumeData.internships || [],
        hackathons: resumeData.hackathons || [],
        customSections: customSectionsMap,
      });

      onComplete(groupId);
      handleClose();
    } catch (err) {
      console.error('Failed to create group:', err);
      setError('Failed to create group. Please try again.');
      setStep('design'); // Go back to design step on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('name');
    setGroupName('');
    setResumeData(null);
    setThemeConfig(DEFAULT_THEME_CONFIG);
    setError('');
    onClose();
  };

  const designRenderOptions = useMemo(() => {
    const sectionOrder = resumeData ? buildSectionOrder(resumeData) : undefined;
    return {
      sectionOrder,
      visibleSections: sectionOrder,
      themeConfig,
      customSectionDefs: resumeData ? buildCustomSectionDefs(resumeData) : [],
    };
  }, [resumeData, themeConfig]);

  if (!isOpen) return null;

  // Determine modal width based on step
  const getModalWidth = () => {
    if (step === 'design') return 'max-w-6xl h-[90vh]';
    return 'max-w-md max-h-[95vh]';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`bg-white rounded-2xl w-full overflow-hidden flex flex-col transition-all duration-300 ${getModalWidth()}`}>
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            {step === 'design' ? 'Customize Design' : 'Create Resume Group'}
          </h2>
          <button onClick={handleClose} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Step 1: Name */}
          {step === 'name' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-700 block mb-1.5">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Software Engineer Applications"
                  className="w-full h-10 px-3 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                  autoFocus
                />
                <p className="text-xs text-neutral-500 mt-1.5">
                  Group similar job applications together
                </p>
              </div>

              <button
                onClick={() => setStep('resume')}
                disabled={!groupName.trim()}
                className="w-full h-10 bg-neutral-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Import Resume */}
          {step === 'resume' && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600">
                Import your base resume. Contact info and experience dates will be shared across all resumes in this group.
              </p>

              {/* Import Area */}
              <div 
                onClick={() => !isImporting && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  resumeData 
                    ? 'border-emerald-300 bg-emerald-50' 
                    : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
                }`}
              >
                {isImporting ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
                    <p className="text-sm text-neutral-500">Parsing resume...</p>
                  </div>
                ) : resumeData ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-emerald-700">
                      {resumeData.personalInfo?.name || 'Resume imported'}
                    </p>
                    <p className="text-xs text-emerald-600">Click to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-neutral-400" />
                    <p className="text-sm font-medium text-neutral-700">Upload your resume</p>
                    <p className="text-xs text-neutral-500">PDF or DOCX</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Preview */}
              {resumeData && (
                <div className="p-3 bg-neutral-50 rounded-lg text-sm">
                  <p className="font-medium text-neutral-900 mb-1">Preview</p>
                  <div className="text-xs text-neutral-600 space-y-0.5">
                    <p>• {resumeData.experience?.length || 0} experience entries</p>
                    <p>• {resumeData.education?.length || 0} education entries</p>
                    <p>• {resumeData.projects?.length || 0} projects</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('name')}
                  className="flex-1 h-10 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep('design')}
                  disabled={!resumeData}
                  className="flex-1 h-10 bg-neutral-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Customize design <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Design */}
          {step === 'design' && (
            <div className="flex flex-col h-full gap-4">
              <div className="flex-1 min-h-0 flex gap-4">
                {/* Editor Pane */}
                <div className="w-1/3 min-w-[320px] flex flex-col">
                  <ThemeEditor config={themeConfig} onChange={setThemeConfig} />
                </div>
                
                {/* Preview Pane */}
                <div className="flex-1 bg-neutral-100 rounded-lg overflow-auto border border-neutral-200">
                  <GeneratedDocxPreview resumeData={resumeData} renderOptions={designRenderOptions} />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                <button
                   onClick={() => setStep('resume')}
                   className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 flex items-center gap-2"
                >
                   <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 flex items-center gap-2"
                >
                  Create Group <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Creating */}
          {step === 'creating' && (
            <div className="py-20 text-center flex flex-col items-center justify-center h-full">
              <Loader2 className="w-10 h-10 text-neutral-900 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">Creating your resume group...</h3>
              <p className="text-sm text-neutral-500">Setting up your shared data and applying your theme.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default CreateGroupModal;
