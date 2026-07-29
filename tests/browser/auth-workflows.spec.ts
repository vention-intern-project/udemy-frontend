import { expect, test, type Locator, type Page, type Route } from '@playwright/test';
import { installCatalogFixture } from './support/catalog-fixture';
import {
  createHttpFailureAccounting,
  createRequestFailureAccounting,
  findUnexpectedConsoleErrors,
  type ConsoleErrorEvidence,
  type HttpFailureAccounting,
  type HttpFailureIdentity,
  type RequestFailureAccounting,
  type RequestFailureIdentity,
} from './support/visual-quality';

interface RuntimeEvidence {
  pageErrors: string[];
  consoleErrors: ConsoleErrorEvidence[];
  http: HttpFailureAccounting;
  requests: RequestFailureAccounting;
}

const runtimeEvidence = new WeakMap<Page, RuntimeEvidence>();

const emptyLearningEnrollments = {
  items: [],
  page: 1,
  page_size: 20,
  total: 0,
  pages: 0,
  has_next: false,
  has_previous: false,
};

const emptyCart = {
  id: 1,
  items: [],
  total_price: '0.00',
  currency: 'USD',
  item_count: 0,
};

test.beforeEach(async ({ page }) => {
  const evidence: RuntimeEvidence = {
    pageErrors: [],
    consoleErrors: [],
    http: createHttpFailureAccounting(),
    requests: createRequestFailureAccounting(),
  };
  runtimeEvidence.set(page, evidence);
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
  await page.route(
    (url) => url.pathname === '/enrollments/my' && url.search === '?page=1&page_size=20',
    async (route) => {
      const request = route.request();
      expect(request.method()).toBe('GET');
      expect(request.headers().authorization).toMatch(/^Bearer\s+\S+$/);
      await fulfillJson(route, 200, emptyLearningEnrollments);
    },
  );
  await page.route(
    (url) => url.pathname === '/cart' && url.search === '',
    async (route) => {
      const request = route.request();
      expect(request.method()).toBe('GET');
      expect(request.headers().authorization).toMatch(/^Bearer\s+\S+$/);
      await fulfillJson(route, 200, emptyCart);
    },
  );
  await installCatalogFixture(page);
});

test.afterEach(async ({ page }) => {
  const evidence = runtimeEvidence.get(page);
  expect.soft(evidence?.pageErrors ?? [], 'uncaught browser errors').toEqual([]);
  const unexpected = evidence
    ? findUnexpectedConsoleErrors(
        evidence.consoleErrors,
        evidence.http.acceptedFailures(),
        evidence.requests.acceptedFailures(),
      )
    : [];
  expect.soft(unexpected, 'unexpected browser console errors').toEqual([]);
  expect
    .soft(evidence?.http.violations().errorResponses ?? [], 'unexpected HTTP error responses')
    .toEqual([]);
  expect
    .soft(
      evidence?.http.violations().unconsumedExpectedResponses ?? [],
      'expected HTTP errors not observed',
    )
    .toEqual([]);
  expect
    .soft(evidence?.requests.violations().requestFailures ?? [], 'unexpected failed requests')
    .toEqual([]);
  expect
    .soft(
      evidence?.requests.violations().unconsumedExpectedRequestFailures ?? [],
      'expected failed requests not observed',
    )
    .toEqual([]);
});

function allowHttpFailures(
  page: Page,
  ...failures: Array<HttpFailureIdentity & { occurrences?: number }>
) {
  failures.forEach(({ occurrences = 1, ...identity }) =>
    runtimeEvidence.get(page)?.http.allow(identity, occurrences),
  );
}

function allowRouteAbort(page: Page, route: Route, errorText: string) {
  const request = route.request();
  const url = new URL(request.url());
  runtimeEvidence.get(page)?.requests.allow(
    {
      method: request.method(),
      path: `${url.pathname}${url.search}`,
      errorText,
    },
    1,
  );
}

