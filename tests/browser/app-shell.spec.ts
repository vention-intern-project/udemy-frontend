import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  breakpointTokens,
  colorTokens,
  densityTokens,
  motionTokens,
  spacingTokens,
  typographyTokens,
  zIndexTokens,
} from '@shared/ui/tokens';
import { installCatalogFixture } from './support/catalog-fixture';
import {
  createHttpFailureAccounting,
  createRequestFailureAccounting,
  findUnexpectedConsoleErrors,
  type ConsoleErrorEvidence,
  type HttpFailureIdentity,
  type RequestFailureIdentity,
} from './support/visual-quality';

type BackendRole = 'student' | 'instructor' | 'admin';
type ShellSurfaceViewportWidth = 320 | 390 | 768 | 1280 | 1440;
type DesktopViewportWidth = 768 | 1280;
type MobileViewportWidth = 320 | 390;

interface RepresentativeTokenSnapshot {
  density: string | null;
  colorCanvas: string;
  textPrimary: string;
  fontFamilyBase: string;
  spacing2: string;
  controlHeightMd: string;
  durationBase: string;
  breakpointMd: string;
  zDropdown: string;
  zSticky: string;
  zAccessibility: string;
  zModal: string;
  densityCardInner: string;
  htmlColor: string;
  htmlBackgroundColor: string;
  htmlFontFamily: string;
  bodyBackgroundColor: string;
}

interface HeaderSlotBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface StudentHeaderGeometry {
  account: HeaderSlotBox;
  accountCartGap: number;
  cart: HeaderSlotBox;
  catalog: HeaderSlotBox;
  clientWidth: number;
  hasVerticalScrollbar: boolean;
  innerWidth: number;
  learning: HeaderSlotBox;
  learningWhiteSpace: string;
  overflowFree: boolean;
  search: HeaderSlotBox;
  standardGap: number;
}

interface ExpectedRequestFailureInput extends RequestFailureIdentity {
  occurrences?: number;
}

const CART_STRICT_MODE_ABORT: RequestFailureIdentity = {
  method: 'GET',
  path: '/cart',
  errorText: 'net::ERR_ABORTED',
};

const ENROLLMENTS_STRICT_MODE_ABORT: RequestFailureIdentity = {
  method: 'GET',
  path: '/enrollments/my?page=1&page_size=20',
  errorText: 'net::ERR_ABORTED',
};

async function readRepresentativeTokenSnapshot(page: Page): Promise<RepresentativeTokenSnapshot> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const bodyStyle = getComputedStyle(document.body);
    const readToken = (name: string) => rootStyle.getPropertyValue(name).trim();

    return {
      density: root.getAttribute('data-density'),
      colorCanvas: readToken('--color-canvas'),
      textPrimary: readToken('--text-primary'),
      fontFamilyBase: readToken('--font-family-base'),
      spacing2: readToken('--spacing-2'),
      controlHeightMd: readToken('--control-height-md'),
      durationBase: readToken('--duration-base'),
      breakpointMd: readToken('--bp-md'),
      zDropdown: readToken('--z-dropdown'),
      zSticky: readToken('--z-sticky'),
      zAccessibility: readToken('--z-accessibility'),
      zModal: readToken('--z-modal'),
      densityCardInner: readToken('--density-card-inner'),
      htmlColor: rootStyle.color,
      htmlBackgroundColor: rootStyle.backgroundColor,
      htmlFontFamily: rootStyle.fontFamily,
      bodyBackgroundColor: bodyStyle.backgroundColor,
    };
  });
}

async function resolveBrowserColor(page: Page, value: string) {
  return page.evaluate((color) => {
    const probe = document.createElement('span');
    probe.style.color = color;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, value);
}

async function resolveBrowserFontFamily(page: Page, value: string) {
  return page.evaluate((fontFamily) => {
    const probe = document.createElement('span');
    probe.style.fontFamily = fontFamily;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).fontFamily;
    probe.remove();
    return resolved;
  }, value);
}

function monitorRuntime(
  page: Page,
  expectedHttpFailures: readonly HttpFailureIdentity[] = [],
  expectedRequestFailures: readonly ExpectedRequestFailureInput[] = [],
) {
  const pageErrors: string[] = [];
  const consoleErrors: ConsoleErrorEvidence[] = [];
  const responseAccounting = createHttpFailureAccounting();
  const requestAccounting = createRequestFailureAccounting();
  expectedHttpFailures.forEach((failure) => responseAccounting.allow(failure, 1));
  expectedRequestFailures.forEach(({ occurrences = 1, ...failure }) => {
    requestAccounting.allow(failure, occurrences);
  });
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error')
      consoleErrors.push({ text: message.text(), url: message.location().url });
  });
  page.on('requestfailed', (request) => {
    requestAccounting.observe(
      request.method(),
      request.url(),
      request.failure()?.errorText ?? 'unknown',
    );
  });
  page.on('response', (response) => {
    responseAccounting.observe(response.request().method(), response.url(), response.status());
  });
  return () => {
    const unexpectedConsoleErrors = findUnexpectedConsoleErrors(
      consoleErrors,
      responseAccounting.acceptedFailures(),
      requestAccounting.acceptedFailures(),
    );
    expect(pageErrors, 'uncaught browser errors').toEqual([]);
    expect(unexpectedConsoleErrors, 'unexpected browser console errors').toEqual([]);
    expect(
      requestAccounting.violations().requestFailures,
      'unexpected browser request failures',
    ).toEqual([]);
    expect(
      requestAccounting.violations().unconsumedExpectedRequestFailures,
      'expected browser request failures not observed',
    ).toEqual([]);
    expect(
      responseAccounting.violations().errorResponses,
      'unexpected HTTP error responses',
    ).toEqual([]);
    expect(
      responseAccounting.violations().unconsumedExpectedResponses,
      'expected HTTP error responses not observed',
    ).toEqual([]);
  };
}

function normalizeFontFamily(value: string) {
  return value.replace(/["']/g, '').replace(/\s+/g, ' ').trim();
}

async function mockAuthenticatedSession(page: Page, role: BackendRole) {
  await page.addInitScript(() => {
    localStorage.setItem('learnhub.access-token', 'browser-test-token');
  });
  await page.route('**/me', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: `${role}@example.com`,
        name: role === 'student' ? 'Sam' : role === 'instructor' ? 'Indira' : 'Alex',
        surname: 'User',
        role,
        birthday: null,
        phone_number: null,
        created_at: '2026-07-20T00:00:00Z',
      }),
    }),
  );
}

async function mockStudentWorkspaceData(page: Page) {
  await page.route('**/cart', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        items: [],
        total_price: '0.00',
        currency: 'USD',
        item_count: 0,
      }),
    }),
  );
  await page.route('**/enrollments/my**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      }),
    }),
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => {
    const root = document.documentElement;
    const rootRect = root.getBoundingClientRect();
    return {
      renderedRoot: rootRect.width,
      document: root.scrollWidth,
      body: document.body.scrollWidth,
    };
  });
  expect(widths.renderedRoot).toBeGreaterThan(0);
  expect(widths.document).toBeLessThanOrEqual(widths.renderedRoot + 0.5);
  expect(widths.body).toBeLessThanOrEqual(widths.renderedRoot + 0.5);
}

