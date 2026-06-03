function cleanSkillLabel(label) {
  return String(label || '').replace(/\s+/g, ' ').trim();
}

function cleanSkillItem(item) {
  return String(item || '')
    .replace(/^[\s•\-–—]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function skillKey(item) {
  return cleanSkillItem(item).toLowerCase();
}

function normalizeSkillItems(items) {
  if (Array.isArray(items)) return items.map(cleanSkillItem).filter(Boolean);
  if (items && typeof items === 'object') {
    return normalizeSkillItems(items.items || items.skills || items.values || items.technologies || []);
  }
  if (items == null) return [];
  return String(items)
    .split(/[,;\n]+/)
    .map(cleanSkillItem)
    .filter(Boolean);
}

function normalizeSkillCategories(skills) {
  const normalized = {};
  const seenGlobal = new Set();

  const addCategory = (rawLabel, rawItems) => {
    const label = cleanSkillLabel(rawLabel);
    if (!label) return;

    const items = normalizeSkillItems(rawItems);
    const existing = normalized[label] || [];
    const seenInCategory = new Set(existing.map(skillKey));

    for (const item of items) {
      const key = skillKey(item);
      if (!key || seenGlobal.has(key) || seenInCategory.has(key)) continue;
      existing.push(item);
      seenGlobal.add(key);
      seenInCategory.add(key);
    }

    if (existing.length > 0) normalized[label] = existing;
  };

  if (Array.isArray(skills)) {
    for (const entry of skills) {
      if (typeof entry === 'string') {
        addCategory('Skills', entry);
      } else if (entry && typeof entry === 'object') {
        addCategory(
          entry.label || entry.category || entry.name || 'Skills',
          entry.items || entry.skills || entry.values || entry.technologies || []
        );
      }
    }
    return normalized;
  }

  if (skills && typeof skills === 'object') {
    for (const [label, items] of Object.entries(skills)) {
      addCategory(label, items);
    }
  }

  return normalized;
}

function collectSkillValues(skills) {
  return Object.values(normalizeSkillCategories(skills)).flat().filter(Boolean);
}

function collectSkillTextParts(skills) {
  return Object.entries(normalizeSkillCategories(skills))
    .flatMap(([label, items]) => [label, ...items])
    .filter(Boolean);
}

function normalizeResumeSkillCategories(resume) {
  if (!resume || typeof resume !== 'object') return resume;
  return {
    ...resume,
    skills: normalizeSkillCategories(resume.skills),
  };
}

module.exports = {
  cleanSkillLabel,
  cleanSkillItem,
  normalizeSkillCategories,
  normalizeResumeSkillCategories,
  collectSkillValues,
  collectSkillTextParts,
};
