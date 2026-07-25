import { expect, test, type Page, type Route } from '@playwright/test';
import {
  collectRuntimeEvidenceViolations,
  consumeExpectedHttpFailure,
  findUnexpectedConsoleErrors,
  matchesAcceptedResponseConsole,
  matchesHttpFailureIdentity,
  setupVisualQualityRuntime,
  validateVisualScenarioEvidence,
  type VisualQualityRuntime,
  type VisualScenarioEvidence,
} from './support/visual-quality';
import { installCatalogFixture } from './support/catalog-fixture';

interface RectGeometry {
  left: number;
  right: number;
  width: number;
  centerX: number;
}

interface LayoutGeometry {
  viewportWidth: number;
  documentClientWidth: number;
  documentScrollWidth: number;
  bodyScrollWidth: number;
  body: RectGeometry;
  header: RectGeometry;
  main: RectGeometry;
  panel: RectGeometry;
  panelPaddingLeft: number;
  panelPaddingRight: number;
  panelGap: number;
  headingGap: number | null;
  fieldsGap: number | null;
  fieldGap: number | null;
  footerPaddingTop: number | null;
  clippedControls: string[];
}

interface CatalogGeometry {
  hero: RectGeometry;
  heroHeight: number;
  titleLeft: number;
  titleTop: number;
  descriptionGap: number;
  content: RectGeometry;
  contentPaddingLeft: number;
  contentPaddingRight: number;
  results: RectGeometry;
  filter: CatalogFilterGeometry;
}

interface CatalogFilterControlGeometry {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  label: string;
  focusable: boolean;
}

interface CatalogFilterGeometry {
  formLeft: number;
  formRight: number;
  rangeLeft: number;
  rangeRight: number;
  labelTop: number;
  labelBottom: number;
  minimum: CatalogFilterControlGeometry;
  maximum: CatalogFilterControlGeometry;
}

interface PasswordFieldGeometry {
  input: RectGeometry;
  button: RectGeometry;
  frame: RectGeometry;
  inputHeight: number;
  buttonHeight: number;
  paddingInlineEnd: number;
  buttonFocusVisible: boolean;
  buttonOutlineWidth: number;
  iconAriaHidden: string | null;
  iconFocusable: string | null;
}

interface StateLayoutGeometry {
  viewportWidth: number;
  documentClientWidth: number;
  documentScrollWidth: number;
  bodyScrollWidth: number;
  main: RectGeometry;
  card: RectGeometry;
  clippedControls: string[];
}

const directCommand = 'npx playwright test --config tests/browser/layout-followup.playwright.config.ts --project=chromium --workers=1 --retries=0 --reporter=line';
const capabilityFiles = [
  'tests/browser/layout-followup.spec.ts',
  'tests/browser/support/visual-quality.ts',
] as const;
const visualQualityRuntime = new WeakMap<Page, VisualQualityRuntime>();

test.beforeEach(async ({ page }, testInfo) => {
  visualQualityRuntime.set(page, setupVisualQualityRuntime(page, testInfo, {
    capabilityFiles,
    command: directCommand,
  }));
  await installCatalogFixture(page);
});

test.afterEach(async ({ page }) => {
  await runtimeFor(page).finalize();
});

function runtimeFor(page: Page) {
  const runtime = visualQualityRuntime.get(page);
  if (!runtime) throw new Error('Visual quality runtime was not set up');
  return runtime;
}

function setScenario(page: Page, evidence: VisualScenarioEvidence) {
  runtimeFor(page).setScenario(evidence);
}

function completeScenario(page: Page, actualOutcome: string) {
  runtimeFor(page).completeAssertions(actualOutcome);
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function parsePixels(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) throw new Error(`Expected a pixel value, received ${value}`);
  return parsed;
}

async function captureLayout(page: Page): Promise<LayoutGeometry> {
  return page.evaluate(() => {
    const rect = (element: Element): RectGeometry => {
      const value = element.getBoundingClientRect();
      return {
        left: value.left,
        right: value.right,
        width: value.width,
        centerX: (value.left + value.right) / 2,
      };
    };
    const headerSurface = document.querySelector('[data-app-shell-header]');
    const header = headerSurface?.firstElementChild;
    const main = document.querySelector('main');
    const panel = document.querySelector('[data-part="catalog-discovery-layout"]')
      ?? main?.querySelector(':scope > section[aria-labelledby]');
    if (!header || !main || !panel) throw new Error('Layout geometry targets are unavailable');
    const panelStyle = getComputedStyle(panel);
    const heading = panel.querySelector('h1')?.parentElement ?? null;
    const fields = panel.querySelector(':scope > form');
    const field = panel.querySelector('[data-part="field"]');
    const footer = panel.querySelector(':scope > div:last-child');
    const clippedControls = [...document.querySelectorAll<HTMLElement>('header a, header button, main input, main select, main button, main a')]
      .filter((element) => {
        const value = element.getBoundingClientRect();
        return value.left < -0.5 || value.right > window.innerWidth + 0.5;
      })
      .map((element) => `${element.tagName.toLowerCase()}#${element.id}`);
    return {
      viewportWidth: window.innerWidth,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      body: rect(document.body),
      header: rect(header),
      main: rect(main),
      panel: rect(panel),
      panelPaddingLeft: Number.parseFloat(panelStyle.paddingLeft),
      panelPaddingRight: Number.parseFloat(panelStyle.paddingRight),
      panelGap: Number.parseFloat(panelStyle.gap),
      headingGap: heading ? Number.parseFloat(getComputedStyle(heading).gap) : null,
      fieldsGap: fields ? Number.parseFloat(getComputedStyle(fields).gap) : null,
      fieldGap: field ? Number.parseFloat(getComputedStyle(field).gap) : null,
      footerPaddingTop: footer ? Number.parseFloat(getComputedStyle(footer).paddingTop) : null,
      clippedControls,
    };
  });
}

