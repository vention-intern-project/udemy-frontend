import { expect, test, type Page, type Route } from '@playwright/test';

const student = {
  email: 'learner@example.test',
  name: 'Learner',
  surname: 'One',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const enrollment = {
  id: 4,
  user_id: 1,
  course_id: 7,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  course: { id: 7, title: 'Active course', description: null, price: '0.00', currency: 'USD' },
};
const emptyCart = { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 };

interface ChatRequestEvidence {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

interface CourseChatFixtureOptions {
  readonly cart?: unknown;
  readonly enrollments?: readonly unknown[];
}

interface RuntimeDiagnostics {
  readonly unexpectedRuntimeFailures: string[];
  readonly httpFailures: string[];
}

interface LauncherLifecycleDiagnostic {
  frameCallbacks: number;
  framesScheduled: number;
  resizeListeners: number;
}

interface LauncherFooterGeometry {
  readonly footerTop: number;
  readonly footerBottom: number;
  readonly launcherTop: number;
  readonly launcherBottom: number;
  readonly insetBlockEnd: string;
  readonly inlineStyle: string | null;
}

interface DiagnosticWindow extends Window {
  __launcherLifecycleDiagnostic?: LauncherLifecycleDiagnostic;
}

interface RgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

interface AiHeroGeometry {
  readonly heroWidth: number;
  readonly heroLeft: number;
  readonly heroRight: number;
  readonly corridorWidth: number;
  readonly zoneWidth: number;
  readonly heroCenter: number;
  readonly heroContentRight: number;
  readonly copyCenter: number;
  readonly headingLeft: number;
  readonly headingRight: number;
  readonly headingWidth: number;
  readonly imageWidth: number;
  readonly imageRight: number;
  readonly imageFit: string;
  readonly sourceVisibility: number;
  readonly overlay: string;
  readonly headingWhiteSpace: string;
  readonly rootClientWidth: number;
  readonly rootClientHeight: number;
  readonly rootScrollHeight: number;
}

function expectedAiHeroImageWidth(viewportWidth: number, rootClientWidth = viewportWidth): number {
  // Mirrors the responsive CSS clamp coefficients in AiChatPage.module.css.
  if (viewportWidth <= 895) {
    return Math.min(959.88, Math.max(820.95, rootClientWidth * 1.085391 - 12.6303));
  }
  if (viewportWidth <= 1199) {
    return Math.min(1263, Math.max(959.88, rootClientWidth * 0.997105 + 66.4737));
  }
  return 1263;
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function captureRuntimeDiagnostics(page: Page): RuntimeDiagnostics {
  const diagnostics: RuntimeDiagnostics = { unexpectedRuntimeFailures: [], httpFailures: [] };
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.unexpectedRuntimeFailures.push(message.text());
  });
  page.on('pageerror', (error) => diagnostics.unexpectedRuntimeFailures.push(error.message));
  page.on('requestfailed', (request) => {
    const path = new URL(request.url()).pathname;
    const failure = request.failure()?.errorText ?? '';
    if (
      request.method() === 'GET' &&
      failure === 'net::ERR_ABORTED' &&
      [
        '/cart',
        '/courses',
        '/enrollments/my',
        '/enrollments/4',
        '/courses/7/progress',
        '/courses/7/lessons',
      ].includes(path)
    )
      return;
    diagnostics.unexpectedRuntimeFailures.push(`${request.method()} ${path} ${failure}`);
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4180' && response.status() >= 400)
      diagnostics.httpFailures.push(
        `${response.request().method()} ${url.pathname} ${response.status()}`,
      );
  });
  return diagnostics;
}

async function waitForRenderedAiChatAssets(page: Page) {
  await page.locator('section[aria-labelledby="ai-chat-hero-title"]').evaluate(async (hero) => {
    if (!(hero instanceof HTMLElement)) throw new Error('AI hero is unavailable.');
    const heroImage = hero.querySelector<HTMLImageElement>('[data-part="ai-chat-hero-image"]');
    const cssAssetSources = ['', '::before', '::after'].flatMap((pseudoElement) =>
      Array.from(
        getComputedStyle(hero, pseudoElement).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g),
        ([, url]) => url,
      ),
    );
    const renderedImageSource =
      heroImage && getComputedStyle(heroImage).display !== 'none'
        ? heroImage.currentSrc
        : undefined;
    const assetUrls = Array.from(
      new Set(
        [...cssAssetSources, renderedImageSource]
          .filter((source): source is string => Boolean(source))
          .map((source) => new URL(source, window.location.href).href),
      ),
    );
    if (assetUrls.length === 0) throw new Error('AI hero rendered assets are unavailable.');

    await Promise.all(
      assetUrls.map(async (assetUrl) => {
        const url = new URL(assetUrl);
        if (
          url.origin !== window.location.origin ||
          !url.pathname.startsWith('/src/pages/ai-chat-page/assets/')
        )
          throw new Error(`Unexpected AI hero asset: ${url.href}`);

        const renderedImage =
          renderedImageSource === url.href && heroImage instanceof HTMLImageElement
            ? heroImage
            : undefined;
        const image = renderedImage ?? new Image();
        if (!renderedImage) image.src = url.href;
        if (!image.complete) {
          await new Promise<void>((resolve, reject) => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener(
              'error',
              () => reject(new Error(`AI hero asset failed to load: ${url.pathname}`)),
              { once: true },
            );
          });
        }
        if (image.naturalWidth === 0)
          throw new Error(`AI hero asset failed to load: ${url.pathname}`);
        await image.decode();
      }),
    );
  });
}

async function installCourseChatFixture(
  page: Page,
  chatRequests: ChatRequestEvidence[],
  options: CourseChatFixtureOptions = {},
) {
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
  await page.route('**/*', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/me') return json(route, student);
    if (path === '/cart') return json(route, options.cart ?? emptyCart);
    if (path === '/courses') {
      return json(route, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    }
    if (path === '/enrollments/4') return json(route, enrollment);
    if (path === '/enrollments/my') {
      const enrollments = options.enrollments ?? [];
      return json(route, {
        items: enrollments,
        page: 1,
        page_size: enrollments.length || 20,
        total: enrollments.length,
        pages: enrollments.length === 0 ? 0 : 1,
        has_next: false,
        has_previous: false,
      });
    }
    if (path === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 0,
        progress_percentage: 0,
      });
    if (path === '/courses/7/lessons')
      return json(route, {
        items: [],
        page: 1,
        page_size: 100,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    if (path === '/chat/') {
      chatRequests.push({ method: request.method(), path, body: request.postDataJSON() });
      return json(route, { thread_id: 'thread-1', response: `One answer ${chatRequests.length}.` });
    }
    return route.fallback();
  });
}

async function expectNoOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    layoutWidth: document.documentElement.clientWidth,
  }));
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.layoutWidth);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.layoutWidth);
}

