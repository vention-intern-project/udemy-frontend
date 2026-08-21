import { expect, test, type Page } from '@playwright/test';
import {
  createHttpFailureAccounting,
  createRequestFailureAccounting,
  findUnexpectedConsoleErrors,
  type ConsoleErrorEvidence,
  type RequestFailureIdentity,
} from './support/visual-quality';

interface CatalogPaginationFixture {
  page?: number;
  pages?: number;
  total?: number;
  has_next?: boolean;
  has_previous?: boolean;
}

interface CatalogLocaleExpectation {
  readonly locale: 'ru' | 'uz';
  readonly heroTitle: string;
  readonly resultCount: string;
  readonly sortBy: string;
  readonly sortCompact: string;
  readonly free: string;
  readonly details: string;
  readonly detailsAccessibleName: string;
  readonly lessons: string;
  readonly enrollForFree: string;
  readonly addToCart: string;
}

interface CatalogViewportGeometry {
  readonly width: number;
  readonly documentWidth: number;
  readonly bodyWidth: number;
  readonly clientWidth: number;
}

function response(items: readonly unknown[] = [], pagination: CatalogPaginationFixture = {}) {
  return JSON.stringify({
    items,
    page: 1,
    page_size: 20,
    total: items.length,
    pages: items.length === 0 ? 0 : 1,
    has_next: false,
    has_previous: false,
    ...pagination,
  });
}

function permittedCourse(title = 'React') {
  return {
    id: 7,
    title,
    description: null,
    price: '9.99',
    currency: 'USD',
    published_at: '2026-01-01T00:00:00Z',
    instructor: { id: 1, name: 'Ada', surname: 'Lovelace' },
    lessons: [{ id: 1, title: 'Intro' }],
  };
}

function expectedCatalogHeroHeight(viewportWidth: number): number {
  if (viewportWidth <= 767) return 208;
  if (viewportWidth >= 1100) return 288;
  return Math.max(208, Math.min(viewportWidth * 0.22, 320));
}

interface CatalogBrowserMonitor {
  (): void;
  allowHttpFailure(
    identity: { method: string; path: string; status: number },
    occurrences?: number,
  ): void;
  allowRequestFailure(identity: RequestFailureIdentity, occurrences?: number): void;
}

interface ScreenshotPixelProbe {
  expected: number[];
  samples: number[][];
  junctionSamples: number[][];
}

async function monitor(page: Page): Promise<CatalogBrowserMonitor> {
  const pageErrors: string[] = [];
  const consoleErrors: ConsoleErrorEvidence[] = [];
  const responses = createHttpFailureAccounting();
  const requests = createRequestFailureAccounting();
  page.on('console', (message) => {
    if (message.type() === 'error')
      consoleErrors.push({ text: message.text(), url: message.location().url });
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    responses.observe(response.request().method(), response.url(), response.status());
  });
  page.on('requestfailed', (request) => {
    requests.observe(request.method(), request.url(), request.failure()?.errorText ?? 'unknown');
  });
  const assertClean = (() => {
    expect(pageErrors, 'unexpected browser page errors').toEqual([]);
    expect(
      findUnexpectedConsoleErrors(
        consoleErrors,
        responses.acceptedFailures(),
        requests.acceptedFailures(),
      ),
      'unexpected browser console errors',
    ).toEqual([]);
    expect(responses.violations().errorResponses, 'unexpected HTTP error responses').toEqual([]);
    expect(
      responses.violations().unconsumedExpectedResponses,
      'expected HTTP errors not observed',
    ).toEqual([]);
    expect(requests.violations().requestFailures, 'unexpected browser request failures').toEqual(
      [],
    );
    expect(
      requests.violations().unconsumedExpectedRequestFailures,
      'expected browser request failures not observed',
    ).toEqual([]);
  }) as CatalogBrowserMonitor;
  assertClean.allowHttpFailure = (identity, occurrences = 1) =>
    responses.allow(identity, occurrences);
  assertClean.allowRequestFailure = (identity, occurrences = 1) =>
    requests.allow(identity, occurrences);
  return assertClean;
}

test('renders a semantic full-width catalog hero at scrollable physical client edges', async ({
  page,
}, testInfo) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()]),
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(() => {
    document.body.style.minHeight = '2000px';
  });
  const heading = page.getByRole('heading', {
    level: 1,
    name: 'Master the Skills Shaping the Future',
  });
  await expect(heading).toBeVisible();
  await expect(
    page.getByText(
      'Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.',
    ),
  ).toBeVisible();
  await expect(page.locator('[data-part="catalog-hero"] img')).toHaveCount(0);
  const settledRequestCount = requests.length;

  const desktopGeometry = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('[data-part="catalog-hero"]');
    const header = document.querySelector<HTMLElement>('[data-app-shell-header]');
    const title = document.querySelector<HTMLElement>('#catalog-page-title');
    const content = document.querySelector<HTMLElement>('[data-part="catalog-content"]');
    if (!hero || !header || !title || !content)
      throw new Error('Catalog hero geometry targets are missing.');
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
  expect(desktopGeometry.hero.height).toBeCloseTo(expectedCatalogHeroHeight(1440), 0);
  expect(Math.abs(desktopGeometry.hero.x)).toBeLessThanOrEqual(1);
  expect(desktopGeometry.viewportWidth).toBeGreaterThanOrEqual(desktopGeometry.clientWidth);
  expect(Math.abs(desktopGeometry.hero.right - desktopGeometry.clientWidth)).toBeLessThanOrEqual(1);
  expect(desktopGeometry.documentWidth).toBeLessThanOrEqual(desktopGeometry.clientWidth);
  expect(desktopGeometry.bodyWidth).toBeLessThanOrEqual(desktopGeometry.clientWidth);
  expect(desktopGeometry.documentHeight).toBeGreaterThan(desktopGeometry.clientHeight);
  expect(desktopGeometry.titleLeft).toBeGreaterThanOrEqual(0);
  await testInfo.attach('catalog-hero-1440', {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png',
  });

  let previousLeftExtension = 0;
  for (const width of [
    320, 390, 640, 767, 768, 894, 895, 896, 897, 1280, 1440, 1600, 1960, 1961, 2200, 2560, 3840,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(heading).toBeVisible();
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>('[data-part="catalog-hero"]');
      const title = document.querySelector<HTMLElement>('#catalog-page-title');
      const content = document.querySelector<HTMLElement>('[data-part="catalog-content"]');
      if (!hero || !title || !content)
        throw new Error('Catalog hero geometry targets are missing.');
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
        titleFontSize: getComputedStyle(title).fontSize,
        titleLineHeight: getComputedStyle(title).lineHeight,
        heroBackgroundPosition: getComputedStyle(hero).backgroundPosition,
        heroBackgroundRepeat: getComputedStyle(hero).backgroundRepeat,
        heroBackgroundSize: getComputedStyle(hero).backgroundSize,
        heroArtworkDisplay: getComputedStyle(hero, '::before').display,
        heroArtworkImage: getComputedStyle(hero, '::before').backgroundImage,
        heroArtworkSize: getComputedStyle(hero, '::before').backgroundSize,
        heroArtworkOpacity: getComputedStyle(hero, '::before').opacity,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        bodyWidth: document.body.scrollWidth,
      };
    });
    // DD-024 defines a minimum block size. At narrow widths the wrapped title and
    // description can legitimately make the hero taller than that floor.
    expect(geometry.hero.height).toBeGreaterThanOrEqual(
      expectedCatalogHeroHeight(geometry.viewportWidth) - 1,
    );
    expect(Math.abs(geometry.hero.x)).toBeLessThanOrEqual(1);
    expect(geometry.viewportWidth).toBeGreaterThanOrEqual(geometry.clientWidth);
    expect(Math.abs(geometry.hero.right - geometry.clientWidth)).toBeLessThanOrEqual(1);
    expect(geometry.titleLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.titleScrollWidth).toBeLessThanOrEqual(geometry.titleClientWidth);
    expect(geometry.titleHeight).toBeGreaterThan(0);
    if (geometry.clientWidth <= 767) {
      expect(geometry.titleFontSize).toBe('28px');
      expect(geometry.titleLineHeight).toBe('36px');
    }
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.documentHeight).toBeGreaterThan(geometry.clientHeight);
    if (geometry.clientWidth > 1960) {
      const backgroundLayers = geometry.heroBackgroundSize.split(',').map((layer) => layer.trim());
      expect(backgroundLayers).toHaveLength(2);
      expect(backgroundLayers[0]).toBe('100% 100%');
      expect(backgroundLayers[1]).toBe('1960px');
      expect(geometry.heroBackgroundPosition).toContain('100% 50%');
      expect(geometry.heroBackgroundRepeat).toBe('no-repeat, no-repeat');

      const leftExtension = geometry.clientWidth - 1960;
      expect(leftExtension).toBeGreaterThan(previousLeftExtension);
      previousLeftExtension = leftExtension;

      const heroScreenshot = await page.locator('[data-part="catalog-hero"]').screenshot({
        animations: 'disabled',
      });
      const extensionPixels = await page.evaluate<
        ScreenshotPixelProbe,
        { imageBase64: string; extensionX: number; junctionX: number }
      >(
        async ({ imageBase64, extensionX, junctionX }) => {
          const image = new Image();
          image.src = `data:image/png;base64,${imageBase64}`;
          await image.decode();
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Catalog hero screenshot pixel probe is unavailable.');
          context.drawImage(image, 0, 0);

          const hero = document.querySelector<HTMLElement>('[data-part="catalog-hero"]');
          if (!hero) throw new Error('Catalog hero pixel target is missing.');
          const expectedCanvas = document.createElement('canvas');
          expectedCanvas.width = 1;
          expectedCanvas.height = 1;
          const expectedContext = expectedCanvas.getContext('2d');
          if (!expectedContext)
            throw new Error('Catalog hero expected pixel probe is unavailable.');
          expectedContext.fillStyle = getComputedStyle(hero).backgroundColor;
          expectedContext.fillRect(0, 0, 1, 1);

          const screenshotX = (x: number) =>
            Math.min(
              image.naturalWidth - 1,
              Math.max(0, Math.floor((x / window.innerWidth) * image.naturalWidth)),
            );
          const sampleRows = [0.2, 0.5, 0.8].map((ratio) =>
            Math.min(image.naturalHeight - 1, Math.floor(image.naturalHeight * ratio)),
          );
          const junctionRows = [0.05, 0.95].map((ratio) =>
            Math.min(image.naturalHeight - 1, Math.floor(image.naturalHeight * ratio)),
          );
          return {
            expected: Array.from(expectedContext.getImageData(0, 0, 1, 1).data),
            samples: sampleRows.map((y) =>
              Array.from(context.getImageData(screenshotX(extensionX), y, 1, 1).data),
            ),
            junctionSamples: junctionRows.flatMap((y) => [
              Array.from(context.getImageData(screenshotX(junctionX - 1), y, 1, 1).data),
              Array.from(context.getImageData(screenshotX(junctionX), y, 1, 1).data),
            ]),
          };
        },
        {
          imageBase64: heroScreenshot.toString('base64'),
          extensionX: 0,
          junctionX: leftExtension,
        },
      );
      expect(
        extensionPixels.samples.every((sample) =>
          sample.every(
            (channel, index) => Math.abs(channel - (extensionPixels.expected[index] ?? 0)) <= 1,
          ),
        ),
      ).toBe(true);
      // The intended dark overlay can blend the image edge into the neutral base,
      // but adjacent pixels at the 1960px junction must not form a visible hard seam.
      const maxJunctionChannelDelta = 32;
      for (let index = 0; index < extensionPixels.junctionSamples.length; index += 2) {
        const leftPixel = extensionPixels.junctionSamples[index];
        const rightPixel = extensionPixels.junctionSamples[index + 1];
        expect(leftPixel).toBeDefined();
        expect(rightPixel).toBeDefined();
        expect(
          leftPixel?.every(
            (channel, channelIndex) =>
              Math.abs(channel - (rightPixel?.[channelIndex] ?? 0)) <= maxJunctionChannelDelta,
          ),
        ).toBe(true);
      }
    } else if (geometry.clientWidth <= 895) {
      expect(geometry.heroArtworkDisplay).toBe('block');
      expect(geometry.heroArtworkImage).toContain('catalog-hero-mobile-stars-lines-uifd001.png');
      expect(geometry.heroArtworkOpacity).toBe('0.5');
      expect(geometry.heroBackgroundSize).toBe('auto');
    } else {
      expect(geometry.heroArtworkDisplay).toBe('block');
      expect(geometry.heroArtworkImage).toContain('catalog-hero-ui025.png');
      expect(geometry.heroArtworkSize).not.toBe('auto');
    }
    await testInfo.attach(`catalog-hero-scrollable-client-edge-${width}`, {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });
  }

  expect(requests).toHaveLength(settledRequestCount);
  assertClean();
});

