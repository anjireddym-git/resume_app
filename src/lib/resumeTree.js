export const ROOT_PARENT_ID = '__root__';

export function toMillis(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return Number.isFinite(date?.getTime?.()) ? date.getTime() : 0;
}

export function sortResumes(resumes) {
  return [...(resumes || [])].sort((a, b) => {
    const timeDiff = toMillis(b.updatedAt) - toMillis(a.updatedAt);
    if (timeDiff !== 0) return timeDiff;
    return (b.version || 0) - (a.version || 0);
  });
}

export function buildResumeTree(resumes) {
  const childrenByParent = new Map();

  for (const resume of resumes || []) {
    const key = resume.parentResumeId || ROOT_PARENT_ID;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(resume);
  }

  const buildNodes = (parentId = ROOT_PARENT_ID) => {
    const children = sortResumes(childrenByParent.get(parentId) || []);
    return children.map((resume) => ({
      resume,
      children: buildNodes(resume.id),
    }));
  };

  return buildNodes();
}

export function resumeMatchesSearch(resume, searchQuery) {
  if (!searchQuery) return true;
  const value = searchQuery.toLowerCase();
  return [
    resume.name,
    resume.generationType,
    resume.generationMeta?.sourceResumeName,
    resume.generationMeta?.label,
  ]
    .filter(Boolean)
    .some((text) => String(text).toLowerCase().includes(value));
}

export function filterResumeTree(nodes, searchQuery) {
  if (!searchQuery) return nodes || [];

  return (nodes || []).flatMap((node) => {
    const children = filterResumeTree(node.children, searchQuery);
    if (resumeMatchesSearch(node.resume, searchQuery) || children.length > 0) {
      return [{ ...node, children }];
    }
    return [];
  });
}

export function collectAncestorIds(resumeId, resumes) {
  const byId = new Map((resumes || []).map((resume) => [resume.id, resume]));
  const ancestorIds = [];
  let current = byId.get(resumeId);

  while (current?.parentResumeId) {
    ancestorIds.push(current.parentResumeId);
    current = byId.get(current.parentResumeId);
  }

  return ancestorIds;
}
