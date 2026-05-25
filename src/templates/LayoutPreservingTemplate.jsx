import React from 'react';
import ReactMarkdown from 'react-markdown';
import EditableField from '../components/editing/EditableField';
import EditableListItem from '../components/editing/EditableListItem';
import { DEFAULT_LAYOUT_CONFIG, KNOWN_SECTIONS, normalizeLayoutConfig } from '../config/layoutSchema';
import { getSummaryPoints } from '../lib/summaryUtils';

/**
 * LayoutPreservingTemplate
 * -----------------------------------------------------------------
 * HTML renderer driven entirely by a `layoutConfig` object (instead of
 * hard-coded styles). Used when the user has uploaded a resume and we
 * want to render it visually faithful to the original layout.
 *
 * Props:
 *   resumeData          - merged resume content (see buildFullResume)
 *   layoutConfig        - layoutConfig object (see config/layoutSchema)
 *   sectionOrder        - string[] of section ids (built-in or custom)
 *   visibleSections     - string[] (subset of sectionOrder) to render
 *   customSectionDefs   - [{ id, title }] for custom sections
 *   isEditMode          - if true, all leaf text becomes click-to-edit
 *   onUpdate(path, val) - called when a field is edited
 *   onListAdd(path)     - called when an "add bullet" button is pressed
 *   onListRemove(path, index)
 *   scale               - optional CSS transform scale for previews
 */
