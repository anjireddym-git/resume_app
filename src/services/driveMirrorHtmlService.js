import { formatDate } from '../lib/dateUtils';
import { getSummaryPoints } from '../lib/summaryUtils';

const HTML_MIME = 'text/html; charset=UTF-8';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSkillLabel(key) {
  return String(key || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateRange(start, end) {
  const s = formatDate(start);
  const e = end ? formatDate(end) : 'Present';
  if (!s && !e) return '';
  if (!s) return e;
  if (!e) return s;
  return `${s} - ${e}`;
}

function section(title, content) {
  if (!content) return '';
  return `<h2>${escapeHtml(title)}</h2>${content}`;
}

function list(items) {
  const rows = (items || []).filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return rows ? `<ul>${rows}</ul>` : '';
}

function itemHeader(left, right) {
  const rightHtml = right ? `<span class="date">${escapeHtml(right)}</span>` : '';
  return `<p class="item-header"><strong>${escapeHtml(left)}</strong>${rightHtml}</p>`;
}

function renderSummary(resumeData) {
  return section('Professional Summary', list(getSummaryPoints(resumeData.summary || '')));
}

function renderSkills(resumeData) {
  const skills = resumeData.skills || {};
  const rows = Object.entries(skills)
    .filter(([, items]) => Array.isArray(items))
    .map(([key, items]) => ({
      label: formatSkillLabel(key),
      values: items.filter((item) => item && String(item).trim()),
    }))
    .filter((category) => category.values.length)
    .map(({ label, values }) => (
      `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(values.join(' - '))}</p>`
    ))
    .join('');

  return section('Technical Skills', rows);
}

function renderExperience(resumeData) {
  const rows = (resumeData.experience || []).map((exp) => {
    const left = [exp.position || 'Role', exp.company, exp.location].filter(Boolean).join(' | ');
    const details = [
      itemHeader(left, formatDateRange(exp.startDate, exp.endDate)),
      list(exp.highlights),
      exp.environment ? `<p class="environment"><em>Environment: ${escapeHtml(exp.environment)}</em></p>` : '',
    ].join('');
    return `<div class="item">${details}</div>`;
  }).join('');

  return section('Professional Experience', rows);
}

function renderInternships(resumeData) {
  const rows = (resumeData.internships || []).map((intern) => {
    const left = [intern.position || 'Intern', intern.company].filter(Boolean).join(' | ');
    const date = intern.duration || formatDateRange(intern.startDate, intern.endDate);
    return `<div class="item">${itemHeader(left, date)}${list(intern.highlights)}</div>`;
  }).join('');

  return section('Internships', rows);
}

function renderEducation(resumeData) {
  const rows = (resumeData.education || []).map((edu) => {
    const degree = edu.field ? `${edu.degree} in ${edu.field}` : edu.degree;
    const meta = [edu.institution, edu.location, edu.gpa ? `GPA: ${edu.gpa}` : null].filter(Boolean).join(' | ');
    return [
      '<div class="item">',
      itemHeader(degree || 'Degree', formatDate(edu.graduationDate)),
      meta ? `<p>${escapeHtml(meta)}</p>` : '',
      '</div>',
    ].join('');
  }).join('');

  return section('Education', rows);
}

function renderProjects(resumeData) {
  const rows = (resumeData.projects || []).map((project) => {
    const details = [
      itemHeader(project.name || 'Project', project.date || ''),
      project.link ? `<p><a href="${escapeHtml(project.link)}">${escapeHtml(project.link)}</a></p>` : '',
      project.technologies?.length ? `<p>${escapeHtml(project.technologies.join(' - '))}</p>` : '',
      project.description ? `<p>${escapeHtml(project.description)}</p>` : '',
      list(project.highlights),
    ].join('');
    return `<div class="item">${details}</div>`;
  }).join('');

  return section('Projects', rows);
}

function renderCertifications(resumeData) {
  const items = (resumeData.certifications || []).map((cert) => (
    [cert.name, cert.issuer ? `- ${cert.issuer}` : null, cert.date ? `(${cert.date})` : null]
      .filter(Boolean)
      .join(' ')
  ));
  return section('Certifications', list(items));
}

function renderHackathons(resumeData) {
  const items = (resumeData.hackathons || []).map((hack) => (
    [hack.name, hack.description ? `- ${hack.description}` : null, hack.date ? `(${hack.date})` : null]
      .filter(Boolean)
      .join(' ')
  ));
  return section('Hackathons & Awards', list(items));
}

const renderers = {
  summary: renderSummary,
  skills: renderSkills,
  experience: renderExperience,
  internships: renderInternships,
  education: renderEducation,
  projects: renderProjects,
  certifications: renderCertifications,
  hackathons: renderHackathons,
};

export function generateDriveMirrorHtml(resumeData, sectionOrder) {
  if (!resumeData) throw new Error('Resume data not found');

  const personal = resumeData.personalInfo || {};
  const order = sectionOrder || [
    'summary', 'skills', 'experience', 'internships',
    'education', 'projects', 'certifications', 'hackathons',
  ];
  const contact = [
    personal.location,
    personal.phone,
    personal.email,
    personal.linkedin,
    personal.github,
  ].filter(Boolean).map(escapeHtml).join(' &bull; ');

  const body = order
    .map((sectionId) => renderers[sectionId]?.(resumeData) || '')
    .filter(Boolean)
    .join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(personal.name || 'Resume')}</title>
  <style>
    @page { margin: 1in; }
    body { font-family: Arial, sans-serif; color: #000; font-size: 11pt; line-height: 1.15; }
    h1 { font-size: 22pt; margin: 0 0 4pt; }
    h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: 1.2pt; border-bottom: 1px solid #000; margin: 12pt 0 6pt; padding-bottom: 2pt; }
    p { margin: 0 0 5pt; }
    ul { margin: 0 0 6pt 18pt; padding: 0; }
    li { margin: 0 0 3pt; }
    a { color: #1155cc; }
    .contact { color: #434343; font-size: 10pt; margin-bottom: 10pt; }
    .item { margin-bottom: 6pt; }
    .item-header { clear: both; margin-top: 5pt; }
    .date { float: right; color: #434343; font-size: 9pt; }
    .environment { color: #434343; font-size: 8.5pt; }
  </style>
</head>
<body>
  <h1>${escapeHtml(personal.name || 'Your Name')}</h1>
  ${contact ? `<p class="contact">${contact}</p>` : ''}
  ${body}
</body>
</html>`;
}

export function generateDriveMirrorHtmlBlob(resumeData, sectionOrder) {
  return new Blob([generateDriveMirrorHtml(resumeData, sectionOrder)], { type: HTML_MIME });
}
