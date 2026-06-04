import { buildDocxRenderOptions } from '../../services/docxRenderOptions';

export const sanitizeOutreachFilename = (name) =>
  String(name || 'Resume').replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').slice(0, 80) || 'Resume';

export function buildOutreachDocxRenderOptions(baseGroup, tailoredResume) {
  return buildDocxRenderOptions({ group: baseGroup, resumeData: tailoredResume });
}