function allowRequestFailures(
  page: Page,
  ...failures: Array<RequestFailureIdentity & { occurrences?: number }>
) {
  failures.forEach(({ occurrences = 1, ...identity }) =>
    runtimeEvidence.get(page)?.requests.allow(identity, occurrences),
  );
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function expectNoHorizontalOverflow(page: Page) {
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

async function getPanelCenterX(panel: Locator) {
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  if (!box) throw new Error('Expected the visible panel to have a bounding box');
  return box.x + box.width / 2;
}

async function requiredBoundingBox(locator: Locator) {
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

type AuthWorkflow = 'signup' | 'login' | 'forgot' | 'reset';
type PasswordRevealCssProperty = 'color' | 'background' | 'borderColor';

const workflowUi = {
  signup: {
    path: '/signup',
    idle: 'Create account',
    pending: 'Creating account...',
    operation: '/signup',
  },
  login: {
    path: '/login',
    idle: 'Log in',
    pending: 'Logging in...',
    operation: '/login',
  },
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
  } else if (workflow === 'login') {
    await page.getByLabel(/^Email/).fill('learner@example.com');
    await page.getByLabel(/^Password/).fill('password');
  } else if (workflow === 'forgot') {
    await page.getByLabel(/^Email/).fill('learner@example.com');
  } else {
    await page.getByLabel(/^New password/).fill('new password');
    await page.getByLabel(/^Confirm new password/).fill('new password');
  }
}

const profile = {
  email: 'learner@example.com',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-07-21T00:00:00Z',
};

function signupResponse(accessToken: string) {
  return {
    user: { id: 1, email: 'learner@example.com' },
    access_token: accessToken,
    token_type: 'bearer',
  };
}

for (const width of [320, 390, 768, 1280]) {
  test(`auth panels stay physically centered and catalog stays client-centered at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });

    await page.goto('/signup');
    const signupPanel = page
      .getByRole('main')
      .locator('section')
      .filter({
        has: page.getByRole('heading', { name: 'Create account' }),
      });
    const signupCenterX = await getPanelCenterX(signupPanel);
    await expectNoHorizontalOverflow(page);

    await page.goto('/login');

    const loginPanel = page
      .getByRole('main')
      .locator('section')
      .filter({
        has: page.getByRole('heading', { name: 'Log in' }),
      });
    const loginCenterX = await getPanelCenterX(loginPanel);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('link', { name: 'LearnHub home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Master the Skills Shaping the Future',
      }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Found 1 course' })).toBeVisible();
    const catalogPanel = page.locator('[data-part="catalog-content"]');
    const catalogCenterX = await getPanelCenterX(catalogPanel);
    await expectNoHorizontalOverflow(page);

    if (width >= 768) {
      const centers = await page.evaluate(() => {
        const rootRect = document.documentElement.getBoundingClientRect();
        return {
          physicalViewport: window.innerWidth / 2,
          renderedRoot: (rootRect.left + rootRect.right) / 2,
        };
      });
      expect(Math.abs(signupCenterX - centers.physicalViewport)).toBeLessThanOrEqual(1);
      expect(Math.abs(loginCenterX - centers.physicalViewport)).toBeLessThanOrEqual(1);
      expect(Math.abs(catalogCenterX - centers.renderedRoot)).toBeLessThanOrEqual(1);
      expect(Math.abs(signupCenterX - loginCenterX)).toBeLessThanOrEqual(1);
    }
  });
}

test('uses the primary violet treatment for Login and Create account navigation links', async ({
  page,
}) => {
  await page.goto('/login');

  for (const name of ['Forgot your password?', 'Create an account']) {
    await expect(page.getByRole('link', { name })).toHaveCSS('color', 'rgb(109, 40, 217)');
  }

  await page.goto('/signup');
  await expect(page.getByRole('main').getByRole('link', { name: 'Log in' })).toHaveCSS(
    'color',
    'rgb(109, 40, 217)',
  );
});

test('keeps auth panels physically centered with RTL document direction', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto('/signup');
  const originalDirection = await page.evaluate(() => document.documentElement.getAttribute('dir'));
  try {
    await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'));
    for (const width of [768, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      const signupPanel = page
        .getByRole('main')
        .locator('section')
        .filter({
          has: page.getByRole('heading', { name: 'Create account' }),
        });
      await expect
        .poll(async () => {
          const [signupCenterX, viewportCenterX] = await Promise.all([
            getPanelCenterX(signupPanel),
            page.evaluate(() => window.innerWidth / 2),
          ]);
          return Math.abs(signupCenterX - viewportCenterX);
        })
        .toBeLessThanOrEqual(1);
      await expectNoHorizontalOverflow(page);
    }
  } finally {
    await page.evaluate((direction) => {
      if (direction === null) document.documentElement.removeAttribute('dir');
      else document.documentElement.setAttribute('dir', direction);
    }, originalDirection);
  }
});

test('keeps one-sided signup errors aligned and scopes centered auth-card hierarchy', async ({
  page,
}) => {
  for (const width of [768, 1280]) {
    for (const omitted of ['name', 'surname'] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/signup');
      await page.getByLabel(/^Email/).fill('learner@example.com');
      await page.getByLabel(/^First name/).fill(omitted === 'name' ? '' : 'Ada');
      await page.getByLabel(/^Last name/).fill(omitted === 'surname' ? '' : 'Lovelace');
      await page.getByLabel(/^Password/).fill('password');
      await page.getByLabel(/^Confirm password/).fill('password');
      await page.getByRole('button', { name: 'Create account' }).press('Enter');

      const [nameLabel, surnameLabel, nameControl, surnameControl] = await Promise.all([
        requiredBoundingBox(page.locator('label[for="name"]')),
        requiredBoundingBox(page.locator('label[for="surname"]')),
        requiredBoundingBox(page.getByLabel(/^First name/)),
        requiredBoundingBox(page.getByLabel(/^Last name/)),
      ]);
      expect(Math.abs(nameLabel.y - surnameLabel.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(nameControl.y - surnameControl.y)).toBeLessThanOrEqual(1);
      await expect(
        page.getByLabel(omitted === 'name' ? /^First name/ : /^Last name/),
      ).toBeFocused();
      await expectNoHorizontalOverflow(page);
    }
  }

  const alignments = await page.getByRole('main').evaluate((main) => {
    const card = main.querySelector('section');
    const heading = card?.querySelector('h1');
    const description = heading?.nextElementSibling;
    const footer = card?.querySelector(':scope > div:last-child');
    const label = card?.querySelector('label');
    const control = card?.querySelector('input');
    if (
      !(card instanceof HTMLElement) ||
      !(heading instanceof HTMLElement) ||
      !(description instanceof HTMLElement) ||
      !(footer instanceof HTMLElement) ||
      !(label instanceof HTMLElement) ||
      !(control instanceof HTMLElement)
    ) {
      throw new Error('Auth-card hierarchy targets are unavailable');
    }
    return {
      heading: getComputedStyle(heading).textAlign,
      description: getComputedStyle(description).textAlign,
      footer: getComputedStyle(footer).textAlign,
      label: getComputedStyle(label).textAlign,
      control: getComputedStyle(control).textAlign,
    };
  });
  expect(alignments).toEqual({
    heading: 'center',
    description: 'center',
    footer: 'center',
    label: 'start',
    control: 'start',
  });
});

test('signup covers keyboard validation, safe 422/duplicate/offline states, pending lock, and success', async ({
  page,
}) => {
  allowHttpFailures(
    page,
    { method: 'POST', path: '/signup', status: 422 },
    { method: 'POST', path: '/signup', status: 400 },
  );
  allowRequestFailures(
    page,
    { method: 'GET', path: '/cart', errorText: 'net::ERR_ABORTED' },
    { method: 'GET', path: '/enrollments/my?page=1&page_size=20', errorText: 'net::ERR_ABORTED' },
  );
  let attempts = 0;
  const successGate = createDeferred();
  await page.route('**/me', (route) => fulfillJson(route, 200, profile));
  await page.route('**/signup', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    attempts += 1;
    if (attempts === 1) {
      await fulfillJson(route, 422, {
        detail: [
          { loc: ['body', 'email'], msg: 'HOSTILE_SIGNUP_EMAIL_DETAIL', type: 'value_error.email' },
          {
            loc: ['body', 'password'],
            msg: 'HOSTILE_SIGNUP_PASSWORD_DETAIL',
            type: 'vendor_private_rule',
          },
          {
            loc: ['body', 'internal'],
            msg: 'HOSTILE_SIGNUP_INTERNAL_DETAIL',
            type: 'vendor_private_rule',
          },
        ],
      });
      return;
    }
    if (attempts === 2) {
      await fulfillJson(route, 400, { detail: 'HOSTILE_SIGNUP_DUPLICATE_DETAIL' });
      return;
    }
    if (attempts === 3) {
      allowRouteAbort(page, route, 'net::ERR_INTERNET_DISCONNECTED');
      await route.abort('internetdisconnected');
      return;
    }
    await successGate.promise;
    await fulfillJson(route, 200, signupResponse('signup-browser-token'));
  });

  await page.goto('/signup');
  const submit = page.getByRole('button', { name: 'Create account' });
  await submit.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel(/^Email/)).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(0);
  for (const fieldLabel of [
    /^Email/,
    /^First name/,
    /^Last name/,
    /^Password/,
    /^Confirm password/,
  ] as const) {
    await expect(page.getByLabel(fieldLabel)).toHaveAttribute('aria-invalid', 'true');
  }

  const reveal = page.getByRole('button', { name: 'Show password' }).first();
  await reveal.focus();
  await page.keyboard.press('Space');
  await expect(page.getByLabel(/^Password/)).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByLabel(/^Email/).fill('learner@example.com');
  await page.getByLabel(/^First name/).fill('Ada');
  await page.getByLabel(/^Last name/).fill('Lovelace');
  await page.getByLabel(/^Password/).fill('password');
  await page.getByLabel(/^Confirm password/).fill('password');
  await submit.press('Enter');
  await expect(page.getByLabel(/^Email/)).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('#email-error')).toContainText('Enter a valid email address');
  await expect(page.locator('body')).not.toContainText(
    /HOSTILE_SIGNUP_(EMAIL|PASSWORD|INTERNAL)_DETAIL/,
  );
  await page.getByRole('button', { name: 'Create account' }).press('Enter');
  await expect(page.getByRole('alert')).toContainText('email may already be in use');
  await expect(page.locator('body')).not.toContainText('HOSTILE_SIGNUP_DUPLICATE_DETAIL');
  await page.getByRole('button', { name: 'Create account' }).press('Enter');
  await expect(page.getByRole('alert')).toContainText('offline');

  await dispatchSameTickSubmits(page);
  await expect(page.getByRole('button', { name: 'Creating account...' })).toBeDisabled();
  await expect(page.getByLabel(/^Email/)).toBeDisabled();
  await expect.poll(() => attempts).toBe(4);
  await expect(page.getByLabel(/^Password/)).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Show password' }).first()).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  const pendingRevealStyles = async () =>
    page
      .getByRole('button', { name: 'Show password' })
      .first()
      .evaluate((button) => {
        const resolve = (property: PasswordRevealCssProperty, token: string) => {
          const probe = document.createElement('span');
          probe.style[property] = `var(${token})`;
          document.body.append(probe);
          const style = getComputedStyle(probe);
          const value = property === 'background' ? style.backgroundColor : style[property];
          probe.remove();
          return value;
        };
        const style = getComputedStyle(button);
        return {
          color: style.color,
          background: style.backgroundColor,
          borderColor: style.borderColor,
          expectedColor: resolve('color', '--state-disabled-text'),
          expectedBackground: resolve('background', '--state-disabled-bg'),
          expectedBorderColor: resolve('borderColor', '--border-default'),
        };
      });
  await expect
    .poll(async () => {
      const styles = await pendingRevealStyles();
      return [
        styles.color === styles.expectedColor,
        styles.background === styles.expectedBackground,
        styles.borderColor === styles.expectedBorderColor,
      ];
    })
    .toEqual([true, true, true]);
  successGate.resolve();
  await expect(page).toHaveURL(/\/learning$/);
  await expect(page.getByRole('heading', { name: 'My learning' })).toBeVisible();
  expect(attempts).toBe(4);
});

test('keeps a re-masked password private after a pending login re-enables the same form', async ({
  page,
}) => {
  allowHttpFailures(page, { method: 'POST', path: '/login', status: 401 });
  const loginGate = createDeferred();
  await page.route('**/login', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await loginGate.promise;
    await fulfillJson(route, 401, { detail: 'HOSTILE_LOGIN_CREDENTIAL_DETAIL' });
  });

  await page.goto('/login');
  await page.getByLabel(/^Email/).fill('learner@example.com');
  await page.getByLabel(/^Password/).fill('password');
  await page.getByRole('button', { name: 'Show password' }).click();
  const password = page.getByLabel(/^Password/);
  await expect(password).toHaveAttribute('type', 'text');
  await expect(page.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('button', { name: 'Logging in...' })).toBeDisabled();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Show password' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  loginGate.resolve();
  await expect(page.getByRole('alert')).toContainText('email or password');
  await expect(page.getByRole('button', { name: 'Log in' })).toBeEnabled();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Show password' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.locator('body')).not.toContainText('HOSTILE_LOGIN_CREDENTIAL_DETAIL');
});

test('uses the Sort-pattern Role listbox and purple reveal states', async ({ page }) => {
  await page.goto('/signup');
  const role = page.getByRole('button', { name: 'Role' });
  const reveal = page.getByRole('button', { name: 'Show password' }).first();

  await role.focus();
  const roleFocus = await role.evaluate((button) => {
    const resolveColor = (token: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const style = getComputedStyle(button);
    return {
      outlineColor: style.outlineColor,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
      expectedFocus: resolveColor('--focus-ring'),
    };
  });
  expect(roleFocus.outlineColor).toBe(roleFocus.expectedFocus);
  expect(roleFocus.outlineWidth).toBe('2px');
  expect(roleFocus.outlineOffset).toBe('2px');

  const chevron = role.locator('[data-part="signup-role-chevron"]');
  await role.hover();
  await expect(chevron).toHaveCSS('color', 'rgb(107, 114, 128)');
  await role.click();
  const listbox = page.getByRole('listbox', { name: 'Role options' });
  await expect(listbox).toBeVisible();
  await expect(role).toHaveAttribute('aria-expanded', 'true');
  await expect(chevron).toHaveCSS('color', 'rgb(109, 40, 217)');
  const student = listbox.getByRole('option', { name: 'Student' });
  const instructor = listbox.getByRole('option', { name: 'Instructor' });
  await expect(student).toHaveAttribute('aria-selected', 'true');
  await expect(student.locator('[data-part="signup-role-radio"]')).toHaveCSS(
    'border-color',
    'rgb(109, 40, 217)',
  );
  await instructor.hover();
  await expect(instructor).toHaveCSS('background-color', 'rgb(238, 240, 244)');
  await instructor.click();
  await expect(role).toContainText('Instructor');

  await role.focus();
  await page.keyboard.press('ArrowDown');
  await expect(listbox).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(role).toContainText('Admin');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(role).toBeFocused();
  await expect(role).toContainText('Admin');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel(/^Password/)).toBeFocused();

  const revealIdle = await reveal.evaluate((button) => {
    const resolveColor = (token: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const resolveBackground = (token: string) => {
      const probe = document.createElement('span');
      probe.style.background = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };
    const style = getComputedStyle(button);
    return {
      color: style.color,
      background: style.backgroundColor,
      expectedColor: resolveColor('--action-secondary-fg'),
      expectedBackground: resolveBackground('--action-secondary-bg'),
    };
  });
  expect(revealIdle.color).toBe(revealIdle.expectedColor);
  expect(revealIdle.background).toBe(revealIdle.expectedBackground);

  await reveal.hover();
  const revealHoverStyles = async () =>
    reveal.evaluate((button) => {
      const resolveColor = (token: string) => {
        const probe = document.createElement('span');
        probe.style.color = `var(${token})`;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      const resolveBackground = (token: string) => {
        const probe = document.createElement('span');
        probe.style.background = `var(${token})`;
        document.body.append(probe);
        const color = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return color;
      };
      const style = getComputedStyle(button);
      return {
        color: style.color,
        background: style.backgroundColor,
        expectedColor: resolveColor('--action-primary-fg'),
        expectedBackground: resolveBackground('--action-primary-bg-hover'),
      };
    });
  await expect
    .poll(async () => {
      const styles = await revealHoverStyles();
      return [
        styles.color === styles.expectedColor,
        styles.background === styles.expectedBackground,
      ];
    })
    .toEqual([true, true]);

  await reveal.focus();
  const revealFocus = await reveal.evaluate((button) => {
    const resolveColor = (token: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const style = getComputedStyle(button);
    return {
      outlineColor: style.outlineColor,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
      expectedFocus: resolveColor('--focus-ring'),
    };
  });
  expect(revealFocus.outlineColor).toBe(revealFocus.expectedFocus);
  expect(revealFocus.outlineWidth).toBe('2px');
  expect(revealFocus.outlineOffset).toBe('2px');
});

test('login covers safe 401/422/offline retry, pending lock, bearer suppression, and safe returnTo', async ({
  page,
}) => {
  allowHttpFailures(
    page,
    { method: 'GET', path: '/me', status: 401 },
    { method: 'POST', path: '/login', status: 401 },
    { method: 'POST', path: '/login', status: 422 },
  );
  allowRequestFailures(page, { method: 'GET', path: '/cart', errorText: 'net::ERR_ABORTED' });
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'stale-token'));
  let loginAuthorization: string | null = 'not-observed';
  let loginRequests = 0;
  let unexpectedLoginRequests = 0;
  let cartRequests = 0;
  let unexpectedCartRequests = 0;
  const loginGate = createDeferred();

  await page.route('**/me', async (route) => {
    if (route.request().headers().authorization === 'Bearer stale-token') {
      await fulfillJson(route, 401, { detail: 'HOSTILE_STALE_SESSION_DETAIL' });
      return;
    }
    await fulfillJson(route, 200, profile);
  });
  await page.route('**/login', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    loginRequests += 1;
    loginAuthorization = route.request().headers().authorization ?? null;
    if (loginRequests === 1) {
      await fulfillJson(route, 401, { detail: 'HOSTILE_LOGIN_CREDENTIAL_DETAIL' });
      return;
    }
    if (loginRequests === 2) {
      await fulfillJson(route, 422, {
        detail: [
          { loc: ['body', 'email'], msg: 'HOSTILE_LOGIN_EMAIL_422', type: 'value_error.email' },
          {
            loc: ['body', 'password'],
            msg: 'HOSTILE_LOGIN_PASSWORD_422',
            type: 'vendor_private_rule',
          },
        ],
      });
      return;
    }
    if (loginRequests === 3) {
      allowRouteAbort(page, route, 'net::ERR_INTERNET_DISCONNECTED');
      await route.abort('internetdisconnected');
      return;
    }
    if (loginRequests > 4) {
      unexpectedLoginRequests += 1;
      await route.abort('blockedbyclient');
      return;
    }
    await loginGate.promise;
    await fulfillJson(route, 200, { access_token: 'fresh-token' });
  });
  await page.route('**/cart', async (route) => {
    const request = route.request();
    if (request.method() !== 'GET' || request.headers().authorization !== 'Bearer fresh-token') {
      unexpectedCartRequests += 1;
      await route.abort('blockedbyclient');
      return;
    }
    cartRequests += 1;
    await fulfillJson(route, 200, {
      id: 1,
      items: [],
      total_price: '0.00',
      currency: 'USD',
      item_count: 0,
    });
  });

  await page.goto('/login?returnTo=%2Fcart');
  await page.getByRole('button', { name: 'Log in' }).press('Enter');
  await expect(page.getByLabel(/^Email/)).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(loginRequests).toBe(0);

  await page.getByLabel(/^Email/).fill('learner@example.com');
  await page.getByLabel(/^Password/).fill('password');
  await page.getByLabel(/^Password/).press('Enter');
  await expect(page.getByRole('alert')).toContainText('email or password');
  await expect(page.locator('body')).not.toContainText(
    /HOSTILE_(LOGIN_CREDENTIAL|STALE_SESSION)_DETAIL/,
  );

  await page.getByRole('button', { name: 'Log in' }).press('Enter');
  await expect(page.getByLabel(/^Email/)).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('#email-error')).toContainText('Enter a valid email address');
  await expect(page.locator('body')).not.toContainText(/HOSTILE_LOGIN_(EMAIL|PASSWORD)_422/);
  await page.getByRole('button', { name: 'Log in' }).press('Enter');
  await expect(page.getByRole('alert')).toContainText('offline');

  await dispatchSameTickSubmits(page);
  const pendingSubmit = page.getByRole('button', { name: 'Logging in...' });
  await expect(pendingSubmit).toBeDisabled();
  await expect(pendingSubmit).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByLabel(/^Email/)).toBeDisabled();
  await expect(page.getByLabel(/^Password/)).toBeDisabled();
  await expect.poll(() => loginRequests).toBe(4);
  loginGate.resolve();

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('heading', { name: 'Cart' })).toBeVisible();
  await expect.poll(() => cartRequests).toBe(2);
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  const loginRequestsAfterNavigation = loginRequests;
  const cartRequestsAfterNavigation = cartRequests;
  await page.waitForTimeout(100);
  expect(loginRequests).toBe(loginRequestsAfterNavigation);
  expect(cartRequests).toBe(cartRequestsAfterNavigation);
  expect(loginRequests).toBe(4);
  expect(unexpectedLoginRequests).toBe(0);
  expect(unexpectedCartRequests).toBe(0);
  expect(loginAuthorization).toBe(null);
  expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token'))).toBe(
    'fresh-token',
  );
});

test('login rejects an external returnTo and falls back to the role home', async ({ page }) => {
  allowRequestFailures(
    page,
    { method: 'GET', path: '/cart', errorText: 'net::ERR_ABORTED' },
    { method: 'GET', path: '/enrollments/my?page=1&page_size=20', errorText: 'net::ERR_ABORTED' },
  );
  await page.route('**/me', (route) => fulfillJson(route, 200, profile));
  await page.route('**/login', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await fulfillJson(route, 200, { access_token: 'safe-fallback-token' });
  });
  await page.goto('/login?returnTo=https%3A%2F%2Fevil.example%2Fprivate');
  await page.getByLabel(/^Email/).fill('learner@example.com');
  await page.getByLabel(/^Password/).fill('password');
  await page.getByLabel(/^Password/).press('Enter');
  await expect(page).toHaveURL(/\/learning$/);
  await expect(page).not.toHaveURL(/evil\.example/);
});

test('forgot password covers safe 422, offline retry, pending double-submit lock, and neutral success', async ({
  page,
}) => {
  allowHttpFailures(page, { method: 'POST', path: '/forgot-password', status: 422 });
  let attempts = 0;
  const successGate = createDeferred();
  await page.route('**/forgot-password', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    attempts += 1;
    if (attempts === 1) {
      await fulfillJson(route, 422, {
        detail: [
          { loc: ['body', 'email'], msg: 'HOSTILE_FORGOT_EMAIL_422', type: 'value_error.email' },
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
    await fulfillJson(route, 200, { message: 'HOSTILE_PRIVATE_DELIVERY_DETAIL' });
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
});

test('reset covers missing token, safe 400/422, offline retry, pending double-submit lock, and success', async ({
  page,
}) => {
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
      await fulfillJson(route, 400, { detail: 'HOSTILE_RAW_RESET_DETAIL' });
      return;
    }
    if (attempts === 2) {
      await fulfillJson(route, 422, {
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
    await fulfillJson(route, 200, { message: 'ok' });
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
  await expect(page.locator('#password-error')).toContainText('Check this field and submit again');
  await expect(page.getByRole('main')).not.toContainText(/HOSTILE_RESET_(PASSWORD|INTERNAL)_422/);
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
});

for (const width of [320, 390, 768, 1280]) {
  test(`all auth workflow states reflow without clipping at ${width}px`, async ({ page }) => {
    allowHttpFailures(
      page,
      { method: 'POST', path: '/signup', status: 400 },
      { method: 'POST', path: '/login', status: 401 },
      { method: 'POST', path: '/forgot-password', status: 422 },
      { method: 'POST', path: '/reset-password', status: 400 },
    );
    allowRequestFailures(
      page,
      { method: 'GET', path: '/cart', errorText: 'net::ERR_ABORTED', occurrences: 2 },
      {
        method: 'GET',
        path: '/enrollments/my?page=1&page_size=20',
        errorText: 'net::ERR_ABORTED',
        occurrences: 2,
      },
    );
    await page.setViewportSize({ width, height: 800 });
    const workflows: AuthWorkflow[] = ['signup', 'login', 'forgot', 'reset'];
    const attempts: Record<AuthWorkflow, number> = { signup: 0, login: 0, forgot: 0, reset: 0 };
    const errorGates: Record<AuthWorkflow, ReturnType<typeof createDeferred>> = {
      signup: createDeferred(),
      login: createDeferred(),
      forgot: createDeferred(),
      reset: createDeferred(),
    };

    await page.route('**/me', (route) => fulfillJson(route, 200, profile));
    for (const workflow of workflows) {
      const ui = workflowUi[workflow];
      await page.route(`**${ui.operation}`, async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        attempts[workflow] += 1;
        if (attempts[workflow] === 1) {
          await errorGates[workflow].promise;
          if (workflow === 'login') {
            await fulfillJson(route, 401, { detail: 'RESPONSIVE_LOGIN_ERROR' });
          } else if (workflow === 'forgot') {
            await fulfillJson(route, 422, {
              detail: [
                {
                  loc: ['body', 'email'],
                  msg: 'RESPONSIVE_FORGOT_ERROR',
                  type: 'value_error.email',
                },
              ],
            });
          } else {
            await fulfillJson(route, 400, { detail: `RESPONSIVE_${workflow.toUpperCase()}_ERROR` });
          }
          return;
        }
        await fulfillJson(
          route,
          200,
          workflow === 'signup'
            ? signupResponse('responsive-signup-token')
            : workflow === 'login'
              ? { access_token: 'responsive-login-token' }
              : { message: 'ok' },
        );
      });
    }

    for (const [index, workflow] of workflows.entries()) {
      if (index > 0) await page.evaluate(() => localStorage.clear());
      const ui = workflowUi[workflow];
      await page.goto(ui.path);

      await page.getByRole('button', { name: ui.idle }).press('Enter');
      const firstInvalid =
        workflow === 'signup' || workflow === 'login' || workflow === 'forgot'
          ? page.getByLabel(/^Email/)
          : page.getByLabel(/^New password/);
      await expect(firstInvalid).toBeFocused();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expectNoHorizontalOverflow(page);

      await fillWorkflow(page, workflow);
      await dispatchSameTickSubmits(page);
      await expect(page.getByRole('button', { name: ui.pending })).toBeDisabled();
      await expect.poll(() => attempts[workflow]).toBe(1);
      await expectNoHorizontalOverflow(page);

      errorGates[workflow].resolve();
      if (workflow === 'forgot') {
        await expect(page.getByLabel(/^Email/)).toBeFocused();
        await expect(page.getByRole('alert')).toHaveCount(0);
      } else {
        await expect(page.getByRole('alert')).toBeVisible();
      }
      await expect(page.locator('main')).not.toContainText('RESPONSIVE_');
      await expectNoHorizontalOverflow(page);

      await page.getByRole('button', { name: ui.idle }).press('Enter');
      if (workflow === 'signup' || workflow === 'login') {
        await expect(page.getByRole('heading', { name: 'My learning' })).toBeVisible();
      } else if (workflow === 'forgot') {
        await expect(page.getByRole('status')).toContainText(
          'If the account can use password recovery',
        );
      } else {
        await expect(page.getByText('Password reset complete')).toBeVisible();
      }
      expect(attempts[workflow]).toBe(2);
      await expectNoHorizontalOverflow(page);
    }
  });
}
