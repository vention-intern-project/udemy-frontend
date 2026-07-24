import { expect, test, type Locator, type Page } from '@playwright/test';

type BackendRole = 'student' | 'instructor' | 'admin';

function monitorRuntime(page: Page, expectedHttpResourceErrors: readonly number[] = []) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  return () => {
    const remainingExpectedStatuses = [...expectedHttpResourceErrors];
    const unexpectedConsoleErrors = consoleErrors.filter((message) => {
      const match = /^Failed to load resource: the server responded with a status of (\d{3}) \(.+\)$/.exec(message);
      const status = match ? Number(match[1]) : null;
      const expectedIndex = status === null ? -1 : remainingExpectedStatuses.indexOf(status);
      if (expectedIndex < 0) return true;
      remainingExpectedStatuses.splice(expectedIndex, 1);
      return false;
    });
    expect(pageErrors, 'uncaught browser errors').toEqual([]);
    expect(unexpectedConsoleErrors, 'unexpected browser console errors').toEqual([]);
  };
}

async function mockAuthenticatedSession(page: Page, role: BackendRole) {
  await page.addInitScript(() => {
    localStorage.setItem('learnhub.access-token', 'browser-test-token');
  });
  await page.route('**/me', async (route) => route.fulfill({
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
  }));
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

async function expectShellSurfacesAtViewportEdges(page: Page, width: 320 | 390 | 768 | 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');

  const geometry = await page.evaluate(() => {
    const header = document.querySelector('.app-header');
    const footer = document.querySelector('.app-footer');
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
      root: { left: rootRect.left, right: rootRect.right, width: rootRect.width },
      header: { left: headerRect.left, right: headerRect.right },
      footer: { left: footerRect.left, right: footerRect.right },
      headerY: Math.floor((headerRect.top + headerRect.bottom) / 2),
      footerY: Math.floor((footerRect.top + footerRect.bottom) / 2),
      headerColor: colorPixel(getComputedStyle(header).backgroundColor),
      footerColor: colorPixel(getComputedStyle(footer).backgroundColor),
    };
  });
  expect(geometry.scrollbarGutter).toBe('auto');
  expect(geometry.root.width).toBeGreaterThan(0);
  expect(geometry.root.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.root.right).toBeLessThanOrEqual(geometry.viewport + 1);
  const physicalLeftGap = Math.max(0, geometry.root.left);
  const physicalRightGap = Math.max(0, geometry.viewport - geometry.root.right);
  expect(physicalLeftGap).toBeLessThanOrEqual(1);
  expect(physicalRightGap).toBeLessThanOrEqual(1);
  for (const surface of [geometry.header, geometry.footer]) {
    expect(Math.abs(surface.left - geometry.root.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(surface.right - geometry.root.right)).toBeLessThanOrEqual(1);
  }

  const screenshot = await page.screenshot({ animations: 'disabled' });
  const edgePixels = await page.evaluate(async ({ imageBase64, points }) => {
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
    return points.map(({ x, y }) => Array.from(context.getImageData(
      Math.min(image.naturalWidth - 1, Math.max(0, Math.floor(x * scaleX))),
      Math.min(image.naturalHeight - 1, Math.max(0, Math.floor(y * scaleY))),
      1,
      1,
    ).data));
  }, {
    imageBase64: screenshot.toString('base64'),
    points: [
      { x: 0, y: geometry.headerY },
      { x: geometry.viewport - 1, y: geometry.headerY },
      { x: 0, y: geometry.footerY },
      { x: geometry.viewport - 1, y: geometry.footerY },
    ],
  });
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
    const marks = link.querySelectorAll('svg.app-brand__mark');
    const wordmarks = link.querySelectorAll('.app-brand__wordmark');
    const mark = marks.item(0);
    const wordmark = wordmarks.item(0);
    const outline = mark?.querySelector('.app-brand__mark-outline');
    const book = mark?.querySelector('.app-brand__mark-book');
    if (
      marks.length !== 1
      || wordmarks.length !== 1
      || !(mark instanceof SVGElement)
      || !(wordmark instanceof HTMLElement)
      || !(outline instanceof SVGElement)
      || !(book instanceof SVGElement)
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
    return {
      linkText: link.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      markText: mark.textContent?.trim() ?? '',
      markAriaHidden: mark.getAttribute('aria-hidden'),
      markFocusable: mark.getAttribute('focusable'),
      textElementCount: mark.querySelectorAll('text').length,
      wordmarkText: wordmark.textContent,
      markWidth: markRect.width,
      markHeight: markRect.height,
      centerDelta: Math.abs(
        (markRect.top + markRect.bottom) / 2 - (wordmarkRect.top + wordmarkRect.bottom) / 2,
      ),
      markInsideLink: markRect.left >= linkRect.left - 0.5
        && markRect.right <= linkRect.right + 0.5
        && markRect.top >= linkRect.top - 0.5
        && markRect.bottom <= linkRect.bottom + 0.5,
      wordmarkInsideLink: wordmarkRect.left >= linkRect.left - 0.5
        && wordmarkRect.right <= linkRect.right + 0.5
        && wordmarkRect.top >= linkRect.top - 0.5
        && wordmarkRect.bottom <= linkRect.bottom + 0.5,
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
  expect(metrics.centerDelta).toBeLessThanOrEqual(1);
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
    const inner = link.closest('.app-header__inner');
    if (!(inner instanceof HTMLElement)) throw new Error('Header containment target is unavailable');
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

async function expectAnonymousDesktopHeaderGeometry(page: Page, width: 768 | 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');

  const brand = page.getByRole('link', { name: 'LearnHub home' });
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  const browse = navigation.getByRole('link', { name: 'Browse courses' });
  const signup = navigation.getByRole('link', { name: 'Sign up' });
  const login = navigation.getByRole('link', { name: 'Log in' });
  await expectBrandComposition(brand);
  await expectBrandFocusTreatment(page, brand);
  await expect(browse).toBeVisible();
  await expect(signup).toBeVisible();
  await expect(login).toBeVisible();

  const [brandBox, browseBox, signupBox, loginBox] = await Promise.all([
    requiredBoundingBox(brand),
    requiredBoundingBox(browse),
    requiredBoundingBox(signup),
    requiredBoundingBox(login),
  ]);
  const headerContentRight = await brand.evaluate((link) => {
    const inner = link.closest('.app-header__inner');
    if (!(inner instanceof HTMLElement)) throw new Error('Header geometry target is unavailable');
    const rect = inner.getBoundingClientRect();
    return rect.right - Number.parseFloat(getComputedStyle(inner).paddingRight);
  });
  const brandToBrowseGap = browseBox.x - (brandBox.x + brandBox.width);
  const browseToSignupGap = signupBox.x - (browseBox.x + browseBox.width);
  const signupToLoginGap = loginBox.x - (signupBox.x + signupBox.width);
  expect(brandToBrowseGap).toBeGreaterThanOrEqual(0);
  expect(brandToBrowseGap).toBeLessThanOrEqual(32);
  expect(signupToLoginGap).toBeGreaterThanOrEqual(0);
  expect(signupToLoginGap).toBeLessThanOrEqual(16);
  expect(browseToSignupGap).toBeGreaterThan(signupToLoginGap);
  expect(Math.abs(loginBox.x + loginBox.width - headerContentRight)).toBeLessThanOrEqual(1);
  await expectNoHorizontalOverflow(page);
}

async function expectInstructorDesktopHeaderGeometry(page: Page, width: 768 | 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/instructor/courses');
  await expect(page.getByRole('heading', { level: 1, name: 'Instructor courses' })).toBeVisible();

  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  const instructorCourses = navigation.getByRole('link', { name: 'Instructor courses' });
  const profile = page.getByText('Indira - instructor', { exact: true });
  await expect(navigation).toBeVisible();
  await expect(instructorCourses).toBeVisible();
  await expect(instructorCourses).toHaveAttribute('aria-current', 'page');
  await expect(profile).toBeVisible();

  const [linkBox, profileBox] = await Promise.all([
    requiredBoundingBox(instructorCourses),
    requiredBoundingBox(profile),
  ]);
  const gap = profileBox.x - (linkBox.x + linkBox.width);
  expect(linkBox.x + linkBox.width).toBeLessThan(profileBox.x);
  expect(gap).toBeGreaterThan(0);
  expect(gap).toBeLessThanOrEqual(24);
  await expectNoHorizontalOverflow(page);
  return gap;
}

async function expectMenuAtHeaderContentEdge(page: Page) {
  const offset = await page.getByRole('button', { name: 'Open navigation' }).evaluate((button) => {
    const inner = button.closest('.app-header__inner');
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
    const header = button.closest('.app-header');
    if (
      labels.length !== 1
      || !(label instanceof HTMLElement)
      || !(header instanceof HTMLElement)
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

test('keeps header and footer surfaces at the physical viewport edges without symmetric gutters', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  for (const width of [320, 390, 768, 1280] as const) {
    await expectShellSurfacesAtViewportEdges(page, width);
  }
  assertRuntimeClean();
});

test('keeps the complete LearnHub brand accessible when authenticated', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'student');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/learning');
  const brand = page.getByRole('link', { name: 'LearnHub home' });
  await expectBrandComposition(brand);
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});

test('keeps instructor courses immediately adjacent to the desktop profile', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  const gapAt768 = await expectInstructorDesktopHeaderGeometry(page, 768);
  const gapAt1280 = await expectInstructorDesktopHeaderGeometry(page, 1280);
  expect(Math.abs(gapAt768 - gapAt1280)).toBeLessThanOrEqual(1);
  assertRuntimeClean();
});

test('shows a bootstrap state then student-only workspace navigation', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'student');
  await page.route('**/me', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fallback();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learning');
  await expect(page.getByRole('heading', { level: 1, name: 'Preparing your workspace' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'My learning' })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link', { name: 'Cart' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'My learning' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('link', { name: 'Instructor courses' })).toHaveCount(0);
  await expect(page.getByText('Sam - student', { exact: true })).toBeVisible();
  assertRuntimeClean();
});

test('keeps wrong-role content hidden behind an accessible forbidden state', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await mockAuthenticatedSession(page, 'instructor');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/cart');
  await expect(page.getByRole('heading', { level: 1, name: 'You do not have access to this page' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Cart' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to catalog' })).toBeVisible();
  assertRuntimeClean();
});

test('clears an invalid stored bearer when /me rejects it', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page, [401]);
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'expired-token'));
  await page.route('**/me', async (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ detail: 'Expired token' }),
  }));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Course catalog' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('learnhub.access-token'))).toBe(null);
  assertRuntimeClean();
});

test('announces a recoverable session error and retries /me', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page, [503]);
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
  await expect(page.getByRole('heading', { level: 1, name: 'Course catalog' })).toBeVisible();
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
  const profile = page.getByText('Indira - instructor', { exact: true });
  await expectBrandComposition(brand);
  await expectBrandContainedInHeader(brand);
  await expect(profile).toBeHidden();
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
  await page.getByRole('link', { name: 'Instructor courses' }).last().focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();

  await page.keyboard.press('Enter');
  const currentRouteLink = page.getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Instructor courses' });
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
  await expect(profile).toBeHidden();
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

test('renders the not-found route at mobile width without overflow', async ({ page }) => {
  const assertRuntimeClean = monitorRuntime(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content');
  await expectNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await expectNoHorizontalOverflow(page);
  assertRuntimeClean();
});
