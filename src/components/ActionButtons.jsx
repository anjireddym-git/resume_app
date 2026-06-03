import React, { useState, useCallback } from 'react';
import { FileText, RotateCcw, Loader2, ExternalLink } from 'lucide-react';
import { exportToDOCX } from '../services/exportService';
import { getOpenInDocsUrl } from '../services/googleDriveService';
import { analyticsService } from '../services/analyticsService';

const ActionButtons = ({
  resumeData,
  onReset,
  hasChanges,
  renderOptions,
  currentResume,
}) => {
  const [isExportingDOCX, setIsExportingDOCX] = useState(false);

  const getFileName = useCallback(() => {
    const rawName = resumeData?.personalInfo?.name;
    if (!rawName || !rawName.trim()) return 'Resume.docx';
    const cleanName = rawName
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    return cleanName ? `${cleanName}_Resume.docx` : 'Resume.docx';
  }, [resumeData?.personalInfo?.name]);

  const handleExportDOCX = async () => {
    if (!resumeData) {
      alert('Resume data not found');
      return;
    }
    setIsExportingDOCX(true);
    try {
      await exportToDOCX(resumeData, getFileName(), renderOptions);
      analyticsService.trackExportDOCX(resumeData?.id);
    } catch (error) {
      console.error('DOCX export failed:', error);
      alert('Failed to export DOCX. Please try again.');
      analyticsService.trackAPIError('export/docx', 'GENERATION_FAILED', error.message);
    } finally {
      setIsExportingDOCX(false);
    }
  };

  const driveFileId = currentResume?.driveFileId;

  return (
    <div className="flex items-center gap-2">
      {driveFileId && (
        <a
          href={getOpenInDocsUrl(driveFileId)}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 px-3 text-neutral-700 hover:bg-neutral-100 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all border border-neutral-200"
          title="Open in Google Docs"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden md:inline">Open in Docs</span>
        </a>
      )}

      <button
        onClick={handleExportDOCX}
        disabled={isExportingDOCX || !resumeData}
        className="h-9 px-3 md:px-4 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2 transition-all"
        title="Download DOCX"
      >
        {isExportingDOCX ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{isExportingDOCX ? 'Exporting...' : 'Export DOCX'}</span>
      </button>

      {hasChanges && (
        <button
          onClick={onReset}
          className="h-9 px-3 text-neutral-500 hover:bg-neutral-100 rounded-lg text-sm flex items-center gap-1.5 transition-all"
          title="Reset changes"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden md:inline">Reset</span>
        </button>
      )}
    </div>
  );
};

export default ActionButtons;