async function captureStateLayout(page: Page): Promise<StateLayoutGeometry> {
  return page.evaluate(() => {
    const rect = (element: Element): RectGeometry => {
      const value = element.getBoundingClientRect();
      return {
        left: value.left,
        right: value.right,
        width: value.width,
        centerX: (value.left + value.right) / 2,
      };
    };
    const main = document.querySelector('main#main-content');
    const card = main?.firstElementChild;
    if (!main || !card) throw new Error('Application state geometry targets are unavailable');
    const clippedControls = [...document.querySelectorAll<HTMLElement>('main a, main button, main input')]
      .filter((element) => {
        const value = element.getBoundingClientRect();
        return value.left < -0.5 || value.right > window.innerWidth + 0.5;
      })
      .map((element) => `${element.tagName.toLowerCase()}#${element.id}`);
    return {
      viewportWidth: window.innerWidth,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      main: rect(main),
      card: rect(card),
      clippedControls,
    };
  });
}

async function captureCatalogGeometry(page: Page): Promise<CatalogGeometry> {
  return page.locator('[data-part="catalog-page"]').evaluate((catalog) => {
    const rect = (element: Element): RectGeometry => {
      const value = element.getBoundingClientRect();
      return {
        left: value.left,
        right: value.right,
        width: value.width,
        centerX: (value.left + value.right) / 2,
      };
    };
    const hero = catalog.querySelector('[data-part="catalog-hero"]');
    const heading = hero?.querySelector('h1');
    const description = hero?.querySelector('p');
    const content = catalog.querySelector('[data-part="catalog-content"]');
    const results = content?.querySelector('[data-part="catalog-discovery-layout"]');
    const filter = catalog.querySelector<HTMLFormElement>('form[aria-label="Course filters"]');
    const priceRange = filter?.querySelector('fieldset');
    const priceLabel = priceRange?.querySelector('[data-part="catalog-filter-price-label"]');
    const minimum = filter?.querySelector<HTMLInputElement>('input[name="min_price"]');
    const maximum = filter?.querySelector<HTMLInputElement>('input[name="max_price"]');
    if (!hero || !heading || !description || !content || !results || !filter || !priceRange || !priceLabel || !minimum || !maximum) {
      throw new Error('Catalog geometry targets are unavailable');
    }
    const heroRect = hero.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const descriptionRect = description.getBoundingClientRect();
    const contentStyle = getComputedStyle(content);
    const filterRect = filter.getBoundingClientRect();
    const priceRangeRect = priceRange.getBoundingClientRect();
    const priceLabelRect = priceLabel.getBoundingClientRect();
    const controlGeometry = (input: HTMLInputElement): CatalogFilterControlGeometry => {
      const inputRect = input.getBoundingClientRect();
      return {
        left: inputRect.left,
        right: inputRect.right,
        top: inputRect.top,
        bottom: inputRect.bottom,
        width: inputRect.width,
        height: inputRect.height,
        label: input.labels?.item(0)?.textContent ?? '',
        focusable: !input.disabled && input.tabIndex >= 0,
      };
    };
    return {
      hero: rect(hero),
      heroHeight: heroRect.height,
      titleLeft: headingRect.left,
      titleTop: headingRect.top - heroRect.top,
      descriptionGap: descriptionRect.top - headingRect.bottom,
      content: rect(content),
      contentPaddingLeft: Number.parseFloat(contentStyle.paddingLeft),
      contentPaddingRight: Number.parseFloat(contentStyle.paddingRight),
      results: rect(results),
      filter: {
        formLeft: filterRect.left,
        formRight: filterRect.right,
        rangeLeft: priceRangeRect.left,
        rangeRight: priceRangeRect.right,
        labelTop: priceLabelRect.top,
        labelBottom: priceLabelRect.bottom,
        minimum: controlGeometry(minimum),
        maximum: controlGeometry(maximum),
      },
    };
  });
}

