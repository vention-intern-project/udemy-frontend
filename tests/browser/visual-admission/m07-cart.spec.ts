import { expect, test, type Page, type Response } from '@playwright/test';
import {
  createCartD03Controller,
  isSuccessfulCartReadResponse,
} from '../fixtures/cart-workflow-fixture';
import {
  AdmissionRecorder,
  captureDeclaredMatrix,
  selectLocale,
  selectedAdmissionLocales,
  type AdmissionContext,
  type AdmissionLocale,
} from './admission-harness';

const shards = [
  ['root', '/'],
  ['course', '/courses/7?tab=outline#lessons'],
  ['signup', '/signup'],
  ['login', '/login'],
  ['forgot', '/forgot-password'],
  ['reset', '/reset-password'],
  ['learning', '/learning?page=2#courses'],
  ['enrollment', '/learning/enrollments/4'],
  ['enrollment-ai', '/learning/enrollments/4/ai-chat'],
  ['ai', '/ai-chat'],
  ['instructor', '/instructor/courses'],
  ['instructor-edit', '/instructor/courses/7/edit'],
  ['instructor-enrollments', '/instructor/courses/7/enrollments'],
  ['lesson-edit', '/instructor/lessons/12/edit'],
  ['malformed-empty', ''],
  ['malformed-relative', 'cart'],
  ['external', 'https://example.test'],
  ['self', '/cart?coupon=SAVE'],
] as const;
const shard = process.env.FE058_CART_SHARD;
const m07RenderedReadinessTimeout = 60_000;

type M07CartNavigationAction = () => Promise<unknown>;
type M07CartResponse = Promise<Response>;
async function navigateM07Cart(page: Page, action: M07CartNavigationAction) {
  // Subscribe before the boundary so each contextual-return variant proves
  // one exact current-window Cart read through a terminal response body.
  const cartResponse = page.waitForResponse(isSuccessfulCartReadResponse);
  await action();
  const finished = await (await cartResponse).finished();
  expect(finished).toBeNull();
}

async function awaitM07ReloadReady(
  recorder: AdmissionRecorder,
  page: Page,
  locale: AdmissionLocale,
  cartResponse: M07CartResponse,
) {
  expect(await (await cartResponse).finished()).toBeNull();
  await expect
    .poll(() => recorder.observedLocaleSnapshot())
    .toEqual({ documentLocale: locale, storageLocale: locale, storagePresent: true });
  await expect(recorder.observedLocaleConvergence()).resolves.toEqual({
    documentLocale: locale,
    storageLocale: locale,
    storagePresent: true,
  });
  await expect(page.locator('article nav[aria-label] a').first()).toBeVisible({
    timeout: m07RenderedReadinessTimeout,
  });
}

