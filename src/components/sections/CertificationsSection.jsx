import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, pdfStyles, webClasses } from '../../styles/theme';

// PDF Styles
const styles = StyleSheet.create({
  section: pdfStyles.section,
  sectionTitle: pdfStyles.sectionTitle,
  certItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  certName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  certIssuer: {
    fontSize: 9,
    color: colors.text.muted,
  },
});

// Web Component
export const CertificationsSection = ({ data }) => {
  if (!data?.certifications?.length) return null;
  
  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Certifications</h2>
      <div className="space-y-1.5">
        {data.certifications.map((cert, index) => (
          <div key={index} className="flex items-center text-sm">
            <span className="text-gray-900 mr-2">•</span>
            <span className="font-medium text-gray-900">{cert.name}</span>
            {cert.issuer && <span className="text-gray-800 ml-1">– {cert.issuer}</span>}
            {cert.date && <span className="text-gray-700 ml-2 text-xs">({cert.date})</span>}
          </div>
        ))}
      </div>
    </section>
  );
};

// PDF Component
export const CertificationsSectionPDF = ({ data }) => {
  if (!data?.certifications?.length) return null;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Certifications</Text>
      {data.certifications.map((cert, idx) => (
        <View key={idx} style={styles.certItem}>
          <Text style={styles.certName}>{cert.name}</Text>
          {cert.issuer && <Text style={styles.certIssuer}> - {cert.issuer}</Text>}
          {cert.date && <Text style={styles.certIssuer}> ({cert.date})</Text>}
        </View>
      ))}
    </View>
  );
};

export default CertificationsSection;
