import React, { useEffect, useState } from 'react';
import { LogOut, User, ChevronDown, Loader2, Menu, X } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { CreditsProvider } from './contexts/CreditsContext';
import LoginPage from './pages/LoginPage';
import SplashScreen from './components/SplashScreen';
import CreditsDisplay from './components/CreditsDisplay';
import FileBrowser from './components/FileBrowser';
import ResizableSplitPane from './components/ResizableSplitPane';
import ConfirmDialog from './components/ConfirmDialog';
import DocxResumeImport from './components/DocxResumeImport';
import DocxResumeEditor from './components/DocxResumeEditor';
import DocxActionButtons from './components/DocxActionButtons';
import LiveDocxPreview from './components/LiveDocxPreview';
import CreateGroupModal from './components/CreateGroupModal';
import { useDocxResume } from './hooks/useDocxResume';
import { createDocxResume } from './services/resumeService';
import { analyticsService } from './services/analyticsService';

/**
 * DocxApp — the new DOCX-native shell.
 *
 * Replaces the legacy template/theme-driven App. Responsibilities:
 *   1. Auth + splash + login gating.
 *   2. Left: FileBrowser of resume groups; clicking a resume loads its DOCX.
 *   3. Center: DocxResumeEditor bound to useDocxResume.
 *   4. Right: LiveDocxPreview rendering the current DOCX blob.
 *   5. Upload panel for importing new .docx into the selected group.
 *
 * Custom theme / template / layout / section-reorder UI is removed.
 */
function AppShell() {
  const { user, isAuthenticated, loading: authLoading, signOut } = useAuth();

  const [showSplash, setShowSplash] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [confirmNav, setConfirmNav] = useState(null);

  const docx = useDocxResume();

  // Splash timing
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Load resume when selection changes
  useEffect(() => {
    if (!selectedResumeId) return;
    if (docx.dirty) {
      // Defer load until user resolves unsaved changes.
      setConfirmNav({ kind: 'load', id: selectedResumeId });
      return;
    }
    docx.loadResume(selectedResumeId).catch((e) => {
      console.error('Failed to load resume', e);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResumeId]);

  const handleSelectResume = (resumeId, groupId) => {
    setSelectedGroupId(groupId);
    setSelectedResumeId(resumeId);
  };

  const handleImport = async (blob, fieldMap, baseName) => {
    if (!user?.uid) return;
    if (!selectedGroupId) {
      setImportError('Select or create a group on the left before importing.');
      return;
    }
    setImportBusy(true);
    setImportError('');
    try {
      const resumeId = await createDocxResume(user.uid, selectedGroupId, {
        name: baseName || 'Imported resume',
        blob,
        fieldMap,
        extractedText: fieldMap.extractedText || '',
      });
      setRefreshTrigger((n) => n + 1);
      docx.reset({ blob, fieldMap, resumeId, userId: user.uid });
      setSelectedResumeId(resumeId);
      analyticsService?.trackResumeImported?.(resumeId);
    } catch (e) {
      console.error(e);
      setImportError(e?.message || 'Import failed');
    } finally {
      setImportBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error('Sign out failed:', e);
    }
  };

  if (showSplash || authLoading) return <SplashScreen />;
  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="h-screen flex flex-col bg-neutral-100">
      {/* Top bar */}
      <header className="h-12 bg-white border-b border-neutral-200 flex items-center justify-between px-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="p-1.5 rounded hover:bg-neutral-100 md:hidden"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <span className="text-sm font-semibold text-neutral-900">Resume Updater</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">DOCX</span>
        </div>

        <div className="flex items-center gap-3">
          <DocxActionButtons blob={docx.blob} fileNameBase={selectedResumeId || 'Resume'} />
          <CreditsDisplay />
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((s) => !s)}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-100 text-sm"
            >
              <User className="w-4 h-4 text-neutral-600" />
              <span className="hidden sm:inline text-neutral-700">
                {user?.displayName || user?.email || 'User'}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-neutral-200 rounded shadow-lg py-1 z-50">
                <button
                  onClick={handleSignOut}
                  className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-200 bg-white border-r border-neutral-200 overflow-hidden flex flex-col`}
        >
          <div className="p-3 border-b border-neutral-200">
            <DocxResumeImport onImport={handleImport} disabled={importBusy || !selectedGroupId} />
            {!selectedGroupId && (
              <p className="text-[10px] text-neutral-500 mt-2">
                Pick a group below first.
              </p>
            )}
            {importError && (
              <p className="text-xs text-red-600 mt-2">{importError}</p>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <FileBrowser
              selectedGroupId={selectedGroupId}
              selectedResumeId={selectedResumeId}
              refreshTrigger={refreshTrigger}
              onSelectResume={(groupId, resumeId) => handleSelectResume(resumeId, groupId)}
              onCreateGroup={() => setShowCreateGroup(true)}
              onCreateResume={(groupId) => setSelectedGroupId(groupId)}
              onEditShared={() => {}}
              onAutoPopulate={() => {}}
              onEditDesign={() => {}}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {!selectedResumeId && !docx.blob ? (
            <div className="h-full flex items-center justify-center text-neutral-400">
              <div className="text-center max-w-sm">
                <p className="text-sm mb-2">Pick a resume from the left, or upload a .docx to start.</p>
                {!selectedGroupId && (
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="mt-3 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
                  >
                    Create a group
                  </button>
                )}
              </div>
            </div>
          ) : docx.loading && !docx.blob ? (
            <div className="h-full flex items-center justify-center text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <ResizableSplitPane
              defaultLeftWidth={40}
              leftLabel="Editor"
              rightLabel="Preview"
              left={
                <DocxResumeEditor
                  sections={docx.fieldMap.sections}
                  groupedFields={docx.groupedFields}
                  onCommit={docx.updateField}
                  onSave={docx.save}
                  onUndo={docx.undo}
                  onRedo={docx.redo}
                  canUndo={docx.canUndo}
                  canRedo={docx.canRedo}
                  dirty={docx.dirty}
                  loading={docx.loading}
                />
              }
              right={<LiveDocxPreview blob={docx.blob} />}
            />
          )}
        </main>
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          isOpen={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onComplete={(newGroupId) => {
            setShowCreateGroup(false);
            if (newGroupId) setSelectedGroupId(newGroupId);
            setRefreshTrigger((n) => n + 1);
          }}
        />
      )}

      {confirmNav && (
        <ConfirmDialog
          isOpen={true}
          title="Unsaved changes"
          message="You have unsaved edits to the current resume. Discard and load the new one?"
          confirmText="Discard & load"
          danger={true}
          onConfirm={() => {
            const id = confirmNav.id;
            setConfirmNav(null);
            docx.loadResume(id).catch((e) => console.error(e));
          }}
          onCancel={() => setConfirmNav(null)}
        />
      )}
    </div>
  );
}

export default function DocxApp() {
  return (
    <CreditsProvider>
      <AppShell />
    </CreditsProvider>
  );
}
