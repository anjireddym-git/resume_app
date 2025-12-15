import React from 'react';
import { View, Text, Link, StyleSheet } from '@react-pdf/renderer';
import { colors, webClasses, pdfStyles } from '../../styles/theme';
import { EditableField } from '../editing';

// PDF Styles
const styles = StyleSheet.create({
  header: {
    marginBottom: 14,
  },
  name: pdfStyles.name,
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  contactItem: {
    fontSize: 9,
    color: colors.text.muted,
    marginRight: 8,
  },
  contactLink: {
    fontSize: 9,
    color: colors.accent.primary,
    textDecoration: 'none',
    marginRight: 8,
  },
});

// Web Component (with optional editing)
export const HeaderSection = ({ data, onUpdate, isEditMode = false }) => {
  const personal = data?.personalInfo || {};
  
  const handleFieldUpdate = (field, value) => {
    if (onUpdate) {
      onUpdate(`personalInfo.${field}`, value);
    }
  };
  
  return (
    <header className="mb-5">
      <h1 className={webClasses.name}>
        {isEditMode ? (
          <EditableField
            value={personal.name}
            onSave={(value) => handleFieldUpdate('name', value)}
            placeholder="Your Name"
            className="text-3xl font-semibold text-gray-800"
          />
        ) : (
          personal.name || 'Your Name'
        )}
      </h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-gray-600">
        {isEditMode ? (
          <>
            <EditableField
              value={personal.location}
              onSave={(value) => handleFieldUpdate('location', value)}
              placeholder="Location"
              className="text-sm"
            />
            <span className="text-gray-300">•</span>
            <EditableField
              value={personal.phone}
              onSave={(value) => handleFieldUpdate('phone', value)}
              placeholder="Phone"
              className="text-sm"
            />
            <span className="text-gray-300">•</span>
            <EditableField
              value={personal.email}
              onSave={(value) => handleFieldUpdate('email', value)}
              placeholder="Email"
              className="text-sm text-blue-600"
            />
            <span className="text-gray-300">•</span>
            <EditableField
              value={personal.linkedin}
              onSave={(value) => handleFieldUpdate('linkedin', value)}
              placeholder="LinkedIn"
              className="text-sm text-blue-600"
            />
            <span className="text-gray-300">•</span>
            <EditableField
              value={personal.github}
              onSave={(value) => handleFieldUpdate('github', value)}
              placeholder="GitHub"
              className="text-sm text-blue-600"
            />
          </>
        ) : (
          <>
            {personal.location && <span>{personal.location}</span>}
            {personal.phone && (
              <>
                <span className="text-gray-300">•</span>
                <span>{personal.phone}</span>
              </>
            )}
            {personal.email && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-blue-600">{personal.email}</span>
              </>
            )}
            {personal.linkedin && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-blue-600">{personal.linkedin}</span>
              </>
            )}
            {personal.github && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-blue-600">{personal.github}</span>
              </>
            )}
          </>
        )}
      </div>
    </header>
  );
};

// PDF Component (no editing)
export const HeaderSectionPDF = ({ data }) => {
  const personal = data?.personalInfo || {};
  
  return (
    <View style={styles.header}>
      <Text style={styles.name}>{personal.name || 'Your Name'}</Text>
      <View style={styles.contactRow}>
        {personal.location && (
          <Text style={styles.contactItem}>{personal.location}</Text>
        )}
        {personal.phone && (
          <Text style={styles.contactItem}>| {personal.phone}</Text>
        )}
        {personal.email && (
          <Link src={`mailto:${personal.email}`} style={styles.contactLink}>
            | {personal.email}
          </Link>
        )}
        {personal.linkedin && (
          <Link 
            src={personal.linkedin.startsWith('http') ? personal.linkedin : `https://${personal.linkedin}`} 
            style={styles.contactLink}
          >
            | LinkedIn
          </Link>
        )}
        {personal.github && (
          <Link 
            src={personal.github.startsWith('http') ? personal.github : `https://${personal.github}`} 
            style={styles.contactLink}
          >
            | GitHub
          </Link>
        )}
      </View>
    </View>
  );
};

export default HeaderSection;
