import type { Page } from '@playwright/test';

export const APP_SHELL_BRAND_IMAGE_PATH = '/src/app/layouts/assets/learnhub-book-ui018.png';

const APP_SHELL_BRAND_IMAGE_SELECTOR = `img[src*="${APP_SHELL_BRAND_IMAGE_PATH}"]`;

export async function waitForAppShellBrandImage(page: Page): Promise<void> {
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
