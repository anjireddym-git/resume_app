import React from 'react';
import { webClasses } from '../../styles/theme';
import { EditableField } from '../editing';
import { getSummaryPoints } from '../../lib/summaryUtils';

export const SummarySection = ({ data, onUpdate, isEditMode = false }) => {
  if (!data?.summary && !isEditMode) return null;
  const summaryPoints = getSummaryPoints(data?.summary);

  return (
    <section className="mb-4">
      <h2 className={webClasses.sectionTitle}>Professional Summary</h2>
      {isEditMode ? (
        <EditableField
          value={data?.summary}
          onSave={(value) => onUpdate?.('summary', value)}
          placeholder="Enter one professional summary point per line..."
          className="text-gray-900 leading-relaxed block w-full"
          multiline
        />
      ) : (
        <ul className="list-disc pl-5 text-gray-900 leading-relaxed space-y-1">
          {summaryPoints.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default SummarySection;
