import { expect, type Locator, type Page, type Route } from '@playwright/test';

import { installCatalogFixture } from '../support/catalog-fixture';
import {
  createHttpFailureAccounting,
  createRequestFailureAccounting,
  findUnexpectedConsoleErrors,
  type ConsoleErrorEvidence,
  type HttpFailureAccounting,
  type RequestFailureIdentity,
  type RequestFailureAccounting,
} from '../support/visual-quality';

export interface AuthRuntimeEvidence {
  pageErrors: string[];
  consoleErrors: ConsoleErrorEvidence[];
  http: HttpFailureAccounting;
  requests: RequestFailureAccounting;
}

export const authWorkflowRuntimeEvidence = new WeakMap<Page, AuthRuntimeEvidence>();

export function requireAuthWorkflowRuntimeEvidence(page: Page): AuthRuntimeEvidence {
  const evidence = authWorkflowRuntimeEvidence.get(page);
  if (!evidence) throw new Error('Auth workflow runtime evidence was not installed for this page.');
  return evidence;
}

const emptyLearningEnrollments = {
  items: [],
  page: 1,
  page_size: 100,
  total: 0,
  pages: 0,
  has_next: false,
  has_previous: false,
};

export const AUTH_MY_LEARNING_COLLECTION_PATH = '/enrollments/my?page=1&page_size=100';

const emptyCart = {
  id: 1,
  items: [],
  total_price: '0.00',
  currency: 'USD',
  item_count: 0,
};

export async function fulfillAuthJson(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export async function installAuthWorkflowRuntime(page: Page) {
  const evidence: AuthRuntimeEvidence = {
    pageErrors: [],
    consoleErrors: [],
    http: createHttpFailureAccounting(),
    requests: createRequestFailureAccounting(),
  };
  authWorkflowRuntimeEvidence.set(page, evidence);
  page.on('pageerror', (error) => evidence.pageErrors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error')
      evidence.consoleErrors.push({ text: message.text(), url: message.location().url });
  });
  page.on('response', (response) => {
    evidence.http.observe(response.request().method(), response.url(), response.status());
  });
  page.on('requestfailed', (request) => {
    evidence.requests.observe(
      request.method(),
      request.url(),
      request.failure()?.errorText ?? 'unknown',
    );
  });
}

export async function installAuthAdmissionRoutes(page: Page) {
  await page.route(
    (url) => `${url.pathname}${url.search}` === AUTH_MY_LEARNING_COLLECTION_PATH,
    async (route) => {
      const request = route.request();
      expect(request.method()).toBe('GET');
      expect(request.headers().authorization).toMatch(/^Bearer\s+\S+$/);
      await fulfillAuthJson(route, 200, emptyLearningEnrollments);
    },
  );
  await page.route(
    (url) => url.pathname === '/cart' && url.search === '',
    async (route) => {
      const request = route.request();
      expect(request.method()).toBe('GET');
      expect(request.headers().authorization).toMatch(/^Bearer\s+\S+$/);
      await fulfillAuthJson(route, 200, emptyCart);
    },
  );
  await installCatalogFixture(page);
}

export function assertAuthWorkflowRuntime(page: Page) {
  const evidence = requireAuthWorkflowRuntimeEvidence(page);
  expect.soft(evidence.pageErrors, 'uncaught browser errors').toEqual([]);
  const unexpected = findUnexpectedConsoleErrors(
    evidence.consoleErrors,
    evidence.http.acceptedFailures(),
    evidence.requests.acceptedFailures(),
  );
  expect.soft(unexpected, 'unexpected browser console errors').toEqual([]);
  expect
    .soft(evidence.http.violations().errorResponses, 'unexpected HTTP error responses')
    .toEqual([]);
  expect
    .soft(
      evidence.http.violations().unconsumedExpectedResponses,
      'expected HTTP errors not observed',
    )
    .toEqual([]);
  expect
    .soft(evidence.requests.violations().requestFailures, 'unexpected failed requests')
    .toEqual([]);
  expect
    .soft(
      evidence.requests.violations().unconsumedExpectedRequestFailures,
      'expected failed requests not observed',
    )
    .toEqual([]);
}

export type AuthAdmissionScenario = 'primary-navigation' | 'forgot-password' | 'reset-password';

