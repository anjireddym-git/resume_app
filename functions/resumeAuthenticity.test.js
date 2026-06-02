import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  buildAuthenticityInstructions,
  extractTargetStackFamilies,
  validateResumeAuthenticity,
} = require('./resumeAuthenticity');

const angularJd = 'Senior Angular Developer with Angular, TypeScript, RxJS, NgRx, Angular Material, REST APIs, and enterprise UI modernization.';

function exp(company, highlights, position = 'Software Engineer') {
  return { company, position, highlights };
}

function resume(experience, skills = {}) {
  return {
    personalInfo: { title: 'Senior Frontend Engineer' },
    summary: 'Frontend engineer with enterprise application delivery.',
    skills,
    experience,
  };
}

describe('resume authenticity helpers', () => {
  it('extracts target stack families and builds chronology instructions', () => {
    const families = extractTargetStackFamilies(angularJd);
    expect(families.map((family) => family.id)).toContain('angular');

    const instructions = buildAuthenticityInstructions(resume([]), angularJd);
    expect(instructions).toContain('Do not blanket-replace every experience');
    expect(instructions).toContain('Angular frontend');
  });

  it('flags Angular pasted into every role when the base resume does not support it', () => {
    const original = resume([
      exp('CurrentCo', ['Built React dashboards with TypeScript and REST API integrations.']),
      exp('MiddleCo', ['Developed Next.js storefront components with reusable JavaScript modules.']),
      exp('OlderCo', ['Integrated Node.js APIs, SQL workflows, and cloud deployment automation.']),
    ]);
    const generated = resume([
      exp('CurrentCo', ['Architected Angular workspace architecture with RxJS services and Angular Material component libraries.']),
      exp('MiddleCo', ['Delivered Angular modules with NgRx state management and Angular Router workflow improvements.']),
      exp('OlderCo', ['Modernized Angular templates with TypeScript services and Angular CLI build automation.']),
    ]);

    const result = validateResumeAuthenticity(original, generated, angularJd);
    expect(result.softIssues.join('\n')).toContain('target stack overuse');
    expect(result.softIssues.join('\n')).toContain('same target stack in every older role');
  });

  it('allows believable adjacent stack distribution for older roles', () => {
    const original = resume([
      exp('CurrentCo', ['Built React dashboards with TypeScript and REST API integrations.']),
      exp('MiddleCo', ['Developed Next.js storefront components with reusable JavaScript modules.']),
      exp('OlderCo', ['Integrated Node.js APIs, SQL workflows, and cloud deployment automation.']),
    ]);
    const generated = resume([
      exp('CurrentCo', [
        'Architected Angular workspace modernization with RxJS data services, Angular Material components, route guards, and accessibility improvements for enterprise users.',
        'Integrated NgRx state flows with REST API contracts, lazy-loaded feature modules, and release validation for multi-team UI delivery.',
      ]),
      exp('MiddleCo', [
        'Developed React and Next.js application modules with reusable TypeScript components, API integration patterns, and page performance improvements.',
        'Migrated shared JavaScript utilities into typed frontend packages that supported authentication workflows, analytics events, and release consistency.',
      ]),
      exp('OlderCo', [
        'Integrated Node.js APIs with SQL-backed workflows, deployment automation, logging improvements, and cross-team support for operational reliability.',
        'Built automated testing coverage around service contracts, data validation paths, cloud configuration changes, and regression-prone release areas.',
      ]),
    ]);

    const result = validateResumeAuthenticity(original, generated, angularJd);
    expect(result.softIssues).toEqual([]);
  });

  it('allows Angular in every role when the base resume shows Angular in every role', () => {
    const original = resume([
      exp('CurrentCo', ['Built Angular dashboards with RxJS and TypeScript.']),
      exp('MiddleCo', ['Developed AngularJS and Angular migration paths for enterprise forms.']),
      exp('OlderCo', ['Maintained Angular modules and JavaScript API integrations.']),
    ]);
    const generated = resume([
      exp('CurrentCo', ['Architected Angular workspace modernization with RxJS data services, route guards, accessibility improvements, and release validation for enterprise users.']),
      exp('MiddleCo', ['Migrated AngularJS form workflows into typed Angular modules with reusable services, validation patterns, and stakeholder review cycles.']),
      exp('OlderCo', ['Maintained Angular administration screens connected to REST APIs, SQL-backed reporting workflows, and regression-tested production releases.']),
    ]);

    const result = validateResumeAuthenticity(original, generated, angularJd);
    expect(result.softIssues).toEqual([]);
  });

  it('flags near-duplicate bullets inside one role', () => {
    const generated = resume([
      exp('CurrentCo', [
        'Architected Angular customer dashboard modules with reusable TypeScript services, REST API integrations, route guards, accessibility fixes, and release validation workflows.',
        'Architected Angular customer dashboard modules with reusable TypeScript services, REST API integration, route guard updates, accessibility fixes, and release validation.',
      ]),
    ]);

    const result = validateResumeAuthenticity(resume([]), generated, angularJd);
    expect(result.softIssues.join('\n')).toContain('high bullet similarity');
  });

  it('flags repeated delivery verbs and sentence templates across many bullets', () => {
    const generated = resume([
      exp('CurrentCo', Array.from({ length: 20 }, (_, index) =>
        `Improved Angular workflow ${index + 1} by 30% through TypeScript service tuning, dashboard refinement, stakeholder feedback loops, and release validation for enterprise users.`
      )),
    ]);

    const result = validateResumeAuthenticity(resume([]), generated, angularJd);
    expect(result.softIssues.join('\n')).toContain('repeated delivery verb');
    expect(result.softIssues.join('\n')).toContain('repeated sentence template');
  });
});