test('renders aligned accessible catalog cards and opt-in arrow pagination without embedded media', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses/7',
    errorText: 'net::ERR_ABORTED',
  });
  const forbiddenMutationRequests: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (
      path === '/cart' ||
      path.startsWith('/cart/') ||
      path === '/enrollments' ||
      path.startsWith('/enrollments/') ||
      /^\/courses\/[^/]+\/enrollments$/.test(path)
    ) {
      forbiddenMutationRequests.push(`${request.method()} ${path}`);
    }
  });
  const longTitle =
    'A deliberately long course title that overflows the available card heading width and must remain accessible in full while demonstrating that compact CourseCards retain a stable two-line title region across intermediate and near-breakpoint viewport widths without collisions or focus loss';
  const courses = [
    {
      ...permittedCourse('React'),
      id: 7,
      description: 'A concise course description.',
      price: '94.99',
      currency: 'USD',
      published_at: null,
      lessons: [
        { id: 1, title: 'Intro' },
        { id: 2, title: 'Hooks' },
        { id: 3, title: 'State' },
        { id: 4, title: 'Testing' },
      ],
    },
    {
      ...permittedCourse('TypeScript'),
      id: 8,
      description: null,
      price: '0.00',
      currency: 'UZS',
      published_at: '2026-01-01T00:00:00Z',
    },
    {
      ...permittedCourse(longTitle),
      id: 9,
      description:
        'A deliberately longer course description that must wrap naturally without clipping while every card remains aligned with its neighboring cards.',
      price: 'not-a-decimal',
      currency: 'US',
      published_at: null,
    },
    {
      ...permittedCourse('Draft free'),
      id: 10,
      description: 'A Draft course with a zero price.',
      price: '0',
      currency: 'USD',
      published_at: null,
    },
    {
      ...permittedCourse('Published paid'),
      id: 11,
      description: 'A published paid course.',
      price: '29.99',
      currency: 'USD',
      published_at: '2026-01-01T00:00:00Z',
    },
  ];
  await page.route('**/courses**', async (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get('page') ?? '1');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response(courses, {
        page: requestedPage,
        pages: 2,
        total: 25,
        has_next: requestedPage === 1,
        has_previous: requestedPage === 2,
      }),
    });
  });

  await page.goto('/');
  const reactLink = page.getByRole('link', { name: /React/ });
  await expect(reactLink).toBeVisible();
  await expect(page.locator('[data-part="course-card"]')).toHaveCount(5);
  await expect(
    page.locator(
      '[data-part="course-card"] video, [data-part="course-card"] audio, [data-part="course-card"] img, [data-part="course-card"] iframe',
    ),
  ).toHaveCount(0);
  await expect(page.getByText('$94.99')).toBeVisible();
  await expect(page.getByText('FREE', { exact: true })).toHaveCount(2);
  await expect(
    page
      .locator('[data-part="course-card"]')
      .filter({ has: page.getByRole('heading', { level: 3, name: 'TypeScript' }) })
      .locator('[data-part="course-card-price"] data'),
  ).toHaveAttribute('value', '0.00');
  await expect(
    page
      .locator('[data-part="course-card"]')
      .filter({ has: page.getByRole('heading', { level: 3, name: 'Draft free' }) })
      .locator('[data-part="course-card-price"] data'),
  ).toHaveAttribute('value', '0');
  await expect(page.getByText('Price unavailable')).toBeVisible();
  await expect(page.locator('[data-part="course-card-body"] p')).toHaveCount(0);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View course details' })).toHaveCount(5);

  for (const width of [320, 390, 617, 767, 768, 1100, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const gridColumnCount = await page
      .locator('[data-part="catalog-result-list"]')
      .evaluate(
        (list) => getComputedStyle(list).gridTemplateColumns.split(' ').filter(Boolean).length,
      );
    expect(gridColumnCount).toBe(width >= 1280 ? 4 : width >= 1100 ? 3 : width >= 768 ? 2 : 1);
    const geometry = await page.locator('[data-part="course-card"]').evaluateAll((cards) =>
      cards.map((card) => {
        const rect = card.getBoundingClientRect();
        const preview = card.querySelector<HTMLElement>('[data-part="course-card-preview"]');
        const body = card.querySelector<HTMLElement>('[data-part="course-card-body"]');
        const price = card.querySelector<HTMLElement>('[data-part="course-card-price"]');
        const footer = card.querySelector<HTMLElement>('[data-part="course-card-footer"]');
        const discoveryLayout = card.closest<HTMLElement>('[data-part="catalog-discovery-layout"]');
        const link = card.querySelector<HTMLElement>('a[href^="/courses/"]');
        const title = card.querySelector<HTMLElement>('h3');
        const meta = card.querySelector<HTMLElement>('[data-part="course-card-metadata"]');
        const separator = card.querySelector<HTMLElement>(
          '[data-part="course-card-metadata-separator"]',
        );
        const action = card.querySelector<HTMLElement>(
          '[data-part="course-card-actions"] > :first-child',
        );
        if (
          !preview ||
          !body ||
          !price ||
          !footer ||
          !discoveryLayout ||
          !link ||
          !title ||
          !meta ||
          !separator ||
          !action
        )
          throw new Error('Catalog card geometry targets are missing.');
        const bodyStyle = getComputedStyle(body);
        const titleStyle = getComputedStyle(title);
        const metaStyle = getComputedStyle(meta);
        const priceStyle = getComputedStyle(price);
        const footerStyle = getComputedStyle(footer);
        const actionControl = action.matches('a, button')
          ? action
          : action.querySelector<HTMLElement>('button');
        if (!actionControl) throw new Error('Catalog action control is missing.');
        const actionStyle = getComputedStyle(actionControl);
        const priceRect = price.getBoundingClientRect();
        const actionRect = action.getBoundingClientRect();
        const metaRect = meta.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        const separatorRect = separator.getBoundingClientRect();
        const separatorStyle = getComputedStyle(separator);
        return {
          height: rect.height,
          discoveryLayoutInlineSize: discoveryLayout.getBoundingClientRect().width,
          previewWidth: preview.getBoundingClientRect().width,
          previewHeight: preview.getBoundingClientRect().height,
          previewRight: preview.getBoundingClientRect().right,
          bodyContentLeft: titleRect.left,
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
          lessonWhiteSpace: getComputedStyle(meta.lastElementChild as HTMLElement).whiteSpace,
          separatorFontSize: separatorStyle.fontSize,
          separatorHeight: separatorRect.height,
          separatorMarginInlineStart: separatorStyle.marginInlineStart,
          separatorMarginInlineEnd: separatorStyle.marginInlineEnd,
          separatorCentreDelta: Math.abs(
            separatorRect.top + separatorRect.height / 2 - (metaRect.top + metaRect.height / 2),
          ),
          actionHeight: actionRect.height,
          actionMinHeight: actionStyle.minHeight,
          actionTagName: actionControl.tagName,
          actionDisabled: actionControl instanceof HTMLButtonElement && actionControl.disabled,
          actionPaddingInlineStart: actionStyle.paddingInlineStart,
          actionPaddingInlineEnd: actionStyle.paddingInlineEnd,
          actionFontSize: actionStyle.fontSize,
          actionFontWeight: actionStyle.fontWeight,
          actionBottom: actionRect.bottom,
          actionLeft: actionRect.left,
          priceRight: priceRect.right,
          priceTextRight: price.querySelector<HTMLElement>('data')!.getBoundingClientRect().right,
          priceActionGap:
            actionRect.left -
            price.querySelector<HTMLElement>('data')!.getBoundingClientRect().right,
          footerPaddingInlineEnd: footerStyle.paddingInlineEnd,
          footerPaddingBlockEnd: footerStyle.paddingBlockEnd,
          footerBottom: footer.getBoundingClientRect().bottom,
          cardBottom: rect.bottom,
          footerContainsPrice: footer.contains(price),
          footerContainsAction: footer.contains(action),
        };
      }),
    );
    expect(new Set(geometry.map((card) => Math.round(card.height))).size).toBe(1);
    expect(
      geometry.every((card) => Math.abs(card.previewWidth / card.previewHeight - 16 / 9) <= 0.02),
    ).toBe(true);
    if (width < 768) {
      const discoveryLayoutInlineSize = geometry[0]?.discoveryLayoutInlineSize;
      if (discoveryLayoutInlineSize === undefined)
        throw new Error('Catalog discovery container geometry is missing.');
      const usesWideCompactSlot = discoveryLayoutInlineSize >= 544;
      if (width === 320 || width === 390) expect(usesWideCompactSlot).toBe(false);
      if (width === 767) expect(usesWideCompactSlot).toBe(true);
      const expectedPreviewWidth = usesWideCompactSlot ? 160 : 128;
      const expectedPreviewHeight = usesWideCompactSlot ? 90 : 72;
      expect(
        geometry.every(
          (card) =>
            Math.abs(card.discoveryLayoutInlineSize - discoveryLayoutInlineSize) <= 0.5 &&
            Math.abs(card.previewWidth - expectedPreviewWidth) <= 0.5 &&
            Math.abs(card.previewHeight - expectedPreviewHeight) <= 0.5,
        ),
      ).toBe(true);
    }
    expect(
      geometry.every((card) => card.titleFontSize === '16px' && card.titleLineHeight === '24px'),
    ).toBe(true);
    expect(
      geometry.every(
        (card) => Math.abs(card.titleHeight - 48) <= 0.5 && card.titleMinHeight === '48px',
      ),
    ).toBe(true);
    expect(
      geometry.every(
        (card) => card.metadataFontSize === '13px' && card.metadataLineHeight === '18px',
      ),
    ).toBe(true);
    if (width < 768) {
      expect(geometry.every((card) => card.priceActionGap >= 31)).toBe(true);
    }
    expect(
      geometry.every((card) => card.priceFontSize === '16px' && card.priceLineHeight === '24px'),
    ).toBe(true);
    expect(
      geometry.every((card) => card.bodyPadding === (width < 768 ? '12px 12px 12px 0px' : '12px')),
    ).toBe(true);
    expect(
      geometry.every(
        (card) =>
          card.bodyGap === (width < 768 ? '12px' : '8px') &&
          card.metadataDisplay === 'flex' &&
          (width < 768
            ? card.metadataWhiteSpace === 'normal' && card.lessonWhiteSpace === 'normal'
            : card.metadataWhiteSpace === 'nowrap' && card.lessonWhiteSpace === 'nowrap') &&
          card.metadataScrollHeight >= card.metadataClientHeight,
      ),
    ).toBe(true);
    expect(
      geometry.every(
        (card) => width >= 768 || Math.abs(card.bodyContentLeft - card.previewRight - 12) <= 1,
      ),
    ).toBe(true);
    expect(
      geometry.every(
        (card) =>
          card.separatorFontSize === '26px' &&
          Math.abs(card.separatorHeight - 18) <= 0.5 &&
          card.separatorMarginInlineStart === '12px' &&
          card.separatorMarginInlineEnd === '12px' &&
          (width < 768 || card.separatorCentreDelta <= 0.5),
      ),
    ).toBe(true);
    const firstRow = geometry.slice(
      0,
      width >= 1280 ? 4 : width >= 1100 ? 3 : width >= 768 ? 2 : 1,
    );
    expect(
      Math.max(...firstRow.map((card) => card.metadataTop)) -
        Math.min(...firstRow.map((card) => card.metadataTop)),
    ).toBeLessThanOrEqual(1);
    expect(
      geometry.every(
        (card) =>
          card.actionFontWeight === '600' &&
          ((card.actionTagName === 'A' &&
            !card.actionDisabled &&
            card.actionMinHeight === '44px' &&
            card.actionHeight >= 44 &&
            card.actionPaddingInlineStart === (width < 768 ? '8px' : '12px') &&
            card.actionPaddingInlineEnd === (width < 768 ? '8px' : '12px') &&
            card.actionFontSize === '14px') ||
            (card.actionTagName === 'BUTTON' &&
              card.actionDisabled &&
              card.actionMinHeight === '44px' &&
              card.actionHeight >= 44 &&
              card.actionPaddingInlineStart === (width < 768 ? '8px' : '12px') &&
              card.actionPaddingInlineEnd === (width < 768 ? '8px' : '12px') &&
              card.actionFontSize === '14px')),
      ),
    ).toBe(true);
    expect(
      geometry.every(
        (card) =>
          Math.abs(card.footerBottom - card.cardBottom) <= 1 &&
          card.footerPaddingInlineEnd === '12px' &&
          card.footerPaddingBlockEnd === (width < 768 ? '8px' : '12px') &&
          card.footerContainsPrice &&
          card.footerContainsAction,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    if (width === 617 || width === 767) {
      const compactLongTitle = page.getByRole('link', { name: longTitle });
      await expect(compactLongTitle).toBeVisible();
      const compactLongTitleGeometry = await compactLongTitle
        .getByRole('heading', { level: 3 })
        .evaluate((title) => {
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
      expect(compactLongTitleGeometry.display).toBe('flow-root');
      expect(compactLongTitleGeometry.lineClamp).toBe('2');
      expect(compactLongTitleGeometry.boxOrient).toBe('vertical');
      expect(compactLongTitleGeometry.overflowY).toBe('hidden');
      expect(compactLongTitleGeometry.height).toBeLessThanOrEqual(
        compactLongTitleGeometry.lineHeight * 2 + 1,
      );
      expect(compactLongTitleGeometry.scrollHeight).toBeGreaterThan(
        compactLongTitleGeometry.clientHeight,
      );
      await reactLink.focus();
      await expect(reactLink).toBeFocused();
      expect(await reactLink.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
      await page.keyboard.press('Tab');
      const typeScriptLink = page.getByRole('link', { name: 'TypeScript' });
      await expect(typeScriptLink).toBeFocused();
      expect(await typeScriptLink.evaluate((element) => element.matches(':focus-visible'))).toBe(
        true,
      );
    }
  }

  const longTitleLink = page.getByRole('link', { name: longTitle });
  await expect(longTitleLink).toBeVisible();
  const longTitleGeometry = await longTitleLink
    .getByRole('heading', { level: 3 })
    .evaluate((title) => {
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

  const reactCard = page
    .locator('[data-part="course-card"]')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'React' }) });
  await expect(reactCard.locator('[data-part="course-card-metadata"]')).toHaveText(
    'Ada Lovelace · 4 lessons available',
  );
  await expect(reactCard.locator('[data-part="course-card-metadata"] p')).toHaveCount(0);
  await expect(reactCard.locator('[data-part="course-card-metadata"]')).not.toContainText('by ');
  await expect(reactCard.locator('[data-part="course-card-metadata-separator"]')).toHaveCount(1);
  await expect(reactCard.locator('[data-part="course-card-metadata-separator"]')).toHaveText(' · ');
  await expect(reactCard.locator('[data-part="course-card-metadata-separator"]')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  await expect(reactCard.locator('[data-part="course-card-metadata"]')).not.toContainText(
    'Instructor',
  );
  await expect(
    page
      .locator('[data-part="course-card"]')
      .filter({ has: page.getByRole('heading', { level: 3, name: 'TypeScript' }) })
      .locator('[data-part="course-card-metadata"]'),
  ).toHaveText('Ada Lovelace · 1 lesson available');
  const reactCardLink = reactCard.getByRole('link', { name: 'React' });
  await expect(reactCard.getByRole('tooltip')).toHaveCount(0);
  await expect(reactCardLink).not.toHaveAttribute('aria-describedby');
  await reactCard.hover();
  const reactTooltip = reactCard.getByRole('tooltip');
  const reactTooltipContent = reactTooltip.locator('[data-part="course-card-tooltip-content"]');
  await expect(reactTooltip).toHaveCSS('opacity', '1');
  await expect(reactTooltipContent.locator(':scope > :first-child')).toHaveText(
    'This course is not available for enrollment yet.',
  );
  await expect(reactTooltip).toHaveText(
    /^This course is not available for enrollment yet\.Course description: ReactA concise course description\.$/,
  );
  await expect(reactTooltip).toContainText('A concise course description.');
  await expect(reactTooltipContent.locator(':scope > span[class*="tooltipCourse"]')).toHaveText(
    'Course description: React',
  );
  await expect(
    reactTooltipContent.locator(':scope > span[class*="tooltipCourse"]'),
  ).not.toHaveAttribute('aria-hidden');
  await expect(reactTooltip).not.toContainText('published_at');
  await expect(reactTooltip).not.toContainText('Draft means this course');
  await expect(reactTooltip).toHaveAttribute('data-placement', 'right');
  const publishedCard = page
    .locator('[data-part="course-card"]')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'TypeScript' }) });
  await publishedCard.hover();
  const publishedTooltip = publishedCard.getByRole('tooltip');
  await expect(publishedTooltip).toHaveCSS('opacity', '1');
  await expect(publishedTooltip).not.toContainText('Published means this course');
  await expect(publishedTooltip).not.toContainText('published_at');
  await reactCard.hover();
  const rightPlacement = await reactTooltip.evaluate((tooltip) => {
    const rect = tooltip.getBoundingClientRect();
    const headerBottom =
      document.querySelector<HTMLElement>('[data-app-shell-header]')?.getBoundingClientRect()
        .bottom ?? 0;
    const centreX = rect.left + rect.width / 2;
    const centreY = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(centreX, centreY);
    const sourceCard = tooltip.closest('[data-part="course-card"]');
    const hasNeighborBelow = document.elementsFromPoint(centreX, centreY).some((element) => {
      const card = element.closest('[data-part="course-card"]');
      return card !== null && card !== sourceCard;
    });
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
      headerBottom,
      hitInsideTooltip: hit?.closest('[role="tooltip"]') === tooltip,
      hasNeighborBelow,
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
  expect(rightPlacement.tailBorderRightWidth).toBe('9px');
  expect(rightPlacement.tailTop).not.toBe('auto');
  expect(rightPlacement.tailTransform).not.toBe('none');
  expect(rightPlacement.transitionProperty).not.toContain('transform');
  expect(rightPlacement.tailPositionVariable).toBe('');
  const seam = await reactCard.evaluate((card) => {
    const sourceItem = card.closest('li');
    const neighbor = sourceItem?.nextElementSibling?.querySelector<HTMLElement>(
      '[data-part="course-card"]',
    );
    if (!neighbor)
      throw new Error('Adjacent catalog card is required for the pointer seam scenario.');
    const sourceRect = card.getBoundingClientRect();
    const neighborRect = neighbor.getBoundingClientRect();
    const sourceX = sourceRect.right - 2;
    const neighborX = neighborRect.left + 2;
    const y = [24, sourceRect.height / 2, sourceRect.height - 24]
      .map((offset) => Math.max(sourceRect.top, neighborRect.top) + offset)
      .find(
        (candidateY) =>
          document.elementFromPoint(sourceX, candidateY)?.closest('[data-course-card-id]') ===
            card &&
          document.elementFromPoint(neighborX, candidateY)?.closest('[data-course-card-id]') ===
            neighbor,
      );
    if (y === undefined)
      throw new Error('Catalog pointer seam is obscured by the active disclosure surface.');
    return { sourceX, neighborX, y };
  });
  await page.mouse.move(seam.sourceX, seam.y);
  await page.mouse.move(seam.neighborX, seam.y, { steps: 8 });
  await expect(publishedCard.getByRole('tooltip')).toHaveCSS('opacity', '1');
  const seamDisclosureState = await page.getByRole('tooltip').evaluateAll((tooltips) =>
    tooltips.map((tooltip) => ({
      opacity: getComputedStyle(tooltip).opacity,
      pointerEvents: getComputedStyle(tooltip).pointerEvents,
    })),
  );
  expect(seamDisclosureState.filter((tooltip) => tooltip.opacity === '1')).toHaveLength(1);
  expect(seamDisclosureState.every((tooltip) => tooltip.pointerEvents === 'auto')).toBe(true);

  const rightmostCard = page
    .locator('[data-part="course-card"]')
    .filter({ has: page.getByRole('heading', { level: 3, name: longTitle }) });
  await rightmostCard.hover();
  const longTitleTooltip = rightmostCard.getByRole('tooltip');
  await expect(longTitleTooltip).toHaveCSS('opacity', '1');
  const longTitlePlacement = await longTitleTooltip.evaluate((tooltip) => ({
    placement: tooltip.getAttribute('data-placement'),
    borderLeftWidth: getComputedStyle(tooltip, '::before').borderLeftWidth,
    borderRightWidth: getComputedStyle(tooltip, '::before').borderRightWidth,
  }));
  expect(['left', 'right']).toContain(longTitlePlacement.placement);
  expect(
    longTitlePlacement.placement === 'left'
      ? longTitlePlacement.borderLeftWidth
      : longTitlePlacement.borderRightWidth,
  ).toBe('9px');
  await reactLink.focus();
  expect(await reactLink.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
  await expect(reactTooltip).toHaveCSS('opacity', '1');
  await expect(page.getByRole('heading', { level: 3, name: 'React' })).toBeVisible();

  const draftButton = reactCard.getByRole('button', { name: 'Not published' });
  const freeLink = publishedCard.getByRole('link', { name: 'Enroll for free' });
  const draftFreeButton = page
    .locator('[data-part="course-card"]')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Draft free' }) })
    .getByRole('button', { name: 'Not published' });
  const paidLink = page
    .locator('[data-part="course-card"]')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Published paid' }) })
    .getByRole('link', { name: 'Add to cart' });
  await expect(draftButton).toBeDisabled();
  await expect(draftFreeButton).toBeDisabled();
  await expect(draftButton.locator('svg')).toHaveCount(0);
  await expect(draftFreeButton.locator('svg')).toHaveCount(0);
  await expect(freeLink).toHaveAttribute('href', '/login?returnTo=%2Fcourses%2F8');
  await expect(paidLink).toHaveAttribute('href', '/login?returnTo=%2Fcourses%2F11');
  await expect(freeLink.locator('svg')).toHaveCount(0);
  await expect(paidLink.locator('svg')).toHaveCount(0);
  const anonymousActionGeometry = await Promise.all(
    [freeLink, paidLink].map((action) =>
      action.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const content = element.querySelector<HTMLElement>(
          '[data-part="course-card-action-content"]',
        );
        const icon = content?.querySelector('svg');
        const label = content?.lastElementChild as HTMLElement | null;
        const iconRect = icon?.getBoundingClientRect();
        const labelRect = label?.getBoundingClientRect();
        return {
          height: rect.height,
          width: rect.width,
          hasIcon: icon !== null,
          inlineGap: iconRect && labelRect ? labelRect.left - iconRect.right : null,
        };
      }),
    ),
  );
  expect(
    anonymousActionGeometry.every(
      (action) =>
        action.height >= 44 &&
        Math.abs(action.width - 120) <= 0.5 &&
        !action.hasIcon &&
        action.inlineGap === null,
    ),
  ).toBe(true);
  await expect(draftButton).toHaveCSS('background-color', 'rgb(91, 63, 214)');
  await expect(draftButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(freeLink).toHaveCSS('background-color', 'rgb(91, 63, 214)');
  await expect(freeLink).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(freeLink).toHaveCSS('border-top-left-radius', '8px');
  await expect(paidLink).toHaveCSS('border-top-left-radius', '8px');
  const actionGeometry = await Promise.all([
    reactCard.locator('[data-part="course-card-footer"]').boundingBox(),
    draftButton.boundingBox(),
  ]);
  expect(actionGeometry[0]).not.toBeNull();
  expect(actionGeometry[1]).not.toBeNull();
  expect(
    Math.abs(
      actionGeometry[1]!.x +
        actionGeometry[1]!.width -
        (actionGeometry[0]!.x + actionGeometry[0]!.width) +
        12,
    ),
  ).toBeLessThanOrEqual(0.5);
  expect(
    Math.abs(
      actionGeometry[1]!.y +
        actionGeometry[1]!.height -
        (actionGeometry[0]!.y + actionGeometry[0]!.height) +
        12,
    ),
  ).toBeLessThanOrEqual(0.5);
  const actionRadii = await Promise.all([
    reactCard.evaluate((card) => getComputedStyle(card).borderBottomRightRadius),
    draftButton.evaluate((button) => getComputedStyle(button).borderBottomRightRadius),
  ]);
  expect(actionRadii[1]).toBe('8px');
  await page.keyboard.press('Tab');
  await expect(draftButton).not.toBeFocused();
  await draftButton.evaluate((button) => (button as HTMLButtonElement).click());
  expect(forbiddenMutationRequests).toEqual([]);

  await reactLink.focus();
  await page.setViewportSize({ width: 768, height: 900 });
  await expect(reactTooltip).toHaveAttribute('data-placement', 'right');
  expect(
    await reactTooltip.evaluate((tooltip) => tooltip.parentElement?.getAttribute('data-part')),
  ).toBe('course-card');
  const bottomConnector = await reactTooltip.evaluate((tooltip) => ({
    borderBottomWidth: getComputedStyle(tooltip, '::before').borderBottomWidth,
    content: getComputedStyle(tooltip, '::before').content,
  }));
  expect(bottomConnector.content).toBe('""');
  expect(bottomConnector.borderBottomWidth).toBe('8px');
  await expect(reactTooltip).toBeVisible();
  const narrowPlacement = await reactTooltip.evaluate((tooltip) => ({
    left: tooltip.getBoundingClientRect().left,
    right: tooltip.getBoundingClientRect().right,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(narrowPlacement.left).toBeGreaterThanOrEqual(0);
  expect(narrowPlacement.right).toBeLessThanOrEqual(narrowPlacement.clientWidth);
  const narrowOverlay = await reactTooltip.evaluate((tooltip) => ({
    pointerEvents: getComputedStyle(tooltip).pointerEvents,
    top: tooltip.getBoundingClientRect().top,
    headerBottom:
      document.querySelector<HTMLElement>('[data-app-shell-header]')?.getBoundingClientRect()
        .bottom ?? 0,
    bottom: tooltip.getBoundingClientRect().bottom,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(narrowOverlay.pointerEvents).toBe('auto');
  expect(narrowOverlay.top).toBeGreaterThanOrEqual(narrowOverlay.headerBottom + 12);
  expect(narrowOverlay.bottom).toBeLessThanOrEqual(narrowOverlay.clientHeight);
  const narrowActionGeometry = await Promise.all([
    reactCard.boundingBox(),
    draftButton.boundingBox(),
  ]);
  expect(narrowActionGeometry[0]).not.toBeNull();
  expect(narrowActionGeometry[1]).not.toBeNull();
  expect(narrowActionGeometry[1]!.x).toBeGreaterThanOrEqual(narrowActionGeometry[0]!.x);
  expect(narrowActionGeometry[1]!.x + narrowActionGeometry[1]!.width).toBeLessThanOrEqual(
    narrowActionGeometry[0]!.x + narrowActionGeometry[0]!.width + 1,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
        document.body.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const publishedDisclosureButton = publishedCard.getByRole('button', {
    name: 'View course details',
  });
  const disclosurePillBefore = await publishedDisclosureButton.evaluate((button) => {
    const pill = button.querySelector<HTMLElement>('[data-part="course-card-disclosure-pill"]');
    if (!pill) throw new Error('Course-card disclosure visual pill is missing.');
    const buttonRect = button.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const style = getComputedStyle(pill);
    return {
      buttonHeight: buttonRect.height,
      pillWidth: pillRect.width,
      pillHeight: pillRect.height,
      pillRadius: style.borderRadius,
      pillPaddingInlineStart: style.paddingInlineStart,
      pillPaddingInlineEnd: style.paddingInlineEnd,
      pillFontSize: style.fontSize,
    };
  });
  expect(disclosurePillBefore.buttonHeight).toBeGreaterThanOrEqual(disclosurePillBefore.pillHeight);
  expect(disclosurePillBefore.pillWidth).toBeGreaterThan(disclosurePillBefore.pillHeight);
  expect(disclosurePillBefore.pillHeight).toBe(28);
  expect(disclosurePillBefore.pillRadius).toBe('9999px');
  expect(disclosurePillBefore.pillPaddingInlineStart).toBe('6px');
  expect(disclosurePillBefore.pillPaddingInlineEnd).toBe('6px');
  expect(disclosurePillBefore.pillFontSize).toBe('13px');
  const cardBoundsBeforeDisclosure = await page
    .locator('[data-part="course-card"]')
    .evaluateAll((cards) =>
      cards.slice(0, 2).map((card) => {
        const rect = card.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
  await publishedDisclosureButton.click();
  await expect(publishedCard.getByRole('button', { name: 'View course details' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(publishedDisclosureButton).toHaveAttribute('aria-pressed', 'true');
  const disclosurePillAfter = await publishedCard
    .getByRole('button', { name: 'View course details' })
    .locator('[data-part="course-card-disclosure-pill"]')
    .boundingBox();
  expect(disclosurePillAfter).not.toBeNull();
  expect(disclosurePillAfter?.width).toBe(disclosurePillBefore.pillWidth);
  expect(disclosurePillAfter?.height).toBe(disclosurePillBefore.pillHeight);
  await expect(reactCard.locator('button[aria-expanded="false"]')).toHaveCount(1);
  await reactCard.hover();
  const transientPillState = await reactCard
    .getByRole('button', { name: 'View course details' })
    .evaluate((button) => {
      const pill = button.querySelector<HTMLElement>('[data-part="course-card-disclosure-pill"]');
      if (!pill) throw new Error('Transient disclosure pill is missing.');
      return {
        expanded: button.getAttribute('aria-expanded'),
        pressed: button.getAttribute('aria-pressed'),
        pillBackground: getComputedStyle(pill).backgroundColor,
        pillBorder: getComputedStyle(pill).borderColor,
      };
    });
  expect(transientPillState).toEqual({
    expanded: 'false',
    pressed: 'false',
    pillBackground: 'rgb(255, 255, 255)',
    pillBorder: 'rgb(209, 213, 219)',
  });
  await expect(publishedDisclosureButton).toHaveAttribute('aria-expanded', 'true');
  await expect(publishedDisclosureButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('tooltip')).toHaveCount(1);
  await page.getByRole('heading', { level: 2, name: 'Found 25 courses' }).hover();
  await expect(publishedDisclosureButton).toHaveAttribute('aria-expanded', 'true');
  await expect(publishedDisclosureButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('tooltip')).toHaveCount(1);
  const cardBoundsAfterDisclosure = await page
    .locator('[data-part="course-card"]')
    .evaluateAll((cards) =>
      cards.slice(0, 2).map((card) => {
        const rect = card.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
  expect(cardBoundsAfterDisclosure).toEqual(cardBoundsBeforeDisclosure);
  await page.keyboard.press('Escape');
  await expect(publishedDisclosureButton).toHaveAttribute('aria-expanded', 'false');
  await expect(publishedDisclosureButton).toHaveAttribute('aria-pressed', 'false');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.body.style.minHeight = '2000px';
  });
  await reactLink.focus();
  await expect(reactTooltip).toHaveAttribute('data-placement', 'right');
  const readSideTooltipGeometry = () =>
    reactTooltip.evaluate((tooltip) => {
      const source = tooltip.closest<HTMLElement>('[data-part="course-card"]');
      const link = source?.querySelector<HTMLElement>('a[aria-describedby]');
      const header = document.querySelector<HTMLElement>('[data-app-shell-header]');
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
        expectedTop: linkRect.top + linkRect.height / 2 - tooltipRect.height / 2,
        connectorTop,
        connectorCentreY: tooltipRect.top + connectorTop,
        tooltipCentreY: tooltipRect.top + tooltipRect.height / 2,
        connectorTransform: connector.transform,
        connectorColor: connector.borderRightColor,
        tooltipBorderColor: getComputedStyle(tooltip).borderColor,
        tooltipColor: getComputedStyle(tooltip).backgroundColor,
        gap: tooltipRect.left - linkRect.right,
      };
    });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const beforeScroll = await readSideTooltipGeometry();
  expect(beforeScroll.expectedTop).toBeGreaterThanOrEqual(beforeScroll.minimumTop);
  expect(beforeScroll.expectedTop).toBeLessThanOrEqual(beforeScroll.maximumTop);
  expect(Math.abs(beforeScroll.tooltip.top - beforeScroll.expectedTop)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(beforeScroll.tooltipCentreY - (beforeScroll.link.top + beforeScroll.link.height / 2)),
  ).toBeLessThanOrEqual(1);
  expect(Math.abs(beforeScroll.connectorCentreY - beforeScroll.tooltipCentreY)).toBeLessThanOrEqual(
    1,
  );
  expect(beforeScroll.connectorTransform).not.toBe('none');
  expect(beforeScroll.connectorColor).toBe(beforeScroll.tooltipBorderColor);
  expect(Math.abs(beforeScroll.gap - 8)).toBeLessThanOrEqual(1);
  const scrollPosition = await page.evaluate(() => {
    window.scrollBy(0, 80);
    return window.scrollY;
  });
  expect(scrollPosition).toBeGreaterThan(0);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const afterScroll = await readSideTooltipGeometry();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const settledAfterScroll = await readSideTooltipGeometry();
  expect(Math.abs(afterScroll.tooltip.top - beforeScroll.tooltip.top)).toBeGreaterThan(1);
  expect(
    Math.abs(afterScroll.tooltipCentreY - (afterScroll.link.top + afterScroll.link.height / 2)),
  ).toBeLessThanOrEqual(1);
  expect(Math.abs(afterScroll.connectorCentreY - afterScroll.tooltipCentreY)).toBeLessThanOrEqual(
    1,
  );
  expect(afterScroll.connectorTop).toBeCloseTo(beforeScroll.connectorTop, 1);
  expect(Math.abs(afterScroll.gap - beforeScroll.gap)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      afterScroll.tooltipCentreY -
        beforeScroll.tooltipCentreY -
        (afterScroll.connectorCentreY - beforeScroll.connectorCentreY),
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      afterScroll.tooltipCentreY -
        beforeScroll.tooltipCentreY -
        (afterScroll.link.top +
          afterScroll.link.height / 2 -
          (beforeScroll.link.top + beforeScroll.link.height / 2)),
    ),
  ).toBeLessThanOrEqual(1);
  expect(Math.abs(settledAfterScroll.tooltip.top - afterScroll.tooltip.top)).toBeLessThanOrEqual(
    0.1,
  );
  expect(
    Math.abs(settledAfterScroll.connectorCentreY - afterScroll.connectorCentreY),
  ).toBeLessThanOrEqual(0.1);
  expect(forbiddenMutationRequests).toEqual([]);

  const next = page.getByRole('button', { name: 'Go to next page' });
  const previous = page.getByRole('button', { name: 'Go to previous page' });
  await expect(previous).toHaveCount(0);
  await expect(next).toBeVisible();
  await expect(page.locator('.ui-pagination__direction-slot')).toHaveCount(1);
  const paginationStyles = await page.evaluate(() => {
    const nextButton = document.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]');
    const currentButton = document.querySelector<HTMLElement>(
      '[aria-label="Page 1, current page"]',
    );
    if (!nextButton || !currentButton) throw new Error('Pagination controls are missing.');
    const primaryProbe = document.createElement('span');
    primaryProbe.style.background = 'var(--action-primary-bg)';
    document.body.append(primaryProbe);
    const primaryBackground = getComputedStyle(primaryProbe).backgroundColor;
    primaryProbe.remove();
    const nextStyle = getComputedStyle(nextButton);
    const currentStyle = getComputedStyle(currentButton);
    return {
      nextBackground: nextStyle.backgroundColor,
      nextBorderWidth: nextStyle.borderTopWidth,
      currentBackground: currentStyle.backgroundColor,
      currentBorderWidth: currentStyle.borderTopWidth,
      primaryBackground,
    };
  });
  expect(paginationStyles.nextBackground).toBe('rgba(0, 0, 0, 0)');
  expect(paginationStyles.nextBorderWidth).toBe('0px');
  expect(paginationStyles.currentBorderWidth).not.toBe('0px');
  expect(paginationStyles.currentBackground).toBe(paginationStyles.primaryBackground);
  await expect(page.getByRole('button', { name: 'Go to page 1' })).toHaveCount(0);
  await next.focus();
  expect(await next.evaluate((button) => button.matches(':focus-visible'))).toBe(true);
  await expect(next).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 180));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await next.evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page).toHaveURL(/page=2/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(next).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Go to page 2' })).toHaveCount(0);
  await expect(previous).toBeEnabled();
  await expect(page.locator('.ui-pagination__direction-slot')).toHaveCount(1);
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/$/);
  const courseNavigationAbort = page.waitForEvent(
    'requestfailed',
    (request) =>
      request.method() === 'GET' &&
      new URL(request.url()).pathname === '/courses/7' &&
      request.failure()?.errorText === 'net::ERR_ABORTED',
  );
  await reactLink.press('Enter');
  await expect(page).toHaveURL(/\/courses\/7$/);
  await courseNavigationAbort;
  expect(forbiddenMutationRequests).toEqual([]);
  assertClean();
});

test('keeps a fine-pointer hover-open Sort popup open through trigger click and activates an option', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=2&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
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
        total: 21,
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
  const firstOpenGeometry = await Promise.all([
    trigger.boundingBox(),
    listbox.boundingBox(),
    trigger.locator('xpath=..').evaluate((control) => {
      const bridge = getComputedStyle(control, '::after');
      return {
        content: bridge.content,
        height: bridge.height,
        zIndex: getComputedStyle(control).zIndex,
      };
    }),
  ]);
  expect(firstOpenGeometry[0]).not.toBeNull();
  expect(firstOpenGeometry[1]).not.toBeNull();
  expect(firstOpenGeometry[2]).toEqual({ content: '""', height: '8px', zIndex: 'auto' });
  for (
    let y = Math.ceil(firstOpenGeometry[0]!.y + firstOpenGeometry[0]!.height);
    y <= Math.floor(firstOpenGeometry[1]!.y + 8);
    y += 1
  ) {
    await page.mouse.move(firstOpenGeometry[0]!.x + firstOpenGeometry[0]!.width / 2, y);
    await expect(listbox).toBeVisible();
  }
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
  await page.mouse.move(0, 0);
  const repeatedTrigger = page.getByRole('button', { name: 'Sort by: Low to High' });
  await repeatedTrigger.hover();
  const repeatedListbox = page.getByRole('listbox', { name: 'Sort by options' });
  await expect(repeatedListbox).toBeVisible();
  const repeatedGeometry = await Promise.all([
    repeatedTrigger.boundingBox(),
    repeatedListbox.boundingBox(),
  ]);
  expect(repeatedGeometry.every(Boolean)).toBe(true);
  for (
    let y = Math.ceil(repeatedGeometry[0]!.y + repeatedGeometry[0]!.height);
    y <= Math.floor(repeatedGeometry[1]!.y + 8);
    y += 1
  ) {
    await page.mouse.move(repeatedGeometry[0]!.x + repeatedGeometry[0]!.width / 2, y);
    await expect(repeatedListbox).toBeVisible();
  }
  assertClean();
});

test('keeps Catalog result geometry stable while changed Sort and price requests refresh', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=2&page_size=20&sort=-created_at',
    errorText: 'net::ERR_ABORTED',
  });
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=-created_at',
    errorText: 'net::ERR_ABORTED',
  });
  const requests: string[] = [];
  const courses = Array.from({ length: 20 }, (_, index) => ({
    ...permittedCourse(`React ${index + 1}`),
    id: index + 1,
  }));
  let deferNextResponse = false;
  let releaseDeferredResponse: (() => void) | null = null;
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    if (deferNextResponse) {
      deferNextResponse = false;
      await new Promise<void>((resolve) => {
        releaseDeferredResponse = resolve;
      });
      releaseDeferredResponse = null;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response(courses, { page: 1, pages: 1 }),
    });
  });
  const capture = () =>
    page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const results = document.querySelector<HTMLElement>(
        '[data-part="catalog-discovery-results"]',
      );
      const list = document.querySelector<HTMLElement>('[data-part="catalog-result-list"]');
      const firstCard = document.querySelector<HTMLElement>('[data-part="course-card"]');
      const active =
        document.activeElement instanceof HTMLElement
          ? {
              ariaLabel: document.activeElement.getAttribute('aria-label'),
              dataPart: document.activeElement.dataset.part ?? null,
              id: document.activeElement.id || null,
              name: document.activeElement.getAttribute('name'),
              tagName: document.activeElement.tagName,
            }
          : null;
      return {
        active: active
          ? {
              ...active,
              box: (() => {
                const rect = (document.activeElement as HTMLElement).getBoundingClientRect();
                return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
              })(),
            }
          : null,
        ariaBusy: results?.getAttribute('aria-busy') ?? null,
        bodyScrollHeight: document.body.scrollHeight,
        documentScrollHeight: document.documentElement.scrollHeight,
        firstCard: firstCard
          ? {
              box: box('[data-part="course-card"]'),
              opacity: getComputedStyle(firstCard).opacity,
              visible: firstCard.checkVisibility(),
            }
          : null,
        heading: {
          box: box('#catalog-results-title'),
          text: document.querySelector('#catalog-results-title')?.textContent?.trim() ?? null,
        },
        refreshStatus:
          document.querySelector('[data-part="catalog-refresh-status"]')?.textContent?.trim() ??
          null,
        resultsList: list
          ? {
              ariaHidden: list.getAttribute('aria-hidden'),
              box: box('[data-part="catalog-result-list"]'),
              opacity: getComputedStyle(list).opacity,
              visible: list.checkVisibility(),
            }
          : null,
        scrollY: window.scrollY,
        toolbar: box('[data-part="catalog-toolbar-controls"]'),
        url: window.location.href,
      };
    });
  const prepareRefresh = async (position: 'top' | 'mid') => {
    await page
      .locator('[data-part="catalog-sort-trigger"]')
      .evaluate((trigger, requestedPosition) => {
        window.scrollTo({
          top:
            requestedPosition === 'top'
              ? 0
              : trigger.getBoundingClientRect().top + window.scrollY - 96,
        });
      }, position);
    deferNextResponse = true;
    return capture();
  };
  const captureDeferredRefresh = async () => {
    await expect.poll(() => releaseDeferredResponse !== null).toBe(true);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Loading course results…');
    await expect(page.getByRole('status', { name: 'Catalog refresh status' })).toHaveText('');
    return capture();
  };
  const settleRefresh = async () => {
    const release = releaseDeferredResponse;
    if (!release) throw new Error('Expected a deferred catalog response.');
    release();
    await expect(page.locator('[data-part="course-card"]')).toHaveCount(20);
    await expect(page.locator('[data-part="catalog-discovery-results"]')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    await expect(page.getByRole('status', { name: 'Catalog refresh status' })).toHaveText('');
    return capture();
  };

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?sort=-created_at&page=2');
  await expect(page.locator('[data-part="course-card"]')).toHaveCount(20);
  const trigger = page.locator('[data-part="catalog-sort-trigger"]');
  const minimum = page.getByLabel('Min price');
  const maximum = page.getByLabel('Max price');
  const initialRequestCount = requests.length;
  const records: Array<{
    after: Awaited<ReturnType<typeof capture>>;
    before: Awaited<ReturnType<typeof capture>>;
    focusTarget: { dataPart?: string; id?: string; name?: string };
    during: Awaited<ReturnType<typeof capture>>;
    name: string;
    requestCount: number;
  }> = [];

  let before = await prepareRefresh('top');
  await trigger.click();
  await page
    .getByRole('listbox', { name: 'Sort by options' })
    .getByRole('option', { name: 'Low to High' })
    .click();
  let during = await captureDeferredRefresh();
  let after = await settleRefresh();
  records.push({
    after,
    before,
    during,
    focusTarget: { id: 'main-content' },
    name: 'Sort pointer at top',
    requestCount: requests.length,
  });

  before = await prepareRefresh('mid');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox', { name: 'Sort by options' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  during = await captureDeferredRefresh();
  after = await settleRefresh();
  records.push({
    after,
    before,
    during,
    focusTarget: { dataPart: 'catalog-sort-trigger' },
    name: 'Sort keyboard mid-page',
    requestCount: requests.length,
  });

  before = await prepareRefresh('top');
  const priceUrlBeforeApply = before.url;
  const requestCountBeforePriceApply = requests.length;
  await minimum.fill('10');
  await maximum.focus();
  await expect(maximum).toBeFocused();
  await expect(page).toHaveURL(priceUrlBeforeApply);
  expect(requests).toHaveLength(requestCountBeforePriceApply);
  expect(releaseDeferredResponse).toBeNull();

  await trigger.focus();
  await expect(trigger).toBeFocused();
  during = await captureDeferredRefresh();
  after = await settleRefresh();
  records.push({
    after,
    before,
    during,
    focusTarget: { dataPart: 'catalog-sort-trigger' },
    name: 'Min price fieldset exit at top',
    requestCount: requests.length,
  });

  before = await prepareRefresh('mid');
  await maximum.fill('20');
  await maximum.press('Enter');
  during = await captureDeferredRefresh();
  after = await settleRefresh();
  records.push({
    after,
    before,
    during,
    focusTarget: { id: 'main-content' },
    name: 'Max price Enter mid-page',
    requestCount: requests.length,
  });

  for (const [index, record] of records.entries()) {
    expect(record.requestCount).toBe(initialRequestCount + index + 1);
    expect(record.during.ariaBusy).toBe('true');
    expect(record.during.heading.text).toBe('Loading course results…');
    expect(record.during.refreshStatus).toBe('');
    expect(
      record.during.firstCard,
      `${record.name} must not retain prior-query cards during refresh`,
    ).toBeNull();
    expect(
      record.during.resultsList?.ariaHidden,
      `${record.name} must expose only noninteractive skeleton geometry`,
    ).toBe('true');
    expect(
      record.during.scrollY,
      `${record.name} must not move the page during refresh`,
    ).toBeCloseTo(record.before.scrollY, 0);
    expect(
      record.after.scrollY,
      `${record.name} must not move the page after settlement`,
    ).toBeCloseTo(record.before.scrollY, 0);
    expect(
      record.during.heading.box,
      `${record.name} must retain result-heading position and height during refresh`,
    ).toMatchObject({
      x: record.before.heading.box?.x,
      y: record.before.heading.box?.y,
      height: record.before.heading.box?.height,
    });
    expect(
      record.during.heading.box?.width,
      `${record.name} must preserve a measurable loading heading`,
    ).toBeGreaterThan(0);
    expect(
      record.after.heading.box,
      `${record.name} must retain result-heading geometry after settlement`,
    ).toEqual(record.before.heading.box);
    expect(
      record.during.toolbar,
      `${record.name} must retain toolbar geometry during refresh`,
    ).toEqual(record.before.toolbar);
    expect(
      record.after.toolbar,
      `${record.name} must retain toolbar geometry after settlement`,
    ).toEqual(record.before.toolbar);
    if (record.focusTarget.dataPart)
      expect(
        record.after.active?.dataPart,
        `${record.name} must restore the original interactive owner`,
      ).toBe(record.focusTarget.dataPart);
    if (record.focusTarget.id)
      expect(
        record.after.active?.id,
        `${record.name} must retain the route main-focus lifecycle`,
      ).toBe(record.focusTarget.id);
    if (record.focusTarget.name)
      expect(record.after.active?.name, `${record.name} must restore the original field`).toBe(
        record.focusTarget.name,
      );
  }

  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto('/?sort=-created_at');
  await expect(page.locator('[data-part="course-card"]')).toHaveCount(20);
  const mobileRequestsBeforeSelection = requests.length;
  before = await prepareRefresh('mid');
  await trigger.click();
  await page
    .getByRole('listbox', { name: 'Sort by options' })
    .getByRole('option', { name: 'Low to High' })
    .click();
  during = await captureDeferredRefresh();
  after = await settleRefresh();
  expect(requests).toHaveLength(mobileRequestsBeforeSelection + 1);
  expect(during.firstCard).toBeNull();
  expect(during.resultsList?.ariaHidden).toBe('true');
  expect(during.scrollY).toBeCloseTo(before.scrollY, 0);
  expect(after.scrollY).toBeCloseTo(before.scrollY, 0);
  expect(during.documentScrollHeight).toBeGreaterThanOrEqual(during.scrollY + 740);
  assertClean();
});