/**
 * Capture callers select one existing owner scenario.  They never supply route
 * bodies, mutable counters, or a private assertion graph.
 */
export interface AuthAdmissionScenarioController {
  readonly scenario: AuthAdmissionScenario;
  readonly run: (page: Page) => Promise<void>;
}

export async function expectAuthNoHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const rootRect = root.getBoundingClientRect();
    return {
      root: { left: rootRect.left, right: rootRect.right, width: rootRect.width },
      document: root.scrollWidth,
      body: document.body.scrollWidth,
      clippedMainControls: [
        ...document.querySelectorAll<HTMLElement>('main input, main select, main button, main a'),
      ]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < rootRect.left - 0.5 || rect.right > rootRect.right + 0.5;
        })
        .map((element) => `${element.tagName.toLowerCase()}#${element.id}`),
    };
  });
  expect(geometry.root.width).toBeGreaterThan(0);
  expect(geometry.document).toBeLessThanOrEqual(geometry.root.width + 0.5);
  expect(geometry.body).toBeLessThanOrEqual(geometry.root.width + 0.5);
  expect(geometry.clippedMainControls).toEqual([]);
}

export async function requiredAuthBoundingBox(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Expected a rendered geometry target');
  return box;
}

async function dispatchSameTickSubmits(page: Page) {
  await page.locator('main form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function allowHttpFailures(
  page: Page,
  ...failures: Array<{ method: string; path: string; status: number }>
) {
  const evidence = requireAuthWorkflowRuntimeEvidence(page);
  failures.forEach((identity) => evidence.http.allow(identity, 1));
}

function allowRouteAbort(page: Page, route: Route, errorText: string) {
  const request = route.request();
  const url = new URL(request.url());
  requireAuthWorkflowRuntimeEvidence(page).requests.allow(
    { method: request.method(), path: `${url.pathname}${url.search}`, errorText },
    1,
  );
}

export const authAdmissionControllers: readonly AuthAdmissionScenarioController[] = [
  {
    scenario: 'primary-navigation',
    async run(page) {
      await page.goto('/login');
      for (const name of ['Forgot your password?', 'Create an account']) {
        await expectTokenCss(page.getByRole('link', { name }), 'color', '--action-primary-bg');
      }
      await page.goto('/signup');
      await expectTokenCss(
        page.getByRole('main').getByRole('link', { name: 'Log in' }),
        'color',
        '--action-primary-bg',
      );
    },
  },
  {
    scenario: 'forgot-password',
    async run(page) {
      allowHttpFailures(page, { method: 'POST', path: '/forgot-password', status: 422 });
      let attempts = 0;
      const successGate = createDeferred();
      await page.route('**/forgot-password', async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        attempts += 1;
        if (attempts === 1) {
          await fulfillAuthJson(route, 422, {
            detail: [
              {
                loc: ['body', 'email'],
                msg: 'HOSTILE_FORGOT_EMAIL_422',
                type: 'value_error.email',
              },
            ],
          });
          return;
        }
        if (attempts === 2) {
          allowRouteAbort(page, route, 'net::ERR_INTERNET_DISCONNECTED');
          await route.abort('internetdisconnected');
          return;
        }
        await successGate.promise;
        await fulfillAuthJson(route, 200, { message: 'HOSTILE_PRIVATE_DELIVERY_DETAIL' });
      });
      await page.goto('/forgot-password');
      await page.getByRole('button', { name: 'Continue' }).press('Enter');
      await expect(page.getByLabel(/^Email/)).toBeFocused();
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(attempts).toBe(0);
      await page.getByLabel(/^Email/).fill('person@example.com');
      await page.getByLabel(/^Email/).press('Enter');
      await expect(page.getByLabel(/^Email/)).toBeFocused();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.locator('#email-error')).toContainText('Enter a valid email address');
      await expect(page.locator('body')).not.toContainText('HOSTILE_FORGOT_EMAIL_422');
      await page.getByRole('button', { name: 'Continue' }).press('Enter');
      await expect(page.getByRole('alert')).toContainText('offline');
      await dispatchSameTickSubmits(page);
      await expect(page.getByRole('button', { name: 'Submitting request...' })).toBeDisabled();
      await expect(page.getByLabel(/^Email/)).toBeDisabled();
      await expect.poll(() => attempts).toBe(3);
      successGate.resolve();
      const status = page.getByRole('status');
      await expect(status).toContainText('If the account can use password recovery');
      await expect(status).not.toContainText(
        /email sent|delivery succeeded|HOSTILE_PRIVATE_DELIVERY_DETAIL/i,
      );
      expect(attempts).toBe(3);
    },
  },
  {
    scenario: 'reset-password',
    async run(page) {
      allowHttpFailures(
        page,
        { method: 'POST', path: '/reset-password', status: 400 },
        { method: 'POST', path: '/reset-password', status: 422 },
      );
      await page.goto('/reset-password');
      await expect(page).toHaveURL(/\/forgot-password\?reason=missing-token$/);
      let attempts = 0;
      const successGate = createDeferred();
      await page.route('**/reset-password', async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        attempts += 1;
        if (attempts === 1) {
          await fulfillAuthJson(route, 400, { detail: 'HOSTILE_RAW_RESET_DETAIL' });
          return;
        }
        if (attempts === 2) {
          await fulfillAuthJson(route, 422, {
            detail: [
              {
                loc: ['body', 'new_password'],
                msg: 'HOSTILE_RESET_PASSWORD_422',
                type: 'vendor_private_rule',
              },
              {
                loc: ['body', 'internal'],
                msg: 'HOSTILE_RESET_INTERNAL_422',
                type: 'vendor_private_rule',
              },
            ],
          });
          return;
        }
        if (attempts === 3) {
          allowRouteAbort(page, route, 'net::ERR_INTERNET_DISCONNECTED');
          await route.abort('internetdisconnected');
          return;
        }
        await successGate.promise;
        await fulfillAuthJson(route, 200, { message: 'ok' });
      });
      await page.goto('/reset-password?token=private-reset-token');
      await expect(page.getByRole('main')).not.toContainText('private-reset-token');
      await page.getByRole('button', { name: 'Reset password' }).press('Enter');
      await expect(page.getByLabel(/^New password/)).toBeFocused();
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(attempts).toBe(0);
      await page.getByLabel(/^New password/).fill('new password');
      await page.getByLabel(/^Confirm new password/).fill('new password');
      await page.getByLabel(/^Confirm new password/).press('Enter');
      await expect(page.getByRole('alert')).toContainText('invalid or has expired');
      await expect(page.getByRole('main')).not.toContainText('HOSTILE_RAW_RESET_DETAIL');
      await page.getByRole('button', { name: 'Reset password' }).press('Enter');
      await expect(page.getByLabel(/^New password/)).toBeFocused();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.locator('#password-error')).toContainText(
        'Check this field and submit again',
      );
      await expect(page.getByRole('main')).not.toContainText(
        /HOSTILE_RESET_(PASSWORD|INTERNAL)_422/,
      );
      await page.getByRole('button', { name: 'Reset password' }).press('Enter');
      await expect(page.getByRole('alert')).toContainText('offline');
      await dispatchSameTickSubmits(page);
      await expect(page.getByRole('button', { name: 'Resetting password...' })).toBeDisabled();
      await expect(page.getByLabel(/^New password/)).toBeDisabled();
      await expect.poll(() => attempts).toBe(4);
      successGate.resolve();
      await expect(page.getByText('Password reset complete')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Log in with your new password' })).toBeVisible();
      expect(attempts).toBe(4);
    },
  },
];

