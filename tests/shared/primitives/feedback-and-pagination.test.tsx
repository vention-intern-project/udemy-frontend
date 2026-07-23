// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Notice, Pagination, Skeleton, SkeletonGroup } from '../../../src/shared/ui/primitives';

afterEach(cleanup);

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
  it('marks and announces the current page and supports native keyboard activation', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={4} onPageChange={onPageChange} />);

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go to page 2' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('status').textContent).toContain('Page 2 of 4');

    const next = screen.getByRole('button', { name: 'Go to next page' });
    next.focus();
    await user.keyboard('{Enter}');
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables unavailable boundary actions', () => {
    const { rerender } = render(<Pagination currentPage={1} totalPages={2} onPageChange={() => undefined} />);
    expect((screen.getByRole('button', { name: 'Go to previous page' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<Pagination currentPage={2} totalPages={2} onPageChange={() => undefined} />);
    expect((screen.getByRole('button', { name: 'Go to next page' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('uses explicit server edge availability without changing the default consumer behavior', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination currentPage={1} totalPages={3} hasNext={false} hasPrevious={false} onPageChange={onPageChange} />,
    );

    const previous = screen.getByRole('button', { name: 'Go to previous page' }) as HTMLButtonElement;
    const next = screen.getByRole('button', { name: 'Go to next page' }) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(true);
    await user.click(next);
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(<Pagination currentPage={1} totalPages={3} onPageChange={onPageChange} />);
    expect((screen.getByRole('button', { name: 'Go to next page' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('applies server direction availability to numbered targets and callback guards', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination currentPage={2} totalPages={4} hasPrevious={false} hasNext onPageChange={onPageChange} />,
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
    rerender(<Pagination currentPage={1} totalPages={3} hasPrevious hasNext={false} onPageChange={onPageChange} />);
    const pageTwo = screen.getByRole('button', { name: 'Go to page 2' }) as HTMLButtonElement;
    const pageThreeBlocked = screen.getByRole('button', { name: 'Go to page 3' }) as HTMLButtonElement;
    expect(pageTwo.disabled).toBe(true);
    expect(pageThreeBlocked.disabled).toBe(true);
    pageTwo.disabled = false;
    pageThreeBlocked.disabled = false;
    fireEvent.click(pageTwo);
    fireEvent.click(pageThreeBlocked);
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(<Pagination currentPage={2} totalPages={3} onPageChange={onPageChange} />);
    expect((screen.getByRole('button', { name: 'Go to page 1' }) as HTMLButtonElement).disabled).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('bounds invalid runtime inputs and emits only safe in-range page changes', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination currentPage={Number.NaN} totalPages={Number.POSITIVE_INFINITY} onPageChange={onPageChange} />,
    );

    expect(screen.getByRole('status').textContent).toContain('Page 1 of 1');
    expect(screen.getAllByRole('button')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Go to next page' }));
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(<Pagination currentPage={2.5} totalPages={3.5} onPageChange={onPageChange} />);
    expect(screen.getByRole('status').textContent).toContain('Page 1 of 1');
    expect(screen.getAllByRole('button')).toHaveLength(3);

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
    expect(onPageChange.mock.calls.every(([page]) => Number.isSafeInteger(page) && page >= 1))
      .toBe(true);
  });
});
