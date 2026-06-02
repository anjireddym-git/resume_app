const CONTRACT_DENSITY = Object.freeze({
  summaryMinPoints: 12,
  summaryTargetMaxPoints: 15,
  latestExperienceMinBullets: 20,
  otherExperienceMinBullets: 16,
  olderExperienceCombinedMinBullets: 50,
  olderExperienceCombinedAppliesAtTotalRoles: 3,
  bulletTargetMinWords: 28,
  bulletTargetMaxWords: 45,
  bulletValidatorMinWords: 24,
  bulletValidatorMaxWords: 52,
});

const LEADING_BULLET_PATTERN = /^[\s•*\-–—]+\s*/;

function cleanPoint(value) {
  return String(value || '').replace(LEADING_BULLET_PATTERN, '').trim();
}

function getSummaryPointsForDensity(summary) {
  if (Array.isArray(summary)) {
    return summary.map(cleanPoint).filter(Boolean);
  }

  const text = String(summary || '').replace(/\r/g, '').trim();
  if (!text) return [];

  const newlinePoints = text
    .split('\n')
    .map(cleanPoint)
    .filter(Boolean);

  return newlinePoints;
}

function getSummaryRequirement(originalSummary) {
  const originalCount = getSummaryPointsForDensity(originalSummary).length;
  const min = Math.max(CONTRACT_DENSITY.summaryMinPoints, originalCount);
  const targetMax = Math.max(CONTRACT_DENSITY.summaryTargetMaxPoints, min);
  return { originalCount, min, targetMax };
}

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function getExperienceBulletRange(index, originalHighlights = []) {
  const baseline = index === 0
    ? CONTRACT_DENSITY.latestExperienceMinBullets
    : CONTRACT_DENSITY.otherExperienceMinBullets;
  const originalCount = Array.isArray(originalHighlights) ? originalHighlights.filter(Boolean).length : 0;
  return { min: Math.max(baseline, originalCount), max: Infinity };
}

function getOlderExperienceCombinedRequirement(originalExperience = []) {
  const originalRoles = Array.isArray(originalExperience) ? originalExperience : [];
  if (originalRoles.length < CONTRACT_DENSITY.olderExperienceCombinedAppliesAtTotalRoles) {
    return { applies: false, min: 0 };
  }

  const perRoleMinimumTotal = originalRoles
    .slice(1)
    .reduce((sum, exp, offset) => (
      sum + getExperienceBulletRange(offset + 1, exp?.highlights || []).min
    ), 0);

  return {
    applies: true,
    min: Math.max(CONTRACT_DENSITY.olderExperienceCombinedMinBullets, perRoleMinimumTotal),
  };
}

function collectBulletWordIssues(bullets, label) {
  if (!Array.isArray(bullets)) return [];
  return bullets.flatMap((bullet, index) => {
    const wordCount = countWords(bullet);
    if (!wordCount) return [];
    if (wordCount < CONTRACT_DENSITY.bulletValidatorMinWords) {
      return [`bullet too short at ${label}[${index}]: ${wordCount} words`];
    }
    if (wordCount > CONTRACT_DENSITY.bulletValidatorMaxWords) {
      return [`bullet too long at ${label}[${index}]: ${wordCount} words`];
    }
    return [];
  });
}

function validateContractResumeDensity(original = {}, generated = {}) {
  const hardIssues = [];
  const softIssues = [];

  const summaryRequirement = getSummaryRequirement(original.summary);
  const generatedSummaryPoints = getSummaryPointsForDensity(generated.summary);
  if (generatedSummaryPoints.length < summaryRequirement.min) {
    hardIssues.push(
      `too few summary points: ${generatedSummaryPoints.length} (need ${summaryRequirement.min}-${summaryRequirement.targetMax})`
    );
  }

  const originalExperience = Array.isArray(original.experience) ? original.experience : [];
  const generatedExperience = Array.isArray(generated.experience) ? generated.experience : [];

  originalExperience.forEach((originalExp, index) => {
    const generatedExp = generatedExperience[index];
    if (!Array.isArray(generatedExp?.highlights)) return;
    const range = getExperienceBulletRange(index, originalExp?.highlights || []);
    const count = generatedExp.highlights.length;
    if (count < range.min) {
      hardIssues.push(`too few bullets at "${originalExp?.company || `experience[${index}]`}": ${count} (need ${range.min}+)`);
    }
  });

  const olderRequirement = getOlderExperienceCombinedRequirement(originalExperience);
  if (olderRequirement.applies) {
    const olderTotal = generatedExperience
      .slice(1)
      .reduce((sum, exp) => sum + (Array.isArray(exp?.highlights) ? exp.highlights.length : 0), 0);
    if (olderTotal < olderRequirement.min) {
      hardIssues.push(`too few older-experience bullets combined: ${olderTotal} (need ${olderRequirement.min}+)`);
    }
  }

  generatedExperience.forEach((exp, index) => {
    softIssues.push(...collectBulletWordIssues(exp?.highlights, `experience "${exp?.company || `experience[${index}]`}"`));
  });

  return { hardIssues, softIssues };
}

module.exports = {
  CONTRACT_DENSITY,
  collectBulletWordIssues,
  countWords,
  getExperienceBulletRange,
  getOlderExperienceCombinedRequirement,
  getSummaryPointsForDensity,
  getSummaryRequirement,
  validateContractResumeDensity,
};
