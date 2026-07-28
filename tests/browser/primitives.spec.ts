import { expect, test, type Locator, type Page } from '@playwright/test';

interface RuntimeMonitor {
  assertClean: () => void;
}

function monitorRuntime(page: Page): RuntimeMonitor {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  return {
    assertClean: () => {
      expect(pageErrors, 'uncaught browser errors').toEqual([]);
      expect(consoleErrors, 'browser console errors').toEqual([]);
    },
  };
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));

  expect(widths.document, 'document must not overflow horizontally').toBeLessThanOrEqual(
    widths.viewport,
  );
  expect(widths.body, 'body must not overflow horizontally').toBeLessThanOrEqual(widths.viewport);
}

async function expectContainedInViewport(dialog: Locator) {
  const bounds = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportWidth: window.innerWidth,
    };
  });

  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
}

async function expectInternalTargetsAtEveryDensity(page: Page, targets: Locator[]) {
  for (const density of ['marketplace', 'workspace']) {
    await page.evaluate((mode) => {
      document.documentElement.setAttribute('data-density', mode);
    }, density);

    for (const target of targets) {
      const dimensions = await target.evaluate((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          minWidth: Number.parseFloat(style.minWidth),
          minHeight: Number.parseFloat(style.minHeight),
          width: rect.width,
          height: rect.height,
        };
      });
      expect(dimensions.minWidth).toBeGreaterThanOrEqual(44);
      expect(dimensions.minHeight).toBeGreaterThanOrEqual(44);
      expect(dimensions.width).toBeGreaterThanOrEqual(44);
      expect(dimensions.height).toBeGreaterThanOrEqual(44);
    }
  }
}

async function expectRenderedTargetsAtEveryDensity(page: Page, targets: Locator[]) {
  for (const density of ['marketplace', 'workspace']) {
    await page.evaluate((mode) => {
      document.documentElement.setAttribute('data-density', mode);
    }, density);

    for (const target of targets) {
      const dimensions = await target.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      expect(dimensions.width).toBeGreaterThanOrEqual(44);
      expect(dimensions.height).toBeGreaterThanOrEqual(44);
    }
  }
}

