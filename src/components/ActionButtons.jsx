import React, { useState, useMemo, useCallback } from 'react';
import { Download, FileText, RotateCcw, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import UnifiedPDF from '../templates/UnifiedPDF';
import { exportToDOCX } from '../services/exportService';
import { analyticsService } from '../services/analyticsService';
import { saveAs } from 'file-saver';

const ActionButtons = ({ resumeRef, resumeData, themeConfig, sectionOrder, onReset, hasChanges }) => {
  const [isExportingDOCX, setIsExportingDOCX] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Generate filename from resume data
  const getFileName = useCallback((extension = 'pdf') => {
    const rawName = resumeData?.personalInfo?.name;
    if (!rawName || !rawName.trim()) {
      return `Resume.${extension}`;
    }
    const cleanName = rawName
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '_')
      .trim();
    return cleanName ? `${cleanName}_Resume.${extension}` : `Resume.${extension}`;
  }, [resumeData?.personalInfo?.name]);

  const handleDownloadPDF = useCallback(async () => {
    if (!resumeData) return;
    
    setIsExportingPDF(true);
    try {
      const fileName = getFileName('pdf');
      
      // Generate PDF blob using pdf() function
      const pdfDocument = (
        <UnifiedPDF 
          resumeData={resumeData} 
          themeConfig={themeConfig}
          sectionOrder={sectionOrder}
          sectionFormats={resumeData.sectionFormats}
        />
      );
      
      const blob = await pdf(pdfDocument).toBlob();
      
      // Use file-saver for reliable cross-browser downloads with correct filename
      saveAs(blob, fileName);
      
      // Track PDF export
      analyticsService.trackExportPDF(resumeData?.id, 'unified');
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
      analyticsService.trackAPIError('export/pdf', 'GENERATION_FAILED', err.message);
    } finally {
      setIsExportingPDF(false);
    }
  }, [resumeData, themeConfig, sectionOrder, getFileName]);

  const handleExportDOCX = async () => {
    if (!resumeData) {
      alert('Resume data not found');
      return;
    }
    setIsExportingDOCX(true);
    try {
      const fileName = getFileName('docx');
      await exportToDOCX(resumeData, fileName);
      // Track DOCX export
      analyticsService.trackExportDOCX(resumeData?.id);
    } catch (error) {
      console.error('DOCX export failed:', error);
      alert('Failed to export DOCX. Please try again.');
      analyticsService.trackAPIError('export/docx', 'GENERATION_FAILED', error.message);
    } finally {
      setIsExportingDOCX(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownloadPDF}
        disabled={isExportingPDF || !resumeData}
        className="h-9 px-3 md:px-4 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2 transition-all"
        title="Download PDF"
      >
        {isExportingPDF ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{isExportingPDF ? 'Generating...' : 'PDF'}</span>
      </button>
      <button
        onClick={handleExportDOCX}
        disabled={isExportingDOCX || !resumeData}
        className="h-9 px-3 md:px-4 bg-white border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 flex items-center gap-2 transition-all"
        title="Export DOCX"
      >
        {isExportingDOCX ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{isExportingDOCX ? 'Exporting...' : 'DOCX'}</span>
        <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">BETA</span>
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