test('navigates every enabled control for an authoritative high final page', async ({ page }) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=99&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()], {
        page: 99,
        pages: 99,
        total: 1961,
        has_next: false,
        has_previous: true,
      }),
    });
  });

  await page.goto('/?page=99');
  await expect(page.getByRole('link', { name: 'React' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Page 99 of 99' })).toHaveCount(1);
  const previous = page.getByRole('button', { name: 'Go to previous page' });
  const pageOne = page.getByRole('button', { name: 'Go to page 1' });
  await expect(previous).toBeEnabled();
  await expect(pageOne).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Go to next page' })).toHaveCount(0);

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

test('keeps anonymous published Catalog links semantic and contained across the DD-259 width matrix', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure(
    {
      method: 'GET',
      path: '/courses?page=1&page_size=20&sort=created_at',
      errorText: 'net::ERR_ABORTED',
    },
    20,
  );
  const mutationRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' || request.method() === 'DELETE') {
      mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([
        { ...permittedCourse('Anonymous free'), id: 8, price: '0.00' },
        { ...permittedCourse('Anonymous paid'), id: 11, price: '29.99' },
      ]),
    });
  });

  for (const width of [320, 390, 767, 768, 1024, 1099, 1100, 1279, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => window.innerWidth)).toBe(width);

    const freeCard = page
      .locator('[data-part="course-card"]')
      .filter({ has: page.getByRole('heading', { level: 3, name: 'Anonymous free' }) });
    const paidCard = page
      .locator('[data-part="course-card"]')
      .filter({ has: page.getByRole('heading', { level: 3, name: 'Anonymous paid' }) });
    const freeLink = freeCard.getByRole('link', { name: 'Enroll for free' });
    const paidLink = paidCard.getByRole('link', { name: 'Add to cart' });

    await expect(freeLink).toHaveCount(1);
    await expect(paidLink).toHaveCount(1);
    await expect(freeLink).toHaveAttribute('href', '/login?returnTo=%2Fcourses%2F8');
    await expect(paidLink).toHaveAttribute('href', '/login?returnTo=%2Fcourses%2F11');
    await expect(freeLink.locator('svg')).toHaveCount(0);
    await expect(paidLink.locator('svg')).toHaveCount(0);
    await paidLink.hover();
    expect(await paidLink.evaluate((element) => element.matches(':hover'))).toBe(true);
    await freeLink.focus();
    await expect(freeLink).toBeFocused();
    expect(await freeLink.evaluate((element) => element.matches(':focus-visible'))).toBe(true);

    const geometry = await Promise.all(
      [
        { card: freeCard, action: freeLink },
        { card: paidCard, action: paidLink },
      ].map(async ({ card, action }) => ({
        card: await card.evaluate((element) => element.getBoundingClientRect().toJSON()),
        action: await action.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            rect: rect.toJSON(),
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            fontWeight: style.fontWeight,
            minHeight: style.minHeight,
            borderRadius: style.borderRadius,
          };
        }),
      })),
    );
    const viewport = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      geometry.every(
        ({ card, action }) =>
          action.fontSize === '14px' &&
          action.lineHeight === '20px' &&
          action.fontWeight === '600' &&
          action.minHeight === '44px' &&
          action.rect.height >= 44 &&
          Math.abs(action.rect.width - 120) <= 0.5 &&
          action.borderRadius === '8px' &&
          action.rect.left >= card.left - 0.5 &&
          action.rect.right <= card.right + 0.5,
      ),
    ).toBe(true);
    expect(viewport.documentWidth).toBeLessThanOrEqual(viewport.clientWidth);
    expect(viewport.bodyWidth).toBeLessThanOrEqual(viewport.clientWidth);

    const paidBounds = await paidLink.boundingBox();
    if (!paidBounds) throw new Error('Anonymous paid action bounds are missing.');
    await page.mouse.move(
      paidBounds.x + paidBounds.width / 2,
      paidBounds.y + paidBounds.height / 2,
    );
    await page.mouse.down();
    expect(await paidLink.evaluate((element) => element.matches(':active'))).toBe(true);
    await page.mouse.up();
    await expect(page).toHaveURL('/login?returnTo=%2Fcourses%2F11');

    await page.goto('/');
    const freeLinkAfterReset = page.getByRole('link', { name: 'Enroll for free' });
    await freeLinkAfterReset.focus();
    await expect(freeLinkAfterReset).toBeFocused();
    expect(await freeLinkAfterReset.evaluate((element) => element.matches(':focus-visible'))).toBe(
      true,
    );
    await freeLinkAfterReset.press('Enter');
    await expect(page).toHaveURL('/login?returnTo=%2Fcourses%2F8');
  }
  expect(mutationRequests).toEqual([]);

  assertClean();
});

