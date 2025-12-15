import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, webClasses, pdfStyles } from '../../styles/theme';

// PDF Styles
const styles = StyleSheet.create({
  section: pdfStyles.section,
  sectionTitle: pdfStyles.sectionTitle,
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  skillLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginRight: 4,
    width: 65,
  },
  skillText: {
    fontSize: 9,
    color: colors.text.primary,
    flex: 1,
  },
});

// Skill categories configuration
const skillCategories = [
  { key: 'languages', label: 'Languages:' },
  { key: 'frameworks', label: 'Frameworks:' },
  { key: 'tools', label: 'Tools:' },
  { key: 'databases', label: 'Databases:' },
  { key: 'other', label: 'Other:' },
];

// Web Component
export const SkillsSection = ({ data }) => {
  const skills = data?.skills || {};
  const hasSkills = skillCategories.some(cat => skills[cat.key]?.length > 0);
  
  if (!hasSkills) return null;
  
  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Technical Skills</h2>
      <div className="space-y-1.5 text-sm text-gray-900">
        {skillCategories.map(({ key, label }) => (
          skills[key]?.length > 0 && (
            <div key={key} className="flex flex-wrap gap-2">
              <span className="font-semibold text-gray-900">{label}</span>
              <span className="text-gray-900">{skills[key].join('  •  ')}</span>
            </div>
          )
        ))}
      </div>
    </section>
  );
};

// PDF Component
export const SkillsSectionPDF = ({ data }) => {
  const skills = data?.skills || {};
  const hasSkills = skillCategories.some(cat => skills[cat.key]?.length > 0);
  
  if (!hasSkills) return null;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Technical Skills</Text>
      {skillCategories.map(({ key, label }) => (
        skills[key]?.length > 0 && (
          <View key={key} style={styles.skillRow}>
            <Text style={styles.skillLabel}>{label}</Text>
            <Text style={styles.skillText}>{skills[key].join(', ')}</Text>
          </View>
        )
      ))}
    </View>
  );
};

export default SkillsSection;