async function capturePasswordField(page: Page, id: string): Promise<PasswordFieldGeometry> {
  return page.locator(`#${id}`).evaluate((input) => {
    const frame = input.parentElement;
    const button = frame?.querySelector('button');
    const icon = button?.querySelector('svg');
    if (!frame || !button || !icon) throw new Error(`Password action geometry is unavailable for ${input.id}`);
    const rect = (element: Element): RectGeometry => {
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, width: value.width, centerX: (value.left + value.right) / 2 };
    };
    const inputRect = input.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const buttonStyle = getComputedStyle(button);
    return {
      input: rect(input),
      button: rect(button),
      frame: rect(frame),
      inputHeight: inputRect.height,
      buttonHeight: buttonRect.height,
      paddingInlineEnd: Number.parseFloat(getComputedStyle(input).paddingInlineEnd),
      buttonFocusVisible: button.matches(':focus-visible'),
      buttonOutlineWidth: Number.parseFloat(buttonStyle.outlineWidth),
      iconAriaHidden: icon.getAttribute('aria-hidden'),
      iconFocusable: icon.getAttribute('focusable'),
    };
  });
}

function expectInlinePasswordAction(geometry: PasswordFieldGeometry) {
  expect(geometry.inputHeight).toBe(44);
  expect(geometry.button.width).toBe(36);
  expect(geometry.buttonHeight).toBe(36);
  expect(geometry.frame.left).toBe(geometry.input.left);
  expect(geometry.frame.right).toBe(geometry.input.right);
  expect(geometry.button.left).toBeGreaterThanOrEqual(geometry.input.left + 4);
  expect(geometry.button.right).toBeLessThanOrEqual(geometry.input.right - 4);
  expect(Math.abs(geometry.button.centerX - (geometry.input.right - 22))).toBeLessThanOrEqual(0.5);
  expect(geometry.paddingInlineEnd).toBeGreaterThanOrEqual(geometry.button.width + 16);
  expect(geometry.button.left - (geometry.input.right - geometry.paddingInlineEnd)).toBeGreaterThanOrEqual(8);
  expect(geometry.iconAriaHidden).toBe('true');
  expect(geometry.iconFocusable).toBe('false');
}

function expectCleanLayout(geometry: LayoutGeometry, width: number) {
  expect(geometry.viewportWidth).toBe(width);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);
  expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);
  expect(geometry.clippedControls).toEqual([]);
  expect(Math.abs(geometry.header.centerX - width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.main.centerX - width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.panel.centerX - width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.header.centerX - geometry.main.centerX)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.main.centerX - geometry.panel.centerX)).toBeLessThanOrEqual(1);
  expect(geometry.panel.left - geometry.body.left).toBeGreaterThanOrEqual(16);
  expect(geometry.body.right - geometry.panel.right).toBeGreaterThanOrEqual(16);
}

function expectCleanStateLayout(geometry: StateLayoutGeometry, width: number) {
  expect(geometry.viewportWidth).toBe(width);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);
  expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth);
  expect(geometry.clippedControls).toEqual([]);
  expect(Math.abs(geometry.main.centerX - width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.card.centerX - width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.main.centerX - geometry.card.centerX)).toBeLessThanOrEqual(1);
  expect(geometry.card.left).toBeGreaterThanOrEqual(16);
  expect(width - geometry.card.right).toBeGreaterThanOrEqual(16);
}

function expectCatalogFilterGeometry(geometry: CatalogFilterGeometry, width: number) {
  expect(geometry.formLeft).toBeGreaterThanOrEqual(-0.5);
  expect(geometry.formRight).toBeLessThanOrEqual(width + 0.5);
  expect(geometry.rangeLeft).toBeGreaterThanOrEqual(-0.5);
  expect(geometry.rangeRight).toBeLessThanOrEqual(width + 0.5);
  expect(geometry.minimum.label).toBe('Min price');
  expect(geometry.maximum.label).toBe('Max price');
  expect(geometry.minimum.focusable).toBe(true);
  expect(geometry.maximum.focusable).toBe(true);
  expect(geometry.minimum.width).toBeCloseTo(128, 1);
  expect(geometry.maximum.width).toBeCloseTo(128, 1);
  expect(geometry.minimum.height).toBeCloseTo(36, 1);
  expect(geometry.maximum.height).toBeCloseTo(36, 1);
  expect(geometry.minimum.left).toBeGreaterThanOrEqual(-0.5);
  expect(geometry.maximum.right).toBeLessThanOrEqual(width + 0.5);
  expect(geometry.minimum.right).toBeLessThanOrEqual(geometry.maximum.left);
  expect(Math.abs(geometry.minimum.top - geometry.maximum.top)).toBeLessThanOrEqual(1);
  if (width < 480) {
    expect(geometry.labelBottom).toBeLessThanOrEqual(geometry.minimum.top + 1);
  } else {
    expect(Math.abs(
      ((geometry.labelTop + geometry.labelBottom) / 2)
      - ((geometry.minimum.top + geometry.minimum.bottom) / 2),
    )).toBeLessThanOrEqual(1);
  }
}

