const SHARED_EXPERIENCE_FIELDS = ['position', 'company', 'location', 'startDate', 'endDate'];

const normalizeComparable = (value) => String(value ?? '');

export function buildCustomExperienceForSave(experience = [], sharedExperience = []) {
  return (experience || []).map((exp = {}, index) => {
    const sharedExp = sharedExperience?.[index] || null;
    const customExp = {
      highlights: Array.isArray(exp.highlights) ? exp.highlights : [],
      environment: exp.environment || '',
    };

    for (const field of SHARED_EXPERIENCE_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(exp, field)) continue;
      const value = exp[field] ?? '';
      const sharedValue = sharedExp?.[field] ?? '';
      if (!sharedExp || normalizeComparable(value) !== normalizeComparable(sharedValue)) {
        customExp[field] = value;
      }
    }

    return customExp;
  });
}

const ensureArray = (value) => Array.isArray(value) ? value : [];

export function buildResumeCustomDataForSave(resumeData = {}, group = {}) {
  return {
    personalInfo: resumeData.personalInfo || {},
    summary: resumeData.summary || '',
    experience: buildCustomExperienceForSave(
      resumeData.experience || [],
      group?.sharedData?.experience || []
    ),
    education: ensureArray(resumeData.education),
    educationOverride: true,
    skills: resumeData.skills || {},
    projects: ensureArray(resumeData.projects),
    certifications: ensureArray(resumeData.certifications),
    internships: ensureArray(resumeData.internships),
    hackathons: ensureArray(resumeData.hackathons),
    customSections: resumeData.customSections || {},
  };
}
