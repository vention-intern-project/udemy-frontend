import { Buffer } from 'node:buffer';

import { expect, test, type Locator, type Page, type Route } from '@playwright/test';

const student = {
  email: 'student@example.test',
  name: 'Sam',
  surname: 'Student',
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
  course: {
    id: 7,
    title: 'Browser learning course',
    description: null,
    price: '0.00',
    currency: 'USD',
  },
};
const emptyCart = { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 };

interface LearningResidualBrowserCopy {
  readonly absentDescription: string;
  readonly breadcrumb: string;
  readonly catalog: string;
  readonly myLearning: string;
  readonly paymentPending: string;
  readonly pendingBody: string;
  readonly failedAction: string;
  readonly declinedTitle: string;
  readonly declinedBody: string;
  readonly progressHeading: string;
  readonly progressSummary: string;
  readonly progressAccessibleName: string;
}

const learningResidualBrowserCopy: Readonly<
  Record<'en' | 'ru' | 'uz', LearningResidualBrowserCopy>
> = {
  en: {
    absentDescription: 'No course description is available.',
    breadcrumb: 'Breadcrumb',
    catalog: 'Catalog',
    myLearning: 'My learning',
    paymentPending: 'Payment pending',
    pendingBody:
      'Mock payment is awaiting completion. Learning remains locked until your enrollment is active.',
    failedAction: 'Simulate mock payment failure',
    declinedTitle: 'Mock payment declined',
    declinedBody: 'The mock payment was declined. This enrollment remains locked.',
    progressHeading: 'Learning progress',
    progressSummary: '2 of 5 lessons completed',
    progressAccessibleName: '2 of 5 lessons completed, 40%',
  },
  ru: {
    absentDescription: 'Описание курса отсутствует.',
    breadcrumb: 'Хлебные крошки',
    catalog: 'Каталог',
    myLearning: 'Моё обучение',
    paymentPending: 'Платёж ожидается',
    pendingBody:
      'Тестовая оплата ожидает завершения. Обучение останется заблокированным, пока запись не станет активной.',
    failedAction: 'Сымитировать сбой тестовой оплаты',
    declinedTitle: 'Тестовый платёж отклонён',
    declinedBody: 'Тестовая оплата отклонена. Эта запись остаётся заблокированной.',
    progressHeading: 'Прогресс обучения',
    progressSummary: 'Завершено: 2 из 5 уроков',
    progressAccessibleName: 'Завершено: 2 из 5 уроков, 40%',
  },
  uz: {
    absentDescription: 'Kurs tavsifi mavjud emas.',
    breadcrumb: 'Yo‘l ko‘rsatkich',
    catalog: 'Katalog',
    myLearning: 'Ta’limim',
    paymentPending: 'To‘lov kutilmoqda',
    pendingBody:
      'Sinov to‘lovi yakunlanishini kutmoqda. Ro‘yxatdan o‘tishingiz faol bo‘lmaguncha ta’lim yopiq qoladi.',
    failedAction: 'Sinov to‘lovi xatosini taqlid qilish',
    declinedTitle: 'Sinov to‘lovi rad etildi',
    declinedBody: 'Sinov to‘lovi rad etildi. Bu ro‘yxatdan o‘tish yopiq qoladi.',
    progressHeading: 'Ta’lim jarayoni',
    progressSummary: '5 ta darsdan 2 tasi yakunlandi',
    progressAccessibleName: '5 ta darsdan 2 tasi yakunlandi, 40%',
  },
};
const VALID_VIDEO_MP4 = Buffer.from(
  'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAACIhtZGF0//tQxAADwAABpAAAACAAADSAAAAETEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjk5LjVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQAAAq4GBf//qtxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNDggcjI2NDMgNWM2NTcwNCAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMTUgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0xIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDM6MHgxMTMgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTEgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0xIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MyBiX3B5cmFtaWQ9MiBiX2FkYXB0PTEgYl9iaWFzPTAgZGlyZWN0PTEgd2VpZ2h0Yj0xIG9wZW5fZ29wPTAgd2VpZ2h0cD0yIGtleWludD0yNTAga2V5aW50X21pbj0yNSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAABRliIQAK//+2OfzLJOXereQdLvG0f/7UsRdg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tSxKGDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy45OS41VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+1LEoYPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjk5LjVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7UsShg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tSxKGDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+1LEoYPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQAABP9tb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAtgABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAACEXRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAtgAAAAAAAAAAAAAAAQEAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAAJwAAARRAAEAAAAAAYltZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAAKxEAAAfUVXEAAAAAAAtaGRscgAAAAAAAAAAc291bgAAAAAAAAAAAAAAAFNvdW5kSGFuZGxlcgAAAAE0bWluZgAAABBzbWhkAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAD4c3RibAAAAGBzdHNkAAAAAAAAAAEAAABQbXA0YQAAAAAAAAABAAAAAAAAAAAAAgAQAAAAAKxEAAAAAAAsZXNkcwAAAAADgICAGwABAASAgIANaxUAAAAAAPtRAAD7UQaAgIABAgAAACBzdHRzAAAAAAAAAAIAAAAGAAAEgAAAAAEAAARRAAAAKHN0c2MAAAAAAAAAAgAAAAEAAAABAAAAAQAAAAIAAAAGAAAAAQAAADBzdHN6AAAAAAAAAAAAAAAHAAAA0AAAANEAAADRAAAA0QAAANEAAADRAAAA0QAAABhzdGNvAAAAAAAAAAIAAAAwAAADygAAAhh0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAACAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAIAAAACAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAAoAAAAAAABAAAAAAGQbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAyAAAAAgBVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABO21pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAPtzdGJsAAAAl3N0c2QAAAAAAAAAAQAAAIdhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAIAAgBIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAMWF2Y0MBZAAK/+EAGGdkAAqs2V+IiIQAAAMABAAAAwDIPEiWWAEABmjr48siwAAAABhzdHRzAAAAAAAAAAEAAAABAAACAAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAALKAAAAAQAAABRzdGNvAAAAAAAAAAEAAAEAAAAAYnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxzdAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY1Ni40MC4xMDE=',
  'base64',
);

function createValidPdfFixture(): Buffer {
  const header = '%PDF-1.4\n';
  const firstPage = 'BT /F1 18 Tf 36 250 Td (Page one PDF test) Tj ET';
  const secondPage = 'BT /F1 18 Tf 36 250 Td (Page two PDF test) Tj ET';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `6 0 obj\n<< /Length ${Buffer.byteLength(firstPage, 'ascii')} >>\nstream\n${firstPage}\nendstream\nendobj\n`,
    `7 0 obj\n<< /Length ${Buffer.byteLength(secondPage, 'ascii')} >>\nstream\n${secondPage}\nendstream\nendobj\n`,
  ];
  let document = header;
  const offsets = objects.map((object) => {
    const offset = Buffer.byteLength(document, 'ascii');
    document += object;
    return offset;
  });
  const xrefOffset = Buffer.byteLength(document, 'ascii');
  const entries = offsets
    .map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`)
    .join('');
  return Buffer.from(
    `${document}xref\n0 8\n0000000000 65535 f \n${entries}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    'ascii',
  );
}

const VALID_PDF = createValidPdfFixture();

async function json(route: Route, value: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
}

test.beforeEach(async ({ page }) => {
  await page.route(
    (url) => url.pathname === '/cart' && url.search === '',
    async (route) => {
      const request = route.request();
      expect(request.method()).toBe('GET');
      expect(request.headers().authorization).toBe('Bearer student-token');
      await json(route, emptyCart);
    },
  );
});

async function installStudent(page: Page) {
  await page.addInitScript(() => {
    if (window.top !== window) return;
    localStorage.setItem('learnhub.access-token', 'student-token');
  });
}

interface LessonMediaLifecycleProbe {
  readonly createdObjectUrls: string[];
  readonly revokedObjectUrls: string[];
  readyAnnouncementCount: number;
}

interface LessonMediaLifecycleWindow extends Window {
  __lessonMediaLifecycleProbe?: LessonMediaLifecycleProbe;
}

async function installLessonMediaLifecycleProbe(page: Page) {
  await page.addInitScript(() => {
    if (window.top !== window) return;
    const target = window as LessonMediaLifecycleWindow;
    const probe: LessonMediaLifecycleProbe = {
      createdObjectUrls: [],
      revokedObjectUrls: [],
      readyAnnouncementCount: 0,
    };
    target.__lessonMediaLifecycleProbe = probe;
    const createObjectUrl = URL.createObjectURL.bind(URL);
    const revokeObjectUrl = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (object: Blob | MediaSource) => {
      const objectUrl = createObjectUrl(object);
      probe.createdObjectUrls.push(objectUrl);
      return objectUrl;
    };
    URL.revokeObjectURL = (objectUrl: string) => {
      probe.revokedObjectUrls.push(objectUrl);
      revokeObjectUrl(objectUrl);
    };
    const observeReadyAnnouncements = () => {
      const observer = new MutationObserver(() => {
        const ready = Array.from(document.querySelectorAll('[role="status"]')).some(
          (status) => status.textContent === 'Video ready.',
        );
        if (ready) probe.readyAnnouncementCount += 1;
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    };
    if (document.body) observeReadyAnnouncements();
    else window.addEventListener('DOMContentLoaded', observeReadyAnnouncements, { once: true });
  });
}

async function readLessonMediaLifecycleProbe(page: Page): Promise<LessonMediaLifecycleProbe> {
  return page.evaluate(() => {
    const probe = (window as LessonMediaLifecycleWindow).__lessonMediaLifecycleProbe;
    if (!probe) throw new Error('Lesson media lifecycle probe was not installed.');
    return {
      createdObjectUrls: [...probe.createdObjectUrls],
      revokedObjectUrls: [...probe.revokedObjectUrls],
      readyAnnouncementCount: probe.readyAnnouncementCount,
    };
  });
}

async function tabTo(page: Page, locator: ReturnType<Page['getByRole']>) {
  for (let index = 0; index < 24; index += 1) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate((element) => document.activeElement === element)) return;
  }
  throw new Error('Keyboard traversal did not reach the expected control');
}

