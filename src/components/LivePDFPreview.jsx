import React, { useMemo } from 'react';
import { BlobProvider } from '@react-pdf/renderer';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import UnifiedPDF from '../templates/UnifiedPDF';

const LivePDFPreview = ({ resumeData, themeConfig, sectionOrder }) => {
  // Create a stable key from themeConfig to force re-render when it changes
  const themeKey = useMemo(() => JSON.stringify(themeConfig || {}), [themeConfig]);
  
  // Memoize the PDF document to prevent unnecessary re-renders
  const pdfDocument = useMemo(() => {
    if (!resumeData?.personalInfo) return null;
    return (
      <UnifiedPDF 
        resumeData={resumeData} 
        themeConfig={themeConfig}
        sectionOrder={sectionOrder}
        sectionFormats={resumeData.sectionFormats}
      />
    );
  }, [resumeData, themeKey, sectionOrder]);

  if (!resumeData?.personalInfo) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-700 rounded-lg">
        <div className="text-center text-neutral-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No resume data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-neutral-700 rounded-lg overflow-hidden">
      <BlobProvider key={themeKey} document={pdfDocument}>
        {({ blob, url, loading, error }) => {
          if (error) {
            return (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-red-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Error generating PDF</p>
                  <p className="text-xs text-neutral-500 mt-1">{error.message}</p>
                </div>
              </div>
            );
          }

          if (loading) {
            return (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-neutral-400">Generating PDF...</p>
                </div>
              </div>
            );
          }

          if (url) {
            // Add cache buster to prevent stale PDF display
            const cacheBustedUrl = `${url}#t=${Date.now()}`;
            return (
              <iframe
                key={url}
                src={cacheBustedUrl}
                title="PDF Preview"
                className="flex-1 w-full border-0"
                style={{ backgroundColor: '#525659', minHeight: '100%' }}
              />
            );
          }

          return (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-neutral-500">Ready to generate</p>
            </div>
          );
        }}
      </BlobProvider>
    </div>
  );
};

export default LivePDFPreview;
