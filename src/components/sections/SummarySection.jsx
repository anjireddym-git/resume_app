import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, webClasses, pdfStyles } from '../../styles/theme';
import { EditableField } from '../editing';
import { getSummaryPoints } from '../../lib/summaryUtils';

// PDF Styles
const styles = StyleSheet.create({
  section: pdfStyles.section,
  sectionTitle: pdfStyles.sectionTitle,
  summary: {
    fontSize: 10,
    color: colors.text.primary,
    lineHeight: 1.5,
  },
  bullet: {
    fontSize: 10,
    color: colors.text.primary,
    lineHeight: 1.5,
    marginBottom: 2,
  },
});

// Web Component
export const SummarySection = ({ data, onUpdate, isEditMode = false }) => {
  if (!data?.summary && !isEditMode) return null;
  const summaryPoints = getSummaryPoints(data?.summary);
  
  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Professional Summary</h2>
      {isEditMode ? (
        <EditableField
          value={data?.summary}
          onSave={(value) => onUpdate?.('summary', value)}
          placeholder="Enter one professional summary point per line..."
          className="text-gray-900 leading-relaxed block w-full"
          multiline
        />
      ) : (
        <ul className="list-disc pl-5 text-gray-900 leading-relaxed space-y-1">
          {summaryPoints.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

// PDF Component
export const SummarySectionPDF = ({ data }) => {
  if (!data?.summary) return null;
  const summaryPoints = getSummaryPoints(data.summary);
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Professional Summary</Text>
      {summaryPoints.map((point, index) => (
        <Text key={index} style={styles.bullet}>• {point}</Text>
      ))}
    </View>
  );
};

export default SummarySection;