const routeCases = [
  { path: '/', heading: 'Master the Skills Shaping the Future', submitName: null, firstInvalidLabel: null },
  { path: '/login', heading: 'Log in', submitName: 'Log in', firstInvalidLabel: /^Email/ },
  { path: '/signup', heading: 'Create account', submitName: 'Create account', firstInvalidLabel: /^Email/ },
  { path: '/forgot-password', heading: 'Forgot password', submitName: 'Continue', firstInvalidLabel: /^Email/ },
  {
    path: '/reset-password?token=layout-followup-token', heading: 'Reset password', submitName: 'Reset password',
    firstInvalidLabel: /^New password/,
  },
] as const;

for (const width of [320, 768, 1280]) {
  test(`React Router variants retain route metadata and geometry at ${width}px`, async ({ page }) => {
    setScenario(page, {
      routes: ['/LOGIN/', '/COURSES/Route-42/', '/INSTRUCTOR/COURSES/Route-42/ENROLLMENTS/'],
      states: ['anonymous auth/public variants', 'authenticated instructor workspace variant'],
      viewports: [{ width, height: 800 }],
      expectedOutcome: 'Case, trailing-slash, and parameter variants retain the intended layout, density, geometry, and overflow behavior.',
      runtimeInputs: { width, router: 'React Router matchPath semantics', data: 'deterministic mocked GET /me' },
    });
    await page.setViewportSize({ width, height: 800 });

    for (const routeCase of [
      { path: '/LOGIN/', heading: 'Log in', layout: 'auth', density: 'marketplace' },
      { path: '/COURSES/Route-42/', heading: 'Course details', layout: 'public', density: 'marketplace' },
    ] as const) {
      await page.goto(routeCase.path);
      await expect(page.getByRole('heading', { level: 1, name: routeCase.heading })).toBeVisible();
      await expect(page.locator('[data-layout]')).toHaveAttribute('data-layout', routeCase.layout);
      await expect(page.locator('html')).toHaveAttribute('data-density', routeCase.density);
      expectCleanLayout(await captureLayout(page), width);
    }

    await page.route('**/me', (route) => fulfillJson(route, 200, {
      email: 'instructor@example.com',
      name: 'Grace',
      surname: 'Hopper',
      role: 'instructor',
      birthday: null,
      phone_number: null,
      created_at: '2026-07-22T00:00:00Z',
    }));
    await page.evaluate(() => localStorage.setItem('learnhub.access-token', 'route-variant-token'));
    await page.goto('/INSTRUCTOR/COURSES/Route-42/ENROLLMENTS/');
    await expect(page.getByRole('heading', { level: 1, name: 'Course enrollments' })).toBeVisible();
    await expect(page.locator('[data-layout]')).toHaveAttribute('data-layout', 'workspace');
    await expect(page.locator('html')).toHaveAttribute('data-density', 'workspace');
    expectCleanLayout(await captureLayout(page), width);

    completeScenario(page, 'All route variants retained route metadata, centered geometry, and overflow-free rendering.');
  });
}

test('visual quality runtime helpers reject mismatches, exhaustion and missing evidence', async ({ page }) => {
  setScenario(page, {
    routes: ['support runtime'],
    states: ['adversarial exact-match contract'],
    viewports: [{ notApplicable: 'pure support helper assertions' }],
    expectedOutcome: 'Exact response and console identities match one-to-one; missing runtime evidence fails closed.',
    runtimeInputs: { network: 'synthetic pure values', browserNavigation: false },
  });

  const acceptedFailure = {
    method: 'POST',
    path: '/login?source=visual',
    status: 400,
    url: 'http://127.0.0.1:4176/login?source=visual',
  };
  const expectedFailures = [{ ...acceptedFailure, occurrences: 1, remaining: 1 }];
  expect(consumeExpectedHttpFailure(expectedFailures, {
    method: 'GET', path: '/login?source=visual', status: 400,
  })).toBe(false);
  expect(consumeExpectedHttpFailure(expectedFailures, {
    method: 'POST', path: '/login?source=other', status: 400,
  })).toBe(false);
  expect(consumeExpectedHttpFailure(expectedFailures, {
    method: 'POST', path: '/login?source=visual', status: 401,
  })).toBe(false);
  expect(expectedFailures[0].remaining).toBe(1);
  expect(consumeExpectedHttpFailure(expectedFailures, acceptedFailure)).toBe(true);
  expect(expectedFailures[0].remaining).toBe(0);
  expect(consumeExpectedHttpFailure(expectedFailures, acceptedFailure)).toBe(false);
  expect(expectedFailures[0].remaining).toBe(0);
  expect(matchesHttpFailureIdentity(acceptedFailure, acceptedFailure)).toBe(true);

  const resourceMessage = {
    text: 'Failed to load resource: the server responded with a status of 400 (Bad Request)',
    url: acceptedFailure.url,
  };
  expect(matchesAcceptedResponseConsole({ ...resourceMessage, url: 'http://127.0.0.1:4176/other' }, acceptedFailure))
    .toBe(false);
  expect(matchesAcceptedResponseConsole({ ...resourceMessage, text: 'unrelated console error' }, acceptedFailure))
    .toBe(false);
  expect(matchesAcceptedResponseConsole(resourceMessage, acceptedFailure)).toBe(true);
  expect(findUnexpectedConsoleErrors([resourceMessage, resourceMessage], [acceptedFailure]))
    .toEqual([resourceMessage]);

  const violations = collectRuntimeEvidenceViolations({
    pageErrors: ['synthetic page error'],
    consoleErrors: [resourceMessage, { text: 'unrelated console error', url: '' }],
    failedRequests: ['GET /offline: synthetic failure'],
    errorResponses: [{ ...acceptedFailure, status: 409 }],
    acceptedHttpFailures: [acceptedFailure],
    expectedHttpFailures: [{ ...acceptedFailure, occurrences: 2, remaining: 1 }],
  });
  expect(violations.pageErrors).toEqual(['synthetic page error']);
  expect(violations.unexpectedConsoleErrors).toEqual([{ text: 'unrelated console error', url: '' }]);
  expect(violations.failedRequests).toEqual(['GET /offline: synthetic failure']);
  expect(violations.errorResponses).toHaveLength(1);
  expect(violations.unconsumedExpectedResponses).toHaveLength(1);
  expect(validateVisualScenarioEvidence(undefined)).toEqual(['scenario metadata is missing']);

  completeScenario(page, 'Pure adversarial helpers rejected every mismatch and exposed every fail-closed violation.');
});