test('hydrates, applies, traverses catalog history, and keeps real-browser diagnostics clean', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=2&page_size=20&search_query=React&min_price=5&sort=-created_at',
    errorText: 'net::ERR_ABORTED',
  });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()]),
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?search_query=React&min_price=5&sort=-id&page=2');
  await expect(page).toHaveURL(/search_query=React&min_price=5&sort=-created_at&page=2/);
  const catalogSearch = page.getByRole('search', { name: 'Course catalog search' });
  const headerSearch = catalogSearch.getByLabel('Search courses');
  await expect(headerSearch).toHaveValue('React');
  await expect(headerSearch).toHaveAttribute(
    'placeholder',
    'Search courses, topics, or instructors',
  );
  await expect(catalogSearch.getByRole('button', { name: 'Search' })).toHaveCount(0);
  const headerSearchGeometry = await catalogSearch.evaluate((form) => {
    const input = form.querySelector<HTMLInputElement>('input[name="search_query"]');
    const label = form.querySelector<HTMLLabelElement>('label');
    const icon = form.querySelector<SVGElement>('svg[aria-hidden="true"]');
    if (!input || !label || !icon) throw new Error('Label-free catalog search hooks are missing.');
    const hiddenLabel = label.firstElementChild;
    if (!(hiddenLabel instanceof HTMLElement) || label.childElementCount !== 1) {
      throw new Error('Catalog search label must contain one semantic hidden child.');
    }
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
    const hiddenLabelRect = hiddenLabel.getBoundingClientRect();
    const iconStyle = getComputedStyle(icon);
    const inputStyle = getComputedStyle(input);
    return {
      labelHiddenContent: hiddenLabel.textContent,
      labelHiddenHeight: hiddenLabelRect.height,
      iconAriaHidden: icon.getAttribute('aria-hidden'),
      iconFocusable: icon.getAttribute('focusable'),
      iconRole: icon.getAttribute('role'),
      iconPointerEvents: iconStyle.pointerEvents,
      iconColor: iconStyle.color,
      muted: resolveColor('--text-muted'),
      iconInsideInput:
        iconRect.left >= inputRect.left &&
        iconRect.right <= inputRect.right &&
        iconRect.top >= inputRect.top &&
        iconRect.bottom <= inputRect.bottom,
      iconBeforeText: Number.parseFloat(inputStyle.paddingLeft) >= iconRect.width + 12,
      iconInputCentreDelta: Math.abs(
        iconRect.top + iconRect.height / 2 - (inputRect.top + inputRect.height / 2),
      ),
      inputBorderRadius: inputStyle.borderTopLeftRadius,
    };
  });
  expect(headerSearchGeometry.labelHiddenContent).toBe('Search courses');
  expect(headerSearchGeometry.labelHiddenHeight).toBeLessThanOrEqual(1);
  expect(headerSearchGeometry.iconAriaHidden).toBe('true');
  expect(headerSearchGeometry.iconFocusable).toBe('false');
  expect(headerSearchGeometry.iconRole).toBe(null);
  expect(headerSearchGeometry.iconPointerEvents).toBe('none');
  expect(headerSearchGeometry.iconColor).toBe(headerSearchGeometry.muted);
  expect(headerSearchGeometry.iconInsideInput).toBe(true);
  expect(headerSearchGeometry.iconBeforeText).toBe(true);
  expect(headerSearchGeometry.iconInputCentreDelta).toBeLessThanOrEqual(1);
  expect(headerSearchGeometry.inputBorderRadius).toBe('9999px');
  const anonymousCatalogHeader = await page
    .locator('[data-app-shell-header]')
    .evaluate((header) => {
      const inner = header.firstElementChild as HTMLElement | null;
      const form = header.querySelector<HTMLElement>('form[role="search"]');
      const browse = Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).find(
        (link) => link.textContent?.trim() === 'Catalog',
      );
      const search = header.querySelector<HTMLInputElement>('input[name="search_query"]');
      const logIn = Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).find(
        (link) => link.textContent?.trim() === 'Log in',
      );
      const signUp = Array.from(header.querySelectorAll<HTMLAnchorElement>('a')).find(
        (link) => link.textContent?.trim() === 'Sign up',
      );
      if (!inner || !form || !browse || !search || !logIn || !signUp)
        throw new Error('Anonymous catalog header controls are missing.');
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
        hrefs: [
          browse.getAttribute('href'),
          logIn.getAttribute('href'),
          signUp.getAttribute('href'),
        ],
        current: [
          browse.getAttribute('aria-current'),
          logIn.getAttribute('aria-current'),
          signUp.getAttribute('aria-current'),
        ],
        directChildCount: inner.children.length,
        searchFormIndex: Array.from(inner.children).indexOf(form),
        clientWidth: document.documentElement.clientWidth,
        formCenterDelta: Math.abs(
          formRect.left + formRect.width / 2 - (innerRect.left + innerRect.width / 2),
        ),
        inputCenterDelta: Math.abs(
          searchRect.left + searchRect.width / 2 - (innerRect.left + innerRect.width / 2),
        ),
        browseSearchGap: formRect.left - browseRect.right,
        searchRight: searchRect.right,
        logInLeft: logInRect.left,
        signUpLeft: signUpRect.left,
        signUpRight: signUpRect.right,
      };
    });
  expect(anonymousCatalogHeader.sequence).toEqual([
    'LearnHub home',
    'Catalog',
    'search_query',
    'Cart',
    'Log in',
    'Sign up',
  ]);
  expect(anonymousCatalogHeader.hrefs).toEqual(['/', '/login', '/signup']);
  expect(anonymousCatalogHeader.current).toEqual(['page', null, null]);
  expect(anonymousCatalogHeader.directChildCount).toBe(3);
  expect(anonymousCatalogHeader.searchFormIndex).toBe(1);
  expect(anonymousCatalogHeader.formCenterDelta).toBeLessThanOrEqual(64);
  expect(anonymousCatalogHeader.inputCenterDelta).toBeLessThanOrEqual(64);
  expect(anonymousCatalogHeader.browseSearchGap).toBeGreaterThan(0);
  expect(anonymousCatalogHeader.logInLeft).toBeLessThan(anonymousCatalogHeader.signUpLeft);
  expect(anonymousCatalogHeader.signUpRight).toBeLessThanOrEqual(
    anonymousCatalogHeader.clientWidth,
  );
  await page.getByRole('link', { name: 'LearnHub home' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Catalog' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(headerSearch).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Cart', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Sign up', exact: true })).toBeFocused();
  await expect(page.getByRole('link', { name: 'React' })).toHaveAttribute('href', '/courses/7');
  await expect(
    page.locator('[data-part="course-card-metadata"]').getByText('Ada Lovelace', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('1 lesson available', { exact: true })).toBeVisible();
  expect(requests[0]).toContain('page_size=20');

  const filters = page.getByRole('form', { name: 'Course filters' });
  await expect(filters.getByRole('heading', { name: 'Filters' })).toHaveCount(0);
  const priceRange = filters.getByRole('group', { name: 'Price range' });
  await expect(priceRange).toBeVisible();
  const semanticPriceLegend = priceRange.locator(':scope > legend');
  await expect(semanticPriceLegend).toHaveText('Price range');
  expect(await semanticPriceLegend.evaluate((legend) => getComputedStyle(legend).display)).not.toBe(
    'contents',
  );
  const initialMinimum = filters.getByLabel('Min price');
  const initialMaximum = filters.getByLabel('Max price');
  await expect(initialMinimum).toHaveValue('5');
  await expect(initialMaximum).toHaveValue('');
  for (const input of [initialMinimum, initialMaximum]) {
    await expect(input).toHaveAttribute('data-part', 'control');
    await expect(input.locator('xpath=..')).toHaveAttribute('data-part', 'field');
    await expect(input.locator('xpath=..').locator(':scope > label')).toHaveAttribute(
      'data-part',
      'label',
    );
  }
  await expect(filters.getByRole('button', { name: /apply/i })).toHaveCount(0);
  expect(await filters.locator('input[name="search_query"], select').count()).toBe(0);
  const sortTrigger = page.locator('[data-part="catalog-sort-trigger"]');
  await expect(sortTrigger).toHaveAccessibleName('Sort by: Newest');
  const toolbarControls = page.locator('[data-part="catalog-toolbar-controls"]');
  await expect(toolbarControls).toHaveCount(1);
  await expect(toolbarControls.getByRole('combobox')).toHaveCount(0);
  expect(
    await toolbarControls.evaluate((controls) =>
      Array.from(controls.children).map((child) =>
        child instanceof HTMLFormElement
          ? child.getAttribute('aria-label')
          : child.getAttribute('data-part'),
      ),
    ),
  ).toEqual(['Course filters', 'catalog-sort-toolbar']);
  const resultHeading = page.getByRole('heading', { level: 2, name: 'Found 1 course' });
  await expect(resultHeading).toHaveText('Found 1 course');
  await expect(resultHeading.locator('strong')).toHaveText('1');
  await expect(resultHeading.locator('strong')).not.toContainText('course');
  await expect(
    page.locator('[data-part="catalog-sort-toolbar"] .sortBy, [class*="sortBy"]'),
  ).toHaveText('Sort by:');
  const resultTypography = await resultHeading.evaluate((heading) => {
    const total = heading.querySelector<HTMLElement>('strong');
    const suffix = heading.lastElementChild as HTMLElement | null;
    const sortLabel = document.querySelector<HTMLElement>(
      '[data-part="catalog-sort-toolbar"] > div > span:first-child',
    );
    if (!total || !suffix || !sortLabel)
      throw new Error('Result-toolbar typography targets are missing.');
    const resolveColor = (token: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    return {
      heading: getComputedStyle(heading),
      total: getComputedStyle(total),
      suffix: getComputedStyle(suffix),
      label: getComputedStyle(sortLabel),
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
  const sortIdle = await sortTrigger.evaluate((trigger) => {
    const chevron = trigger.querySelector<HTMLElement>('[data-part="catalog-sort-chevron"]');
    if (!trigger || !chevron) throw new Error('Custom sort trigger or chevron is missing.');
    const resolveColor = (token: string) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${token})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const resolveLength = (token: string) => {
      const probe = document.createElement('span');
      probe.style.width = `var(${token})`;
      document.body.append(probe);
      const width = Number.parseFloat(getComputedStyle(probe).width);
      probe.remove();
      return width;
    };
    const rect = chevron.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(chevron).transform);
    const angle = ((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI + 360) % 360;
    return {
      color: getComputedStyle(chevron).color,
      angle,
      origin: getComputedStyle(chevron).transformOrigin,
      transition: getComputedStyle(chevron).transition,
      duration: getComputedStyle(chevron).transitionDuration,
      rightInset: triggerRect.right - rect.right,
      centreDelta: Math.abs(
        rect.top + rect.height / 2 - (triggerRect.top + triggerRect.height / 2),
      ),
      rect,
      expected: { muted: resolveColor('--text-muted'), endInset: resolveLength('--spacing-3') },
    };
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
  const focusedCourseTooltip = focusedCourseLink.locator('xpath=..').getByRole('tooltip');
  await focusedCourseLink.focus();
  await expect(focusedCourseTooltip).toHaveCSS('opacity', '1');
  await sortTrigger.hover();
  const sortListbox = page.getByRole('listbox', { name: 'Sort by options' });
  await expect(sortListbox).toBeVisible();
  await expect(sortTrigger).toHaveAttribute('aria-expanded', 'true');
  await expect(sortListbox.getByRole('option')).toHaveCount(6);
  await expect(sortListbox.getByRole('option', { name: 'Newest' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.waitForTimeout(200);
  const sortGeometry = await Promise.all([
    sortTrigger.boundingBox(),
    sortListbox.boundingBox(),
    sortTrigger.evaluate((trigger) => {
      const chevron = trigger.querySelector<HTMLElement>('[data-part="catalog-sort-chevron"]');
      if (!trigger || !chevron) throw new Error('Custom sort geometry targets are missing.');
      const resolveColor = (token: string) => {
        const probe = document.createElement('span');
        probe.style.color = `var(${token})`;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      const triggerRect = trigger.getBoundingClientRect();
      const rect = chevron.getBoundingClientRect();
      const style = getComputedStyle(chevron);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return {
        color: style.color,
        angle: ((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI + 360) % 360,
        rightInset: triggerRect.right - rect.right,
        centreDelta: Math.abs(
          rect.top + rect.height / 2 - (triggerRect.top + triggerRect.height / 2),
        ),
        expectedPrimary: resolveColor('--action-primary-bg'),
      };
    }),
  ]);
  expect(sortGeometry[0]).not.toBeNull();
  expect(sortGeometry[1]).not.toBeNull();
  expect(Math.abs(sortGeometry[0]!.width - 148)).toBeLessThanOrEqual(1);
  expect(sortGeometry[1]!.width).toBeGreaterThanOrEqual(192);
  expect(sortGeometry[1]!.y - (sortGeometry[0]!.y + sortGeometry[0]!.height)).toBeCloseTo(8, 0);
  expect(sortGeometry[1]!.x + sortGeometry[1]!.width).toBeLessThanOrEqual(
    sortGeometry[0]!.x + sortGeometry[0]!.width + 1,
  );
  expect(sortGeometry[1]!.x).toBeGreaterThanOrEqual(16);
  expect(sortGeometry[1]!.x + sortGeometry[1]!.width).toBeLessThanOrEqual(1264);
  const sortPresentation = await sortListbox.evaluate((listbox) => {
    const option = listbox.querySelector<HTMLElement>('[role="option"]');
    if (!option) throw new Error('Custom Sort option is missing.');
    return {
      padding: getComputedStyle(listbox).padding,
      optionRadius: getComputedStyle(option).borderRadius,
    };
  });
  expect(sortPresentation).toEqual({ padding: '8px', optionRadius: '8px' });
  expect(sortGeometry[2].color).toBe(sortGeometry[2].expectedPrimary);
  expect(sortGeometry[2].angle).toBeCloseTo(225, 1);
  expect((sortGeometry[2].angle - sortIdle.angle + 360) % 360).toBeCloseTo(180, 1);
  expect(Math.abs(sortGeometry[2].rightInset - sortIdle.rightInset)).toBeLessThanOrEqual(1);
  expect(sortGeometry[2].centreDelta).toBeLessThanOrEqual(1);
  expect(page.url()).toBe(sortUrlBeforeHover);
  expect(requests).toHaveLength(requestCountBeforeHover);
  const lowToHighOption = sortListbox.getByRole('option', { name: 'Low to High' });
  await lowToHighOption.evaluate((option) => {
    const tooltip = document.activeElement
      ?.closest<HTMLElement>('[data-part="course-card"]')
      ?.querySelector<HTMLElement>('[role="tooltip"]');
    const rect = option.getBoundingClientRect();
    if (!tooltip) throw new Error('Focused course tooltip is required for Sort layering coverage.');
    tooltip.style.setProperty(
      'transform',
      `translate3d(${rect.left}px, ${rect.top}px, 0)`,
      'important',
    );
  });
  await lowToHighOption.hover();
  const sortHit = await lowToHighOption.evaluate((option) => {
    const rect = option.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {
      listboxHit: hit?.closest('[role="listbox"]') === option.closest('[role="listbox"]'),
      tooltipHit: Boolean(hit?.closest('[role="tooltip"]')),
    };
  });
  expect(sortHit).toEqual({ listboxHit: true, tooltipHit: false });
  await expect(sortTrigger).toHaveAttribute('aria-expanded', 'true');
  await lowToHighOption.evaluate(() => {
    document.activeElement
      ?.closest<HTMLElement>('[data-part="course-card"]')
      ?.querySelector<HTMLElement>('[role="tooltip"]')
      ?.style.removeProperty('transform');
  });
  await expect(sortListbox).toHaveAttribute(
    'aria-activedescendant',
    (await lowToHighOption.getAttribute('id')) ?? '',
  );
  const purple = 'rgb(91, 63, 214)';
  for (const { target, expectsBorder } of [
    { target: filters.getByLabel('Min price'), expectsBorder: false },
    { target: filters.getByLabel('Max price'), expectsBorder: false },
    { target: sortTrigger, expectsBorder: true },
    { target: focusedCourseLink, expectsBorder: false },
  ]) {
    await target.focus();
    expect(await target.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    await expect(target).toHaveCSS('outline-color', purple);
    if (expectsBorder) await expect(target).toHaveCSS('border-color', purple);
  }
  await sortTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(sortListbox).toBeFocused();
  await expect(sortListbox).toHaveCSS('outline-color', purple);
  await expect(sortListbox).toHaveCSS('border-color', purple);
  const optionGeometry = await sortListbox.evaluate((listbox) => {
    const selected = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (option) => option.getAttribute('aria-selected') === 'true',
    );
    const activeId = listbox.getAttribute('aria-activedescendant');
    const active = activeId ? document.getElementById(activeId) : null;
    const unselected = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')).find(
      (option) => option.getAttribute('aria-selected') === 'false',
    );
    if (!selected || !unselected || !active)
      throw new Error('Custom sort option states are missing.');
    const selectedRadio = selected.querySelector<HTMLElement>('[data-part="catalog-sort-radio"]');
    const unselectedRadio = unselected.querySelector<HTMLElement>(
      '[data-part="catalog-sort-radio"]',
    );
    if (!selectedRadio || !unselectedRadio)
      throw new Error('Custom sort radio visuals are missing.');
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
    const read = (option: HTMLElement, radio: HTMLElement) => ({
      fontSize: getComputedStyle(option).fontSize,
      lineHeight: getComputedStyle(option).lineHeight,
      radio: {
        width: getComputedStyle(radio).width,
        height: getComputedStyle(radio).height,
        radius: getComputedStyle(radio).borderTopLeftRadius,
        border: getComputedStyle(radio).borderColor,
        background: getComputedStyle(radio).backgroundImage,
      },
    });
    return {
      selected: read(selected, selectedRadio),
      unselected: read(unselected, unselectedRadio),
      activeBackground: getComputedStyle(active).backgroundColor,
      expected: {
        primary: resolveColor('--action-primary-bg'),
        neutral: resolveColor('--border-default'),
        highlight: resolveBackground('--state-control-highlight'),
      },
    };
  });
  expect(optionGeometry.selected.fontSize).toBe('13px');
  expect(optionGeometry.selected.lineHeight).toBe('18px');
  expect(optionGeometry.unselected.fontSize).toBe('13px');
  expect(optionGeometry.unselected.lineHeight).toBe('18px');
  expect(optionGeometry.selected.radio.width).toBe('16px');
  expect(optionGeometry.selected.radio.height).toBe('16px');
  expect(optionGeometry.unselected.radio.width).toBe('16px');
  expect(optionGeometry.unselected.radio.height).toBe('16px');
  expect(Number.parseFloat(optionGeometry.selected.radio.radius)).toBeGreaterThanOrEqual(8);
  expect(Number.parseFloat(optionGeometry.unselected.radio.radius)).toBeGreaterThanOrEqual(8);
  expect(optionGeometry.unselected.radio.border).toBe(optionGeometry.expected.neutral);
  expect(optionGeometry.unselected.radio.background).toBe('none');
  expect(optionGeometry.selected.radio.border).toBe(optionGeometry.expected.primary);
  expect(optionGeometry.selected.radio.background).toContain(optionGeometry.expected.primary);
  expect(optionGeometry.selected.radio.background).toContain('3px');
  expect(optionGeometry.activeBackground).toBe(optionGeometry.expected.highlight);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(0, 0);
  await expect(sortListbox).toHaveCount(0);
  await sortTrigger.hover();
  await page.waitForTimeout(20);
  const reducedMotionChevron = await page
    .locator('[data-part="catalog-sort-chevron"]')
    .evaluate((chevron) => {
      const style = getComputedStyle(chevron);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return {
        color: style.color,
        angle: ((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI + 360) % 360,
        duration: style.transitionDuration,
      };
    });
  expect(reducedMotionChevron.color).toBe(sortGeometry[2].expectedPrimary);
  expect(reducedMotionChevron.angle).toBeCloseTo(225, 1);
  expect(reducedMotionChevron.duration).toBe('0s');
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
  await expect(sortTrigger).toBeFocused();
  const sortLabel = page.locator('[data-part="catalog-sort-toolbar"] > div > span:first-child');
  const priceLabel = filters.locator('legend');
  const labelParity = await Promise.all([
    priceLabel.evaluate((label) => {
      const style = getComputedStyle(label);
      return {
        color: style.color,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      };
    }),
    sortLabel.evaluate((label) => {
      const style = getComputedStyle(label);
      return {
        color: style.color,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      };
    }),
  ]);
  expect(labelParity[0]).toEqual(labelParity[1]);
  const toolbarGeometry = await Promise.all([
    resultHeading.boundingBox(),
    toolbarControls.boundingBox(),
    filters.boundingBox(),
    page.locator('[data-part="catalog-sort-toolbar"]').boundingBox(),
    sortLabel.boundingBox(),
    sortTrigger.boundingBox(),
    page.locator('[data-part="catalog-result-list"]').boundingBox(),
  ]);
  expect(toolbarGeometry.every(Boolean)).toBe(true);
  expect(
    Math.abs(
      toolbarGeometry[1]!.x +
        toolbarGeometry[1]!.width -
        (toolbarGeometry[6]!.x + toolbarGeometry[6]!.width),
    ),
  ).toBeLessThanOrEqual(1);
  expect(toolbarGeometry[2]!.x + toolbarGeometry[2]!.width).toBeLessThanOrEqual(
    toolbarGeometry[3]!.x,
  );
  expect(
    Math.abs(
      toolbarGeometry[2]!.y +
        toolbarGeometry[2]!.height / 2 -
        (toolbarGeometry[3]!.y + toolbarGeometry[3]!.height / 2),
    ),
  ).toBeLessThanOrEqual(1);
  expect(toolbarGeometry[4]!.x + toolbarGeometry[4]!.width).toBeLessThanOrEqual(
    toolbarGeometry[5]!.x,
  );
  expect(
    Math.abs(
      toolbarGeometry[4]!.y +
        toolbarGeometry[4]!.height / 2 -
        (toolbarGeometry[5]!.y + toolbarGeometry[5]!.height / 2),
    ),
  ).toBeLessThanOrEqual(1);
  const desktopPriceControls = await Promise.all([
    filters.getByLabel('Min price').boundingBox(),
    filters.getByLabel('Max price').boundingBox(),
  ]);
  expect(desktopPriceControls.every(Boolean)).toBe(true);
  expect(Math.abs(desktopPriceControls[0]!.width - 120)).toBeLessThanOrEqual(1);
  expect(Math.abs(desktopPriceControls[1]!.width - 120)).toBeLessThanOrEqual(1);
  expect(Math.abs(desktopPriceControls[0]!.height - 44)).toBeLessThanOrEqual(1);
  expect(Math.abs(desktopPriceControls[1]!.height - 44)).toBeLessThanOrEqual(1);
  expect(Math.abs(toolbarGeometry[5]!.height - 44)).toBeLessThanOrEqual(1);
  expect(Math.abs(toolbarGeometry[5]!.width - 148)).toBeLessThanOrEqual(1);
  expect(toolbarGeometry[5]!.y + toolbarGeometry[5]!.height).toBeLessThanOrEqual(
    toolbarGeometry[6]!.y,
  );
  expect(
    Math.abs(
      toolbarGeometry[0]!.y +
        toolbarGeometry[0]!.height / 2 -
        (toolbarGeometry[1]!.y + toolbarGeometry[1]!.height / 2),
    ),
  ).toBeLessThanOrEqual(1);
  const resultsColumnGeometry = await Promise.all([
    page.locator('[data-part="catalog-discovery-layout"]').boundingBox(),
    page.locator('[data-part="catalog-discovery-results"]').boundingBox(),
  ]);
  expect(resultsColumnGeometry.every(Boolean)).toBe(true);
  expect(Math.abs(resultsColumnGeometry[0]!.x - resultsColumnGeometry[1]!.x)).toBeLessThanOrEqual(
    1,
  );
  expect(
    Math.abs(resultsColumnGeometry[0]!.width - resultsColumnGeometry[1]!.width),
  ).toBeLessThanOrEqual(1);

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
  const priceUrlBeforeApply = page.url();
  const requestCountBeforePriceApply = requests.length;
  await minimum.fill('10');
  await minimum.press('Tab');
  await expect(maximum).toBeFocused();
  await expect(page).toHaveURL(priceUrlBeforeApply);
  expect(requests).toHaveLength(requestCountBeforePriceApply);

  await maximum.fill('20');
  await maximum.press('Tab');
  await expect(page).toHaveURL(/search_query=JavaScript&min_price=10&max_price=20&sort=title/);
  await expect(sortTrigger).toBeFocused();
  await expect.poll(() => requests.length).toBe(requestCountBeforePriceApply + 1);
  await expect
    .poll(
      () =>
        requests.filter((requestUrl) => {
          const url = new URL(requestUrl);
          return (
            url.pathname === '/courses' &&
            url.search ===
              '?page=1&page_size=20&search_query=JavaScript&min_price=10&max_price=20&sort=title'
          );
        }).length,
    )
    .toBe(1);

  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
        document.body.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const compactPriceLabel = filters.locator('[data-part="catalog-filter-price-label"]');
  const compactSortLabel = sortLabel.locator('[class*="sortCompact"]');
  await expect(compactPriceLabel).toBeHidden();
  await expect(compactPriceLabel).toHaveAttribute('aria-hidden', 'true');
  await expect(compactSortLabel).toHaveText('Sort:');
  const mobilePriceLabels = await Promise.all(
    [filters.getByText('Min', { exact: true }), filters.getByText('Max', { exact: true })].map(
      async (label) => {
        const box = await label.boundingBox();
        return {
          box,
          clip: await label.evaluate((element) => getComputedStyle(element).clip),
          position: await label.evaluate((element) => getComputedStyle(element).position),
        };
      },
    ),
  );
  for (const label of mobilePriceLabels) {
    expect(label.box?.width).toBeGreaterThan(1);
    expect(label.box?.height).toBeGreaterThan(1);
    expect(label.clip).toBe('auto');
    expect(label.position).not.toBe('absolute');
  }
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveCount(0);
  const anonymousNavigation = page.getByRole('navigation', { name: 'Anonymous navigation' });
  await expect(anonymousNavigation.getByRole('link', { name: 'Catalog' })).toBeVisible();
  await expect(anonymousNavigation.getByRole('link', { name: 'Log in' })).toBeVisible();
  await expect(anonymousNavigation.getByRole('link', { name: 'Sign up' })).toBeVisible();
  await sortTrigger.focus();
  await expect(sortTrigger).toBeFocused();
  const mobileToolbarGeometry = await Promise.all([
    resultHeading.boundingBox(),
    toolbarControls.boundingBox(),
    filters.boundingBox(),
    page.locator('[data-part="catalog-sort-toolbar"]').boundingBox(),
    priceLabel.boundingBox(),
    sortLabel.boundingBox(),
    sortTrigger.boundingBox(),
    page.locator('[data-part="catalog-result-list"]').boundingBox(),
  ]);
  expect(mobileToolbarGeometry.every(Boolean)).toBe(true);
  expect(mobileToolbarGeometry[1]!.x).toBeGreaterThanOrEqual(0);
  expect(mobileToolbarGeometry[1]!.x + mobileToolbarGeometry[1]!.width).toBeLessThanOrEqual(320);
  expect(
    mobileToolbarGeometry[0]!.y < mobileToolbarGeometry[2]!.y ||
      (Math.abs(mobileToolbarGeometry[0]!.y - mobileToolbarGeometry[2]!.y) <= 12 &&
        mobileToolbarGeometry[0]!.x + mobileToolbarGeometry[0]!.width <=
          mobileToolbarGeometry[2]!.x),
  ).toBe(true);
  expect(
    mobileToolbarGeometry[2]!.y < mobileToolbarGeometry[3]!.y ||
      (Math.abs(mobileToolbarGeometry[2]!.y - mobileToolbarGeometry[3]!.y) <= 12 &&
        mobileToolbarGeometry[2]!.x + mobileToolbarGeometry[2]!.width <=
          mobileToolbarGeometry[3]!.x),
  ).toBe(true);

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const responsiveHeaderSearch = await catalogSearch.evaluate((form) => {
      const input = form.querySelector<HTMLInputElement>('input[name="search_query"]');
      const formRect = form.getBoundingClientRect();
      if (!input) throw new Error('Catalog header search controls are missing.');
      const inputRect = input.getBoundingClientRect();
      return {
        contained:
          formRect.left >= 0 &&
          formRect.right <= window.innerWidth &&
          inputRect.left >= 0 &&
          inputRect.right <= window.innerWidth,
      };
    });
    expect(responsiveHeaderSearch.contained).toBe(true);
    if (width === 768) {
      const tabletAnonymousHeader = await page
        .locator('[data-app-shell-header]')
        .evaluate((header) => {
          const search = header.querySelector<HTMLInputElement>('input[name="search_query"]');
          if (!search) throw new Error('Tablet catalog search control is missing.');
          const searchRect = search.getBoundingClientRect();
          return {
            searchLeft: searchRect.left,
            searchRight: searchRect.right,
            clientWidth: document.documentElement.clientWidth,
            overflowFree:
              document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
              document.body.scrollWidth <= document.documentElement.clientWidth,
          };
        });
      expect(tabletAnonymousHeader.searchLeft).toBeGreaterThanOrEqual(0);
      expect(tabletAnonymousHeader.searchRight).toBeLessThanOrEqual(
        tabletAnonymousHeader.clientWidth,
      );
      expect(tabletAnonymousHeader.overflowFree).toBe(true);
    }
    const responsiveToolbarGeometry = await Promise.all([
      resultHeading.boundingBox(),
      filters.boundingBox(),
      page.locator('[data-part="catalog-sort-toolbar"]').boundingBox(),
    ]);
    expect(responsiveToolbarGeometry.every(Boolean)).toBe(true);
    const comesBefore = (
      first: NonNullable<(typeof responsiveToolbarGeometry)[number]>,
      second: NonNullable<(typeof responsiveToolbarGeometry)[number]>,
    ) =>
      first.y < second.y ||
      (Math.abs(first.y - second.y) <= 1 && first.x + first.width <= second.x + 1);
    expect(comesBefore(responsiveToolbarGeometry[1]!, responsiveToolbarGeometry[2]!)).toBe(true);
    const responsiveCompactPriceLabel = filters.locator('[data-part="catalog-filter-price-label"]');
    if (width < 768) await expect(responsiveCompactPriceLabel).toBeHidden();
    const responsivePriceGeometry = await Promise.all([
      (width === 768 ? priceLabel : responsiveCompactPriceLabel).boundingBox(),
      filters.getByLabel('Min price').boundingBox(),
      filters.getByLabel('Max price').boundingBox(),
      sortTrigger.boundingBox(),
    ]);
    expect(responsivePriceGeometry.slice(1).every(Boolean)).toBe(true);
    if (width === 768) {
      expect(
        Math.abs(
          responsivePriceGeometry[0]!.y +
            responsivePriceGeometry[0]!.height / 2 -
            (responsivePriceGeometry[1]!.y + responsivePriceGeometry[1]!.height / 2),
        ),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(responsivePriceGeometry[1]!.width - responsivePriceGeometry[2]!.width),
      ).toBeLessThanOrEqual(5);
      expect(Math.abs(responsivePriceGeometry[1]!.width - 120)).toBeLessThanOrEqual(1);
      expect(Math.abs(responsivePriceGeometry[3]!.width - 148)).toBeLessThanOrEqual(1);
    } else {
      expect(responsivePriceGeometry[0]).toBeNull();
      expect(
        Math.abs(responsivePriceGeometry[1]!.y - responsivePriceGeometry[2]!.y),
      ).toBeLessThanOrEqual(1);
      expect(responsivePriceGeometry[1]!.x).toBeLessThan(responsivePriceGeometry[2]!.x);
      expect(responsivePriceGeometry[1]!.width).toBeGreaterThanOrEqual(128);
      expect(responsivePriceGeometry[2]!.width).toBeGreaterThanOrEqual(128);
    }
    for (const input of [filters.getByLabel('Min price'), filters.getByLabel('Max price')]) {
      await input.focus();
      await expect(input).toBeFocused();
      expect(await input.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
      await expect(input).toHaveCSS('outline-color', purple);
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }

  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'Log in' })).toBeVisible();
  await expect(page.getByRole('search', { name: 'Course catalog search' })).toHaveCount(0);
  expect(mobileToolbarGeometry[6]!.x + mobileToolbarGeometry[6]!.width).toBeLessThanOrEqual(320);
  expect(mobileToolbarGeometry[6]!.y + mobileToolbarGeometry[6]!.height).toBeLessThanOrEqual(
    mobileToolbarGeometry[7]!.y,
  );
  assertClean();
});

test('remembers catalog searches in an accessible local combobox without changing the catalog URL contract', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=2&page_size=20&min_price=5&sort=title',
    errorText: 'net::ERR_ABORTED',
  });
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&search_query=TypeScript&min_price=5&sort=title',
    errorText: 'net::ERR_ABORTED',
  });
  const requests: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem(
      'learnhub.catalog-search-history',
      JSON.stringify(['React Basics', 'TypeScript', 'react advanced', 'CSS']),
    );
  });
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()]),
    });
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
  await expect(input).toHaveAttribute('aria-controls', (await listbox.getAttribute('id')) ?? '');
  await input.press('ArrowDown');
  await expect(listbox.getByRole('option', { name: 'React Basics' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
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
    const input = document.querySelector<HTMLInputElement>(
      'form[role="search"] input[name="search_query"]',
    );
    if (!input) throw new Error('Catalog search input is missing.');
    const listRect = list.getBoundingClientRect();
    const inputRect = input.getBoundingClientRect();
    const centre = document.elementFromPoint(
      listRect.left + listRect.width / 2,
      listRect.top + Math.min(12, listRect.height / 2),
    );
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
    const geometry = await page
      .getByRole('listbox', { name: 'Recent searches' })
      .evaluate((list) => {
        const rect = list.getBoundingClientRect();
        const form = document.querySelector<HTMLElement>('form[role="search"]');
        const input = form?.querySelector<HTMLInputElement>('input[name="search_query"]');
        const inner = document.querySelector<HTMLElement>('[data-app-shell-header] > :first-child');
        if (!form || !input || !inner)
          throw new Error('Catalog header centering targets are missing.');
        const formRect = form.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        const innerRect = inner.getBoundingClientRect();
        return {
          contained: rect.left >= 0 && rect.right <= document.documentElement.clientWidth,
          overflowFree:
            document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
            document.body.scrollWidth <= document.documentElement.clientWidth,
          listMatchesInput:
            Math.abs(rect.width - inputRect.width) <= 1 &&
            Math.abs(rect.left - inputRect.left) <= 1,
          formCenterDelta: Math.abs(
            formRect.left + formRect.width / 2 - (innerRect.left + innerRect.width / 2),
          ),
          inputCenterDelta: Math.abs(
            inputRect.left + inputRect.width / 2 - (innerRect.left + innerRect.width / 2),
          ),
        };
      });
    expect(geometry.contained).toBe(true);
    expect(geometry.overflowFree).toBe(true);
    expect(geometry.listMatchesInput).toBe(true);
    if (width >= 768) {
      expect(geometry.formCenterDelta).toBeLessThanOrEqual(64);
      expect(geometry.inputCenterDelta).toBeLessThanOrEqual(64);
    }
  }

  await page.getByRole('contentinfo').click();
  await expect(page.getByRole('listbox', { name: 'Recent searches' })).toHaveCount(0);
  await page.reload();
  await input.focus();
  await expect(page.getByRole('option', { name: 'TypeScript' })).toBeVisible();
  assertClean();
});