interface LessonMediaGeometry {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly mediaLeft: number;
  readonly mediaTop: number;
  readonly mediaRight: number;
  readonly mediaBottom: number;
  readonly frameLeft: number;
  readonly frameTop: number;
  readonly frameRight: number;
  readonly frameBottom: number;
  readonly maxFrameWidth: number;
  readonly documentWidth: number;
  readonly bodyWidth: number;
  readonly layoutWidth: number;
  readonly focusLeft: number;
  readonly focusRight: number;
}

interface NativeVideoReadiness {
  readonly readyState: number;
  readonly width: number;
  readonly height: number;
  readonly duration: number;
}

interface PdfViewportGeometry {
  readonly clientWidth: number;
  readonly scrollWidth: number;
  readonly clientHeight: number;
  readonly scrollHeight: number;
  readonly contentLeft: number;
  readonly contentRight: number;
  readonly pageLeft: number;
  readonly pageRight: number;
  readonly canvasLeft: number;
  readonly canvasTop: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly textLeft: number;
  readonly textTop: number;
  readonly textWidth: number;
  readonly textHeight: number;
  readonly navigationHeights: readonly number[];
}

async function expectNativeVideoReadiness(preview: Locator) {
  await expect
    .poll(async () =>
      preview.evaluate((element): boolean => {
        if (!(element instanceof HTMLVideoElement))
          throw new Error('The native video preview was not rendered.');
        return (
          element.readyState >= 1 &&
          element.videoWidth > 0 &&
          element.videoHeight > 0 &&
          Number.isFinite(element.duration) &&
          element.duration > 0
        );
      }),
    )
    .toBe(true);
  const readiness = await preview.evaluate((element): NativeVideoReadiness => {
    if (!(element instanceof HTMLVideoElement))
      throw new Error('The native video preview was not rendered.');
    return {
      readyState: element.readyState,
      width: element.videoWidth,
      height: element.videoHeight,
      duration: element.duration,
    };
  });
  expect(readiness.readyState).toBeGreaterThanOrEqual(1);
  expect(readiness.width).toBeGreaterThan(0);
  expect(readiness.height).toBeGreaterThan(0);
  expect(Number.isFinite(readiness.duration)).toBe(true);
  expect(readiness.duration).toBeGreaterThan(0);
}

async function expectStableLessonMediaGeometry(preview: Locator) {
  await expect(preview).toBeVisible();
  await preview.focus();
  await expect(preview).toBeFocused();
  const geometry = await preview.evaluate((element): LessonMediaGeometry => {
    const frame = element.closest('[data-part="lesson-media-frame"]');
    if (!(frame instanceof HTMLElement)) {
      throw new Error('The owned lesson media frame was not rendered.');
    }
    const mediaRect = element.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const active = document.activeElement;
    const activeRect = active instanceof HTMLElement ? active.getBoundingClientRect() : null;
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return {
      frameWidth: frameRect.width,
      frameHeight: frameRect.height,
      mediaLeft: mediaRect.left,
      mediaTop: mediaRect.top,
      mediaRight: mediaRect.right,
      mediaBottom: mediaRect.bottom,
      frameLeft: frameRect.left,
      frameTop: frameRect.top,
      frameRight: frameRect.right,
      frameBottom: frameRect.bottom,
      maxFrameWidth: rootFontSize * 56,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      layoutWidth: document.documentElement.clientWidth,
      focusLeft: activeRect?.left ?? -1,
      focusRight: activeRect?.right ?? Number.POSITIVE_INFINITY,
    };
  });
  expect(geometry.frameWidth / geometry.frameHeight).toBeCloseTo(16 / 9, 2);
  expect(geometry.frameWidth).toBeLessThanOrEqual(geometry.maxFrameWidth + 1);
  expect(geometry.mediaLeft).toBeGreaterThanOrEqual(geometry.frameLeft - 1);
  expect(geometry.mediaTop).toBeGreaterThanOrEqual(geometry.frameTop - 1);
  expect(geometry.mediaRight).toBeLessThanOrEqual(geometry.frameRight + 1);
  expect(geometry.mediaBottom).toBeLessThanOrEqual(geometry.frameBottom + 1);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.layoutWidth);
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.layoutWidth);
  expect(geometry.focusLeft).toBeGreaterThanOrEqual(geometry.frameLeft - 1);
  expect(geometry.focusRight).toBeLessThanOrEqual(geometry.frameRight + 1);
}

async function expectPdfViewportGeometry(preview: Locator, viewportWidth: number) {
  const geometry = await preview.evaluate((element): PdfViewportGeometry => {
    const viewport = element.querySelector('[data-part="lesson-pdf-viewport"]');
    const pageElement = viewport?.querySelector('.react-pdf__Page');
    const canvas = viewport?.querySelector('canvas');
    const textLayer = viewport?.querySelector('.react-pdf__Page__textContent');
    if (
      !(viewport instanceof HTMLElement) ||
      !(pageElement instanceof HTMLElement) ||
      !(canvas instanceof HTMLCanvasElement) ||
      !(textLayer instanceof HTMLElement)
    ) {
      throw new Error('The aligned PDF page, canvas, and text layer were not rendered.');
    }
    const viewportRect = viewport.getBoundingClientRect();
    const pageRect = pageElement.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const textRect = textLayer.getBoundingClientRect();
    const viewportStyle = getComputedStyle(viewport);
    const paddingStart = Number.parseFloat(viewportStyle.paddingInlineStart) || 0;
    const paddingEnd = Number.parseFloat(viewportStyle.paddingInlineEnd) || 0;
    const navigationHeights = Array.from(
      element.querySelectorAll('[aria-label="PDF pages"] button'),
      (button) => button.getBoundingClientRect().height,
    );
    return {
      clientWidth: viewport.clientWidth,
      scrollWidth: viewport.scrollWidth,
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      contentLeft: viewportRect.left + viewport.clientLeft + paddingStart,
      contentRight: viewportRect.left + viewport.clientLeft + viewport.clientWidth - paddingEnd,
      pageLeft: pageRect.left,
      pageRight: pageRect.right,
      canvasLeft: canvasRect.left,
      canvasTop: canvasRect.top,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
      textLeft: textRect.left,
      textTop: textRect.top,
      textWidth: textRect.width,
      textHeight: textRect.height,
      navigationHeights,
    };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
  expect(geometry.pageLeft).toBeGreaterThanOrEqual(geometry.contentLeft - 1);
  expect(geometry.pageRight).toBeLessThanOrEqual(geometry.contentRight + 1);
  expect(geometry.canvasLeft).toBeCloseTo(geometry.textLeft, 0);
  expect(geometry.canvasTop).toBeCloseTo(geometry.textTop, 0);
  expect(geometry.canvasWidth).toBeCloseTo(geometry.textWidth, 0);
  expect(geometry.canvasHeight).toBeCloseTo(geometry.textHeight, 0);
  expect(geometry.navigationHeights).toHaveLength(2);
  for (const height of geometry.navigationHeights) {
    if (viewportWidth <= 480) expect(height).toBeGreaterThanOrEqual(44);
    else {
      expect(height).toBeGreaterThanOrEqual(36);
      expect(height).toBeLessThan(44);
    }
  }
}

async function expectEffectivePageScaleGeometry(page: Page, preview: Locator) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    const scaleEvidence = await page.evaluate(() => ({
      scale: window.visualViewport?.scale ?? 1,
      visualWidth: window.visualViewport?.width ?? window.innerWidth,
      layoutWidth: document.documentElement.clientWidth,
    }));
    expect(scaleEvidence.scale).toBeCloseTo(2, 1);
    expect(scaleEvidence.visualWidth).toBeLessThan(scaleEvidence.layoutWidth);
    await expectStableLessonMediaGeometry(preview);
  } finally {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();
  }
}

interface RuntimeDiagnostics {
  readonly expectedRuntimeFailures: string[];
  readonly unexpectedRuntimeFailures: string[];
  readonly httpFailures: string[];
}

interface ExpectedRuntimeDiagnostics {
  readonly failedResourcePaths?: ReadonlySet<string>;
  readonly abortedRequests?: readonly ExpectedRequestFailure[];
}

interface ExpectedRequestFailure {
  readonly method: 'GET';
  readonly path: string;
  readonly errorText: 'net::ERR_ABORTED';
  readonly maxCount: number;
}

function expectedGetAbort(path: string, maxCount: number): ExpectedRequestFailure {
  return { method: 'GET', path, errorText: 'net::ERR_ABORTED', maxCount };
}