async function expectShellSurfacesAtViewportEdges(page: Page, width: ShellSurfaceViewportWidth) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await page.getByRole('contentinfo').evaluate((footer) =>
    footer.scrollIntoView({
      block: 'center',
      inline: 'nearest',
    }),
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

  const geometry = await page.evaluate(() => {
    const header = document.querySelector('[data-app-shell-header]');
    const footer = document.querySelector('footer');
    if (!(header instanceof HTMLElement) || !(footer instanceof HTMLElement)) {
      throw new Error('Shell surface geometry targets are unavailable');
    }
    const rootRect = document.documentElement.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const colorPixel = (color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Surface color probe is unavailable');
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    return {
      viewport: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollbarGutter: getComputedStyle(document.documentElement).scrollbarGutter,
      rootOverflowY: getComputedStyle(document.documentElement).overflowY,
      root: { left: rootRect.left, right: rootRect.right, width: rootRect.width },
      header: { left: headerRect.left, right: headerRect.right },
      footer: { left: footerRect.left, right: footerRect.right },
      headerY: Math.floor((headerRect.top + headerRect.bottom) / 2),
      footerY: Math.floor((footerRect.top + footerRect.bottom) / 2),
      footerVisible: footerRect.top >= -1 && footerRect.bottom <= window.innerHeight + 1,
      headerColor: colorPixel(getComputedStyle(header).backgroundColor),
      footerColor: colorPixel(getComputedStyle(footer).backgroundColor),
    };
  });
  expect(geometry.scrollbarGutter).toBe('auto');
  expect(geometry.rootOverflowY).toBe('scroll');
  expect(geometry.footerVisible).toBe(true);
  expect(geometry.root.width).toBeGreaterThan(0);
  expect(geometry.root.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.root.right).toBeLessThanOrEqual(geometry.viewport + 1);
  const physicalLeftGap = Math.max(0, geometry.root.left);
  const physicalRightGap = Math.max(0, geometry.viewport - geometry.root.right);
  expect(physicalLeftGap).toBeLessThanOrEqual(1);
  expect(physicalRightGap).toBeGreaterThanOrEqual(0);
  expect(physicalRightGap).toBeLessThanOrEqual(17);
  for (const surface of [geometry.header, geometry.footer]) {
    expect(Math.abs(surface.left - geometry.root.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(surface.right - geometry.root.right)).toBeLessThanOrEqual(1);
  }

  const screenshot = await page.screenshot({ animations: 'disabled' });
  const edgePixels = await page.evaluate(
    async ({ imageBase64, points }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${imageBase64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Screenshot pixel probe is unavailable');
      context.drawImage(image, 0, 0);
      const scaleX = image.naturalWidth / window.innerWidth;
      const scaleY = image.naturalHeight / window.innerHeight;
      return points.map(({ x, y }) =>
        Array.from(
          context.getImageData(
            Math.min(image.naturalWidth - 1, Math.max(0, Math.floor(x * scaleX))),
            Math.min(image.naturalHeight - 1, Math.max(0, Math.floor(y * scaleY))),
            1,
            1,
          ).data,
        ),
      );
    },
    {
      imageBase64: screenshot.toString('base64'),
      points: [
        { x: 0, y: geometry.headerY },
        { x: Math.max(0, Math.ceil(geometry.root.right) - 1), y: geometry.headerY },
        { x: 0, y: geometry.footerY },
        { x: Math.max(0, Math.ceil(geometry.root.right) - 1), y: geometry.footerY },
      ],
    },
  );
  expect(edgePixels[0]).toEqual(geometry.headerColor);
  expect(edgePixels[1]).toEqual(geometry.headerColor);
  expect(edgePixels[2]).toEqual(geometry.footerColor);
  expect(edgePixels[3]).toEqual(geometry.footerColor);
  await expectNoHorizontalOverflow(page);
}

async function requiredBoundingBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box, 'expected a rendered geometry target').not.toBeNull();
  return box!;
}

async function expectBrandComposition(brand: Locator) {
  await expect(brand).toBeVisible();
  await expect(brand).toHaveAccessibleName('LearnHub home');
  await expect(brand).toHaveText('LearnHub');

  const metrics = await brand.evaluate((link) => {
    const marks = link.querySelectorAll(':scope > svg[aria-hidden="true"]');
    const wordmarks = link.querySelectorAll(':scope > span');
    const mark = marks.item(0);
    const wordmark = wordmarks.item(0);
    const outline = mark?.querySelector('rect');
    const book = mark?.querySelector('path');
    if (
      marks.length !== 1 ||
      wordmarks.length !== 1 ||
      !(mark instanceof SVGElement) ||
      !(wordmark instanceof HTMLElement) ||
      !(outline instanceof SVGElement) ||
      !(book instanceof SVGElement)
    ) {
      throw new Error('Brand composition targets are unavailable');
    }

    const resolveColor = (token: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const linkRect = link.getBoundingClientRect();
    const markRect = mark.getBoundingClientRect();
    const wordmarkRect = wordmark.getBoundingClientRect();
    const outlineStyle = getComputedStyle(outline);
    const bookStyle = getComputedStyle(book);
    const linkStyle = getComputedStyle(link);
    const wordmarkStyle = getComputedStyle(wordmark);
    return {
      linkText: link.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      markText: mark.textContent?.trim() ?? '',
      markAriaHidden: mark.getAttribute('aria-hidden'),
      markFocusable: mark.getAttribute('focusable'),
      textElementCount: mark.querySelectorAll('text').length,
      wordmarkText: wordmark.textContent,
      wordmarkVisible: wordmarkStyle.display !== 'none',
      markWidth: markRect.width,
      markHeight: markRect.height,
      centerDelta: Math.abs(
        (markRect.top + markRect.bottom) / 2 - (wordmarkRect.top + wordmarkRect.bottom) / 2,
      ),
      markInsideLink:
        markRect.left >= linkRect.left - 0.5 &&
        markRect.right <= linkRect.right + 0.5 &&
        markRect.top >= linkRect.top - 0.5 &&
        markRect.bottom <= linkRect.bottom + 0.5,
      wordmarkInsideLink:
        wordmarkRect.left >= linkRect.left - 0.5 &&
        wordmarkRect.right <= linkRect.right + 0.5 &&
        wordmarkRect.top >= linkRect.top - 0.5 &&
        wordmarkRect.bottom <= linkRect.bottom + 0.5,
      outlineStroke: outlineStyle.stroke,
      bookFill: bookStyle.fill,
      expectedPurple: resolveColor('--action-primary-bg'),
      outlineStrokeWidth: Number.parseFloat(outlineStyle.strokeWidth),
      outlineRadius: Number.parseFloat(outline.getAttribute('rx') ?? '0'),
      wordmarkWeight: linkStyle.fontWeight,
      expectedWeight: getComputedStyle(document.documentElement)
        .getPropertyValue('--font-weight-semibold')
        .trim(),
    };
  });

  expect(metrics.linkText).toBe('LearnHub');
  expect(metrics.markText).toBe('');
  expect(metrics.markAriaHidden).toBe('true');
  expect(metrics.markFocusable).toBe('false');
  expect(metrics.textElementCount).toBe(0);
  expect(metrics.wordmarkText).toBe('LearnHub');
  expect(metrics.markWidth).toBe(32);
  expect(metrics.markHeight).toBe(32);
  if (metrics.wordmarkVisible) expect(metrics.centerDelta).toBeLessThanOrEqual(1);
  expect(metrics.markInsideLink).toBe(true);
  expect(metrics.wordmarkInsideLink).toBe(true);
  expect(metrics.outlineStroke).toBe(metrics.expectedPurple);
  expect(metrics.bookFill).toBe(metrics.expectedPurple);
  expect(metrics.outlineStrokeWidth).toBe(2);
  expect(metrics.outlineRadius).toBeGreaterThan(0);
  expect(metrics.wordmarkWeight).toBe(metrics.expectedWeight);
}

async function expectBrandFocusTreatment(page: Page, brand: Locator) {
  await page.getByRole('link', { name: 'Skip to main content' }).focus();
  await page.keyboard.press('Tab');
  await expect(brand).toBeFocused();

  const focus = await brand.evaluate((link) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--focus-ring)';
    document.body.append(probe);
    const expectedColor = getComputedStyle(probe).color;
    probe.remove();
    const style = getComputedStyle(link);
    return {
      color: style.outlineColor,
      expectedColor,
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focus.style).not.toBe('none');
  expect(focus.width).toBeGreaterThan(0);
  expect(focus.color).toBe(focus.expectedColor);
}

async function expectBrandContainedInHeader(brand: Locator) {
  const containment = await brand.evaluate((link) => {
    const header = link.closest('[data-app-shell-header]');
    const inner = header?.firstElementChild;
    if (!(inner instanceof HTMLElement))
      throw new Error('Header containment target is unavailable');
    const linkRect = link.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    return {
      leftInset: linkRect.left - innerRect.left,
      rightInset: innerRect.right - linkRect.right,
      clientWidth: link.clientWidth,
      scrollWidth: link.scrollWidth,
    };
  });
  expect(containment.leftInset).toBeGreaterThanOrEqual(-0.5);
  expect(containment.rightInset).toBeGreaterThanOrEqual(-0.5);
  expect(containment.scrollWidth).toBeLessThanOrEqual(containment.clientWidth);
}

async function expectAnonymousDesktopHeaderGeometry(page: Page, width: DesktopViewportWidth) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');

  const brand = page.getByRole('link', { name: 'LearnHub home' });
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  const accountNavigation = page.getByRole('navigation', { name: 'Account navigation' });
  const browse = navigation.getByRole('link', { name: 'Catalog' });
  const login = accountNavigation.getByRole('link', { name: 'Log in' });
  const signup = accountNavigation.getByRole('link', { name: 'Sign up' });
  await expectBrandComposition(brand);
  await expectBrandFocusTreatment(page, brand);
  await expect(browse).toBeVisible();
  await expect(login).toBeVisible();
  await expect(signup).toBeVisible();
  expect(await navigation.locator('a').allTextContents()).toEqual(['Catalog']);
  expect(await accountNavigation.locator('a').allTextContents()).toEqual(['Log in', 'Sign up']);

  const [brandBox, browseBox, loginBox, signupBox] = await Promise.all([
    requiredBoundingBox(brand),
    requiredBoundingBox(browse),
    requiredBoundingBox(login),
    requiredBoundingBox(signup),
  ]);
  const brandToBrowseGap = browseBox.x - (brandBox.x + brandBox.width);
  const loginToSignupGap = signupBox.x - (loginBox.x + loginBox.width);
  expect(brandToBrowseGap).toBeGreaterThanOrEqual(0);
  expect(brandToBrowseGap).toBeLessThanOrEqual(32);
  expect(loginToSignupGap).toBeGreaterThanOrEqual(0);
  expect(loginToSignupGap).toBeLessThanOrEqual(16);

  const idleStyles = await Promise.all([
    browse.evaluate((link) => {
      const style = getComputedStyle(link);
      const after = getComputedStyle(link, '::after');
      const probe = document.createElement('span');
      probe.style.color = 'var(--action-primary-bg)';
      document.body.append(probe);
      const expectedPurple = getComputedStyle(probe).color;
      probe.remove();
      return {
        background: style.backgroundColor,
        color: style.color,
        underlineBackground: after.backgroundColor,
        underlineHeight: after.height,
        underlineWidth: after.width,
        expectedPurple,
      };
    }),
    signup.evaluate((link) => {
      const style = getComputedStyle(link);
      const probe = document.createElement('span');
      probe.style.color = 'var(--action-primary-fg)';
      probe.style.background = 'var(--action-primary-bg)';
      document.body.append(probe);
      const expected = getComputedStyle(probe);
      const result = {
        color: style.color,
        background: style.backgroundColor,
        expectedColor: expected.color,
        expectedBackground: expected.backgroundColor,
      };
      probe.remove();
      return result;
    }),
  ]);
  expect(idleStyles[0].color).toBe(idleStyles[0].expectedPurple);
  expect(idleStyles[0].background).toBe('rgba(0, 0, 0, 0)');
  expect(idleStyles[0].underlineBackground).toBe(idleStyles[0].expectedPurple);
  expect(idleStyles[0].underlineHeight).toBe('2px');
  expect(idleStyles[0].underlineWidth).toBe('24px');
  expect(idleStyles[1].color).toBe(idleStyles[1].expectedColor);
  expect(idleStyles[1].background).toBe(idleStyles[1].expectedBackground);
  await signup.hover();
  await expect
    .poll(() =>
      signup.evaluate((link) => {
        const probe = document.createElement('span');
        probe.style.background = 'var(--action-primary-bg-hover)';
        document.body.append(probe);
        const expectedBackground = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return getComputedStyle(link).backgroundColor === expectedBackground;
      }),
    )
    .toBe(true);
  await signup.focus();
  await expect(signup).toBeFocused();
  const focusStyle = await signup.evaluate((link) => getComputedStyle(link).outlineStyle);
  expect(focusStyle).not.toBe('none');
  await expectNoHorizontalOverflow(page);

  await page.goto('/login');
  const activeLogin = page
    .getByRole('navigation', { name: 'Account navigation' })
    .getByRole('link', { name: 'Log in' });
  await expect(activeLogin).toHaveAttribute('aria-current', 'page');
  const activeLoginStyle = await activeLogin.evaluate((link) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--action-primary-bg-pressed)';
    probe.style.background = 'var(--action-secondary-bg)';
    document.body.append(probe);
    const expected = getComputedStyle(probe);
    const result = {
      color: getComputedStyle(link).color,
      background: getComputedStyle(link).backgroundColor,
      expectedColor: expected.color,
      expectedBackground: expected.backgroundColor,
    };
    probe.remove();
    return result;
  });
  expect(activeLoginStyle.color).toBe(activeLoginStyle.expectedColor);
  expect(activeLoginStyle.background).toBe(activeLoginStyle.expectedBackground);
}