test('canonicalizes an inverted range and honors single-page pagination availability', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&search_query=React&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()], {
        pages: 1,
        total: 1,
        has_next: false,
        has_previous: false,
      }),
    });
  });

  await page.goto('/?search_query=React&min_price=30&max_price=10&page=1');
  await expect(page).toHaveURL('/?search_query=React');
  expect(requests).not.toContainEqual(expect.stringContaining('min_price='));
  expect(requests).not.toContainEqual(expect.stringContaining('max_price='));
  await expect(page.getByRole('button', { name: 'Go to next page' })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Found 1 course' })).toBeVisible();
  expect([1, 2]).toContain(requests.length);
  expect(requests.every((request) => new URL(request).searchParams.get('page') === '1')).toBe(true);
  assertClean();
});

test('keeps an inverted price range invalid, then submits a corrected value without duplicate requests', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  const requests: string[] = [];
  await page.route('**/courses**', async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()]),
    });
  });

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  expect(await page.evaluate(() => window.innerWidth)).toBe(320);
  await expect(page.getByRole('link', { name: 'React' })).toBeVisible();
  const requestCountBeforeInvalidSubmit = requests.length;
  const minimum = page.getByLabel('Min price');
  const maximum = page.getByLabel('Max price');
  await expect(page.getByRole('group', { name: 'Price range' })).toBeVisible();
  await expect(minimum).toHaveAccessibleName('Min price');
  await expect(maximum).toHaveAccessibleName('Max price');
  await minimum.fill('-1');
  await page.keyboard.press('Tab');
  await expect(maximum).toBeFocused();

  await expect(page).toHaveURL('/');
  expect(requests).toHaveLength(requestCountBeforeInvalidSubmit);

  await page.keyboard.press('Shift+Tab');
  await expect(minimum).toBeFocused();
  await expect(page).toHaveURL('/');
  expect(requests).toHaveLength(requestCountBeforeInvalidSubmit);

  await minimum.press('Enter');

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

  const requestCountBeforeNegativeMaximum = requests.length;
  await maximum.fill('-1');
  await maximum.press('Enter');
  await expect(page.getByText('Enter a non-negative price.')).toBeVisible();
  await expect(maximum).toHaveAttribute('aria-invalid', 'true');
  await expect(maximum).toHaveAttribute('aria-describedby', /-error/);
  await expect(page.getByText('Maximum price must be at least the minimum price.')).toHaveCount(0);
  await expect(page).toHaveURL('/?min_price=5');
  expect(requests).toHaveLength(requestCountBeforeNegativeMaximum);

  const requestCountBeforeInvertedSubmit = requests.length;
  await maximum.fill('3');
  await page.keyboard.press('Shift+Tab');
  await expect(minimum).toBeFocused();

  await expect(page).toHaveURL('/?min_price=5');
  expect(requests).toHaveLength(requestCountBeforeInvertedSubmit);

  await minimum.press('Enter');
  await expect(page.getByText('Maximum price must be at least the minimum price.')).toBeVisible();
  await expect(maximum).toHaveAttribute('aria-invalid', 'true');
  await expect(maximum).toHaveAttribute('aria-describedby', /-error/);
  await expect(page).toHaveURL('/?min_price=5');
  expect(requests).toHaveLength(requestCountBeforeInvertedSubmit);

  await maximum.fill('15');
  await maximum.press('Enter');
  await expect(page).toHaveURL('/?min_price=5&max_price=15');
  await expect.poll(() => requests.length).toBe(requestCountBeforeInvertedSubmit + 1);
  const recoveredRequest = requests[requests.length - 1];
  expect(recoveredRequest).toContain('min_price=5');
  expect(recoveredRequest).toContain('max_price=15');
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
        document.body.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  assertClean();
});

