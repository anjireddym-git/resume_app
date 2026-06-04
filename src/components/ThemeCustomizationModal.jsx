import React, { useMemo, useState, useEffect } from 'react';
import { AlertCircle, Check, Cloud, ExternalLink, FileText, Loader2, ArrowLeft, RotateCcw } from 'lucide-react';
import ThemeEditor from './ThemeEditor';
import GeneratedDocxPreview from './GeneratedDocxPreview';
import { updateGroupTheme } from '../services/resumeService';
import { getOpenInDocsUrl } from '../services/googleDriveService';
import { analyticsService } from '../services/analyticsService';
import { DEFAULT_THEME_CONFIG } from '../config/themeConfig';
import { buildDocxRenderOptions } from '../services/docxRenderOptions';

const ThemeCustomizationModal = ({
  isOpen,
  onClose,
  group,
  resumeData,
  driveFileId,
  onUpdate,
  onSyncNow,
  isSyncing = false,
  syncError = '',
}) => {
  const [themeConfig, setThemeConfig] = useState(DEFAULT_THEME_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && group) {
      const nextConfig = group.themeConfig || DEFAULT_THEME_CONFIG;
      setThemeConfig(nextConfig);
    }
  }, [isOpen, group]);

  const handleSave = async () => {
    if (!group?.id) return;
    setIsSaving(true);
    try {
      await updateGroupTheme(group.id, themeConfig);
      analyticsService.trackThemeChange(themeConfig.preset || 'custom');
      if (themeConfig.colors?.primary) analyticsService.trackColorChange('primary', themeConfig.colors.primary);
      if (themeConfig.fonts?.heading) analyticsService.trackFontChange('heading', themeConfig.fonts.heading);
      if (onUpdate) await onUpdate(themeConfig);
      onClose();
    } catch (error) {
      console.error('Failed to save theme:', error);
      analyticsService.trackSaveError(group?.id, error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderOptions = useMemo(() => buildDocxRenderOptions({
    group,
    resumeData,
    themeConfig,
  }), [
    group?.sectionOrder,
    group?.visibleSections,
    group?.customSectionDefs,
    themeConfig,
    resumeData?.themeConfig,
    resumeData?.sectionOrder,
    resumeData?.visibleSections,
    resumeData?.sectionFormats,
    resumeData?.customSectionDefs,
  ]);

  const handleSyncNow = () => {
    if (!onSyncNow) return undefined;
    return onSyncNow(themeConfig);
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
            <button onClick={onClose} className="p-2 -ml-2 text-neutral-400 hover:text-neutral-600 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-neutral-900">Customize Group Design</h2>
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
        <div className="flex-1 overflow-hidden p-4 flex gap-4 min-h-0">
          {/* Editor Pane */}
          <div className="w-1/3 min-w-[320px] flex flex-col overflow-y-auto">
            <ThemeEditor config={themeConfig} onChange={setThemeConfig} />
          </div>

          {/* Generated DOCX Preview Pane */}
          <div className="relative flex-1 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 flex flex-col">
            <div className="h-11 px-3 border-b border-neutral-200 bg-white/95 flex items-center justify-between">
              <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>DOCX Preview</span>
              </div>
              <div className="flex items-center gap-1.5">
                {driveFileId && (
                  <a
                    href={getOpenInDocsUrl(driveFileId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 px-2 text-xs text-neutral-600 hover:bg-neutral-100 rounded border border-neutral-200 inline-flex items-center gap-1.5"
                    title="Open Google Docs copy"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Open in Docs</span>
                  </a>
                )}
                {onSyncNow && (
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing || !resumeData}
                    className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50 rounded border border-blue-100 inline-flex items-center gap-1.5 disabled:opacity-50"
                    title={driveFileId ? 'Update Google Docs copy' : 'Sync to Google Drive'}
                  >
                    {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                    <span>{driveFileId ? 'Update Drive' : 'Sync Drive'}</span>
                  </button>
                )}
              </div>
            </div>
            {resumeData ? (
              <>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <GeneratedDocxPreview resumeData={resumeData} renderOptions={renderOptions} />
                </div>
                {isSyncing && (
                  <div className="absolute top-14 right-3 z-20 rounded-md bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm border border-neutral-200 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Syncing Drive copy
                  </div>
                )}
                {syncError && (
                  <div className="absolute bottom-3 left-3 right-3 z-20 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">{syncError}</span>
                    {onSyncNow && (
                      <button
                        type="button"
                        onClick={handleSyncNow}
                        disabled={isSyncing}
                        className="rounded border border-red-200 bg-white px-2 py-1 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </>
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
