import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, Sparkles, FileText, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditsContext';
import { createResume, getResumesInGroup, getResume, buildFullResume } from '../services/resumeService';
import { geminiService } from '../services/geminiService';
import { analyticsService } from '../services/analyticsService';
import { PREDEFINED_ROLES } from '../config/predefinedRoles';

const AutoPopulateModal = ({ isOpen, onClose, group, onComplete }) => {
  const { user } = useAuth();
  const { credits } = useCredits();
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [step, setStep] = useState('source'); // 'source' | 'select' | 'generating'
  const [error, setError] = useState('');
  
  // Source resume selection
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [sourceResumeData, setSourceResumeData] = useState(null);
  
  // Search states
  const [resumeSearch, setResumeSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  
  // Progress tracking
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 0,
    items: [],
  });

  // Load resumes when modal opens
  useEffect(() => {
    if (isOpen && group && user?.uid) {
      loadResumes();
    }
  }, [isOpen, group, user?.uid]);

  const loadResumes = async () => {
    setLoadingResumes(true);
    try {
      const loadedResumes = await getResumesInGroup(group.id, user.uid);
      setResumes(loadedResumes);
      if (loadedResumes.length > 0) {
        setSelectedSourceId(loadedResumes[0].id);
      }
    } catch (err) {
      console.error('Failed to load resumes:', err);
      setError('Failed to load resumes');
    } finally {
      setLoadingResumes(false);
    }
  };

  // Filter resumes based on search
  const filteredResumes = resumes.filter(resume => 
    resume.name.toLowerCase().includes(resumeSearch.toLowerCase())
  );

  // Filter roles based on search
  const filteredRoles = PREDEFINED_ROLES.filter(role =>
    role.title.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const handleContinueToRoles = async () => {
    if (!selectedSourceId) {
      setError('Please select a source resume');
      return;
    }

    setLoadingResumes(true);
    setError('');
    try {
      const resume = await getResume(selectedSourceId);
      const fullResumeData = buildFullResume(group, resume);
      setSourceResumeData(fullResumeData);
      setStep('select');
    } catch (err) {
      console.error('Failed to load resume data:', err);
      setError('Failed to load resume data');
    } finally {
      setLoadingResumes(false);
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleGenerate = async () => {
    if (selectedRoles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    if (!sourceResumeData) {
      setError('No source resume selected');
      return;
    }

    if (credits < selectedRoles.length) {
      setError(`Insufficient credits. Need ${selectedRoles.length} credits.`);
      analyticsService.trackLowCreditsWarning(credits);
      return;
    }

    // Track auto-populate start
    analyticsService.trackAIOptimizeStart(selectedRoles, 'auto_populate');

    const itemsToGenerate = selectedRoles.map(roleId => {
      const role = PREDEFINED_ROLES.find(r => r.id === roleId);
      return { id: roleId, title: role.title, status: 'pending', prompt: role.prompt };
    });

    setStep('generating');
    setGenerationProgress({
      current: 0,
      total: itemsToGenerate.length,
      items: itemsToGenerate,
    });

    try {
      for (let i = 0; i < itemsToGenerate.length; i++) {
        const item = itemsToGenerate[i];
        
        setGenerationProgress(prev => ({
          ...prev,
          current: i,
          items: prev.items.map(it => 
            it.id === item.id ? { ...it, status: 'generating' } : it
          ),
        }));

        try {
          const transformedResume = await geminiService.transformResumeForRole(sourceResumeData, item.prompt);
          
          await createResume(user.uid, group.id, {
            name: item.title,
            summary: transformedResume.summary || sourceResumeData.summary || '',
            experience: (transformedResume.experience || sourceResumeData.experience || []).map(exp => ({
              highlights: exp.highlights || [],
              environment: exp.environment || '',
            })),
            skills: transformedResume.skills || sourceResumeData.skills || {},
            projects: transformedResume.projects || sourceResumeData.projects || [],
            certifications: transformedResume.certifications || sourceResumeData.certifications || [],
            internships: transformedResume.internships || sourceResumeData.internships || [],
            hackathons: transformedResume.hackathons || sourceResumeData.hackathons || [],
          });

          setGenerationProgress(prev => ({
            ...prev,
            current: i + 1,
            items: prev.items.map(it => 
              it.id === item.id ? { ...it, status: 'complete' } : it
            ),
          }));
        } catch (itemError) {
          console.error(`Failed to generate ${item.title}:`, itemError);
          setGenerationProgress(prev => ({
            ...prev,
            items: prev.items.map(it => 
              it.id === item.id ? { ...it, status: 'error' } : it
            ),
          }));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      // Track auto-populate completion
      analyticsService.trackAIOptimizeSuccess(0, 0, 'auto_populate');
      analyticsService.trackCreditsUsed('auto_populate', selectedRoles.length);
      onComplete();
      handleClose();
    } catch (err) {
      console.error('Failed to generate resumes:', err);
      setError('Failed to generate resumes. Please try again.');
      analyticsService.trackAIOptimizeError(err.message, 'auto_populate');
      setStep('select');
    }
  };

  const handleClose = () => {
    setStep('source');
    setSelectedRoles([]);
    setSelectedSourceId(null);
    setSourceResumeData(null);
    setResumeSearch('');
    setRoleSearch('');
    setError('');
    setGenerationProgress({ current: 0, total: 0, items: [] });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-neutral-900">Auto-Populate Resumes</h2>
          </div>
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

          {/* Step 1: Select Source Resume */}
          {step === 'source' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-900 mb-1">Select Source Resume</p>
                <p className="text-xs text-neutral-500">
                  Choose which resume to use as the base for generating role-specific versions.
                </p>
              </div>

              {/* Search Resumes */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={resumeSearch}
                  onChange={(e) => setResumeSearch(e.target.value)}
                  placeholder="Search resumes..."
                  className="w-full h-9 pl-9 pr-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>

              {loadingResumes ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 text-neutral-400 animate-spin mx-auto" />
                </div>
              ) : filteredResumes.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                  {resumeSearch ? 'No matching resumes' : 'No resumes in this group'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {filteredResumes.map((resume) => (
                    <button
                      key={resume.id}
                      onClick={() => setSelectedSourceId(resume.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                        selectedSourceId === resume.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <FileText className="w-5 h-5 text-neutral-400" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-neutral-900">{resume.name}</span>
                        {resume.matchScore && (
                          <span className="ml-2 text-xs text-neutral-500">{resume.matchScore}% match</span>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedSourceId === resume.id
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-neutral-300'
                      }`}>
                        {selectedSourceId === resume.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 h-10 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContinueToRoles}
                  disabled={!selectedSourceId || loadingResumes}
                  className="flex-1 h-10 bg-neutral-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingResumes && <Loader2 className="w-4 h-4 animate-spin" />}
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Roles */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-neutral-900 mb-1">Select Target Roles</p>
                <p className="text-xs text-neutral-500">
                  Using <span className="font-medium">{resumes.find(r => r.id === selectedSourceId)?.name}</span> as source
                </p>
              </div>

              {/* Search Roles */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Search roles..."
                  className="w-full h-9 pl-9 pr-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
                />
              </div>

              {/* Role Cards */}
              {filteredRoles.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                  No matching roles
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {filteredRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => toggleRole(role.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                        selectedRoles.includes(role.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-xl">{role.icon}</span>
                      <span className="flex-1 text-sm font-medium text-neutral-900">{role.title}</span>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedRoles.includes(role.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-neutral-300'
                      }`}>
                        {selectedRoles.includes(role.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Credit Cost */}
              {selectedRoles.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">{selectedRoles.length} role{selectedRoles.length > 1 ? 's' : ''}</span> selected • 
                    <span className="font-medium"> {selectedRoles.length} credit{selectedRoles.length > 1 ? 's' : ''}</span> will be used
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">You have {credits} credits available</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('source'); setRoleSearch(''); }}
                  className="flex-1 h-10 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={selectedRoles.length === 0}
                  className="flex-1 h-10 bg-neutral-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Generate {selectedRoles.length} Resume{selectedRoles.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Generating Progress */}
          {step === 'generating' && (
            <div className="py-4">
              <div className="text-center mb-6">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-neutral-900">Generating Resumes</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {generationProgress.current} of {generationProgress.total} complete
                </p>
              </div>

              <div className="space-y-2">
                {generationProgress.items.map((item) => (
                  <div 
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      item.status === 'complete' ? 'bg-emerald-50' :
                      item.status === 'generating' ? 'bg-blue-50' :
                      item.status === 'error' ? 'bg-red-50' :
                      'bg-neutral-50'
                    }`}
                  >
                    {item.status === 'complete' && (
                      <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {item.status === 'generating' && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    {item.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-neutral-300" />
                    )}
                    {item.status === 'error' && (
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className={`flex-1 text-sm ${
                      item.status === 'complete' ? 'text-emerald-700' :
                      item.status === 'generating' ? 'text-blue-700 font-medium' :
                      item.status === 'error' ? 'text-red-700' :
                      'text-neutral-500'
                    }`}>
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutoPopulateModal;
