const LEADING_BULLET_PATTERN = /^[\s•*\-–—]+\s*/;

function cleanSummaryPoint(text) {
  return String(text || '')
    .replace(LEADING_BULLET_PATTERN, '')
    .trim();
}

export function getSummaryPoints(summary) {
  const text = String(summary || '').replace(/\r/g, '').trim();
  if (!text) return [];

  const newlinePoints = text
    .split('\n')
    .map(cleanSummaryPoint)
    .filter(Boolean);

  if (newlinePoints.length > 1) {
    return newlinePoints;
  }

  const sentencePoints = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(cleanSummaryPoint)
    .filter(Boolean);

  return sentencePoints.length > 0 ? sentencePoints : newlinePoints;
}

export function normalizeSummaryToPoints(summary) {
  return getSummaryPoints(summary).join('\n');
}