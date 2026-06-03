import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Cloud,
  FileText,
  FolderOpen,
  Loader2,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { buildFullResume } from '../../services/resumeService';
import {
  buildResumeTree,
  collectAncestorIds,
  filterResumeTree,
  sortResumes,
} from '../../lib/resumeTree';
import { calculateRuleBasedMatch, getRuleMatchToneClass } from '../../lib/ruleBasedMatch';
import GeneratedDocxPreview from '../GeneratedDocxPreview';
import { buildOutreachDocxRenderOptions } from './outreachDocxOptions';

const ResumeLibraryPicker = ({
  groups = [],
  resumes = [],
  selectedResumeId,
  onSelectResume,
  loading = false,
  jobDescription = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedResumes, setExpandedResumes] = useState({});

  const resumesByGroup = useMemo(() => {
    const map = new Map();
    for (const resume of resumes) {
      if (!map.has(resume.groupId)) map.set(resume.groupId, []);
      map.get(resume.groupId).push(resume);
    }
    for (const [groupId, items] of map.entries()) {
      map.set(groupId, sortResumes(items));
    }
    return map;
  }, [resumes]);

  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const selectedResume = useMemo(
    () => resumes.find((resume) => resume.id === selectedResumeId) || null,
    [resumes, selectedResumeId],
  );
  const selectedGroup = selectedResume ? groupById.get(selectedResume.groupId) : null;
  const selectedFullResume = selectedResume && selectedGroup
    ? buildFullResume(selectedGroup, selectedResume)
    : null;
  const selectedRenderOptions = selectedFullResume && selectedGroup
    ? buildOutreachDocxRenderOptions(selectedGroup, selectedFullResume)
    : null;
  const ruleMatchesByResumeId = useMemo(() => {
    if (!jobDescription.trim()) return new Map();
    const map = new Map();
    for (const resume of resumes) {
      const group = groupById.get(resume.groupId);
      if (!group) continue;
      const match = calculateRuleBasedMatch(jobDescription, buildFullResume(group, resume));
      if (match) map.set(resume.id, match);
    }
    return map;
  }, [groupById, jobDescription, resumes]);

  useEffect(() => {
    if (groups.length === 0) return;
    setExpandedGroups((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const firstGroupWithResumes = groups.find((group) => (resumesByGroup.get(group.id) || []).length > 0);
      return firstGroupWithResumes ? { [firstGroupWithResumes.id]: true } : { [groups[0].id]: true };
    });
  }, [groups, resumesByGroup]);

  useEffect(() => {
    if (!selectedResume) return;
    const groupResumes = resumesByGroup.get(selectedResume.groupId) || [];
    const ancestorIds = collectAncestorIds(selectedResume.id, groupResumes);

    setExpandedGroups((prev) => (
      prev[selectedResume.groupId] ? prev : { ...prev, [selectedResume.groupId]: true }
    ));
    if (ancestorIds.length > 0) {
      setExpandedResumes((prev) => {
        const next = { ...prev };
        for (const id of ancestorIds) next[id] = true;
        return next;
      });
    }
  }, [resumesByGroup, selectedResume]);

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleResumeBranch = (resumeId) => {
    setExpandedResumes((prev) => ({ ...prev, [resumeId]: !prev[resumeId] }));
  };

  const renderResumeNode = (node, groupId, depth = 0) => {
    const { resume, children } = node;
    const hasChildren = children.length > 0;
    const isGenerated = !!resume.parentResumeId;
    const isSelected = selectedResumeId === resume.id;
    const ruleMatch = ruleMatchesByResumeId.get(resume.id);
    const ruleMatchTitle = ruleMatch
      ? [
          'Rule-based estimate for the current JD. No AI used.',
          ruleMatch.rules.length ? `Rules: ${ruleMatch.rules.join('; ')}` : '',
          ruleMatch.matchedKeywords.length ? `Matched: ${ruleMatch.matchedKeywords.join(', ')}` : '',
          ruleMatch.missingKeywords.length ? `Missing: ${ruleMatch.missingKeywords.join(', ')}` : '',
        ].filter(Boolean).join('\n')
      : '';

    return (
      <div key={resume.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectResume(resume.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onSelectResume(resume.id);
          }}
          title={resume.name}
          className={`group flex items-center gap-2 py-1.5 pr-2 rounded-md cursor-pointer hover:bg-neutral-100 transition-colors ${
            isSelected ? 'bg-blue-50 text-blue-700' : 'text-neutral-700'
          }`}
          style={{ paddingLeft: `${8 + depth * 18}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
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
              <span className="text-sm truncate">{resume.name}</span>
              {resume.starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
              {resume.driveFileId && <Cloud className="w-3 h-3 text-blue-500 flex-shrink-0" />}
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

          {ruleMatch ? (
            <span
              className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${getRuleMatchToneClass(ruleMatch.score)}`}
              title={ruleMatchTitle}
            >
              {ruleMatch.score}%
            </span>
          ) : null}
        </div>

        {hasChildren && expandedResumes[resume.id] && (
          children.map((child) => renderResumeNode(child, groupId, depth + 1))
        )}
      </div>
    );
  };

  const filteredGroups = useMemo(() => {
    const value = searchQuery.trim().toLowerCase();
    return groups.filter((group) => {
      const groupResumes = resumesByGroup.get(group.id) || [];
      if (!value) return groupResumes.length > 0;
      const groupMatches = String(group.name || '').toLowerCase().includes(value);
      const treeMatches = filterResumeTree(buildResumeTree(groupResumes), searchQuery).length > 0;
      return groupMatches || treeMatches;
    });
  }, [groups, resumesByGroup, searchQuery]);

  if (loading) {
    return (
      <div className="h-[520px] flex items-center justify-center text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(300px,0.8fr)_minmax(360px,1.2fr)] gap-4">
      <div className="border border-neutral-200 rounded-xl overflow-hidden min-w-0">
        <div className="p-3 border-b border-neutral-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search resumes..."
              className="w-full h-9 pl-8 pr-8 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {jobDescription.trim() && (
            <div className="mt-2 text-[11px] text-neutral-500">
              Rule-based estimate from current JD keywords. No AI.
            </div>
          )}
        </div>

        <div className="h-[460px] overflow-y-auto p-2">
          {filteredGroups.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-neutral-500">
              {searchQuery ? 'No matching resumes' : 'No resumes available'}
            </div>
          ) : (
            filteredGroups.map((group) => {
              const groupResumes = resumesByGroup.get(group.id) || [];
              const resumeTree = filterResumeTree(buildResumeTree(groupResumes), searchQuery);
              const groupOpen = !!expandedGroups[group.id];
              const groupSelected = selectedResume?.groupId === group.id;

              return (
                <div key={group.id} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    title={group.name}
                    className={`w-full flex items-center gap-1.5 px-2 py-2 rounded-md text-left hover:bg-neutral-100 ${
                      groupSelected ? 'bg-neutral-50' : ''
                    }`}
                  >
                    {groupOpen ? (
                      <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    )}
                    <FolderOpen className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                    <span className="flex-1 min-w-0 text-sm font-medium text-neutral-700 truncate">
                      {group.name}
                    </span>
                    <span className="text-xs text-neutral-400">{groupResumes.length}</span>
                  </button>

                  {groupOpen && (
                    <div className="ml-3 border-l border-neutral-100 pl-1">
                      {resumeTree.length > 0 ? (
                        resumeTree.map((node) => renderResumeNode(node, group.id))
                      ) : (
                        <div className="px-3 py-2 text-xs text-neutral-400">
                          {searchQuery ? 'No matching resumes' : 'No resumes yet'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden min-w-0 bg-neutral-50">
        <div className="h-12 px-3 border-b border-neutral-200 bg-white flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-neutral-900 truncate">
              {selectedResume ? selectedResume.name : 'Select a resume'}
            </div>
            <div className="text-[11px] text-neutral-500 truncate">
              {selectedGroup ? selectedGroup.name : 'Preview appears here before you continue'}
            </div>
          </div>
          {selectedResume?.driveFileId && (
            <Cloud className="w-4 h-4 text-blue-500 flex-shrink-0" title="Synced to Google Drive" />
          )}
        </div>

        <div className="h-[468px] overflow-hidden bg-white">
          {selectedFullResume ? (
            <GeneratedDocxPreview
              resumeData={selectedFullResume}
              renderOptions={selectedRenderOptions}
              debounceMs={100}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 text-neutral-500">
              <FileText className="w-10 h-10 text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-700">Choose a resume from the library</p>
              <p className="text-xs mt-1">You can send it as-is or tailor it for this job.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeLibraryPicker;
