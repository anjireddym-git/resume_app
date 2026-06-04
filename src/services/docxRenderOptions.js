import { DEFAULT_SECTION_ORDER } from '../config/templates';

const isArray = (value) => Array.isArray(value);

const firstArray = (...values) => values.find(isArray);

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const appendMissing = (items, additions) => {
  const result = [...(items || [])];
  for (const item of additions || []) {
    if (item && !result.includes(item)) result.push(item);
  }
  return result;
};

/**
 * Builds the render options consumed by exportService.generateDocxBlob().
 *
 * This mirrors the main editor export contract and should be used by every
 * DOCX output path so preview, export, Drive sync, and outreach attachments
 * resolve layout/theme data the same way.
 */
export function buildDocxRenderOptions({
  group,
  resumeData,
  sectionOrder,
  visibleSections,
  themeConfig,
  sectionFormats,
  customSectionDefs,
} = {}) {
  const resolvedCustomSectionDefs = firstArray(
    customSectionDefs,
    group?.customSectionDefs,
    resumeData?.customSectionDefs,
  ) || [];
  const customIds = resolvedCustomSectionDefs.map((section) => section?.id).filter(Boolean);

  const rawSectionOrder = firstArray(
    sectionOrder,
    group?.sectionOrder,
    resumeData?.sectionOrder,
    DEFAULT_SECTION_ORDER,
  );
  const resolvedSectionOrder = appendMissing(rawSectionOrder, customIds);

  const rawVisibleSections = firstArray(
    visibleSections,
    group?.visibleSections,
    resumeData?.visibleSections,
  );
  const resolvedVisibleSections = rawVisibleSections || resolvedSectionOrder;
  const visibleSet = new Set(resolvedVisibleSections);

  return {
    sectionOrder: resolvedSectionOrder.filter((section) => visibleSet.has(section)),
    visibleSections: resolvedVisibleSections,
    themeConfig: firstDefined(themeConfig, group?.themeConfig, resumeData?.themeConfig),
    sectionFormats: firstDefined(sectionFormats, resumeData?.sectionFormats, {}),
    customSectionDefs: resolvedCustomSectionDefs,
  };
}
