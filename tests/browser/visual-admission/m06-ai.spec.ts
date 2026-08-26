import { expect, test, type Page } from '@playwright/test';
import { createCourseChatD03Controller } from '../fixtures/course-chat-fixture';
import { AdmissionRecorder, captureDeclaredMatrix, observeLocaleConvergence, selectLocale, selectedAdmissionLocales } from './admission-harness';

const m06LearningShellReadPaths = ['/enrollments/4', '/cart'] as const;

async function settleM06LearningShellReads(page: Page, action: () => Promise<unknown>) {
  const responses = m06LearningShellReadPaths.map((path) =>
    page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === path &&
      response.status() >= 200 &&
      response.status() < 300,
    ),
  );
  await action();
  await Promise.all(responses.map(async (response) => {
    const finished = await (await response).finished();
    expect(finished).toBeNull();
  }));
}

test('M06 full and mini AI clear-menu admission matrix', async ({ page }, testInfo) => {
  const controller = createCourseChatD03Controller(page, 'full-page-clear-menu');
  await controller.install();
  const recorder = new AdmissionRecorder(page, testInfo);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const locale of selectedAdmissionLocales) {
    await recorder.beginCaptureWindow({ matrix: 'M06', scenario: 'full-page-actions', route: '/ai-chat', state: 'history-ready', session: 'authenticated', disposition: 'observed' }, locale);
    await page.goto('/ai-chat');
    await selectLocale(recorder, page, locale);
    const actions = page.getByRole('button', { name: /conversation actions|действия|amallar/i });
    await expect(actions).toBeVisible();
    await recorder.expectInteractive(actions);
    await captureDeclaredMatrix(recorder, { matrix: 'M06', scenario: 'full-page-actions', route: '/ai-chat', state: 'history-ready', session: 'authenticated', disposition: 'observed' }, locale);
    await recorder.beginCaptureWindow({ matrix: 'M06', scenario: 'full-page-menu', route: '/ai-chat', state: 'actions-open', session: 'authenticated', disposition: 'observed' }, locale);
    await actions.click();
    await captureDeclaredMatrix(recorder, { matrix: 'M06', scenario: 'full-page-menu', route: '/ai-chat', state: 'actions-open', session: 'authenticated', disposition: 'observed' }, locale);
    await page.keyboard.press('Escape');
  }
  await recorder.beginCaptureWindow({ matrix: 'M06', scenario: 'mini-chat', route: '/learning/enrollments/4', state: 'mini-open', session: 'authenticated', disposition: 'observed' }, 'en');
  await settleM06LearningShellReads(page, () => page.goto('/learning/enrollments/4'));
  await settleM06LearningShellReads(page, () => selectLocale(recorder, page, 'en'));
  await page.getByRole('button', { name: /open ai|открыть.*ассист|ai yordam/i }).click();
  await captureDeclaredMatrix(recorder, { matrix: 'M06', scenario: 'mini-chat', route: '/learning/enrollments/4', state: 'mini-open', session: 'authenticated', disposition: 'observed' }, 'en');
});

test('M06 locale setup replaces stale Uzbek preference before English capture', async ({ page }, testInfo) => {
  const controller = createCourseChatD03Controller(page, 'full-page-clear-menu');
  await controller.install();
  const recorder = new AdmissionRecorder(page, testInfo);
  await recorder.beginCaptureWindow({ matrix: 'M06', scenario: 'full-page-actions', route: '/ai-chat', state: 'history-ready', session: 'authenticated', disposition: 'observed' }, 'en');
  await page.goto('/ai-chat');

  await selectLocale(recorder, page, 'uz');
  expect(await recorder.observedLocale()).toBe('uz');

  await selectLocale(recorder, page, 'en');
  expect(await recorder.observedLocale()).toBe('en');
});

test('M06 locale convergence requires matching persisted storage after reload', async ({ page }, testInfo) => {
  const controller = createCourseChatD03Controller(page, 'full-page-clear-menu');
  await controller.install();
  const recorder = new AdmissionRecorder(page, testInfo);
  await recorder.beginCaptureWindow({ matrix: 'M06', scenario: 'full-page-actions', route: '/ai-chat', state: 'history-ready', session: 'authenticated', disposition: 'observed' }, 'en');
  await page.goto('/ai-chat');

  await page.evaluate(() => {
    document.documentElement.lang = 'en';
    localStorage.removeItem('learnhub.locale');
  });
  expect(observeLocaleConvergence({ documentLocale: 'en', storedLocale: null })).toEqual({ documentLocale: 'en', storageLocale: undefined, storagePresent: false });
  await expect(recorder.observedLocale()).rejects.toThrow('storage=missing');
  await expect(recorder.prepareForNavigation('locale-reload', ['/courses/7/progress'])).rejects.toThrow('storage=missing');

  await page.evaluate(() => localStorage.setItem('learnhub.locale', 'invalid'));
  await expect(recorder.observedLocale()).rejects.toThrow('storage=invalid');

  await page.evaluate(() => localStorage.setItem('learnhub.locale', 'ru'));
  await expect(recorder.observedLocale()).rejects.toThrow('storage=ru');

  await page.evaluate(() => localStorage.setItem('learnhub.locale', 'en'));
  expect(observeLocaleConvergence({ documentLocale: 'en', storedLocale: 'en' })).toEqual({ documentLocale: 'en', storageLocale: 'en', storagePresent: true });
  await expect(recorder.observedLocale()).resolves.toBe('en');
});
