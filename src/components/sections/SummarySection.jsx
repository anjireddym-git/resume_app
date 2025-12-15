import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, webClasses, pdfStyles } from '../../styles/theme';
import { EditableField } from '../editing';

// PDF Styles
const styles = StyleSheet.create({
  section: pdfStyles.section,
  sectionTitle: pdfStyles.sectionTitle,
  summary: {
    fontSize: 10,
    color: colors.text.primary,
    lineHeight: 1.5,
  },
});

// Web Component
export const SummarySection = ({ data, onUpdate, isEditMode = false }) => {
  if (!data?.summary && !isEditMode) return null;
  
  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Summary</h2>
      {isEditMode ? (
        <EditableField
          value={data?.summary}
          onSave={(value) => onUpdate?.('summary', value)}
          placeholder="Professional summary..."
          className="text-gray-900 leading-relaxed block w-full"
          multiline
        />
      ) : (
        <p className="text-gray-900 leading-relaxed">{data.summary}</p>
      )}
    </section>
  );
};

// PDF Component
export const SummarySectionPDF = ({ data }) => {
  if (!data?.summary) return null;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Summary</Text>
      <Text style={styles.summary}>{data.summary}</Text>
    </View>
  );
};

export default SummarySection;