function captureRuntimeDiagnostics(
  page: Page,
  expected: ExpectedRuntimeDiagnostics = {},
): RuntimeDiagnostics {
  const diagnostics: RuntimeDiagnostics = {
    expectedRuntimeFailures: [],
    unexpectedRuntimeFailures: [],
    httpFailures: [],
  };
  // AppShell and the learning workspace may race for the authenticated cart
  // header query during route setup. Keep this narrow: only two exact GET
  // /cart aborts are accepted; every other failed request remains diagnostic.
  const expectedAborts = [expectedGetAbort('/cart', 2), ...(expected.abortedRequests ?? [])];
  const remainingAborts = new Map(
    expectedAborts.map((failure) => [
      `${failure.method} ${failure.path} ${failure.errorText}`,
      failure.maxCount,
    ]),
  );
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const locationUrl = message.location().url;
    const path = locationUrl ? new URL(locationUrl).pathname : null;
    const entry = `console: ${message.text()}`;
    if (
      path &&
      message.text().includes('Failed to load resource') &&
      expected.failedResourcePaths?.has(path)
    ) {
      diagnostics.expectedRuntimeFailures.push(entry);
    } else {
      diagnostics.unexpectedRuntimeFailures.push(entry);
    }
  });
  page.on('pageerror', (error) =>
    diagnostics.unexpectedRuntimeFailures.push(`pageerror: ${error.message}`),
  );
  page.on('requestfailed', (request) => {
    const path = new URL(request.url()).pathname;
    const errorText = request.failure()?.errorText ?? '';
    const entry = `requestfailed: ${request.method()} ${path} ${errorText}`;
    const identity = `${request.method()} ${path} ${errorText}`;
    const remaining = remainingAborts.get(identity) ?? 0;
    if (remaining > 0) {
      remainingAborts.set(identity, remaining - 1);
      diagnostics.expectedRuntimeFailures.push(entry);
    } else {
      diagnostics.unexpectedRuntimeFailures.push(entry);
    }
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4179' && response.status() >= 400) {
      diagnostics.httpFailures.push(
        `${response.request().method()} ${url.pathname} ${response.status()}`,
      );
    }
  });
  return diagnostics;
}

test('renders the My learning empty state within its responsive geometry', async ({ page }) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    abortedRequests: [
      expectedGetAbort('/enrollments/my', 5),
      expectedGetAbort('/cart', 5),
      expectedGetAbort('/src/app/layouts/assets/ai-assistant-navigation-ui018-2.png', 1),
    ],
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/my')
      return json(route, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/learning');
    const heading = page.getByRole('heading', { name: 'Start your learning journey' });
    const image = page
      .getByRole('region', { name: 'Start your learning journey' })
      .locator('img[aria-hidden="true"]');
    const browseCourses = page.getByRole('link', { name: 'Browse courses' });
    await expect(heading).toBeVisible();
    await expect(image).toHaveAttribute('alt', '');
    await expect(image).toHaveAttribute('src', /my-learning-empty-state-ui022\.png/);
    await expect(browseCourses).toHaveAttribute('href', '/');
    const geometry = await page.evaluate(() => {
      const heading = document.querySelector('#learning-empty-heading');
      const emptyState = heading?.closest('section');
      const image = emptyState?.querySelector('img[aria-hidden="true"]');
      if (
        !(image instanceof HTMLImageElement) ||
        !(heading instanceof HTMLElement) ||
        !(emptyState instanceof HTMLElement)
      )
        throw new Error('My learning empty-state elements are missing.');
      const imageRect = image.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const emptyStateRect = emptyState.getBoundingClientRect();
      const style = getComputedStyle(image);
      const emptyStateStyle = getComputedStyle(emptyState);
      return {
        imageWidth: imageRect.width,
        imageHeight: imageRect.height,
        imageLeft: imageRect.left,
        imageRight: imageRect.right,
        imageTop: imageRect.top,
        imageCenter: imageRect.left + imageRect.width / 2,
        headingTop: headingRect.top,
        headingLeft: headingRect.left,
        emptyStateLeft: emptyStateRect.left,
        emptyStateRight: emptyStateRect.right,
        columnGap: Number.parseFloat(emptyStateStyle.columnGap),
        objectFit: style.objectFit,
        objectPosition: style.objectPosition,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        layoutWidth: document.documentElement.clientWidth,
      };
    });
    const expectedImageSize = width < 768 ? Math.min(width - 32, 400) : width >= 1120 ? 520 : 400;
    expect(geometry.imageWidth).toBeCloseTo(expectedImageSize, 0);
    expect(geometry.imageHeight).toBeCloseTo(expectedImageSize, 0);
    expect(geometry.objectFit).toBe('contain');
    expect(geometry.objectPosition).toBe('50% 50%');
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.layoutWidth);
    expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.layoutWidth);
    if (width < 768) {
      expect(geometry.headingTop).toBeLessThan(geometry.imageTop);
    } else {
      const illustrationColumnRight = geometry.emptyStateLeft + expectedImageSize;
      expect(geometry.imageLeft).toBeGreaterThanOrEqual(geometry.emptyStateLeft - 0.5);
      expect(geometry.imageRight).toBeLessThanOrEqual(illustrationColumnRight + 0.5);
      expect(geometry.imageCenter).toBeCloseTo(geometry.emptyStateLeft + expectedImageSize / 2, 0);
      expect(geometry.headingLeft).toBeGreaterThanOrEqual(
        illustrationColumnRight + geometry.columnGap - 0.5,
      );
      expect(geometry.headingLeft).toBeLessThanOrEqual(geometry.emptyStateRight + 0.5);
    }
    await tabTo(page, browseCourses);
    await expect(browseCourses).toBeFocused();
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/learning');
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    const scaleGeometry = await page.evaluate(() => ({
      scale: window.visualViewport?.scale ?? 1,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      layoutWidth: document.documentElement.clientWidth,
    }));
    expect(scaleGeometry.scale).toBeCloseTo(2, 1);
    expect(scaleGeometry.documentWidth).toBeLessThanOrEqual(scaleGeometry.layoutWidth);
    expect(scaleGeometry.bodyWidth).toBeLessThanOrEqual(scaleGeometry.layoutWidth);
  } finally {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await cdp.detach();
  }
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('keeps aggregate progress separate from fresh lesson state, dedupes action, and never requests media', async ({
  page,
}) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set(['/courses/7/lessons/12/complete']),
    abortedRequests: [expectedGetAbort('/cart', 4), expectedGetAbort('/enrollments/4', 4)],
  });
  const requests: string[] = [];
  let completeRequests = 0;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/'))
      throw new Error('Media must not be requested by FE-011');
    const isLearningApi =
      url.pathname === '/me' ||
      url.pathname === '/enrollments/4' ||
      url.pathname === '/courses/7/progress' ||
      url.pathname === '/courses/7/lessons' ||
      url.pathname === '/courses/7/lessons/12/complete' ||
      url.pathname === '/courses/7/lessons/12/incomplete';
    if (!isLearningApi) return route.fallback();
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 1,
        total_lessons: 2,
        progress_percentage: 50,
      });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return json(route, {
        items: [
          {
            id: 12,
            title: 'First browser lesson',
            lesson_type: 'text',
            download_url: null,
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/courses/7/lessons/12/complete') {
      requests.push(url.pathname);
      completeRequests += 1;
      if (completeRequests === 2) return json(route, { detail: 'private mutation failure' }, 500);
      return json(route, { lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
    }
    if (url.pathname === '/courses/7/lessons/12/incomplete') {
      requests.push(url.pathname);
      return json(route, { lesson_id: 12, completed: false, completed_at: null });
    }
    throw new Error(`Unexpected request ${request.method()} ${url.pathname}`);
  });
  await page.goto('/learning/enrollments/4');
  await expect(page.getByRole('heading', { name: 'Browser learning course' })).toBeVisible();
  await expect(page.getByText('Not completed', { exact: true })).toBeVisible();
  await expect(page.getByText('Completion status unavailable')).toHaveCount(0);
  const initialStatus = page.getByText('Not completed', { exact: true });
  await expect(initialStatus).toHaveCSS('margin-bottom', '8px');
  await expect(initialStatus).toHaveCSS('color', 'rgb(75, 50, 181)');
  await expect(initialStatus).toHaveCSS('background-color', 'rgb(238, 235, 251)');
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-label',
    '1 of 2 lessons completed, 50%',
  );
  await expect(page.getByText('1 available now · 1 lesson coming soon')).toBeVisible();
  await expect(page.getByText('Media unavailable in this workspace')).toHaveCount(0);
  const markComplete = page.getByRole('button', { name: 'Complete lesson' });
  await expect(markComplete).toHaveCSS('color', 'rgb(75, 50, 181)');
  await expect(markComplete).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(markComplete).toHaveCSS('border-top-width', '0px');
  await markComplete.hover();
  await expect(markComplete).toHaveCSS('color', 'rgb(115, 92, 224)');
  await expect(markComplete).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(markComplete).toHaveCSS('text-decoration-line', 'none');
  const completeIcon = markComplete.locator('svg[aria-hidden="true"]');
  await expect(completeIcon).toHaveCount(1);
  await expect(completeIcon).toHaveCSS('color', 'rgb(115, 92, 224)');
  await expect(completeIcon).toHaveCSS('width', '18px');
  await expect(completeIcon).toHaveCSS('height', '18px');
  const completeAlignment = await markComplete.evaluate((action) => {
    const content = action.querySelector(':scope > span');
    if (content === null) throw new Error('Completion action content group is missing');
    const actionRect = action.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      horizontalOffset: contentRect.x - actionRect.x,
      horizontalSpace: actionRect.width - contentRect.width,
      verticalOffset: contentRect.y - actionRect.y,
      verticalSpace: actionRect.height - contentRect.height,
    };
  });
  expect(completeAlignment.horizontalOffset).toBeCloseTo(completeAlignment.horizontalSpace / 2, 1);
  expect(completeAlignment.verticalOffset).toBeCloseTo(completeAlignment.verticalSpace / 2, 1);
  const markCompleteBox = await markComplete.boundingBox();
  expect(markCompleteBox).not.toBeNull();
  if (markCompleteBox === null) throw new Error('Complete lesson action has no pointer target');
  await page.mouse.move(
    markCompleteBox.x + markCompleteBox.width / 2,
    markCompleteBox.y + markCompleteBox.height / 2,
  );
  await page.mouse.down();
  await expect(markComplete).toHaveCSS('color', 'rgb(61, 41, 155)');
  await expect(markComplete).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(markComplete).toHaveCSS('text-decoration-line', 'none');
  await expect(completeIcon).toHaveCSS('color', 'rgb(61, 41, 155)');
  await page.mouse.up();
  const courseHeader = page
    .locator('header')
    .filter({ has: page.getByRole('heading', { name: 'Browser learning course' }) });
  const courseDescription = courseHeader.getByText('No course description is available.', {
    exact: true,
  });
  const lessonRow = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: 'First browser lesson' }) });
  const courseContentGap = async () => {
    const descriptionBox = await courseDescription.boundingBox();
    const lessonRowBox = await lessonRow.boundingBox();
    if (descriptionBox === null || lessonRowBox === null)
      throw new Error('Learning header or first lesson geometry is unavailable');
    return lessonRowBox.y - (descriptionBox.y + descriptionBox.height);
  };
  const initialCourseFeedbackGap = await courseContentGap();
  await expect.poll(() => requests).toEqual(['/courses/7/lessons/12/complete']);
  await expect(page.getByText('Lesson marked complete.')).toHaveCount(0);
  const completedStatus = lessonRow.getByText('Completed', { exact: true });
  await expect(completedStatus).toBeVisible();
  await expect(completedStatus).toHaveCSS('color', 'rgb(4, 120, 87)');
  await expect(completedStatus).toHaveCSS('background-color', 'rgb(236, 253, 245)');
  await expect(completedStatus).not.toHaveAttribute('role');
  await expect(completedStatus).not.toHaveAttribute('tabindex');
  expect(
    await completedStatus.evaluate((status) => status.parentElement?.firstElementChild === status),
  ).toBe(true);
  const markIncomplete = page.getByRole('button', { name: 'Undo completion' });
  await expect(markIncomplete).toBeVisible();
  const completionCourseFeedbackGap = await courseContentGap();
  expect(completionCourseFeedbackGap).toBeCloseTo(initialCourseFeedbackGap, 1);
  await expect(markIncomplete.locator('svg[aria-hidden="true"]')).toHaveCount(1);
  const markIncompleteBox = await markIncomplete.boundingBox();
  expect(markIncompleteBox).not.toBeNull();
  expect(markIncompleteBox?.width).toBe(markCompleteBox?.width);
  await markIncomplete.hover();
  await expect(markIncomplete).toHaveCSS('color', 'rgb(115, 92, 224)');
  await expect(markIncomplete).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(markIncomplete).toHaveCSS('text-decoration-line', 'none');
  const incompleteIcon = markIncomplete.locator('svg[aria-hidden="true"]');
  await expect(incompleteIcon).toHaveCSS('color', 'rgb(115, 92, 224)');
  if (markIncompleteBox === null) throw new Error('Undo completion action has no pointer target');
  await page.mouse.move(
    markIncompleteBox.x + markIncompleteBox.width / 2,
    markIncompleteBox.y + markIncompleteBox.height / 2,
  );
  await page.mouse.down();
  await expect(markIncomplete).toHaveCSS('color', 'rgb(61, 41, 155)');
  await expect(markIncomplete).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(markIncomplete).toHaveCSS('text-decoration-line', 'none');
  await expect(incompleteIcon).toHaveCSS('color', 'rgb(61, 41, 155)');
  await page.mouse.up();
  const incompleteStatus = page.getByText('Not completed', { exact: true });
  await expect(incompleteStatus).toBeVisible();
  await expect(incompleteStatus).toHaveCSS('color', 'rgb(75, 50, 181)');
  await expect(incompleteStatus).toHaveCSS('background-color', 'rgb(238, 235, 251)');
  await expect(incompleteStatus).not.toHaveAttribute('role');
  await expect(incompleteStatus).not.toHaveAttribute('tabindex');
  expect(
    await incompleteStatus.evaluate((status) => status.parentElement?.firstElementChild === status),
  ).toBe(true);
  await expect(page.getByText('Lesson marked incomplete.')).toHaveCount(0);
  const undoCourseFeedbackGap = await courseContentGap();
  expect(undoCourseFeedbackGap).toBeCloseTo(initialCourseFeedbackGap, 1);
  await page.getByRole('button', { name: 'Complete lesson' }).click();
  await expect(page.getByText('Lesson progress could not be updated. Try again.')).toBeVisible();
  await expect(page.getByText('Not completed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete lesson' })).toBeFocused();
  await page.reload();
  await expect(page.getByText('Not completed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Complete lesson' })).toBeVisible();
  expect(requests).toEqual([
    '/courses/7/lessons/12/complete',
    '/courses/7/lessons/12/incomplete',
    '/courses/7/lessons/12/complete',
  ]);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.client);
    expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.client);
  }
  const effectiveScaleGeometry = async () => {
    await page.evaluate(() => {
      document.documentElement.style.zoom = '200%';
    });
    return page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
  };
  const zoomedByLocale = [{ locale: 'en', ...(await effectiveScaleGeometry()) }];
  for (const locale of ['ru', 'uz'] as const) {
    await page.evaluate((selectedLocale) => {
      localStorage.setItem('learnhub.locale', selectedLocale);
    }, locale);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Browser learning course' })).toBeVisible();
    zoomedByLocale.push({ locale, ...(await effectiveScaleGeometry()) });
  }
  for (const zoomed of zoomedByLocale) {
    expect(zoomed.documentWidth, JSON.stringify(zoomedByLocale)).toBeLessThanOrEqual(zoomed.client);
    expect(zoomed.bodyWidth, JSON.stringify(zoomedByLocale)).toBeLessThanOrEqual(zoomed.client);
  }
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual(['POST /courses/7/lessons/12/complete 500']);
});

