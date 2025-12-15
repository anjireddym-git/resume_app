import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit2,
  Loader2,
  Search,
  X,
  Users,
  Database,
  Sparkles,
  Palette
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getResumeGroups, 
  getResumesInGroup, 
  deleteResumeGroup, 
  deleteResume,
  updateResumeGroup,
  updateResume
} from '../services/resumeService';
import ConfirmDialog from './ConfirmDialog';

const FileBrowser = ({ 
  onSelectResume, 
  selectedResumeId, 
  selectedGroupId,
  onCreateGroup,
  onCreateResume,
  onEditShared,
  onAutoPopulate,
  onEditDesign,
  refreshTrigger
}) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groupResumes, setGroupResumes] = useState({});
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'group'|'resume', id, groupId?, name }
  const containerRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen && !e.target.closest('.menu-trigger') && !e.target.closest('.dropdown-menu')) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  const loadGroups = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const loadedGroups = await getResumeGroups(user.uid);
      setGroups(loadedGroups);
      
      if (loadedGroups.length > 0 && Object.keys(expandedGroups).length === 0) {
        setExpandedGroups({ [loadedGroups[0].id]: true });
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups, refreshTrigger]);

  const loadResumesForGroup = useCallback(async (groupId) => {
    if (!user?.uid) return;
    try {
      const resumes = await getResumesInGroup(groupId, user.uid);
      setGroupResumes(prev => ({ ...prev, [groupId]: resumes }));
    } catch (error) {
      console.error('Failed to load resumes:', error);
    }
  }, [user?.uid]);

  useEffect(() => {
    for (const groupId of Object.keys(expandedGroups)) {
      if (expandedGroups[groupId]) {
        loadResumesForGroup(groupId);
      }
    }
  }, [expandedGroups, refreshTrigger, loadResumesForGroup]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const openMenu = (e, id, type, groupId = null) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
    
    setMenuPosition({
      top: rect.bottom - containerRect.top + 4,
      left: Math.min(rect.left - containerRect.left, 120)
    });
    setMenuOpen({ id, type, groupId });
  };

  const handleDeleteGroup = async () => {
    if (!confirmDelete || confirmDelete.type !== 'group') return;
    
    try {
      await deleteResumeGroup(confirmDelete.id);
      setGroups(prev => prev.filter(g => g.id !== confirmDelete.id));
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
    setConfirmDelete(null);
  };

  const handleDeleteResume = async () => {
    if (!confirmDelete || confirmDelete.type !== 'resume') return;
    
    try {
      await deleteResume(confirmDelete.id, confirmDelete.groupId);
      setGroupResumes(prev => ({
        ...prev,
        [confirmDelete.groupId]: prev[confirmDelete.groupId].filter(r => r.id !== confirmDelete.id)
      }));
    } catch (error) {
      console.error('Failed to delete resume:', error);
    }
    setConfirmDelete(null);
  };

  const startRename = (id, name) => {
    setEditingId(id);
    setEditingName(name);
    setMenuOpen(null);
  };

  const saveRename = async (type, id, groupId) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      if (type === 'group') {
        await updateResumeGroup(id, { name: editingName.trim() });
        setGroups(prev => prev.map(g => g.id === id ? { ...g, name: editingName.trim() } : g));
      } else {
        await updateResume(id, { name: editingName.trim() });
        setGroupResumes(prev => ({
          ...prev,
          [groupId]: prev[groupId].map(r => r.id === id ? { ...r, name: editingName.trim() } : r)
        }));
      }
    } catch (error) {
      console.error('Failed to rename:', error);
    }
    
    setEditingId(null);
    setEditingName('');
  };

  const filteredGroups = groups.filter(group => {
    const groupMatches = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    const resumes = groupResumes[group.id] || [];
    const resumeMatches = resumes.some(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return groupMatches || resumeMatches;
  });

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative" ref={containerRef}>
      {/* Header */}
      <div className="p-3 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Resumes</span>
          <button 
            onClick={onCreateGroup}
            className="p-1.5 text-neutral-500 hover:bg-neutral-100 rounded-md transition-colors"
            title="New Group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full h-8 pl-8 pr-8 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredGroups.length === 0 ? (
          <div className="p-4 text-center">
            {searchQuery ? (
              <p className="text-sm text-neutral-500">No results found</p>
            ) : (
              <>
                <p className="text-sm text-neutral-500 mb-3">No resume groups yet</p>
                <button onClick={onCreateGroup} className="text-sm text-neutral-700 hover:text-neutral-900">
                  Create your first group
                </button>
              </>
            )}
          </div>
        ) : (
          filteredGroups.map(group => {
            const resumes = groupResumes[group.id] || [];
            const filteredResumes = searchQuery 
              ? resumes.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
              : resumes;

            return (
              <div key={group.id}>
                {/* Group Header */}
                <div 
                  className={`group flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-neutral-100 transition-colors ${
                    selectedGroupId === group.id && !selectedResumeId ? 'bg-neutral-100' : ''
                  }`}
                  onClick={() => toggleGroup(group.id)}
                >
                  {expandedGroups[group.id] ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  )}
                  <FolderOpen className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                  
                  {editingId === group.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => saveRename('group', group.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename('group', group.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-sm px-1 border border-neutral-300 rounded focus:outline-none min-w-0"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 text-sm text-neutral-700 truncate">{group.name}</span>
                  )}
                  
                  <span className="text-xs text-neutral-400 mr-1">{group.resumeCount || 0}</span>
                  
                  <button
                    onClick={(e) => openMenu(e, group.id, 'group')}
                    className="menu-trigger p-1 text-neutral-400 hover:text-neutral-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Resumes */}
                {expandedGroups[group.id] && (
                  <div className="ml-4">
                    {filteredResumes.map(resume => (
                      <div
                        key={resume.id}
                        className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-neutral-100 transition-colors ${
                          selectedResumeId === resume.id ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                        onClick={() => onSelectResume(group.id, resume.id)}
                      >
                        <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        
                        {editingId === resume.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => saveRename('resume', resume.id, group.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename('resume', resume.id, group.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-sm px-1 border border-neutral-300 rounded focus:outline-none min-w-0"
                            autoFocus
                          />
                        ) : (
                          <span className="flex-1 text-sm truncate">{resume.name}</span>
                        )}
                        
                        {resume.matchScore && (
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                            resume.matchScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            resume.matchScore >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-neutral-100 text-neutral-600'
                          }`}>
                            {resume.matchScore}%
                          </span>
                        )}

                        <button
                          onClick={(e) => openMenu(e, resume.id, 'resume', group.id)}
                          className="menu-trigger p-1 text-neutral-400 hover:text-neutral-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    
                    <button
                      onClick={() => onCreateResume(group.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-neutral-400 hover:text-neutral-600 text-sm w-full"
                    >
                      <Plus className="w-4 h-4" />
                      Add Resume
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div 
          className="dropdown-menu absolute bg-white border border-neutral-200 rounded-lg shadow-lg z-50 py-1 w-36"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {menuOpen.type === 'group' && (
            <>
              <button
                onClick={() => {
                  onCreateResume(menuOpen.id);
                  setMenuOpen(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Resume
              </button>
              <button
                onClick={() => {
                  const group = groups.find(g => g.id === menuOpen.id);
                  onEditShared(group);
                  setMenuOpen(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                Edit Shared
              </button>
              <button
                onClick={() => {
                  const group = groups.find(g => g.id === menuOpen.id);
                  onEditDesign(group, null); // Pass group, no resumeId needed for triggering
                  setMenuOpen(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
              >
                <Palette className="w-4 h-4" />
                Design
              </button>
              <button
                onClick={() => {

                  const group = groups.find(g => g.id === menuOpen.id);
                  onAutoPopulate(group);
                  setMenuOpen(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Auto Populate
              </button>
              <button
                onClick={() => {
                  const group = groups.find(g => g.id === menuOpen.id);
                  startRename(menuOpen.id, group?.name || '');
                }}
                className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Rename
              </button>
              <button
                onClick={() => {
                  const group = groups.find(g => g.id === menuOpen.id);
                  setConfirmDelete({ type: 'group', id: menuOpen.id, name: group?.name || 'this group' });
                  setMenuOpen(null);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
          {menuOpen.type === 'resume' && (() => {
            const resumes = groupResumes[menuOpen.groupId] || [];
            const isLastResume = resumes.length <= 1;
            const resume = resumes.find(r => r.id === menuOpen.id);
            
            return (
              <>
                <button
                  onClick={() => {
                    startRename(menuOpen.id, resume?.name || '');
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Rename
                </button>


                {isLastResume ? (
                  <div className="px-3 py-2 text-xs text-neutral-400">
                    Can't delete last resume
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setConfirmDelete({ 
                        type: 'resume', 
                        id: menuOpen.id, 
                        groupId: menuOpen.groupId,
                        name: resume?.name || 'this resume' 
                      });
                      setMenuOpen(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title={confirmDelete?.type === 'group' ? 'Delete Group?' : 'Delete Resume?'}
        message={
          confirmDelete?.type === 'group' 
            ? `"${confirmDelete?.name}" and all its resumes will be permanently deleted.`
            : `"${confirmDelete?.name}" will be permanently deleted.`
        }
        confirmText="Delete"
        danger={true}
        onConfirm={confirmDelete?.type === 'group' ? handleDeleteGroup : handleDeleteResume}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default FileBrowser;
