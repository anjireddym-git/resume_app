import React from 'react';
import { webClasses } from '../../styles/theme';

export const ProjectsSection = ({ data }) => {
  if (!data?.projects?.length) return null;

  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Projects</h2>
      {data.projects.map((project, index) => (
        <div key={index} className="mb-3">
          <div className="flex justify-between items-baseline">
            <span className="font-semibold text-gray-800">{project.name}</span>
            {project.date && <span className="text-sm text-gray-700 whitespace-nowrap ml-4">{project.date}</span>}
          </div>
          {project.technologies?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {project.technologies.map((tech, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-900 rounded">{tech}</span>
              ))}
            </div>
          )}
          {project.description && <p className="text-sm text-gray-900 mt-1">{project.description}</p>}
          {project.highlights?.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-sm text-gray-900">
              {project.highlights.map((h, hIndex) => (
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
  );
};

export default ProjectsSection;