for (const width of [320, 390, 768, 1280, 1440]) {
  test(`catalog and auth normal/validation layouts stay centered and spaced at ${width}px`, async ({ page }) => {
    setScenario(page, {
      routes: [...routeCases.map(({ path }) => path), '/courses/:courseId'],
      states: ['normal', 'client validation'],
      viewports: [{ width, height: 800 }],
      expectedOutcome: 'Catalog, course details, and auth panels stay centered, spaced, associated, and overflow-free.',
      runtimeInputs: { width, data: 'public deterministic routes' },
    });
    await page.setViewportSize({ width, height: 800 });
    const routeCenters: number[] = [];

    for (const routeCase of routeCases) {
      await page.goto(routeCase.path);
      await expect(page.getByRole('heading', { level: 1, name: routeCase.heading })).toBeVisible();
      if (routeCase.path === '/') {
        await expect(page.getByRole('heading', { level: 2, name: 'Found 1 course' })).toBeVisible();
      }
      const normal = await captureLayout(page);
      expectCleanLayout(normal, width);
      routeCenters.push(normal.panel.centerX);

      if (routeCase.path === '/') {
        const geometry = await captureCatalogGeometry(page);
        expect(Math.abs(geometry.hero.left)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.hero.right - width)).toBeLessThanOrEqual(1);
        expect(geometry.heroHeight).toBeCloseTo(320, 0);
        expect(geometry.titleTop).toBe(width >= 768 ? 84 : 48);
        expect(geometry.descriptionGap).toBe(12);
        expect(Math.abs(geometry.results.left - geometry.content.left - geometry.contentPaddingLeft)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.content.right - geometry.results.right - geometry.contentPaddingRight)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.titleLeft - geometry.results.left)).toBeLessThanOrEqual(1);
        expectCatalogFilterGeometry(geometry.filter, width);
      }

      if (routeCase.submitName && routeCase.firstInvalidLabel) {
        expect(normal.panelGap).toBe(24);
        expect(normal.headingGap).toBe(16);
        expect(normal.fieldsGap).toBe(16);
        expect(normal.fieldGap).toBe(8);
        expect(normal.panelPaddingLeft).toBe(width >= 768 ? 32 : 24);
        expect(normal.panelPaddingRight).toBe(width >= 768 ? 32 : 24);
        expect(normal.footerPaddingTop).toBe(16);

        const submit = page.getByRole('button', { name: routeCase.submitName, exact: true });
        await submit.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByLabel(routeCase.firstInvalidLabel)).toBeFocused();
        await expect(page.getByRole('alert')).toHaveCount(0);
        const validation = await captureLayout(page);
        expectCleanLayout(validation, width);
        expect(validation.panelPaddingLeft).toBe(normal.panelPaddingLeft);
        expect(validation.panelGap).toBe(normal.panelGap);
      }
    }

    for (const center of routeCenters) {
      expect(Math.abs(center - width / 2)).toBeLessThanOrEqual(1);
    }

    await page.goto('/courses/layout-followup-course');
    await expect(page.getByRole('heading', { level: 1, name: 'Course details' })).toBeVisible();
    const publicPlaceholder = await captureLayout(page);
    expectCleanLayout(publicPlaceholder, width);
    expect(publicPlaceholder.panelPaddingLeft).toBe(32);
    expect(publicPlaceholder.panelPaddingRight).toBe(32);
    completeScenario(page, 'All normal and validation layouts matched their semantic, spacing, geometry, and overflow assertions.');
  });
}