const viewports = [
  { name: 'mobile', width: 320, height: 740 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`renders semantic primitive states without reflow at ${viewport.width}px`, async ({
    page,
  }) => {
    const runtime = monitorRuntime(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Shared UI primitives' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Primary action' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Secondary action' })).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'Destructive action', exact: true }),
    ).toBeEnabled();

    const loadingButton = page.locator('button[data-state="loading"]');
    await expect(loadingButton).toBeDisabled();
    await expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('status').filter({ hasText: 'Saving changes' })).toHaveCount(1);

    const successButton = page.locator('button[data-state="success"]');
    const errorButton = page.locator('button[data-state="error"]');
    await expect(successButton.locator('[data-state-indicator="success"]')).toBeVisible();
    await expect(errorButton.locator('[data-state-indicator="error"]')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Changes saved' })).toHaveCount(1);
    await expect(page.getByRole('status').filter({ hasText: 'Save failed' })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Disabled action' })).toBeDisabled();

    const requiredInput = page.getByRole('textbox', { name: 'Course title' });
    await expect(requiredInput).toHaveAttribute('required', '');
    const requiredDescription = await requiredInput.getAttribute('aria-describedby');
    expect(requiredDescription).toBeTruthy();
    await expect(page.locator(`[id="${requiredDescription}"]`)).toHaveText(
      'Use a clear, unique title.',
    );

    const invalidInput = page.getByRole('textbox', { name: 'Instructor email' });
    await expect(invalidInput).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Course level' })).toHaveValue('intermediate');
    await expect(page.getByRole('textbox', { name: 'Course description' })).toBeVisible();

    await expect(
      page.getByRole('alert').filter({ hasText: 'The request could not be completed.' }),
    ).toHaveCount(1);
    await expect(
      page.getByRole('status').filter({ hasText: 'A polite informational update.' }),
    ).toHaveCount(1);
    await expect(page.getByRole('status', { name: 'Loading course preview' })).toHaveAttribute(
      'aria-busy',
      'true',
    );

    const pagination = page.getByRole('navigation', { name: 'Course results pages' });
    await expect(pagination.locator('[aria-current="page"]')).toHaveText('2');
    await expect(pagination.locator('[aria-current="page"]')).toHaveAttribute(
      'aria-label',
      'Page 2, current page',
    );
    await pagination.getByRole('button', { name: 'Go to next page' }).click();
    await expect(pagination.locator('[aria-current="page"]')).toHaveText('3');
    await expect(pagination.locator('[aria-current="page"]')).toHaveAttribute(
      'aria-label',
      'Page 3, current page',
    );
    await expect(pagination.getByRole('status')).toHaveText('Page 3 of 8');

    const paginationTargets = await pagination.getByRole('button').all();
    await expectInternalTargetsAtEveryDensity(page, [
      page.getByRole('button', { name: 'Dismiss notification' }),
      ...paginationTargets,
    ]);

    await page.getByRole('button', { name: 'Open dialog', exact: true }).click();
    const standardDialog = page.getByRole('dialog', { name: 'Edit lesson' });
    const closeDialog = standardDialog.getByRole('button', { name: 'Close dialog' });
    await expect(standardDialog).toBeVisible();
    await expectContainedInViewport(standardDialog);
    await expectInternalTargetsAtEveryDensity(page, [closeDialog]);
    await expectNoHorizontalOverflow(page);
    await closeDialog.click();
    await expect(standardDialog).toBeHidden();

    await page.getByRole('button', { name: 'Open destructive confirmation' }).click();
    const confirmation = page.getByRole('dialog', { name: 'Delete this lesson?' });
    const keepLesson = confirmation.getByRole('button', { name: 'Keep lesson' });
    const deleteLesson = confirmation.getByRole('button', { name: 'Delete lesson' });
    await expect(confirmation).toBeVisible();
    await expectContainedInViewport(confirmation);
    await expectRenderedTargetsAtEveryDensity(page, [keepLesson, deleteLesson]);
    await expectNoHorizontalOverflow(page);
    await keepLesson.click();
    await expect(confirmation).toBeHidden();

    await expectNoHorizontalOverflow(page);
    runtime.assertClean();
  });
}

test('supports native keyboard activation and visible forward/reverse focus', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await page.goto('/');

  const primary = page.getByRole('button', { name: 'Primary action' });
  const secondary = page.getByRole('button', { name: 'Secondary action' });
  await primary.focus();
  await expect(primary).toBeFocused();
  expect(await primary.evaluate((element) => element.matches(':focus-visible'))).toBe(true);

  await page.keyboard.press('Tab');
  await expect(secondary).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(primary).toBeFocused();

  const nextPage = page.getByRole('button', { name: 'Go to next page' });
  await nextPage.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('navigation', { name: 'Course results pages' }).locator('[aria-current="page"]'),
  ).toHaveText('3');
  await expect(
    page.getByRole('navigation', { name: 'Course results pages' }).locator('[aria-current="page"]'),
  ).toHaveAttribute('aria-label', 'Page 3, current page');

  const previousPage = page.getByRole('button', { name: 'Go to previous page' });
  await previousPage.focus();
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('navigation', { name: 'Course results pages' }).locator('[aria-current="page"]'),
  ).toHaveText('2');
  await expect(
    page.getByRole('navigation', { name: 'Course results pages' }).locator('[aria-current="page"]'),
  ).toHaveAttribute('aria-label', 'Page 2, current page');

  runtime.assertClean();
});