export function authAdmissionController(scenario: AuthAdmissionScenario) {
  const controller = authAdmissionControllers.find((candidate) => candidate.scenario === scenario);
  if (!controller) throw new Error(`Missing Auth admission controller: ${scenario}`);
  return controller;
}

type TokenCssProperty = 'border-color' | 'color';
type AuthResidualLocale = 'en' | 'ru' | 'uz';
interface AuthViewportScenario {
  readonly label: string;
  readonly pageScaleFactor: number;
  readonly widths: readonly number[];
}
const fulfillJson = fulfillAuthJson;
const expectNoHorizontalOverflow = expectAuthNoHorizontalOverflow;
const requiredBoundingBox = requiredAuthBoundingBox;
async function navigateWithinApp(page: Page, path: string) {
  await page.evaluate((nextPath) => {
    window.history.pushState(
      { ...(window.history.state as object), key: `auth-browser-${Date.now()}` },
      '',
      nextPath,
    );
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  }, path);
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
}
const authResidualCopy = {
  en: {
    continueLabel: 'Continue',
    createAccount: 'Create account',
    createAnAccount: 'Create an account',
    forgotPassword: 'Forgot your password?',
    logIn: 'Log in',
    passwordUpdated: 'Your password has been updated.',
    recoveryChannel:
      'If the account can use password recovery, the next steps will be available through the configured recovery channel.',
    recoveryLink:
      'Open the password-reset link from your recovery message to choose a new password.',
    resetPassword: 'Reset password',
    resetTokenHelp:
      'Your reset link supplies a private token. It stays hidden while you complete this form.',
  },
  ru: {
    continueLabel: 'Продолжить',
    createAccount: 'Создать аккаунт',
    createAnAccount: 'Создать аккаунт',
    forgotPassword: 'Забыли пароль?',
    logIn: 'Войти',
    passwordUpdated: 'Ваш пароль обновлён.',
    recoveryChannel:
      'Если для аккаунта доступно восстановление пароля, дальнейшие шаги будут доступны через настроенный канал восстановления.',
    recoveryLink:
      'Откройте ссылку для сброса пароля из сообщения для восстановления, чтобы выбрать новый пароль.',
    resetPassword: 'Сбросить пароль',
    resetTokenHelp:
      'Ссылка для сброса содержит приватный токен. Он остаётся скрытым, пока вы заполняете форму.',
  },
  uz: {
    continueLabel: 'Davom etish',
    createAccount: 'Akkaunt yaratish',
    createAnAccount: 'Akkaunt yaratish',
    forgotPassword: 'Parolni unutdingizmi?',
    logIn: 'Kirish',
    passwordUpdated: 'Parolingiz yangilandi.',
    recoveryChannel:
      'Agar akkaunt parolni tiklashdan foydalana olsa, keyingi qadamlar sozlangan tiklash kanali orqali mavjud bo‘ladi.',
    recoveryLink:
      'Yangi parol tanlash uchun tiklash xabaringizdagi parolni tiklash havolasini oching.',
    resetPassword: 'Parolni tiklash',
    resetTokenHelp:
      'Tiklash havolangiz maxfiy tokenni o‘z ichiga oladi. Shaklni to‘ldirayotganingizda u yashirin qoladi.',
  },
} as const;
const workflowUi = {
  signup: {
    path: '/signup',
    idle: 'Create account',
    pending: 'Creating account...',
    operation: '/signup',
  },
  login: { path: '/login', idle: 'Log in', pending: 'Logging in...', operation: '/login' },
  forgot: {
    path: '/forgot-password',
    idle: 'Continue',
    pending: 'Submitting request...',
    operation: '/forgot-password',
  },
  reset: {
    path: '/reset-password?token=responsive-token',
    idle: 'Reset password',
    pending: 'Resetting password...',
    operation: '/reset-password',
  },
} as const;
async function fillWorkflow(page: Page, workflow: AuthWorkflow) {
  if (workflow === 'signup') {
    await page.getByLabel(/^Email/).fill('learner@example.com');
    await page.getByLabel(/^First name/).fill('Ada');
    await page.getByLabel(/^Last name/).fill('Lovelace');
    await page.getByLabel(/^Password/).fill('password');
    await page.getByLabel(/^Confirm password/).fill('password');
    return;
  }
  if (workflow === 'login') {
    await page.getByLabel(/^Email/).fill('learner@example.com');
    await page.getByLabel(/^Password/).fill('password');
    return;
  }
  if (workflow === 'forgot') {
    await page.getByLabel(/^Email/).fill('learner@example.com');
    return;
  }
  await page.getByLabel(/^New password/).fill('new password');
  await page.getByLabel(/^Confirm new password/).fill('new password');
}
export type AuthWorkflow = 'signup' | 'login' | 'forgot' | 'reset';