test('requests authorized video only after explicit keyboard activation and renders the native preview', async ({
  page,
}) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  const mediaRequests: string[] = [];
  let releaseMediaResponse: () => void = () => undefined;
  const mediaResponseReleased = new Promise<void>((resolve) => {
    releaseMediaResponse = resolve;
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 1,
        progress_percentage: 0,
      });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return json(route, {
        items: [
          {
            id: 12,
            title: 'Authorized browser video',
            lesson_type: 'video',
            download_url: '/media/lessons/lesson%20one.mp4',
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/media/lessons/lesson%20one.mp4') {
      mediaRequests.push(url.pathname);
      expect(request.headers().authorization).toBe('Bearer student-token');
      await mediaResponseReleased;
      return route.fulfill({ status: 200, contentType: 'video/mp4', body: VALID_VIDEO_MP4 });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning/enrollments/4');
  const loadVideo = page.getByRole('button', { name: 'Load video' });
  await expect(loadVideo).toBeVisible();
  expect(mediaRequests).toEqual([]);
  await tabTo(page, loadVideo);
  await expect(loadVideo).toBeFocused();
  await page.keyboard.press('Enter');
  const loadingVideo = page.getByRole('button', { name: 'Loading media…' });
  await expect(loadingVideo).toHaveAttribute('aria-busy', 'true');
  await expect(loadingVideo).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Loading media…');
  await page.keyboard.press('Enter');
  expect(mediaRequests).toEqual(['/media/lessons/lesson%20one.mp4']);
  releaseMediaResponse();
  const preview = page.getByLabel('Lesson video preview');
  await expect(preview).toBeVisible();
  await expect(preview).toBeFocused();
  await expect(preview).toHaveAttribute('controls');
  await expect(preview).toHaveAttribute('preload', 'metadata');
  await expect(preview).toHaveAttribute('src', /^blob:/);
  await expectNativeVideoReadiness(preview);
  await expect(page.getByRole('status')).toHaveText('Video ready.');
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectStableLessonMediaGeometry(preview);
  }
  await expectEffectivePageScaleGeometry(page, preview);
  expect(mediaRequests).toEqual(['/media/lessons/lesson%20one.mp4']);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('recovers a same-MIME corrupt video without a false-ready state and retries with a fresh resource', async ({
  page,
}) => {
  await installStudent(page);
  await installLessonMediaLifecycleProbe(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  const mediaPath = '/media/lessons/corrupt-first.mp4';
  let mediaRequestCount = 0;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 1,
        progress_percentage: 0,
      });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return json(route, {
        items: [
          {
            id: 12,
            title: 'Corrupt then valid browser video',
            lesson_type: 'video',
            download_url: mediaPath,
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === mediaPath) {
      mediaRequestCount += 1;
      expect(request.headers().authorization).toBe('Bearer student-token');
      return route.fulfill({
        status: 200,
        contentType: 'video/mp4',
        body:
          mediaRequestCount === 1
            ? Buffer.from('same MIME, malformed video bytes')
            : VALID_VIDEO_MP4,
      });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning/enrollments/4');
  await page.getByRole('button', { name: 'Load video' }).click();
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible();
  await expect(retry).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Media could not be loaded. Try again.');
  await expect(page.getByText('Video ready.')).toHaveCount(0);
  const failedLifecycle = await readLessonMediaLifecycleProbe(page);
  expect(failedLifecycle.readyAnnouncementCount).toBe(0);
  expect(failedLifecycle.createdObjectUrls).toHaveLength(1);
  expect(failedLifecycle.revokedObjectUrls).toEqual([failedLifecycle.createdObjectUrls[0]]);
  expect(mediaRequestCount).toBe(1);

  await retry.click();
  const replacementPreview = page.getByLabel('Lesson video preview');
  await expect(replacementPreview).toBeVisible();
  await expectNativeVideoReadiness(replacementPreview);
  await expect(replacementPreview).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Video ready.');
  await expectStableLessonMediaGeometry(replacementPreview);
  const recoveredLifecycle = await readLessonMediaLifecycleProbe(page);
  expect(recoveredLifecycle.createdObjectUrls).toHaveLength(2);
  expect(recoveredLifecycle.createdObjectUrls[1]).not.toBe(recoveredLifecycle.createdObjectUrls[0]);
  expect(recoveredLifecycle.revokedObjectUrls).toEqual([recoveredLifecycle.createdObjectUrls[0]]);
  expect(mediaRequestCount).toBe(2);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('renders authorized PDF in-page with basic navigation and stable geometry', async ({
  page,
}) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  const mediaRequests: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 1,
        progress_percentage: 0,
      });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return json(route, {
        items: [
          {
            id: 12,
            title: 'Authorized browser PDF',
            lesson_type: 'pdf',
            download_url: '/media/lessons/lesson.pdf',
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/media/lessons/lesson.pdf') {
      mediaRequests.push(url.pathname);
      expect(request.headers().authorization).toBe('Bearer student-token');
      return route.fulfill({ status: 200, contentType: 'application/pdf', body: VALID_PDF });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning/enrollments/4');
  const loadPdf = page.getByRole('button', { name: 'Load PDF' });
  expect(mediaRequests).toEqual([]);
  await tabTo(page, loadPdf);
  await expect(loadPdf).toBeFocused();
  await page.keyboard.press('Enter');
  const preview = page.getByRole('region', { name: 'Lesson PDF preview' });
  await expect(preview).toBeVisible();
  await expect(preview).toBeFocused();
  await expect(preview.locator('canvas')).toBeVisible();
  await expect(preview.getByText('Page one PDF test')).toBeVisible();
  await expect
    .poll(() =>
      preview
        .locator('[data-part="lesson-pdf-viewport"]')
        .evaluate((element) => element.scrollHeight > element.clientHeight),
    )
    .toBe(true);
  await expect(page.getByRole('status')).toContainText('Page 1 of 2');
  await expect(page.locator('iframe, object, embed')).toHaveCount(0);
  await expect(preview.locator('a')).toHaveCount(0);
  expect(mediaRequests).toEqual(['/media/lessons/lesson.pdf']);

  const nextPage = preview.getByRole('button', { name: 'Next page' });
  await tabTo(page, nextPage);
  await preview.evaluate((element) => {
    element.setAttribute('data-body-focus-count', '0');
    const recordFocus = () => {
      if (document.activeElement === document.body) {
        const current = Number.parseInt(element.getAttribute('data-body-focus-count') ?? '0', 10);
        element.setAttribute('data-body-focus-count', String(current + 1));
      }
    };
    document.addEventListener('focusin', recordFocus, true);
    document.addEventListener('focusout', () => queueMicrotask(recordFocus), true);
  });
  const pendingForward = await nextPage.evaluate((element) => {
    if (!(element instanceof HTMLButtonElement))
      throw new Error('Next-page control is not a button.');
    const region = element.closest('[role="region"]');
    const status = region?.querySelector('[role="status"]');
    if (!(status instanceof HTMLElement)) throw new Error('PDF render status was not rendered.');
    return new Promise<{
      activeName: string | null;
      activeTag: string | null;
      disabled: boolean;
      status: string | null;
    }>((resolve) => {
      const observer = new MutationObserver(() => {
        if (status.textContent !== 'Rendering PDF page 2.') return;
        element.click();
        observer.disconnect();
        resolve({
          activeName: document.activeElement?.textContent?.trim() ?? null,
          activeTag: document.activeElement?.tagName ?? null,
          disabled: element.disabled,
          status: status.textContent,
        });
      });
      observer.observe(status, { childList: true, characterData: true, subtree: true });
      element.click();
    });
  });
  expect(pendingForward).toEqual({
    activeName: 'Next page',
    activeTag: 'BUTTON',
    disabled: false,
    status: 'Rendering PDF page 2.',
  });
  await expect(preview.getByText('Page two PDF test')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Page 2 of 2');
  const previousPage = preview.getByRole('button', { name: 'Previous page' });
  await expect(previousPage).toBeFocused();
  await expect(nextPage).toBeDisabled();
  await page.keyboard.press('Enter');
  await expect(preview.getByText('Page one PDF test')).toBeVisible();
  await expect(nextPage).toBeFocused();
  await expect(previousPage).toBeDisabled();
  expect(await preview.getAttribute('data-body-focus-count')).toBe('0');
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectStableLessonMediaGeometry(preview);
    await expectPdfViewportGeometry(preview, width);
  }
  await expectEffectivePageScaleGeometry(page, preview);
  await expectPdfViewportGeometry(preview, 1440);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('aborts a pending authorized media request when the workspace unmounts', async ({ page }) => {
  await installStudent(page);
  const mediaPath = '/media/lessons/pending.mp4';
  const diagnostics = captureRuntimeDiagnostics(page, {
    abortedRequests: [
      expectedGetAbort('/enrollments/4', 1),
      expectedGetAbort('/enrollments/my', 1),
      expectedGetAbort(mediaPath, 1),
    ],
  });
  let releaseMediaResponse: () => void = () => undefined;
  const mediaResponseReleased = new Promise<void>((resolve) => {
    releaseMediaResponse = resolve;
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/my')
      return json(route, {
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 1,
        progress_percentage: 0,
      });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return json(route, {
        items: [
          {
            id: 12,
            title: 'Pending browser video',
            lesson_type: 'video',
            download_url: mediaPath,
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === mediaPath) {
      await mediaResponseReleased;
      return route.fulfill({ status: 200, contentType: 'video/mp4', body: VALID_VIDEO_MP4 });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning/enrollments/4');
  await page.getByRole('button', { name: 'Load video' }).click();
  await expect(page.getByRole('button', { name: 'Loading media…' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await page.goto('/learning');
  releaseMediaResponse();
  await expect(page.getByRole('heading', { name: 'My learning' })).toBeVisible();
  await expect
    .poll(
      () => diagnostics.expectedRuntimeFailures.filter((entry) => entry.includes(mediaPath)).length,
    )
    .toBe(1);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

const deniedMediaScenarios = [
  { lessonType: 'video', mediaPath: '/media/lessons/denied.mp4', loadControl: 'Load video' },
  { lessonType: 'pdf', mediaPath: '/media/lessons/denied.pdf', loadControl: 'Load PDF' },
] as const;

for (const scenario of deniedMediaScenarios)
  for (const status of [403, 404])
    test(`keeps denied ${scenario.lessonType} API-025 ${status} neutral and focuses its announced result`, async ({
      page,
    }) => {
      await installStudent(page);
      const diagnostics = captureRuntimeDiagnostics(page, {
        failedResourcePaths: new Set([scenario.mediaPath]),
        abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
      });
      await page.route('**/*', async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
        if (url.pathname === '/me') return json(route, student);
        if (url.pathname === '/enrollments/4') return json(route, enrollment);
        if (url.pathname === '/courses/7/progress')
          return json(route, {
            course_id: 7,
            completed_lessons: 0,
            total_lessons: 1,
            progress_percentage: 0,
          });
        if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
          return json(route, {
            items: [
              {
                id: 12,
                title: 'Neutral denied media',
                lesson_type: scenario.lessonType,
                download_url: scenario.mediaPath,
                description: null,
                is_published: true,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
              },
            ],
            page: 1,
            page_size: 100,
            total: 1,
            pages: 1,
            has_next: false,
            has_previous: false,
          });
        if (url.pathname === scenario.mediaPath) return json(route, { detail: 'private' }, status);
        if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
          throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
        return route.fallback();
      });

      await page.goto('/learning/enrollments/4');
      const loadMedia = page.getByRole('button', { name: scenario.loadControl });
      await tabTo(page, loadMedia);
      await page.keyboard.press('Enter');
      const unavailable = page.getByText('Media unavailable in this workspace');
      await expect(unavailable).toBeVisible();
      await expect(unavailable).toHaveAttribute('role', 'status');
      await expect(unavailable).toBeFocused();
      await expect(page.getByText('private')).toHaveCount(0);
      expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
      expect(diagnostics.httpFailures).toEqual([`GET ${scenario.mediaPath} ${status}`]);
    });

test('keeps the Cart-style guarded completion action truthful and single-request while pending across pointer and keyboard input', async ({
  page,
}) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  let completionRequests = 0;
  let settleProgress: (() => void) | undefined;
  const progress = new Promise<void>((resolve) => {
    settleProgress = resolve;
  });
  let settleCompletion: (() => void) | undefined;
  const completion = new Promise<void>((resolve) => {
    settleCompletion = resolve;
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/'))
      throw new Error('Media must not be requested by the pending-control scenario');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress') {
      await progress;
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 1,
        progress_percentage: 0,
      });
    }
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return json(route, {
        items: [
          {
            id: 12,
            title: 'Pending browser lesson',
            lesson_type: 'text',
            download_url: null,
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/courses/7/lessons/12/complete') {
      completionRequests += 1;
      await completion;
      return json(route, {
        lesson_id: 12,
        completed: true,
        completed_at: '2026-07-31T00:00:00Z',
      });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning/enrollments/4');
  const action = page.getByRole('button', { name: /Complete lesson|Undo completion/ });
  await action.click();
  await expect.poll(() => completionRequests).toBe(1);
  await expect(action).toHaveAttribute('aria-disabled', 'true');
  await expect(action).toHaveAttribute('aria-busy', 'true');
  await expect(action).toHaveJSProperty('disabled', false);
  await expect(action).toHaveAttribute('data-state', 'idle');
  await expect(action).toHaveAccessibleName('Undo completion');
  await expect(action).toHaveCSS('color', 'rgb(75, 50, 181)');
  await expect(action).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(action).toHaveCSS('border-top-width', '0px');
  await expect(action).toHaveCSS('text-decoration-line', 'none');
  await expect(action.locator('[data-part="spinner"]')).toHaveCount(0);
  await expect(action.locator('svg[aria-hidden="true"]')).toHaveCSS('color', 'rgb(75, 50, 181)');
  await expect(page.getByRole('status')).toHaveText('Updating lesson progress.');
  await expect(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  const actionBox = await action.boundingBox();
  if (actionBox === null) throw new Error('Pending lesson action has no pointer target');
  await page.mouse.click(actionBox.x + actionBox.width / 2, actionBox.y + actionBox.height / 2);
  await page.keyboard.press('Enter');
  await page.keyboard.press(' ');
  await expect.poll(() => completionRequests).toBe(1);

  settleProgress?.();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(action).toHaveAccessibleName('Undo completion');

  settleCompletion?.();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await expect(page.getByText('Lesson marked complete.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Undo completion' })).toBeFocused();
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

test('focuses the retry action after a retryable API-025 failure', async ({ page }) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set(['/media/lessons/retry.mp4']),
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 1,
        progress_percentage: 0,
      });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return json(route, {
        items: [
          {
            id: 12,
            title: 'Retryable media',
            lesson_type: 'video',
            download_url: '/media/lessons/retry.mp4',
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/media/lessons/retry.mp4') return json(route, { detail: 'private' }, 500);
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning/enrollments/4');
  const loadVideo = page.getByRole('button', { name: 'Load video' });
  await tabTo(page, loadVideo);
  await page.keyboard.press('Enter');
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible();
  await expect(retry).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Media could not be loaded. Try again.');
  await expect(page.getByText('private')).toHaveCount(0);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([
    'GET /media/lessons/retry.mp4 500',
    'GET /media/lessons/retry.mp4 500',
  ]);
});

test('makes a forbidden lesson mutation neutral and suppresses further actions', async ({
  page,
}) => {
  await installStudent(page);
  const forbiddenPath = '/courses/7/lessons/12/incomplete';
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set([forbiddenPath]),
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/'))
      throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') return json(route, enrollment);
    if (url.pathname === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 1,
        progress_percentage: 0,
      });
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return json(route, {
        items: [
          {
            id: 12,
            title: 'Forbidden mutation lesson',
            lesson_type: 'text',
            download_url: null,
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/courses/7/lessons/12/complete')
      return json(route, { lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
    if (url.pathname === forbiddenPath)
      return json(route, { detail: 'private mutation detail' }, 403);
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });
  await page.goto('/learning/enrollments/4');
  await page.getByRole('button', { name: 'Complete lesson' }).click();
  await page.getByRole('button', { name: 'Undo completion' }).click();
  await expect(page.getByRole('heading', { name: 'Learning workspace unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: /mark|try again/i })).toHaveCount(0);
  await expect(page.getByText('private mutation detail')).toHaveCount(0);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([`POST ${forbiddenPath} 403`]);
});

test('marks a malformed mutation outcome unknown and refetches its exact progress origin', async ({
  page,
}) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  let enrollmentReads = 0;
  let progressReads = 0;
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/'))
      throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') {
      enrollmentReads += 1;
      return json(route, enrollment);
    }
    if (url.pathname === '/courses/7/progress') {
      progressReads += 1;
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 1,
        progress_percentage: 0,
      });
    }
    if (url.pathname === '/courses/7/lessons' && request.method() === 'GET')
      return json(route, {
        items: [
          {
            id: 12,
            title: 'Uncertain mutation lesson',
            lesson_type: 'text',
            download_url: null,
            description: null,
            is_published: true,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        page: 1,
        page_size: 100,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/courses/7/lessons/12/complete')
      return json(route, { lesson_id: 999, completed: true, completed_at: null });
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });
  await page.goto('/learning/enrollments/4');
  const initialEnrollmentReads = enrollmentReads;
  const initialProgressReads = progressReads;
  await page.getByRole('button', { name: 'Complete lesson' }).click();
  await expect(
    page.getByText('We could not confirm the lesson update. Progress is being refreshed.'),
  ).toBeVisible();
  await expect(page.getByText('Not completed', { exact: true })).toBeVisible();
  await expect(page.getByText('Completion status unavailable')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Complete lesson' })).toBeVisible();
  await expect.poll(() => enrollmentReads).toBeGreaterThan(initialEnrollmentReads);
  await expect.poll(() => progressReads).toBeGreaterThan(initialProgressReads);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

const unavailableScenarios = [
  { operation: 'API-022', path: '/enrollments/4', status: 403 },
  { operation: 'API-022', path: '/enrollments/4', status: 404 },
  { operation: 'API-019', path: '/courses/7/progress', status: 403 },
  { operation: 'API-019', path: '/courses/7/progress', status: 404 },
  { operation: 'API-014', path: '/courses/7/lessons', status: 403 },
  { operation: 'API-014', path: '/courses/7/lessons', status: 404 },
] as const;

for (const scenario of unavailableScenarios)
  test(`makes ${scenario.operation} ${scenario.status} neutral with no actions`, async ({
    page,
  }) => {
    await installStudent(page);
    const diagnostics = captureRuntimeDiagnostics(page, {
      failedResourcePaths: new Set([scenario.path]),
      abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
    });
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
      if (url.pathname.startsWith('/media/'))
        throw new Error('Media must not be requested by FE-011');
      if (url.pathname === '/me') return json(route, student);
      if (url.pathname === scenario.path)
        return json(route, { detail: 'private' }, scenario.status);
      if (url.pathname === '/enrollments/4') return json(route, enrollment);
      if (url.pathname === '/courses/7/progress')
        return json(route, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 0,
          progress_percentage: 0,
        });
      if (url.pathname === '/courses/7/lessons')
        return json(route, {
          items: [],
          page: 1,
          page_size: 100,
          total: 0,
          pages: 1,
          has_next: false,
          has_previous: false,
        });
      if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
        throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
      return route.fallback();
    });
    await page.goto('/learning/enrollments/4');
    await expect(
      page.getByRole('heading', { name: 'Learning workspace unavailable' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /mark|try again/i })).toHaveCount(0);
    await expect(page.getByText('private')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Lessons/ })).toHaveCount(0);
    expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
    expect(diagnostics.httpFailures).toEqual([`GET ${scenario.path} ${scenario.status}`]);
  });

interface PartialAvailabilityScenario {
  readonly name: string;
  readonly failedPaths: readonly string[];
  readonly notice: string;
  readonly retained: 'outline' | 'progress' | 'none';
}

const partialAvailabilityScenarios: readonly PartialAvailabilityScenario[] = [
  {
    name: 'progress failure retains the lesson outline',
    failedPaths: ['/courses/7/progress'],
    notice: 'Progress summary is unavailable',
    retained: 'outline',
  },
  {
    name: 'lesson-outline failure retains the progress summary',
    failedPaths: ['/courses/7/lessons'],
    notice: 'Lesson outline is unavailable',
    retained: 'progress',
  },
  {
    name: 'both failures remain total-unavailable',
    failedPaths: ['/courses/7/progress', '/courses/7/lessons'],
    notice: 'Learning progress is unavailable',
    retained: 'none',
  },
];

for (const scenario of partialAvailabilityScenarios)
  test(`keeps independent learning data useful when ${scenario.name}`, async ({ page }) => {
    await installStudent(page);
    const diagnostics = captureRuntimeDiagnostics(page, {
      failedResourcePaths: new Set(scenario.failedPaths),
      abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
    });
    let recoveryEnabled = false;
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
      if (url.pathname.startsWith('/media/'))
        throw new Error('Media must not be requested by FE-037');
      if (url.pathname === '/me') return json(route, student);
      if (url.pathname === '/enrollments/4') return json(route, enrollment);
      if (url.pathname === '/courses/7/progress') {
        if (!recoveryEnabled && scenario.failedPaths.includes(url.pathname))
          return json(route, { detail: 'private progress detail' }, 500);
        return json(route, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      }
      if (url.pathname === '/courses/7/lessons') {
        if (!recoveryEnabled && scenario.failedPaths.includes(url.pathname))
          return json(route, { detail: 'private outline detail' }, 500);
        return json(route, {
          items: [
            {
              id: 12,
              title: 'Recovered independent lesson',
              lesson_type: 'text',
              download_url: null,
              description: null,
              is_published: true,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
          page: 1,
          page_size: 100,
          total: 1,
          pages: 1,
          has_next: false,
          has_previous: false,
        });
      }
      if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
        throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
      return route.fallback();
    });

    await page.goto('/learning/enrollments/4');
    const retry = page.getByRole('button', { name: 'Try again' });
    await expect(page.getByText(scenario.notice, { exact: true })).toBeVisible();
    await expect(page.getByText('private progress detail')).toHaveCount(0);
    await expect(page.getByText('private outline detail')).toHaveCount(0);
    if (scenario.retained === 'outline') {
      await expect(page.getByRole('heading', { name: 'Lessons (1)' })).toBeVisible();
      await expect(page.getByText('Recovered independent lesson')).toBeVisible();
      await expect(page.getByRole('progressbar')).toHaveCount(0);
    } else if (scenario.retained === 'progress') {
      await expect(page.getByRole('progressbar')).toBeVisible();
      await expect(page.getByRole('heading', { name: /Lessons/ })).toHaveCount(0);
    } else {
      await expect(page.getByRole('progressbar')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: /Lessons/ })).toHaveCount(0);
    }
    await tabTo(page, retry);
    recoveryEnabled = true;
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Learning progress' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lessons (1)' })).toBeVisible();
    expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
    expect([...diagnostics.httpFailures].sort()).toEqual(
      scenario.failedPaths.flatMap((path) => [`GET ${path} 500`, `GET ${path} 500`]).sort(),
    );
  });

const learningFailureCopy = {
  en: {
    title: 'Learning data is unavailable',
    message: 'The server returned an invalid response. Try again.',
    retry: 'Try again',
  },
  ru: {
    title: 'Данные об обучении недоступны',
    message: 'Сервер вернул некорректный ответ. Повторите попытку.',
    retry: 'Повторить',
  },
  uz: {
    title: 'Ta’lim ma’lumotlari mavjud emas',
    message: 'Server noto‘g‘ri javob qaytardi. Qayta urinib ko‘ring.',
    retry: 'Qayta urinish',
  },
} as const;

for (const locale of ['en', 'ru', 'uz'] as const) {
  test(`resolves a settled Learning failure in ${locale} without private server text`, async ({
    page,
  }) => {
    await installStudent(page);
    const diagnostics = captureRuntimeDiagnostics(page, {
      abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
    });
    let writes = 0;
    page.on('request', (request) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes += 1;
    });
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
      if (url.pathname === '/me') return json(route, student);
      if (url.pathname === '/enrollments/4')
        return json(route, { malformed: 'private learning failure' });
      if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
        throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
      return route.fallback();
    });

    await page.goto('/learning/enrollments/4');
    if (locale !== 'en') {
      await page.getByRole('button', { name: 'Change language' }).press('Enter');
      await page
        .getByRole('button', { name: locale === 'ru' ? 'Русский' : "O'zbek", exact: true })
        .press('Enter');
    }

    const copy = learningFailureCopy[locale];
    await expect(page.getByRole('heading', { level: 1, name: copy.title })).toBeVisible();
    await expect(page.getByText(copy.message, { exact: true })).toBeVisible();
    await expect(page.getByText('private learning failure')).toHaveCount(0);
    const retry = page.getByRole('button', { name: copy.retry });
    for (const width of [320, 390, 768, 1280] as const) {
      await page.setViewportSize({ width, height: 900 });
      await retry.focus();
      await expect(retry).toBeFocused();
      const geometry = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        layoutWidth: document.documentElement.clientWidth,
      }));
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.layoutWidth);
      expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.layoutWidth);
    }
    expect(writes).toBe(0);
    expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
    expect(diagnostics.httpFailures).toEqual([]);
  });
}

test('recovers API-022 enrollment detail by keyboard and focuses the restored course heading', async ({
  page,
}) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set(['/enrollments/4']),
    abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
  });
  let enrollmentRecoveryEnabled = false;
  const dependentRequests: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/'))
      throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/4') {
      if (!enrollmentRecoveryEnabled)
        return json(route, { detail: 'private enrollment failure' }, 500);
      return json(route, enrollment);
    }
    if (url.pathname === '/courses/7/progress') {
      dependentRequests.push(url.pathname);
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 0,
        progress_percentage: 0,
      });
    }
    if (url.pathname === '/courses/7/lessons') {
      dependentRequests.push(url.pathname);
      return json(route, {
        items: [],
        page: 1,
        page_size: 100,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning/enrollments/4');
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(page.getByRole('heading', { name: 'Learning data is unavailable' })).toBeVisible();
  await expect(retry).toBeVisible();
  await expect(page.getByText('private enrollment failure')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /mark/i })).toHaveCount(0);
  expect(dependentRequests).toEqual([]);
  await tabTo(page, retry);
  enrollmentRecoveryEnabled = true;
  await page.keyboard.press('Enter');
  const courseHeading = page.getByRole('heading', { name: enrollment.course.title });
  await expect(page.getByRole('heading', { name: 'Learning progress' })).toBeVisible();
  await expect(courseHeading).toBeFocused();
  expect(dependentRequests).toEqual(['/courses/7/progress', '/courses/7/lessons']);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual(['GET /enrollments/4 500', 'GET /enrollments/4 500']);
});

test('keeps student contextual navigation consistent across the DD-259 CSS-width matrix', async ({
  page,
}) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    abortedRequests: [
      expectedGetAbort('/enrollments/my', 11),
      expectedGetAbort('/enrollments/4', 11),
      expectedGetAbort('/cart', 22),
      expectedGetAbort('/src/app/layouts/assets/ai-assistant-navigation-ui018-2.png', 1),
    ],
  });
  const longCourseTitle =
    'A deliberately long browser learning course title that must wrap without clipping the truthful current segment';
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/'))
      throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/my')
      return json(route, {
        items: [{ ...enrollment, course: { ...enrollment.course, title: longCourseTitle } }],
        page: 1,
        page_size: 20,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname === '/enrollments/4')
      return json(route, {
        ...enrollment,
        course: { ...enrollment.course, title: longCourseTitle },
      });
    if (url.pathname === '/courses/7/progress')
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 0,
        progress_percentage: 0,
      });
    if (url.pathname === '/courses/7/lessons')
      return json(route, {
        items: [],
        page: 1,
        page_size: 100,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  for (const width of [320, 390, 479, 480, 767, 768, 1023, 1024, 1119, 1120, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/learning');
    const listBreadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    const catalog = listBreadcrumb.getByRole('link', { name: 'Catalog', exact: true });
    await expect(catalog).toHaveAttribute('href', '/');
    await expect(listBreadcrumb.getByRole('link')).toHaveCount(1);
    await expect(listBreadcrumb.locator('[aria-current="page"]')).toHaveText('/My learning');

    await page.goto('/learning/enrollments/4');
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    const backLink = breadcrumb.getByRole('link', { name: 'My learning', exact: true });
    await expect(backLink).toHaveAttribute('href', '/learning');
    await expect(breadcrumb.getByRole('link')).toHaveCount(1);
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(longCourseTitle);
    await expect(breadcrumb.getByRole('link', { name: longCourseTitle })).toHaveCount(0);
    await backLink.hover();
    await expect(backLink).toHaveCSS('text-decoration-line', 'underline');
    await page.mouse.move(0, 0);
    await tabTo(page, backLink);
    await expect(backLink).toBeFocused();
    await expect(backLink).toHaveCSS('text-decoration-line', 'underline');
    const geometry = await backLink.evaluate((link) => {
      const rect = link.getBoundingClientRect();
      const icon = link.querySelector('svg')?.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        layoutWidth: document.documentElement.clientWidth,
        targetHeight: rect.height,
        iconHeight: icon?.height ?? -1,
      };
    });
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.layoutWidth);
    expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.layoutWidth);
    expect(geometry.targetHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.iconHeight).toBeCloseTo(20, 1);
  }
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([]);
});

for (const status of ['pending_payment', 'cancelled'] as const)
  test(`${status} enrollment sends no progress or lesson-action request`, async ({ page }) => {
    await installStudent(page);
    const diagnostics = captureRuntimeDiagnostics(page, {
      abortedRequests: [expectedGetAbort('/enrollments/4', 1)],
    });
    const learningRequests: string[] = [];
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
      if (url.pathname.startsWith('/media/'))
        throw new Error('Media must not be requested by FE-011');
      if (url.pathname === '/me') return json(route, student);
      if (url.pathname === '/enrollments/4') {
        learningRequests.push(url.pathname);
        return json(route, { ...enrollment, status });
      }
      if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/')) {
        throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
      }
      return route.fallback();
    });
    await page.goto('/learning/enrollments/4');
    if (status === 'pending_payment') {
      await expect(page.getByText('Payment pending', { exact: true }).last()).toBeVisible();
      await expect(
        page.getByText(
          'Mock payment is awaiting completion. Learning remains locked until your enrollment is active.',
        ),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Complete mock payment' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Simulate mock payment failure' }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText('Learning progress is not available for this enrollment.'),
      ).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /mark|try again/i })).toHaveCount(0);
    expect(learningRequests).toContain('/enrollments/4');
    expect(learningRequests.length).toBeLessThanOrEqual(2);
    expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
    expect(diagnostics.httpFailures).toEqual([]);
  });

for (const locale of ['en', 'ru', 'uz'] as const) {
  test(`resolves the complete DRAFT-22 learning residual family and exact payment write in ${locale}`, async ({
    page,
  }) => {
    test.slow();
    await installStudent(page);
    const copy = learningResidualBrowserCopy[locale];
    const diagnostics = captureRuntimeDiagnostics(page, {
      abortedRequests: [
        expectedGetAbort('/cart', 4),
        expectedGetAbort('/enrollments/my', 2),
        expectedGetAbort('/enrollments/4', 4),
        expectedGetAbort('/courses/7/progress', 2),
        expectedGetAbort('/courses/7/lessons', 2),
      ],
    });
    let enrollmentStatus: 'pending_payment' | 'cancelled' | 'active' = 'pending_payment';
    const writeRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.origin === 'http://127.0.0.1:4179' &&
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
      ) {
        writeRequests.push(`${request.method()} ${url.pathname}`);
      }
    });
    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
      if (url.pathname === '/me') return json(route, student);
      if (url.pathname === '/enrollments/my')
        return json(route, {
          items: [{ ...enrollment, status: enrollmentStatus }],
          page: 1,
          page_size: 20,
          total: 1,
          pages: 1,
          has_next: false,
          has_previous: false,
        });
      if (url.pathname === '/enrollments/4')
        return json(route, { ...enrollment, status: enrollmentStatus });
      if (url.pathname === '/payments/complete') {
        expect(request.method()).toBe('POST');
        expect(request.headers().authorization).toBe('Bearer student-token');
        expect(request.postDataJSON()).toEqual({ enrollment_id: 4, status: 'failed' });
        enrollmentStatus = 'cancelled';
        return json(route, { enrollment_id: 4, status: 'cancelled', message: 'private mock' });
      }
      if (url.pathname === '/courses/7/progress') {
        if (enrollmentStatus !== 'active')
          throw new Error(`Progress requested for ${enrollmentStatus} enrollment`);
        return json(route, {
          course_id: 7,
          completed_lessons: 2,
          total_lessons: 5,
          progress_percentage: 40,
        });
      }
      if (url.pathname === '/courses/7/lessons') {
        if (enrollmentStatus !== 'active')
          throw new Error(`Lessons requested for ${enrollmentStatus} enrollment`);
        return json(route, {
          items: [],
          page: 1,
          page_size: 100,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: false,
        });
      }
      if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
        throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
      return route.fallback();
    });

    await page.goto('/learning');
    if (locale !== 'en') {
      await page.getByRole('button', { name: 'Change language' }).press('Enter');
      await page
        .getByRole('button', { name: locale === 'ru' ? 'Русский' : "O'zbek", exact: true })
        .press('Enter');
    }
    await expect(page).toHaveURL(/\/learning$/);
    const listBreadcrumb = page.getByRole('navigation', { name: copy.breadcrumb });
    await expect(listBreadcrumb.getByRole('link', { name: copy.catalog })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(listBreadcrumb.locator('[aria-current="page"]')).toHaveText(`/${copy.myLearning}`);

    await page.goto('/learning/enrollments/4');
    await expect(page.getByText(copy.paymentPending, { exact: true }).last()).toBeVisible();
    await expect(page.getByText(copy.pendingBody, { exact: true })).toBeVisible();
    const failedAction = page.getByRole('button', { name: copy.failedAction });
    await tabTo(page, failedAction);
    await expect(failedAction).toBeFocused();
    await page.keyboard.press('Enter');
    const declined = page.getByRole('alert');
    await expect(declined).toContainText(copy.declinedTitle);
    await expect(declined).toContainText(copy.declinedBody);
    await expect(declined).toHaveAttribute('aria-live', 'assertive');
    await expect(declined).toHaveAttribute('aria-atomic', 'true');
    await expect(page.locator('body')).not.toContainText(/private mock|learning:\w+|a11y:\w+/);
    expect(writeRequests).toEqual(['POST /payments/complete']);

    enrollmentStatus = 'active';
    await page.reload();
    await expect(page.getByRole('heading', { name: enrollment.course.title })).toBeVisible();
    await expect(page.getByText(copy.absentDescription, { exact: true })).toBeVisible();
    if (locale !== 'en')
      await expect(
        page.getByText('No course description is available.', { exact: true }),
      ).toHaveCount(0);
    await expect(page.getByRole('heading', { name: copy.progressHeading })).toBeVisible();
    await expect(page.getByText(copy.progressSummary, { exact: true })).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: copy.progressAccessibleName }),
    ).toBeVisible();
    const detailBreadcrumb = page.getByRole('navigation', { name: copy.breadcrumb });
    const backLink = detailBreadcrumb.getByRole('link', { name: copy.myLearning });
    await expect(backLink).toHaveAttribute('href', '/learning');

    for (const width of [320, 390, 768, 1280] as const) {
      await page.setViewportSize({ width, height: 900 });
      await backLink.focus();
      await expect(backLink).toBeFocused();
      const geometry = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      }));
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.clientWidth);
      expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.clientWidth);
    }

    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
      const scaledGeometry = await page.evaluate(() => ({
        scale: window.visualViewport?.scale ?? 1,
        visualWidth: window.visualViewport?.width ?? window.innerWidth,
        layoutWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      }));
      expect(scaledGeometry.scale).toBeCloseTo(2, 1);
      expect(scaledGeometry.visualWidth * scaledGeometry.scale).toBeCloseTo(
        scaledGeometry.layoutWidth,
        0,
      );
      expect(scaledGeometry.documentWidth).toBeLessThanOrEqual(scaledGeometry.layoutWidth);
      expect(scaledGeometry.bodyWidth).toBeLessThanOrEqual(scaledGeometry.layoutWidth);
    } finally {
      await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
      await cdp.detach();
    }

    expect(writeRequests).toEqual(['POST /payments/complete']);
    expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
    expect(diagnostics.httpFailures).toEqual([]);
  });
}

