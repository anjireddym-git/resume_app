import React, { useState, useEffect } from 'react';
import { History, RotateCcw, Trash2, X, Loader2, Clock, ChevronRight } from 'lucide-react';
import { getVersionSnapshots, restoreVersion, deleteVersionSnapshot } from '../services/resumeService';
import ConfirmDialog from './ConfirmDialog';

const VersionHistory = ({ resumeId, onRestore, isOpen, onClose }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const loadVersions = async () => {
      if (!resumeId || !isOpen) return;
      
      setLoading(true);
      try {
        const loaded = await getVersionSnapshots(resumeId);
        setVersions(loaded);
      } catch (error) {
        console.error('Failed to load versions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVersions();
  }, [resumeId, isOpen]);

  const handleRestore = async (versionId) => {
    setRestoring(versionId);
    try {
      const restoredData = await restoreVersion(resumeId, versionId);
      onRestore(restoredData);
      onClose();
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    
    try {
      await deleteVersionSnapshot(resumeId, confirmDelete);
      setVersions(prev => prev.filter(v => v.id !== confirmDelete));
    } catch (error) {
      console.error('Failed to delete version:', error);
    }
    setConfirmDelete(null);
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl max-h-[90vh] sm:max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg font-semibold text-neutral-900">Version History</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">No version history yet</p>
              <p className="text-xs text-neutral-400 mt-1">
                Snapshots are created before each AI optimization
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {versions.map((version, index) => (
                <div 
                  key={version.id}
                  className="p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-neutral-900">
                          {version.label || `Snapshot ${versions.length - index}`}
                        </span>
                        {index === 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {formatDate(version.createdAt)}
                      </p>
                      {version.fieldsUpdated?.length > 0 && (
                        <p className="text-xs text-neutral-400 mt-1">
                          Fields updated: {version.fieldsUpdated.join(', ')}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRestore(version.id)}
                        disabled={restoring === version.id}
                        className="h-8 px-3 text-sm text-neutral-700 hover:bg-neutral-100 rounded-md flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {restoring === version.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restore
                      </button>
                      <button
                        onClick={() => setConfirmDelete(version.id)}
                        className="h-8 w-8 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex-shrink-0">
          <p className="text-xs text-neutral-500 text-center">
            Restore a previous version to undo AI changes
          </p>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete Snapshot?"
        message="This snapshot will be permanently deleted."
        confirmText="Delete"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default VersionHistory;
