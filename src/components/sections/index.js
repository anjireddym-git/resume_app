export { HeaderSection } from './HeaderSection';
export { SummarySection } from './SummarySection';
export { SkillsSection } from './SkillsSection';
export { ExperienceSection } from './ExperienceSection';
export { EducationSection } from './EducationSection';
export { ProjectsSection } from './ProjectsSection';
export { CertificationsSection } from './CertificationsSection';

export const defaultSectionOrder = [
  'header', 'summary', 'skills', 'experience', 'education', 'projects', 'certifications',
];

export const sectionMeta = {
  header:         { label: 'Header',               required: true,  editable: true },
  summary:        { label: 'Professional Summary', required: false, editable: true },
  skills:         { label: 'Technical Skills',     required: false, editable: true },
  experience:     { label: 'Experience',           required: false, editable: true },
  education:      { label: 'Education',            required: false, editable: true },
  projects:       { label: 'Projects',             required: false, editable: true },
  certifications: { label: 'Certifications',       required: false, editable: true },
  internships:    { label: 'Internships',          required: false, editable: true },
  hackathons:     { label: 'Hackathons & Awards',  required: false, editable: true },
};