test('contains a right-exhausted left course tooltip without horizontal document overflow', async ({
  page,
}, testInfo) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  const longUnbrokenTitle =
    'CourseTitleWithAnUninterruptedValueThatMustNeverCreateAnInternalTooltipScrollbarOrEscapeItsMeasuredReadingSurface';
  const longDescription = `${Array.from(
    { length: 24 },
    () =>
      'A deliberately long course description confirms normal prose remains readable inside the fixed non-interactive tooltip.',
  ).join(' ')} https://catalog.example.test/${'unbroken-description-value-'.repeat(28)}`;
  await page.route('**/courses**', async (route) => {
    const items = [
      { ...permittedCourse(longUnbrokenTitle), id: 7, description: longDescription },
      { ...permittedCourse(longUnbrokenTitle), id: 8, description: longDescription },
      { ...permittedCourse(longUnbrokenTitle), id: 9, description: longDescription },
      { ...permittedCourse(longUnbrokenTitle), id: 10, description: longDescription },
    ];
    await route.fulfill({ status: 200, contentType: 'application/json', body: response(items) });
  });

  await page.goto('/');
  const cards = page.locator('[data-part="course-card"]');
  const recordedGeometry: string[] = [];
  await expect(cards).toHaveCount(4);
  for (const width of [1280, 1100, 768]) {
    if (await page.getByRole('tooltip').count()) {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('tooltip')).toHaveCount(0);
    }
    await page.setViewportSize({ width, height: 900 });
    const rightmostIndex = await cards.evaluateAll((elements) =>
      elements.reduce(
        (rightmost, element, index) =>
          element.getBoundingClientRect().right > elements[rightmost].getBoundingClientRect().right
            ? index
            : rightmost,
        0,
      ),
    );
    const card = cards.nth(rightmostIndex);
    const cardId = await card.getAttribute('data-course-card-id');
    await card.locator('a[href^="/courses/"]').hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toHaveCount(1);
    await expect
      .poll(() =>
        tooltip.evaluate(
          (element) =>
            element.closest<HTMLElement>('[data-course-card-id]')?.dataset.courseCardId ?? null,
        ),
      )
      .toBe(cardId);
    const geometry = await tooltip.evaluate((element) => {
      const card = element.closest<HTMLElement>('[data-part="course-card"]');
      if (!card) throw new Error('Rightmost course-card tooltip owner is missing.');
      const style = getComputedStyle(element);
      const readingSurface = element.querySelector<HTMLElement>(
        '[data-part="course-card-tooltip-content"]',
      );
      if (!readingSurface) throw new Error('CourseCard tooltip reading surface is missing.');
      const readingSurfaceStyle = getComputedStyle(readingSurface);
      const textChildren = [
        element.querySelector<HTMLElement>('[class*="tooltipNotice"]'),
        element.querySelector<HTMLElement>('[class*="tooltipCourse"]'),
        element.querySelector<HTMLElement>('[class*="tooltipDescription"]'),
      ]
        .filter((child): child is HTMLElement => child !== null)
        .map((child) => {
          const childStyle = getComputedStyle(child);
          return {
            className: child.className,
            clientWidth: child.clientWidth,
            scrollWidth: child.scrollWidth,
            rect: child.getBoundingClientRect().toJSON(),
            computed: {
              boxSizing: childStyle.boxSizing,
              width: childStyle.width,
              minWidth: childStyle.minWidth,
              maxWidth: childStyle.maxWidth,
              overflowX: childStyle.overflowX,
              overflowY: childStyle.overflowY,
              overflowWrap: childStyle.overflowWrap,
              whiteSpace: childStyle.whiteSpace,
              wordBreak: childStyle.wordBreak,
            },
          };
        });
      const arrow = getComputedStyle(element, '::before');
      const ancestors = [
        element.parentElement,
        element.parentElement?.parentElement,
        document.body,
        document.documentElement,
      ]
        .filter((ancestor): ancestor is HTMLElement => ancestor !== null)
        .map((ancestor) => ({
          tag: ancestor.tagName,
          overflowX: getComputedStyle(ancestor).overflowX,
          scrollWidth: ancestor.scrollWidth,
          clientWidth: ancestor.clientWidth,
        }));
      const tooltipRect = element.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      return {
        clientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        placement: element.getAttribute('data-placement'),
        tooltip: {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          rect: tooltipRect.toJSON(),
          computed: {
            position: style.position,
            boxSizing: style.boxSizing,
            width: style.width,
            minWidth: style.minWidth,
            maxWidth: style.maxWidth,
            paddingInlineStart: style.paddingInlineStart,
            paddingInlineEnd: style.paddingInlineEnd,
            borderInlineStartWidth: style.borderInlineStartWidth,
            borderInlineEndWidth: style.borderInlineEndWidth,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            overflowWrap: style.overflowWrap,
            whiteSpace: style.whiteSpace,
            wordBreak: style.wordBreak,
          },
        },
        readingSurface: {
          clientWidth: readingSurface.clientWidth,
          scrollWidth: readingSurface.scrollWidth,
          offsetWidth: readingSurface.offsetWidth,
          clientHeight: readingSurface.clientHeight,
          scrollHeight: readingSurface.scrollHeight,
          rect: readingSurface.getBoundingClientRect().toJSON(),
          computed: {
            boxSizing: readingSurfaceStyle.boxSizing,
            width: readingSurfaceStyle.width,
            minWidth: readingSurfaceStyle.minWidth,
            maxWidth: readingSurfaceStyle.maxWidth,
            overflowX: readingSurfaceStyle.overflowX,
            overflowY: readingSurfaceStyle.overflowY,
            overflowWrap: readingSurfaceStyle.overflowWrap,
            whiteSpace: readingSurfaceStyle.whiteSpace,
            wordBreak: readingSurfaceStyle.wordBreak,
          },
        },
        card: cardRect.toJSON(),
        textChildren,
        arrow: {
          left: arrow.left,
          right: arrow.right,
          width: arrow.width,
          borderLeftWidth: arrow.borderLeftWidth,
          borderRightWidth: arrow.borderRightWidth,
        },
        computed: { transform: style.transform },
        ancestors,
      };
    });
    expect(geometry.placement).toBe('left');
    expect(geometry.tooltip.rect.left).toBeGreaterThanOrEqual(12);
    expect(geometry.tooltip.rect.right).toBeLessThanOrEqual(geometry.clientWidth - 12);
    // The placement shell deliberately leaves its 9px outer connector border outside the reading box.
    // Horizontal scrolling is forbidden on the inner reading surface, not on that arrow shell.
    expect(geometry.tooltip.scrollWidth).toBeLessThanOrEqual(geometry.tooltip.clientWidth + 9);
    expect(geometry.readingSurface.scrollWidth).toBeLessThanOrEqual(
      geometry.readingSurface.clientWidth,
    );
    expect(geometry.readingSurface.offsetWidth).toBeGreaterThanOrEqual(
      geometry.readingSurface.scrollWidth,
    );
    expect(geometry.textChildren.every((child) => child.scrollWidth <= child.clientWidth)).toBe(
      true,
    );
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    if (width === 390) {
      expect(geometry.readingSurface.scrollHeight).toBeGreaterThan(
        geometry.readingSurface.clientHeight,
      );
      expect(geometry.readingSurface.computed.overflowY).toBe('auto');
    }
    recordedGeometry.push(JSON.stringify({ width, ...geometry }));
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  const leftmostIndex = await cards.evaluateAll((elements) =>
    elements.reduce(
      (leftmost, element, index) =>
        element.getBoundingClientRect().left < elements[leftmost].getBoundingClientRect().left
          ? index
          : leftmost,
      0,
    ),
  );
  await cards.nth(leftmostIndex).locator('a[href^="/courses/"]').hover();
  const rightPlacementGeometry = await page.getByRole('tooltip').evaluate((element) => {
    const readingSurface = element.querySelector<HTMLElement>(
      '[data-part="course-card-tooltip-content"]',
    );
    if (!readingSurface) throw new Error('CourseCard tooltip reading surface is missing.');
    return {
      placement: element.getAttribute('data-placement'),
      tooltip: element.getBoundingClientRect().toJSON(),
      readingSurface: {
        clientWidth: readingSurface.clientWidth,
        scrollWidth: readingSurface.scrollWidth,
        clientHeight: readingSurface.clientHeight,
        scrollHeight: readingSurface.scrollHeight,
        overflowX: getComputedStyle(readingSurface).overflowX,
        overflowY: getComputedStyle(readingSurface).overflowY,
      },
      clientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    };
  });
  expect(rightPlacementGeometry.placement).toBe('right');
  expect(rightPlacementGeometry.tooltip.left).toBeGreaterThanOrEqual(12);
  expect(rightPlacementGeometry.tooltip.right).toBeLessThanOrEqual(
    rightPlacementGeometry.clientWidth - 12,
  );
  expect(rightPlacementGeometry.readingSurface.scrollWidth).toBeLessThanOrEqual(
    rightPlacementGeometry.readingSurface.clientWidth,
  );
  expect(rightPlacementGeometry.documentScrollWidth).toBeLessThanOrEqual(
    rightPlacementGeometry.clientWidth,
  );
  expect(rightPlacementGeometry.bodyScrollWidth).toBeLessThanOrEqual(
    rightPlacementGeometry.clientWidth,
  );
  recordedGeometry.push(
    JSON.stringify({ width: 1280, edge: 'leftmost-right-placement', ...rightPlacementGeometry }),
  );
  await page.getByRole('heading', { level: 2, name: 'Found 4 courses' }).hover();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '200%';
  });
  const zoomBaseline = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  const zoomedRightmostIndex = await cards.evaluateAll((elements) =>
    elements.reduce(
      (rightmost, element, index) =>
        element.getBoundingClientRect().right > elements[rightmost].getBoundingClientRect().right
          ? index
          : rightmost,
      0,
    ),
  );
  const zoomedCard = cards.nth(zoomedRightmostIndex);
  await zoomedCard.locator('a[href^="/courses/"]').hover();
  const zoomedGeometry = await page.getByRole('tooltip').evaluate((element) => {
    const card = element.closest<HTMLElement>('[data-part="course-card"]');
    if (!card) throw new Error('Zoomed course-card tooltip owner is missing.');
    const style = getComputedStyle(element);
    const readingSurface = element.querySelector<HTMLElement>(
      '[data-part="course-card-tooltip-content"]',
    );
    if (!readingSurface) throw new Error('Zoomed CourseCard tooltip reading surface is missing.');
    return {
      clientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      placement: element.getAttribute('data-placement'),
      documentZoom: getComputedStyle(document.documentElement).zoom,
      tooltip: element.getBoundingClientRect().toJSON(),
      readingSurface: {
        clientWidth: readingSurface.clientWidth,
        scrollWidth: readingSurface.scrollWidth,
        clientHeight: readingSurface.clientHeight,
        scrollHeight: readingSurface.scrollHeight,
        overflowX: getComputedStyle(readingSurface).overflowX,
        overflowY: getComputedStyle(readingSurface).overflowY,
      },
      card: card.getBoundingClientRect().toJSON(),
      computed: { left: style.left, width: style.width, transform: style.transform },
    };
  });
  recordedGeometry.push(
    JSON.stringify({ width: 1280, zoom: '200%', baseline: zoomBaseline, ...zoomedGeometry }),
  );
  await testInfo.attach('course-card-left-tooltip-containment-geometry', {
    body: `[${recordedGeometry.join(',')}]`,
    contentType: 'application/json',
  });
  expect(zoomedGeometry.tooltip.left).toBeGreaterThanOrEqual(12);
  expect(zoomedGeometry.tooltip.right).toBeLessThanOrEqual(zoomedGeometry.clientWidth - 12);
  expect(zoomedGeometry.readingSurface.scrollWidth).toBeLessThanOrEqual(
    zoomedGeometry.readingSurface.clientWidth,
  );
  // Root CSS zoom expands this existing catalog harness before a tooltip mounts.
  // The CourseCard regression must prove that the fixed overlay never adds to it.
  expect(zoomedGeometry.documentScrollWidth).toBeLessThanOrEqual(zoomBaseline.documentScrollWidth);
  expect(zoomedGeometry.bodyScrollWidth).toBeLessThanOrEqual(zoomBaseline.bodyScrollWidth);
  await page.evaluate(() => {
    document.documentElement.style.zoom = '';
  });
  await testInfo.attach('course-card-left-tooltip-containment', {
    body: `[${recordedGeometry.join(',')}]`,
    contentType: 'application/json',
  });
  assertClean();
});

