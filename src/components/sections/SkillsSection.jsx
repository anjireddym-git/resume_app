import React from 'react';
import { webClasses } from '../../styles/theme';

function formatSkillLabel(key) {
  return String(key || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSkillCategories(skills = {}) {
  return Object.entries(skills)
    .filter(([, items]) => Array.isArray(items))
    .map(([key, items]) => ({
      key,
      label: `${formatSkillLabel(key)}:`,
      items: items.filter((item) => item && String(item).trim()),
    }))
    .filter((category) => category.items.length > 0);
}

export const SkillsSection = ({ data }) => {
  const skillCategories = getSkillCategories(data?.skills);
  if (skillCategories.length === 0) return null;

  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Technical Skills</h2>
      <div className="space-y-1.5 text-sm text-gray-900">
        {skillCategories.map(({ key, label, items }) => (
          <div key={key} className="flex flex-wrap gap-2">
            <span className="font-semibold text-gray-900">{label}</span>
            <span className="text-gray-900">{items.join('  •  ')}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default SkillsSection;
