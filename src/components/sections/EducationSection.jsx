import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, pdfStyles, webClasses } from '../../styles/theme';

// PDF Styles
const styles = StyleSheet.create({
  section: pdfStyles.section,
  sectionTitle: pdfStyles.sectionTitle,
  eduItem: {
    marginBottom: 5,
  },
  eduHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  eduDegree: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  eduSchool: {
    fontSize: 9,
    color: colors.text.muted,
  },
  eduDate: {
    fontSize: 9,
    color: colors.text.light,
  },
  gpa: {
    fontSize: 9,
    color: colors.accent.success,
  },
});

// Web Component
export const EducationSection = ({ data }) => {
  if (!data?.education?.length) return null;
  
  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Education</h2>
      {data.education.map((edu, index) => (
        <div key={index} className="mb-2">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="font-semibold text-gray-800">{edu.degree}</span>
              {edu.field && <span className="text-gray-600"> in {edu.field}</span>}
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap ml-4">
              {edu.graduationDate}
            </span>
          </div>
          <div className="text-sm text-gray-800">
            {edu.institution}
            {edu.location && <span className="text-gray-700"> · {edu.location}</span>}
            {edu.gpa && (
              <span className="ml-2 px-1.5 py-0.5 bg-emerald-200 text-emerald-900 text-xs rounded">
                GPA: {edu.gpa}
              </span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};

// PDF Component
export const EducationSectionPDF = ({ data }) => {
  if (!data?.education?.length) return null;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Education</Text>
      {data.education.map((edu, idx) => (
        <View key={idx} style={styles.eduItem}>
          <View style={styles.eduHeader}>
            <Text style={styles.eduDegree}>
              {edu.degree}{edu.field ? ` in ${edu.field}` : ''}{edu.gpa ? ` (GPA: ${edu.gpa})` : ''}
            </Text>
            <Text style={styles.eduDate}>{edu.graduationDate}</Text>
          </View>
          <Text style={styles.eduSchool}>
            {edu.institution}{edu.location ? ` - ${edu.location}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
};

export default EducationSection;
