// Section component registry
// Exports both web and PDF versions of each section

export { HeaderSection, HeaderSectionPDF } from './HeaderSection';
export { SummarySection, SummarySectionPDF } from './SummarySection';
export { SkillsSection, SkillsSectionPDF } from './SkillsSection';
export { ExperienceSection, ExperienceSectionPDF } from './ExperienceSection';
export { EducationSection, EducationSectionPDF } from './EducationSection';
export { ProjectsSection, ProjectsSectionPDF } from './ProjectsSection';
export { CertificationsSection, CertificationsSectionPDF } from './CertificationsSection';

// Section order configuration
export const defaultSectionOrder = [
  'header',
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
];

// Section metadata for UI
export const sectionMeta = {
  header: { label: 'Header', required: true, editable: true },
  summary: { label: 'Summary', required: false, editable: true },
  skills: { label: 'Technical Skills', required: false, editable: true },
  experience: { label: 'Experience', required: false, editable: true },
  education: { label: 'Education', required: false, editable: true },
  projects: { label: 'Projects', required: false, editable: true },
  certifications: { label: 'Certifications', required: false, editable: true },
  internships: { label: 'Internships', required: false, editable: true },
  hackathons: { label: 'Hackathons & Awards', required: false, editable: true },
};
