import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');

describe('generated resume skill category prompt/schema contract', () => {
  it('requires ordered dynamic skill category rows instead of fixed buckets', () => {
    expect(source).toMatch(/skills:\s*\{\s*type:\s*'array'[\s\S]*label:\s*\{\s*type:\s*'string'\s*\}[\s\S]*items:\s*\{\s*type:\s*'array'/);
    expect(source).toMatch(/skills:\s*strArr\(strObj\(\{\s*label:\s*strStr,\s*items:\s*strStrArr,\s*\}\)\)/);
    expect(source).not.toMatch(/skills:\s*strObj\(\{\s*languages:/);
  });

  it('tells generation and repair prompts to preserve human labels and avoid generic buckets', () => {
    expect(source).toContain('Return skills as an ordered array of categories');
    expect(source).toContain('preserve their spelling, casing, and human wording');
    expect(source).toContain('Order categories by JD relevance');
    expect(source).toContain('do not force languages/frameworks/tools/databases/other buckets');
    expect(source).not.toContain('Group by category (Languages, Frameworks, Tools, Cloud, Databases)');
  });

  it('normalizes parsed and repaired resumes before validation or persistence', () => {
    expect(source).toContain('finalResume = normalizeResumeSkillCategories(finalResume)');
    expect(source).toContain('return normalizeResumeSkillCategories(parseStrictJson(text))');
    expect(source).toContain('const skillsValues = collectSkillValues(generated?.skills)');
    expect(source).toContain('skills: normalizeSkillCategories(generatedResume.skills)');
  });
});
