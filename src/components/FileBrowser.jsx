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
  Palette,
  Star,
  Cloud
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getResumeGroups, 
  getResumesInGroup, 
  deleteResumeGroup, 
  deleteResume,
  toggleResumeStar,
  updateResumeGroup,
  updateResume
} from '../services/resumeService';
import ConfirmDialog from './ConfirmDialog';
import {
  buildResumeTree,
  collectAncestorIds,
  filterResumeTree,
  resumeMatchesSearch,
  sortResumes,
} from '../lib/resumeTree';

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
  const [expandedResumes, setExpandedResumes] = useState({});
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

  useEffect(() => {
    if (!selectedGroupId || !selectedResumeId) return;
    const resumes = groupResumes[selectedGroupId] || [];
    if (!resumes.some((resume) => resume.id === selectedResumeId)) return;

    const ancestorIds = collectAncestorIds(selectedResumeId, resumes);
    if (ancestorIds.length === 0) return;

    // Return `prev` unchanged when the expansion state is already correct.
    // Spreading a new object (even with the same values) changes the reference,
    // which triggers the group-load effect → loadResumesForGroup → setGroupResumes
    // (new ref) → this effect again → infinite loop of Firestore channel calls.
    setExpandedGroups((prev) => {
      if (prev[selectedGroupId]) return prev; // already expanded, no-op
      return { ...prev, [selectedGroupId]: true };
    });
    setExpandedResumes((prev) => {
      const anyNew = ancestorIds.some((id) => !prev[id]);
      if (!anyNew) return prev; // nothing new to expand, no-op
      const next = { ...prev };
      for (const id of ancestorIds) next[id] = true;
      return next;
    });
  }, [selectedGroupId, selectedResumeId, groupResumes]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const toggleResumeBranch = (resumeId) => {
    setExpandedResumes((prev) => ({
      ...prev,
      [resumeId]: !prev[resumeId],
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

  const handleToggleStar = async (resume, groupId) => {
    const nextStarred = !resume.starred;
    try {
      await toggleResumeStar(resume.id, nextStarred);
      setGroupResumes((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || []).map((item) =>
          item.id === resume.id
            ? {
                ...item,
                starred: nextStarred,
                starredAt: nextStarred ? new Date().toISOString() : null,
              }
            : item
        ),
      }));
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
    setMenuOpen(null);
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
    const resumeMatches = resumes.some((resume) => resumeMatchesSearch(resume, searchQuery));
    return groupMatches || resumeMatches;
  });

  const renderResumeShortcut = (resume, groupId) => {
    const isGenerated = !!resume.parentResumeId;
    const resumeTitle = isGenerated && resume.generationMeta?.sourceResumeName
      ? `${resume.name}\nFrom ${resume.generationMeta.sourceResumeName}`
      : resume.name;
    return (
      <button
        key={`starred-${resume.id}`}
        onClick={() => onSelectResume(groupId, resume.id)}
        title={resumeTitle}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-100 transition-colors ${
          selectedResumeId === resume.id ? 'bg-blue-50 text-blue-700' : ''
        }`}
      >
        <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
        {isGenerated ? (
          <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{resume.name}</div>
          {isGenerated && resume.generationMeta?.sourceResumeName && (
            <div className="text-[10px] text-neutral-400 truncate">
              From {resume.generationMeta.sourceResumeName}
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderResumeNode = (node, groupId, depth = 0) => {
    const { resume, children } = node;
    const hasChildren = children.length > 0;
    const isGenerated = !!resume.parentResumeId;
    const isSelected = selectedResumeId === resume.id;
    const resumeTitle = isGenerated && resume.generationMeta?.sourceResumeName
      ? `${resume.name}\nFrom ${resume.generationMeta.sourceResumeName}`
      : resume.name;

    return (
      <div key={resume.id}>
        <div
          className={`group flex items-center gap-2 py-1.5 cursor-pointer hover:bg-neutral-100 transition-colors ${
            isSelected ? 'bg-blue-50 text-blue-700' : ''
          }`}
          onClick={() => onSelectResume(groupId, resume.id)}
          title={resumeTitle}
          style={{ paddingLeft: `${12 + depth * 18}px`, paddingRight: '12px' }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleResumeBranch(resume.id);
              }}
              className="p-0.5 rounded hover:bg-neutral-200/70"
              title={expandedResumes[resume.id] ? 'Collapse generated resumes' : 'Expand generated resumes'}
            >
              {expandedResumes[resume.id] ? (
                <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              )}
            </button>
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}

          {isGenerated ? (
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
          ) : (
            <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {editingId === resume.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => saveRename('resume', resume.id, groupId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename('resume', resume.id, groupId);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-sm px-1 border border-neutral-300 rounded focus:outline-none min-w-0"
                  autoFocus
                />
              ) : (
                <span className="text-sm truncate">{resume.name}</span>
              )}
              {resume.starred && (
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
              )}
              {resume.driveFileId && (
                <Cloud className="w-3 h-3 text-blue-500 flex-shrink-0" title="Synced to Google Drive" />
              )}
              {isGenerated && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 flex-shrink-0">
                  {resume.generationType === 'transform' ? 'Transform' : 'Generated'}
                </span>
              )}
            </div>
            {isGenerated && resume.generationMeta?.sourceResumeName && (
              <div className="text-[10px] text-neutral-400 truncate">
                From {resume.generationMeta.sourceResumeName}
              </div>
            )}
          </div>

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
            onClick={(e) => openMenu(e, resume.id, 'resume', groupId)}
            className="menu-trigger p-1 text-neutral-400 hover:text-neutral-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>

        {hasChildren && expandedResumes[resume.id] && children.map((child) => renderResumeNode(child, groupId, depth + 1))}
      </div>
    );
  };

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
            const starredResumes = sortResumes(
              resumes.filter((resume) => resume.starred && resumeMatchesSearch(resume, searchQuery))
            );
            const resumeTree = filterResumeTree(buildResumeTree(resumes), searchQuery);

            return (
              <div key={group.id}>
                {/* Group Header */}
                <div 
                  className={`group flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-neutral-100 transition-colors ${
                    selectedGroupId === group.id && !selectedResumeId ? 'bg-neutral-100' : ''
                  }`}
                  onClick={() => toggleGroup(group.id)}
                  title={group.name}
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
                    {starredResumes.length > 0 && (
                      <div className="pb-2 border-b border-neutral-100 mb-2">
                        <div className="px-3 py-1 text-[10px] font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-1.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          Starred
                        </div>
                        {starredResumes.map((resume) => renderResumeShortcut(resume, group.id))}
                      </div>
                    )}

                    {resumeTree.length > 0 ? (
                      resumeTree.map((node) => renderResumeNode(node, group.id))
                    ) : searchQuery ? (
                      <div className="px-3 py-2 text-xs text-neutral-400">No matching resumes</div>
                    ) : filteredResumes.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-neutral-400">No resumes yet</div>
                    ) : null}
                    
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
            const hasChildren = resumes.some((item) => item.parentResumeId === menuOpen.id);
            
            return (
              <>
                <button
                  onClick={() => handleToggleStar(resume, menuOpen.groupId)}
                  className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                >
                  <Star className={`w-4 h-4 ${resume?.starred ? 'text-amber-400 fill-amber-400' : ''}`} />
                  {resume?.starred ? 'Unstar' : 'Star'}
                </button>
                <button
                  onClick={() => {
                    startRename(menuOpen.id, resume?.name || '');
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Rename
                </button>


                {hasChildren ? (
                  <div className="px-3 py-2 text-xs text-neutral-400">
                    Delete generated children first
                  </div>
                ) : isLastResume ? (
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
