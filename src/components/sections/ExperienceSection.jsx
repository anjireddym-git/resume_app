import React from 'react';
import { webClasses } from '../../styles/theme';

export const ExperienceSection = ({ data }) => {
  if (!data?.experience?.length) return null;

  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Experience</h2>
      {data.experience.map((exp, index) => (
        <div key={index} className="mb-4">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="font-semibold text-gray-800">{exp.position}</span>
              {exp.company && <span className="text-gray-600"> · {exp.company}</span>}
              {exp.location && <span className="text-gray-400"> · {exp.location}</span>}
            </div>
            <span className="text-sm text-gray-700 whitespace-nowrap ml-4">
              {exp.startDate} – {exp.endDate || 'Present'}
            </span>
          </div>
          {exp.highlights?.length > 0 && (
            <ul className="mt-1.5 space-y-1 text-sm text-gray-900">
              {exp.highlights.map((highlight, hIndex) => (
                <li key={hIndex} className="flex">
                  <span className="mr-2">•</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          )}
          {exp.environment && (
            <p className="text-xs text-gray-700 mt-2 inline-block px-2 py-1 rounded border border-gray-200">
              <span className="font-medium">Environment:</span> {exp.environment}
            </p>
          )}
        </div>
      ))}
    </section>
  );
};

export default ExperienceSection;
