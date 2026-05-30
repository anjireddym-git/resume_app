import React from 'react';
import { webClasses } from '../../styles/theme';

export const EducationSection = ({ data }) => {
  if (!data?.education?.length) return null;

  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Education</h2>
      {data.education.map((edu, index) => (
        <div key={index} className="mb-2">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="font-semibold text-gray-800">{edu.degree}</span>
              {edu.field && <span className="text-gray-600"> in {edu.field}</span>}
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap ml-4">{edu.graduationDate}</span>
          </div>
          <div className="text-sm text-gray-800">
            {edu.institution}
            {edu.location && <span className="text-gray-700"> · {edu.location}</span>}
            {edu.gpa && (
              <span className="ml-2 px-1.5 py-0.5 bg-emerald-200 text-emerald-900 text-xs rounded">
                GPA: {edu.gpa}
              </span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};

export default EducationSection;
