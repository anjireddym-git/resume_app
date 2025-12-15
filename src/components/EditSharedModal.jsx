import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users } from 'lucide-react';
import AddExperienceFlow from './AddExperienceFlow';
import MonthYearPicker from './editing/MonthYearPicker';

const EditSharedModal = ({ isOpen, onClose, group, onSave }) => {
  const [view, setView] = useState('edit'); // 'edit' | 'add-experience'
  const [sharedData, setSharedData] = useState({
    personalInfo: {},
    experience: [],
    education: []
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset view when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setView('edit');
    }
  }, [isOpen]);

  // Initialize from group data when opened
  useEffect(() => {
    if (isOpen && group?.sharedData) {
      setSharedData({
        personalInfo: group.sharedData.personalInfo || {},
        experience: group.sharedData.experience || [],
        education: group.sharedData.education || []
      });
    }
  }, [isOpen, group]);

  if (!isOpen) return null;

  if (view === 'add-experience') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col h-[600px]">
          <AddExperienceFlow 
            groupId={group.id} 
            onCancel={() => setView('edit')}
            onComplete={() => {
              setView('edit');
              // Optionally refresh data - but usually parent handles refresh or we might need to reload group data here
              // For now, closing the add flow goes back to edit. 
              //Ideally we reload the sharedData here.
              // We'll rely on the parent (FileBrowser) to refresh if needed, usually onSave triggers updates.
              // But here we did a backend update directly. 
              // We can just close the whole modal or reload.
              onClose(); 
            }}
          />
        </div>
      </div>
    );
  }

  const updatePersonalInfo = (field, value) => {
    setSharedData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

  const addExperience = () => {
    // OLD behavior: setSharedData...
    // NEW behavior: switch view
    setView('add-experience');
  };

  const updateExperience = (index, field, value) => {
    setSharedData(prev => ({
      ...prev,
      experience: prev.experience.map((exp, i) => 
        i === index ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExperience = (index) => {
    setSharedData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    setSharedData(prev => ({
      ...prev,
      education: [...prev.education, {
        degree: '',
        field: '',
        institution: '',
        location: '',
        graduationDate: '',
        gpa: ''
      }]
    }));
  };

  const updateEducation = (index, field, value) => {
    setSharedData(prev => ({
      ...prev,
      education: prev.education.map((edu, i) => 
        i === index ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const removeEducation = (index) => {
    setSharedData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(group.id, sharedData);
      onClose();
    } catch (error) {
      console.error('Failed to save shared data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-neutral-600" />
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900">Edit Shared Data</h2>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <p className="text-sm text-neutral-500 bg-neutral-50 p-3 rounded-lg">
            Changes here will reflect across all resumes in "{group?.name}"
          </p>

          {/* Personal Info */}
          <section>
            <h3 className="text-sm font-medium text-neutral-900 mb-3">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={sharedData.personalInfo.name || ''}
                  onChange={(e) => updatePersonalInfo('name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Email</label>
                <input
                  type="email"
                  value={sharedData.personalInfo.email || ''}
                  onChange={(e) => updatePersonalInfo('email', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Phone</label>
                <input
                  type="text"
                  value={sharedData.personalInfo.phone || ''}
                  onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Location</label>
                <input
                  type="text"
                  value={sharedData.personalInfo.location || ''}
                  onChange={(e) => updatePersonalInfo('location', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  placeholder="City, Country"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">LinkedIn</label>
                <input
                  type="text"
                  value={sharedData.personalInfo.linkedin || ''}
                  onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  placeholder="linkedin.com/in/johndoe"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">GitHub</label>
                <input
                  type="text"
                  value={sharedData.personalInfo.github || ''}
                  onChange={(e) => updatePersonalInfo('github', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  placeholder="github.com/johndoe"
                />
              </div>
            </div>
          </section>

          {/* Experience */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-neutral-900">Experience</h3>
              <button
                onClick={addExperience}
                className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              Position and highlights are customized per resume
            </p>
            <div className="space-y-3">
              {sharedData.experience.map((exp, idx) => (
                <div key={idx} className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-neutral-600">Experience {idx + 1}</span>
                    <button
                      onClick={() => removeExperience(idx)}
                      className="p-1 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Company</label>
                      <input
                        type="text"
                        value={exp.company || ''}
                        onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        placeholder="Company Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Location</label>
                      <input
                        type="text"
                        value={exp.location || ''}
                        onChange={(e) => updateExperience(idx, 'location', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        placeholder="City, Country"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Start Date</label>
                      <MonthYearPicker
                        value={exp.startDate || ''}
                        onChange={(v) => updateExperience(idx, 'startDate', v)}
                        placeholder="Select start"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">End Date</label>
                      <MonthYearPicker
                        value={exp.endDate || ''}
                        onChange={(v) => updateExperience(idx, 'endDate', v)}
                        placeholder="Select end"
                        showPresent={true}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {sharedData.experience.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">No experience entries yet</p>
              )}
            </div>
          </section>

          {/* Education */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-neutral-900">Education</h3>
              <button
                onClick={addEducation}
                className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <div className="space-y-3">
              {sharedData.education.map((edu, idx) => (
                <div key={idx} className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-neutral-600">Education {idx + 1}</span>
                    <button
                      onClick={() => removeEducation(idx)}
                      className="p-1 text-neutral-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Degree</label>
                      <input
                        type="text"
                        value={edu.degree || ''}
                        onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        placeholder="Bachelor of Technology"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Field</label>
                      <input
                        type="text"
                        value={edu.field || ''}
                        onChange={(e) => updateEducation(idx, 'field', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        placeholder="Computer Science"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-neutral-500 mb-1">Institution</label>
                      <input
                        type="text"
                        value={edu.institution || ''}
                        onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        placeholder="University Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Graduation Date</label>
                      <MonthYearPicker
                        value={edu.graduationDate || ''}
                        onChange={(v) => updateEducation(idx, 'graduationDate', v)}
                        placeholder="Select date"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">GPA</label>
                      <input
                        type="text"
                        value={edu.gpa || ''}
                        onChange={(e) => updateEducation(idx, 'gpa', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                        placeholder="3.8"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {sharedData.education.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">No education entries yet</p>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-neutral-200 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSharedModal;