const passwordRouteCases = [
  {
    path: '/login', heading: 'Log in', submitName: 'Log in', fieldIds: ['password'], firstInvalidLabel: /^Email/,
  },
  {
    path: '/signup',
    heading: 'Create account',
    submitName: 'Create account',
    fieldIds: ['password', 'passwordConfirmation'],
    firstInvalidLabel: /^Email/,
  },
  {
    path: '/reset-password?token=layout-password-token',
    heading: 'Reset password',
    submitName: 'Reset password',
    fieldIds: ['password', 'passwordConfirmation'],
    firstInvalidLabel: /^New password/,
  },
] as const;

for (const width of [320, 390, 768, 1280, 1440]) {
  test(`password actions remain inline, independent and accessible at ${width}px`, async ({ page }) => {
    setScenario(page, {
      routes: passwordRouteCases.map(({ path }) => path),
      states: ['password hidden', 'password revealed', 'keyboard focus', 'client validation'],
      viewports: [{ width, height: 900 }],
      expectedOutcome: 'Every password action remains inline, independent, keyboard-operable, visible on focus, and associated.',
      runtimeInputs: { width, input: 'synthetic non-secret password value' },
    });
    await page.setViewportSize({ width, height: 900 });

    for (const routeCase of passwordRouteCases) {
      await page.goto(routeCase.path);
      await expect(page.getByRole('heading', { level: 1, name: routeCase.heading })).toBeVisible();
      const inputs = routeCase.fieldIds.map((id) => page.locator(`#${id}`));

      for (const [index, id] of routeCase.fieldIds.entries()) {
        const input = inputs[index];
        const reveal = page.locator(`#${id} + [data-part="trailing-action"] button`);
        await input.fill('Long password value that must stay clear of the inline reveal control 1234567890');
        await expect(input).toHaveAttribute('type', 'password');
        await expect(reveal).toHaveAttribute('type', 'button');
        await expect(reveal).toHaveAttribute('aria-controls', id);
        await expect(reveal).toHaveAttribute('aria-label', 'Show password');
        await expect(reveal).toHaveAttribute('aria-pressed', 'false');
        await expect(reveal.locator('svg')).toHaveClass(/lucide-eye/);
        expectInlinePasswordAction(await capturePasswordField(page, id));

        await input.focus();
        await page.keyboard.press('Tab');
        await expect(reveal).toBeFocused();
        const focused = await capturePasswordField(page, id);
        expectInlinePasswordAction(focused);
        expect(focused.buttonFocusVisible).toBe(true);
        expect(focused.buttonOutlineWidth).toBe(2);

        await page.keyboard.press('Space');
        await expect(input).toHaveAttribute('type', 'text');
        await expect(reveal).toHaveAttribute('aria-label', 'Hide password');
        await expect(reveal).toHaveAttribute('aria-pressed', 'true');
        await expect(reveal.locator('svg')).toHaveClass(/lucide-eye-off/);
        for (const [otherIndex, otherInput] of inputs.entries()) {
          if (otherIndex !== index) await expect(otherInput).toHaveAttribute('type', 'password');
        }

        await reveal.click();
        await expect(input).toHaveAttribute('type', 'password');
        await expect(reveal).toHaveAttribute('aria-label', 'Show password');
        await expect(reveal).toHaveAttribute('aria-pressed', 'false');
        await reveal.click();
        await expect(input).toHaveAttribute('type', 'text');
        await expect(reveal).toHaveAttribute('aria-label', 'Hide password');
        await expect(reveal).toHaveAttribute('aria-pressed', 'true');
        await reveal.click();
        await expect(input).toHaveAttribute('type', 'password');
      }

      for (const input of inputs) await input.fill('');
      await page.getByRole('button', { name: routeCase.submitName, exact: true }).press('Enter');
      await expect(page.getByLabel(routeCase.firstInvalidLabel)).toBeFocused();
      await expect(page.getByRole('alert')).toHaveCount(0);
      for (const [index, id] of routeCase.fieldIds.entries()) {
        await expect(inputs[index]).toHaveAttribute('aria-invalid', 'true');
        const describedBy = await inputs[index].getAttribute('aria-describedby');
        expect(describedBy?.split(' ')).toContain(`${id}-error`);
        await expect(page.locator(`#${id} + [data-part="trailing-action"] button`))
          .toHaveAttribute('aria-controls', id);
      }
      expectCleanLayout(await captureLayout(page), width);
    }
    completeScenario(page, 'Every password control passed geometry, independence, keyboard, focus, and association assertions.');
  });
}