test('renders the DD-174 quiet cart state and Details disclosure without changing actions', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  assertClean.allowRequestFailure({ method: 'GET', path: '/cart', errorText: 'net::ERR_ABORTED' });
  expect(JSON.parse(response())).toMatchObject({
    items: [],
    page: 1,
    page_size: 20,
    total: 0,
    pages: 0,
    has_next: false,
    has_previous: false,
  });
  expect(JSON.parse(response([permittedCourse()]))).toMatchObject({
    total: 1,
    pages: 1,
  });
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'student@example.test',
        name: 'Student',
        surname: 'One',
        role: 'student',
        birthday: null,
        phone_number: null,
        created_at: '2026-01-01T00:00:00Z',
      }),
    });
  });
  await page.route('**/cart', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        items: [
          {
            id: 11,
            course_id: 7,
            added_at: '2026-01-01T00:00:00Z',
            course: { id: 7, title: 'React', price: '9.99', currency: 'USD' },
          },
        ],
        total_price: '9.99',
        currency: 'USD',
        item_count: 1,
      }),
    });
  });
  await page.route('**/enrollments/my**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: response() });
  });
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()]),
    });
  });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/');
  const card = page
    .locator('[data-part="course-card"]')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'React' }) });
  const button = card.getByRole('button', { name: 'View course details' });
  const pill = button.locator('[data-part="course-card-disclosure-pill"]');
  await expect(card.locator('[data-part="course-card-cart-status"]')).toHaveCount(0);
  await expect(pill).toHaveText('Details');

  const readPillState = async () =>
    pill.evaluate((element) => {
      const buttonElement = element.closest('button');
      if (!buttonElement) throw new Error('Disclosure button is missing.');
      const pillRect = element.getBoundingClientRect();
      const buttonRect = buttonElement.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderColor,
        color: style.color,
        outlineColor: style.outlineColor,
        outlineWidth: style.outlineWidth,
        pillWidth: pillRect.width,
        pillHeight: pillRect.height,
        buttonHeight: buttonRect.height,
      };
    });

  const idle = await readPillState();
  expect(idle.background).toBe('rgb(255, 255, 255)');
  expect(idle.border).toBe('rgb(209, 213, 219)');
  expect(idle.color).toBe('rgb(17, 24, 39)');
  expect(idle.buttonHeight).toBeGreaterThanOrEqual(idle.pillHeight);

  await button.hover();
  const hovered = await readPillState();
  expect(hovered.background).toBe('rgb(255, 255, 255)');
  expect(hovered.border).toBe('rgb(91, 63, 214)');
  expect(hovered.color).toBe('rgb(17, 24, 39)');

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  const pinned = await readPillState();
  expect(pinned.background).toBe('rgb(255, 255, 255)');
  expect(pinned.border).toBe('rgb(91, 63, 214)');
  expect(pinned.color).toBe('rgb(17, 24, 39)');

  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  const focused = await readPillState();
  expect(focused.outlineWidth).toBe('2px');
  expect(focused.outlineColor).toBe('rgb(91, 63, 214)');
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
        document.body.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  assertClean();
});

test('renders the DD-045 CourseCard action and status system without changing action behavior', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  assertClean.allowRequestFailure({ method: 'GET', path: '/cart', errorText: 'net::ERR_ABORTED' });
  const mutationRequests: string[] = [];
  let addCourse7ToCart = false;
  let releaseAddRequest!: () => void;
  const addRequestGate = new Promise<void>((resolve) => {
    releaseAddRequest = resolve;
  });
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' || request.method() === 'DELETE')
      mutationRequests.push(`${request.method()} ${path}`);
  });
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'student@example.test',
        name: 'Student',
        surname: 'One',
        role: 'student',
        birthday: null,
        phone_number: null,
        created_at: '2026-01-01T00:00:00Z',
      }),
    });
  });
  await page.route('**/cart**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/cart/items') {
      await addRequestGate;
      addCourse7ToCart = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 13,
          course_id: 7,
          added_at: '2026-01-01T00:00:00Z',
          course: { id: 7, title: 'Add course', price: '9.99', currency: 'USD' },
        }),
      });
      return;
    }
    if (path !== '/cart') {
      await route.fallback();
      return;
    }
    const items = [
      {
        id: 12,
        course_id: 10,
        added_at: '2026-01-01T00:00:00Z',
        course: { id: 10, title: 'Remove course', price: '9.99', currency: 'USD' },
      },
      ...(addCourse7ToCart
        ? [
            {
              id: 13,
              course_id: 7,
              added_at: '2026-01-01T00:00:00Z',
              course: { id: 7, title: 'Add course', price: '9.99', currency: 'USD' },
            },
          ]
        : []),
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        items,
        total_price: addCourse7ToCart ? '19.98' : '9.99',
        currency: 'USD',
        item_count: items.length,
      }),
    });
  });
  await page.route('**/enrollments/my**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 22,
            user_id: 1,
            course_id: 9,
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            course: {
              id: 9,
              title: 'Enrolled course',
              description: null,
              price: '9.99',
              currency: 'USD',
            },
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      }),
    });
  });
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([
        { ...permittedCourse('Add course'), id: 7, price: '9.99' },
        { ...permittedCourse('Free course'), id: 8, price: '0.00' },
        { ...permittedCourse('Enrolled course'), id: 9, price: '9.99' },
        { ...permittedCourse('Remove course'), id: 10, price: '9.99' },
        { ...permittedCourse('Draft course'), id: 11, published_at: null },
      ]),
    });
  });

  await page.goto('/');
  const cardFor = (title: string) =>
    page
      .locator('[data-part="course-card"]')
      .filter({ has: page.getByRole('heading', { level: 3, name: title }) });
  const add = cardFor('Add course').getByRole('button', { name: 'Add to cart' });
  const enroll = cardFor('Free course').getByRole('button', { name: 'Enroll free' });
  const enrolled = cardFor('Enrolled course').locator('[data-part="course-card-action-status"]');
  const remove = cardFor('Remove course').getByRole('button', { name: 'Remove' });
  const unpublished = cardFor('Draft course').getByRole('button', { name: 'Not published' });
  await expect(add).toBeVisible();
  await expect(enroll).toBeVisible();
  await expect(enrolled).toHaveText('Enrolled');
  await expect(remove).toBeVisible();
  await expect(unpublished).toBeDisabled();
  await expect(enrolled.locator('button, a')).toHaveCount(0);
  expect(await enrolled.evaluate((element) => element.tabIndex)).toBe(-1);

  const requiredActionLabels = [
    [add, 'Add to cart'],
    [enroll, 'Enroll free'],
    [enrolled, 'Enrolled'],
    [remove, 'Remove'],
    [unpublished, 'Not published'],
  ] as const;
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const labels = await Promise.all(
      requiredActionLabels.map(async ([control, expectedText]) => ({
        expectedText,
        ...(await control.evaluate((element) => {
          const label = element.querySelector<HTMLElement>(
            '[data-part="course-card-action-content"] span',
          );
          if (!label) throw new Error('CourseCard action label is missing.');
          return {
            text: label.textContent,
            clientWidth: label.clientWidth,
            scrollWidth: label.scrollWidth,
          };
        })),
      })),
    );
    expect(
      labels.every(
        (label) =>
          label.text === label.expectedText &&
          label.clientWidth > 0 &&
          label.scrollWidth <= label.clientWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
          document.body.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }

  const expectedIcons = [
    [enroll, 'lucide-user-plus'],
    [enrolled, 'lucide-circle-check'],
  ] as const;
  await expect(add.locator('svg')).toHaveCount(0);
  await expect(remove.locator('svg')).toHaveCount(0);
  for (const [control, iconClass] of expectedIcons) {
    const icon = control.locator('svg');
    await expect(icon).toHaveClass(new RegExp(iconClass));
    await expect(icon).toHaveAttribute('width', '16');
    await expect(icon).toHaveAttribute('height', '16');
    await expect(icon).toHaveAttribute('stroke', 'currentColor');
    expect(
      await control.evaluate((element) => {
        const svg = element.querySelector('svg');
        return svg?.parentElement?.firstElementChild === svg;
      }),
    ).toBe(true);
  }

  const styles = await Promise.all(
    [add, enroll, enrolled, remove].map((control) =>
      control.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const icon = element.querySelector('svg');
        const iconRect = icon?.getBoundingClientRect();
        const content = element.querySelector<HTMLElement>(
          '[data-part="course-card-action-content"]',
        );
        const label = content?.lastElementChild as HTMLElement | null;
        const labelRect = label?.getBoundingClientRect();
        const contentStyle = content ? getComputedStyle(content) : null;
        return {
          background: style.backgroundColor,
          border: style.borderColor,
          borderTopLeftRadius: style.borderTopLeftRadius,
          color: style.color,
          contentGap: contentStyle?.gap ?? null,
          height: rect.height,
          iconTextCentreDelta:
            iconRect && labelRect
              ? Math.abs(
                  iconRect.top + iconRect.height / 2 - (labelRect.top + labelRect.height / 2),
                )
              : null,
          inlineGap: iconRect && labelRect ? labelRect.left - iconRect.right : null,
          iconTransform: icon ? getComputedStyle(icon).transform : null,
          lineHeight: style.lineHeight,
          paddingInlineEnd: style.paddingInlineEnd,
          paddingInlineStart: style.paddingInlineStart,
          whiteSpace: style.whiteSpace,
          width: rect.width,
        };
      }),
    ),
  );
  expect(styles[0]).toMatchObject({
    background: 'rgb(91, 63, 214)',
    color: 'rgb(255, 255, 255)',
    contentGap: '6px',
    lineHeight: '20px',
    whiteSpace: 'nowrap',
  });
  expect(styles[1]).toMatchObject({
    background: 'rgb(91, 63, 214)',
    color: 'rgb(255, 255, 255)',
    contentGap: '6px',
    lineHeight: '20px',
    whiteSpace: 'nowrap',
  });
  expect(styles[2]).toMatchObject({
    background: 'rgb(238, 235, 251)',
    color: 'rgb(75, 50, 181)',
    border: 'rgb(227, 222, 248)',
    contentGap: '6px',
    lineHeight: '20px',
    whiteSpace: 'nowrap',
  });
  expect(styles[3]).toMatchObject({
    background: 'rgb(255, 255, 255)',
    color: 'rgb(75, 50, 181)',
    border: 'rgb(75, 50, 181)',
    contentGap: '6px',
    lineHeight: '20px',
    whiteSpace: 'nowrap',
  });
  expect(styles.every((control) => control.height >= 44)).toBe(true);
  expect(
    styles.every(
      (control) => control.paddingInlineStart === '12px' && control.paddingInlineEnd === '12px',
    ),
  ).toBe(true);
  expect(styles[2].borderTopLeftRadius).toBe('8px');
  const iconStyles = [styles[1], styles[2]];
  expect(iconStyles.every((control) => control.iconTransform === 'none')).toBe(true);
  expect(
    iconStyles.every(
      (control) => control.inlineGap !== null && Math.abs(control.inlineGap - 6) <= 0.5,
    ),
  ).toBe(true);
  expect(
    iconStyles.every(
      (control) => control.iconTextCentreDelta !== null && control.iconTextCentreDelta <= 1,
    ),
  ).toBe(true);
  expect(styles[0].width).toBeCloseTo(120, 1);
  expect(styles.every((control) => Math.abs(control.width - styles[0].width) <= 0.5)).toBe(true);
  const addWidthBefore = styles[0].width;
  await add.focus();
  await expect(add).toHaveCSS('outline-width', '2px');
  await add.dblclick();
  const adding = cardFor('Add course').getByRole('button', { name: 'Adding…' });
  await expect(adding).toBeDisabled();
  await expect(adding).toHaveAttribute('aria-busy', 'true');
  expect(await adding.evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(
    addWidthBefore,
    1,
  );
  expect(mutationRequests).toEqual(['POST /cart/items']);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const pendingLabel = await adding.evaluate((element) => {
      const label = element.querySelector<HTMLElement>(
        '[data-part="course-card-action-content"] span',
      );
      if (!label) throw new Error('CourseCard pending action label is missing.');
      return {
        text: label.textContent,
        clientWidth: label.clientWidth,
        scrollWidth: label.scrollWidth,
      };
    });
    expect(pendingLabel.text).toBe('Adding…');
    expect(pendingLabel.clientWidth).toBeGreaterThan(0);
    expect(pendingLabel.scrollWidth).toBeLessThanOrEqual(pendingLabel.clientWidth);
  }
  releaseAddRequest();
  const added = cardFor('Add course').getByRole('button', { name: 'Remove' });
  await expect(added).toBeVisible();
  expect(await added.evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(
    addWidthBefore,
    1,
  );
  await remove.hover();
  await expect(remove).toHaveCSS('background-color', 'rgb(227, 222, 248)');
  await enrolled.click({ force: true });
  expect(mutationRequests).toEqual(['POST /cart/items']);

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.locator('[data-part="course-card"]').evaluateAll((cards) =>
      cards.map((card) => {
        const price = card.querySelector<HTMLElement>('[data-part="course-card-price"]');
        const control = card.querySelector<HTMLElement>(
          '[data-part="course-card-actions"] button, [data-part="course-card-action-status"]',
        );
        if (!price || !control)
          throw new Error('CourseCard action-system geometry target is missing.');
        const priceRect = price.getBoundingClientRect();
        const controlRect = control.getBoundingClientRect();
        return {
          priceLeft: priceRect.left,
          priceTop: priceRect.top,
          priceBottom: priceRect.bottom,
          controlRight: controlRect.right,
          controlTop: controlRect.top,
          controlBottom: controlRect.bottom,
          height: controlRect.height,
          documentWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyWidth: document.body.scrollWidth,
        };
      }),
    );
    expect(
      geometry.every(
        (entry) =>
          entry.height >= 44 &&
          entry.priceLeft <= entry.controlRight &&
          Math.abs(
            entry.priceTop +
              (entry.priceBottom - entry.priceTop) / 2 -
              (entry.controlTop + (entry.controlBottom - entry.controlTop) / 2),
          ) <= 1,
      ),
    ).toBe(true);
    expect(
      geometry.every(
        (entry) => entry.documentWidth <= entry.clientWidth && entry.bodyWidth <= entry.clientWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '200%';
  });
  const zoomGeometry = await page
    .locator('[data-part="course-card-actions"] button, [data-part="course-card-action-status"]')
    .evaluateAll((controls) =>
      controls.map((control) => {
        const rect = control.getBoundingClientRect();
        const label = control.querySelector<HTMLElement>(
          '[data-part="course-card-action-content"] span',
        );
        return {
          height: rect.height,
          width: rect.width,
          labelText: label?.textContent ?? null,
          labelClientWidth: label?.clientWidth ?? 0,
          labelScrollWidth: label?.scrollWidth ?? 0,
        };
      }),
    );
  expect(
    zoomGeometry.every(
      (control) =>
        control.height >= 88 &&
        control.width > 0 &&
        control.labelText !== null &&
        control.labelClientWidth > 0 &&
        control.labelScrollWidth <= control.labelClientWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.zoom = '';
  });
  assertClean();
});

test('recovers only authoritative preflight after a successful Catalog mutation cannot be verified', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowHttpFailure({ method: 'GET', path: '/cart', status: 500 }, 2);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  assertClean.allowRequestFailure({ method: 'GET', path: '/cart', errorText: 'net::ERR_ABORTED' });
  const mutationRequests: string[] = [];
  let cartReadCount = 0;
  let enrollmentReadCount = 0;
  let remainingAuthoritativeCartFailures = 0;
  let holdRecoveryReads = false;
  const recoveryReadReleases: {
    cart: (() => void) | null;
    enrollments: (() => void) | null;
  } = { cart: null, enrollments: null };
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' || request.method() === 'DELETE')
      mutationRequests.push(`${request.method()} ${path}`);
  });
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'student-token'));
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'student@example.test',
        name: 'Student',
        surname: 'One',
        role: 'student',
        birthday: null,
        phone_number: null,
        created_at: '2026-01-01T00:00:00Z',
      }),
    });
  });
  await page.route('**/cart**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/cart/items') {
      remainingAuthoritativeCartFailures = 2;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 13,
          course_id: 7,
          added_at: '2026-01-01T00:00:00Z',
          course: { id: 7, title: 'Recovery course', price: '9.99', currency: 'USD' },
        }),
      });
      return;
    }
    if (path !== '/cart') {
      await route.fallback();
      return;
    }
    cartReadCount += 1;
    if (remainingAuthoritativeCartFailures > 0) {
      remainingAuthoritativeCartFailures -= 1;
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      return;
    }
    if (holdRecoveryReads)
      await new Promise<void>((resolve) => {
        recoveryReadReleases.cart = resolve;
      });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        items: [],
        total_price: '0.00',
        currency: 'USD',
        item_count: 0,
      }),
    });
  });
  await page.route('**/enrollments/my**', async (route) => {
    enrollmentReadCount += 1;
    if (holdRecoveryReads)
      await new Promise<void>((resolve) => {
        recoveryReadReleases.enrollments = resolve;
      });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [],
        page: 1,
        page_size: 100,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      }),
    });
  });
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([{ ...permittedCourse('Recovery course'), id: 7, price: '9.99' }]),
    });
  });

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const card = page
    .locator('[data-part="course-card"]')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Recovery course' }) });
  const add = card.getByRole('button', { name: 'Add to cart' });
  await expect(add).toBeVisible();
  await add.dblclick();

  const retry = card.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeEnabled();
  await expect(card.getByText('We could not verify your enrollment or cart.')).toBeVisible();
  expect(mutationRequests).toEqual(['POST /cart/items']);
  await expect(card.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await expect(card.getByText('Enrolled', { exact: true })).toHaveCount(0);
  await retry.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(retry).toBeFocused();
  expect(await retry.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
        document.body.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);

  const cartReadsBeforeRetry = cartReadCount;
  const enrollmentReadsBeforeRetry = enrollmentReadCount;
  holdRecoveryReads = true;
  await page.keyboard.press('Enter');
  await expect.poll(() => cartReadCount).toBe(cartReadsBeforeRetry + 1);
  await expect.poll(() => enrollmentReadCount).toBe(enrollmentReadsBeforeRetry + 1);
  await expect(retry).toBeDisabled();
  await expect(retry).toHaveAttribute('aria-busy', 'true');
  await page.keyboard.press('Enter');
  await retry.click({ force: true });
  await page.waitForTimeout(100);
  expect(cartReadCount).toBe(cartReadsBeforeRetry + 1);
  expect(enrollmentReadCount).toBe(enrollmentReadsBeforeRetry + 1);
  const releaseRecoveryCartRead = recoveryReadReleases.cart;
  const releaseRecoveryEnrollmentRead = recoveryReadReleases.enrollments;
  if (!releaseRecoveryCartRead || !releaseRecoveryEnrollmentRead)
    throw new Error('The recovery preflight reads did not reach their held responses.');
  holdRecoveryReads = false;
  releaseRecoveryCartRead();
  releaseRecoveryEnrollmentRead();
  await expect(retry).toHaveCount(0);
  await expect(add).toBeEnabled();
  await expect(card.getByText('We could not verify your enrollment or cart.')).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await expect(card.getByText('Enrolled', { exact: true })).toHaveCount(0);
  expect(mutationRequests).toEqual(['POST /cart/items']);
  assertClean();
});