const profile = {
  email: 'learner@example.com',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-07-21T00:00:00Z',
};

const APP_SHELL_BRAND_IMAGE_SELECTOR =
  'img[src*="/src/app/layouts/assets/learnhub-book-ui018.png"]';

export async function waitForAuthAppShellBrandImage(page: Page) {
  await page.locator(APP_SHELL_BRAND_IMAGE_SELECTOR).evaluate(async (element) => {
    if (!(element instanceof HTMLImageElement))
      throw new Error('AppShell brand image is unavailable');
    if (!element.complete) {
      await new Promise<void>((resolve, reject) => {
        element.addEventListener('load', () => resolve(), { once: true });
        element.addEventListener(
          'error',
          () => reject(new Error('AppShell brand image failed to load')),
          {
            once: true,
          },
        );
      });
    }
    if (element.naturalWidth <= 0) throw new Error('AppShell brand image failed to load');
  });
}

function signupResponse(accessToken: string) {
  return {
    user: { id: 1, email: 'learner@example.com' },
    access_token: accessToken,
    token_type: 'bearer',
  };
}

async function expectTokenCss(
  locator: Locator,
  property: TokenCssProperty,
  token: '--action-primary-bg',
) {
  const expectedValue = await locator.evaluate(
    (_element, expectation) => {
      const probe = document.createElement('span');
      probe.style.setProperty(expectation.property, `var(${expectation.token})`);
      document.body.append(probe);
      const value = getComputedStyle(probe).getPropertyValue(expectation.property);
      probe.remove();
      return value;
    },
    { property, token },
  );
  await expect(locator).toHaveCSS(property, expectedValue);
}

