import React from 'react';
import { webClasses } from '../../styles/theme';
import { EditableField } from '../editing';

export const HeaderSection = ({ data, onUpdate, isEditMode = false }) => {
  const personal = data?.personalInfo || {};

  const handleFieldUpdate = (field, value) => {
    if (onUpdate) onUpdate(`personalInfo.${field}`, value);
  };

  return (
    <header className="mb-5">
      <h1 className={webClasses.name}>
        {isEditMode ? (
          <EditableField
            value={personal.name}
            onSave={(value) => handleFieldUpdate('name', value)}
            placeholder="Your Name"
            className="text-3xl font-semibold text-gray-800"
          />
        ) : (
          personal.name || 'Your Name'
        )}
      </h1>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-gray-600">
        {isEditMode ? (
          <>
            <EditableField value={personal.location} onSave={(v) => handleFieldUpdate('location', v)} placeholder="Location" className="text-sm" />
            <span className="text-gray-300">•</span>
            <EditableField value={personal.phone} onSave={(v) => handleFieldUpdate('phone', v)} placeholder="Phone" className="text-sm" />
            <span className="text-gray-300">•</span>
            <EditableField value={personal.email} onSave={(v) => handleFieldUpdate('email', v)} placeholder="Email" className="text-sm text-blue-600" />
            <span className="text-gray-300">•</span>
            <EditableField value={personal.linkedin} onSave={(v) => handleFieldUpdate('linkedin', v)} placeholder="LinkedIn" className="text-sm text-blue-600" />
            <span className="text-gray-300">•</span>
            <EditableField value={personal.github} onSave={(v) => handleFieldUpdate('github', v)} placeholder="GitHub" className="text-sm text-blue-600" />
          </>
        ) : (
          <>
            {personal.location && <span>{personal.location}</span>}
            {personal.phone && <><span className="text-gray-300">•</span><span>{personal.phone}</span></>}
            {personal.email && <><span className="text-gray-300">•</span><span className="text-blue-600">{personal.email}</span></>}
            {personal.linkedin && <><span className="text-gray-300">•</span><span className="text-blue-600">{personal.linkedin}</span></>}
            {personal.github && <><span className="text-gray-300">•</span><span className="text-blue-600">{personal.github}</span></>}
          </>
        )}
      </div>
    </header>
  );
};

export default HeaderSection;
