import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const auditorSource = fs.readFileSync(new URL('./resumeQualityAuditor.js', import.meta.url), 'utf8');

describe('resume quality auditor integration contract', () => {
  it('feeds quality instructions into generation and targeted repair prompts', () => {
    expect(source).toContain('buildResumeQualityInstructions');
    expect(source).toContain('targetContext.qualityInstructions');
    expect(auditorSource).toContain('RESUME QUALITY CONTRACT');
  });

  it('uses targeted repair instead of the full resume repair path for active flows', () => {
    expect(source).toContain('repairGeneratedResumeTargeted');
    expect(source).toContain('Repair ONLY the listed resume pieces. Do not rewrite the whole resume.');
    expect(source).toContain('TARGETED_REPAIR_RESPONSE_SCHEMA_OPENAI');
    expect(source).toContain('applyDeterministicQualityRepairs');
  });

  it('maps visible quality warnings into targeted repair snippets before blocking outreach', () => {
    expect(source).toContain('parseBulletIssueRepairOperations');
    expect(source).toContain('rebalance_stack_distribution');
    expect(source).toContain('buildTargetedRepairPlanFromValidator(currentValidator, current)');
    expect(source).toContain('if (hasRepairableValidatorIssues(validator))');
  });

  it('tells targeted repair how to fix screenshot-style stack and bullet issues', () => {
    expect(source).toContain('For target stack overuse or "same target stack" warnings');
    expect(source).toContain('For tool-stuffed bullets, use no more than 5 named technologies');
    expect(source).toContain('For bullet length warnings, keep the repaired bullet between 24 and 52 words');
  });

  it('emits and persists quality metadata through validator and generated resume metadata', () => {
    expect(source).toContain('qualityScore: validator.qualityScore ?? null');
    expect(source).toContain('qualityIssues: validator.qualityIssues || []');
    expect(source).toContain('roleCoherenceReport: validator.roleCoherenceReport || null');
    expect(source).toContain('metricAssumptions: validator.metricAssumptions || []');
    expect(source).toContain('claimRiskReport: validator.claimRiskReport || []');
  });

  it('keeps the conservative metric policy in prompts', () => {
    expect(source).toContain('Avoid fake-precise claims such as "28%", "$500K", "12 services", or "99.99% uptime"');
    expect(source).toContain('conservative ranges or scale language');
  });
});
