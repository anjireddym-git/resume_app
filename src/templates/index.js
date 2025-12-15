import ClassicTemplate from './ClassicTemplate';

export const templates = {
  classic: {
    id: 'classic',
    name: 'GOD TEMPLATE 1',
    description: 'Clean professional',
    component: ClassicTemplate
  }
};

export const getTemplate = (templateId) => {
  return templates[templateId] || templates.classic;
};

export const getAllTemplates = () => {
  return Object.values(templates);
};

export { ClassicTemplate };
