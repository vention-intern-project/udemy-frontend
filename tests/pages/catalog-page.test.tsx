// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { CatalogPage } from '../../src/pages/catalog-page';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import type { ApiClient, ApiRequestOptions } from '../../src/shared/api';

afterEach(cleanup);

const catalogItem = {
  id: 7, title: 'React', description: null, price: '9.99', currency: 'USD', published_at: null,
  instructor: { id: 1, name: 'Ada', surname: 'Lovelace' }, lessons: [],
};

function response(overrides: Partial<Record<'page' | 'pages' | 'has_next' | 'has_previous', number | boolean>> = {}) {
  return { items: [catalogItem], page: 1, page_size: 20, total: 1, pages: 1, has_next: false, has_previous: false, ...overrides };
}

function tokenStore(): AccessTokenStore {
  return { get: () => null, set: () => true, clear: () => undefined };
}

function HistoryControls() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
      <button type="button" onClick={() => navigate(1)}>Forward</button>
      <output aria-label="catalog location">{`${location.pathname}${location.search}`}</output>
    </>
  );
}

function renderCatalog(request: ApiClient['request'], initialEntries: string[], initialIndex = initialEntries.length - 1) {
  return render(
    <SessionProvider client={{ request }} tokenStore={tokenStore()}>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <CatalogPage />
        <HistoryControls />
      </MemoryRouter>
    </SessionProvider>,
  );
}

describe('CatalogPage public URL and pagination behavior', () => {
  it('canonicalizes an inverted bookmarked range before its fixed-size request, applies filters, and supports history traversal', async () => {
    const user = userEvent.setup();
    const requests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async <TResponse,>(options: ApiRequestOptions) => {
      requests.push(options);
      return response() as TResponse;
    };
    renderCatalog(request, ['/?search_query=first', '/?search_query=React&min_price=30&max_price=10&sort=-id&page=3']);

    await screen.findByRole('link', { name: 'React' });
    expect(screen.getByLabelText('Search courses').getAttribute('placeholder')).toBe('Search title, description, or instructor first or last name');
    expect(screen.getByText('Total lessons').parentElement?.textContent).toBe('Total lessons0');
    expect(requests[0]?.query).toEqual({ search_query: 'React', min_price: undefined, max_price: undefined, sort: '-id', page: 3, page_size: 20 });
    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?search_query=React&sort=-id&page=3'));

    const select = screen.getByLabelText('Sort courses') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => [option.value, option.text])).toContainEqual(['id', 'ID: low to high']);
    expect(Array.from(select.options).map((option) => [option.value, option.text])).toContainEqual(['-id', 'ID: high to low']);

    await act(async () => {
      await user.clear(screen.getByLabelText('Search courses'));
      await user.type(screen.getByLabelText('Search courses'), 'TypeScript');
      await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    });
    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?search_query=TypeScript&sort=-id'));
    await waitFor(() => expect(requests[requests.length - 1]?.query).toEqual({ search_query: 'TypeScript', min_price: undefined, max_price: undefined, sort: '-id', page: 1, page_size: 20 }));

    await act(async () => { await user.click(screen.getByRole('button', { name: 'Back' })); });
    await waitFor(() => expect((screen.getByLabelText('Search courses') as HTMLInputElement).value).toBe('React'));
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Forward' })); });
    await waitFor(() => expect((screen.getByLabelText('Search courses') as HTMLInputElement).value).toBe('TypeScript'));
  });

  it('shows linked negative-price validation on Enter without changing the URL or requesting, then applies a corrected value', async () => {
    const user = userEvent.setup();
    const requests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async <TResponse,>(options: ApiRequestOptions) => {
      requests.push(options);
      return response() as TResponse;
    };
    renderCatalog(request, ['/']);

    await screen.findByRole('link', { name: 'React' });
    const minimum = screen.getByLabelText('Minimum price') as HTMLInputElement;
    await act(async () => { await user.type(minimum, '-1{Enter}'); });

    await screen.findByText('Enter a non-negative price.');
    expect(minimum.getAttribute('aria-invalid')).toBe('true');
    expect(minimum.getAttribute('aria-describedby')).toContain('-error');
    expect(screen.getByLabelText('catalog location').textContent).toBe('/');
    expect(requests).toHaveLength(1);

    await act(async () => {
      await user.clear(minimum);
      await user.type(minimum, '5{Enter}');
    });
    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?min_price=5'));
    await waitFor(() => expect(requests[1]?.query).toEqual({
      search_query: undefined, min_price: 5, max_price: undefined, sort: undefined, page: 1, page_size: 20,
    }));
  });

  it('honors server pagination flags for edge and numbered controls when page-count metadata disagrees', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    const request: ApiClient['request'] = async <TResponse,>() => {
      requestCount += 1;
      return response({ page: 2, pages: 3, has_next: false, has_previous: false }) as TResponse;
    };
    renderCatalog(request, ['/']);

    await screen.findByRole('link', { name: 'React' });
    const next = screen.getByRole('button', { name: 'Go to next page' }) as HTMLButtonElement;
    const pageOne = screen.getByRole('button', { name: 'Go to page 1' }) as HTMLButtonElement;
    const pageThree = screen.getByRole('button', { name: 'Go to page 3' }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    expect(pageOne.disabled).toBe(true);
    expect(pageThree.disabled).toBe(true);
    expect(screen.getAllByRole('status').some((status) => status.textContent?.includes('Page 2 of 3'))).toBe(true);
    await user.click(next);
    await user.click(pageOne);
    await user.click(pageThree);
    expect(requestCount).toBe(1);
    expect(screen.getByLabelText('catalog location').textContent).toBe('/');
  });

  it('serializes an enabled next-page action and propagates its normalized API-008 query', async () => {
    const user = userEvent.setup();
    const requests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async <TResponse,>(options: ApiRequestOptions) => {
      requests.push(options);
      return response({ page: options.query?.page as number, pages: 2, has_next: options.query?.page === 1, has_previous: options.query?.page === 2 }) as TResponse;
    };
    renderCatalog(request, ['/?search_query=React&min_price=5&sort=-price']);

    await screen.findByRole('link', { name: 'React' });
    expect(requests[0]?.query).toEqual({
      search_query: 'React', min_price: 5, max_price: undefined, sort: '-price', page: 1, page_size: 20,
    });

    const next = screen.getByRole('button', { name: 'Go to next page' }) as HTMLButtonElement;
    expect(next.disabled).toBe(false);
    await act(async () => { await user.click(next); });

    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?search_query=React&min_price=5&sort=-price&page=2'));
    await waitFor(() => expect(requests[1]?.query).toEqual({
      search_query: 'React', min_price: 5, max_price: undefined, sort: '-price', page: 2, page_size: 20,
    }));
  });
});