async function expectAnonymousMobileNavigation(page: Page, width: MobileViewportWidth) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.focus();
  await page.keyboard.press('Enter');
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });
  const browse = navigation.getByRole('link', { name: 'Catalog' });
  const login = navigation.getByRole('link', { name: 'Log in' });
  const signup = navigation.getByRole('link', { name: 'Sign up' });
  expect(await navigation.locator('a').allTextContents()).toEqual(['Catalog', 'Log in', 'Sign up']);
  await browse.focus();
  await page.keyboard.press('Tab');
  await expect(login).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(signup).toBeFocused();
  await expectNoHorizontalOverflow(page);
}

async function expectInstructorDesktopHeaderNavigation(page: Page, width: DesktopViewportWidth) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/instructor/courses');
  await expect(page.getByRole('heading', { level: 1, name: 'Instructor courses' })).toBeVisible();

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  const instructorCourses = navigation.getByRole('link', { name: 'My courses' });
  const profile = page.getByRole('button', { name: 'Account menu for Indira User' });
  await expect(navigation).toBeVisible();
  await expect(instructorCourses).toBeVisible();
  await expect(instructorCourses).toHaveAttribute('aria-current', 'page');
  await expect(profile).toBeVisible();
  await expect(page.getByRole('link', { name: /^Cart/ })).toHaveCount(0);

  await requiredBoundingBox(instructorCourses);
  await requiredBoundingBox(profile);
  await expectNoHorizontalOverflow(page);
}