function relativeLuminance({ red, green, blue }: RgbColor) {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

function contrastRatio(first: RgbColor, second: RgbColor) {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test('completes the mobile chat flow, restores focus, and preserves history after collapse', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/learning/enrollments/4');
  const launcher = page.getByRole('button', { name: 'Open AI assistant' });
  await expect(launcher).toHaveCSS('width', '60px');
  await expect(launcher).toHaveAttribute('aria-expanded', 'false');
  await expect(launcher).not.toHaveAttribute('aria-controls');
  await launcher.focus();
  await expect(page.getByRole('tooltip', { name: 'Open AI assistant' })).toBeVisible();
  await launcher.blur();
  await launcher.hover();
  const launcherTooltip = page.getByRole('tooltip', { name: 'Open AI assistant' });
  await expect(launcherTooltip).toBeHidden();
  await page.waitForTimeout(400);
  expect(await launcherTooltip.isVisible()).toBe(false);
  await page.waitForTimeout(150);
  await expect(launcherTooltip).toBeVisible();
  await launcher.click();
  const widget = page.getByRole('region', { name: 'Course assistant chat' });
  const widgetId = await widget.getAttribute('id');
  if (widgetId === null) throw new Error('Expected the mini-chat widget ID.');
  await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  await expect(launcher).toHaveAttribute('aria-controls', widgetId);
  await expect(page.getByRole('tooltip', { name: 'Open AI assistant' })).toBeHidden();
  const invertedHeaderControl = page.getByRole('button', { name: 'Close course assistant' });
  const input = page.getByLabel('Message the course assistant');
  await invertedHeaderControl.focus();
  await expect(invertedHeaderControl).toBeFocused();
  const programmaticFocus = await invertedHeaderControl.evaluate((control) => {
    const header = control.closest('header');
    if (!(header instanceof HTMLElement)) throw new Error('Mini-chat header is missing.');
    const computed = getComputedStyle(control);
    const outlineColor = computed.outlineColor.match(/\d+/g)?.map(Number);
    const headerColor = getComputedStyle(header).backgroundColor.match(/\d+/g)?.map(Number);
    if (!outlineColor || !headerColor) throw new Error('Mini-chat focus colors are unavailable.');
    return {
      focusVisible: control.matches(':focus-visible'),
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      outline: { red: outlineColor[0], green: outlineColor[1], blue: outlineColor[2] },
      header: { red: headerColor[0], green: headerColor[1], blue: headerColor[2] },
      focusRing: computed.getPropertyValue('--focus-ring').trim(),
      invertedFocusRing: computed.getPropertyValue('--focus-ring-inverted').trim(),
    };
  });
  expect(programmaticFocus.focusVisible).toBe(false);
  expect(programmaticFocus.focusRing).toBe('#ddd6fe');
  expect(programmaticFocus.invertedFocusRing).toBe('#ddd6fe');
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(invertedHeaderControl).toBeFocused();
  const keyboardFocus = await invertedHeaderControl.evaluate((control) => {
    const header = control.closest('header');
    if (!(header instanceof HTMLElement)) throw new Error('Mini-chat header is missing.');
    const computed = getComputedStyle(control);
    const outlineColor = computed.outlineColor.match(/\d+/g)?.map(Number);
    const headerColor = getComputedStyle(header).backgroundColor.match(/\d+/g)?.map(Number);
    if (!outlineColor || !headerColor) throw new Error('Mini-chat focus colors are unavailable.');
    return {
      focusVisible: control.matches(':focus-visible'),
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      outline: { red: outlineColor[0], green: outlineColor[1], blue: outlineColor[2] },
      header: { red: headerColor[0], green: headerColor[1], blue: headerColor[2] },
      focusRing: computed.getPropertyValue('--focus-ring').trim(),
      invertedFocusRing: computed.getPropertyValue('--focus-ring-inverted').trim(),
    };
  });
  expect(keyboardFocus.focusVisible).toBe(true);
  expect(keyboardFocus.outlineStyle).toBe('solid');
  expect(keyboardFocus.outlineWidth).toBe('2px');
  expect(keyboardFocus.outline).toEqual({ red: 221, green: 214, blue: 254 });
  expect(keyboardFocus.focusRing).toBe('#ddd6fe');
  expect(keyboardFocus.invertedFocusRing).toBe('#ddd6fe');
  expect(contrastRatio(keyboardFocus.outline, keyboardFocus.header)).toBeGreaterThanOrEqual(3);
  await input.focus();
  await expect(input).toBeFocused();
  const headerTooltips = [
    ['Expand course assistant', 'Expand chat'],
    ['Conversation actions', 'Conversation actions'],
    ['Close course assistant', 'Close chat'],
  ] as const;
  for (const [buttonName, tooltipName] of headerTooltips) {
    const control = page.getByRole('button', { name: buttonName });
    const tooltip = page.getByRole('tooltip', { name: tooltipName });
    await control.hover();
    await expect(tooltip).toBeHidden();
    await page.waitForTimeout(2_000);
    await expect(tooltip).toBeVisible();
  }
  await expect(input).toHaveAttribute('placeholder', 'Ask about courses, lessons, or learning…');
  await expect(input).toHaveAttribute('wrap', 'off');
  await expect(input).toBeFocused();
  const sendButton = page.getByRole('button', { name: 'Send message' });
  await expect(sendButton).toHaveCount(0);
  await input.fill('Recommend a course based on my learning goals.');
  await expect(sendButton).toBeVisible();
  const sendIconGeometry = await sendButton.evaluate((button) => {
    const icon = button.querySelector('svg');
    if (!icon) throw new Error('Send icon is missing.');
    const buttonRect = button.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    return {
      horizontalOffset:
        iconRect.left + iconRect.width / 2 - (buttonRect.left + buttonRect.width / 2),
      verticalOffset: iconRect.top + iconRect.height / 2 - (buttonRect.top + buttonRect.height / 2),
    };
  });
  expect(Math.abs(sendIconGeometry.horizontalOffset)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(sendIconGeometry.verticalOffset)).toBeLessThanOrEqual(0.5);
  expect(
    await input.evaluate((textarea) => textarea.scrollHeight <= textarea.clientHeight + 1),
  ).toBe(true);
  await input.fill('');
  const miniActions = page.getByRole('button', { name: 'Conversation actions' });
  await expect(miniActions).toHaveAttribute('aria-expanded', 'false');
  await expect(miniActions).not.toHaveAttribute('aria-controls');
  await miniActions.click();
  const miniClear = page.getByRole('button', { name: 'Clear chat' });
  await expect(miniClear).toBeVisible();
  const actionMenuId = await page.locator('[data-part="mini-chat-action-menu"]').getAttribute('id');
  if (actionMenuId === null) throw new Error('Expected the mini-chat action-menu ID.');
  await expect(miniActions).toHaveAttribute('aria-expanded', 'true');
  await expect(miniActions).toHaveAttribute('aria-controls', actionMenuId);
  const miniMenuGeometry = await page
    .locator('[data-part="mini-chat-action-menu"]')
    .evaluate((menu) => {
      const widget = menu.closest('[aria-label="Course assistant chat"]');
      if (!(widget instanceof HTMLElement)) throw new Error('Mini chat widget is missing.');
      const trigger = menu.parentElement?.querySelector<HTMLElement>(
        'button[aria-label="Conversation actions"]',
      );
      if (!trigger) throw new Error('Mini chat action trigger is missing.');
      const menuRect = menu.getBoundingClientRect();
      const widgetRect = widget.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      return {
        left: menuRect.left - widgetRect.left,
        right: widgetRect.right - menuRect.right,
        menuCenter: menuRect.left + menuRect.width / 2,
        triggerCenter: triggerRect.left + triggerRect.width / 2,
        textColor: getComputedStyle(menu.querySelector('button')!).color,
        itemCenter:
          menu.querySelector('button')!.getBoundingClientRect().left +
          menu.querySelector('button')!.getBoundingClientRect().width / 2,
        contentCenter: (() => {
          const button = menu.querySelector('button');
          const text = button?.querySelector('span');
          const icon = button?.querySelector('svg');
          if (!button || !text || !icon) throw new Error('Mini action menu content is missing.');
          const textRect = text.getBoundingClientRect();
          const iconRect = icon.getBoundingClientRect();
          return (textRect.left + iconRect.right) / 2;
        })(),
      };
    });
  expect(miniMenuGeometry.left).toBeGreaterThanOrEqual(0);
  expect(miniMenuGeometry.right).toBeGreaterThanOrEqual(0);
  expect(
    Math.abs(miniMenuGeometry.menuCenter - miniMenuGeometry.triggerCenter),
  ).toBeLessThanOrEqual(0.5);
  expect(miniMenuGeometry.textColor).toBe('rgb(17, 24, 39)');
  expect(
    Math.abs(miniMenuGeometry.contentCenter - miniMenuGeometry.itemCenter),
  ).toBeLessThanOrEqual(0.5);
  await miniClear.hover();
  await expect(miniClear).toHaveCSS('color', 'rgb(185, 28, 28)');
  await expect(miniClear.locator('svg')).toHaveCSS('width', '14px');
  await expect(miniClear.locator('svg')).toHaveCSS('height', '14px');
  await miniClear.focus();
  await miniClear.press('Escape');
  await expect(miniClear).toHaveCount(0);
  await expect(input).toBeFocused();
  await page.waitForTimeout(2_100);
  await expect(page.getByRole('tooltip', { name: 'Conversation actions' })).toBeHidden();
  await miniActions.click();
  await expect(miniClear).toBeVisible();
  await page.getByText('Course assistant', { exact: true }).click();
  await expect(miniClear).toHaveCount(0);
  await miniActions.click();
  await expect(miniClear).toBeVisible();
  await miniActions.click();
  await expect(miniClear).toHaveCount(0);
  await page.waitForTimeout(2_100);
  await expect(page.getByRole('tooltip', { name: 'Conversation actions' })).toBeHidden();
  await miniActions.click();
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.getByRole('heading', { name: 'Clear this conversation?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(miniActions).toBeFocused();
  await page.waitForTimeout(2_100);
  await expect(page.getByRole('tooltip', { name: 'Conversation actions' })).toBeHidden();
  await input.fill('Explain this course');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('One answer 1.')).toBeVisible();
  await expect(page.getByText('Explain this course')).toHaveCSS(
    'border-bottom-right-radius',
    '0px',
  );
  await expect(page.getByText('One answer 1.')).toHaveCSS('border-bottom-left-radius', '0px');
  await expect(page.getByText('One answer 1.')).toHaveCSS('background-color', 'rgb(238, 240, 244)');
  expect(chatRequests).toEqual([
    {
      method: 'POST',
      path: '/chat/',
      body: { thread_id: expect.any(String), message: 'Explain this course', course_id: 7 },
    },
  ]);
  await input.fill('Keep this draft');
  await miniActions.click();
  await expect(page.getByRole('button', { name: 'Clear chat' })).toBeVisible();
  await page.getByRole('button', { name: 'Close course assistant' }).click();
  await expect(page.locator('[aria-label="Course assistant chat"]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toBeFocused();
  await expect(launcher).toHaveAttribute('aria-expanded', 'false');
  await expect(launcher).not.toHaveAttribute('aria-controls');
  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  await expect(miniActions).toHaveAttribute('aria-expanded', 'false');
  await expect(miniActions).not.toHaveAttribute('aria-controls');
  await expect(page.getByRole('button', { name: 'Clear chat' })).toHaveCount(0);
  await miniActions.hover();
  await page.waitForTimeout(2_100);
  await expect(page.getByRole('tooltip', { name: 'Conversation actions' })).toBeVisible();
  await expect(page.getByText('One answer 1.')).toBeVisible();
  await expect(input).toHaveValue('Keep this draft');
  await page.getByRole('button', { name: 'Expand course assistant' }).click();
  await expect(page).toHaveURL('/learning/enrollments/4/ai-chat');
  await expect(page.getByText('One answer 1.')).toBeVisible();
  const expandedInput = page.getByLabel('Message the course assistant');
  await expect(expandedInput).toBeFocused();
  await expect(expandedInput).toHaveJSProperty('selectionStart', 'Keep this draft'.length);
  await expect(expandedInput).toHaveJSProperty('selectionEnd', 'Keep this draft'.length);
  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close assistant chat' }).click();
  await expect(page).toHaveURL('/learning/enrollments/4');
  await expectNoOverflow(page);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('keeps a pending general request through mini-to-full expansion without a duplicate request', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  let resolveChat: (() => Promise<void>) | undefined;
  await page.route('**/chat/', async (route) => {
    chatRequests.push({
      method: route.request().method(),
      path: '/chat/',
      body: route.request().postDataJSON(),
    });
    await new Promise<void>((resolve) => {
      resolveChat = async () => {
        await json(route, { thread_id: 'general-thread', response: 'General answer.' });
        resolve();
      };
    });
  });
  await page.goto('/learning');
  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  await page.getByLabel('Message the course assistant').fill('Keep this pending');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Thinking…')).toBeVisible();
  await page.getByRole('button', { name: 'Expand course assistant' }).click();
  await expect(page).toHaveURL('/ai-chat');
  await expect(page.getByText('Keep this pending')).toBeVisible();
  await expect(page.getByText('Thinking…')).toBeVisible();
  if (resolveChat === undefined) throw new Error('Expected the pending chat request.');
  await resolveChat();
  await expect(page.getByText('General answer.')).toBeVisible();
  expect(chatRequests).toHaveLength(1);
  await expectNoOverflow(page);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('renders the D04 Russian pending course-chat state without overflow', async ({ page }) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  await page.addInitScript(() => localStorage.setItem('learnhub.locale', 'ru'));
  await page.route('**/chat/', async (route) => {
    await new Promise<void>(() => undefined);
    await route.abort();
  });
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/learning/enrollments/4');
  await page.getByRole('button', { name: 'Открыть ИИ-ассистента' }).click();
  const input = page.getByLabel('Написать ассистенту курса');
  await input.fill('Вопрос');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByText('Думаю…')).toBeVisible();
  await expectNoOverflow(page);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('keeps the workspace chat bounded at desktop and effective 200% scale with reduced motion', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/learning/enrollments/4');
  const launcher = page.getByRole('button', { name: 'Open AI assistant' });
  await launcher.focus();
  await expect(launcher).toBeFocused();
  await launcher.click();
  const widget = page.getByRole('region', { name: 'Course assistant chat' });
  await expect(widget).toHaveCSS('width', '354px');
  expect(
    await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
  ).toBe(true);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    const scale = await page.evaluate(() => window.visualViewport?.scale ?? 1);
    expect(scale).toBeCloseTo(2, 1);
    await expect(page.getByLabel('Message the course assistant')).toBeFocused();
    await expectNoOverflow(page);
  } finally {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();
  }
  expect(chatRequests).toEqual([]);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('resets Catalog footer clearance before My learning and Cart geometry without another scroll', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests, {
    cart: {
      id: 1,
      items: Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        course_id: index + 7,
        added_at: '2026-01-01T00:00:00Z',
        course: {
          id: index + 7,
          title: `Cart course ${index + 1}`,
          price: '19.99',
          currency: 'USD',
        },
      })),
      total_price: '159.92',
      currency: 'USD',
      item_count: 8,
    },
    enrollments: Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      user_id: 1,
      course_id: index + 7,
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      course: {
        id: index + 7,
        title: `Learning course ${index + 1}`,
        description: null,
        price: '19.99',
        currency: 'USD',
      },
    })),
  });
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const destination of [
    { accessibleName: 'My learning', path: '/learning' },
    { accessibleName: /^Cart/, path: '/cart' },
  ]) {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const launcherRoot = page.getByLabel('Course assistant');
    await expect(launcherRoot).toHaveAttribute('style', /inset-block-end/);
    const collisionGeometry = await launcherRoot.evaluate((root) => {
      const footer = root.previousElementSibling;
      if (!(footer instanceof HTMLElement)) throw new Error('Application footer is missing.');
      const launcher = root.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      return { footerTop: footerRect.top, launcherBottom: launcher.bottom };
    });
    expect(collisionGeometry.footerTop - collisionGeometry.launcherBottom).toBeGreaterThanOrEqual(
      16,
    );

    await page.getByRole('link', { name: destination.accessibleName }).click();
    await expect(page).toHaveURL(destination.path);
    const footerIsBelowFold = await launcherRoot.evaluate((root) => {
      const footer = root.previousElementSibling;
      if (!(footer instanceof HTMLElement)) throw new Error('Application footer is missing.');
      return footer.getBoundingClientRect().top >= window.innerHeight;
    });
    expect(footerIsBelowFold).toBe(true);
    await expect(launcherRoot).not.toHaveAttribute('style', /inset-block-end/);
    const normalAnchor = await launcherRoot.evaluate((root) => {
      const style = getComputedStyle(root);
      return { insetBlockEnd: style.insetBlockEnd, insetInlineEnd: style.insetInlineEnd };
    });
    expect(normalAnchor).toEqual({ insetBlockEnd: '32px', insetInlineEnd: '16px' });
  }

  await expectNoOverflow(page);
  expect(chatRequests).toEqual([]);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('keeps the launcher clear through a sorted Catalog footer and page-three transition', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await page.addInitScript(() => {
    const diagnosticWindow = window as DiagnosticWindow;
    diagnosticWindow.__launcherLifecycleDiagnostic = {
      frameCallbacks: 0,
      framesScheduled: 0,
      resizeListeners: 0,
    };
    const originalRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      diagnosticWindow.__launcherLifecycleDiagnostic!.framesScheduled += 1;
      return originalRequestAnimationFrame((time) => {
        diagnosticWindow.__launcherLifecycleDiagnostic!.frameCallbacks += 1;
        callback(time);
      });
    };
    const originalAddEventListener = window.addEventListener.bind(window) as (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) => void;
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === 'resize') diagnosticWindow.__launcherLifecycleDiagnostic!.resizeListeners += 1;
      originalAddEventListener(type, listener, options);
    }) as typeof window.addEventListener;
  });
  await installCourseChatFixture(page, chatRequests);
  const catalogCourse = {
    id: 7,
    title: 'Catalog course',
    description: null,
    price: '9.99',
    currency: 'USD',
    published_at: '2026-01-01T00:00:00Z',
    instructor: { id: 1, name: 'Ada', surname: 'Lovelace' },
    lessons: [{ id: 1, title: 'Intro' }],
  };
  await page.route('**/courses**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const sort = requestUrl.searchParams.get('sort');
    const pageNumber = Number(requestUrl.searchParams.get('page') ?? '1');
    const items =
      sort === 'title'
        ? Array.from({ length: 20 }, (_, index) => ({
            ...catalogCourse,
            id: (pageNumber - 1) * 20 + index + 1,
            title: `Catalog course ${pageNumber}-${index + 1}`,
          }))
        : Array.from({ length: 20 }, (_, index) => ({
            ...catalogCourse,
            id: index + 1,
            title: `Catalog course ${index + 1}`,
          }));
    await json(route, {
      items,
      page: pageNumber,
      page_size: 20,
      total: sort === 'title' ? 60 : 20,
      pages: sort === 'title' ? 3 : 1,
      has_next: sort === 'title' && pageNumber < 3,
      has_previous: pageNumber > 1,
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('[data-part="course-card"]')).toHaveCount(20);
  await page.locator('[data-part="catalog-sort-trigger"]').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => {
    const diagnosticWindow = window as DiagnosticWindow;
    return {
      diagnostic: diagnosticWindow.__launcherLifecycleDiagnostic,
      desktopMatches: window.matchMedia('(min-width: 768px)').matches,
      footerExists: document.querySelector('footer') instanceof HTMLElement,
      launcherExists:
        document.querySelector('[aria-label="Course assistant"]') instanceof HTMLElement,
    };
  });
  expect(before.desktopMatches).toBe(true);
  expect(before.footerExists).toBe(true);
  expect(before.launcherExists).toBe(true);
  expect(before.diagnostic?.resizeListeners).toBeGreaterThan(0);
  const beforeGeometry = await page
    .getByLabel('Course assistant')
    .evaluate<LauncherFooterGeometry>((launcher) => {
      const footer = launcher.previousElementSibling;
      if (!(footer instanceof HTMLElement)) throw new Error('Application footer is missing.');
      const footerRect = footer.getBoundingClientRect();
      const launcherRect = launcher.getBoundingClientRect();
      const style = getComputedStyle(launcher);
      return {
        footerTop: footerRect.top,
        footerBottom: footerRect.bottom,
        launcherTop: launcherRect.top,
        launcherBottom: launcherRect.bottom,
        insetBlockEnd: style.insetBlockEnd,
        inlineStyle: launcher.getAttribute('style'),
      };
    });
  expect(beforeGeometry.insetBlockEnd).toBe('32px');
  expect(beforeGeometry.inlineStyle).toBeNull();
  await page.getByRole('button', { name: 'Sort by: Oldest' }).click();
  await page.getByRole('option', { name: 'A to Z' }).click();
  await expect(page).toHaveURL('/?sort=title');
  await expect(page.getByRole('listbox', { name: 'Sort by options' })).toHaveCount(0);
  await expect(page.locator('[data-part="course-card"]')).toHaveCount(20);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as DiagnosticWindow).__launcherLifecycleDiagnostic?.frameCallbacks ?? 0,
      ),
    )
    .toBeGreaterThan(before.diagnostic?.frameCallbacks ?? 0);
  await expect
    .poll(() =>
      page.getByLabel('Course assistant').evaluate((launcher) => {
        const footer = launcher.previousElementSibling;
        if (!(footer instanceof HTMLElement)) throw new Error('Application footer is missing.');
        return footer.getBoundingClientRect().top - launcher.getBoundingClientRect().bottom;
      }),
    )
    .toBeGreaterThanOrEqual(16);
  const afterSort = await page
    .getByLabel('Course assistant')
    .evaluate<LauncherFooterGeometry>((launcher) => {
      const footer = launcher.previousElementSibling;
      if (!(footer instanceof HTMLElement)) throw new Error('Application footer is missing.');
      const footerRect = footer.getBoundingClientRect();
      const launcherRect = launcher.getBoundingClientRect();
      return {
        footerTop: footerRect.top,
        footerBottom: footerRect.bottom,
        launcherTop: launcherRect.top,
        launcherBottom: launcherRect.bottom,
        insetBlockEnd: getComputedStyle(launcher).insetBlockEnd,
        inlineStyle: launcher.getAttribute('style'),
      };
    });
  expect(Number.parseFloat(afterSort.insetBlockEnd)).toBeGreaterThan(32);
  expect(afterSort.inlineStyle).toContain('inset-block-end');
  await page.getByRole('button', { name: 'Go to page 3' }).click();
  await expect(page).toHaveURL(/\?sort=title&page=3$/);
  await expect(page.locator('[data-part="course-card"]')).toHaveCount(20);
  await expect
    .poll(() =>
      page.getByLabel('Course assistant').evaluate((launcher) => {
        const footer = launcher.previousElementSibling;
        if (!(footer instanceof HTMLElement)) throw new Error('Application footer is missing.');
        return footer.getBoundingClientRect().top - launcher.getBoundingClientRect().bottom;
      }),
    )
    .toBeGreaterThanOrEqual(16);
  const afterPageThree = await page
    .getByLabel('Course assistant')
    .evaluate<LauncherFooterGeometry>((launcher) => {
      const footer = launcher.previousElementSibling;
      if (!(footer instanceof HTMLElement)) throw new Error('Application footer is missing.');
      const footerRect = footer.getBoundingClientRect();
      const launcherRect = launcher.getBoundingClientRect();
      return {
        footerTop: footerRect.top,
        footerBottom: footerRect.bottom,
        launcherTop: launcherRect.top,
        launcherBottom: launcherRect.bottom,
        insetBlockEnd: getComputedStyle(launcher).insetBlockEnd,
        inlineStyle: launcher.getAttribute('style'),
      };
    });
  expect(afterPageThree.footerTop - afterPageThree.launcherBottom).toBeGreaterThanOrEqual(16);
  expect(afterPageThree.insetBlockEnd).toBe('32px');
  expect(afterPageThree.inlineStyle ?? '').toBe('');
  const afterDiagnostic = await page.evaluate(
    () => (window as DiagnosticWindow).__launcherLifecycleDiagnostic,
  );
  expect(afterDiagnostic?.resizeListeners).toBeGreaterThan(0);
  expect(afterDiagnostic?.framesScheduled).toBeGreaterThan(before.diagnostic?.framesScheduled ?? 0);
  expect(afterDiagnostic?.frameCallbacks).toBeGreaterThan(before.diagnostic?.frameCallbacks ?? 0);
  await expectNoOverflow(page);
  expect(chatRequests).toEqual([]);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('routes the authenticated workspace header to the course full-page assistant with its chat context', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/learning/enrollments/4');
  await page.evaluate(() => window.scrollTo(0, 0));
  const scrollBeforeNavigation = await page.evaluate(() => window.scrollY);

  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  const miniInput = page.getByLabel('Message the course assistant');
  await miniInput.fill('Carry this message to the full chat');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('One answer 1.')).toBeVisible();
  await miniInput.fill('Keep this general draft');
  await page.getByRole('button', { name: 'Close course assistant' }).click();

  await page.getByRole('link', { name: 'Open AI assistant' }).click();
  await expect(page).toHaveURL('/learning/enrollments/4/ai-chat');
  await expect(page.getByRole('heading', { name: 'BETA AI Learning Assistant' })).toBeVisible();
  await expect(page.getByText('Carry this message to the full chat')).toBeVisible();
  await expect(page.getByText('One answer 1.')).toBeVisible();
  const input = page.getByLabel('Message the course assistant');
  await expect(input).toBeFocused();
  await expect(input).toHaveJSProperty('selectionStart', 'Keep this general draft'.length);
  await expect(input).toHaveJSProperty('selectionEnd', 'Keep this general draft'.length);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeNavigation);
  const fullActions = page.getByRole('button', { name: 'Conversation actions' });
  await fullActions.click();
  const fullClear = page.getByRole('button', { name: 'Clear chat' });
  const fullMenuGeometry = await fullClear.evaluate((button) => {
    const menu = button.parentElement;
    const trigger = menu?.parentElement?.querySelector<HTMLElement>(
      'button[aria-label="Conversation actions"]',
    );
    if (!(menu instanceof HTMLElement) || !trigger) {
      throw new Error('Full-page chat action-menu geometry is missing.');
    }
    const menuRect = menu.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    return {
      menuCenter: menuRect.left + menuRect.width / 2,
      triggerCenter: triggerRect.left + triggerRect.width / 2,
      textColor: getComputedStyle(button).color,
    };
  });
  expect(
    Math.abs(fullMenuGeometry.menuCenter - fullMenuGeometry.triggerCenter),
  ).toBeLessThanOrEqual(0.5);
  expect(fullMenuGeometry.textColor).toBe('rgb(17, 24, 39)');
  await fullClear.hover();
  await expect(fullClear).toHaveCSS('color', 'rgb(185, 28, 28)');
  await expect(fullClear).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.getByText('Course Assistant', { exact: true }).click();
  await expect(fullClear).toHaveCount(0);
  await expect(fullActions).toHaveAttribute('aria-expanded', 'false');
  expect(chatRequests).toHaveLength(1);
  await fullActions.click();
  await expect(fullClear).toBeVisible();
  await fullClear.focus();
  await fullClear.press('Escape');
  await expect(fullClear).toHaveCount(0);
  await expect(fullActions).toBeFocused();
  await fullActions.click();
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(page.getByRole('heading', { name: 'Clear this conversation?' })).toBeVisible();
  await page.locator('[data-part="backdrop"]').dispatchEvent('mousedown');
  await expect(page.getByRole('heading', { name: 'Clear this conversation?' })).toHaveCount(0);
  await expect(fullActions).toBeFocused();
  await expect(input).toHaveValue('Keep this general draft');
  expect(chatRequests).toHaveLength(1);
  await page.getByRole('button', { name: 'Recommend a course' }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Recommend a course based on my learning goals.');
  await input.fill('Recommend a course');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('One answer 1.')).toBeVisible();
  expect(chatRequests).toEqual([
    {
      method: 'POST',
      path: '/chat/',
      body: {
        thread_id: expect.any(String),
        message: 'Carry this message to the full chat',
        course_id: 7,
      },
    },
    {
      method: 'POST',
      path: '/chat/',
      body: { thread_id: expect.any(String), message: 'Recommend a course', course_id: 7 },
    },
  ]);
  await page.getByRole('button', { name: 'Close assistant chat' }).click();
  await expect(page).toHaveURL('/learning/enrollments/4');
  await expectNoOverflow(page);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('uses one compact Suggested Actions disclosure below 1000px without changing chat submission', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  const acceptedNavigationRasterAbort =
    'GET /src/app/layouts/assets/ai-assistant-navigation-ui018-2.png net::ERR_ABORTED';
  await installCourseChatFixture(page, chatRequests);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const width of [320, 390, 618, 767, 768, 789, 895, 896, 999]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ai-chat');
    const trigger = page.getByRole('button', { name: 'Suggested Actions' });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-controls', /.+/);
    expect((await trigger.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole('heading', { name: 'Suggested Actions' })).toHaveCount(0);
    const heroDecoration = await page
      .getByRole('heading', { name: 'BETA AI Learning Assistant' })
      .evaluate((heading) => {
        const hero = heading.closest('section');
        if (!(hero instanceof HTMLElement)) throw new Error('AI Hero is unavailable.');
        const decoration = getComputedStyle(hero, '::before');
        return { backgroundImage: decoration.backgroundImage, opacity: decoration.opacity };
      });
    if (width <= 767) {
      expect(heroDecoration.backgroundImage).toContain(
        'ai-chat-hero-mobile-stars-lines-uifd001.png',
      );
      expect(heroDecoration.opacity).toBe('0.5');
    } else {
      expect(heroDecoration.backgroundImage).toBe('none');
    }
    await expectNoOverflow(page);
  }

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/ai-chat');
  const trigger = page.getByRole('button', { name: 'Suggested Actions' });
  await trigger.focus();
  await expect(trigger).toBeFocused();
  expect(await trigger.evaluate((element) => element.matches(':focus-visible'))).toBe(true);

  for (const [label, prompt] of [
    ['Recommend a course', 'Recommend a course based on my learning goals.'],
    ['Explain a concept', 'Explain a concept I am learning in simple terms.'],
    ['Quiz me', 'Quiz me on the course material I am learning.'],
  ] as const) {
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const action = page.getByRole('button', { name: label });
    expect((await action.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await action.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const input = page.getByLabel('Message the course assistant');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(prompt);
    expect(chatRequests).toEqual([]);
  }

  const input = page.getByLabel('Message the course assistant');
  await input.fill(
    'A deliberately long prompt that verifies the compact chat layout remains usable. '.repeat(8),
  );
  await expectNoOverflow(page);
  expect(
    await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
  ).toBe(true);

  for (const width of [768, 789, 895, 896, 999, 1000, 1024, 1080, 1081, 1199, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ai-chat');
    const suggestedActionsTrigger = page.getByRole('button', { name: 'Suggested Actions' });
    const sidebar = page.getByRole('heading', { name: 'Suggested Actions' });
    if (width < 1000) {
      await expect(suggestedActionsTrigger).toBeVisible();
      await expect(sidebar).toHaveCount(0);
    } else {
      await expect(suggestedActionsTrigger).toBeHidden();
      await expect(sidebar).toBeVisible();
      const sidebarBox = await sidebar.locator('..').boundingBox();
      expect(sidebarBox?.width).toBeCloseTo(300, 0);
    }
    const heroGeometry = await page
      .getByRole('heading', { name: 'BETA AI Learning Assistant' })
      .evaluate<AiHeroGeometry>((heading) => {
        const hero = heading.closest('section');
        const image = hero?.querySelector<HTMLImageElement>('[data-part="ai-chat-hero-image"]');
        const description = heading.nextElementSibling;
        if (
          !(hero instanceof HTMLElement) ||
          !(image instanceof HTMLElement) ||
          !(description instanceof HTMLElement)
        )
          throw new Error('AI hero geometry is unavailable.');
        const heroRect = hero.getBoundingClientRect();
        const headingRect = heading.getBoundingClientRect();
        const contentRect = heading.parentElement?.getBoundingClientRect();
        const descriptionRect = description.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        if (!contentRect) throw new Error('AI hero content geometry is unavailable.');
        const heroWidth = heroRect.width;
        const corridorWidth = heroWidth / 2;
        const renderedAspect = imageRect.width / imageRect.height;
        const sourceAspect = image.naturalWidth / image.naturalHeight;
        const imageFit = getComputedStyle(image).objectFit;
        return {
          heroWidth,
          heroLeft: heroRect.left,
          heroRight: heroRect.right,
          corridorWidth,
          zoneWidth: heroWidth / 2,
          headingLeft: headingRect.left - heroRect.left,
          headingRight: headingRect.right - heroRect.left,
          heroCenter: heroRect.top + heroRect.height / 2,
          heroContentRight: contentRect.right - heroRect.left,
          copyCenter: headingRect.top + (descriptionRect.bottom - headingRect.top) / 2,
          headingWidth: headingRect.width,
          imageWidth: imageRect.width,
          imageRight: imageRect.right,
          imageFit,
          sourceVisibility:
            imageFit === 'contain'
              ? 1
              : Math.min(renderedAspect / sourceAspect, sourceAspect / renderedAspect),
          overlay: getComputedStyle(hero, '::after').backgroundImage,
          headingWhiteSpace: getComputedStyle(heading).whiteSpace,
          rootClientWidth: document.documentElement.clientWidth,
          rootClientHeight: document.documentElement.clientHeight,
          rootScrollHeight: document.documentElement.scrollHeight,
        };
      });
    expect(Math.abs(heroGeometry.copyCenter - heroGeometry.heroCenter)).toBeLessThanOrEqual(6);
    expect(heroGeometry.heroWidth).toBeCloseTo(heroGeometry.rootClientWidth, 0);
    expect(heroGeometry.corridorWidth).toBeCloseTo(heroGeometry.zoneWidth, 0);
    expect(heroGeometry.headingLeft).toBeGreaterThanOrEqual(0);
    if (width >= 768 && width <= 1080) {
      expect(heroGeometry.headingRight).toBeLessThanOrEqual(heroGeometry.heroWidth * 0.58 + 1);
    } else {
      expect(heroGeometry.headingRight).toBeLessThanOrEqual(heroGeometry.heroContentRight + 1);
      expect(heroGeometry.headingWidth).toBeLessThanOrEqual(680);
    }
    expect(
      Math.abs(
        heroGeometry.imageWidth - expectedAiHeroImageWidth(width, heroGeometry.rootClientWidth),
      ),
    ).toBeLessThanOrEqual(1);
    expect(heroGeometry.imageRight).toBeGreaterThan(heroGeometry.rootClientWidth / 2);
    expect(heroGeometry.imageRight).toBeLessThanOrEqual(
      heroGeometry.rootClientWidth + heroGeometry.imageWidth,
    );
    if (width >= 896) expect(heroGeometry.imageFit).toBe('contain');
    expect(heroGeometry.sourceVisibility).toBeGreaterThanOrEqual(0.75);
    expect(heroGeometry.overlay).toContain('46%');
    expect(heroGeometry.overlay).toContain('62%');
    if (width === 789) expect(heroGeometry.headingWhiteSpace).toBe('nowrap');
    if (width >= 895) {
      expect(heroGeometry.rootScrollHeight).toBeGreaterThan(heroGeometry.rootClientHeight);
      expect(Math.abs(heroGeometry.heroLeft)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(heroGeometry.heroRight - heroGeometry.rootClientWidth)).toBeLessThanOrEqual(
        0.5,
      );
    }
    await expectNoOverflow(page);
  }

  const acceptedNavigationRasterAbortCount = diagnostics.unexpectedRuntimeFailures.filter(
    (failure) => failure === acceptedNavigationRasterAbort,
  ).length;
  expect(acceptedNavigationRasterAbortCount).toBeLessThanOrEqual(2);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual(
    Array.from({ length: acceptedNavigationRasterAbortCount }, () => acceptedNavigationRasterAbort),
  );
  expect(diagnostics.httpFailures).toEqual([]);
});

test('keeps RU and Uzbek accumulated locale states, focus, zoom, reflow, and network behavior intact', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests, {
    cart: {
      id: 1,
      items: [
        {
          id: 1,
          course_id: 7,
          added_at: '2026-01-01T00:00:00Z',
          course: { id: 7, title: 'Localized course', price: '19.99', currency: 'USD' },
        },
      ],
      total_price: '19.99',
      currency: 'USD',
      item_count: 1,
    },
  });

  for (const [
    locale,
    assistant,
    composer,
    suggestedActions,
    actions,
    chatLabel,
    catalogEmpty,
    courseMissing,
    clearCart,
    preview,
    learningEmpty,
    openAssistant,
  ] of [
    [
      'ru',
      'Ассистент курса',
      'Написать ассистенту курса',
      'Предлагаемые действия',
      'Действия с диалогом',
      'Чат с ассистентом курса',
      'Курсы не найдены',
      'Курс не найден',
      'Очистить корзину',
      'Предпросмотр курса «Localized course»',
      'Начните обучение',
      'Открыть ИИ-ассистента',
    ],
    [
      'uz',
      'Kurs yordamchisi',
      'Kurs yordamchisiga yozish',
      'Tavsiya etilgan amallar',
      'Suhbat amallari',
      'Kurs yordamchisi chati',
      'Kurslar topilmadi',
      'Kurs topilmadi',
      'Savatni tozalash',
      'Localized course kursini oldindan ko‘rish',
      'Ta’lim yo‘lingizni boshlang',
      'AI yordamchini ochish',
    ],
  ] as const) {
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/ai-chat');
      await waitForRenderedAiChatAssets(page);
      await page.evaluate((selectedLocale: string) => {
        localStorage.setItem('learnhub.locale', selectedLocale);
      }, locale);
      await page.reload();
      await expect(page.getByRole('region', { name: assistant })).toBeVisible();
      await expect(page.getByLabel(composer)).toBeVisible();
      if (width < 1000) {
        const trigger = page.getByRole('button', { name: suggestedActions });
        await expect(trigger).toBeVisible();
        await trigger.focus();
        await expect(trigger).toBeFocused();
      } else {
        await expect(page.getByRole('heading', { name: suggestedActions })).toBeVisible();
      }
      await waitForRenderedAiChatAssets(page);
      await expectNoOverflow(page);
    }

    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/');
    await expect(page.getByText(catalogEmpty, { exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Translation unavailable');
    await expect(page.locator('body')).not.toContainText(
      /(?:catalog|course|cart|learning|common|navigation|routes):/,
    );
    await expectNoOverflow(page);

    await page.goto('/courses/not-a-course');
    await expect(page.getByRole('heading', { name: courseMissing })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Translation unavailable');
    await expectNoOverflow(page);

    await page.goto('/');
    await page.locator('a[href="/cart"]').first().click();
    await expect(page).toHaveURL('/cart');
    const previewLink = page.getByRole('link', { name: preview });
    await expect(previewLink).toBeVisible();
    await previewLink.focus();
    await expect(previewLink).toBeFocused();
    await expect(page.getByRole('button', { name: clearCart })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Translation unavailable');
    await expectNoOverflow(page);

    await page.goto('/learning');
    await expect(page.getByRole('heading', { name: learningEmpty })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Translation unavailable');
    await expectNoOverflow(page);

    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('/learning/enrollments/4');
    await page.getByRole('button', { name: openAssistant }).click();
    await expect(page.getByRole('region', { name: chatLabel })).toBeVisible();
    await expect(page.getByLabel(composer)).toBeFocused();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const actionTrigger = page.getByRole('button', { name: actions });
    await actionTrigger.focus();
    await expect(actionTrigger).toBeFocused();
    await expectNoOverflow(page);
  }

  const cdp = await page.context().newCDPSession(page);
  try {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/ai-chat');
    await waitForRenderedAiChatAssets(page);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBeCloseTo(2, 1);
    await expectNoOverflow(page);
  } finally {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();
  }

  expect(chatRequests).toEqual([]);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('does not offer course assistant controls to guests', async ({ page }) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.route('**/*', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/courses') {
      return json(route, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    }
    if (path === '/chat/') {
      chatRequests.push({
        method: route.request().method(),
        path,
        body: route.request().postDataJSON(),
      });
      return json(route, { thread_id: 'unexpected', response: 'Unexpected response' });
    }
    return route.fallback();
  });
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'AI assistant sign in guidance' })).toHaveCount(0);
  expect(chatRequests).toEqual([]);
  await expectNoOverflow(page);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('centers unavailable course assistant guidance with an underlined violet return link', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  await installCourseChatFixture(page, chatRequests);
  await page.route('**/enrollments/4', (route) =>
    json(route, { ...enrollment, status: 'pending_payment' }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learning/enrollments/4/ai-chat');

  const heading = page.getByRole('heading', { name: 'Course assistant unavailable' });
  const link = page.getByRole('link', { name: 'Return to learning workspace' });
  await expect(heading).toBeVisible();
  await expect(link).toHaveAttribute('href', '/learning/enrollments/4');
  await expect(link).toHaveCSS('color', 'rgb(91, 63, 214)');
  await expect(link).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(link).toHaveCSS('text-decoration-line', 'underline');
  const center = await heading.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { centerX: rect.left + rect.width / 2, viewportCenterX: window.innerWidth / 2 };
  });
  expect(Math.abs(center.centerX - center.viewportCenterX)).toBeLessThan(1);
  await expectNoOverflow(page);
  expect(chatRequests).toEqual([]);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('reflows the general full-page assistant at all standard application widths', async ({
  page,
}) => {
  const chatRequests: ChatRequestEvidence[] = [];
  const diagnostics = captureRuntimeDiagnostics(page);
  const acceptedNavigationRasterAbort =
    'GET /src/app/layouts/assets/ai-assistant-navigation-ui018-2.png net::ERR_ABORTED';
  await installCourseChatFixture(page, chatRequests);

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/ai-chat');
    await expect(page.getByRole('heading', { name: 'BETA AI Learning Assistant' })).toBeVisible();
    await expect(page.getByLabel('Message the course assistant')).toBeVisible();
    await expectNoOverflow(page);
  }

  expect(chatRequests).toEqual([]);
  const acceptedNavigationRasterAbortCount = diagnostics.unexpectedRuntimeFailures.filter(
    (failure) => failure === acceptedNavigationRasterAbort,
  ).length;
  expect(acceptedNavigationRasterAbortCount).toBeLessThanOrEqual(1);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual(
    Array.from({ length: acceptedNavigationRasterAbortCount }, () => acceptedNavigationRasterAbort),
  );
  expect(diagnostics.httpFailures).toEqual([]);
});