async function expectFocusedControlInVisualViewport(page: Page) {
  const geometry = await page.evaluate(() => {
    const active = document.activeElement;
    const rect = active instanceof HTMLElement ? active.getBoundingClientRect() : null;
    const viewport = window.visualViewport;
    return {
      bottom: rect?.bottom ?? Number.POSITIVE_INFINITY,
      left: rect?.left ?? -1,
      right: rect?.right ?? Number.POSITIVE_INFINITY,
      top: rect?.top ?? -1,
      visibleBottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
      visibleLeft: viewport?.offsetLeft ?? 0,
      visibleRight: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth),
      visibleTop: viewport?.offsetTop ?? 0,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(geometry.visibleLeft);
  expect(geometry.right).toBeLessThanOrEqual(geometry.visibleRight);
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.visibleTop);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.visibleBottom);
}

async function expectAllMainControlsReachableInVisualViewport(page: Page) {
  const controls = page.locator('main input, main select, main button, main a');
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    await control.evaluate((element) =>
      element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' }),
    );
    await control.focus();
    await expect(control).toBeFocused();
    await expectFocusedControlInVisualViewport(page);
  }
}

async function expectEffectivePageScaleViewportRelation(page: Page, pageScaleFactor: number) {
  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    return {
      bodyWidth: document.body.scrollWidth,
      documentWidth: root.scrollWidth,
      layoutWidth: root.clientWidth,
      scale: viewport?.scale ?? 1,
      visualWidth: viewport?.width ?? window.innerWidth,
    };
  });
  expect(geometry.scale).toBeCloseTo(pageScaleFactor, 1);
  expect(geometry.visualWidth * geometry.scale).toBeCloseTo(geometry.layoutWidth, 0);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.layoutWidth + 0.5);
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.layoutWidth + 0.5);
}

function allowRequestFailures(
  page: Page,
  ...failures: Array<RequestFailureIdentity & { occurrences?: number }>
) {
  const evidence = requireAuthWorkflowRuntimeEvidence(page);
  failures.forEach(({ occurrences = 1, ...identity }) =>
    evidence.requests.allow(identity, occurrences),
  );
}

