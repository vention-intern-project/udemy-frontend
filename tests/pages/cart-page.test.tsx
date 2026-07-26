// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import { cartQueryKey } from '../../src/features/cart-workflow';
import { CartPage } from '../../src/pages/cart-page';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';
import { QueryClientProvider } from '@tanstack/react-query';

const student = {
  email: 'student@example.test', name: 'Sam', surname: 'Student', role: 'student',
  birthday: null, phone_number: null, created_at: '2026-01-01T00:00:00Z',
};
const cartWithItems = {
  id: 1,
  items: [
    { id: 10, course_id: 7, added_at: '2026-01-01T00:00:00Z', course: { id: 7, title: 'Long accessible course title', price: '19.990', currency: 'USD' } },
    { id: 11, course_id: 8, added_at: '2026-01-01T00:00:00Z', course: { id: 8, title: 'Second course', price: '10.00', currency: 'USD' } },
  ],
  total_price: '29.990', currency: 'USD', item_count: 2,
};
const cartWithThreeItems = {
  id: 1,
  items: [
    { id: 10, course_id: 7, added_at: '2026-01-01T00:00:00Z', course: { id: 7, title: 'First course', price: '10.00', currency: 'USD' } },
    { id: 11, course_id: 8, added_at: '2026-01-01T00:00:00Z', course: { id: 8, title: 'Middle course', price: '10.00', currency: 'USD' } },
    { id: 12, course_id: 9, added_at: '2026-01-01T00:00:00Z', course: { id: 9, title: 'Last course', price: '10.00', currency: 'USD' } },
  ],
  total_price: '30.00', currency: 'USD', item_count: 3,
};

function tokenStore(token = 'student-token'): AccessTokenStore {
  let value: string | null = token;
  return { get: () => value, set: (next) => { value = next; }, clear: () => { value = null; } };
}

function decode<TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>, value: unknown): TResponse {
  return options.decode ? options.decode(value) : value as TResponse;
}

async function renderCart(request: ApiClient['request']) {
  const queryClient = createAppQueryClient();
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={{ request }} tokenStore={tokenStore()}>
          <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}><CartPage /></MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>,
    );
  });
  return queryClient;
}

afterEach(() => { vi.restoreAllMocks(); });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function interact(action: () => Promise<void>) {
  await act(async () => { await action(); });
}

async function removeCourseAndExpectFocus(courseId: number, expectedActionName: string) {
  let currentItems = cartWithThreeItems.items;
  const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
    if (options.path === '/me') return decode(options, student);
    if (options.path === '/cart' && options.method === 'GET') {
      return decode(options, { ...cartWithThreeItems, items: currentItems, item_count: currentItems.length });
    }
    if (options.path === `/cart/items/${courseId}`) {
      currentItems = currentItems.filter((item) => item.course_id !== courseId);
      return decode(options, undefined);
    }
    throw new Error(`Unexpected request ${options.method} ${options.path}`);
  };
  await renderCart(request);
  const user = userEvent.setup();

  const removeAction = await screen.findByRole('button', {
    name: `Remove ${cartWithThreeItems.items.find((item) => item.course_id === courseId)?.course.title}`,
  });
  await interact(() => user.click(removeAction));
  await waitFor(() => expect(screen.getByRole('button', { name: expectedActionName })).toBe(document.activeElement));
}

