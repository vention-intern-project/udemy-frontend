import { expect, test } from '@playwright/test';
import {
  installAnonymousCatalogScenario,
  installCatalogCourseDetailScenario,
  installCatalogHeroScenario,
} from '../fixtures/catalog-discovery-fixture';
import {
  AdmissionRecorder,
  captureDeclaredMatrix,
  selectLocale,
  selectedAdmissionLocales,
} from './admission-harness';

test('M02/M03 catalog action, hero, price and sort admission matrix', async ({
  page,
}, testInfo) => {
  const recorder = new AdmissionRecorder(page, testInfo);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const anonymous = await installAnonymousCatalogScenario(page);
  for (const locale of selectedAdmissionLocales) {
    await recorder.beginCaptureWindow(
      {
        matrix: 'M02',
        scenario: 'anonymous-catalog',
        route: '/',
        state: 'permitted-free-and-paid',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
    );
    await page.goto('/');
    await selectLocale(recorder, page, locale);
    await expect(page.getByRole('link', { name: 'Anonymous free' })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Anonymous paid' })).toHaveCount(1);
    const links = page.getByRole('link');
    expect(await links.count()).toBeGreaterThan(0);
    await captureDeclaredMatrix(
      recorder,
      {
        matrix: 'M02',
        scenario: 'anonymous-catalog',
        route: '/',
        state: 'permitted-free-and-paid',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
    );
    await recorder.beginCaptureWindow(
      {
        matrix: 'M09',
        scenario: 'public-catalog-visibility',
        route: '/',
        state: 'published-course-visible',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
    );
    await captureDeclaredMatrix(
      recorder,
      {
        matrix: 'M09',
        scenario: 'public-catalog-visibility',
        route: '/',
        state: 'published-course-visible',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
    );
  }
  expect(anonymous.mutationRequests).toEqual([]);
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  const hero = await installCatalogHeroScenario(page);
  await recorder.beginCaptureWindow(
    {
      matrix: 'M03',
      scenario: 'hero-price-sort',
      route: '/',
      state: 'catalog-ready',
      session: 'anonymous',
      disposition: 'observed',
    },
    'en',
    'initial-navigation',
  );
  await page.goto('/');
  for (const locale of selectedAdmissionLocales) {
    await recorder.beginCaptureWindow(
      {
        matrix: 'M03',
        scenario: 'hero-price-sort',
        route: '/',
        state: 'catalog-ready',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
      'locale-reload',
    );
    await selectLocale(recorder, page, locale, [], true);
    await recorder.confirmCatalogHeroRendered();
    await captureDeclaredMatrix(
      recorder,
      {
        matrix: 'M03',
        scenario: 'hero-price-sort',
        route: '/',
        state: 'catalog-ready',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
    );
  }
  expect(hero.requests.length).toBeGreaterThan(0);
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await installCatalogHeroScenario(page);
  await installCatalogCourseDetailScenario(page);
  for (const locale of selectedAdmissionLocales) {
    await recorder.beginCaptureWindow(
      {
        matrix: 'M02',
        scenario: 'course-detail-success',
        route: '/courses/7',
        state: 'permitted-detail',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
    );
    await page.goto('/');
    await selectLocale(recorder, page, locale);
    await page.getByRole('link', { name: 'React' }).click();
    await expect(page).toHaveURL(/\/courses\/7$/);
    await expect(page.getByRole('main')).toBeVisible();
    await captureDeclaredMatrix(
      recorder,
      {
        matrix: 'M02',
        scenario: 'course-detail-success',
        route: '/courses/7',
        state: 'permitted-detail',
        session: 'anonymous',
        disposition: 'observed',
      },
      locale,
    );
  }
});