test('redirects Instructor Catalog root access without public Catalog or student requests', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure(
    {
      method: 'GET',
      path: '/courses/my?page=1&page_size=20',
      errorText: 'net::ERR_ABORTED',
    },
    1,
  );
  const forbiddenRequests: string[] = [];
  await page.addInitScript(() => localStorage.setItem('learnhub.access-token', 'instructor-token'));
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (
      (request.method() === 'GET' && path === '/courses') ||
      path === '/cart' ||
      path === '/enrollments/my' ||
      request.method() === 'POST' ||
      request.method() === 'DELETE'
    )
      forbiddenRequests.push(`${request.method()} ${path}`);
  });
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'teacher@example.test',
        name: 'Teacher',
        surname: 'One',
        role: 'instructor',
        birthday: null,
        phone_number: null,
        created_at: '2026-01-01T00:00:00Z',
      }),
    });
  });
  await page.route('**/courses/my**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([{ ...permittedCourse('Instructor course'), id: 7 }]),
    });
  });
  const instructorCollection = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/courses/my',
  );
  await Promise.all([instructorCollection, page.goto('/')]);
  await expect(page).toHaveURL('/instructor/courses');
  await expect(page.getByRole('heading', { level: 1, name: 'Instructor courses' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Your courses' })).toBeVisible();
  await expect(page.locator('[data-part="catalog-page"]')).toHaveCount(0);
  expect(forbiddenRequests).toEqual([]);
  assertClean();
});

test('allows only the exact simulated offline request failure and retries successfully', async ({
  page,
}) => {
  let offlineAttempts = 0;
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  await page.route('**/courses**', async (route) => {
    const query = new URL(route.request().url()).searchParams;
    if (query.get('search_query') === 'offline' && offlineAttempts++ < 2) {
      const request = route.request();
      const requestUrl = new URL(request.url());
      assertClean.allowRequestFailure({
        method: request.method(),
        path: `${requestUrl.pathname}${requestUrl.search}`,
        errorText: 'net::ERR_INTERNET_DISCONNECTED',
      });
      await route.abort('internetdisconnected');
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse('Recovered')]),
    });
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

test('A124 keeps one delayed, hoverable and pinnable controlled popover with a collision-aware connector', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  const courses = [
    {
      ...permittedCourse('React'),
      id: 7,
      description: 'React description that remains readable.',
      published_at: '2026-07-01T00:00:00Z',
    },
    {
      ...permittedCourse('TypeScript'),
      id: 8,
      description: 'TypeScript description that remains readable.',
      published_at: '2026-07-02T00:00:00Z',
    },
    {
      ...permittedCourse('Right edge course'),
      id: 9,
      description: 'Right edge description.',
      published_at: '2026-07-03T00:00:00Z',
    },
  ];
  await page.route('**/courses**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: response(courses) });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const reactCard = page
    .locator('[data-part="course-card"]')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'React' }) });
  const reactTrigger = reactCard.getByRole('button', { name: 'View course details' });
  const typeScriptCard = page
    .locator('[data-part="course-card"]')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'TypeScript' }) });
  const typeScriptTrigger = typeScriptCard.getByRole('button', { name: 'View course details' });
  const action = reactCard.getByRole('link', { name: 'Add to cart' });

  await reactCard.hover();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.waitForTimeout(280);
  const popover = page.getByRole('tooltip', { name: 'Course description: React' });
  await expect(popover).toHaveCount(1);
  await expect(reactTrigger).toHaveAttribute('aria-expanded', 'true');
  await expect(reactTrigger).toHaveAttribute(
    'aria-controls',
    (await popover.getAttribute('id')) ?? '',
  );
  await expect(popover).toContainText('React description that remains readable.');

  const path = await Promise.all([reactCard.boundingBox(), popover.boundingBox()]);
  expect(path[0]).not.toBeNull();
  expect(path[1]).not.toBeNull();
  await page.mouse.move(path[0]!.x + path[0]!.width - 2, path[0]!.y + 30);
  await page.mouse.move(path[1]!.x + 16, path[1]!.y + 16, { steps: 8 });
  await page.waitForTimeout(181);
  await expect(popover).toHaveCount(1);
  await page.mouse.move(4, 600, { steps: 8 });
  await page.waitForTimeout(180);
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  await action.hover();
  await page.waitForTimeout(280);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await reactTrigger.click();
  await expect(reactTrigger).toHaveAttribute('aria-pressed', 'true');
  await typeScriptCard.hover();
  await page.waitForTimeout(280);
  await expect(page.getByRole('tooltip')).toHaveCount(1);
  await expect(page.getByRole('tooltip')).toHaveAccessibleName('Course description: React');
  await typeScriptTrigger.click();
  await expect(reactTrigger).toHaveAttribute('aria-expanded', 'false');
  await expect(typeScriptTrigger).toHaveAttribute('aria-pressed', 'true');
  await typeScriptTrigger.click();
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  await reactTrigger.click();
  await page.mouse.click(8, 800);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await reactTrigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(reactTrigger).toBeFocused();

  const cards = page.locator('[data-part="course-card"]');
  const rightmostIndex = await cards.evaluateAll((elements) =>
    elements.reduce(
      (rightmost, element, index) =>
        element.getBoundingClientRect().right > elements[rightmost].getBoundingClientRect().right
          ? index
          : rightmost,
      0,
    ),
  );
  await cards.nth(rightmostIndex).hover();
  await page.waitForTimeout(280);
  const edgePopover = page.getByRole('tooltip');
  const connector = await edgePopover.evaluate((element) => {
    const card = element.closest<HTMLElement>('[data-part="course-card"]');
    if (!card) throw new Error('Popover active card is missing.');
    const link = card.querySelector<HTMLElement>('a[href^="/courses/"]');
    if (!link) throw new Error('Popover anchor link is missing.');
    const popoverRect = element.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const before = getComputedStyle(element, '::before');
    const after = getComputedStyle(element, '::after');
    const connectorOffset = Number.parseFloat(before.top);
    const expectedOffset = linkRect.top + linkRect.height / 2 - popoverRect.top;
    return {
      placement: element.getAttribute('data-placement'),
      popover: popoverRect.toJSON(),
      clientWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      pointerEvents: getComputedStyle(element).pointerEvents,
      background: getComputedStyle(element).backgroundColor,
      border: getComputedStyle(element).borderColor,
      connectorOffset,
      expectedOffset,
      connectorBorderLeft: before.borderLeftColor,
      connectorBorderRight: before.borderRightColor,
      connectorFillLeft: after.borderLeftColor,
      connectorFillRight: after.borderRightColor,
    };
  });
  expect(['left', 'right']).toContain(connector.placement);
  expect(connector.popover.left).toBeGreaterThanOrEqual(12);
  expect(connector.popover.right).toBeLessThanOrEqual(connector.clientWidth - 12);
  expect(connector.documentWidth).toBeLessThanOrEqual(connector.clientWidth);
  expect(connector.bodyWidth).toBeLessThanOrEqual(connector.clientWidth);
  expect(connector.pointerEvents).toBe('auto');
  expect(Math.abs(connector.connectorOffset - connector.expectedOffset)).toBeLessThanOrEqual(1);
  expect(
    connector.connectorBorderLeft === connector.border ||
      connector.connectorBorderRight === connector.border,
  ).toBe(true);
  expect(
    connector.connectorFillLeft === connector.background ||
      connector.connectorFillRight === connector.background,
  ).toBe(true);
  assertClean();
});

test('Keeps the labelled whole-card route and omits Details for compact or coarse input', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query: string) =>
      query === '(hover: hover) and (pointer: fine)'
        ? {
            matches: false,
            media: query,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
              return false;
            },
          }
        : originalMatchMedia(query);
  });
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([
        {
          ...permittedCourse('Touch course'),
          description: 'Touch disclosure.',
          published_at: '2026-07-01T00:00:00Z',
        },
      ]),
    });
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  for (const width of [390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const card = page.locator('[data-part="course-card"]');
    await expect(card.getByRole('link', { name: 'Touch course' })).toHaveAttribute(
      'href',
      '/courses/7',
    );
    await expect(card.getByRole('button', { name: 'View course details' })).toHaveCount(0);
    await card.hover();
    await page.waitForTimeout(320);
    await expect(page.getByRole('tooltip')).toHaveCount(0);
  }
  await page.setViewportSize({ width: 617, height: 900 });
  const intermediateGeometry = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('[data-part="catalog-hero"]');
    const copy = hero?.querySelector<HTMLElement>('div');
    const min = document.querySelector<HTMLInputElement>('input[name="min_price"]');
    const max = document.querySelector<HTMLInputElement>('input[name="max_price"]');
    const sort = document.querySelector<HTMLElement>('[data-part="catalog-sort-trigger"]');
    if (!hero || !copy || !min || !max || !sort)
      throw new Error('Intermediate Catalog geometry targets are missing.');
    const heroRect = hero.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();
    const minRect = min.getBoundingClientRect();
    const maxRect = max.getBoundingClientRect();
    const sortRect = sort.getBoundingClientRect();
    return {
      heroCentreDelta: Math.abs(
        heroRect.top + heroRect.height / 2 - (copyRect.top + copyRect.height / 2),
      ),
      min: minRect.toJSON(),
      max: maxRect.toJSON(),
      sort: sortRect.toJSON(),
    };
  });
  expect(intermediateGeometry.heroCentreDelta).toBeLessThanOrEqual(1);
  expect(Math.abs(intermediateGeometry.min.width - 120)).toBeLessThanOrEqual(1);
  expect(Math.abs(intermediateGeometry.max.width - 120)).toBeLessThanOrEqual(1);
  expect(Math.abs(intermediateGeometry.sort.width - 148)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(intermediateGeometry.min.top - intermediateGeometry.sort.top),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(intermediateGeometry.max.top - intermediateGeometry.sort.top),
  ).toBeLessThanOrEqual(1);
  assertClean();
});

test('Keeps compact fine-pointer hover and focus free of dangling disclosure ARIA', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure({
    method: 'GET',
    path: '/courses?page=1&page_size=20&sort=created_at',
    errorText: 'net::ERR_ABORTED',
  });
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([{ ...permittedCourse('Fine compact course'), id: 12 }]),
    });
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const card = page.locator('[data-part="course-card"]');
  const link = card.getByRole('link', { name: 'Fine compact course' });
  await link.focus();
  await link.hover();
  await page.waitForTimeout(320);
  await expect(card.getByRole('button', { name: 'View course details' })).toHaveCount(0);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(link).not.toHaveAttribute('aria-describedby');
  assertClean();
});

test('localizes the D05 price filter fieldset and accessible names without changing responsive behavior', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure(
    {
      method: 'GET',
      path: '/courses?page=1&page_size=20&sort=created_at',
      errorText: 'net::ERR_ABORTED',
    },
    6,
  );
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([permittedCourse()]),
    });
  });

  const expectations = [
    {
      locale: 'en',
      group: 'Price range',
      minimum: 'Min price',
      maximum: 'Max price',
      label: 'Price:',
    },
    {
      locale: 'ru',
      group: 'Диапазон цен',
      minimum: 'Мин. цена',
      maximum: 'Макс. цена',
      label: 'Цена:',
    },
    {
      locale: 'uz',
      group: 'Narx oralig‘i',
      minimum: 'Min. narx',
      maximum: 'Maks. narx',
      label: 'Narx:',
    },
  ] as const;

  const compactWidths = [320, 390, 617, 767];
  const desktopWidths = [768, 1280];

  for (const expected of expectations) {
    await page.goto('/');
    await page.evaluate(
      (locale) => localStorage.setItem('learnhub.locale', locale),
      expected.locale,
    );
    await page.reload();

    for (const width of compactWidths) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('group', { name: expected.group })).toBeVisible();
      await expect(page.getByLabel(expected.minimum)).toHaveAccessibleName(expected.minimum);
      await expect(page.getByLabel(expected.maximum)).toHaveAccessibleName(expected.maximum);
      await expect(page.locator('[data-part="catalog-filter-price-label"]')).toBeHidden();
      const geometry = await page.evaluate<CatalogViewportGeometry>(() => ({
        width: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(geometry.documentWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(
        geometry.clientWidth,
      );
      expect(geometry.bodyWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(
        geometry.clientWidth,
      );
    }

    for (const width of desktopWidths) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('group', { name: expected.group })).toBeVisible();
      await expect(page.getByLabel(expected.minimum)).toHaveAccessibleName(expected.minimum);
      await expect(page.getByLabel(expected.maximum)).toHaveAccessibleName(expected.maximum);
      await expect(page.locator('[data-part="catalog-filter-price-label"]')).toHaveText(
        expected.label,
      );
    }
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = '200%';
  });
  const zoomedPriceRange = await page
    .getByRole('group', { name: 'Narx oralig‘i' })
    .evaluate((fieldset) => {
      const fieldsetRect = fieldset.getBoundingClientRect();
      const inputRects = Array.from(fieldset.querySelectorAll('input')).map((input) =>
        input.getBoundingClientRect().toJSON(),
      );
      return {
        clientWidth: fieldset.clientWidth,
        scrollWidth: fieldset.scrollWidth,
        fieldset: fieldsetRect.toJSON(),
        inputs: inputRects,
      };
    });
  // Root CSS zoom expands the existing Catalog harness. D05 must not add a local
  // price-fieldset overflow on top of that established document-level behavior.
  expect(zoomedPriceRange.scrollWidth).toBeLessThanOrEqual(zoomedPriceRange.clientWidth);
  expect(
    zoomedPriceRange.inputs.every(
      (input) =>
        input.left >= zoomedPriceRange.fieldset.left - 1 &&
        input.right <= zoomedPriceRange.fieldset.right + 1,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.zoom = '';
  });
  assertClean();
});

test('renders the D20 Catalog vertical slice in Russian and Uzbek without changing API data or anonymous actions', async ({
  page,
}) => {
  const assertClean = await monitor(page);
  assertClean.allowRequestFailure(
    {
      method: 'GET',
      path: '/courses?page=1&page_size=20&sort=created_at',
      errorText: 'net::ERR_ABORTED',
    },
    4,
  );
  const mutationRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' || request.method() === 'DELETE') {
      mutationRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  });
  await page.route('**/courses**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: response([
        {
          ...permittedCourse('React Fundamentals: Components'),
          id: 8,
          price: '0.00',
          currency: 'UZS',
          instructor: { id: 1, name: 'Samira', surname: 'Karimova' },
          lessons: [
            { id: 1, title: 'Intro' },
            { id: 2, title: 'State' },
            { id: 3, title: 'Effects' },
          ],
        },
        {
          ...permittedCourse('FastAPI and Async SQLAlchemy'),
          id: 11,
          price: '349000.00',
          currency: 'UZS',
          instructor: { id: 2, name: 'Nodira', surname: 'Yuldasheva' },
          lessons: [
            { id: 4, title: 'Setup' },
            { id: 5, title: 'Models' },
            { id: 6, title: 'Routes' },
          ],
        },
      ]),
    });
  });

  const expectations: readonly CatalogLocaleExpectation[] = [
    {
      locale: 'ru',
      heroTitle: 'Освойте навыки, которые формируют будущее',
      resultCount: 'Найдено 2 курса',
      sortBy: 'Сортировать по:',
      sortCompact: 'Сортировка:',
      free: 'БЕСПЛАТНО',
      details: 'Подробнее',
      detailsAccessibleName: 'Открыть сведения о курсе',
      lessons: '3 доступных урока',
      enrollForFree: 'Записаться бесплатно',
      addToCart: 'В корзину',
    },
    {
      locale: 'uz',
      heroTitle: 'Kelajakni shakllantirayotgan ko‘nikmalarni egallang Kelajak',
      resultCount: 'Topildi 2 ta kurs',
      sortBy: 'Saralash:',
      sortCompact: 'Saralash:',
      free: 'BEPUL',
      details: 'Batafsil',
      detailsAccessibleName: 'Kurs tafsilotlarini ko‘rish',
      lessons: '3 ta dars mavjud',
      enrollForFree: 'Bepul yozilish',
      addToCart: 'Savatga qo‘shish',
    },
  ];

  for (const expected of expectations) {
    await page.goto('/');
    await page.evaluate(
      (locale) => localStorage.setItem('learnhub.locale', locale),
      expected.locale,
    );
    await page.reload();

    const freeCard = page.locator('[data-part="course-card"]').filter({
      has: page.getByRole('heading', { level: 3, name: 'React Fundamentals: Components' }),
    });
    const paidCard = page.locator('[data-part="course-card"]').filter({
      has: page.getByRole('heading', { level: 3, name: 'FastAPI and Async SQLAlchemy' }),
    });
    const freeAction = freeCard.getByRole('link', { name: expected.enrollForFree });
    const paidAction = paidCard.getByRole('link', { name: expected.addToCart });

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(expected.heroTitle);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(expected.resultCount);
    await expect(freeCard.getByRole('heading', { level: 3 })).toHaveText(
      'React Fundamentals: Components',
    );
    await expect(freeCard.getByText('Samira Karimova')).toBeVisible();
    await expect(freeCard.getByText(expected.lessons)).toBeVisible();
    await expect(freeCard.locator('[data-part="course-card-price"]')).toHaveText(expected.free);
    await expect(paidCard.getByRole('heading', { level: 3 })).toHaveText(
      'FastAPI and Async SQLAlchemy',
    );
    await expect(paidCard.getByText('Nodira Yuldasheva')).toBeVisible();
    await expect(paidCard.locator('[data-part="course-card-price"]')).toContainText('UZS');
    await expect(freeAction).toHaveAttribute('href', '/login?returnTo=%2Fcourses%2F8');
    await expect(paidAction).toHaveAttribute('href', '/login?returnTo=%2Fcourses%2F11');

    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(expected.resultCount);
      if (width >= 768) {
        await expect(
          freeCard
            .getByRole('button', { name: expected.detailsAccessibleName })
            .locator('[data-part="course-card-disclosure-pill"]'),
        ).toHaveText(expected.details);
      }
      const visibleSortLabels = await page
        .locator('[data-part="catalog-sort-toolbar"] span[aria-hidden="true"]')
        .evaluateAll((labels) =>
          labels
            .filter((label) => getComputedStyle(label).display !== 'none')
            .map((label) => label.textContent?.trim()),
        );
      expect(visibleSortLabels).toContain(width < 768 ? expected.sortCompact : expected.sortBy);
      const viewportGeometry = await page.evaluate<CatalogViewportGeometry>(() => ({
        width: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(viewportGeometry.documentWidth, JSON.stringify(viewportGeometry)).toBeLessThanOrEqual(
        viewportGeometry.clientWidth,
      );
      expect(viewportGeometry.bodyWidth, JSON.stringify(viewportGeometry)).toBeLessThanOrEqual(
        viewportGeometry.clientWidth,
      );
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await freeAction.focus();
    await expect(freeAction).toBeFocused();
    expect(await freeAction.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    const details = freeCard.getByRole('button', { name: expected.detailsAccessibleName });
    await details.click();
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(details).toBeFocused();
    await expect(details).toHaveAttribute('aria-expanded', 'false');

    await page.evaluate(() => {
      document.documentElement.style.zoom = '200%';
    });
    const zoomedCatalog = await page
      .locator('[data-part="catalog-result-list"]')
      .evaluate((list) => ({
        clientWidth: list.clientWidth,
        scrollWidth: list.scrollWidth,
        freeCard: list
          .querySelector<HTMLElement>('[data-course-card-id="8"]')
          ?.getBoundingClientRect()
          .toJSON(),
        paidCard: list
          .querySelector<HTMLElement>('[data-course-card-id="11"]')
          ?.getBoundingClientRect()
          .toJSON(),
        bounds: list.getBoundingClientRect().toJSON(),
      }));
    expect(zoomedCatalog.scrollWidth).toBeLessThanOrEqual(zoomedCatalog.clientWidth);
    expect(zoomedCatalog.freeCard?.left).toBeGreaterThanOrEqual(zoomedCatalog.bounds.left - 1);
    expect(zoomedCatalog.freeCard?.right).toBeLessThanOrEqual(zoomedCatalog.bounds.right + 1);
    expect(zoomedCatalog.paidCard?.left).toBeGreaterThanOrEqual(zoomedCatalog.bounds.left - 1);
    expect(zoomedCatalog.paidCard?.right).toBeLessThanOrEqual(zoomedCatalog.bounds.right + 1);
    await page.evaluate(() => {
      document.documentElement.style.zoom = '';
    });
  }

  expect(mutationRequests).toEqual([]);
  assertClean();
});