test('M07 cart breadcrumb shard admission matrix', async ({ page }, testInfo) => {
  test.skip(shard === 'clear', 'Dedicated clear shard owns M08-M09 only.');
  const selected = shards.filter(([key]) => key === shard);
  expect(selected, `unknown FE058_CART_SHARD: ${shard ?? '(unset)'}`).toHaveLength(1);
  const recorder = new AdmissionRecorder(page, testInfo);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [key, returnTo] of selected) {
    // Router reads its history state during the first Cart render. Seed the
    // exact existing React Router state shape before that document loads so
    // every locale reload begins with the declared return target as well.
    await page.addInitScript((initialReturnTo) => {
      history.replaceState(
        { usr: { returnTo: initialReturnTo }, key: 'fe058-m07', idx: 0 },
        '',
        '/cart',
      );
    }, returnTo);
    const controller = createCartD03Controller(page, 'localized-return-mutations');
    await controller.install();
    await recorder.beginCaptureWindow(
      {
        matrix: 'M07',
        scenario: `return-${key}`,
        route: '/cart',
        state: 'localized-return',
        session: 'authenticated',
        disposition: 'observed',
      },
      'en',
    );
    await navigateM07Cart(page, () => page.goto('/cart', { waitUntil: 'commit' }));
    for (const [localeIndex, locale] of selectedAdmissionLocales.entries()) {
      const context = {
        matrix: 'M07',
        scenario: `return-${key}`,
        route: '/cart',
        state: 'localized-return',
        session: 'authenticated',
        disposition: 'observed',
      } as const;
      const cartResponse = page.waitForResponse(isSuccessfulCartReadResponse);
      if (localeIndex === 0) {
        await recorder.performAtomicLocaleReloadRollover(
          context,
          locale,
          async () => {
            await page.evaluate((value) => localStorage.setItem('learnhub.locale', value), locale);
            await page.reload({ waitUntil: 'commit' });
          },
          async () => awaitM07ReloadReady(recorder, page, locale, cartResponse),
        );
      } else {
        await recorder.beginCaptureWindow(context, locale, 'locale-reload');
        await page.evaluate((value) => localStorage.setItem('learnhub.locale', value), locale);
        await page.reload({ waitUntil: 'commit' });
        await awaitM07ReloadReady(recorder, page, locale, cartResponse);
      }
      // The localized breadcrumb return link is the acceptance-defined M07 control.
      // Its structural locator survives EN/RU/UZ label changes without inventing a fallback target.
      await recorder.expectInteractive(page.locator('article nav[aria-label] a').first());
      await captureDeclaredMatrix(recorder, context, locale);
    }
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('M08 clear states and M09 report-only visibility', async ({ page }, testInfo) => {
  test.skip(
    process.env.FE058_CART_SHARD !== 'clear',
    'Executed only by the dedicated clear shard.',
  );
  const clear = createCartD03Controller(page, 'clear-success');
  await clear.install();
  const recorder = new AdmissionRecorder(page, testInfo);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await recorder.beginCaptureWindow(
    {
      matrix: 'M08',
      scenario: 'clear-confirmation',
      route: '/cart',
      state: 'clear-ready',
      session: 'authenticated',
      disposition: 'observed',
    },
    'en',
  );
  await clear.navigateToCart();
  const clearButton = page.getByRole('button', {
    name: /clear cart|очистить корзину|savatni tozalash/i,
  });
  await expect(clearButton).toBeVisible();
  await recorder.expectInteractive(clearButton);
  for (const locale of selectedAdmissionLocales) {
    if (locale !== 'en')
      await recorder.beginCaptureWindow(
        {
          matrix: 'M08',
          scenario: 'clear-confirmation',
          route: '/cart',
          state: 'clear-ready',
          session: 'authenticated',
          disposition: 'observed',
        },
        locale,
        'locale-reload',
      );
    await selectLocale(recorder, page, locale);
    await captureDeclaredMatrix(
      recorder,
      {
        matrix: 'M08',
        scenario: 'clear-confirmation',
        route: '/cart',
        state: 'clear-ready',
        session: 'authenticated',
        disposition: 'observed',
      },
      locale,
    );
  }
  await recorder.beginCaptureWindow(
    {
      matrix: 'M08',
      scenario: 'clear-pending',
      route: '/cart',
      state: 'clear-pending',
      session: 'authenticated',
      disposition: 'observed',
    },
    'en',
    'capture-route-navigation',
  );
  await clearButton.click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /cancel|отмен|bekor/i })
    .click();
  expect(clear.getClearRequestCount()).toBe(0);
  await expect(page).not.toHaveURL(/checkout/);
  await clearButton.click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /clear cart|очистить корзину|savatni tozalash/i })
    .click();
  expect(clear.getClearRequestCount()).toBe(1);
  // M09 is report-only: this authenticated Cart fixture produces no public-course write or frontend filtering.
});

test('M08 pending clear retains one DELETE and no checkout transition', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.FE058_CART_SHARD !== 'clear',
    'Executed only by the dedicated clear shard.',
  );
  const pending = createCartD03Controller(page, 'clear-pending');
  await pending.install();
  const recorder = new AdmissionRecorder(page, testInfo);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await recorder.beginCaptureWindow(
    {
      matrix: 'M08',
      scenario: 'clear-pending',
      route: '/cart',
      state: 'clear-pending',
      session: 'authenticated',
      disposition: 'observed',
    },
    'en',
  );
  await pending.navigateToCart();
  await selectLocale(recorder, page, 'en');
  const clearButton = page.getByRole('button', {
    name: /clear cart|очистить корзину|savatni tozalash/i,
  });
  const pendingContext: AdmissionContext = {
    matrix: 'M08',
    scenario: 'clear-pending',
    route: '/cart',
    state: 'clear-pending',
    session: 'authenticated',
    disposition: 'observed',
  };
  await clearButton.click();
  await recorder.waitForCaptureWindow(pendingContext, 'en');
  recorder.declarePendingRequest(pendingContext, 'en', { method: 'DELETE', path: '/cart' });
  try {
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /clear cart|очистить корзину|savatni tozalash/i })
      .click({ noWaitAfter: true });
    await expect.poll(() => pending.getClearRequestCount()).toBe(1);
    await expect(page).not.toHaveURL(/checkout/);
    await captureDeclaredMatrix(recorder, pendingContext, 'en');
  } finally {
    // Revalidation after the controlled DELETE is a new GET and therefore
    // must start in its own ordinary window, never inherit the closed DELETE.
    await recorder.beginCaptureWindow(pendingContext, 'en', 'capture-route-navigation');
    pending.completePendingClear();
  }
  await recorder.finalizeDeclaredPendingRequest(pendingContext, 'en', {
    outcome: 'response',
    status: 204,
  });
  await recorder.waitForCaptureWindow(pendingContext, 'en');
  recorder.endCaptureWindow(pendingContext, 'en');
  expect(pending.getClearRequestCount()).toBe(1);
});
