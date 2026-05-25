import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DEFAULT_LAYOUT_CONFIG, KNOWN_SECTIONS, normalizeLayoutConfig } from '../config/layoutSchema';
import { getSummaryPoints } from '../lib/summaryUtils';

/**
 * LayoutPreservingPDF
 * -----------------------------------------------------------------
 * react-pdf renderer that draws a resume according to a `layoutConfig`.
 * Used when `group.layoutSource === 'uploaded'` for both the in-app PDF
 * preview (PDFViewer) and `exportToPDF`.
 *
 * Props:
 *   resumeData          - merged resume content (buildFullResume)
 *   layoutConfig        - normalized layoutConfig
 *   sectionOrder        - string[]
 *   visibleSections     - string[]
 *   customSectionDefs   - [{ id, title }]
 */

// react-pdf only ships a handful of built-in fonts. Map detected family
// strings to those, falling back to Helvetica.
function resolveFont(family) {
  if (!family) return 'Helvetica';
  const f = String(family).toLowerCase();
  if (f.includes('times') || f.includes('georgia') || f.includes('garamond') || f.includes('serif')) return 'Times-Roman';
  if (f.includes('courier') || f.includes('mono')) return 'Courier';
  return 'Helvetica';
}

function fontWeightFromCfg(weight) {
  if (!weight) return 'normal';
  if (weight === 'bold' || Number(weight) >= 600) return 'bold';
  return 'normal';
}