async function readStudentHeaderGeometry(page: Page): Promise<StudentHeaderGeometry> {
  return page.getByRole('banner').evaluate((header) => {
    const read = (selector: string) => {
      const element = header.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing header slot target: ${selector}`);
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const root = document.documentElement;
    const cart = read('a[aria-label^="Cart"]');
    const account = read('[data-account-initials]');
    return {
      catalog: read('nav[aria-label="Primary navigation"] a[href="/"]'),
      search: read('input[name="search_query"]'),
      cart,
      account,
      accountCartGap: cart.x - (account.x + account.width),
      learning: read('a[href="/learning"]'),
      clientWidth: root.clientWidth,
      innerWidth: window.innerWidth,
      hasVerticalScrollbar: root.scrollHeight > root.clientHeight,
      learningWhiteSpace: getComputedStyle(
        header.querySelector<HTMLElement>('a[href="/learning"]')!,
      ).whiteSpace,
      overflowFree: root.scrollWidth <= root.clientWidth,
      standardGap: Number.parseFloat(getComputedStyle(root).getPropertyValue('--spacing-4')),
    };
  });
}

async function expectMenuAtHeaderContentEdge(page: Page) {
  const offset = await page.getByRole('button', { name: 'Open navigation' }).evaluate((button) => {
    const header = button.closest('[data-app-shell-header]');
    const inner = header?.firstElementChild;
    if (!(inner instanceof HTMLElement)) throw new Error('Header geometry target is unavailable');
    const innerRect = inner.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const contentRight = innerRect.right - Number.parseFloat(getComputedStyle(inner).paddingRight);
    return Math.abs(buttonRect.right - contentRight);
  });
  expect(offset).toBeLessThanOrEqual(1);
}

async function expectMobileMenuGeometry(page: Page) {
  const metrics = await page.getByRole('button', { name: 'Open navigation' }).evaluate((button) => {
    const labels = button.querySelectorAll('[aria-hidden="true"]');
    const label = labels.item(0);
    const header = button.closest('[data-app-shell-header]');
    if (
      labels.length !== 1 ||
      !(label instanceof HTMLElement) ||
      !(header instanceof HTMLElement)
    ) {
      throw new Error('Mobile menu geometry targets are unavailable');
    }

    const buttonRect = button.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const style = getComputedStyle(button);
    const labelStyle = getComputedStyle(label);
    return {
      labelText: label.textContent?.trim() ?? '',
      labelDisplay: labelStyle.display,
      labelVisibility: labelStyle.visibility,
      labelOpacity: Number.parseFloat(labelStyle.opacity),
      labelWidth: labelRect.width,
      labelHeight: labelRect.height,
      width: buttonRect.width,
      height: buttonRect.height,
      paddingLeft: Number.parseFloat(style.paddingLeft),
      paddingRight: Number.parseFloat(style.paddingRight),
      labelLeftInset: labelRect.left - buttonRect.left,
      labelRightInset: buttonRect.right - labelRect.right,
      labelTopInset: labelRect.top - buttonRect.top,
      labelBottomInset: buttonRect.bottom - labelRect.bottom,
      horizontalCenterOffset: Math.abs(
        (labelRect.left + labelRect.right) / 2 - (buttonRect.left + buttonRect.right) / 2,
      ),
      verticalCenterOffset: Math.abs(
        (labelRect.top + labelRect.bottom) / 2 - (buttonRect.top + buttonRect.bottom) / 2,
      ),
      clientWidth: button.clientWidth,
      scrollWidth: button.scrollWidth,
      clientHeight: button.clientHeight,
      scrollHeight: button.scrollHeight,
      headerClientWidth: header.clientWidth,
      headerScrollWidth: header.scrollWidth,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });

  expect(metrics.labelText).toBe('Menu');
  expect(metrics.labelDisplay).not.toBe('none');
  expect(metrics.labelVisibility).toBe('visible');
  expect(metrics.labelOpacity).toBeGreaterThan(0);
  expect(metrics.labelWidth).toBeGreaterThan(0);
  expect(metrics.labelHeight).toBeGreaterThan(0);
  expect(metrics.width).toBeGreaterThanOrEqual(44);
  expect(metrics.height).toBeGreaterThanOrEqual(44);
  expect(metrics.paddingLeft).toBeGreaterThanOrEqual(8);
  expect(metrics.paddingRight).toBeGreaterThanOrEqual(8);
  expect(metrics.labelLeftInset).toBeGreaterThan(metrics.paddingLeft);
  expect(metrics.labelRightInset).toBeGreaterThan(metrics.paddingRight);
  expect(metrics.labelTopInset).toBeGreaterThan(0);
  expect(metrics.labelBottomInset).toBeGreaterThan(0);
  expect(metrics.horizontalCenterOffset).toBeLessThanOrEqual(1);
  expect(metrics.verticalCenterOffset).toBeLessThanOrEqual(1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight);
  expect(metrics.headerScrollWidth).toBeLessThanOrEqual(metrics.headerClientWidth);
  expect(metrics.outlineStyle).not.toBe('none');
  expect(metrics.outlineWidth).toBeGreaterThan(0);
}

test.beforeEach(async ({ page }) => {
  await installCatalogFixture(page);
});

test('redirects an anonymous protected route with its internal returnTo', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/cart?coupon=SAVE#summary');
  await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/cart?coupon=SAVE#summary');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('aligns anonymous desktop navigation and renders the lighter brand', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await expectAnonymousDesktopHeaderGeometry(page, 768);
  await expectAnonymousDesktopHeaderGeometry(page, 1280);
  assertRuntimeClean();
});

test('keeps anonymous mobile navigation in visual and keyboard order', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await expectAnonymousMobileNavigation(page, 320);
  await expectAnonymousMobileNavigation(page, 390);
  assertRuntimeClean();
});

test('keeps header and footer surfaces at the physical viewport edges without symmetric gutters', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(page);
  for (const width of [320, 390, 768, 1280, 1440] as const) {
    await expectShellSurfacesAtViewportEdges(page, width);
  }
  assertRuntimeClean();
});

test('keeps the complete LearnHub brand accessible when authenticated', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(
    page,
    [],
    [ENROLLMENTS_STRICT_MODE_ABORT, CART_STRICT_MODE_ABORT],
  );
  await mockAuthenticatedSession(page, 'student');
  await mockStudentWorkspaceData(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/learning');
  const brand = page.getByRole('link', { name: 'LearnHub home' });
  await expectBrandComposition(brand);
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('exposes representative production tokens across marketplace and workspace density', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  const marketplace = await readRepresentativeTokenSnapshot(page);
  const expectedCanvasColor = await resolveBrowserColor(page, colorTokens['--color-canvas']);
  const expectedTextColor = await resolveBrowserColor(page, colorTokens['--text-primary']);
  const expectedFontFamily = await resolveBrowserFontFamily(
    page,
    typographyTokens['--font-family-base'],
  );

  expect(marketplace.density).toBe('marketplace');
  expect(marketplace.colorCanvas.toLowerCase()).toBe(colorTokens['--color-canvas'].toLowerCase());
  expect(marketplace.textPrimary.toLowerCase()).toBe(colorTokens['--text-primary'].toLowerCase());
  expect(normalizeFontFamily(marketplace.fontFamilyBase)).toBe(
    normalizeFontFamily(expectedFontFamily),
  );
  expect(marketplace.spacing2).toBe(spacingTokens['--spacing-2']);
  expect(marketplace.controlHeightMd).toBe(spacingTokens['--control-height-md']);
  expect(marketplace.durationBase).toBe(motionTokens['--duration-base']);
  expect(marketplace.breakpointMd).toBe(breakpointTokens['--bp-md']);
  expect(marketplace.zDropdown).toBe(zIndexTokens['--z-dropdown']);
  expect(marketplace.zSticky).toBe(zIndexTokens['--z-sticky']);
  expect(marketplace.zAccessibility).toBe(zIndexTokens['--z-accessibility']);
  expect(marketplace.zModal).toBe(zIndexTokens['--z-modal']);
  expect(Number(marketplace.zSticky)).toBeLessThan(Number(marketplace.zAccessibility));
  expect(Number(marketplace.zAccessibility)).toBeLessThan(Number(marketplace.zModal));
  expect(marketplace.densityCardInner).toBe(densityTokens.marketplace.cardInnerPadding);
  expect(marketplace.htmlColor).toBe(expectedTextColor);
  expect(marketplace.htmlBackgroundColor).toBe(expectedCanvasColor);
  expect(marketplace.bodyBackgroundColor).toBe(expectedCanvasColor);
  expect(marketplace.htmlFontFamily).toBe(expectedFontFamily);

  await mockAuthenticatedSession(page, 'instructor');
  await page.goto('/instructor/courses');
  await expect(page.getByRole('heading', { level: 1, name: 'Instructor courses' })).toBeVisible();

  const workspace = await readRepresentativeTokenSnapshot(page);
  expect(workspace.density).toBe('workspace');
  expect(workspace.densityCardInner).toBe(densityTokens.workspace.cardInnerPadding);
  expect(workspace.colorCanvas).toBe(marketplace.colorCanvas);
  expect(workspace.spacing2).toBe(marketplace.spacing2);
  expect(workspace.controlHeightMd).toBe(marketplace.controlHeightMd);
  expect(workspace.durationBase).toBe(marketplace.durationBase);
  expect(workspace.breakpointMd).toBe(marketplace.breakpointMd);
  expect(workspace.zDropdown).toBe(marketplace.zDropdown);
  expect(workspace.zSticky).toBe(marketplace.zSticky);
  expect(workspace.zAccessibility).toBe(marketplace.zAccessibility);
  expect(workspace.zModal).toBe(marketplace.zModal);
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('keeps the accepted instructor navigation and initials marker at desktop widths', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await expectInstructorDesktopHeaderNavigation(page, 768);
  await expectInstructorDesktopHeaderNavigation(page, 1280);
  assertRuntimeClean();
});

test('shows authenticated account details on hover and clears the session through Log out', async ({
  page,
}) => {
  await mockAuthenticatedSession(page, 'student');
  await mockStudentWorkspaceData(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/learning');

  const account = page.getByRole('button', { name: 'Account menu for Sam User' });
  await account.hover();
  const accountDetails = page.getByRole('group', { name: 'Account details for Sam User' });
  await expect(accountDetails).toBeVisible();
  await expect(page.getByRole('menu')).toHaveCount(0);
  const [accountBox, menuBox] = await Promise.all([
    account.boundingBox(),
    accountDetails.boundingBox(),
  ]);
  if (!accountBox || !menuBox) throw new Error('Account details geometry is unavailable.');
  expect(
    Math.abs(accountBox.x + accountBox.width / 2 - (menuBox.x + menuBox.width / 2)),
  ).toBeLessThanOrEqual(0.5);
  expect(menuBox.y - (accountBox.y + accountBox.height)).toBeCloseTo(12, 1);
  await page.mouse.move(accountBox.x + accountBox.width / 2, accountBox.y + accountBox.height - 1);
  await page.mouse.move(menuBox.x + menuBox.width - accountBox.width / 2, menuBox.y + 1, {
    steps: 8,
  });
  await expect(accountDetails).toBeVisible();
  await expect(accountDetails.locator('[data-part="account-menu-profile"]')).toBeVisible();
  await expect(accountDetails.getByText('student@example.com')).toBeVisible();
  await expect(accountDetails.getByText('Sam User')).toBeVisible();
  const role = accountDetails.getByText('student', { exact: true });
  await expect(role).toBeVisible();
  await expect(role).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(role).toHaveCSS('color', 'rgb(76, 29, 149)');
  await expect(accountDetails.locator('[data-part="account-menu-role-icon"]')).toBeVisible();
  const [emailBox, roleBox] = await Promise.all([
    accountDetails.getByText('student@example.com').boundingBox(),
    role.boundingBox(),
  ]);
  if (!emailBox || !roleBox) throw new Error('Account-menu role geometry is unavailable.');
  expect(roleBox.x).toBeGreaterThanOrEqual(emailBox.x);
  expect(roleBox.y).toBeGreaterThanOrEqual(emailBox.y + emailBox.height);
  const logout = accountDetails.getByRole('button', { name: 'Log out' });
  await expect(logout.locator('svg')).toBeVisible();
  await expect(logout).toHaveCSS('border-top-style', 'none');
  await expect(logout).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await logout.hover();
  await expect(logout).toHaveCSS('background-color', 'rgb(254, 242, 242)');
  await logout.click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token'))).toBeNull();
});

test('keeps a clicked account menu open until Escape or an outside click', async ({ page }) => {
  await mockAuthenticatedSession(page, 'student');
  await mockStudentWorkspaceData(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/learning');

  const account = page.getByRole('button', { name: 'Account menu for Sam User' });
  const accountDetails = page.getByRole('group', { name: 'Account details for Sam User' });
  await account.hover();
  await expect(accountDetails).toBeVisible();
  await expect(account).toHaveCSS('box-shadow', 'rgb(109, 40, 217) 0px 0px 0px 1px');
  await page.mouse.move(8, 300);
  await expect(accountDetails).toBeHidden();
  await expect(account).toHaveCSS('box-shadow', 'none');

  await account.click();
  await expect(accountDetails).toBeVisible();
  await expect(account).toHaveCSS('box-shadow', 'rgb(109, 40, 217) 0px 0px 0px 1px');
  await page.mouse.move(8, 300);
  await expect(accountDetails).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(accountDetails).toBeHidden();
  await expect(account).toBeFocused();
  await expect(account).toHaveCSS('box-shadow', 'none');

  await account.click();
  await expect(accountDetails).toBeVisible();
  await page.locator('main').click({ position: { x: 1, y: 1 } });
  await expect(accountDetails).toBeHidden();
});

test('keeps anonymous Cart-to-Login actions in their stable desktop end group', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/login?returnTo=%2Fcart');
  await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();

  const geometry = await page.getByRole('banner').evaluate((header) => {
    const byName = (name: string) =>
      Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).find(
        (link) => (link.getAttribute('aria-label') ?? link.textContent?.trim()) === name,
      );
    const cart = byName('Cart');
    const logIn = byName('Log in');
    const signUp = byName('Sign up');
    if (!cart || !logIn || !signUp)
      throw new Error('Anonymous Cart/auth header controls are missing.');
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, width: box.width, height: box.height };
    };
    return {
      sequence: Array.from(header.querySelectorAll('a, input')).map((element) =>
        element instanceof HTMLInputElement
          ? element.name
          : (element.getAttribute('aria-label') ?? element.textContent?.trim()),
      ),
      cart: rect(cart),
      logIn: rect(logIn),
      signUp: rect(signUp),
      loginWhiteSpace: getComputedStyle(logIn).whiteSpace,
      signUpWhiteSpace: getComputedStyle(signUp).whiteSpace,
    };
  });
  expect(geometry.sequence).toEqual(['LearnHub home', 'Catalog', 'Cart', 'Log in', 'Sign up']);
  expect(geometry.cart.height).toBeGreaterThanOrEqual(44);
  expect(geometry.logIn.height).toBeGreaterThanOrEqual(44);
  expect(geometry.signUp.height).toBeGreaterThanOrEqual(44);
  expect(geometry.loginWhiteSpace).toBe('nowrap');
  expect(geometry.signUpWhiteSpace).toBe('nowrap');
  assertRuntimeClean();
});

test('shows a bootstrap state then student-only workspace navigation', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(
    page,
    [],
    [ENROLLMENTS_STRICT_MODE_ABORT, CART_STRICT_MODE_ABORT],
  );
  await mockAuthenticatedSession(page, 'student');
  await mockStudentWorkspaceData(page);
  await page.route('**/me', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fallback();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learning');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Preparing your workspace' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'My learning' })).toBeVisible();
  await expect(page).toHaveTitle('My learning | LearnHub');
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(page.getByRole('link', { name: /^Cart/ })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'My learning' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(navigation.getByRole('link', { name: 'My courses' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Account menu for Sam User' })).toBeVisible();
  assertRuntimeClean();
});

test('keeps the student Catalog, Search, Cart, and account slots stable across Catalog, My learning, and Cart', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(
    page,
    [],
    [CART_STRICT_MODE_ABORT, ENROLLMENTS_STRICT_MODE_ABORT],
  );
  await mockAuthenticatedSession(page, 'student');
  await mockStudentWorkspaceData(page);
  await page.route('**/courses**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      }),
    }),
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Catalog', exact: true })).toBeVisible();

  const readSlots = () =>
    page.getByRole('banner').evaluate((header) => {
      const read = (selector: string) => {
        const element = header.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing header slot target: ${selector}`);
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      };
      return {
        catalog: read('nav[aria-label="Primary navigation"] a[href="/"]'),
        search: read('input[name="search_query"]'),
        cart: read('a[aria-label^="Cart"]'),
        account: read('[data-account-initials]'),
        learningWhiteSpace: getComputedStyle(
          header.querySelector<HTMLElement>('a[href="/learning"]')!,
        ).whiteSpace,
        overflowFree: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    });

  const catalogSlots = await readSlots();
  await page.getByRole('link', { name: 'My learning', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'My learning' })).toBeVisible();
  const learningSlots = await readSlots();

  await page.getByRole('link', { name: /^Cart/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Cart' })).toBeVisible();
  const cartSlots = await readSlots();

  expect(learningSlots).toEqual(catalogSlots);
  expect(cartSlots).toEqual(catalogSlots);
  expect(learningSlots.learningWhiteSpace).toBe('nowrap');
  expect(learningSlots.search.width).toBeCloseTo(544, 1);
  expect(learningSlots.cart.height).toBeGreaterThanOrEqual(44);
  expect(learningSlots.account.height).toBeGreaterThanOrEqual(44);
  expect(learningSlots.overflowFree).toBe(true);
  assertRuntimeClean();
});