for (const width of [320, 390]) {
  test(`mobile navigation closed/open/closed preserves canvas geometry at ${width}px`, async ({ page }) => {
    setScenario(page, {
      routes: ['/'],
      states: ['mobile navigation closed', 'mobile navigation open', 'focus restored after Escape'],
      viewports: [{ width, height: 600 }],
      expectedOutcome: 'Opening and closing mobile navigation preserves canvas geometry and restores keyboard focus.',
      runtimeInputs: { width, activation: 'keyboard Enter and Escape' },
    });
    await page.setViewportSize({ width, height: 600 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Found 1 course' })).toBeVisible();
    const closed = await captureLayout(page);
    expectCleanLayout(closed, width);

    const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toBeVisible();
    const open = await captureLayout(page);
    expectCleanLayout(open, width);
    expect(open.body).toEqual(closed.body);
    expect(open.documentScrollWidth).toBe(closed.documentScrollWidth);
    expect(open.bodyScrollWidth).toBe(closed.bodyScrollWidth);
    expect(open.header.centerX).toBe(closed.header.centerX);
    expect(open.main.centerX).toBe(closed.main.centerX);
    expect(open.panel.centerX).toBe(closed.panel.centerX);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
    const restored = await captureLayout(page);
    expect(restored.body).toEqual(closed.body);
    expect(restored.documentScrollWidth).toBe(closed.documentScrollWidth);
    expect(restored.header.centerX).toBe(closed.header.centerX);
    expect(restored.main.centerX).toBe(closed.main.centerX);
    completeScenario(page, 'Mobile navigation preserved canvas geometry and restored focus to its trigger.');
  });
}

test('mobile navigation yields to desktop navigation at the 768px transition', async ({ page }) => {
  setScenario(page, {
    routes: ['/'],
    states: ['mobile navigation open', 'desktop navigation visible after reflow'],
    viewports: [{ width: 390, height: 600 }, { width: 768, height: 800 }],
    expectedOutcome: 'The mobile menu yields to desktop navigation at the intermediate breakpoint without overflow.',
    runtimeInputs: { transition: '390x600 to 768x800', activation: 'keyboard Enter' },
  });
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Found 1 course' })).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toBeVisible();

  await page.setViewportSize({ width: 768, height: 800 });
  await expect(page.getByRole('navigation', { name: 'Primary navigation', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toBeHidden();
  expectCleanLayout(await captureLayout(page), 768);
  completeScenario(page, 'Desktop navigation replaced the open mobile menu with clean intermediate-width geometry.');
});

for (const width of [320, 768, 1440]) {
  test(`representative login pending/error states retain layout and focus at ${width}px`, async ({ page }) => {
    setScenario(page, {
      routes: ['/login'],
      states: ['normal', 'pending', 'public-safe server error'],
      viewports: [{ width, height: 800 }],
      expectedOutcome: 'Login pending and exact 400 error states preserve layout, disable actions, focus the alert, and hide private detail.',
      runtimeInputs: { width, expectedHttpFailure: 'POST /login 400 x1' },
    });
    runtimeFor(page).allowHttpFailure({ method: 'POST', path: '/login', status: 400 }, 1);
    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve; });
    await page.route('**/login', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      await requestGate;
      await fulfillJson(route, 400, { detail: 'LAYOUT_PRIVATE_ERROR_DETAIL' });
    });

    await page.setViewportSize({ width, height: 800 });
    await page.goto('/login');
    await page.getByLabel(/^Email/).fill('learner@example.com');
    await page.getByLabel(/^Password/).fill('password');
    const normal = await captureLayout(page);

    await page.getByRole('button', { name: 'Log in', exact: true }).press('Enter');
    await expect(page.getByRole('button', { name: 'Logging in...', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Show password', exact: true })).toBeDisabled();
    expectInlinePasswordAction(await capturePasswordField(page, 'password'));
    const pending = await captureLayout(page);
    expectCleanLayout(pending, width);
    expect(pending.panel.centerX).toBe(normal.panel.centerX);
    expect(pending.panelPaddingLeft).toBe(normal.panelPaddingLeft);
    releaseRequest();

    const error = page.getByRole('alert');
    await expect(error).toBeFocused();
    await expect(page.getByRole('main')).not.toContainText('LAYOUT_PRIVATE_ERROR_DETAIL');
    const failed = await captureLayout(page);
    expectCleanLayout(failed, width);
    expect(failed.panel.centerX).toBe(normal.panel.centerX);
    expect(failed.panelPaddingLeft).toBe(normal.panelPaddingLeft);
    completeScenario(page, 'Pending and error states preserved layout and focus while exposing only stable public copy.');
  });
}

for (const width of [320, 390, 768, 1280, 1440]) {
  test(`session error stays safe, focused and recoverable at ${width}px`, async ({ page }) => {
    setScenario(page, {
      routes: ['/'],
      states: ['session bootstrap 503 error', 'keyboard retry', 'authenticated recovery'],
      viewports: [{ width, height: 900 }],
      expectedOutcome: 'An exact GET /me 503 shows safe centered error copy, supports visible keyboard focus, and recovers on one retry.',
      runtimeInputs: {
        width,
        accessToken: 'synthetic local token',
        expectedHttpFailure: 'GET /me 503 x1',
        retryResponse: 'GET /me 200 x1',
      },
    });
    runtimeFor(page).allowHttpFailure({ method: 'GET', path: '/me', status: 503 }, 1);
    await page.addInitScript(() => {
      localStorage.setItem('learnhub.access-token', 'visual-quality-synthetic-token');
    });
    let attempts = 0;
    await page.route('**/me', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      attempts += 1;
      if (attempts === 1) {
        await fulfillJson(route, 503, { detail: 'VISUAL_PRIVATE_SESSION_DIAGNOSTIC' });
        return;
      }
      await fulfillJson(route, 200, {
        email: 'visual.student@example.com',
        name: 'Visual',
        surname: 'Student',
        role: 'student',
        birthday: null,
        phone_number: null,
        created_at: '2026-07-22T00:00:00Z',
      });
    });

    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Session check failed' })).toBeVisible();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Unable to start the application');
    await expect(alert).toContainText('We could not verify your session. Check your connection and try again.');
    await expect(page.getByRole('main')).not.toContainText('VISUAL_PRIVATE_SESSION_DIAGNOSTIC');
    await expect(page.getByRole('main')).not.toContainText('visual-quality-synthetic-token');
    expectCleanStateLayout(await captureStateLayout(page), width);

    const retry = page.getByRole('button', { name: 'Try again', exact: true });
    await page.keyboard.press('Tab');
    await expect(retry).toBeFocused();
    expect(await retry.evaluate((button) => button.matches(':focus-visible'))).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', {
      level: 1,
      name: 'Master the Skills Shaping the Future',
    })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Found 1 course' })).toBeVisible();
    if (width < 768) {
      await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
    } else {
      await expect(page.getByRole('navigation', { name: 'Primary navigation' }))
        .toContainText('My learning');
    }
    expectCleanLayout(await captureLayout(page), width);
    expect(attempts).toBe(2);
    completeScenario(page, 'The exact 503 rendered safe centered copy, keyboard focus stayed visible, and one retry recovered cleanly.');
  });
}

test('spacing values remain valid finite pixels', async ({ page }) => {
  setScenario(page, {
    routes: ['/login'],
    states: ['normal spacing token values'],
    viewports: [{ width: 1280, height: 900 }],
    expectedOutcome: 'Computed panel spacing values are finite and match the established desktop values.',
    runtimeInputs: { width: 1280, source: 'computed CSS pixels' },
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/login');
  const values = await page.getByRole('region', { name: 'Log in' }).evaluate((panel) => {
    const style = getComputedStyle(panel);
    return [style.paddingLeft, style.paddingRight, style.gap];
  });
  expect(values.map(parsePixels)).toEqual([32, 32, 24]);
  completeScenario(page, 'Computed padding and gap values were finite and matched 32, 32, and 24 pixels.');
});

for (const reflowCase of [
  { physicalWidth: 768, effectiveWidth: 384 },
  { physicalWidth: 1280, effectiveWidth: 640 },
] as const) {
  test(`preserves shell and auth reflow at effective 200% from ${reflowCase.physicalWidth}px`, async ({ page }) => {
    setScenario(page, {
      routes: ['/', '/login'],
      states: ['effective 200% reflow', 'catalog filter keyboard focus'],
      viewports: [{ width: reflowCase.effectiveWidth, height: 900 }],
      expectedOutcome: 'Shell, catalog filters, and auth controls reflow without overflow, clipping, or an unusable header geometry seam.',
      runtimeInputs: reflowCase,
    });
    await page.setViewportSize({ width: reflowCase.effectiveWidth, height: 900 });

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Found 1 course' })).toBeVisible();
    expectCleanLayout(await captureLayout(page), reflowCase.effectiveWidth);
    expectCatalogFilterGeometry(
      (await captureCatalogGeometry(page)).filter,
      reflowCase.effectiveWidth,
    );
    for (const input of [page.getByLabel('Min price'), page.getByLabel('Max price')]) {
      await input.focus();
      await expect(input).toBeFocused();
      expect(await input.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    }

    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
    expectCleanLayout(await captureLayout(page), reflowCase.effectiveWidth);

    const headerGeometry = await page.locator('[data-app-shell-header]').evaluate((header) => {
      const rect = header.getBoundingClientRect();
      return {
        isBanner: header.tagName === 'HEADER',
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
      };
    });
    expect(headerGeometry.isBanner).toBe(true);
    expect(Number.isFinite(headerGeometry.bottom)).toBe(true);
    expect(headerGeometry.bottom).toBeGreaterThan(headerGeometry.top);
    expect(headerGeometry.width).toBe(reflowCase.effectiveWidth);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    expect(await page.getByRole('link', { name: 'Skip to main content' })
      .evaluate((link) => link.matches(':focus-visible'))).toBe(true);
    completeScenario(page, 'The effective-width viewport retained clean reflow, a measurable banner seam, and visible keyboard focus.');
  });
}