test('traps dialog focus in both directions, closes with Escape, and restores focus', async ({
  page,
}) => {
  const runtime = monitorRuntime(page);
  await page.goto('/');

  const invoker = page.getByRole('button', { name: 'Open dialog', exact: true });
  await invoker.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Edit lesson' });
  const first = dialog.getByRole('button', { name: 'Close dialog' });
  const last = dialog.getByRole('button', { name: 'Save lesson' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(first).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(invoker).toBeFocused();
  runtime.assertClean();
});

test('isolates nested dialog interaction in the modal portal and restores the active layer', async ({
  page,
}) => {
  const runtime = monitorRuntime(page);
  await page.goto('/');

  const invoker = page.getByRole('button', { name: 'Open dialog', exact: true });
  await invoker.click();
  const parentDialog = page.getByRole('dialog', { name: 'Edit lesson' });
  await expect(parentDialog).toBeVisible();
  await expect(page.locator('#root')).toHaveAttribute('inert', '');
  await expect(page.locator('[data-dialog-portal-root]')).toHaveCount(1);

  const nestedInvoker = parentDialog.getByRole('button', { name: 'Open nested dialog' });
  await nestedInvoker.click();
  const nestedDialog = page.getByRole('dialog', { name: 'Confirm nested edit' });
  await expect(nestedDialog).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(nestedDialog.locator('..')).toHaveCSS('z-index', '500');

  await invoker.focus();
  await expect(nestedDialog).toContainText('This dialog must be the only active modal layer.');
  await expect(nestedDialog.getByRole('button', { name: 'Close dialog' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(nestedDialog).toBeHidden();
  await expect(parentDialog).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Edit lesson' })).toHaveCount(1);
  await expect(nestedInvoker).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(parentDialog).toBeHidden();
  await expect(invoker).toBeFocused();
  runtime.assertClean();
});

test('keeps destructive confirmation modal while pending and announces one recoverable error', async ({
  page,
}) => {
  const runtime = monitorRuntime(page);
  await page.goto('/');

  const invoker = page.getByRole('button', { name: 'Open destructive confirmation' });
  await invoker.focus();
  await page.keyboard.press('Space');

  const dialog = page.getByRole('dialog', { name: 'Delete this lesson?' });
  const cancel = dialog.getByRole('button', { name: 'Keep lesson' });
  const confirm = dialog.getByRole('button', { name: 'Delete lesson' });
  await expect(dialog).toBeVisible();
  await expect(cancel).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(dialog).toHaveAttribute('aria-busy', 'true');
  await expect(cancel).toBeDisabled();
  const pendingConfirm = dialog.locator('button[data-state="loading"]');
  await expect(pendingConfirm).toBeDisabled();
  await expect(dialog.getByRole('status')).toHaveText('Destructive action in progress');

  const backdrop = page.locator('[data-part="backdrop"]');
  await backdrop.click({ position: { x: 2, y: 2 } });
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();

  const alert = dialog.getByRole('alert');
  await expect(alert).toHaveCount(1);
  await expect(alert).toContainText('Demo failure: the item was not deleted.', { timeout: 3_000 });
  await expect(dialog).not.toHaveAttribute('aria-busy', 'true');

  const failedConfirm = dialog.locator('button[data-state="error"]');
  const alertId = await alert.getAttribute('id');
  expect(alertId).toBeTruthy();
  await expect(failedConfirm).toHaveAttribute('aria-describedby', alertId!);
  await expect(
    dialog.getByText('Demo failure: the item was not deleted.', { exact: true }),
  ).toHaveCount(1);

  await cancel.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(invoker).toBeFocused();
  runtime.assertClean();
});

test('disables spinner and skeleton animations when reduced motion is requested', async ({
  page,
}) => {
  const runtime = monitorRuntime(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  expect(
    await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
  ).toBe(true);

  const spinner = page.locator('[data-part="spinner"]');
  await expect(spinner).toHaveCSS('animation-name', 'none');

  const skeletons = page.locator('[data-part="skeleton"]');
  await expect(skeletons).toHaveCount(3);
  for (let index = 0; index < (await skeletons.count()); index += 1) {
    await expect(skeletons.nth(index)).toHaveCSS('animation-name', 'none');
  }

  runtime.assertClean();
});
