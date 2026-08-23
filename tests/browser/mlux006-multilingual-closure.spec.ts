import { existsSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { APP_ROUTES } from '../../src/app/router/route-registry';

type ClosureLocale = 'en' | 'ru' | 'uz';

interface RouteClosureMatrixEntry {
  readonly id: (typeof APP_ROUTES)[number]['id'];
  readonly path: string;
  readonly access: (typeof APP_ROUTES)[number]['access'];
  readonly ownerConfig: string;
}

interface LocaleSentinelScenario {
  readonly locale: ClosureLocale;
  readonly regionName: string;
  readonly submitName: string;
  readonly loginName: string;
  readonly viewport: { readonly width: number; readonly height: number };
}

const ROUTE_CLOSURE_MATRIX: readonly RouteClosureMatrixEntry[] = [
  { id: 'PAGE-001', path: '/', access: 'public', ownerConfig: 'catalog-discovery' },
  {
    id: 'PAGE-002',
    path: '/courses/:courseId',
    access: 'public',
    ownerConfig: 'course-detail',
  },
  { id: 'PAGE-003', path: '/signup', access: 'guest', ownerConfig: 'auth-workflows' },
  { id: 'PAGE-004', path: '/login', access: 'guest', ownerConfig: 'auth-workflows' },
  {
    id: 'PAGE-005',
    path: '/forgot-password',
    access: 'guest',
    ownerConfig: 'auth-workflows',
  },
  {
    id: 'PAGE-006',
    path: '/reset-password',
    access: 'guest',
    ownerConfig: 'auth-workflows',
  },
  { id: 'PAGE-007', path: '/cart', access: 'student', ownerConfig: 'cart-workflow' },
  { id: 'PAGE-008', path: '/learning', access: 'student', ownerConfig: 'learning-progress' },
  {
    id: 'PAGE-009',
    path: '/learning/enrollments/:enrollmentId',
    access: 'student',
    ownerConfig: 'learning-progress',
  },
  {
    id: 'PAGE-014',
    path: '/learning/enrollments/:enrollmentId/ai-chat',
    access: 'student',
    ownerConfig: 'course-chat',
  },
  { id: 'PAGE-015', path: '/ai-chat', access: 'student', ownerConfig: 'course-chat' },
  {
    id: 'PAGE-010',
    path: '/instructor/courses',
    access: 'instructor',
    ownerConfig: 'instructor-courses-fe029',
  },
  {
    id: 'PAGE-011',
    path: '/instructor/courses/:courseId/edit',
    access: 'instructor',
    ownerConfig: 'instructor-course-editor-fe014',
  },
  {
    id: 'PAGE-012',
    path: '/instructor/courses/:courseId/enrollments',
    access: 'instructor',
    ownerConfig: 'instructor-course-editor-fe014',
  },
  {
    id: 'PAGE-013',
    path: '/instructor/lessons/:lessonId/edit',
    access: 'instructor',
    ownerConfig: 'instructor-course-editor-fe014',
  },
];

const LOCALE_SENTINELS: readonly LocaleSentinelScenario[] = [
  {
    locale: 'en',
    regionName: 'Create account',
    submitName: 'Create account',
    loginName: 'Log in',
    viewport: { width: 320, height: 844 },
  },
  {
    locale: 'ru',
    regionName: 'Создать аккаунт',
    submitName: 'Создать аккаунт',
    loginName: 'Войти',
    viewport: { width: 390, height: 844 },
  },
  {
    locale: 'uz',
    regionName: 'Akkaunt yaratish',
    submitName: 'Akkaunt yaratish',
    loginName: 'Kirish',
    viewport: { width: 768, height: 900 },
  },
  {
    locale: 'ru',
    regionName: 'Создать аккаунт',
    submitName: 'Создать аккаунт',
    loginName: 'Войти',
    viewport: { width: 1280, height: 900 },
  },
];

test('pins every registered route to one final locale-aware browser owner', () => {
  expect(ROUTE_CLOSURE_MATRIX).toHaveLength(15);
  expect(ROUTE_CLOSURE_MATRIX.map(({ id, path, access }) => ({ id, path, access }))).toEqual(
    APP_ROUTES.map(({ id, path, access }) => ({ id, path, access })),
  );
  expect(
    ROUTE_CLOSURE_MATRIX.every(({ ownerConfig }) =>
      existsSync(new URL(`./${ownerConfig}.playwright.config.ts`, import.meta.url)),
    ),
  ).toBe(true);
});

for (const scenario of LOCALE_SENTINELS) {
  test(`keeps ${scenario.locale} signup localized and persistent at ${scenario.viewport.width}px`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    const failedResponses: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('requestfailed', (request) => {
      failedRequests.push(
        `${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ''}`,
      );
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push(
          `${response.request().method()} ${response.status()} ${response.url()}`,
        );
      }
    });

    await page.addInitScript((locale: ClosureLocale) => {
      localStorage.setItem('learnhub.locale', locale);
    }, scenario.locale);
    await page.setViewportSize(scenario.viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/signup');

    const signupRegion = page.getByRole('region', { name: scenario.regionName });
    await expect(signupRegion).toBeVisible();
    await expect(signupRegion.getByRole('button', { name: scenario.submitName })).toBeVisible();
    await expect(signupRegion.getByRole('link', { name: scenario.loginName })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Translation unavailable');
    await expect(page.locator('body')).not.toContainText(/(?:auth|routes|common):[A-Za-z]/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('learnhub.locale'))).toBe(
      scenario.locale,
    );

    await page.reload();
    await expect(page.getByRole('region', { name: scenario.regionName })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/signup');
    expect(await page.evaluate(() => localStorage.getItem('learnhub.locale'))).toBe(
      scenario.locale,
    );
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(failedResponses).toEqual([]);
  });
}
