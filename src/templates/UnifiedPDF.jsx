import React, { useMemo } from 'react';
import { Document, Page, View, Text, StyleSheet, Link, Font } from '@react-pdf/renderer';
import { SECTION_LABELS, DEFAULT_SECTION_ORDER } from '../config/templates';
import { SECTION_FORMATS } from '../config/sectionFormats';
import { DEFAULT_THEME_CONFIG } from '../config/themeConfig';
import { formatDate } from '../lib/dateUtils';

// Helper to get the current format or default
const getFormat = (sectionFormats, sectionId) => {
  return sectionFormats?.[sectionId] || SECTION_FORMATS[sectionId]?.default || 'default';
};

// Create a unified PDF template that accepts a theme config
const UnifiedPDF = ({ resumeData, themeConfig = DEFAULT_THEME_CONFIG, sectionOrder, sectionFormats = {} }) => {
  const data = resumeData || {};
  
  // Use provided section order or default
  const rawSections = Array.isArray(sectionOrder) && sectionOrder.length > 0 
    ? sectionOrder 
    : DEFAULT_SECTION_ORDER;
  
  // Remove duplicates and filter valid sections
  const validSectionIds = ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'internships', 'hackathons'];
  const sections = [...new Set(rawSections)].filter(s => validSectionIds.includes(s));

  // Dynamic Styles Generator
  const styles = useMemo(() => {
    const t = themeConfig.typography || DEFAULT_THEME_CONFIG.typography;
    const s = themeConfig.spacing || DEFAULT_THEME_CONFIG.spacing;
    const c = themeConfig.colors || DEFAULT_THEME_CONFIG.colors;
    const h = themeConfig.header || DEFAULT_THEME_CONFIG.header;
    const st = themeConfig.sectionTitle || DEFAULT_THEME_CONFIG.sectionTitle;

    return StyleSheet.create({
      page: {
        padding: s.pagePadding,
        fontSize: t.fontSize,
        fontFamily: t.fontFamily,
        color: c.text,
        lineHeight: t.lineHeight,
      },
      // Header styles
      header: {
        marginBottom: s.sectionMargin * 1.5,
        paddingBottom: s.sectionMargin,
        borderBottomWidth: h.layout === 'centered' ? 0 : 2, // dynamic
        borderBottomColor: c.border,
        flexDirection: h.layout === 'twoColumn' ? 'row' : 'column',
        justifyContent: h.layout === 'twoColumn' ? 'space-between' : 'flex-start',
        alignItems: h.layout === 'centered' ? 'center' : 'flex-start',
      },
      headerContent: {
        flex: h.layout === 'twoColumn' ? 1 : undefined,
        alignItems: h.layout === 'centered' ? 'center' : 'flex-start',
      },
      name: {
        fontSize: t.fontSize * t.nameScale,
        fontWeight: h.nameBold ? 'bold' : 'normal',
        textTransform: h.nameUppercase ? 'uppercase' : 'none',
        color: c.text,
        marginBottom: 4,
        textAlign: h.layout === 'centered' ? 'center' : 'left',
      },
      title: {
        fontSize: t.fontSize * 1.1,
        color: c.secondary,
        textAlign: h.layout === 'centered' ? 'center' : 'left',
        marginTop: 2,
        marginBottom: 6,
      },
      contactContainer: {
        flexDirection: h.layout === 'twoColumn' ? 'column' : 'row',
        justifyContent: h.layout === 'centered' ? 'center' : 'flex-start',
        alignItems: h.layout === 'twoColumn' ? 'flex-end' : 'center',
        flexWrap: 'wrap',
        marginTop: 4,
        gap: h.layout === 'twoColumn' ? 2 : 4,
      },
      contactItem: {
        fontSize: t.fontSize * 0.9,
        color: c.secondary,
        paddingHorizontal: h.layout === 'twoColumn' ? 0 : 4,
        paddingVertical: 1,
      },
      contactLink: {
        fontSize: t.fontSize * 0.9,
        color: c.accent,
        textDecoration: 'none',
        paddingHorizontal: h.layout === 'twoColumn' ? 0 : 4,
      },
      contactDivider: {
        fontSize: t.fontSize * 0.9,
        color: c.border,
        display: h.layout === 'twoColumn' ? 'none' : 'flex',
      },
      // Section styles
      section: {
        marginBottom: s.sectionMargin,
      },
      sectionTitle: {
        fontSize: t.fontSize * t.headingScale,
        fontWeight: st.bold ? 'bold' : 'normal',
        textTransform: st.uppercase ? 'uppercase' : 'none',
        letterSpacing: st.uppercase ? 1 : 0,
        marginBottom: s.itemMargin,
        paddingBottom: st.border === 'bottom' ? 4 : 0,
        borderBottomWidth: st.border === 'bottom' ? 0.5 : 0,
        borderBottomColor: c.border,
        color: c.secondary, // Or accent?
        textAlign: st.align,
        backgroundColor: st.border === 'full' ? c.background : 'transparent', // Potential bg
        minPresenceAhead: 40,
      },
      // Item styles
      item: {
        marginBottom: s.itemMargin,
      },
      itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 2,
        gap: 8,
      },
      itemTitleWrap: {
        flex: 1,
      },
      itemTitle: {
        fontSize: t.fontSize,
        fontWeight: 'bold',
        color: c.text,
      },
      itemSubtitle: {
        fontSize: t.fontSize,
        color: c.secondary,
        marginTop: 1,
      },
      itemDate: {
        fontSize: t.fontSize,
        color: c.secondary,
        textAlign: 'right',
        flexShrink: 0,
        minWidth: 80,
      },
      // Bullet list styles
      bulletList: {
        marginTop: 2,
        paddingLeft: 10,
      },
      bulletItem: {
        flexDirection: 'row',
        marginBottom: 2,
        alignItems: 'flex-start',
      },
      bullet: {
        fontSize: t.fontSize,
        color: c.accent, // Accent colored bullets
        marginRight: 6,
        width: 8,
      },
      bulletText: {
        fontSize: t.fontSize,
        color: c.text,
        flex: 1,
        lineHeight: t.lineHeight,
      },
      // Skills
      skillTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
      },
      skillTag: {
        fontSize: t.fontSize * 0.9,
        backgroundColor: '#f3f4f6', // Light gray bg
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        color: c.text,
      },
      skillCategoryHeader: {
        fontSize: t.fontSize,
        fontWeight: 'bold',
        color: c.secondary,
        marginTop: 6,
        marginBottom: 2,
      },
      skillsInline: {
         fontSize: t.fontSize,
         color: c.text,
      },
      // Project Tech
      projectTech: {
        fontSize: t.fontSize * 0.85,
        color: c.secondary,
        marginTop: 2,
        fontStyle: 'italic',
      },
      // Compact
      compactItem: {
        marginBottom: s.itemMargin * 0.6,
      },
      compactItemTitle: {
        fontSize: t.fontSize,
        fontWeight: 'bold',
        color: c.text,
      },
      compactItemText: {
        fontSize: t.fontSize,
        color: c.text,
      },
      // Simple Row for education/certs
      simpleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
      },
      simpleRowLeft: {
        flex: 1,
        paddingRight: 8,
      },
      simpleRowTitle: {
         fontSize: t.fontSize,
         fontWeight: 'bold',
         color: c.text,
      },
      simpleRowSubtitle: {
        fontSize: t.fontSize,
        color: c.secondary,
      },
      simpleRowRight: {
        fontSize: t.fontSize,
        color: c.secondary,
        textAlign: 'right',
      }
    });
  }, [themeConfig]);

  // Helper: Render bullet points
  const renderBullets = (items) => {
    if (!items?.length) return null;
    const bulletChar = themeConfig.content?.bulletStyle || '•';
    
    return (
      <View style={styles.bulletList}>
        {items.map((item, i) => (
          <View key={i} style={styles.bulletItem}>
            <Text style={styles.bullet}>{bulletChar}</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    );
  };

  // HEADER
  const renderHeader = () => {
    const p = data.personalInfo || {};
    
    const contactItems = [];
    if (p.location) contactItems.push({ text: p.location, isLink: false });
    if (p.phone) contactItems.push({ text: p.phone, isLink: false });
    if (p.email) contactItems.push({ text: p.email, isLink: true, href: `mailto:${p.email}` });
    if (p.linkedin) contactItems.push({ text: 'LinkedIn', isLink: true, href: p.linkedin });
    if (p.github) contactItems.push({ text: 'GitHub', isLink: true, href: p.github });
    
    // Separator
    const separator = themeConfig.header?.contactSeparator || '|';

    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.name}>{p.name || 'Your Name'}</Text>
          {p.title && <Text style={styles.title}>{p.title}</Text>}
        </View>

        <View style={styles.contactContainer}>
          {contactItems.map((item, i) => (
            <React.Fragment key={i}>
              {item.isLink ? (
                <Link src={item.href} style={styles.contactLink}>
                  <Text>{item.text}</Text>
                </Link>
              ) : (
                <Text style={styles.contactItem}>{item.text}</Text>
              )}
              {i < contactItems.length - 1 && (
                <Text style={styles.contactDivider}>{separator}</Text>
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };


  // SUMMARY - Uses sectionFormats.summary to determine display mode
  // If 'points' mode: splits summary by newlines into bullets
  // If 'paragraph' mode: renders as single paragraph
  const renderSummary = () => {
    const summaryText = data.summary?.trim();
    if (!summaryText) return null;
    
    const format = getFormat(sectionFormats, 'summary');
    const isPointsMode = format === 'points';
    
    // Split summary by newlines for bullet points mode
    const summaryLines = summaryText.split('\n').filter(line => line.trim());
    const hasMultipleLines = summaryLines.length > 1;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS.summary}</Text>
        {isPointsMode && hasMultipleLines ? (
          renderBullets(summaryLines)
        ) : (
          <Text style={styles.summary}>{summaryText}</Text>
        )}
      </View>
    );
  };

  // SKILLS - Dynamic rendering based on whatever keys exist in skills object
  const renderSkills = () => {
    const s = data.skills || {};
    
    // Get all skill categories dynamically from the data
    const skillCategories = Object.entries(s)
      .filter(([key, items]) => Array.isArray(items) && items.length > 0)
      .map(([key, items]) => ({
        // Capitalize first letter for display label
        label: key.charAt(0).toUpperCase() + key.slice(1),
        items: items
      }));

    if (skillCategories.length === 0) return null;

    const format = getFormat(sectionFormats, 'skills');

    // Render skills based on format
    const renderSkillsContent = () => {
      switch (format) {
        case 'tags':
          // Skills as tags/badges
          return (
            <View>
              {skillCategories.map((cat, idx) => (
                <View key={idx}>
                  <Text style={styles.skillCategoryHeader}>{cat.label}</Text>
                  <View style={styles.skillTagsContainer}>
                    {cat.items.map((skill, i) => (
                      <Text key={i} style={styles.skillTag}>{skill}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          );
        
        case 'inline':
          // All skills inline, no categories
          const allSkills = skillCategories.flatMap(cat => cat.items);
          return <Text style={styles.skillsInline}>{allSkills.join(' • ')}</Text>;
        
        case 'grouped-inline':
          // Categories with inline skills
          return (
            <View style={styles.skillsContainer}>
              {skillCategories.map((cat, idx) => (
                <Text key={idx} style={{ ...styles.skillText, marginBottom: 2 }}>
                  <Text style={styles.skillLabel}>{cat.label}: </Text>
                  {cat.items.join(' • ')}
                </Text>
              ))}
            </View>
          );
        
        case 'two-column':
          // Two-column layout
          const halfPoint = Math.ceil(skillCategories.length / 2);
          const leftCats = skillCategories.slice(0, halfPoint);
          const rightCats = skillCategories.slice(halfPoint);
          return (
            <View style={styles.skillsTwoColumn}>
              <View style={styles.skillsColumn}>
                {leftCats.map((cat, idx) => (
                  <Text key={idx} style={styles.skillInlineRow}>
                    <Text style={styles.skillLabel}>{cat.label}: </Text>
                    <Text>{cat.items.join(', ')}</Text>
                  </Text>
                ))}
              </View>
              <View style={styles.skillsColumn}>
                {rightCats.map((cat, idx) => (
                  <Text key={idx} style={styles.skillInlineRow}>
                    <Text style={styles.skillLabel}>{cat.label}: </Text>
                    <Text>{cat.items.join(', ')}</Text>
                  </Text>
                ))}
              </View>
            </View>
          );
        
        case 'categorized':
        default:
          // Default: categorized with label: skills format (inline text to avoid overlap)
          return (
            <View style={styles.skillsContainer}>
              {skillCategories.map((cat, idx) => (
                <Text key={idx} style={styles.skillInlineRow}>
                  <Text style={styles.skillLabel}>{cat.label}: </Text>
                  <Text style={styles.skillText}>{cat.items.join(', ')}</Text>
                </Text>
              ))}
            </View>
          );
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS.skills}</Text>
        {renderSkillsContent()}
      </View>
    );
  };

  // EXPERIENCE
  const renderExperience = () => {
    if (!data.experience?.length) return null;
    
    const format = getFormat(sectionFormats, 'experience');
    
    // Render experience based on format
    const renderExperienceContent = () => {
      switch (format) {
        case 'compact':
          // Compact: no bullets, just key info
          return data.experience.map((exp, idx) => (
            <View key={idx} style={styles.compactItem}>
              <View style={styles.itemRow}>
                <Text style={styles.compactItemTitle}>
                  {exp.position} at {exp.company}
                </Text>
                <Text style={styles.itemDate}>
                  {formatDate(exp.startDate)} – {formatDate(exp.endDate) || 'Present'}
                </Text>
              </View>
              {exp.highlights?.length > 0 && (
                <Text style={styles.compactItemText}>
                  {exp.highlights.slice(0, 2).join(' • ')}
                </Text>
              )}
            </View>
          ));
        
        case 'detailed':
        default:
          // Default detailed format with bullets
          return data.experience.map((exp, idx) => (
            <View key={idx} style={styles.item}>
              <View style={styles.itemHeader}>
                <View style={styles.itemRow}>
                  <View style={styles.itemTitleWrap}>
                    <Text style={styles.itemTitle}>{exp.position}</Text>
                    <Text style={styles.itemSubtitle}>
                      {exp.company}{exp.location ? `, ${exp.location}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.itemDate}>
                    {formatDate(exp.startDate)} – {formatDate(exp.endDate) || 'Present'}
                  </Text>
                </View>
              </View>
              {renderBullets(exp.highlights)}
            </View>
          ));
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS.experience}</Text>
        {renderExperienceContent()}
      </View>
    );
  };

  // EDUCATION
  const renderEducation = () => {
    if (!data.education?.length) return null;
    
    const format = getFormat(sectionFormats, 'education');
    
    // Render education based on format
    const renderEducationContent = () => {
      switch (format) {
        case 'compact':
          return data.education.map((edu, idx) => (
            <View key={idx} style={styles.simpleRow}>
              <View style={styles.simpleRowLeft}>
                <Text style={styles.simpleRowTitle}>
                  {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                </Text>
                <Text style={styles.simpleRowSubtitle}>
                  {edu.institution}{edu.gpa ? ` • GPA: ${edu.gpa}` : ''}
                </Text>
              </View>
              <Text style={styles.simpleRowRight}>{formatDate(edu.graduationDate)}</Text>
            </View>
          ));
        
        case 'detailed':
        default:
          return data.education.map((edu, idx) => (
            <View key={idx} style={styles.item}>
              <View style={styles.itemRow}>
                <View style={styles.itemTitleWrap}>
                  <Text style={styles.itemTitle}>
                    {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                  </Text>
                  <Text style={styles.itemSubtitle}>{edu.institution}</Text>
                </View>
                <Text style={styles.itemDate}>{formatDate(edu.graduationDate)}</Text>
              </View>
              {edu.gpa && (
                <Text style={styles.itemSubtitle}>GPA: {edu.gpa}</Text>
              )}
              {renderBullets(edu.highlights)}
            </View>
          ));
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS.education}</Text>
        {renderEducationContent()}
      </View>
    );
  };

  // PROJECTS
  const renderProjects = () => {
    if (!data.projects?.length) return null;
    
    const format = getFormat(sectionFormats, 'projects');
    
    const renderProjectsContent = () => {
      switch (format) {
        case 'compact':
          return data.projects.map((proj, idx) => (
            <View key={idx} style={styles.compactItem}>
              <View style={styles.itemRow}>
                <Text style={styles.compactItemTitle}>{proj.name}</Text>
                {proj.technologies?.length > 0 && (
                  <Text style={styles.itemDate}>
                    {proj.technologies.slice(0, 3).join(' • ')}
                  </Text>
                )}
              </View>
              {proj.description && (
                <Text style={styles.compactItemText}>{proj.description}</Text>
              )}
            </View>
          ));
        
        case 'detailed':
        default:
          return data.projects.map((proj, idx) => (
            <View key={idx} style={styles.item}>
              <View style={styles.itemRow}>
                <View style={styles.itemTitleWrap}>
                  <Text style={styles.itemTitle}>{proj.name}</Text>
                </View>
                {proj.technologies?.length > 0 && (
                  <Text style={styles.itemDate}>
                    {proj.technologies.slice(0, 4).join(' • ')}
                  </Text>
                )}
              </View>
              {proj.description && (
                <Text style={styles.itemSubtitle}>{proj.description}</Text>
              )}
              {renderBullets(proj.highlights)}
              {proj.technologies?.length > 4 && (
                <Text style={styles.projectTech}>
                  Also: {proj.technologies.slice(4).join(', ')}
                </Text>
              )}
            </View>
          ));
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS.projects}</Text>
        {renderProjectsContent()}
      </View>
    );
  };

  // CERTIFICATIONS
  const renderCertifications = () => {
    if (!data.certifications?.length) return null;
    
    const format = getFormat(sectionFormats, 'certifications');
    
    const renderCertificationsContent = () => {
      switch (format) {
        case 'inline':
          // All certs in one line
          return (
            <Text style={styles.compactItemText}>
              {data.certifications.map(c => `${c.name} (${c.issuer})`).join(' • ')}
            </Text>
          );
        
        case 'list':
        default:
          return data.certifications.map((cert, idx) => (
            <View key={idx} style={styles.simpleRow}>
              <View style={styles.simpleRowLeft}>
                <Text style={styles.simpleRowTitle}>{cert.name}</Text>
              </View>
              <Text style={styles.simpleRowRight}>
                {cert.issuer}{cert.date ? ` • ${cert.date}` : ''}
              </Text>
            </View>
          ));
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS.certifications}</Text>
        {renderCertificationsContent()}
      </View>
    );
  };

  // INTERNSHIPS
  const renderInternships = () => {
    if (!data.internships?.length) return null;
    
    const format = getFormat(sectionFormats, 'internships');
    
    const renderInternshipsContent = () => {
      switch (format) {
        case 'compact':
          return data.internships.map((intern, idx) => (
            <View key={idx} style={styles.compactItem}>
              <View style={styles.itemRow}>
                <Text style={styles.compactItemTitle}>
                  {intern.position} at {intern.company}
                </Text>
                <Text style={styles.itemDate}>
                  {intern.duration || `${formatDate(intern.startDate)} – ${formatDate(intern.endDate)}`}
                </Text>
              </View>
              {intern.highlights?.length > 0 && (
                <Text style={styles.compactItemText}>
                  {intern.highlights.slice(0, 2).join(' • ')}
                </Text>
              )}
            </View>
          ));
        
        case 'detailed':
        default:
          return data.internships.map((intern, idx) => (
            <View key={idx} style={styles.item}>
              <View style={styles.itemRow}>
                <View style={styles.itemTitleWrap}>
                  <Text style={styles.itemTitle}>{intern.position}</Text>
                  <Text style={styles.itemSubtitle}>
                    {intern.company}{intern.location ? `, ${intern.location}` : ''}
                  </Text>
                </View>
                <Text style={styles.itemDate}>
                  {intern.duration || `${formatDate(intern.startDate)} – ${formatDate(intern.endDate)}`}
                </Text>
              </View>
              {renderBullets(intern.highlights)}
            </View>
          ));
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS.internships}</Text>
        {renderInternshipsContent()}
      </View>
    );
  };

  // HACKATHONS
  const renderHackathons = () => {
    if (!data.hackathons?.length) return null;
    
    const format = getFormat(sectionFormats, 'hackathons');
    
    const renderHackathonsContent = () => {
      switch (format) {
        case 'inline':
          return (
            <Text style={styles.compactItemText}>
              {data.hackathons.map(h => `${h.name}${h.description ? ` - ${h.description}` : ''}`).join(' • ')}
            </Text>
          );
        
        case 'list':
        default:
          return data.hackathons.map((hack, idx) => (
            <View key={idx} style={styles.simpleRow}>
              <View style={styles.simpleRowLeft}>
                <Text style={styles.simpleRowTitle}>{hack.name}</Text>
                {hack.description && (
                  <Text style={styles.simpleRowSubtitle}>{hack.description}</Text>
                )}
              </View>
              {hack.date && (
                <Text style={styles.simpleRowRight}>{hack.date}</Text>
              )}
            </View>
          ));
      }
    };

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS.hackathons}</Text>
        {renderHackathonsContent()}
      </View>
    );
  };

  // Section render map
  const sectionRenderers = {
    summary: renderSummary,
    skills: renderSkills,
    experience: renderExperience,
    education: renderEducation,
    projects: renderProjects,
    certifications: renderCertifications,
    internships: renderInternships,
    hackathons: renderHackathons,
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {renderHeader()}
        {sections.map((sectionId) => {
          const renderer = sectionRenderers[sectionId];
          return renderer ? <React.Fragment key={sectionId}>{renderer()}</React.Fragment> : null;
        })}
      </Page>
    </Document>
  );
};

export default UnifiedPDF;
