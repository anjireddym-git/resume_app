import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, pdfStyles, webClasses } from '../../styles/theme';

// PDF Styles
const styles = StyleSheet.create({
  section: pdfStyles.section,
  sectionTitle: pdfStyles.sectionTitle,
  expItem: {
    marginBottom: 8,
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  expTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  expCompany: {
    fontSize: 10,
    color: colors.text.muted,
  },
  expDate: {
    fontSize: 9,
    color: colors.text.light,
  },
  bulletList: {
    marginTop: 3,
    paddingLeft: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bullet: {
    fontSize: 9,
    color: colors.accent.primary,
    marginRight: 4,
  },
  bulletText: {
    fontSize: 9,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 1.4,
  },
  environment: {
    fontSize: 8,
    color: colors.text.light,
    marginTop: 3,
  },
});

// Web Component
export const ExperienceSection = ({ data }) => {
  if (!data?.experience?.length) return null;
  
  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Experience</h2>
      {data.experience.map((exp, index) => (
        <div key={index} className="mb-4">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="font-semibold text-gray-800">{exp.position}</span>
              {exp.company && <span className="text-gray-600"> · {exp.company}</span>}
              {exp.location && <span className="text-gray-400"> · {exp.location}</span>}
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap ml-4">
              {exp.startDate} – {exp.endDate || 'Present'}
            </span>
          </div>
          {exp.highlights?.length > 0 && (
            <ul className="mt-1.5 space-y-1 text-sm text-gray-900">
              {exp.highlights.map((highlight, hIndex) => (
                <li key={hIndex} className="flex">
                  <span className="mr-2">•</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          )}
          {exp.environment && (
            <p className="text-xs text-gray-700 mt-2 inline-block px-2 py-1 rounded border border-gray-200">
              <span className="font-medium">Environment:</span> {exp.environment}
            </p>
          )}
        </div>
      ))}
    </section>
  );
};

// PDF Component
export const ExperienceSectionPDF = ({ data }) => {
  if (!data?.experience?.length) return null;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Experience</Text>
      {data.experience.map((exp, idx) => (
        <View key={idx} style={styles.expItem}>
          <View style={styles.expHeader}>
            <View>
              <Text style={styles.expTitle}>{exp.position}</Text>
              <Text style={styles.expCompany}>
                {exp.company}{exp.location ? ` - ${exp.location}` : ''}
              </Text>
            </View>
            <Text style={styles.expDate}>{exp.startDate} - {exp.endDate || 'Present'}</Text>
          </View>
          {exp.highlights?.length > 0 && (
            <View style={styles.bulletList}>
              {exp.highlights.map((h, i) => (
                <View key={i} style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{h}</Text>
                </View>
              ))}
            </View>
          )}
          {exp.environment && (
            <Text style={styles.environment}>Environment: {exp.environment}</Text>
          )}
        </View>
      ))}
    </View>
  );
};

export default ExperienceSection;
