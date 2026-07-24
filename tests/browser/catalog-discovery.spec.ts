import { expect, test, type ConsoleMessage, type Page, type Request } from '@playwright/test';

interface CatalogPaginationFixture {
  page?: number;
  pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
}

interface BrowserMonitorAllowances {
  requestFailure?: (request: Request) => boolean;
  consoleError?: (message: ConsoleMessage) => boolean;
}

function response(items: readonly unknown[] = [], pagination: CatalogPaginationFixture = {}) {
  return JSON.stringify({ items, page: 1, page_size: 20, total: items.length, pages: items.length ? 1 : 0, has_next: false, has_previous: false, ...pagination });
}

function permittedCourse(title = 'React') {
  return { id: 7, title, description: null, price: '9.99', currency: 'USD', published_at: '2026-01-01T00:00:00Z', instructor: { id: 1, name: 'Ada', surname: 'Lovelace' }, lessons: [{ id: 1, title: 'Intro' }] };
}

async function monitor(page: Page, allowed: BrowserMonitorAllowances = {}) {
  const errors: string[] = [];
  const failures: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !allowed.consoleError?.(message)) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    if (!allowed.requestFailure?.(request)) failures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`);
  });
  return () => {
    expect(errors, 'unexpected browser console/page errors').toEqual([]);
    expect(failures, 'unexpected browser request failures').toEqual([]);
  };
}

test('renders a semantic full-width catalog hero at scrollable physical client edges', async ({ page }, testInfo) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse()]) });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(() => {
    document.body.style.minHeight = '2000px';
  });
  const heading = page.getByRole('heading', { level: 1, name: 'Master the Skills Shaping the Future' });
  await expect(heading).toBeVisible();
  await expect(page.getByText('Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.')).toBeVisible();
  await expect(page.locator('.catalog-hero img')).toHaveCount(0);
  const settledRequestCount = requests.length;

  const desktopGeometry = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.catalog-hero');
    const header = document.querySelector<HTMLElement>('.app-header');
    const title = document.querySelector<HTMLElement>('#catalog-page-title');
    const content = document.querySelector<HTMLElement>('.catalog-page__content');
    if (!hero || !header || !title || !content) throw new Error('Catalog hero geometry targets are missing.');
    const heroRect = hero.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      hero: heroRect.toJSON(),
      headerBottom: headerRect.bottom,
      titleLeft: titleRect.left,
      contentStart: contentRect.left + Number.parseFloat(getComputedStyle(content).paddingLeft),
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      bodyWidth: document.body.scrollWidth,
    };
  });
  expect(Math.abs(desktopGeometry.hero.y - desktopGeometry.headerBottom)).toBeLessThanOrEqual(1);
  expect(desktopGeometry.hero.height).toBeCloseTo(320, 0);
  expect(Math.abs(desktopGeometry.hero.x)).toBeLessThanOrEqual(1);
  expect(desktopGeometry.viewportWidth).toBeGreaterThanOrEqual(desktopGeometry.clientWidth);
  expect(Math.abs(desktopGeometry.hero.right - desktopGeometry.clientWidth)).toBeLessThanOrEqual(1);
  expect(desktopGeometry.documentWidth).toBeLessThanOrEqual(desktopGeometry.clientWidth);
  expect(desktopGeometry.bodyWidth).toBeLessThanOrEqual(desktopGeometry.clientWidth);
  expect(desktopGeometry.documentHeight).toBeGreaterThan(desktopGeometry.clientHeight);
  expect(Math.abs(desktopGeometry.titleLeft - desktopGeometry.contentStart)).toBeLessThanOrEqual(1);
  await testInfo.attach('catalog-hero-1440', { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });

  for (const width of [320, 768, 1280, 1440, 640]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(heading).toBeVisible();
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>('.catalog-hero');
      const title = document.querySelector<HTMLElement>('#catalog-page-title');
      const content = document.querySelector<HTMLElement>('.catalog-page__content');
      if (!hero || !title || !content) throw new Error('Catalog hero geometry targets are missing.');
      const heroRect = hero.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        clientHeight: document.documentElement.clientHeight,
        hero: heroRect.toJSON(),
        titleLeft: titleRect.left,
        contentStart: contentRect.left + Number.parseFloat(getComputedStyle(content).paddingLeft),
        titleClientWidth: title.clientWidth,
        titleScrollWidth: title.scrollWidth,
        titleHeight: titleRect.height,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        bodyWidth: document.body.scrollWidth,
      };
    });
    expect(geometry.hero.height).toBeCloseTo(320, 0);
    expect(Math.abs(geometry.hero.x)).toBeLessThanOrEqual(1);
    expect(geometry.viewportWidth).toBeGreaterThanOrEqual(geometry.clientWidth);
    expect(Math.abs(geometry.hero.right - geometry.clientWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.titleLeft - geometry.contentStart)).toBeLessThanOrEqual(1);
    expect(geometry.titleScrollWidth).toBeLessThanOrEqual(geometry.titleClientWidth);
    expect(geometry.titleHeight).toBeGreaterThan(0);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.documentHeight).toBeGreaterThan(geometry.clientHeight);
    await testInfo.attach(`catalog-hero-scrollable-client-edge-${width}`, { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
  }

  expect(requests).toHaveLength(settledRequestCount);
  assertClean();
});

test('renders aligned accessible catalog cards and opt-in arrow pagination without embedded media', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const forbiddenMutationRequests: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path === '/cart' || path.startsWith('/cart/') || path === '/enrollments' || path.startsWith('/enrollments/') || /^\/courses\/[^/]+\/enrollments$/.test(path)) {
      forbiddenMutationRequests.push(`${request.method()} ${path}`);
    }
  });
  const longTitle = 'A deliberately long course title that overflows the available card heading width and must remain accessible in full';
  const courses = [
    { ...permittedCourse('React'), id: 7, description: 'A concise course description.', price: '94.99', currency: 'USD', published_at: null, lessons: [{ id: 1, title: 'Intro' }, { id: 2, title: 'Hooks' }, { id: 3, title: 'State' }, { id: 4, title: 'Testing' }] },
    { ...permittedCourse('TypeScript'), id: 8, description: null, price: '0.00', currency: 'UZS', published_at: '2026-01-01T00:00:00Z' },
    { ...permittedCourse(longTitle), id: 9, description: 'A deliberately longer course description that must wrap naturally without clipping while every card remains aligned with its neighboring cards.', price: 'not-a-decimal', currency: 'US', published_at: null },
    { ...permittedCourse('Draft free'), id: 10, description: 'A Draft course with a zero price.', price: '0.00', currency: 'USD', published_at: null },
    { ...permittedCourse('Published paid'), id: 11, description: 'A published paid course.', price: '29.99', currency: 'USD', published_at: '2026-01-01T00:00:00Z' },
  ];
  await page.route('**/courses**', async (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get('page') ?? '1');
    await route.fulfill({ status: 200, contentType: 'application/json', body: response(courses, { page: requestedPage, pages: 2, has_next: requestedPage === 1, has_previous: requestedPage === 2 }) });
  });

  await page.goto('/');
  const reactLink = page.getByRole('link', { name: /React/ });
  await expect(reactLink).toBeVisible();
  await expect(page.locator('.catalog-card')).toHaveCount(5);
  await expect(page.locator('.catalog-card video, .catalog-card audio, .catalog-card img, .catalog-card iframe')).toHaveCount(0);
  await expect(page.getByText('$94.99')).toBeVisible();
  await expect(page.getByText('UZS\u00A00.00')).toBeVisible();
  await expect(page.getByText('Price unavailable')).toBeVisible();
  await expect(page.locator('.catalog-card__body .catalog-card__description')).toHaveCount(0);
  await expect(page.locator('.catalog-card__tooltip')).toHaveCount(5);
  expect(await page.locator('.catalog-card__tooltip').first().evaluate((tooltip) => ({
    pointerEvents: getComputedStyle(tooltip).pointerEvents,
    interceptsTopLeft: document.elementFromPoint(16, 16)?.closest('.catalog-card__tooltip') === tooltip,
  }))).toEqual({ pointerEvents: 'none', interceptsTopLeft: false });
  await expect(page.getByText('View details', { exact: true })).toHaveCount(2);
  await expect(page.getByText('View Draft', { exact: true })).toHaveCount(3);
  await expect(page.locator('.catalog-card__preview-cue')).toHaveCount(5);
  await expect(page.locator('.catalog-card__details-cue')).toHaveCount(0);

  for (const width of [320, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.locator('.catalog-card').evaluateAll((cards) => cards.map((card) => {
      const rect = card.getBoundingClientRect();
      const preview = card.querySelector<HTMLElement>('.catalog-card__preview');
      const body = card.querySelector<HTMLElement>('.catalog-card__body');
      const price = card.querySelector<HTMLElement>('.catalog-card__price');
      const link = card.querySelector<HTMLElement>('.catalog-card__link');
      const title = card.querySelector<HTMLElement>('.catalog-card__title');
      const meta = card.querySelector<HTMLElement>('.catalog-card__meta');
      const separator = card.querySelector<HTMLElement>('.catalog-card__meta-separator');
      const action = card.querySelector<HTMLElement>('.catalog-card__actions .ui-button-wrap');
      if (!preview || !body || !price || !link || !title || !meta || !separator || !action) throw new Error('Catalog card geometry targets are missing.');
      const bodyStyle = getComputedStyle(body);
      const titleStyle = getComputedStyle(title);
      const metaStyle = getComputedStyle(meta);
      const priceStyle = getComputedStyle(price);
      const actionButton = action.querySelector<HTMLElement>('.catalog-card__action-button');
      if (!actionButton) throw new Error('Catalog action button is missing.');
      const actionStyle = getComputedStyle(actionButton);
      const priceRect = price.getBoundingClientRect();
      const actionRect = action.getBoundingClientRect();
      const metaRect = meta.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const separatorRect = separator.getBoundingClientRect();
      const separatorStyle = getComputedStyle(separator);
      return {
        height: rect.height,
        previewWidth: preview.getBoundingClientRect().width,
        previewHeight: preview.getBoundingClientRect().height,
        bodyTop: body.getBoundingClientRect().top,
        priceBottom: priceRect.bottom,
        bodyGap: bodyStyle.rowGap,
        bodyPadding: bodyStyle.padding,
        titleFontSize: titleStyle.fontSize,
        titleLineHeight: titleStyle.lineHeight,
        titleHeight: titleRect.height,
        titleMinHeight: titleStyle.minHeight,
        titleTop: titleRect.top,
        metadataTop: metaRect.top,
        metadataFontSize: metaStyle.fontSize,
        metadataLineHeight: metaStyle.lineHeight,
        priceFontSize: priceStyle.fontSize,
        priceLineHeight: priceStyle.lineHeight,
        pricePaddingBlockStart: priceStyle.paddingBlockStart,
        pricePaddingBlockEnd: priceStyle.paddingBlockEnd,
        metadataHeight: metaRect.height,
        metadataScrollHeight: meta.scrollHeight,
        metadataClientHeight: meta.clientHeight,
        metadataWhiteSpace: metaStyle.whiteSpace,
        metadataDisplay: metaStyle.display,
        lessonWhiteSpace: getComputedStyle(meta.querySelector<HTMLElement>('.catalog-card__lesson-count')!).whiteSpace,
        separatorFontSize: separatorStyle.fontSize,
        separatorHeight: separatorRect.height,
        separatorMarginInlineStart: separatorStyle.marginInlineStart,
        separatorMarginInlineEnd: separatorStyle.marginInlineEnd,
        separatorCentreDelta: Math.abs((separatorRect.top + (separatorRect.height / 2)) - (metaRect.top + (metaRect.height / 2))),
        actionHeight: actionRect.height,
        actionPaddingInlineStart: actionStyle.paddingInlineStart,
        actionPaddingInlineEnd: actionStyle.paddingInlineEnd,
        actionFontSize: actionStyle.fontSize,
        actionFontWeight: actionStyle.fontWeight,
        actionBottom: actionRect.bottom,
        actionLeft: actionRect.left,
        priceRight: priceRect.right,
        priceTextRight: price.querySelector<HTMLElement>('data')!.getBoundingClientRect().right,
        linkBottom: link.getBoundingClientRect().bottom,
        cardBottom: rect.bottom,
        priceIsLastLinkChild: link.lastElementChild === price,
      };
    }));
    expect(new Set(geometry.map((card) => Math.round(card.height))).size).toBe(1);
    expect(
      geometry.every(
        (card) => Math.abs(card.previewWidth / card.previewHeight - 16 / 9) <= 0.02,
      ),
    ).toBe(true);
    expect(geometry.every((card) => card.titleFontSize === '16px' && card.titleLineHeight === '24px')).toBe(true);
    expect(geometry.every((card) => Math.abs(card.titleHeight - 48) <= .5 && card.titleMinHeight === '48px')).toBe(true);
    expect(geometry.every((card) => card.metadataFontSize === '13px' && card.metadataLineHeight === '18px')).toBe(true);
    expect(geometry.every((card) => card.priceFontSize === '16px' && card.priceLineHeight === '24px')).toBe(true);
    expect(geometry.every((card) => card.bodyPadding === '12px' && card.pricePaddingBlockStart === '12px' && card.pricePaddingBlockEnd === '12px')).toBe(true);
    expect(geometry.every((card) => card.bodyGap === '8px' && card.metadataDisplay === 'flex' && card.metadataWhiteSpace === 'nowrap' && card.lessonWhiteSpace === 'nowrap' && card.metadataHeight <= 18.5 && card.metadataScrollHeight >= card.metadataClientHeight)).toBe(true);
    expect(geometry.every((card) => card.separatorFontSize === '26px' && Math.abs(card.separatorHeight - 18) <= .5 && card.separatorMarginInlineStart === '12px' && card.separatorMarginInlineEnd === '12px' && card.separatorCentreDelta <= .5)).toBe(true);
    const firstRow = geometry.slice(0, width >= 1100 ? 3 : width >= 768 ? 2 : 1);
    expect(Math.max(...firstRow.map((card) => card.metadataTop)) - Math.min(...firstRow.map((card) => card.metadataTop))).toBeLessThanOrEqual(1);
    expect(geometry.every((card) => Math.abs(card.actionHeight - 41.8) <= .5 && card.actionPaddingInlineStart === '15.2px' && card.actionPaddingInlineEnd === '15.2px' && card.actionFontSize === '14px' && card.actionFontWeight === '600')).toBe(true);
    expect(geometry.every((card) => Math.abs(card.priceBottom - card.actionBottom) <= 1 && Math.abs(card.priceBottom - card.linkBottom) <= 1 && Math.abs(card.priceBottom - card.cardBottom) <= 1 && card.priceTextRight <= card.actionLeft + 1 && card.priceIsLastLinkChild)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  const longTitleLink = page.getByRole('link', { name: longTitle });
  await expect(longTitleLink).toBeVisible();
  const longTitleGeometry = await longTitleLink.locator('.catalog-card__title').evaluate((title) => {
    const style = getComputedStyle(title);
    const lineHeight = Number.parseFloat(style.lineHeight);
    return {
      display: style.display,
      lineClamp: style.webkitLineClamp,
      boxOrient: style.webkitBoxOrient,
      overflowY: style.overflowY,
      lineHeight,
      height: title.getBoundingClientRect().height,
      clientHeight: title.clientHeight,
      scrollHeight: title.scrollHeight,
    };
  });
  // Chromium canonicalizes the legacy authored -webkit-box display to flow-root in computed style.
  expect(longTitleGeometry.display).toBe('flow-root');
  expect(longTitleGeometry.lineClamp).toBe('2');
  expect(longTitleGeometry.boxOrient).toBe('vertical');
  expect(longTitleGeometry.overflowY).toBe('hidden');
  expect(longTitleGeometry.height).toBeLessThanOrEqual(longTitleGeometry.lineHeight * 2 + 1);
  expect(longTitleGeometry.scrollHeight).toBeGreaterThan(longTitleGeometry.clientHeight);

  const reactCard = page.locator('.catalog-card').filter({ has: page.getByRole('heading', { level: 3, name: 'React' }) });
  await expect(reactCard.locator('.catalog-card__meta')).toHaveText('Ada Lovelace · 4 lessons');
  await expect(reactCard.locator('.catalog-card__meta p')).toHaveCount(0);
  await expect(reactCard.locator('.catalog-card__meta')).not.toContainText('by ');
  await expect(reactCard.locator('.catalog-card__meta-separator')).toHaveCount(1);
  await expect(reactCard.locator('.catalog-card__meta-separator')).toHaveText(' · ');
  await expect(reactCard.locator('.catalog-card__meta-separator')).toHaveAttribute('aria-hidden', 'true');
  await expect(reactCard.locator('.catalog-card__meta')).not.toContainText('Instructor');
  await expect(page.locator('.catalog-card').filter({ has: page.getByRole('heading', { level: 3, name: 'TypeScript' }) }).locator('.catalog-card__meta')).toHaveText('Ada Lovelace · 1 lesson');
  await reactCard.hover();
  const reactTooltip = reactCard.locator('.catalog-card__tooltip');
  await expect(reactTooltip).toHaveCSS('opacity', '1');
  await expect(reactTooltip.locator(':scope > :first-child')).toHaveText('This course is not available for enrollment yet.');
  await expect(reactTooltip).toHaveText(/^This course is not available for enrollment yet\.About ReactA concise course description\.$/);
  await expect(reactTooltip).toContainText('A concise course description.');
  await expect(reactTooltip.locator('.catalog-card__tooltip-course')).toHaveText('About React');
  await expect(reactTooltip.locator('.catalog-card__tooltip-course')).toHaveAttribute('aria-hidden', 'true');
  await expect(reactTooltip).not.toContainText('published_at');
  await expect(reactTooltip).not.toContainText('Draft means this course');
  await expect(reactTooltip).toHaveClass(/catalog-card__tooltip--right/);
  const publishedCard = page.locator('.catalog-card').filter({ has: page.getByRole('heading', { level: 3, name: 'TypeScript' }) });
  await publishedCard.hover();
  const publishedTooltip = publishedCard.locator('.catalog-card__tooltip');
  await expect(publishedTooltip).toHaveCSS('opacity', '1');
  await expect(publishedTooltip).not.toContainText('Published means this course');
  await expect(publishedTooltip).not.toContainText('published_at');
  await reactCard.hover();
  const rightPlacement = await reactTooltip.evaluate((tooltip) => {
    const rect = tooltip.getBoundingClientRect();
    const headerBottom = document.querySelector<HTMLElement>('.app-header')?.getBoundingClientRect().bottom ?? 0;
    const centreX = rect.left + (rect.width / 2);
    const centreY = rect.top + (rect.height / 2);
    const hit = document.elementFromPoint(centreX, centreY);
    const sourceCard = tooltip.closest('.catalog-card');
    const hasNeighborBelow = document.elementsFromPoint(centreX, centreY).some((element) => {
      const card = element.closest('.catalog-card');
      return card !== null && card !== sourceCard;
    });
    return {
      left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
      clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight,
      headerBottom, hitInsideTooltip: hit?.closest('.catalog-card__tooltip') === tooltip, hasNeighborBelow,
      tailBorderRightWidth: getComputedStyle(tooltip, '::before').borderRightWidth,
      tailTop: getComputedStyle(tooltip, '::before').top,
      tailTransform: getComputedStyle(tooltip, '::before').transform,
      transitionProperty: getComputedStyle(tooltip).transitionProperty,
      tailPositionVariable: tooltip.style.getPropertyValue('--catalog-tooltip-tail-top'),
    };
  });
  expect(rightPlacement.left).toBeGreaterThanOrEqual(0);
  expect(rightPlacement.right).toBeLessThanOrEqual(rightPlacement.clientWidth);
  expect(rightPlacement.top).toBeGreaterThanOrEqual(12);
  expect(rightPlacement.top).toBeGreaterThanOrEqual(rightPlacement.headerBottom + 12);
  expect(rightPlacement.bottom).toBeLessThanOrEqual(rightPlacement.clientHeight);
  expect(rightPlacement.hitInsideTooltip).toBe(true);
  expect(rightPlacement.hasNeighborBelow).toBe(true);
  expect(rightPlacement.tailBorderRightWidth).toBe('8px');
  expect(rightPlacement.tailTop).not.toBe('auto');
  expect(rightPlacement.tailTransform).not.toBe('none');
  expect(rightPlacement.transitionProperty).not.toContain('transform');
  expect(rightPlacement.tailPositionVariable).toBe('');

  const rightmostCard = page.locator('.catalog-card').filter({ has: page.getByRole('heading', { level: 3, name: longTitle }) });
  await rightmostCard.hover();
  await expect(rightmostCard.locator('.catalog-card__tooltip')).toHaveClass(/catalog-card__tooltip--left/);
  expect(await rightmostCard.locator('.catalog-card__tooltip').evaluate((tooltip) => getComputedStyle(tooltip, '::before').borderLeftWidth)).toBe('8px');
  await reactLink.focus();
  expect(await reactLink.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
  await expect(reactTooltip).toHaveCSS('opacity', '1');
  await expect(page.getByRole('heading', { level: 3, name: 'React' })).toBeVisible();

  const cartButton = reactCard.getByRole('button', { name: 'Not available' });
  const freeButton = publishedCard.getByRole('button', { name: 'Enroll Free' });
  const draftFreeButton = page.locator('.catalog-card').filter({ has: page.getByRole('heading', { level: 3, name: 'Draft free' }) }).getByRole('button', { name: 'Not available' });
  const paidButton = page.locator('.catalog-card').filter({ has: page.getByRole('heading', { level: 3, name: 'Published paid' }) }).getByRole('button', { name: 'Add to cart' });
  await expect(cartButton).toBeDisabled();
  await expect(freeButton).toBeDisabled();
  await expect(draftFreeButton).toBeDisabled();
  await expect(paidButton).toBeDisabled();
  await expect(cartButton).toHaveCSS('background-color', 'rgb(109, 40, 217)');
  await expect(cartButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(freeButton).toHaveCSS('background-color', 'rgb(109, 40, 217)');
  await expect(freeButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  const actionGeometry = await Promise.all([reactCard.boundingBox(), cartButton.boundingBox()]);
  expect(actionGeometry[0]).not.toBeNull();
  expect(actionGeometry[1]).not.toBeNull();
  expect(Math.abs((actionGeometry[1]!.x + actionGeometry[1]!.width) - (actionGeometry[0]!.x + actionGeometry[0]!.width))).toBeLessThanOrEqual(1);
  expect(Math.abs((actionGeometry[1]!.y + actionGeometry[1]!.height) - (actionGeometry[0]!.y + actionGeometry[0]!.height))).toBeLessThanOrEqual(1);
  const actionRadii = await Promise.all([reactCard.evaluate((card) => getComputedStyle(card).borderBottomRightRadius), cartButton.evaluate((button) => getComputedStyle(button).borderBottomRightRadius)]);
  expect(Math.abs(Number.parseFloat(actionRadii[0]) - Number.parseFloat(actionRadii[1]))).toBeLessThanOrEqual(1);
  await page.keyboard.press('Tab');
  await expect(cartButton).not.toBeFocused();
  await cartButton.evaluate((button) => (button as HTMLButtonElement).click());
  expect(forbiddenMutationRequests).toEqual([]);

  await reactLink.focus();
  await page.setViewportSize({ width: 320, height: 900 });
  await expect(reactTooltip).toHaveClass(/catalog-card__tooltip--inline/);
  expect(await reactTooltip.evaluate((tooltip) => tooltip.parentElement?.lastElementChild?.classList.contains('catalog-card__price'))).toBe(true);
  expect(await reactTooltip.evaluate((tooltip) => getComputedStyle(tooltip, '::before').content)).toBe('none');
  await expect(reactTooltip).toBeVisible();
  const narrowPlacement = await reactTooltip.evaluate((tooltip) => ({
    left: tooltip.getBoundingClientRect().left,
    right: tooltip.getBoundingClientRect().right,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(narrowPlacement.left).toBeGreaterThanOrEqual(0);
  expect(narrowPlacement.right).toBeLessThanOrEqual(narrowPlacement.clientWidth);
  const narrowActionGeometry = await Promise.all([reactCard.boundingBox(), cartButton.boundingBox()]);
  expect(narrowActionGeometry[0]).not.toBeNull();
  expect(narrowActionGeometry[1]).not.toBeNull();
  expect(narrowActionGeometry[1]!.x).toBeGreaterThanOrEqual(narrowActionGeometry[0]!.x);
  expect(narrowActionGeometry[1]!.x + narrowActionGeometry[1]!.width).toBeLessThanOrEqual(narrowActionGeometry[0]!.x + narrowActionGeometry[0]!.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => { document.body.style.minHeight = '2000px'; });
  await reactLink.focus();
  await expect(reactTooltip).toHaveClass(/catalog-card__tooltip--right/);
  const readSideTooltipGeometry = () => reactTooltip.evaluate((tooltip) => {
    const source = tooltip.closest<HTMLElement>('.catalog-card');
    const link = tooltip.closest<HTMLElement>('.catalog-card__link');
    const header = document.querySelector<HTMLElement>('.app-header');
    if (!source || !link || !header) throw new Error('Tooltip geometry targets are missing.');
    const tooltipRect = tooltip.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const connector = getComputedStyle(tooltip, '::before');
    const connectorTop = Number.parseFloat(connector.top);
    const minimumTop = Math.max(12, headerRect.bottom + 12);
    const maximumTop = document.documentElement.clientHeight - tooltipRect.height - 12;
    return {
      tooltip: tooltipRect.toJSON(),
      source: sourceRect.toJSON(),
      link: linkRect.toJSON(),
      minimumTop,
      maximumTop,
      expectedTop: linkRect.top + (linkRect.height / 2) - (tooltipRect.height / 2),
      connectorTop,
      connectorCentreY: tooltipRect.top + connectorTop,
      tooltipCentreY: tooltipRect.top + (tooltipRect.height / 2),
      connectorTransform: connector.transform,
      connectorColor: connector.borderRightColor,
      tooltipColor: getComputedStyle(tooltip).backgroundColor,
      gap: tooltipRect.left - linkRect.right,
    };
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const beforeScroll = await readSideTooltipGeometry();
  expect(beforeScroll.expectedTop).toBeGreaterThanOrEqual(beforeScroll.minimumTop);
  expect(beforeScroll.expectedTop).toBeLessThanOrEqual(beforeScroll.maximumTop);
  expect(Math.abs(beforeScroll.tooltip.top - beforeScroll.expectedTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(beforeScroll.tooltipCentreY - (beforeScroll.link.top + (beforeScroll.link.height / 2)))).toBeLessThanOrEqual(1);
  expect(Math.abs(beforeScroll.connectorCentreY - beforeScroll.tooltipCentreY)).toBeLessThanOrEqual(1);
  expect(beforeScroll.connectorTransform).not.toBe('none');
  expect(beforeScroll.connectorColor).toBe(beforeScroll.tooltipColor);
  expect(Math.abs(beforeScroll.gap - 8)).toBeLessThanOrEqual(1);
  const scrollPosition = await page.evaluate(() => { window.scrollBy(0, 80); return window.scrollY; });
  expect(scrollPosition).toBeGreaterThan(0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const afterScroll = await readSideTooltipGeometry();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const settledAfterScroll = await readSideTooltipGeometry();
  expect(Math.abs(afterScroll.tooltip.top - beforeScroll.tooltip.top)).toBeGreaterThan(1);
  expect(Math.abs(afterScroll.tooltipCentreY - (afterScroll.link.top + (afterScroll.link.height / 2)))).toBeLessThanOrEqual(1);
  expect(Math.abs(afterScroll.connectorCentreY - afterScroll.tooltipCentreY)).toBeLessThanOrEqual(1);
  expect(afterScroll.connectorTop).toBeCloseTo(beforeScroll.connectorTop, 1);
  expect(Math.abs(afterScroll.gap - beforeScroll.gap)).toBeLessThanOrEqual(1);
  expect(Math.abs((afterScroll.tooltipCentreY - beforeScroll.tooltipCentreY) - (afterScroll.connectorCentreY - beforeScroll.connectorCentreY))).toBeLessThanOrEqual(1);
  expect(Math.abs((afterScroll.tooltipCentreY - beforeScroll.tooltipCentreY) - ((afterScroll.link.top + (afterScroll.link.height / 2)) - (beforeScroll.link.top + (beforeScroll.link.height / 2))))).toBeLessThanOrEqual(1);
  expect(Math.abs(settledAfterScroll.tooltip.top - afterScroll.tooltip.top)).toBeLessThanOrEqual(0.1);
  expect(Math.abs(settledAfterScroll.connectorCentreY - afterScroll.connectorCentreY)).toBeLessThanOrEqual(0.1);
  expect(forbiddenMutationRequests).toEqual([]);

  const next = page.getByRole('button', { name: 'Go to next page' });
  const previous = page.getByRole('button', { name: 'Go to previous page' });
  await expect(previous).toHaveText('<');
  await expect(next).toHaveText('>');
  await expect(previous).toHaveClass(/ui-pagination__button--direction/);
  await expect(next).toHaveClass(/ui-pagination__button--direction/);
  const paginationStyles = await page.evaluate(() => {
    const previousButton = document.querySelector<HTMLButtonElement>('[aria-label="Go to previous page"]');
    const nextButton = document.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]');
    const currentButton = document.querySelector<HTMLButtonElement>('[aria-label="Go to page 1"]');
    if (!previousButton || !nextButton || !currentButton) throw new Error('Pagination controls are missing.');
    const primaryProbe = document.createElement('span');
    primaryProbe.style.background = 'var(--action-primary-bg)';
    document.body.append(primaryProbe);
    const primaryBackground = getComputedStyle(primaryProbe).backgroundColor;
    primaryProbe.remove();
    const previousStyle = getComputedStyle(previousButton);
    const nextStyle = getComputedStyle(nextButton);
    const currentStyle = getComputedStyle(currentButton);
    return {
      previousBackground: previousStyle.backgroundColor,
      previousBorderWidth: previousStyle.borderTopWidth,
      nextBackground: nextStyle.backgroundColor,
      nextBorderWidth: nextStyle.borderTopWidth,
      currentBackground: currentStyle.backgroundColor,
      currentBorderWidth: currentStyle.borderTopWidth,
      primaryBackground,
    };
  });
  expect(paginationStyles.previousBackground).toBe('rgba(0, 0, 0, 0)');
  expect(paginationStyles.previousBorderWidth).toBe('0px');
  expect(paginationStyles.nextBackground).toBe('rgba(0, 0, 0, 0)');
  expect(paginationStyles.nextBorderWidth).toBe('0px');
  expect(paginationStyles.currentBorderWidth).not.toBe('0px');
  expect(paginationStyles.currentBackground).toBe(paginationStyles.primaryBackground);
  await expect(page.getByRole('button', { name: 'Go to page 1' })).toBeDisabled();
  await next.focus();
  expect(await next.evaluate((button) => button.matches(':focus-visible'))).toBe(true);
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page).toHaveURL(/page=2/);
  await expect(next).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Go to page 2' })).toBeDisabled();
  await expect(previous).toBeEnabled();
  const disabledNext = await next.evaluate((button) => {
    const style = getComputedStyle(button);
    return { background: style.backgroundColor, borderWidth: style.borderTopWidth };
  });
  expect(disabledNext).toEqual({ background: 'rgba(0, 0, 0, 0)', borderWidth: '0px' });
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/$/);
  await reactLink.press('Enter');
  await expect(page).toHaveURL(/\/courses\/7$/);
  expect(forbiddenMutationRequests).toEqual([]);
  assertClean();
});

test('keeps a fine-pointer hover-open Sort popup open through trigger click and activates an option', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    const requestedPage = Number(new URL(route.request().url()).searchParams.get('page') ?? '1');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()], {
        page: requestedPage,
        pages: 2,
        has_next: requestedPage === 1,
        has_previous: requestedPage === 2,
      }),
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?page=2');
  await expect(page.getByRole('link', { name: 'React' })).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Sort by: Oldest' });
  await trigger.hover();
  const listbox = page.getByRole('listbox', { name: 'Sort by options' });
  await expect(listbox).toBeVisible();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(listbox).toBeVisible();

  const requestCountBeforeSelection = requests.length;
  await listbox.getByRole('option', { name: 'Low to High' }).click();
  await expect(page).toHaveURL('/?sort=price');
  await expect.poll(() => requests.length).toBe(requestCountBeforeSelection + 1);
  const selectedRequest = new URL(requests[requests.length - 1]);
  expect(selectedRequest.searchParams.get('sort')).toBe('price');
  expect(selectedRequest.searchParams.get('page')).toBe('1');
  assertClean();
});

test('navigates every enabled control for an authoritative page beyond the advertised page count', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()], {
        page: 99,
        pages: 1,
        has_next: false,
        has_previous: true,
      }),
    });
  });

  await page.goto('/?page=99');
  await expect(page.getByRole('link', { name: 'React' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Page 99 of 1' })).toHaveCount(1);
  const previous = page.getByRole('button', { name: 'Go to previous page' });
  const pageOne = page.getByRole('button', { name: 'Go to page 1' });
  await expect(previous).toBeEnabled();
  await expect(pageOne).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Go to next page' })).toBeDisabled();

  const requestCountBeforePrevious = requests.length;
  await previous.click();
  await expect(page).toHaveURL('/?page=98');
  await expect.poll(() => requests.length).toBe(requestCountBeforePrevious + 1);
  expect(new URL(requests[requests.length - 1]).searchParams.get('page')).toBe('98');

  const requestCountBeforePageOne = requests.length;
  await pageOne.click();
  await expect(page).toHaveURL('/');
  await expect.poll(() => requests.length).toBe(requestCountBeforePageOne + 1);
  expect(new URL(requests[requests.length - 1]).searchParams.get('page')).toBe('1');
  assertClean();
});

test('hydrates, applies, traverses catalog history, and keeps real-browser diagnostics clean', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse()]) });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?search_query=React&min_price=5&sort=-id&page=2');
  await expect(page).toHaveURL(/search_query=React&min_price=5&sort=-created_at&page=2/);
  const catalogSearch = page.getByRole('search', { name: 'Course catalog search' });
  const headerSearch = catalogSearch.getByLabel('Search courses');
  await expect(headerSearch).toHaveValue('React');
  await expect(headerSearch).toHaveAttribute('placeholder', 'Search courses, topics, or instructors');
  await expect(catalogSearch.getByRole('button', { name: 'Search' })).toHaveCount(0);
  const headerSearchGeometry = await catalogSearch.evaluate((form) => {
    const input = form.querySelector<HTMLInputElement>('input[name="search_query"]');
    const label = form.querySelector<HTMLLabelElement>('label.ui-field__label');
    const icon = form.querySelector<SVGElement>('svg.app-catalog-search__icon');
    if (!input || !label || !icon) throw new Error('Label-free catalog search hooks are missing.');
    const resolveColor = (token: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const inputRect = input.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const iconStyle = getComputedStyle(icon);
    const inputStyle = getComputedStyle(input);
    return {
      labelHiddenContent: label.querySelector('.ui-sr-only')?.textContent,
      labelVisibleHeight: labelRect.height,
      iconAriaHidden: icon.getAttribute('aria-hidden'),
      iconFocusable: icon.getAttribute('focusable'),
      iconRole: icon.getAttribute('role'),
      iconPointerEvents: iconStyle.pointerEvents,
      iconColor: iconStyle.color,
      muted: resolveColor('--text-muted'),
      iconInsideInput: iconRect.left >= inputRect.left && iconRect.right <= inputRect.right && iconRect.top >= inputRect.top && iconRect.bottom <= inputRect.bottom,
      iconBeforeText: Number.parseFloat(inputStyle.paddingLeft) >= iconRect.width + 12,
      iconInputCentreDelta: Math.abs((iconRect.top + iconRect.height / 2) - (inputRect.top + inputRect.height / 2)),
      inputBorderRadius: inputStyle.borderTopLeftRadius,
    };
  });
  expect(headerSearchGeometry.labelHiddenContent).toBe('Search courses');
  expect(headerSearchGeometry.labelVisibleHeight).toBeLessThanOrEqual(1);
  expect(headerSearchGeometry.iconAriaHidden).toBe('true');
  expect(headerSearchGeometry.iconFocusable).toBe('false');
  expect(headerSearchGeometry.iconRole).toBe(null);
  expect(headerSearchGeometry.iconPointerEvents).toBe('none');
  expect(headerSearchGeometry.iconColor).toBe(headerSearchGeometry.muted);
  expect(headerSearchGeometry.iconInsideInput).toBe(true);
  expect(headerSearchGeometry.iconBeforeText).toBe(true);
  expect(headerSearchGeometry.iconInputCentreDelta).toBeLessThanOrEqual(1);
  expect(headerSearchGeometry.inputBorderRadius).toBe('9999px');
  const anonymousCatalogHeader = await page.locator('.app-header').evaluate((header) => {
    const inner = header.querySelector<HTMLElement>('.app-header__inner');
    const form = header.querySelector<HTMLElement>('.app-catalog-search');
    const start = header.querySelector<HTMLElement>('.app-header__catalog-start');
    const end = header.querySelector<HTMLElement>('.app-header__catalog-end');
    const browse = Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).find((link) => link.textContent?.trim() === 'Browse courses');
    const search = header.querySelector<HTMLInputElement>('input[name="search_query"]');
    const logIn = Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).find((link) => link.textContent?.trim() === 'Log in');
    const signUp = Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).find((link) => link.textContent?.trim() === 'Sign up');
    if (!inner || !form || !start || !end || !browse || !search || !logIn || !signUp) throw new Error('Anonymous catalog header controls are missing.');
    const sequence = Array.from(header.querySelectorAll('a, input')).map((element) => {
      if (element instanceof HTMLInputElement) return element.name;
      return element.getAttribute('aria-label') ?? element.textContent?.trim();
    });
    const searchRect = search.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const browseRect = browse.getBoundingClientRect();
    const logInRect = logIn.getBoundingClientRect();
    const signUpRect = signUp.getBoundingClientRect();
    return {
      sequence,
      hrefs: [browse.getAttribute('href'), logIn.getAttribute('href'), signUp.getAttribute('href')],
      current: [browse.getAttribute('aria-current'), logIn.getAttribute('aria-current'), signUp.getAttribute('aria-current')],
      directChildren: Array.from(inner.children).map((child) => child.className),
      clientWidth: document.documentElement.clientWidth,
      formCenterDelta: Math.abs((formRect.left + formRect.width / 2) - (innerRect.left + innerRect.width / 2)),
      inputCenterDelta: Math.abs((searchRect.left + searchRect.width / 2) - (innerRect.left + innerRect.width / 2)),
      browseSearchGap: formRect.left - browseRect.right,
      searchRight: searchRect.right,
      logInLeft: logInRect.left,
      signUpLeft: signUpRect.left,
      signUpRight: signUpRect.right,
    };
  });
  expect(anonymousCatalogHeader.sequence).toEqual(['LearnHub home', 'Browse courses', 'search_query', 'Log in', 'Sign up']);
  expect(anonymousCatalogHeader.hrefs).toEqual(['/', '/login', '/signup']);
  expect(anonymousCatalogHeader.current).toEqual(['page', null, null]);
  expect(anonymousCatalogHeader.directChildren).toEqual(['app-header__catalog-start', 'app-catalog-search', 'app-header__catalog-end']);
  expect(anonymousCatalogHeader.formCenterDelta).toBeLessThanOrEqual(1);
  expect(anonymousCatalogHeader.inputCenterDelta).toBeLessThanOrEqual(1);
  expect(anonymousCatalogHeader.browseSearchGap).toBeGreaterThan(0);
  expect(anonymousCatalogHeader.searchRight).toBeLessThan(anonymousCatalogHeader.logInLeft);
  expect(anonymousCatalogHeader.logInLeft).toBeLessThan(anonymousCatalogHeader.signUpLeft);
  expect(anonymousCatalogHeader.signUpRight).toBeLessThanOrEqual(anonymousCatalogHeader.clientWidth);
  await page.getByRole('link', { name: 'LearnHub home' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Browse courses' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(headerSearch).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Log in' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Sign up' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'React' })).toHaveAttribute('href', '/courses/7');
  await expect(page.locator('.catalog-card__meta').getByText('Ada Lovelace', { exact: true })).toBeVisible();
  await expect(page.getByText('1 lesson', { exact: true })).toBeVisible();
  expect(requests[0]).toContain('page_size=20');

  const filters = page.getByRole('form', { name: 'Course filters' });
  await expect(filters.getByRole('heading', { name: 'Filters' })).toHaveCount(0);
  await expect(filters.getByRole('group', { name: 'Price range:' })).toBeVisible();
  await expect(filters.getByLabel('Min price')).toHaveValue('5');
  await expect(filters.getByLabel('Max price')).toHaveValue('');
  await expect(filters.getByLabel('Min price')).toHaveAttribute('placeholder', 'Min price');
  await expect(filters.getByLabel('Max price')).toHaveAttribute('placeholder', 'Max price');
  await expect(filters.getByRole('button', { name: /apply/i })).toHaveCount(0);
  await expect(filters.locator('.catalog-filter-bar__action')).toHaveCount(0);
  expect(await filters.locator('input[name="search_query"], select').count()).toBe(0);
  const sortTrigger = page.locator('.catalog-page__sort-trigger');
  await expect(sortTrigger).toHaveAccessibleName('Sort by: Newest');
  const toolbarControls = page.locator('.catalog-page__toolbar-controls');
  await expect(toolbarControls).toHaveCount(1);
  expect(await toolbarControls.evaluate((controls) => Array.from(controls.children).map((child) => child.className))).toEqual([
    'catalog-filter-bar',
    'catalog-page__sort-toolbar',
  ]);
  await expect(page.locator('.catalog-page__filter-sidebar')).toHaveCount(0);
  const resultHeading = page.getByRole('heading', { level: 2, name: 'Found 1 course' });
  await expect(resultHeading).toHaveText('Found 1 course');
  await expect(resultHeading.locator('.catalog-page__results-prefix')).toHaveText('Found ');
  await expect(resultHeading.locator('strong.catalog-page__results-total')).toHaveText('1');
  await expect(resultHeading.locator('.catalog-page__results-suffix')).toHaveText(' course');
  await expect(resultHeading.locator('strong')).not.toContainText('course');
  const resultTypography = await resultHeading.evaluate((heading) => {
    const total = heading.querySelector<HTMLElement>('.catalog-page__results-total');
    const suffix = heading.querySelector<HTMLElement>('.catalog-page__results-suffix');
    const sortLabel = document.querySelector<HTMLElement>('.catalog-page__sort-label');
    if (!total || !suffix || !sortLabel) throw new Error('Result-toolbar typography targets are missing.');
    const resolveColor = (token: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    return {
      heading: getComputedStyle(heading), total: getComputedStyle(total), suffix: getComputedStyle(suffix), label: getComputedStyle(sortLabel),
      expected: { primary: resolveColor('--text-primary'), muted: resolveColor('--text-muted') },
    };
  });
  expect(resultTypography.heading.fontSize).toBe('18px');
  expect(resultTypography.heading.lineHeight).toBe('26px');
  expect(resultTypography.total.color).toBe(resultTypography.expected.primary);
  expect(resultTypography.total.fontWeight).toBe('700');
  expect(resultTypography.suffix.color).toBe(resultTypography.expected.muted);
  expect(resultTypography.suffix.fontWeight).toBe('400');
  const sortUrlBeforeHover = page.url();
  const requestCountBeforeHover = requests.length;
  const sortIdle = await page.locator('.catalog-page__sort-field').evaluate((field) => {
    const trigger = field.querySelector<HTMLElement>('.catalog-page__sort-trigger');
    const chevron = field.querySelector<HTMLElement>('.catalog-page__sort-chevron');
    if (!trigger || !chevron) throw new Error('Custom sort trigger or chevron is missing.');
    const resolveColor = (token: string) => {
      const probe = document.createElement('span'); probe.style.color = `var(${token})`; document.body.append(probe);
      const color = getComputedStyle(probe).color; probe.remove(); return color;
    };
    const resolveLength = (token: string) => {
      const probe = document.createElement('span'); probe.style.width = `var(${token})`; document.body.append(probe);
      const width = Number.parseFloat(getComputedStyle(probe).width); probe.remove(); return width;
    };
    const rect = chevron.getBoundingClientRect(); const triggerRect = trigger.getBoundingClientRect();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(chevron).transform);
    const angle = (Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + 360) % 360;
    return { color: getComputedStyle(chevron).color, angle, origin: getComputedStyle(chevron).transformOrigin, transition: getComputedStyle(chevron).transition, duration: getComputedStyle(chevron).transitionDuration, rightInset: triggerRect.right - rect.right, centreDelta: Math.abs((rect.top + rect.height / 2) - (triggerRect.top + triggerRect.height / 2)), rect, expected: { muted: resolveColor('--text-muted'), endInset: resolveLength('--spacing-3') } };
  });
  expect(sortIdle.color).toBe(sortIdle.expected.muted);
  expect(sortIdle.angle).toBeCloseTo(45, 1);
  expect(sortIdle.origin).toContain('4px 4px');
  expect(Math.abs(sortIdle.rightInset - sortIdle.expected.endInset)).toBeLessThanOrEqual(1);
  expect(sortIdle.centreDelta).toBeLessThanOrEqual(1);
  expect(sortIdle.transition).toContain('transform');
  expect(sortIdle.transition).toContain('color');
  expect(sortIdle.duration).not.toBe('0s');
  const focusedCourseLink = page.getByRole('link', { name: 'React' });
  const focusedCourseTooltip = focusedCourseLink.locator('.catalog-card__tooltip');
  await focusedCourseLink.focus();
  await expect(focusedCourseTooltip).toHaveCSS('opacity', '1');
  await sortTrigger.hover();
  const sortListbox = page.getByRole('listbox', { name: 'Sort by options' });
  await expect(sortListbox).toBeVisible();
  await expect(sortTrigger).toHaveAttribute('aria-expanded', 'true');
  await expect(sortListbox.getByRole('option')).toHaveCount(6);
  await expect(sortListbox.getByRole('option', { name: 'Newest' })).toHaveAttribute('aria-selected', 'true');
  await page.waitForTimeout(200);
  const sortGeometry = await Promise.all([sortTrigger.boundingBox(), sortListbox.boundingBox(), page.locator('.catalog-page__sort-field').evaluate((field) => {
    const trigger = field.querySelector<HTMLElement>('.catalog-page__sort-trigger'); const chevron = field.querySelector<HTMLElement>('.catalog-page__sort-chevron');
    if (!trigger || !chevron) throw new Error('Custom sort geometry targets are missing.');
    const resolveColor = (token: string) => { const probe = document.createElement('span'); probe.style.color = `var(${token})`; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; };
    const triggerRect = trigger.getBoundingClientRect(); const rect = chevron.getBoundingClientRect(); const style = getComputedStyle(chevron); const matrix = new DOMMatrixReadOnly(style.transform);
    return { color: style.color, angle: (Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + 360) % 360, rightInset: triggerRect.right - rect.right, centreDelta: Math.abs((rect.top + rect.height / 2) - (triggerRect.top + triggerRect.height / 2)), expectedPrimary: resolveColor('--action-primary-bg') };
  })]);
  expect(sortGeometry[0]).not.toBeNull();
  expect(sortGeometry[1]).not.toBeNull();
  expect(Math.abs(sortGeometry[0]!.width - 128)).toBeLessThanOrEqual(1);
  expect(Math.abs(sortGeometry[0]!.width - sortGeometry[1]!.width)).toBeLessThanOrEqual(1);
  expect(sortGeometry[1]!.x + sortGeometry[1]!.width).toBeLessThanOrEqual(sortGeometry[0]!.x + sortGeometry[0]!.width + 1);
  expect(sortGeometry[2].color).toBe(sortGeometry[2].expectedPrimary);
  expect(sortGeometry[2].angle).toBeCloseTo(225, 1);
  expect((sortGeometry[2].angle - sortIdle.angle + 360) % 360).toBeCloseTo(180, 1);
  expect(Math.abs(sortGeometry[2].rightInset - sortIdle.rightInset)).toBeLessThanOrEqual(1);
  expect(sortGeometry[2].centreDelta).toBeLessThanOrEqual(1);
  expect(page.url()).toBe(sortUrlBeforeHover);
  expect(requests).toHaveLength(requestCountBeforeHover);
  const lowToHighOption = sortListbox.getByRole('option', { name: 'Low to High' });
  await lowToHighOption.evaluate((option) => {
    const tooltip = document.querySelector<HTMLElement>('.catalog-card__tooltip--open');
    const rect = option.getBoundingClientRect();
    if (!tooltip) throw new Error('Focused course tooltip is required for Sort layering coverage.');
    tooltip.style.setProperty('transform', `translate3d(${rect.left}px, ${rect.top}px, 0)`, 'important');
  });
  await lowToHighOption.hover();
  const sortHit = await lowToHighOption.evaluate((option) => {
    const rect = option.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + (rect.width / 2), rect.top + (rect.height / 2));
    return { listboxHit: hit?.closest('[role="listbox"]') === option.closest('[role="listbox"]'), tooltipHit: Boolean(hit?.closest('.catalog-card__tooltip')) };
  });
  expect(sortHit).toEqual({ listboxHit: true, tooltipHit: false });
  await expect(sortTrigger).toHaveAttribute('aria-expanded', 'true');
  await lowToHighOption.evaluate(() => document.querySelector<HTMLElement>('.catalog-card__tooltip--open')?.style.removeProperty('transform'));
  await expect(lowToHighOption).toHaveClass(/catalog-page__sort-option--active/);
  const purple = 'rgb(109, 40, 217)';
  for (const target of [filters.getByLabel('Min price'), filters.getByLabel('Max price'), sortTrigger, focusedCourseLink]) {
    await target.focus();
    expect(await target.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    await expect(target).toHaveCSS('outline-color', purple);
    if (target !== focusedCourseLink) await expect(target).toHaveCSS('border-color', purple);
  }
  await sortTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(sortListbox).toBeFocused();
  await expect(sortListbox).toHaveCSS('outline-color', purple);
  await expect(sortListbox).toHaveCSS('border-color', purple);
  const optionGeometry = await sortListbox.evaluate((listbox) => {
    const selected = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')).find((option) => option.getAttribute('aria-selected') === 'true');
    const active = listbox.querySelector<HTMLElement>('.catalog-page__sort-option--active');
    const unselected = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')).find((option) => option.getAttribute('aria-selected') === 'false');
    if (!selected || !unselected || !active) throw new Error('Custom sort option states are missing.');
    const selectedRadio = selected.querySelector<HTMLElement>('.catalog-page__sort-radio'); const unselectedRadio = unselected.querySelector<HTMLElement>('.catalog-page__sort-radio');
    if (!selectedRadio || !unselectedRadio) throw new Error('Custom sort radio visuals are missing.');
    const resolveColor = (token: string) => { const probe = document.createElement('span'); probe.style.color = `var(${token})`; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; };
    const resolveBackground = (token: string) => { const probe = document.createElement('span'); probe.style.background = `var(${token})`; document.body.append(probe); const color = getComputedStyle(probe).backgroundColor; probe.remove(); return color; };
    const read = (option: HTMLElement, radio: HTMLElement) => ({ fontSize: getComputedStyle(option).fontSize, lineHeight: getComputedStyle(option).lineHeight, radio: { width: getComputedStyle(radio).width, height: getComputedStyle(radio).height, radius: getComputedStyle(radio).borderTopLeftRadius, border: getComputedStyle(radio).borderColor, background: getComputedStyle(radio).backgroundImage } });
    return { selected: read(selected, selectedRadio), unselected: read(unselected, unselectedRadio), activeBackground: getComputedStyle(active).backgroundColor, expected: { primary: resolveColor('--action-primary-bg'), neutral: resolveColor('--border-default'), canvas: resolveBackground('--color-canvas') } };
  });
  expect(optionGeometry.selected.fontSize).toBe('13px'); expect(optionGeometry.selected.lineHeight).toBe('18px');
  expect(optionGeometry.unselected.fontSize).toBe('13px'); expect(optionGeometry.unselected.lineHeight).toBe('18px');
  expect(optionGeometry.selected.radio.width).toBe('16px'); expect(optionGeometry.selected.radio.height).toBe('16px');
  expect(optionGeometry.unselected.radio.width).toBe('16px'); expect(optionGeometry.unselected.radio.height).toBe('16px');
  expect(Number.parseFloat(optionGeometry.selected.radio.radius)).toBeGreaterThanOrEqual(8); expect(Number.parseFloat(optionGeometry.unselected.radio.radius)).toBeGreaterThanOrEqual(8);
  expect(optionGeometry.unselected.radio.border).toBe(optionGeometry.expected.neutral); expect(optionGeometry.unselected.radio.background).toBe('none');
  expect(optionGeometry.selected.radio.border).toBe(optionGeometry.expected.primary); expect(optionGeometry.selected.radio.background).toContain(optionGeometry.expected.primary); expect(optionGeometry.selected.radio.background).toContain('3px');
  expect(optionGeometry.activeBackground).toBe(optionGeometry.expected.canvas);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(0, 0); await expect(sortListbox).toHaveCount(0); await sortTrigger.hover(); await page.waitForTimeout(20);
  const reducedMotionChevron = await page.locator('.catalog-page__sort-chevron').evaluate((chevron) => { const style = getComputedStyle(chevron); const matrix = new DOMMatrixReadOnly(style.transform); return { color: style.color, angle: (Math.atan2(matrix.b, matrix.a) * 180 / Math.PI + 360) % 360, duration: style.transitionDuration }; });
  expect(reducedMotionChevron.color).toBe(sortGeometry[2].expectedPrimary); expect(reducedMotionChevron.angle).toBeCloseTo(225, 1); expect(reducedMotionChevron.duration).toBe('0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.mouse.move(0, 0);
  await expect(sortListbox).toHaveCount(0);
  await expect(sortTrigger).toHaveAttribute('aria-expanded', 'false');
  await sortTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(sortListbox).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/search_query=React&min_price=5&sort=price/);
  expect(requests[requests.length - 1]).toContain('sort=price');
  expect(requests[requests.length - 1]).toContain('page=1');
  const sortLabel = page.locator('.catalog-page__sort-label');
  const priceLabel = filters.locator('.catalog-filter-bar__legend');
  const labelParity = await Promise.all([priceLabel.evaluate((label) => {
    const style = getComputedStyle(label);
    return { color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight };
  }), sortLabel.evaluate((label) => {
    const style = getComputedStyle(label);
    return { color: style.color, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight };
  })]);
  expect(labelParity[0]).toEqual(labelParity[1]);
  const toolbarGeometry = await Promise.all([resultHeading.boundingBox(), toolbarControls.boundingBox(), filters.boundingBox(), page.locator('.catalog-page__sort-toolbar').boundingBox(), sortLabel.boundingBox(), sortTrigger.boundingBox(), page.locator('.catalog-page__list').boundingBox()]);
  expect(toolbarGeometry.every(Boolean)).toBe(true);
  expect(toolbarGeometry[1]!.x + toolbarGeometry[1]!.width).toBeLessThanOrEqual(1280);
  expect(toolbarGeometry[2]!.x + toolbarGeometry[2]!.width).toBeLessThanOrEqual(toolbarGeometry[3]!.x);
  expect(Math.abs((toolbarGeometry[2]!.y + (toolbarGeometry[2]!.height / 2)) - (toolbarGeometry[3]!.y + (toolbarGeometry[3]!.height / 2)))).toBeLessThanOrEqual(1);
  expect(toolbarGeometry[4]!.x + toolbarGeometry[4]!.width).toBeLessThanOrEqual(toolbarGeometry[5]!.x);
  expect(Math.abs((toolbarGeometry[4]!.y + (toolbarGeometry[4]!.height / 2)) - (toolbarGeometry[5]!.y + (toolbarGeometry[5]!.height / 2)))).toBeLessThanOrEqual(1);
  const desktopPriceControls = await Promise.all([filters.getByLabel('Min price').boundingBox(), filters.getByLabel('Max price').boundingBox()]);
  expect(desktopPriceControls.every(Boolean)).toBe(true);
  expect(Math.abs(desktopPriceControls[0]!.width - toolbarGeometry[5]!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(desktopPriceControls[1]!.width - toolbarGeometry[5]!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(desktopPriceControls[0]!.height - 36)).toBeLessThanOrEqual(1);
  expect(Math.abs(desktopPriceControls[1]!.height - 36)).toBeLessThanOrEqual(1);
  expect(Math.abs(toolbarGeometry[5]!.height - 36)).toBeLessThanOrEqual(1);
  expect(toolbarGeometry[5]!.width).toBeLessThanOrEqual(128);
  expect(toolbarGeometry[5]!.y + toolbarGeometry[5]!.height).toBeLessThanOrEqual(toolbarGeometry[6]!.y);
  expect(Math.abs((toolbarGeometry[0]!.y + (toolbarGeometry[0]!.height / 2)) - (toolbarGeometry[1]!.y + (toolbarGeometry[1]!.height / 2)))).toBeLessThanOrEqual(1);
  const resultsColumnGeometry = await Promise.all([
    page.locator('.catalog-page__discovery-layout').boundingBox(),
    page.locator('.catalog-page__discovery-results').boundingBox(),
  ]);
  expect(resultsColumnGeometry.every(Boolean)).toBe(true);
  expect(Math.abs(resultsColumnGeometry[0]!.x - resultsColumnGeometry[1]!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(resultsColumnGeometry[0]!.width - resultsColumnGeometry[1]!.width)).toBeLessThanOrEqual(1);

  await sortTrigger.focus();
  await page.keyboard.press('Space');
  await sortListbox.getByRole('option', { name: 'A to Z' }).click();
  await expect(page).toHaveURL(/search_query=React&min_price=5&sort=title/);
  expect(requests[requests.length - 1]).toContain('sort=title');
  expect(requests[requests.length - 1]).toContain('page=1');
  await headerSearch.fill('TypeScript');
  await headerSearch.press('Enter');
  await expect(page).toHaveURL(/search_query=TypeScript&min_price=5&sort=title/);
  await expect(headerSearch).toBeFocused();
  await page.goBack();
  await expect(headerSearch).toHaveValue('React');
  await page.goForward();
  await expect(headerSearch).toHaveValue('TypeScript');
  await headerSearch.fill('JavaScript');
  await headerSearch.press('Enter');
  await expect(page).toHaveURL(/search_query=JavaScript&min_price=5&sort=title/);
  await headerSearch.press('Enter');
  await page.goBack();
  await expect(headerSearch).toHaveValue('TypeScript');
  await page.goForward();
  await expect(headerSearch).toHaveValue('JavaScript');
  const minimum = filters.getByLabel('Min price');
  const maximum = filters.getByLabel('Max price');
  const requestCountBeforeMinimumBlur = requests.length;
  await minimum.fill('10');
  await minimum.press('Tab');
  await expect(page).toHaveURL(/search_query=JavaScript&min_price=10&sort=title/);
  await expect(maximum).toBeFocused();
  await expect.poll(() => requests.length).toBe(requestCountBeforeMinimumBlur + 1);
  await page.waitForTimeout(20);
  expect(requests).toHaveLength(requestCountBeforeMinimumBlur + 1);

  const requestCountBeforeMaximumBlur = requests.length;
  await maximum.fill('20');
  await maximum.press('Tab');
  await expect(page).toHaveURL(/search_query=JavaScript&min_price=10&max_price=20&sort=title/);
  await expect(sortTrigger).toBeFocused();
  await expect.poll(() => requests.length).toBe(requestCountBeforeMaximumBlur + 1);
  await page.waitForTimeout(20);
  expect(requests).toHaveLength(requestCountBeforeMaximumBlur + 1);

  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const desktopNavigation = page.locator('.app-nav--desktop');
  await expect(desktopNavigation).toHaveCount(2);
  expect(await desktopNavigation.evaluateAll((navigation) => navigation.every((element) => getComputedStyle(element).display === 'none'))).toBe(true);
  const mobileMenu = page.getByRole('button', { name: 'Open navigation' });
  await mobileMenu.click();
  const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(mobileNavigation.getByRole('link', { name: 'Browse courses' })).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Log in' })).toBeVisible();
  await expect(mobileNavigation.getByRole('link', { name: 'Sign up' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(mobileNavigation).toHaveCount(0);
  await expect(mobileMenu).toBeFocused();
  await sortTrigger.focus();
  await expect(sortTrigger).toBeFocused();
  const mobileToolbarGeometry = await Promise.all([resultHeading.boundingBox(), toolbarControls.boundingBox(), filters.boundingBox(), page.locator('.catalog-page__sort-toolbar').boundingBox(), priceLabel.boundingBox(), sortLabel.boundingBox(), sortTrigger.boundingBox(), page.locator('.catalog-page__list').boundingBox()]);
  expect(mobileToolbarGeometry.every(Boolean)).toBe(true);
  expect(mobileToolbarGeometry[1]!.x).toBeGreaterThanOrEqual(0);
  expect(mobileToolbarGeometry[1]!.x + mobileToolbarGeometry[1]!.width).toBeLessThanOrEqual(320);
  expect(
    mobileToolbarGeometry[0]!.y < mobileToolbarGeometry[2]!.y
    || (
      Math.abs(mobileToolbarGeometry[0]!.y - mobileToolbarGeometry[2]!.y) <= 12
      && mobileToolbarGeometry[0]!.x + mobileToolbarGeometry[0]!.width <= mobileToolbarGeometry[2]!.x
    ),
  ).toBe(true);
  expect(
    mobileToolbarGeometry[2]!.y < mobileToolbarGeometry[3]!.y
    || (
      Math.abs(mobileToolbarGeometry[2]!.y - mobileToolbarGeometry[3]!.y) <= 12
      && mobileToolbarGeometry[2]!.x + mobileToolbarGeometry[2]!.width <= mobileToolbarGeometry[3]!.x
    ),
  ).toBe(true);

  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const responsiveHeaderSearch = await catalogSearch.evaluate((form) => {
      const input = form.querySelector<HTMLInputElement>('input[name="search_query"]');
      const formRect = form.getBoundingClientRect();
      if (!input) throw new Error('Catalog header search controls are missing.');
      const inputRect = input.getBoundingClientRect();
      return {
        contained: formRect.left >= 0 && formRect.right <= window.innerWidth && inputRect.left >= 0 && inputRect.right <= window.innerWidth,
      };
    });
    expect(responsiveHeaderSearch.contained).toBe(true);
    if (width === 768) {
      const tabletAnonymousHeader = await page.locator('.app-header').evaluate((header) => {
        const search = header.querySelector<HTMLInputElement>('input[name="search_query"]');
        const logIn = Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).find((link) => link.textContent?.trim() === 'Log in');
        const signUp = Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).find((link) => link.textContent?.trim() === 'Sign up');
        if (!search || !logIn || !signUp) throw new Error('Tablet anonymous catalog header controls are missing.');
        const searchRect = search.getBoundingClientRect();
        const logInRect = logIn.getBoundingClientRect();
        const signUpRect = signUp.getBoundingClientRect();
        return {
          searchRight: searchRect.right,
          logInLeft: logInRect.left,
          signUpLeft: signUpRect.left,
          signUpRight: signUpRect.right,
          clientWidth: document.documentElement.clientWidth,
          overflowFree: document.documentElement.scrollWidth <= document.documentElement.clientWidth
            && document.body.scrollWidth <= document.documentElement.clientWidth,
        };
      });
      expect(tabletAnonymousHeader.searchRight).toBeLessThan(tabletAnonymousHeader.logInLeft);
      expect(tabletAnonymousHeader.logInLeft).toBeLessThan(tabletAnonymousHeader.signUpLeft);
      expect(tabletAnonymousHeader.signUpRight).toBeLessThanOrEqual(tabletAnonymousHeader.clientWidth);
      expect(tabletAnonymousHeader.overflowFree).toBe(true);
    }
    const responsiveToolbarGeometry = await Promise.all([resultHeading.boundingBox(), filters.boundingBox(), page.locator('.catalog-page__sort-toolbar').boundingBox()]);
    expect(responsiveToolbarGeometry.every(Boolean)).toBe(true);
    const comesBefore = (first: NonNullable<(typeof responsiveToolbarGeometry)[number]>, second: NonNullable<(typeof responsiveToolbarGeometry)[number]>) => (
      first.y < second.y
      || (Math.abs(first.y - second.y) <= 1 && first.x + first.width <= second.x + 1)
    );
    expect(comesBefore(responsiveToolbarGeometry[1]!, responsiveToolbarGeometry[2]!)).toBe(true);
    const responsivePriceGeometry = await Promise.all([priceLabel.boundingBox(), filters.getByLabel('Min price').boundingBox(), filters.getByLabel('Max price').boundingBox(), sortTrigger.boundingBox()]);
    expect(responsivePriceGeometry.every(Boolean)).toBe(true);
    if (width === 768) {
      expect(Math.abs((responsivePriceGeometry[0]!.y + responsivePriceGeometry[0]!.height / 2) - (responsivePriceGeometry[1]!.y + responsivePriceGeometry[1]!.height / 2))).toBeLessThanOrEqual(1);
      expect(Math.abs(responsivePriceGeometry[1]!.width - responsivePriceGeometry[3]!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(responsivePriceGeometry[2]!.width - responsivePriceGeometry[3]!.width)).toBeLessThanOrEqual(1);
    } else {
      expect(responsiveToolbarGeometry[0]!.y).toBeLessThanOrEqual(responsivePriceGeometry[0]!.y);
      expect(responsivePriceGeometry[0]!.y).toBeLessThanOrEqual(responsivePriceGeometry[1]!.y);
      expect(Math.abs(responsivePriceGeometry[1]!.y - responsivePriceGeometry[2]!.y)).toBeLessThanOrEqual(1);
      expect(responsivePriceGeometry[1]!.x).toBeLessThan(responsivePriceGeometry[2]!.x);
      expect(responsivePriceGeometry[1]!.width).toBeCloseTo(128, 1);
      expect(responsivePriceGeometry[2]!.width).toBeCloseTo(128, 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.body.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
  await expect(page.getByRole('search', { name: 'Course catalog search' })).toHaveCount(0);
  expect(mobileToolbarGeometry[6]!.x + mobileToolbarGeometry[6]!.width).toBeLessThanOrEqual(320);
  expect(mobileToolbarGeometry[6]!.y + mobileToolbarGeometry[6]!.height).toBeLessThanOrEqual(mobileToolbarGeometry[7]!.y);
  assertClean();
});

test('remembers catalog searches in an accessible local combobox without changing the catalog URL contract', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('learnhub.catalog-search-history', JSON.stringify(['React Basics', 'TypeScript', 'react advanced', 'CSS']));
  });
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse()]) });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?min_price=5&sort=title&page=2');
  const catalogSearch = page.getByRole('search', { name: 'Course catalog search' });
  const input = catalogSearch.getByRole('combobox', { name: 'Search courses' });
  await expect(input).toHaveAttribute('autocomplete', 'off');
  await input.focus();
  const listbox = page.getByRole('listbox', { name: 'Recent searches' });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole('option')).toHaveCount(4);
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(input).toHaveAttribute('aria-controls', await listbox.getAttribute('id') ?? '');
  await input.press('ArrowDown');
  await expect(listbox.getByRole('option', { name: 'React Basics' })).toHaveAttribute('aria-selected', 'true');
  const activeDescendant = await input.getAttribute('aria-activedescendant');
  expect(activeDescendant).toBeTruthy();
  await input.press('Enter');
  await expect(page).toHaveURL(/search_query=React\+Basics&min_price=5&sort=title/);
  await expect(input).toHaveValue('React Basics');
  await expect(input).toBeFocused();
  expect(requests[requests.length - 1]).toContain('search_query=React+Basics');
  expect(requests[requests.length - 1]).toContain('min_price=5');
  expect(requests[requests.length - 1]).toContain('sort=title');
  expect(requests[requests.length - 1]).toContain('page=1');

  await input.fill('no matching history');
  await expect(listbox).toHaveCount(0);
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(input).not.toHaveAttribute('aria-controls');
  await input.fill('script');
  await expect(listbox.getByRole('option')).toHaveCount(1);
  await expect(listbox.getByRole('option', { name: 'TypeScript' })).toBeVisible();
  const escapeValue = await input.inputValue();
  const escapeUrl = page.url();
  const requestCountBeforeEscape = requests.length;
  await input.press('ArrowDown');
  await input.press('Escape');
  await expect(listbox).toHaveCount(0);
  await expect(input).not.toHaveAttribute('aria-controls');
  await expect(input).toHaveValue(escapeValue);
  expect(page.url()).toBe(escapeUrl);
  expect(requests).toHaveLength(requestCountBeforeEscape);
  const requestCountBeforePointer = requests.length;
  await input.fill('typ');
  const typeScriptOption = page.getByRole('option', { name: 'TypeScript' });
  await typeScriptOption.hover();
  await expect(typeScriptOption).toHaveAttribute('aria-selected', 'true');
  await typeScriptOption.click();
  await expect(page).toHaveURL(/search_query=TypeScript&min_price=5&sort=title/);
  expect(requests).toHaveLength(requestCountBeforePointer + 1);

  await input.press('ArrowDown');
  const openListbox = page.getByRole('listbox', { name: 'Recent searches' });
  const listGeometry = await openListbox.evaluate((list) => {
    const input = document.querySelector<HTMLInputElement>('.app-catalog-search input[name="search_query"]');
    if (!input) throw new Error('Catalog search input is missing.');
    const listRect = list.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const centre = document.elementFromPoint(listRect.left + listRect.width / 2, listRect.top + Math.min(12, listRect.height / 2));
    return {
      sameWidth: Math.abs(listRect.width - inputRect.width) <= 1,
      contained: listRect.left >= 0 && listRect.right <= document.documentElement.clientWidth,
      rounded: getComputedStyle(list).borderTopLeftRadius,
      topElementInsideList: Boolean(centre && list.contains(centre)),
    };
  });
  expect(listGeometry.sameWidth).toBe(true);
  expect(listGeometry.contained).toBe(true);
  expect(listGeometry.rounded).toBe('12px');
  expect(listGeometry.topElementInsideList).toBe(true);

  for (const width of [320, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await input.press('ArrowDown');
    const geometry = await page.getByRole('listbox', { name: 'Recent searches' }).evaluate((list) => {
      const rect = list.getBoundingClientRect();
      const form = document.querySelector<HTMLElement>('.app-catalog-search');
      const input = form?.querySelector<HTMLInputElement>('input[name="search_query"]');
      const inner = document.querySelector<HTMLElement>('.app-header__inner');
      if (!form || !input || !inner) throw new Error('Catalog header centering targets are missing.');
      const formRect = form.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      return {
        contained: rect.left >= 0 && rect.right <= document.documentElement.clientWidth,
        overflowFree: document.documentElement.scrollWidth <= document.documentElement.clientWidth
          && document.body.scrollWidth <= document.documentElement.clientWidth,
        listMatchesInput: Math.abs(rect.width - inputRect.width) <= 1 && Math.abs(rect.left - inputRect.left) <= 1,
        formCenterDelta: Math.abs((formRect.left + formRect.width / 2) - (innerRect.left + innerRect.width / 2)),
        inputCenterDelta: Math.abs((inputRect.left + inputRect.width / 2) - (innerRect.left + innerRect.width / 2)),
      };
    });
    expect(geometry.contained).toBe(true);
    expect(geometry.overflowFree).toBe(true);
    expect(geometry.listMatchesInput).toBe(true);
    if (width >= 768) {
      expect(geometry.formCenterDelta).toBeLessThanOrEqual(1);
      expect(geometry.inputCenterDelta).toBeLessThanOrEqual(1);
    }
  }

  await page.locator('.app-footer').click();
  await expect(page.getByRole('listbox', { name: 'Recent searches' })).toHaveCount(0);
  await page.reload();
  await input.focus();
  await expect(page.getByRole('option', { name: 'TypeScript' })).toBeVisible();
  assertClean();
});

test('canonicalizes an inverted range and honors server-false pagination availability', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse()], { pages: 3, has_next: false, has_previous: false }) });
  });

  await page.goto('/?search_query=React&min_price=30&max_price=10&page=1');
  await expect(page).toHaveURL('/?search_query=React');
  expect(requests).not.toContainEqual(expect.stringContaining('min_price='));
  expect(requests).not.toContainEqual(expect.stringContaining('max_price='));
  await expect(page.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: '1 course found. Page 1.' })).toHaveCount(1);
  const requestCountBeforeDisabledClick = requests.length;
  await page.getByRole('button', { name: 'Go to next page' }).evaluate((button) => (button as HTMLButtonElement).click());
  expect(requests).toHaveLength(requestCountBeforeDisabledClick);
  assertClean();
});

test('shows linked invalid-price validation on blur, then submits a corrected value without duplicate requests', async ({ page }) => {
  const assertClean = await monitor(page, { requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED' });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse()]) });
  });

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'React' })).toBeVisible();
  const requestCountBeforeInvalidSubmit = requests.length;
  const minimum = page.getByLabel('Min price');
  const maximum = page.getByLabel('Max price');
  await minimum.fill('-1');
  await maximum.focus();

  await expect(page.getByText('Enter a non-negative price.')).toBeVisible();
  await expect(minimum).toHaveAttribute('aria-invalid', 'true');
  await expect(minimum).toHaveAttribute('aria-describedby', /-error/);
  await expect(page).toHaveURL('/');
  expect(requests).toHaveLength(requestCountBeforeInvalidSubmit);

  await minimum.fill('5');
  await minimum.press('Enter');
  await expect(page).toHaveURL('/?min_price=5');
  await expect.poll(() => requests.length).toBe(requestCountBeforeInvalidSubmit + 1);
  await maximum.focus();
  await page.waitForTimeout(20);
  expect(requests).toHaveLength(requestCountBeforeInvalidSubmit + 1);
  const correctedRequest = requests[requests.length - 1];
  expect(correctedRequest).toContain('min_price=5');
  expect(correctedRequest).toContain('page_size=20');
  assertClean();
});

test('allows only the exact simulated offline request failure and retries successfully', async ({ page }) => {
  let offlineAttempts = 0;
  const assertClean = await monitor(page, {
    requestFailure: (request) => request.failure()?.errorText === 'net::ERR_ABORTED'
      || new URL(request.url()).searchParams.get('search_query') === 'offline',
    consoleError: (message) => message.text() === 'Failed to load resource: net::ERR_INTERNET_DISCONNECTED',
  });
  await page.route('**/courses**', async (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get('search_query') === 'offline' && offlineAttempts++ < 2) {
      await route.abort('internetdisconnected');
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: response([permittedCourse('Recovered')]) });
  });

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Recovered' })).toBeVisible();
  const catalogSearch = page.getByRole('search', { name: 'Course catalog search' });
  await catalogSearch.getByLabel('Search courses').fill('offline');
  await catalogSearch.getByLabel('Search courses').press('Enter');
  await expect(page.getByRole('alert')).toContainText('You appear to be offline');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('link', { name: 'Recovered' })).toBeVisible();
  expect(offlineAttempts).toBe(3);
  assertClean();
});