const LayoutPreservingPDF = ({
  resumeData = {},
  layoutConfig,
  sectionOrder,
  visibleSections,
  customSectionDefs = [],
}) => {
  const cfg = normalizeLayoutConfig(layoutConfig || DEFAULT_LAYOUT_CONFIG);
  const order = sectionOrder?.length ? sectionOrder : ['summary', 'skills', 'experience', 'education', 'projects', 'certifications'];
  const visible = visibleSections?.length ? new Set(visibleSections) : new Set(order);

  // ---- font helpers ----
  const fontStyle = (key) => {
    const f = cfg.fonts[key] || {};
    return {
      fontFamily: resolveFont(f.family),
      fontSize: f.size,
      fontWeight: fontWeightFromCfg(f.weight),
      color: f.color,
      letterSpacing: f.letterSpacing || 0,
    };
  };

  // ---- styles ----
  const styles = StyleSheet.create({
    page: {
      backgroundColor: cfg.colors.background,
      color: cfg.colors.text,
      paddingTop: cfg.pageMargins.top,
      paddingRight: cfg.pageMargins.right,
      paddingBottom: cfg.pageMargins.bottom,
      paddingLeft: cfg.pageMargins.left,
      ...fontStyle('body'),
      lineHeight: cfg.spacing.lineHeight,
    },
    header: { marginBottom: cfg.spacing.sectionGap },
    headerCentered: { textAlign: 'center', alignItems: 'center' },
    headerLeft:     { textAlign: 'left' },
    headerRight:    { textAlign: 'right', alignItems: 'flex-end' },
    headerTwoCol:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    name:  { ...fontStyle('name') },
    title: { ...fontStyle('title'), marginTop: 2 },
    contactRow: { ...fontStyle('dates'), marginTop: 4 },
    section: { marginBottom: cfg.spacing.sectionGap },
    sectionTitle: {
      ...fontStyle('sectionHeader'),
      marginTop: cfg.sectionHeader.spacingTop,
      marginBottom: cfg.sectionHeader.spacingBottom,
      textTransform: cfg.sectionHeader.uppercase ? 'uppercase' : 'none',
      ...sectionTitleDecoration(cfg),
    },
    itemBlock: { marginBottom: cfg.spacing.itemGap },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    bulletList: { paddingLeft: cfg.bullets.indent, marginTop: cfg.spacing.bulletGap },
    bulletRow:  { flexDirection: 'row', marginBottom: cfg.spacing.bulletGap },
    bullet:     { width: 10 },
    bulletText: { flex: 1 },
    dates: { ...fontStyle('dates') },
    twoCol: { flexDirection: 'row' },
    leftCol: { backgroundColor: cfg.colors.sidebarBg, padding: 8, borderRadius: 2 },
    rightCol: { paddingLeft: 12 },
  });

  // ---- section renderers ----
  const renderSection = (id) => {
    if (!visible.has(id)) return null;
    if (!KNOWN_SECTIONS.has(id)) return renderCustom(id);
    switch (id) {
      case 'summary':         return renderSummary();
      case 'skills':          return renderSkills();
      case 'experience':      return renderExperienceList('experience', 'Experience');
      case 'internships':     return renderExperienceList('internships', 'Internships');
      case 'education':       return renderEducation();
      case 'projects':        return renderProjects();
      case 'certifications':  return renderCertifications();
      case 'hackathons':      return renderHackathons();
      default: return null;
    }
  };

  const renderCustom = (id) => {
    const def = customSectionDefs.find(d => d.id === id);
    const title = def?.title || id;
    const content = resumeData.customSections?.[id] || '';
    if (!content) return null;
    return (
      <View key={id} style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text>{content}</Text>
      </View>
    );
  };

  const renderSummary = () => {
    if (!resumeData.summary) return null;
    const summaryPoints = getSummaryPoints(resumeData.summary);
    return (
      <View key="summary" style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Summary</Text>
        {summaryPoints.map((point, index) => (
          <Text key={index}>• {point}</Text>
        ))}
      </View>
    );
  };

  const renderSkills = () => {
    const entries = Object.entries(resumeData.skills || {}).filter(([_, v]) => Array.isArray(v) && v.length);
    if (!entries.length) return null;
    return (
      <View key="skills" style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        {entries.map(([cat, list]) => (
          <View key={cat} style={{ flexDirection: 'row', marginBottom: cfg.spacing.bulletGap, flexWrap: 'wrap' }}>
            <Text style={{ fontWeight: 'bold', marginRight: 4 }}>{capitalize(cat)}: </Text>
            <Text style={{ flex: 1 }}>{list.join(', ')}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderExperienceList = (key, label) => {
    const items = resumeData[key] || [];
    if (!items.length) return null;
    return (
      <View key={key} style={styles.section}>
        <Text style={styles.sectionTitle}>{label}</Text>
        {items.map((exp, i) => (
          <View key={i} style={styles.itemBlock} wrap={false}>
            <View style={styles.itemHeader}>
              <Text>
                <Text style={{ fontWeight: 'bold' }}>{exp.position}</Text>
                {exp.company ? <Text> — {exp.company}</Text> : null}
              </Text>
              <Text style={styles.dates}>
                {(exp.startDate || '') + (exp.startDate || exp.endDate ? ' – ' : '') + (exp.endDate || '')}
              </Text>
            </View>
            {exp.location ? <Text style={styles.dates}>{exp.location}</Text> : null}
            {(exp.highlights || []).length > 0 && (
              <View style={styles.bulletList}>
                {(exp.highlights || []).map((h, hi) => (
                  <View key={hi} style={styles.bulletRow}>
                    <Text style={styles.bullet}>{cfg.bullets.symbol}</Text>
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

  const renderEducation = () => {
    const items = resumeData.education || [];
    if (!items.length) return null;
    return (
      <View key="education" style={styles.section}>
        <Text style={styles.sectionTitle}>Education</Text>
        {items.map((ed, i) => (
          <View key={i} style={styles.itemBlock} wrap={false}>
            <View style={styles.itemHeader}>
              <Text>
                <Text style={{ fontWeight: 'bold' }}>{ed.institution}</Text>
                {ed.degree ? <Text> — {ed.degree}</Text> : null}
              </Text>
              <Text style={styles.dates}>{ed.graduationDate || ''}</Text>
            </View>
            {ed.gpa ? <Text style={styles.dates}>GPA: {ed.gpa}</Text> : null}
          </View>
        ))}
      </View>
    );
  };

  const renderProjects = () => {
    const items = resumeData.projects || [];
    if (!items.length) return null;
    return (
      <View key="projects" style={styles.section}>
        <Text style={styles.sectionTitle}>Projects</Text>
        {items.map((pr, i) => (
          <View key={i} style={styles.itemBlock} wrap={false}>
            <Text>
              <Text style={{ fontWeight: 'bold' }}>{pr.name}</Text>
              {pr.technologies?.length ? <Text style={{ color: cfg.colors.muted }}>{` (${pr.technologies.join(', ')})`}</Text> : null}
            </Text>
            {pr.description ? <Text>{pr.description}</Text> : null}
            {(pr.highlights || []).length > 0 && (
              <View style={styles.bulletList}>
                {(pr.highlights || []).map((h, hi) => (
                  <View key={hi} style={styles.bulletRow}>
                    <Text style={styles.bullet}>{cfg.bullets.symbol}</Text>
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

  const renderCertifications = () => {
    const items = resumeData.certifications || [];
    if (!items.length) return null;
    return (
      <View key="certifications" style={styles.section}>
        <Text style={styles.sectionTitle}>Certifications</Text>
        <View style={styles.bulletList}>
          {items.map((c, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>{cfg.bullets.symbol}</Text>
              <Text style={styles.bulletText}>
                <Text style={{ fontWeight: 'bold' }}>{c.name}</Text>
                {c.issuer ? ` — ${c.issuer}` : ''}{c.date ? `, ${c.date}` : ''}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHackathons = () => {
    const items = resumeData.hackathons || [];
    if (!items.length) return null;
    return (
      <View key="hackathons" style={styles.section}>
        <Text style={styles.sectionTitle}>Hackathons</Text>
        {items.map((h, i) => (
          <View key={i} style={styles.itemBlock} wrap={false}>
            <Text>
              <Text style={{ fontWeight: 'bold' }}>{h.name}</Text>
              {h.date ? <Text style={styles.dates}> — {h.date}</Text> : null}
            </Text>
            {h.description ? <Text>{h.description}</Text> : null}
          </View>
        ))}
      </View>
    );
  };

  // ---- header ----
  const p = resumeData.personalInfo || {};
  const contactBits = [p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean);

  const renderHeader = () => {
    if (cfg.header.layout === 'twoColumn') {
      return (
        <View style={[styles.header, styles.headerTwoCol]}>
          <View>
            <Text style={styles.name}>{p.name}</Text>
            {cfg.header.showTitle && p.title ? <Text style={styles.title}>{p.title}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {contactBits.map((b, i) => <Text key={i} style={styles.dates}>{b}</Text>)}
          </View>
        </View>
      );
    }
    const alignStyle =
      cfg.header.layout === 'left'  ? styles.headerLeft :
      cfg.header.layout === 'right' ? styles.headerRight :
                                      styles.headerCentered;
    return (
      <View style={[styles.header, alignStyle]}>
        <Text style={styles.name}>{p.name}</Text>
        {cfg.header.showTitle && p.title ? <Text style={styles.title}>{p.title}</Text> : null}
        {contactBits.length > 0 && (
          cfg.header.contactStyle === 'stacked'
            ? contactBits.map((b, i) => <Text key={i} style={styles.dates}>{b}</Text>)
            : <Text style={styles.contactRow}>{contactBits.join(cfg.header.separator)}</Text>
        )}
      </View>
    );
  };

  // ---- body (1 / 2 columns) ----
  const renderBody = () => {
    if (cfg.columns === 2) {
      const left = [], right = [];
      for (const id of order) {
        (cfg.columnAssignment?.[id] === 'left' ? left : right).push(id);
      }
      return (
        <View style={styles.twoCol}>
          <View style={[styles.leftCol, { flexBasis: `${cfg.columnSplit * 100}%` }]}>
            {left.map(renderSection)}
          </View>
          <View style={[styles.rightCol, { flexBasis: `${(1 - cfg.columnSplit) * 100}%` }]}>
            {right.map(renderSection)}
          </View>
        </View>
      );
    }
    return <View>{order.map(renderSection)}</View>;
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {renderHeader()}
        {renderBody()}
      </Page>
    </Document>
  );
};

function sectionTitleDecoration(cfg) {
  switch (cfg.sectionHeader.style) {
    case 'underline':   return { borderBottomWidth: 1,   borderBottomColor: cfg.colors.primary, paddingBottom: 2 };
    case 'background':  return { backgroundColor: cfg.colors.primary, color: '#ffffff', padding: 3 };
    case 'border-left': return { borderLeftWidth: 3, borderLeftColor: cfg.colors.primary, paddingLeft: 6 };
    case 'uppercase':   return { textTransform: 'uppercase' };
    case 'plain':
    default:            return {};
  }
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

export default LayoutPreservingPDF;