test('supports keyboard traversal and restores focus after list and workspace recovery', async ({
  page,
}) => {
  await installStudent(page);
  const diagnostics = captureRuntimeDiagnostics(page, {
    failedResourcePaths: new Set(['/enrollments/my', '/courses/7/progress']),
    abortedRequests: [
      expectedGetAbort('/enrollments/my', 1),
      expectedGetAbort('/enrollments/4', 1),
    ],
  });
  let listRecoveryEnabled = false;
  let workspaceRecoveryEnabled = false;
  const preListRecoveryDependents: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4179') return route.fallback();
    if (url.pathname.startsWith('/media/'))
      throw new Error('Media must not be requested by FE-011');
    if (url.pathname === '/me') return json(route, student);
    if (url.pathname === '/enrollments/my') {
      if (!listRecoveryEnabled) return json(route, { detail: 'private list failure' }, 500);
      return json(route, {
        items: [enrollment],
        page: 1,
        page_size: 20,
        total: 1,
        pages: 1,
        has_next: false,
        has_previous: false,
      });
    }
    if (url.pathname === '/enrollments/4') {
      if (!listRecoveryEnabled) preListRecoveryDependents.push(url.pathname);
      return json(route, enrollment);
    }
    if (url.pathname === '/courses/7/progress') {
      if (!listRecoveryEnabled) preListRecoveryDependents.push(url.pathname);
      if (!workspaceRecoveryEnabled)
        return json(route, { detail: 'private progress failure' }, 500);
      return json(route, {
        course_id: 7,
        completed_lessons: 0,
        total_lessons: 0,
        progress_percentage: 0,
      });
    }
    if (url.pathname === '/courses/7/lessons') {
      if (!listRecoveryEnabled) preListRecoveryDependents.push(url.pathname);
      return json(route, {
        items: [],
        page: 1,
        page_size: 100,
        total: 0,
        pages: 0,
        has_next: false,
        has_previous: false,
      });
    }
    if (url.pathname.startsWith('/courses/') || url.pathname.startsWith('/enrollments/'))
      throw new Error(`Unexpected learning request ${request.method()} ${url.pathname}`);
    return route.fallback();
  });

  await page.goto('/learning');
  const listRetry = page.getByRole('button', { name: 'Try again' });
  await expect(listRetry).toBeVisible();
  expect(preListRecoveryDependents).toEqual([]);
  await tabTo(page, listRetry);
  listRecoveryEnabled = true;
  await page.keyboard.press('Enter');
  const listHeading = page.getByRole('heading', { name: 'My learning' });
  await expect(page.getByText('1 enrollment · Page 1 of 1')).toBeVisible();
  await expect(listHeading).toBeFocused();
  const catalogReturn = page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Catalog' });
  await expect(catalogReturn).toHaveAttribute('href', '/');
  await catalogReturn.hover();
  await expect(catalogReturn).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const catalogReturnPosition = await catalogReturn.evaluate((link) => {
    const rect = link.getBoundingClientRect();
    const label = link.querySelector('span')?.getBoundingClientRect();
    const icon = link.querySelector('svg')?.getBoundingClientRect();
    if (!label || !icon) throw new Error('Catalog return-link content is missing.');
    return {
      left: rect.left,
      top: rect.top,
      height: rect.height,
      labelTop: label.top,
      iconTop: icon.top,
      iconHeight: icon.height,
    };
  });

  await page.goto('/learning/enrollments/4');
  const workspaceRetry = page.getByRole('button', { name: 'Try again' });
  await expect(workspaceRetry).toBeVisible();
  await tabTo(page, workspaceRetry);
  workspaceRecoveryEnabled = true;
  await page.keyboard.press('Enter');
  const detailHeading = page.getByRole('heading', { name: enrollment.course.title });
  await expect(page.getByRole('heading', { name: 'Learning progress' })).toBeVisible();
  await expect(detailHeading).toBeFocused();
  const myLearningReturn = page.locator('main').getByRole('link', { name: 'My learning' });
  const myLearningReturnPosition = await myLearningReturn.evaluate((link) => {
    const rect = link.getBoundingClientRect();
    const label = link.querySelector('span')?.getBoundingClientRect();
    const icon = link.querySelector('svg')?.getBoundingClientRect();
    if (!label || !icon) throw new Error('My learning return-link content is missing.');
    return {
      left: rect.left,
      top: rect.top,
      height: rect.height,
      labelTop: label.top,
      iconTop: icon.top,
      iconHeight: icon.height,
    };
  });
  expect(Math.abs(myLearningReturnPosition.left - catalogReturnPosition.left)).toBeLessThanOrEqual(
    0.5,
  );
  expect(Math.abs(myLearningReturnPosition.top - catalogReturnPosition.top)).toBeLessThanOrEqual(
    0.5,
  );
  expect(
    Math.abs(myLearningReturnPosition.height - catalogReturnPosition.height),
  ).toBeLessThanOrEqual(0.5);
  expect(
    Math.abs(myLearningReturnPosition.labelTop - catalogReturnPosition.labelTop),
  ).toBeLessThanOrEqual(0.5);
  expect(catalogReturnPosition.iconHeight).toBeCloseTo(20, 1);
  expect(myLearningReturnPosition.iconHeight).toBeCloseTo(20, 1);
  expect(
    Math.abs(
      myLearningReturnPosition.iconTop +
        myLearningReturnPosition.iconHeight / 2 -
        (catalogReturnPosition.iconTop + catalogReturnPosition.iconHeight / 2),
    ),
  ).toBeLessThanOrEqual(0.5);
  expect(diagnostics.unexpectedRuntimeFailures).toEqual([]);
  expect(diagnostics.httpFailures).toEqual([
    'GET /enrollments/my 500',
    'GET /enrollments/my 500',
    'GET /courses/7/progress 500',
    'GET /courses/7/progress 500',
  ]);
});