export async function runAuthLocalizedResidualScenario(page: Page, locale: AuthResidualLocale) {
  const copy = authResidualCopy[locale];
  let forgotWrites = 0;
  let resetWrites = 0;
  await page.route('**/forgot-password', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    forgotWrites += 1;
    await fulfillJson(route, 200, { message: 'ok' });
  });
  await page.route('**/reset-password', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    resetWrites += 1;
    await fulfillJson(route, 200, { message: 'ok' });
  });

  await page.goto('/login');
  if (locale !== 'en') {
    const languageSelector = page.getByRole('button', { name: 'Change language' });
    await languageSelector.press('Enter');
    await page
      .getByRole('button', { name: locale === 'ru' ? 'Русский' : "O'zbek", exact: true })
      .press('Enter');
  }

  const residualScenarios: readonly AuthViewportScenario[] = [
    { label: 'default scale', pageScaleFactor: 1, widths: [320, 390, 768, 1280] },
    { label: 'effective 200% page scale', pageScaleFactor: 2, widths: [1280] },
  ];
  for (const { pageScaleFactor, widths } of residualScenarios) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const cdp = pageScaleFactor === 1 ? null : await page.context().newCDPSession(page);

      await navigateWithinApp(page, '/login');
      if (cdp) {
        await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor });
        await expectEffectivePageScaleViewportRelation(page, pageScaleFactor);
      }
      const loginMain = page.getByRole('main');
      const forgotLink = loginMain.getByRole('link', { name: copy.forgotPassword });
      const loginButton = loginMain.getByRole('button', { name: copy.logIn });
      const createAccountLink = loginMain.getByRole('link', { name: copy.createAnAccount });
      await expect(forgotLink).toBeVisible();
      await expect(createAccountLink).toBeVisible();
      await forgotLink.focus();
      await expect(forgotLink).toBeFocused();
      await forgotLink.press('Tab');
      await expect(loginButton).toBeFocused();
      await loginButton.press('Tab');
      await expect(createAccountLink).toBeFocused();
      await expectNoHorizontalOverflow(page);

      await createAccountLink.press('Enter');
      await expect(page).toHaveURL(/\/signup$/);
      const signupMain = page.getByRole('main');
      const signupLoginLink = signupMain.getByRole('link', { name: copy.logIn });
      await expect(signupLoginLink).toBeVisible();
      await expect(signupMain.getByRole('button', { name: copy.createAccount })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await signupLoginLink.press('Enter');
      await expect(page).toHaveURL(/\/login$/);
      const returnedLoginMain = page.getByRole('main');
      await expect(returnedLoginMain).toBeFocused();
      const returnedForgotLink = returnedLoginMain.getByRole('link', {
        name: copy.forgotPassword,
      });
      await expect(returnedForgotLink).toHaveAttribute('href', '/forgot-password');
      await returnedForgotLink.focus();
      await expect(returnedForgotLink).toBeFocused();
      await returnedForgotLink.press('Enter');
      await expect(page).toHaveURL(/\/forgot-password$/);
      const forgotMain = page.getByRole('main');
      await expect(forgotMain.getByRole('button', { name: copy.continueLabel })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await navigateWithinApp(page, '/reset-password?token=localized-browser-token');
      const resetMain = page.getByRole('main');
      await expect(resetMain.getByText(copy.resetTokenHelp, { exact: true })).toBeVisible();
      await expect(resetMain.getByRole('button', { name: copy.resetPassword })).toBeVisible();
      if (cdp) await expectAllMainControlsReachableInVisualViewport(page);
      await expectNoHorizontalOverflow(page);

      if (cdp) {
        await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
        await cdp.detach();
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 900 });
  await navigateWithinApp(page, '/forgot-password?reason=missing-token');
  await expect(page.getByRole('main').getByText(copy.recoveryLink, { exact: true })).toBeVisible();
  await navigateWithinApp(page, '/forgot-password');
  await page.locator('#email').fill('learner@example.com');
  await page.getByRole('button', { name: copy.continueLabel }).press('Enter');
  await expect(page.getByRole('main').getByRole('status')).toContainText(copy.recoveryChannel);

  await navigateWithinApp(page, '/reset-password?token=localized-browser-token');
  await page.locator('#password').fill('new password');
  await page.locator('#passwordConfirmation').fill('new password');
  await page.getByRole('button', { name: copy.resetPassword }).press('Enter');
  await expect(page.getByRole('main').getByRole('status')).toContainText(copy.passwordUpdated);
  expect({ forgotWrites, resetWrites }).toEqual({ forgotWrites: 1, resetWrites: 1 });
  await expectNoHorizontalOverflow(page);
}

export interface AuthWorkflowReflowScenario {
  readonly label: string;
  readonly pageScaleFactor: number;
  readonly width: number;
  readonly workflow: AuthWorkflow;
}

