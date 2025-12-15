import React, { useState } from 'react';
import { Plus, Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { updateAllResumesWithExperience } from '../services/ResumeUpdateService';

import { useAuth } from '../contexts/AuthContext';
import MonthYearPicker from './editing/MonthYearPicker';

const AddExperienceFlow = ({ groupId, onCancel, onComplete }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('form'); // 'form' | 'processing' | 'complete'
  const [formData, setFormData] = useState({
    role: '',
    company: '',
    location: '',
    startDate: '',
    endDate: 'Present',
    highlights: ['']
  });
  
  const [progress, setProgress] = useState({
    status: 'idle', // idle, updating_group, fetching_resumes, processing, complete, error
    message: '',
    progress: 0
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateHighlight = (index, value) => {
    const newHighlights = [...formData.highlights];
    newHighlights[index] = value;
    setFormData(prev => ({ ...prev, highlights: newHighlights }));
  };

  const addHighlight = () => {
    setFormData(prev => ({ ...prev, highlights: [...prev.highlights, ''] }));
  };

  const removeHighlight = (index) => {
    setFormData(prev => ({ 
      ...prev, 
      highlights: prev.highlights.filter((_, i) => i !== index) 
    }));
  };

  const handleSubmit = async () => {
    if (!formData.role || !formData.company) return;
    
    setStep('processing');
    
    try {
      await updateAllResumesWithExperience(groupId, user.uid, formData, (progressUpdate) => {
        setProgress(progressUpdate);
      });
      setStep('complete');
    } catch (error) {
      // Error is handled in service and sets progress.status to error
      console.error(error);
    }
  };

  if (step === 'form') {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-900">Add New Experience</h3>
          <p className="text-sm text-neutral-500">This will add the experience to ALL resumes in this group.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800 mb-4">
             <strong>AI-Powered Update:</strong> The "Role" and "Highlights" you enter below will be automatically adapted to match the specific focus of each individual resume (e.g., Backend vs Frontend).
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Role / Job Title (Base)</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => updateField('role', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                placeholder="e.g. Senior Software Engineer"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                placeholder="Company Name"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => updateField('location', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                placeholder="City, Country"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Start Date</label>
              <MonthYearPicker
                value={formData.startDate}
                onChange={(v) => updateField('startDate', v)}
                placeholder="Select start"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">End Date</label>
              <MonthYearPicker
                value={formData.endDate}
                onChange={(v) => updateField('endDate', v)}
                placeholder="Select end"
                showPresent={true}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-neutral-500">Base Highlights</label>
              <button onClick={addHighlight} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Highlight
              </button>
            </div>
            <div className="space-y-2">
              {formData.highlights.map((highlight, idx) => (
                <div key={idx} className="flex gap-2">
                  <textarea
                    value={highlight}
                    onChange={(e) => updateHighlight(idx, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 min-h-[60px]"
                    placeholder="Describe a key achievement or responsibility..."
                  />
                  {formData.highlights.length > 1 && (
                    <button onClick={() => removeHighlight(idx)} className="text-neutral-400 hover:text-red-500 self-start mt-2">
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900">
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!formData.role || !formData.company}
            className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
          >
            Start Individual Updates <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Processing View
  return (
    <div className="flex flex-col h-full bg-neutral-50">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        {step === 'processing' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Updating Resumes...</h3>
            <p className="text-neutral-500 mb-8 max-w-sm">
              Please do not close this window. We are using AI to tailor this experience for each resume in the group.
            </p>
          </>
        )}

        {step === 'complete' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Success!</h3>
            <p className="text-neutral-500 mb-8 max-w-sm">
              The experience has been added to the group and customized for all resumes.
            </p>
          </>
        )}

        {/* Progress Bar */}
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-neutral-700">Progress</span>
            <span className="text-neutral-500">{progress.progress}%</span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-2 mb-4">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${step === 'complete' ? 'bg-green-500' : 'bg-blue-600'}`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            {step === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
            {progress.message}
          </div>
        </div>

        {progress.status === 'error' && (
           <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
             <AlertTriangle className="w-5 h-5" />
             <div className="text-sm">{progress.message}</div>
           </div>
        )}

        {step === 'complete' && (
            <button 
                onClick={onComplete}
                className="mt-8 px-6 py-2 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800"
            >
                Done
            </button>
        )}
      </div>
    </div>
  );
};

export default AddExperienceFlow;