test('keeps Search contained before the Profile-to-Cart desktop group', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(
    page,
    [],
    [
      { ...ENROLLMENTS_STRICT_MODE_ABORT, occurrences: 6 },
      { ...CART_STRICT_MODE_ABORT, occurrences: 6 },
    ],
  );
  await mockAuthenticatedSession(page, 'student');
  await mockStudentWorkspaceData(page);

  for (const width of [1024, 1090, 1100, 1110, 1280, 1440] as const) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/learning');
    await expect(page.getByRole('heading', { level: 1, name: 'My learning' })).toBeVisible();

    const geometry = await readStudentHeaderGeometry(page);
    const learningRight = geometry.learning.x + geometry.learning.width;
    const searchRight = geometry.search.x + geometry.search.width;
    expect(geometry.standardGap).toBeGreaterThan(0);
    expect(geometry.search.x).toBeGreaterThanOrEqual(learningRight + geometry.standardGap - 0.5);
    expect(geometry.account.x).toBeGreaterThanOrEqual(searchRight + geometry.standardGap - 0.5);
    expect(geometry.cart.x).toBeGreaterThanOrEqual(
      geometry.account.x + geometry.account.width + geometry.standardGap - 1,
    );
    expect(geometry.search.width).toBeLessThanOrEqual(544);
    expect(geometry.cart.height).toBeGreaterThanOrEqual(44);
    expect(geometry.account.height).toBeGreaterThanOrEqual(44);
    expect(geometry.accountCartGap).toBeCloseTo(15, 1);
    expect(geometry.learningWhiteSpace).toBe('nowrap');
    expect(geometry.overflowFree).toBe(true);
  }

  assertRuntimeClean();
});

