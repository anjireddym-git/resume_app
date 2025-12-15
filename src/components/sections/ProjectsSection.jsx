import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { colors, pdfStyles, webClasses } from '../../styles/theme';

// PDF Styles
const styles = StyleSheet.create({
  section: pdfStyles.section,
  sectionTitle: pdfStyles.sectionTitle,
  projectItem: {
    marginBottom: 6,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  projectName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  projectDate: {
    fontSize: 9,
    color: colors.text.light,
  },
  projectTech: {
    fontSize: 8,
    color: colors.text.muted,
    marginTop: 1,
  },
  projectDesc: {
    fontSize: 9,
    color: colors.text.muted,
    marginTop: 1,
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
});

// Web Component
export const ProjectsSection = ({ data }) => {
  if (!data?.projects?.length) return null;
  
  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Projects</h2>
      {data.projects.map((project, index) => (
        <div key={index} className="mb-3">
          <div className="flex justify-between items-baseline">
            <span className="font-semibold text-gray-800">{project.name}</span>
            {project.date && (
              <span className="text-sm text-gray-700 whitespace-nowrap ml-4">{project.date}</span>
            )}
          </div>
          {project.technologies?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {project.technologies.map((tech, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-900 rounded">
                  {tech}
                </span>
              ))}
            </div>
          )}
          {project.description && (
            <p className="text-sm text-gray-900 mt-1">{project.description}</p>
          )}
          {project.highlights?.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-sm text-gray-900">
              {project.highlights.map((h, hIndex) => (
                <li key={hIndex} className="flex">
                  <span className="mr-2">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
};

// PDF Component
export const ProjectsSectionPDF = ({ data }) => {
  if (!data?.projects?.length) return null;
  
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Projects</Text>
      {data.projects.map((project, idx) => (
        <View key={idx} style={styles.projectItem}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectName}>{project.name}</Text>
            {project.date && <Text style={styles.projectDate}>{project.date}</Text>}
          </View>
          {project.technologies?.length > 0 && (
            <Text style={styles.projectTech}>{project.technologies.join(', ')}</Text>
          )}
          {project.description && (
            <Text style={styles.projectDesc}>{project.description}</Text>
          )}
          {project.highlights?.filter(h => h && h.trim()).length > 0 && (
            <View style={styles.bulletList}>
              {project.highlights.filter(h => h && h.trim()).map((h, i) => (
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
  );
};

export default ProjectsSection;
