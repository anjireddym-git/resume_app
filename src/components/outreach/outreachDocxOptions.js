import { DEFAULT_SECTION_ORDER } from '../../config/templates';

export const sanitizeOutreachFilename = (name) =>
  String(name || 'Resume').replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'Resume';

export function buildOutreachDocxRenderOptions(baseGroup, tailoredResume) {
  const sectionOrder = Array.isArray(baseGroup?.sectionOrder)
    ? baseGroup.sectionOrder
    : DEFAULT_SECTION_ORDER;
  const visibleSections = Array.isArray(baseGroup?.visibleSections)
    ? baseGroup.visibleSections
    : sectionOrder;

  return {
    sectionOrder: sectionOrder.filter((section) => visibleSections.includes(section)),
    visibleSections,
    themeConfig: baseGroup?.themeConfig || tailoredResume?.themeConfig,
    sectionFormats: tailoredResume?.sectionFormats || {},
    customSectionDefs: baseGroup?.customSectionDefs || tailoredResume?.customSectionDefs || [],
  };
}