describe('CartPage', () => {
  it('renders the exact long server total without decimal recomputation', async () => {
    const totalPrice = '1000000000000000000000019.0001';
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') return decode(options, { ...cartWithItems, total_price: totalPrice });
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);

    expect((await screen.findByLabelText('Cart total')).textContent).toContain(`USD ${totalPrice}`);
  });

  it('keeps the newest initial-error retry focus intent when an obsolete retry fails', async () => {
    let reads = 0;
    let rejectFirstRetry: ((error: Error) => void) | undefined;
    const firstRetry = new Promise<unknown>((_resolve, reject) => { rejectFirstRetry = reject; });
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        reads += 1;
        if (reads === 1) throw new ApiError({ kind: 'server', status: 503, message: 'private' });
        if (reads === 2) return decode(options, await firstRetry);
        if (reads === 3) return decode(options, cartWithItems);
      }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();
    const refresh = await screen.findByRole('button', { name: 'Refresh cart' });
    await act(async () => { fireEvent.click(refresh); fireEvent.click(refresh); });
    await waitFor(() => expect(reads).toBe(2));
    expect((screen.getByRole('button', { name: 'Refresh cart' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { rejectFirstRetry?.(new ApiError({ kind: 'server', status: 503, message: 'private' })); });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Refresh cart' }) as HTMLButtonElement).disabled).toBe(false));
    await interact(() => user.click(screen.getByRole('button', { name: 'Refresh cart' })));
    await waitFor(() => expect(reads).toBe(3));
    await screen.findByRole('button', { name: 'Remove Long accessible course title' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Cart' })).toBe(document.activeElement));
  });

  it('does not steal focus during an ordinary retained-data refresh', async () => {
    let reads = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        reads += 1;
        if (reads === 2) throw new ApiError({ kind: 'server', status: 503, message: 'private' });
        return decode(options, cartWithItems);
      }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    const queryClient = await renderCart(request);
    const remove = await screen.findByRole('button', { name: 'Remove Long accessible course title' });

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: cartQueryKey('student@example.test'), exact: true }, { throwOnError: false });
    });
    const refresh = await screen.findByRole('button', { name: 'Refresh cart' });
    remove.focus();
    await act(async () => { fireEvent.click(refresh); });

    await waitFor(() => expect(reads).toBe(3));
    expect(remove).toBe(document.activeElement);
  });

  it('serializes destructive input, exposes aggregate busy state, and revalidates the shared cart after removal', async () => {
    let resolveRemove: (() => void) | undefined;
    let cartReads = 0;
    let removeRequests = 0;
    let clearRequests = 0;
    const pendingRemove = new Promise<void>((resolve) => { resolveRemove = resolve; });
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        cartReads += 1;
        return decode(options, cartReads === 1 ? cartWithItems : { ...cartWithItems, items: [cartWithItems.items[1]], total_price: '10.00', item_count: 1 });
      }
      if (options.path === '/cart/items/7') {
        removeRequests += 1;
        await pendingRemove;
        return decode(options, undefined);
      }
      if (options.path === '/cart') {
        clearRequests += 1;
        return decode(options, undefined);
      }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();

    const remove = await screen.findByRole('button', { name: 'Remove Long accessible course title' });
    await interact(() => user.click(remove));
    await waitFor(() => expect(removeRequests).toBe(1));
    expect(screen.getByRole('article').getAttribute('aria-busy')).toBe('true');
    expect((screen.getByRole('button', { name: 'Removing…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Clear cart' }) as HTMLButtonElement).disabled).toBe(true);
    await interact(() => user.dblClick(screen.getByRole('button', { name: 'Remove Second course' })));
    expect(removeRequests).toBe(1);
    expect(clearRequests).toBe(0);

    await act(async () => { resolveRemove?.(); });
    expect(await screen.findByText('Course removed from cart.')).toBeTruthy();
    await waitFor(() => expect(cartReads).toBe(2));
    expect(screen.getAllByText('USD 10.00')).toHaveLength(2);
  });

  it('preserves stale content on a background failure and clears remove feedback only after a successful recovery', async () => {
    let reads = 0;
    let removeAttempts = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        reads += 1;
        if (reads === 2) throw new ApiError({ kind: 'server', status: 503, message: 'private' });
        return decode(options, cartWithItems);
      }
      if (options.path === '/cart/items/7') {
        removeAttempts += 1;
        throw new ApiError({ kind: 'not_found', status: 404, message: 'private' });
      }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();
    const remove = await screen.findByRole('button', { name: 'Remove Long accessible course title' });
    await interact(() => user.click(remove));
    const refresh = await screen.findByRole('button', { name: 'Refresh cart' });
    expect(screen.getByText('Cart changed')).toBeTruthy();
    await interact(() => user.click(refresh));
    await waitFor(() => expect(reads).toBe(2));
    expect(screen.getByRole('heading', { name: 'Cart' })).toBeTruthy();
    await interact(() => user.click(screen.getAllByRole('button', { name: 'Refresh cart' })[0]));
    await waitFor(() => expect(reads).toBe(3));
    expect(removeAttempts).toBe(1);
    expect(screen.queryByText('Cart changed')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Cart' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Long accessible course title' })).toBeTruthy();
  });

  it('requires confirmation before clearing and revalidates the empty cart result', async () => {
    let reads = 0;
    let clearRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        reads += 1;
        return decode(options, reads === 1 ? cartWithItems : { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 });
      }
      if (options.path === '/cart' && options.method === 'DELETE') {
        clearRequests += 1;
        return decode(options, undefined);
      }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();
    const clear = await screen.findByRole('button', { name: 'Clear cart' });
    await interact(() => user.click(clear));
    expect(clearRequests).toBe(0);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBe(document.activeElement);
    await interact(() => user.keyboard('{Escape}'));
    expect(clear).toBe(document.activeElement);
    await interact(() => user.click(clear));
    await interact(() => user.click(screen.getAllByRole('button', { name: 'Clear cart' })[1]));
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Cart cleared.');
    expect(clearRequests).toBe(1);
    expect(reads).toBe(2);
  });

  it('keeps retained cart content recoverable when post-remove revalidation fails', async () => {
    let reads = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        reads += 1;
        if (reads === 2) throw new ApiError({ kind: 'server', status: 503, message: 'private' });
        return decode(options, cartWithItems);
      }
      if (options.path === '/cart/items/7') return decode(options, undefined);
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();
    const remove = await screen.findByRole('button', { name: 'Remove Long accessible course title' });

    await interact(() => user.click(remove));
    expect(await screen.findByText('Cart update needs a refresh')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Long accessible course title' })).toBeTruthy();
    expect(reads).toBe(2);
  });

  it('keeps focus on the next remove action after removing the first item', async () => {
    await removeCourseAndExpectFocus(7, 'Remove Middle course');
  });

  it('keeps focus on the next remove action after removing the middle item', async () => {
    await removeCourseAndExpectFocus(8, 'Remove Last course');
  });

  it('keeps focus on the previous remove action after removing the last item', async () => {
    await removeCourseAndExpectFocus(9, 'Remove Middle course');
  });

  it('moves focus to the empty-cart heading after removing the sole item', async () => {
    let currentItems = [cartWithItems.items[0]];
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') return decode(options, { ...cartWithItems, items: currentItems, item_count: currentItems.length, total_price: currentItems.length === 0 ? '0.00' : '19.990' });
      if (options.path === '/cart/items/7') { currentItems = []; return decode(options, undefined); }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();

    const remove = await screen.findByRole('button', { name: 'Remove Long accessible course title' });
    await interact(() => user.click(remove));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBe(document.activeElement));
  });
});
