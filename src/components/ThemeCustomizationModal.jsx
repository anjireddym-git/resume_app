import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, ArrowLeft, RotateCcw } from 'lucide-react';
import { PDFViewer } from '@react-pdf/renderer';
import ThemeEditor from './ThemeEditor';
import UnifiedPDF from '../templates/UnifiedPDF';
import { updateGroupTheme, getResumeGroup } from '../services/resumeService';
import { DEFAULT_THEME_CONFIG } from '../config/themeConfig';

const ThemeCustomizationModal = ({ isOpen, onClose, group, resumeData, onUpdate }) => {
  const [themeConfig, setThemeConfig] = useState(DEFAULT_THEME_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize theme from group data or passed group
  useEffect(() => {
    if (isOpen && group) {
      // If group is passed, use its theme if available
      if (group.themeConfig) {
        setThemeConfig(group.themeConfig);
      } else {
        // Fallback or fetch if needed (but ideally group object is complete)
        setThemeConfig(DEFAULT_THEME_CONFIG);
      }
    }
  }, [isOpen, group]);

  const handleSave = async () => {
    if (!group?.id) return;
    
    setIsSaving(true);
    try {
      await updateGroupTheme(group.id, themeConfig);
      
      if (onUpdate) onUpdate(); // Signal refresh
      onClose();
    } catch (error) {
      console.error('Failed to save theme:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to the default theme?')) {
      setThemeConfig(DEFAULT_THEME_CONFIG);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col transition-all duration-300">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button 
              onClick={onClose}
              className="p-2 -ml-2 text-neutral-400 hover:text-neutral-600 rounded-lg"
            >
               <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-neutral-900">
              Customize Group Design
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleReset}
              className="px-3 py-2 text-neutral-500 hover:bg-neutral-100 rounded-lg text-sm font-medium flex items-center gap-2"
              title="Reset to Defaults"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4 flex gap-4">
          {/* Editor Pane */}
          <div className="w-1/3 min-w-[320px] flex flex-col overflow-y-auto">
            <ThemeEditor config={themeConfig} onChange={setThemeConfig} />
          </div>
          
          {/* Preview Pane */}
          <div className="flex-1 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200">
            {resumeData ? (
              <PDFViewer width="100%" height="100%" className="border-0">
                <UnifiedPDF 
                  resumeData={resumeData}
                  themeConfig={themeConfig} 
                />
              </PDFViewer>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizationModal;
