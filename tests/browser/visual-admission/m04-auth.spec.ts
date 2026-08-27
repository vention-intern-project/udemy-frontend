import { expect, test, type Page } from '@playwright/test';
import {
  installAuthAdmissionRoutes,
  installAuthWorkflowRuntime,
} from '../fixtures/auth-workflows-fixture';
import {
  AdmissionRecorder,
  captureDeclaredMatrix,
  selectedAdmissionLocales,
  type AdmissionLocale,
} from './admission-harness';

const m04ReadinessTimeout = 120_000;

async function expectForgotPasswordReady(page: Page) {
  await expect(page.getByRole('main')).toBeVisible({ timeout: m04ReadinessTimeout });
  const submit = page.getByRole('button').last();
  await expect(submit).toBeVisible({ timeout: m04ReadinessTimeout });
  return submit;
}

async function reloadM04Locale(recorder: AdmissionRecorder, page: Page, locale: AdmissionLocale) {
  await recorder.performAtomicLocaleReloadRollover(
    {
      matrix: 'M04',
      scenario: 'forgot-back-link',
      route: '/forgot-password',
      state: 'idle',
      session: 'anonymous',
      disposition: 'observed',
    },
    locale,
    async () => {
      await page.evaluate((value) => localStorage.setItem('learnhub.locale', value), locale);
      await page.reload({ waitUntil: 'commit' });
    },
    async () => {
      await expect
        .poll(() => recorder.observedLocaleSnapshot(), { timeout: m04ReadinessTimeout })
        .toEqual({ documentLocale: locale, storageLocale: locale, storagePresent: true });
      await expect(recorder.observedLocaleConvergence()).resolves.toEqual({
        documentLocale: locale,
        storageLocale: locale,
        storagePresent: true,
      });
      await expectForgotPasswordReady(page);
    },
  );
  await expect
    .poll(() => recorder.observedLocaleSnapshot(), { timeout: m04ReadinessTimeout })
    .toEqual({ documentLocale: locale, storageLocale: locale, storagePresent: true });
  await expect(recorder.observedLocaleConvergence()).resolves.toEqual({
    documentLocale: locale,
    storageLocale: locale,
    storagePresent: true,
  });
}

async function reloadM04LocaleWindow(
  recorder: AdmissionRecorder,
  page: Page,
  locale: AdmissionLocale,
) {
  await page.evaluate((value) => localStorage.setItem('learnhub.locale', value), locale);
  await page.reload({ waitUntil: 'commit' });
  await expect
    .poll(() => recorder.observedLocaleSnapshot(), { timeout: m04ReadinessTimeout })
    .toEqual({ documentLocale: locale, storageLocale: locale, storagePresent: true });
  await expect(recorder.observedLocaleConvergence()).resolves.toEqual({
    documentLocale: locale,
    storageLocale: locale,
    storagePresent: true,
  });
  await expectForgotPasswordReady(page);
}

test('M04/M05 auth navigation and safe-error admission matrix', async ({ page }, testInfo) => {
  const recorder = new AdmissionRecorder(page, testInfo);
  await installAuthWorkflowRuntime(page);
  await installAuthAdmissionRoutes(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [index, locale] of selectedAdmissionLocales.entries()) {
    await recorder.beginCaptureWindow(
      {
        matrix: 'M04',
        scenario: 'forgot-back-link',
        route: '/forgot-password',
        state: 'idle',
        session: 'anonymous',
        disposition: 'observed',
      },
      index === 0 ? 'en' : locale,
      index === 0 ? 'initial-navigation' : 'locale-reload',
    );
    if (index === 0) await page.goto('/forgot-password', { waitUntil: 'commit' });
    if (index === 0) await reloadM04Locale(recorder, page, locale);
    else await reloadM04LocaleWindow(recorder, page, locale);
    const submit = await expectForgotPasswordReady(page);
    await recorder.expectInteractive(submit);
    await captureDeclaredMatrix(
      recorder,
      {
        matrix: 'M04',
        scenario: 'forgot-back-link',
        route: '/forgot-password',
        state: 'idle',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
    );
    await recorder.beginCaptureWindow(
      {
        matrix: 'M05',
        scenario: 'empty-email-safe-error',
        route: '/forgot-password',
        state: 'validation-error',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
      'capture-route-navigation',
    );
    await submit.press('Enter');
    await expect(page.getByLabel(/^Email|Эл|Elektron/i)).toBeFocused();
    await captureDeclaredMatrix(
      recorder,
      {
        matrix: 'M05',
        scenario: 'empty-email-safe-error',
        route: '/forgot-password',
        state: 'validation-error',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
    );
  }
  await recorder.beginCaptureWindow(
    {
      matrix: 'M04',
      scenario: 'forgot-back-link',
      route: '/forgot-password',
      state: 'idle',
      session: 'anonymous',
      disposition: 'observed',
    },
    'en',
  );
  await page.goto('/reset-password', { waitUntil: 'commit' });
  await expect(page).toHaveURL(/forgot-password\?reason=missing-token/, {
    timeout: m04ReadinessTimeout,
  });
  await expectForgotPasswordReady(page);
});
