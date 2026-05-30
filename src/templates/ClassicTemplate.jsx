import React from 'react';
import { docsStyles, docsTheme } from '../config/docsTheme';
import { 
  HeaderSection, 
  SummarySection, 
  SkillsSection, 
  ExperienceSection, 
  EducationSection, 
  ProjectsSection, 
  CertificationsSection 
} from '../components/sections';

const ClassicTemplate = ({ resumeData, isEditMode = false, onUpdate }) => {
  return (
    <div className="w-full flex justify-center py-6" style={{ background: '#F1F3F4' }}>
      <div style={docsStyles.page} className="docs-page">
        <HeaderSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
        <SummarySection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
        <SkillsSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
        <ExperienceSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />

        {resumeData.internships?.length > 0 && (
          <section style={{ marginBottom: '12px' }}>
            <h2 style={docsStyles.sectionTitle}>Internships</h2>
            {resumeData.internships.map((intern, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <span style={{ fontWeight: 700 }}>{intern.position}</span>
                    {intern.company && <span style={{ color: '#434343' }}> · {intern.company}</span>}
                  </div>
                  <span style={{ color: '#434343', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                    {intern.duration || `${intern.startDate} – ${intern.endDate}`}
                  </span>
                </div>
                {intern.highlights?.length > 0 && (
                  <ul style={docsStyles.bulletList}>
                    {intern.highlights.map((h, hIndex) => (
                      <li key={hIndex} style={docsStyles.bulletItem}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        <EducationSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
        <ProjectsSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
        <CertificationsSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />

        {resumeData.hackathons?.length > 0 && (
          <section style={{ marginBottom: '12px' }}>
            <h2 style={docsStyles.sectionTitle}>Hackathons & Awards</h2>
            <ul style={docsStyles.bulletList}>
              {resumeData.hackathons.map((hack, index) => (
                <li key={index} style={docsStyles.bulletItem}>
                  <span style={{ fontWeight: 600 }}>{hack.name}</span>
                  {hack.description && <span> – {hack.description}</span>}
                  {hack.date && <span style={{ color: '#434343', marginLeft: '6px' }}>({hack.date})</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

export default ClassicTemplate;

