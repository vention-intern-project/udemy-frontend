import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { installLearningAdmissionRoutes, installLearningCompletionScenario, learningEmptyCart } from '../fixtures/learning-progress-fixture';
import { AdmissionRecorder, captureDeclaredMatrix, NavigationTeardownEpochTracker, selectLocale, selectedAdmissionLocales, type LocaleReloadSource } from './admission-harness';

const russianLocaleReloadSource: LocaleReloadSource = { sourceLocale: 'ru' };
const uzbekLocaleReloadSource: LocaleReloadSource = { sourceLocale: 'uz' };

async function awaitM01EnrollmentDetail(page: Page, navigation: () => Promise<unknown>) {
  const detailRead = page.waitForResponse((response) => {
    const request = response.request();
    return request.method() === 'GET' && new URL(response.url()).pathname === '/enrollments/4' && response.status() >= 200 && response.status() < 300;
  });
  await navigation();
  const response = await detailRead;
  await response.finished();
}

test('M01 learning completion and undo admission matrix', async ({ page }, testInfo) => {
  await installLearningAdmissionRoutes(page, { cart: learningEmptyCart });
  const controller = await installLearningCompletionScenario(page);
  const recorder = new AdmissionRecorder(page, testInfo);
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recorder.beginCaptureWindow({ matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', state: 'not-completed', session: 'authenticated', disposition: 'observed' }, 'en', 'initial-navigation');
    await awaitM01EnrollmentDetail(page, () => page.goto('/learning/enrollments/4'));
    for (const locale of selectedAdmissionLocales) {
      if (locale !== 'en') await recorder.beginCaptureWindow({ matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', state: 'not-completed', session: 'authenticated', disposition: 'observed' }, locale, 'locale-reload');
      await awaitM01EnrollmentDetail(page, () => selectLocale(recorder, page, locale, ['/courses/7/lessons', '/courses/7/progress']));
      await recorder.prepareForNavigation('capture-route-navigation', ['/courses/7/lessons', '/courses/7/progress']);
      await awaitM01EnrollmentDetail(page, () => page.goto('/learning/enrollments/4'));
      const action = page.getByRole('button', { name: /complete|mark.*complete|заверш|yakun/i }).first();
      await expect(action).toBeVisible();
      await recorder.expectInteractive(action);
      await captureDeclaredMatrix(recorder, { matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', state: 'not-completed', session: 'authenticated', disposition: 'observed' }, locale);
      // The exported owner controller intentionally makes its second completion
      // request fail. Exercise its one successful completion/undo transition once,
      // while retaining the declared initial-state visual matrix in all locales.
      if (locale === 'en') {
        await recorder.beginCaptureWindow({ matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', state: 'completed', session: 'authenticated', disposition: 'observed' }, 'en', 'capture-route-navigation');
        await action.press('Enter');
        const undo = page.getByRole('button', { name: /undo|incomplete|отмен|незаверш|bekor/i }).first();
        await expect(undo).toBeVisible();
        await undo.press('Space');
        await recorder.recordM01Outcome(undo, action);
      }
    }
    expect(controller.requests.length).toBeGreaterThan(0);
  } finally {
    recorder.dispose();
  }
});

test('M01 navigation teardown candidates expire at document commit and cannot cross epochs', async ({ page }) => {
  await page.goto('about:blank');
  const tracker = new NavigationTeardownEpochTracker();
  const preCommitRequest = {} as never;
  tracker.begin('locale-reload', russianLocaleReloadSource, ['/courses/7/lessons']);
  tracker.addNew(preCommitRequest);
  tracker.commitMainFrameDocument();
  expect(tracker.take(preCommitRequest), 'same allowed path/error after document commit has no teardown candidate').toBeUndefined();

  const staleRequest = {} as never;
  tracker.begin('locale-reload', russianLocaleReloadSource, ['/courses/7/progress']);
  tracker.addNew(staleRequest);
  tracker.begin('capture-route-navigation', uzbekLocaleReloadSource, ['/courses/7/lessons']);
  expect(tracker.take(staleRequest), 'new navigation epoch rejects stale candidate').toBeUndefined();
  tracker.dispose();
});

test('M01 permits only the initial English missing-storage bootstrap before strict target convergence', async ({ page }, testInfo) => {
  await installLearningAdmissionRoutes(page, { cart: learningEmptyCart });
  await installLearningCompletionScenario(page);
  const recorder = new AdmissionRecorder(page, testInfo);
  try {
    await recorder.beginCaptureWindow({ matrix: 'M01', scenario: 'completion-ready', route: '/learning/enrollments/4', state: 'not-completed', session: 'authenticated', disposition: 'observed' }, 'en');
    await page.goto('/learning/enrollments/4');

    await selectLocale(recorder, page, 'ru', ['/courses/7/lessons', '/courses/7/progress']);
    await expect(recorder.observedLocaleConvergence()).resolves.toEqual({ documentLocale: 'ru', storageLocale: 'ru', storagePresent: true });

    await page.evaluate(() => {
      document.documentElement.lang = 'en';
      localStorage.removeItem('learnhub.locale');
    });
    await expect(recorder.observeLocaleReloadSource()).rejects.toThrow('locale-reload source');
  } finally {
    recorder.dispose();
  }
});
