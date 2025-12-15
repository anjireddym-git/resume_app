import React from 'react';
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
    <div 
      className="bg-white max-w-[8.5in] mx-auto px-10 py-8"
      style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '10pt', lineHeight: '1.45' }}
    >
      <HeaderSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
      <SummarySection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
      <SkillsSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
      <ExperienceSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />

      {/* Internships - inline for now */}
      {resumeData.internships?.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 pb-1 border-b-2 border-gray-200">
            Internships
          </h2>
          {resumeData.internships.map((intern, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="font-semibold text-gray-800">{intern.position}</span>
                  {intern.company && <span className="text-gray-600"> · {intern.company}</span>}
                </div>
                <span className="text-sm text-gray-700 whitespace-nowrap ml-4">
                  {intern.duration || `${intern.startDate} – ${intern.endDate}`}
                </span>
              </div>
              {intern.highlights?.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-sm text-gray-900">
                  {intern.highlights.map((h, hIndex) => (
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
      )}

      <EducationSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
      <ProjectsSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />
      <CertificationsSection data={resumeData} isEditMode={isEditMode} onUpdate={onUpdate} />

      {/* Hackathons & Awards */}
      {resumeData.hackathons?.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 pb-1 border-b-2 border-gray-200">
            Hackathons & Awards
          </h2>
          <div className="space-y-1.5">
            {resumeData.hackathons.map((hack, index) => (
              <div key={index} className="flex items-start text-sm text-gray-900">
                <span className="mr-2">•</span>
                <div>
                  <span className="font-medium">{hack.name}</span>
                  {hack.description && <span className="text-gray-800"> – {hack.description}</span>}
                  {hack.date && <span className="text-gray-700 ml-2 text-xs">({hack.date})</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ClassicTemplate;
