import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { 
  HeaderSectionPDF, 
  SummarySectionPDF, 
  SkillsSectionPDF, 
  ExperienceSectionPDF, 
  EducationSectionPDF, 
  ProjectsSectionPDF, 
  CertificationsSectionPDF 
} from '../components/sections';
import { colors, pdfStyles } from '../styles/theme';

const styles = StyleSheet.create({
  page: pdfStyles.page,
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

const ResumePDF = ({ resumeData }) => {
  const data = resumeData || {};

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <HeaderSectionPDF data={data} />
        <SummarySectionPDF data={data} />
        <SkillsSectionPDF data={data} />
        <ExperienceSectionPDF data={data} />

        {/* Internships */}
        {data.internships?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Internships</Text>
            {data.internships.map((intern, idx) => (
              <View key={idx} style={styles.expItem}>
                <View style={styles.expHeader}>
                  <View>
                    <Text style={styles.expTitle}>{intern.position}</Text>
                    <Text style={styles.expCompany}>{intern.company}</Text>
                  </View>
                  <Text style={styles.expDate}>
                    {intern.duration || `${intern.startDate} - ${intern.endDate}`}
                  </Text>
                </View>
                {intern.highlights?.length > 0 && (
                  <View style={styles.bulletList}>
                    {intern.highlights.map((h, i) => (
                      <View key={i} style={styles.bulletItem}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{h}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <EducationSectionPDF data={data} />
        <ProjectsSectionPDF data={data} />
        <CertificationsSectionPDF data={data} />

        {/* Hackathons */}
        {data.hackathons?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hackathons & Awards</Text>
            {data.hackathons.map((hack, idx) => (
              <View key={idx} style={styles.certItem}>
                <Text style={styles.certName}>{hack.name}</Text>
                {hack.description && <Text style={styles.certIssuer}> - {hack.description}</Text>}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ResumePDF;