export async function runAuthWorkflowReflowScenario(
  page: Page,
  { label, pageScaleFactor, width, workflow }: AuthWorkflowReflowScenario,
) {
  void label;

  allowHttpFailures(page, {
    method: 'POST',
    path: workflowUi[workflow].operation,
    status: workflow === 'login' ? 401 : workflow === 'forgot' ? 422 : 400,
  });
  if (workflow === 'signup' || workflow === 'login') {
    allowRequestFailures(
      page,
      { method: 'GET', path: '/cart', errorText: 'net::ERR_ABORTED' },
      { method: 'GET', path: AUTH_MY_LEARNING_COLLECTION_PATH, errorText: 'net::ERR_ABORTED' },
    );
  }
  await page.setViewportSize({ width, height: 800 });
  const cdp = pageScaleFactor === 1 ? null : await page.context().newCDPSession(page);
  const ui = workflowUi[workflow];
  let attempts = 0;
  const errorGate = createDeferred();

  await page.route('**/me', (route) => fulfillJson(route, 200, profile));
  await page.route(`**${ui.operation}`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    attempts += 1;
    if (attempts === 1) {
      await errorGate.promise;
      if (workflow === 'login') {
        await fulfillAuthJson(route, 401, { detail: 'RESPONSIVE_LOGIN_ERROR' });
      } else if (workflow === 'forgot') {
        await fulfillAuthJson(route, 422, {
          detail: [
            {
              loc: ['body', 'email'],
              msg: 'RESPONSIVE_FORGOT_ERROR',
              type: 'value_error.email',
            },
          ],
        });
      } else {
        await fulfillAuthJson(route, 400, {
          detail: `RESPONSIVE_${workflow.toUpperCase()}_ERROR`,
        });
      }
      return;
    }
    await fulfillAuthJson(
      route,
      200,
      workflow === 'signup'
        ? signupResponse('responsive-signup-token')
        : workflow === 'login'
          ? { access_token: 'responsive-login-token' }
          : { message: 'ok' },
    );
  });

  try {
    await page.goto(ui.path);
    if (cdp) {
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor });
      await expectEffectivePageScaleViewportRelation(page, pageScaleFactor);
      await expectAllMainControlsReachableInVisualViewport(page);
    }

    const submit = page.getByRole('button', { name: ui.idle });
    const submitBox = await requiredBoundingBox(submit);
    expect(submitBox.width).toBeGreaterThanOrEqual(44);
    expect(submitBox.height).toBeGreaterThanOrEqual(44);
    await submit.press('Enter');
    const firstInvalid =
      workflow === 'signup' || workflow === 'login' || workflow === 'forgot'
        ? page.getByLabel(/^Email/)
        : page.getByLabel(/^New password/);
    await expect(firstInvalid).toBeFocused();
    if (cdp) {
      await firstInvalid.evaluate((control) =>
        control.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' }),
      );
      await expectFocusedControlInVisualViewport(page);
    }
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await fillWorkflow(page, workflow);
    await dispatchSameTickSubmits(page);
    await expect(page.getByRole('button', { name: ui.pending })).toBeDisabled();
    await expect.poll(() => attempts).toBe(1);
    await expectNoHorizontalOverflow(page);

    errorGate.resolve();
    if (workflow === 'forgot') {
      await expect(page.getByLabel(/^Email/)).toBeFocused();
      await expect(page.getByRole('alert')).toHaveCount(0);
    } else {
      await expect(page.getByRole('alert')).toBeVisible();
    }
    await expect(page.locator('main')).not.toContainText('RESPONSIVE_');
    if (cdp) await expectAllMainControlsReachableInVisualViewport(page);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: ui.idle }).press('Enter');
    if (workflow === 'signup' || workflow === 'login') {
      await expect(page.getByRole('heading', { name: 'My learning' })).toBeVisible();
      await waitForAuthAppShellBrandImage(page);
    } else if (workflow === 'forgot') {
      await expect(page.getByRole('status')).toContainText(
        'If the account can use password recovery',
      );
    } else {
      await expect(page.getByText('Password reset complete')).toBeVisible();
    }
    expect(attempts).toBe(2);
    await expectNoHorizontalOverflow(page);
  } finally {
    await cdp?.detach();
  }
}

export const authLocalizedResidualController = {
  scenario: 'localized-residual-copy' as const,
  run: runAuthLocalizedResidualScenario,
};

export const authWorkflowReflowController = {
  scenario: 'workflow-reflow' as const,
  run: runAuthWorkflowReflowScenario,
};