const LayoutPreservingTemplate = ({
  resumeData,
  layoutConfig,
  sectionOrder,
  visibleSections,
  customSectionDefs = [],
  isEditMode = false,
  onUpdate = () => {},
  onListAdd = () => {},
  onListRemove = () => {},
  scale = 1,
}) => {
  const cfg = normalizeLayoutConfig(layoutConfig || DEFAULT_LAYOUT_CONFIG);

  const order  = sectionOrder?.length ? sectionOrder : ['summary', 'skills', 'experience', 'education', 'projects', 'certifications'];
  const visible = visibleSections?.length ? new Set(visibleSections) : new Set(order);

  // ---------- shared style helpers ------------------------------------
  const fontStyle = (key) => {
    const f = cfg.fonts[key] || {};
    return {
      fontFamily: f.family,
      fontSize:   f.size + 'pt',
      fontWeight: f.weight,
      color:      f.color,
      letterSpacing: f.letterSpacing ? f.letterSpacing + 'pt' : undefined,
    };
  };

  const sectionTitleStyle = () => {
    const base = { ...fontStyle('sectionHeader'), marginTop: cfg.sectionHeader.spacingTop, marginBottom: cfg.sectionHeader.spacingBottom };
    if (cfg.sectionHeader.uppercase) base.textTransform = 'uppercase';
    switch (cfg.sectionHeader.style) {
      case 'underline':
        base.borderBottom = `1pt solid ${cfg.colors.primary}`;
        base.paddingBottom = 2;
        break;
      case 'background':
        base.backgroundColor = cfg.colors.primary;
        base.color = '#ffffff';
        base.padding = '3pt 6pt';
        break;
      case 'border-left':
        base.borderLeft = `3pt solid ${cfg.colors.primary}`;
        base.paddingLeft = 6;
        break;
      case 'uppercase':
        base.textTransform = 'uppercase';
        break;
      case 'plain':
      default:
        break;
    }
    return base;
  };

  const pageStyle = {
    backgroundColor: cfg.colors.background,
    color: cfg.colors.text,
    paddingTop: cfg.pageMargins.top,
    paddingRight: cfg.pageMargins.right,
    paddingBottom: cfg.pageMargins.bottom,
    paddingLeft: cfg.pageMargins.left,
    width: '8.5in',
    minHeight: '11in',
    margin: '0 auto',
    boxSizing: 'border-box',
    lineHeight: cfg.spacing.lineHeight,
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: 'top center',
    ...fontStyle('body'),
  };

  // ---------- helper: render a single section by id -------------------
  const renderSection = (sectionId) => {
    if (!visible.has(sectionId)) return null;

    if (!KNOWN_SECTIONS.has(sectionId)) {
      // Custom section (freeform markdown)
      const def = customSectionDefs.find(d => d.id === sectionId);
      const title = def?.title || sectionId;
      const content = resumeData.customSections?.[sectionId] || '';
      return (
        <section key={sectionId} style={{ marginBottom: cfg.spacing.sectionGap }}>
          <h2 style={sectionTitleStyle()}>
            {isEditMode ? (
              <EditableField
                value={title}
                onSave={(v) => onUpdate(`customSectionDefs.${customSectionDefs.findIndex(d => d.id === sectionId)}.title`, v)}
              />
            ) : title}
          </h2>
          {isEditMode ? (
            <EditableField
              multiline
              value={content}
              placeholder="Add content (markdown supported)…"
              onSave={(v) => onUpdate(`customSections.${sectionId}`, v)}
              className="block whitespace-pre-wrap"
            />
          ) : (
            <div className="prose prose-sm max-w-none" style={fontStyle('body')}>
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </section>
      );
    }

    switch (sectionId) {
      case 'summary':         return renderSummary();
      case 'skills':          return renderSkills();
      case 'experience':      return renderExperienceList('experience', 'Experience');
      case 'internships':     return renderExperienceList('internships', 'Internships');
      case 'education':       return renderEducation();
      case 'projects':        return renderProjects();
      case 'certifications':  return renderCertifications();
      case 'hackathons':      return renderHackathons();
      default:                return null;
    }
  };

  // ---------- header --------------------------------------------------
  const p = resumeData.personalInfo || {};
  const contactBits = [p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean);

  const headerAlign = cfg.header.layout === 'left' ? 'left' : cfg.header.layout === 'right' ? 'right' : 'center';

  const renderHeader = () => {
    if (cfg.header.layout === 'twoColumn') {
      return (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: cfg.spacing.sectionGap }}>
          <div>
            <h1 style={fontStyle('name')}>
              {isEditMode
                ? <EditableField value={p.name} onSave={(v) => onUpdate('personalInfo.name', v)} placeholder="Your Name" />
                : (p.name || 'Your Name')}
            </h1>
            {cfg.header.showTitle && (
              <p style={fontStyle('title')}>
                {isEditMode
                  ? <EditableField value={p.title} onSave={(v) => onUpdate('personalInfo.title', v)} placeholder="Your Title" />
                  : p.title}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right', ...fontStyle('dates') }}>
            {renderContactList('stacked')}
          </div>
        </header>
      );
    }

    return (
      <header style={{ textAlign: headerAlign, marginBottom: cfg.spacing.sectionGap }}>
        <h1 style={fontStyle('name')}>
          {isEditMode
            ? <EditableField value={p.name} onSave={(v) => onUpdate('personalInfo.name', v)} placeholder="Your Name" />
            : (p.name || 'Your Name')}
        </h1>
        {cfg.header.showTitle && (
          <p style={fontStyle('title')}>
            {isEditMode
              ? <EditableField value={p.title} onSave={(v) => onUpdate('personalInfo.title', v)} placeholder="Your Title" />
              : p.title}
          </p>
        )}
        <div style={fontStyle('dates')}>{renderContactList(cfg.header.contactStyle)}</div>
      </header>
    );
  };

  const renderContactList = (style) => {
    const fields = [
      { key: 'email',    val: p.email },
      { key: 'phone',    val: p.phone },
      { key: 'location', val: p.location },
      { key: 'linkedin', val: p.linkedin },
      { key: 'github',   val: p.github },
    ];
    const present = fields.filter(f => isEditMode || f.val);
    if (!present.length && !isEditMode) return null;

    if (style === 'stacked') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {present.map(f => (
            <span key={f.key}>
              {isEditMode
                ? <EditableField value={f.val} placeholder={f.key} onSave={(v) => onUpdate(`personalInfo.${f.key}`, v)} />
                : f.val}
            </span>
          ))}
        </div>
      );
    }

    // Row (with separators)
    return (
      <div style={{ display: 'inline' }}>
        {present.map((f, i) => (
          <React.Fragment key={f.key}>
            {i > 0 && <span style={{ color: cfg.colors.muted }}>{cfg.header.separator}</span>}
            {isEditMode
              ? <EditableField value={f.val} placeholder={f.key} onSave={(v) => onUpdate(`personalInfo.${f.key}`, v)} />
              : <span>{f.val}</span>}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ---------- summary -------------------------------------------------
  const renderSummary = () => {
    const summaryPoints = getSummaryPoints(resumeData.summary);
    return (
      <section key="summary" style={{ marginBottom: cfg.spacing.sectionGap }}>
        <h2 style={sectionTitleStyle()}>Professional Summary</h2>
        {isEditMode ? (
          <EditableField
            multiline
            value={resumeData.summary}
            onSave={(v) => onUpdate('summary', v)}
            placeholder="Enter one professional summary point per line…"
            className="block whitespace-pre-wrap"
          />
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {summaryPoints.map((point, index) => (
              <li key={index} style={{ marginBottom: 4 }}>{point}</li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  // ---------- skills --------------------------------------------------
  const renderSkills = () => {
    const skills = resumeData.skills || {};
    const entries = Object.entries(skills).filter(([_, v]) => Array.isArray(v) && v.length);
    if (!entries.length && !isEditMode) return null;

    return (
      <section key="skills" style={{ marginBottom: cfg.spacing.sectionGap }}>
        <h2 style={sectionTitleStyle()}>Skills</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: cfg.spacing.itemGap }}>
          {entries.map(([cat, list]) => (
            <div key={cat}>
              <strong style={{ marginRight: 6 }}>{capitalize(cat)}:</strong>
              {isEditMode ? (
                <EditableField
                  value={(list || []).join(', ')}
                  onSave={(v) => onUpdate(`skills.${cat}`, v.split(',').map(s => s.trim()).filter(Boolean))}
                />
              ) : (
                <span>{(list || []).join(', ')}</span>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  // ---------- experience / internships --------------------------------
  const renderExperienceList = (key, label) => {
    const items = resumeData[key] || [];
    if (!items.length && !isEditMode) return null;
    return (
      <section key={key} style={{ marginBottom: cfg.spacing.sectionGap }}>
        <h2 style={sectionTitleStyle()}>{label}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: cfg.spacing.itemGap }}>
          {items.map((exp, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <strong style={{ fontWeight: 600 }}>
                    {isEditMode
                      ? <EditableField value={exp.position} placeholder="Position" onSave={(v) => onUpdate(`${key}.${i}.position`, v)} />
                      : exp.position}
                  </strong>
                  {(exp.company || isEditMode) && (
                    <span>
                      {' — '}
                      {isEditMode
                        ? <EditableField value={exp.company} placeholder="Company" onSave={(v) => onUpdate(`${key}.${i}.company`, v)} />
                        : exp.company}
                    </span>
                  )}
                </div>
                <div style={fontStyle('dates')}>
                  {isEditMode
                    ? <EditableField value={exp.startDate} placeholder="YYYY-MM" onSave={(v) => onUpdate(`${key}.${i}.startDate`, v)} />
                    : exp.startDate}
                  {' – '}
                  {isEditMode
                    ? <EditableField value={exp.endDate} placeholder="Present" onSave={(v) => onUpdate(`${key}.${i}.endDate`, v)} />
                    : exp.endDate}
                </div>
              </div>
              {exp.location && (
                <div style={fontStyle('dates')}>
                  {isEditMode
                    ? <EditableField value={exp.location} placeholder="Location" onSave={(v) => onUpdate(`${key}.${i}.location`, v)} />
                    : exp.location}
                </div>
              )}
              <ul style={{ marginTop: cfg.spacing.itemGap, paddingLeft: cfg.bullets.indent, display: 'flex', flexDirection: 'column', gap: cfg.spacing.bulletGap, listStyle: 'none' }}>
                {(exp.highlights || []).map((h, hi) => (
                  <li key={hi}>
                    <EditableListItem
                      value={h}
                      bullet={cfg.bullets.symbol}
                      editable={isEditMode}
                      onSave={(v) => onUpdate(`${key}.${i}.highlights.${hi}`, v)}
                      onRemove={() => onListRemove(`${key}.${i}.highlights`, hi)}
                      onAddAfter={() => onListAdd(`${key}.${i}.highlights`)}
                    />
                  </li>
                ))}
                {isEditMode && (
                  <li>
                    <button
                      onClick={() => onListAdd(`${key}.${i}.highlights`)}
                      className="text-xs text-blue-600 hover:underline"
                    >+ Add bullet</button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  };

  // ---------- education -----------------------------------------------
  const renderEducation = () => {
    const items = resumeData.education || [];
    if (!items.length && !isEditMode) return null;
    return (
      <section key="education" style={{ marginBottom: cfg.spacing.sectionGap }}>
        <h2 style={sectionTitleStyle()}>Education</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: cfg.spacing.itemGap }}>
          {items.map((ed, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <strong>
                    {isEditMode
                      ? <EditableField value={ed.institution} placeholder="Institution" onSave={(v) => onUpdate(`education.${i}.institution`, v)} />
                      : ed.institution}
                  </strong>
                  {(ed.degree || isEditMode) && (
                    <span>{' — '}
                      {isEditMode
                        ? <EditableField value={ed.degree} placeholder="Degree" onSave={(v) => onUpdate(`education.${i}.degree`, v)} />
                        : ed.degree}
                    </span>
                  )}
                </div>
                <div style={fontStyle('dates')}>
                  {isEditMode
                    ? <EditableField value={ed.graduationDate} placeholder="YYYY-MM" onSave={(v) => onUpdate(`education.${i}.graduationDate`, v)} />
                    : ed.graduationDate}
                </div>
              </div>
              {(ed.gpa || isEditMode) && (
                <div style={fontStyle('dates')}>GPA:{' '}
                  {isEditMode
                    ? <EditableField value={ed.gpa} placeholder="3.8" onSave={(v) => onUpdate(`education.${i}.gpa`, v)} />
                    : ed.gpa}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  // ---------- projects ------------------------------------------------
  const renderProjects = () => {
    const items = resumeData.projects || [];
    if (!items.length && !isEditMode) return null;
    return (
      <section key="projects" style={{ marginBottom: cfg.spacing.sectionGap }}>
        <h2 style={sectionTitleStyle()}>Projects</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: cfg.spacing.itemGap }}>
          {items.map((pr, i) => (
            <div key={i}>
              <strong>
                {isEditMode
                  ? <EditableField value={pr.name} placeholder="Project name" onSave={(v) => onUpdate(`projects.${i}.name`, v)} />
                  : pr.name}
              </strong>
              {pr.technologies?.length > 0 && (
                <span style={{ color: cfg.colors.muted, marginLeft: 6, fontSize: cfg.fonts.dates.size + 'pt' }}>
                  ({(pr.technologies || []).join(', ')})
                </span>
              )}
              {(pr.description || isEditMode) && (
                <div>
                  {isEditMode
                    ? <EditableField multiline value={pr.description} placeholder="Description" onSave={(v) => onUpdate(`projects.${i}.description`, v)} />
                    : pr.description}
                </div>
              )}
              {(pr.highlights || []).length > 0 && (
                <ul style={{ marginTop: cfg.spacing.itemGap, paddingLeft: cfg.bullets.indent, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: cfg.spacing.bulletGap }}>
                  {(pr.highlights || []).map((h, hi) => (
                    <li key={hi}>
                      <EditableListItem
                        value={h}
                        bullet={cfg.bullets.symbol}
                        editable={isEditMode}
                        onSave={(v) => onUpdate(`projects.${i}.highlights.${hi}`, v)}
                        onRemove={() => onListRemove(`projects.${i}.highlights`, hi)}
                        onAddAfter={() => onListAdd(`projects.${i}.highlights`)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  // ---------- certifications -----------------------------------------
  const renderCertifications = () => {
    const items = resumeData.certifications || [];
    if (!items.length && !isEditMode) return null;
    return (
      <section key="certifications" style={{ marginBottom: cfg.spacing.sectionGap }}>
        <h2 style={sectionTitleStyle()}>Certifications</h2>
        <ul style={{ listStyle: 'none', paddingLeft: cfg.bullets.indent, display: 'flex', flexDirection: 'column', gap: cfg.spacing.bulletGap }}>
          {items.map((c, i) => (
            <li key={i}>
              <span aria-hidden style={{ marginRight: 6 }}>{cfg.bullets.symbol}</span>
              <strong>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? `, ${c.date}` : ''}
            </li>
          ))}
        </ul>
      </section>
    );
  };

  // ---------- hackathons ---------------------------------------------
  const renderHackathons = () => {
    const items = resumeData.hackathons || [];
    if (!items.length && !isEditMode) return null;
    return (
      <section key="hackathons" style={{ marginBottom: cfg.spacing.sectionGap }}>
        <h2 style={sectionTitleStyle()}>Hackathons</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: cfg.spacing.itemGap }}>
          {items.map((h, i) => (
            <div key={i}>
              <strong>{h.name}</strong>
              {h.date && <span style={fontStyle('dates')}> — {h.date}</span>}
              {h.description && <div>{h.description}</div>}
            </div>
          ))}
        </div>
      </section>
    );
  };

  // ---------- body layout (1 / 2 columns) ----------------------------
  const renderBody = () => {
    if (cfg.columns === 2) {
      const left  = [];
      const right = [];
      for (const id of order) {
        const target = cfg.columnAssignment?.[id] === 'left' ? left : right;
        target.push(id);
      }
      return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
          <div style={{ flexBasis: `${cfg.columnSplit * 100}%`, backgroundColor: cfg.colors.sidebarBg, padding: 10, borderRadius: 4 }}>
            {left.map(renderSection)}
          </div>
          <div style={{ flexBasis: `${(1 - cfg.columnSplit) * 100}%` }}>
            {right.map(renderSection)}
          </div>
        </div>
      );
    }
    return <div>{order.map(renderSection)}</div>;
  };

  return (
    <div style={pageStyle}>
      {renderHeader()}
      {renderBody()}
    </div>
  );
};

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export default LayoutPreservingTemplate;