test('preserves student header geometry when Catalog alone requires a document scrollbar', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(
    page,
    [],
    [
      { ...CART_STRICT_MODE_ABORT, occurrences: 13 },
      { ...ENROLLMENTS_STRICT_MODE_ABORT, occurrences: 4 },
    ],
  );
  await mockAuthenticatedSession(page, 'student');
  await mockStudentWorkspaceData(page);
  await page.route('**/courses**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      }),
    }),
  );

  for (const width of [1090, 1100, 1110, 1280] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.id = 'scrollbar-geometry-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      spacer.style.blockSize = '200vh';
      document.body.append(spacer);
    });
    const tallCatalog = await readStudentHeaderGeometry(page);
    expect(tallCatalog.hasVerticalScrollbar).toBe(true);

    await page.evaluate(() => document.querySelector('#scrollbar-geometry-spacer')?.remove());
    await page.goto('/learning');
    await expect(page.getByRole('heading', { level: 1, name: 'My learning' })).toBeVisible();
    const shortLearning = await readStudentHeaderGeometry(page);
    expect(shortLearning.hasVerticalScrollbar).toBe(false);

    expect(shortLearning.catalog).toEqual(tallCatalog.catalog);
    expect(shortLearning.search).toEqual(tallCatalog.search);
    expect(shortLearning.cart).toEqual(tallCatalog.cart);
    expect(shortLearning.account).toEqual(tallCatalog.account);
    expect(shortLearning.clientWidth).toBe(tallCatalog.clientWidth);
    expect(shortLearning.learningWhiteSpace).toBe('nowrap');
    expect(shortLearning.overflowFree).toBe(true);

    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Catalog', exact: true })).toBeVisible();
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.id = 'scrollbar-geometry-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      spacer.style.blockSize = '200vh';
      document.body.append(spacer);
    });
    const returnedTallCatalog = await readStudentHeaderGeometry(page);
    expect(returnedTallCatalog).toEqual(tallCatalog);
  }

  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto('/');
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('keeps authenticated mobile header controls visible, Cart outermost, and Search flush with Catalog hero', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(
    page,
    [],
    [{ ...CART_STRICT_MODE_ABORT, occurrences: 3 }],
  );
  await mockAuthenticatedSession(page, 'student');
  await mockStudentWorkspaceData(page);
  await page.route('**/courses**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      }),
    }),
  );

  for (const width of [320, 390, 767] as const) {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');

    const aiAssistant = page.getByRole('link', { name: 'Open AI assistant' });
    const profile = page.getByRole('button', { name: 'Account menu for Sam User' });
    const cart = page.getByRole('link', { name: /^Cart/ });
    await expect(aiAssistant).toBeVisible();
    await expect(profile).toBeVisible();
    await expect(cart).toBeVisible();

    const geometry = await page.evaluate(() => {
      const read = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing mobile header target: ${selector}`);
        return element.getBoundingClientRect().toJSON();
      };
      return {
        aiAssistant: read('a[aria-label="Open AI assistant"]'),
        profile: read('[data-account-initials]'),
        cart: read('a[aria-label^="Cart"]'),
        search: read('form[role="search"]'),
        hero: read('[data-part="catalog-hero"]'),
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(geometry.aiAssistant.right).toBeLessThanOrEqual(geometry.profile.x + 0.5);
    expect(geometry.profile.right).toBeLessThanOrEqual(geometry.cart.x + 0.5);
    expect(geometry.cart.right).toBeCloseTo(geometry.viewportWidth - 16, 1);
    expect(Math.abs(geometry.search.bottom - geometry.hero.y)).toBeLessThanOrEqual(1);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);

    await profile.click();
    const accountDetails = page.getByRole('group', { name: 'Account details for Sam User' });
    await expect(accountDetails).toBeVisible();
    const menuRect = await accountDetails.evaluate((element) =>
      element.getBoundingClientRect().toJSON(),
    );
    expect(menuRect.x).toBeGreaterThanOrEqual(0);
    expect(menuRect.right).toBeLessThanOrEqual(geometry.viewportWidth);
  }

  assertRuntimeClean();
});

test('rejects malformed successful session data without authenticating or clearing it as a 401', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.addInitScript(() =>
    localStorage.setItem('learnhub.access-token', 'potentially-valid-token'),
  );
  await page.route('**/me', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ role: 'student' }),
    }),
  );
  await page.goto('/learning');
  await expect(page.getByRole('heading', { level: 1, name: 'Session check failed' })).toBeVisible();
  await expect(page.getByText(/student/)).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token'))).toBe(
    'potentially-valid-token',
  );
  await expect(page).toHaveTitle('Session check failed | LearnHub');
  assertRuntimeClean();
});

test('keeps Router metadata, layout, density, and titles aligned for a case/trailing parameter route', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/instructor/COURSES/ABC/edit/');
  await expect(page.getByRole('heading', { level: 1, name: 'Edit course' })).toBeVisible();
  await expect(page.locator('[data-layout]')).toHaveAttribute('data-layout', 'workspace');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'workspace');
  await expect(page).toHaveTitle('Edit course | LearnHub');
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.getByRole('heading', { level: 1, name: 'Edit course' })).toBeVisible();
  await page.getByRole('button', { name: 'Open navigation' }).focus();
  await expectMobileMenuGeometry(page);
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('keeps wrong-role content hidden behind an accessible forbidden state', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/cart');
  await expect(
    page.getByRole('heading', { level: 1, name: 'You do not have access to this page' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Cart' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to catalog' })).toBeVisible();
  assertRuntimeClean();
});

test('clears an invalid stored bearer when /me rejects it', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page, [{ method: 'GET', path: '/me', status: 401 }]);
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'expired-token'));
  await page.route('**/me', async (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Expired token' }),
    }),
  );
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Master the Skills Shaping the Future' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Found 1 course' })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Account navigation' })
      .getByRole('link', { name: 'Log in', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token'))).toBe(null);
  assertRuntimeClean();
});

test('announces a recoverable session error and retries /me', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(
    page,
    [{ method: 'GET', path: '/me', status: 503 }],
    [CART_STRICT_MODE_ABORT],
  );
  await mockStudentWorkspaceData(page);
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'retry-token'));
  let attempts = 0;
  await page.route('**/me', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Service unavailable' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'student@example.com',
        name: 'Sam',
        surname: 'User',
        role: 'student',
        birthday: null,
        phone_number: null,
        created_at: '2026-07-20T00:00:00Z',
      }),
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Session check failed' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(
    'We could not verify your session. Check your connection and try again.',
  );
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Master the Skills Shaping the Future' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Found 1 course' })).toBeVisible();
  expect(attempts).toBe(2);
  assertRuntimeClean();
});

test('supports keyboard-operated mobile navigation and focus restoration', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/instructor/courses#mobile-menu-focus');
  await expect(page.getByRole('heading', { level: 1, name: 'Instructor courses' })).toBeVisible();
  const brand = page.getByRole('link', { name: 'LearnHub home' });
  const profile = page.getByRole('button', { name: 'Account menu for Indira User' });
  await expectBrandComposition(brand);
  await expectBrandContainedInHeader(brand);
  await expect(profile).toBeVisible();
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeHidden();
  await expectMenuAtHeaderContentEdge(page);
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await expectMobileMenuGeometry(page);

  await page.keyboard.press('Enter');
  await page.getByRole('link', { name: 'My courses' }).last().focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();

  await page.keyboard.press('Enter');
  const currentRouteLink = page
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'My courses' });
  await expect(currentRouteLink).toHaveAttribute('aria-current', 'page');
  await currentRouteLink.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await expect(page).toHaveURL(/\/instructor\/courses$/);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 320, height: 740 });
  await expectBrandComposition(brand);
  await expectBrandContainedInHeader(brand);
  await expect(profile).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeHidden();
  await expectMenuAtHeaderContentEdge(page);
  await expectMobileMenuGeometry(page);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  assertRuntimeClean();
});

test('preserves the source mobile menu and focus for modified and new-tab activation', async ({
  page,
  context,
}) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/instructor/courses/42/edit');
  await expect(page.getByRole('heading', { level: 1, name: 'Edit course' })).toBeVisible();
  const originalUrl = page.url();
  const menu = page.getByRole('button', { name: 'Open navigation' });

  async function openAndFocusInstructorCourses() {
    if ((await page.getByRole('navigation', { name: 'Mobile navigation' }).count()) === 0) {
      await menu.click();
    }
    const navigation = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(navigation).toBeVisible();
    const link = navigation.getByRole('link', { name: 'My courses' });
    await link.focus();
    await expect(link).toBeFocused();
    return { navigation, link };
  }

  const control = await openAndFocusInstructorCourses();
  const controlPopupPromise = context.waitForEvent('page');
  await control.link.click({ modifiers: ['Control'] });
  const controlPopup = await controlPopupPromise;
  await controlPopup.waitForURL(/\/instructor\/courses(?:[?#]|$)/);
  expect(new URL(controlPopup.url()).pathname).toBe('/instructor/courses');
  expect(page.url()).toBe(originalUrl);
  await expect(control.navigation).toBeVisible();
  await expect(control.link).toBeFocused();
  await controlPopup.close();

  const meta = await openAndFocusInstructorCourses();
  const metaDefaultAllowed = await meta.link.evaluate((element) => {
    let defaultPreventedByApplication = true;
    const observeThenCancelNavigation = (event: MouseEvent) => {
      defaultPreventedByApplication = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener('click', observeThenCancelNavigation, { once: true });
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      metaKey: true,
    });
    element.dispatchEvent(event);
    return !defaultPreventedByApplication;
  });
  expect(metaDefaultAllowed).toBe(true);
  expect(page.url()).toBe(originalUrl);
  await expect(meta.navigation).toBeVisible();
  await expect(meta.link).toBeFocused();

  const middle = await openAndFocusInstructorCourses();
  const middlePopupPromise = context.waitForEvent('page');
  await middle.link.click({ button: 'middle' });
  const middlePopup = await middlePopupPromise;
  await middlePopup.waitForURL(/\/instructor\/courses(?:[?#]|$)/);
  expect(new URL(middlePopup.url()).pathname).toBe('/instructor/courses');
  expect(page.url()).toBe(originalUrl);
  await expect(middle.navigation).toBeVisible();
  await expect(middle.link).toBeFocused();
  await middlePopup.close();

  const ordinary = await openAndFocusInstructorCourses();
  await ordinary.link.click();
  await expect(page).toHaveURL(/\/instructor\/courses$/);
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page).toHaveTitle('Instructor courses | LearnHub');
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('renders the not-found route at mobile width without overflow', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page).toHaveTitle('Page not found | LearnHub');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
    'href',
    '#main-content',
  );
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('keeps focused skip navigation above sticky search chrome and below the dialog modal tier', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.addInitScript(() => {
    localStorage.setItem('learnhub.catalog-search-history', JSON.stringify(['React testing']));
  });
  await installCatalogFixture(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const search = page.getByRole('combobox', { name: 'Search courses' });
  const searchListbox = page.getByRole('listbox', { name: 'Recent searches' });
  await search.focus();
  await expect(searchListbox).toBeVisible();
  const dropdownLayers = await page.evaluate(() => {
    const header = document.querySelector('[data-app-shell-header]');
    const listbox = document.querySelector('[role="listbox"]');
    if (!(header instanceof HTMLElement) || !(listbox instanceof HTMLElement)) {
      throw new Error('Open search layering targets are unavailable');
    }
    return {
      header: getComputedStyle(header).zIndex,
      searchListbox: getComputedStyle(listbox).zIndex,
    };
  });
  const skipLink = page.getByRole('link', { name: 'Skip to main content' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await expect(searchListbox).toHaveCount(0);
  await expect
    .poll(async () => {
      const box = await skipLink.boundingBox();
      return box !== null && box.y + box.height > 0;
    })
    .toBe(true);

  const focusedSkipLayers = await page.evaluate(() => {
    const skip = document.querySelector('a[href="#main-content"]');
    if (!(skip instanceof HTMLElement)) {
      throw new Error('Focused skip-link layering target is unavailable');
    }
    const rootStyle = getComputedStyle(document.documentElement);
    const skipRect = skip.getBoundingClientRect();
    return {
      skip: getComputedStyle(skip).zIndex,
      modal: rootStyle.getPropertyValue('--z-modal').trim(),
      skipVisible: skipRect.bottom > 0 && skipRect.top < window.innerHeight,
    };
  });

  expect(dropdownLayers).toEqual({
    header: zIndexTokens['--z-sticky'],
    searchListbox: zIndexTokens['--z-dropdown'],
  });
  expect(focusedSkipLayers).toEqual({
    skip: zIndexTokens['--z-accessibility'],
    // Dialog's portalled backdrop consumes this modal tier.
    modal: zIndexTokens['--z-modal'],
    skipVisible: true,
  });
  expect(Number(dropdownLayers.searchListbox)).toBeLessThan(Number(dropdownLayers.header));
  expect(Number(dropdownLayers.header)).toBeLessThan(Number(focusedSkipLayers.skip));
  expect(Number(focusedSkipLayers.skip)).toBeLessThan(Number(focusedSkipLayers.modal));
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('removes non-essential shell transitions when reduced motion is requested', async ({
  page,
}) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto('/');

  const transitions = await page.evaluate(() => {
    const skipLink = document.querySelector('a[href="#main-content"]');
    const navigationLink = document.querySelector('nav[aria-label="Primary navigation"] a');
    if (!(skipLink instanceof HTMLElement) || !(navigationLink instanceof HTMLElement)) {
      throw new Error('Reduced-motion shell targets are unavailable');
    }
    return {
      skipLink: getComputedStyle(skipLink).transitionDuration,
      navigationLink: getComputedStyle(navigationLink).transitionDuration,
    };
  });
  expect(transitions).toEqual({ skipLink: '0s', navigationLink: '0s' });
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});
