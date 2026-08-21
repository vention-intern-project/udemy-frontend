// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Notice, Pagination, Skeleton, SkeletonGroup } from '../../../src/shared/ui/primitives';
import { LocaleProvider, localeRuntime, type Locale } from '../../../src/shared/locale';

afterEach(async () => {
  cleanup();
  await localeRuntime.changeLanguage('en');
});

describe('Notice', () => {
  it('uses assertive announcements for errors and polite announcements for informational updates', () => {
    const { rerender } = render(<Notice tone="error">Unable to save</Notice>);
    const error = screen.getByRole('alert');
    expect(error.getAttribute('aria-live')).toBe('assertive');

    rerender(<Notice tone="info">Course saved</Notice>);
    const info = screen.getByRole('status');
    expect(info.getAttribute('aria-live')).toBe('polite');
    expect(info.getAttribute('aria-atomic')).toBe('true');
  });
});

describe('Skeleton', () => {
  it('announces a loading region once while hiding visual placeholders', () => {
    render(
      <SkeletonGroup label="Loading course list">
        <Skeleton />
        <Skeleton shape="rect" height={80} />
      </SkeletonGroup>,
    );

    const region = screen.getByRole('status', { name: 'Loading course list' });
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});

describe('Pagination', () => {
  it.each([
    ['ru', 'Страница 2 из 4'],
    ['uz', 'Sahifa 2 dan 4'],
  ] as const)('announces the admitted current-page relation in %s', (locale: Locale, status) => {
    render(
      <LocaleProvider initialLocale={locale}>
        <Pagination currentPage={2} totalPages={4} onPageChange={() => undefined} />
      </LocaleProvider>,
    );

    expect(screen.getByRole('status').textContent).toBe(status);
  });

  it('exposes the current page as non-action state and supports native keyboard activation for available directions', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={4} onPageChange={onPageChange} />);

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy();
    const currentPage = screen.getByLabelText('Page 2, current page');
    expect(currentPage.getAttribute('aria-current')).toBe('page');
    expect(currentPage.textContent).toBe('2');
    expect(screen.queryByRole('button', { name: 'Go to page 2' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Page 2 of 4');

    const next = screen.getByRole('button', { name: 'Go to next page' });
    next.focus();
    await user.keyboard('{Enter}');
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('keeps only non-current numbered targets actionable', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={4} onPageChange={onPageChange} />);

    const controls = screen.getAllByRole('button') as HTMLButtonElement[];
    const currentPage = screen.getByLabelText('Page 2, current page');
    expect(currentPage.getAttribute('aria-current')).toBe('page');
    expect(currentPage.textContent).toBe('2');
    expect(screen.queryByRole('button', { name: 'Go to page 2' })).toBeNull();

    const enabledTargets = [
      ['Go to previous page', 1],
      ['Go to page 1', 1],
      ['Go to page 3', 3],
      ['Go to page 4', 4],
      ['Go to next page', 3],
    ] as const;
    expect(controls).toHaveLength(enabledTargets.length);

    for (const [name, target] of enabledTargets) {
      await user.click(screen.getByRole('button', { name }));
      expect(onPageChange).toHaveBeenLastCalledWith(target);
    }
    expect(onPageChange).toHaveBeenCalledTimes(enabledTargets.length);
  });

  it('uses 20px Lucide chevrons only for the opt-in direction mode while retaining button names and status text', () => {
    const { rerender } = render(
      <Pagination
        currentPage={2}
        totalPages={4}
        onPageChange={() => undefined}
        directionDisplay="arrows"
      />,
    );

    const previous = screen.getByRole('button', { name: 'Go to previous page' });
    const next = screen.getByRole('button', { name: 'Go to next page' });
    expect(previous.querySelector('svg.lucide-chevron-left')?.getAttribute('width')).toBe('20');
    expect(next.querySelector('svg.lucide-chevron-right')?.getAttribute('width')).toBe('20');
    expect(previous.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(next.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain('Page 2 of 4');

    rerender(<Pagination currentPage={2} totalPages={4} onPageChange={() => undefined} />);
    const textPrevious = screen.getByRole('button', { name: 'Go to previous page' });
    const textNext = screen.getByRole('button', { name: 'Go to next page' });
    expect(textPrevious.textContent).toBe('Previous');
    expect(textNext.textContent).toBe('Next');
  });

  it('replaces unavailable direction actions with inert geometry slots outside the tab order', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={2} onPageChange={() => undefined} />,
    );
    expect(screen.queryByRole('button', { name: 'Go to previous page' })).toBeNull();
    expect(document.querySelectorAll('.ui-pagination__direction-slot')).toHaveLength(1);
    expect(
      document.querySelector('.ui-pagination__direction-slot')?.getAttribute('aria-hidden'),
    ).toBe('true');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Go to page 2' }));
    rerender(<Pagination currentPage={2} totalPages={2} onPageChange={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Go to next page' })).toBeNull();
    expect(document.querySelectorAll('.ui-pagination__direction-slot')).toHaveLength(1);
  });

  it('uses explicit server edge availability without changing the default consumer behavior', async () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination
        currentPage={1}
        totalPages={3}
        hasNext={false}
        hasPrevious={false}
        onPageChange={onPageChange}
        directionDisplay="arrows"
      />,
    );

    expect(screen.queryByRole('button', { name: 'Go to previous page' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Go to next page' })).toBeNull();
    expect(document.querySelectorAll('.ui-pagination__direction-slot')).toHaveLength(2);

    rerender(<Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />);
    expect(
      (screen.getByRole('button', { name: 'Go to next page' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('applies server direction availability to numbered targets and callback guards', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination
        currentPage={2}
        totalPages={4}
        hasPrevious={false}
        hasNext
        onPageChange={onPageChange}
      />,
    );

    const pageOne = screen.getByRole('button', { name: 'Go to page 1' }) as HTMLButtonElement;
    const pageThree = screen.getByRole('button', { name: 'Go to page 3' }) as HTMLButtonElement;
    expect(pageOne.disabled).toBe(true);
    expect(pageThree.disabled).toBe(false);
    pageOne.disabled = false;
    fireEvent.click(pageOne);
    expect(onPageChange).not.toHaveBeenCalled();
    await user.click(pageThree);
    expect(onPageChange).toHaveBeenCalledWith(3);

    onPageChange.mockClear();
    rerender(
      <Pagination
        currentPage={1}
        totalPages={3}
        hasPrevious
        hasNext={false}
        onPageChange={onPageChange}
      />,
    );
    const pageTwo = screen.getByRole('button', { name: 'Go to page 2' }) as HTMLButtonElement;
    const pageThreeBlocked = screen.getByRole('button', {
      name: 'Go to page 3',
    }) as HTMLButtonElement;
    expect(pageTwo.disabled).toBe(true);
    expect(pageThreeBlocked.disabled).toBe(true);
    pageTwo.disabled = false;
    pageThreeBlocked.disabled = false;
    fireEvent.click(pageTwo);
    fireEvent.click(pageThreeBlocked);
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(<Pagination currentPage={2} totalPages={3} onPageChange={onPageChange} />);
    expect(
      (screen.getByRole('button', { name: 'Go to page 1' }) as HTMLButtonElement).disabled,
    ).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('bounds invalid runtime inputs and emits only safe in-range page changes', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination
        currentPage={Number.NaN}
        totalPages={Number.POSITIVE_INFINITY}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByRole('status').textContent).toContain('Page 1 of 1');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(<Pagination currentPage={2.5} totalPages={3.5} onPageChange={onPageChange} />);
    expect(screen.getByRole('status').textContent).toContain('Page 1 of 1');
    expect(screen.queryAllByRole('button')).toHaveLength(0);

    rerender(
      <Pagination
        currentPage={Number.MAX_SAFE_INTEGER + 1}
        totalPages={Number.MAX_SAFE_INTEGER + 1}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain('Page 1 of 1');

    rerender(<Pagination currentPage={99} totalPages={4} onPageChange={onPageChange} />);
    expect(screen.getByRole('status').textContent).toContain('Page 4 of 4');
    await user.click(screen.getByRole('button', { name: 'Go to previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    const lastCall = onPageChange.mock.calls[onPageChange.mock.calls.length - 1];
    expect(Number.isSafeInteger(lastCall?.[0])).toBe(true);

    rerender(
      <Pagination
        currentPage={Number.MAX_SAFE_INTEGER}
        totalPages={Number.MAX_SAFE_INTEGER}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getAllByRole('button').length).toBeLessThanOrEqual(7);
    await user.click(screen.getByRole('button', { name: 'Go to previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(Number.MAX_SAFE_INTEGER - 1);
    expect(onPageChange.mock.calls.every(([page]) => Number.isSafeInteger(page) && page >= 1)).toBe(
      true,
    );
  });

  it('preserves an authoritative out-of-range current page and makes every enabled target actionable', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={99}
        totalPages={1}
        hasPrevious
        hasNext={false}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByRole('status').textContent).toContain('Page 99 of 1');
    const previous = screen.getByRole('button', {
      name: 'Go to previous page',
    }) as HTMLButtonElement;
    const pageOne = screen.getByRole('button', { name: 'Go to page 1' }) as HTMLButtonElement;
    const currentPage = screen.getByLabelText('Page 99, current page');
    expect(currentPage.getAttribute('aria-current')).toBe('page');
    expect(currentPage.textContent).toBe('99');
    const next = screen.queryByRole('button', { name: 'Go to next page' });
    expect(previous.disabled).toBe(false);
    expect(pageOne.disabled).toBe(false);
    expect(next).toBeNull();
    expect(document.querySelectorAll('.ui-pagination__direction-slot')).toHaveLength(1);

    await user.click(previous);
    await user.click(pageOne);
    expect(onPageChange.mock.calls).toEqual([[98], [1]]);
  });
});
