import React, { useState, useEffect } from 'react';
import { X, Loader2, FileText, Copy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getResumesInGroup, getResume, createResume } from '../services/resumeService';

const CreateResumeModal = ({ isOpen, onClose, onComplete, groupId }) => {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [resumeName, setResumeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [error, setError] = useState('');

  // Load existing resumes in this group
  useEffect(() => {
    const loadResumes = async () => {
      if (!groupId || !user?.uid) return;
      
      setLoadingResumes(true);
      try {
        const loaded = await getResumesInGroup(groupId, user.uid);
        setResumes(loaded);
        
        // Auto-select first resume
        if (loaded.length > 0) {
          setSelectedResumeId(loaded[0].id);
          setResumeName(`${loaded[0].name} - Copy`);
        }
      } catch (err) {
        console.error('Failed to load resumes:', err);
        setError('Failed to load resumes');
      } finally {
        setLoadingResumes(false);
      }
    };

    if (isOpen) {
      loadResumes();
    }
  }, [groupId, isOpen, user?.uid]);

  const handleCreate = async () => {
    if (!selectedResumeId || !resumeName.trim()) return;

    setIsLoading(true);
    setError('');
    try {
      // Get the source resume
      const sourceResume = await getResume(selectedResumeId);
      
      // Create new resume copying the custom data
      const newResumeId = await createResume(user.uid, groupId, {
        name: resumeName,
        summary: sourceResume.customData?.summary || '',
        experience: sourceResume.customData?.experience || [],
        skills: sourceResume.customData?.skills || {},
        projects: sourceResume.customData?.projects || [],
        certifications: sourceResume.customData?.certifications || [],
      });
      
      onComplete(newResumeId);
      handleClose();
    } catch (err) {
      console.error('Failed to create resume:', err);
      setError('Failed to create resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedResumeId(null);
    setResumeName('');
    setError('');
    onClose();
  };

  const handleSelectResume = (resume) => {
    setSelectedResumeId(resume.id);
    setResumeName(`${resume.name} - Copy`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900">New Resume</h2>
            <p className="text-sm text-neutral-500">Clone from existing resume</p>
          </div>
          <button onClick={handleClose} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Resume Name */}
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-1.5">
              Resume Name
            </label>
            <input
              type="text"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              placeholder="e.g., Google SWE Application"
              className="w-full h-10 px-3 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
          </div>

          {/* Select Source Resume */}
          <div>
            <label className="text-sm font-medium text-neutral-700 block mb-2">
              Clone from
            </label>
            
            {loadingResumes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
              </div>
            ) : resumes.length === 0 ? (
              <p className="text-sm text-neutral-500 py-4 text-center">No resumes in this group</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {resumes.map((resume) => (
                  <button
                    key={resume.id}
                    onClick={() => handleSelectResume(resume)}
                    className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                      selectedResumeId === resume.id
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <FileText className="w-5 h-5 text-neutral-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{resume.name}</p>
                      <p className="text-xs text-neutral-500">v{resume.version}</p>
                    </div>
                    {resume.matchScore && (
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        resume.matchScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                        resume.matchScore >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {resume.matchScore}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 h-10 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading || !selectedResumeId || !resumeName.trim()}
            className="flex-1 h-10 bg-neutral-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Clone
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateResumeModal;
