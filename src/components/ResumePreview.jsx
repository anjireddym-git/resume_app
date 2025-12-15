import React from 'react';
import { getTemplate } from '../templates';

const ResumePreview = ({ resumeData, templateId = 'classic', isEditMode = false, onUpdate }) => {
  const template = getTemplate(templateId);
  const TemplateComponent = template.component;

  return (
    <div className="resume-preview">
      <div id="resume-content">
        <TemplateComponent 
          resumeData={resumeData} 
          isEditMode={isEditMode}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
};

export default ResumePreview;
