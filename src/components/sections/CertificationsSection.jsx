import React from 'react';
import { webClasses } from '../../styles/theme';

export const CertificationsSection = ({ data }) => {
  if (!data?.certifications?.length) return null;

  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Certifications</h2>
      <div className="space-y-1.5">
        {data.certifications.map((cert, index) => (
          <div key={index} className="flex items-center text-sm">
            <span className="text-gray-900 mr-2">•</span>
            <span className="font-medium text-gray-900">{cert.name}</span>
            {cert.issuer && <span className="text-gray-800 ml-1">– {cert.issuer}</span>}
            {cert.date && <span className="text-gray-700 ml-2 text-xs">({cert.date})</span>}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CertificationsSection;
