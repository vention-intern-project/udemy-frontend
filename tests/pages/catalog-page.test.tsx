// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
  it('renders the hero as one semantic heading with decorative background content kept out of the accessibility tree', async () => {
    const request: ApiClient['request'] = async <TResponse,>() => response() as TResponse;
    renderCatalog(request, ['/']);

    await screen.findByRole('link', { name: 'React' });
    const heading = screen.getByRole('heading', { level: 1, name: 'Master the Skills Shaping the Future' });
    expect(heading.textContent).toBe('Master the Skills Shaping the Future');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Browse courses crafted by industry experts. Advance your career in technology, design, business, and leadership.')).toBeTruthy();
    expect(document.querySelector('.catalog-hero img')).toBeNull();
  });

  it('renders one whole-card link with a unified tooltip and disabled cart action without mutations', async () => {
    const requests: ApiRequestOptions[] = [];
    const items = [
      { ...catalogItem, id: 7, title: 'React', description: 'A concise course description.', price: '94.99', currency: 'USD', published_at: null, lessons: [{ id: 1, title: 'Intro' }, { id: 2, title: 'Hooks' }, { id: 3, title: 'State' }, { id: 4, title: 'Testing' }] },
      { ...catalogItem, id: 8, title: 'TypeScript', description: null, price: '0.00', currency: 'UZS', published_at: '2026-07-01T00:00:00Z', lessons: [{ id: 5, title: 'Intro' }] },
      { ...catalogItem, id: 9, title: 'Draft free', description: 'A longer course description that remains visible without truncation.', price: '0.00', currency: 'USD', published_at: null },
      { ...catalogItem, id: 10, title: 'Published paid', description: 'A published paid course.', price: '29.99', currency: 'USD', published_at: '2026-07-02T00:00:00Z' },
      { ...catalogItem, id: 11, title: 'Invalid price', description: 'An invalid-price course.', price: 'not-a-decimal', currency: 'US', published_at: null },
    ];
    const request: ApiClient['request'] = async <TResponse,>(options: ApiRequestOptions) => {
      requests.push(options);
      return ({
        items, page: 1, page_size: 20, total: items.length, pages: 2, has_next: true, has_previous: false,
      }) as TResponse;
    };
    renderCatalog(request, ['/']);

    const reactLink = await screen.findByRole('link', { name: /React/ });
    const reactCard = reactLink.closest('article');
    expect(reactCard).toBeTruthy();
    expect(reactCard?.querySelectorAll('a')).toHaveLength(1);
    expect(reactLink.querySelector('button')).toBeNull();
    expect(reactLink.getAttribute('href')).toBe('/courses/7');
    expect(screen.getByRole('heading', { level: 3, name: 'React' })).toBeTruthy();
    expect(screen.getByText('$94.99')).toBeTruthy();
    expect(reactCard?.querySelector('.catalog-card__preview-cue')?.textContent).toBe('View Draft');
    expect(reactCard?.querySelector('.catalog-card__body .catalog-card__description')).toBeNull();
    expect(reactCard?.querySelector('.catalog-card__details-cue')).toBeNull();
    expect(reactCard?.querySelector('.catalog-card__summary')).toBeNull();
    const reactMetadata = reactCard?.querySelector('.catalog-card__meta');
    expect(reactMetadata?.textContent).toBe('Ada Lovelace · 4 lessons');
    expect(reactMetadata?.querySelectorAll('p')).toHaveLength(0);
    expect(reactMetadata?.querySelector('.catalog-card__byline')?.textContent).toBe('Ada Lovelace');
    expect(reactMetadata?.textContent).not.toContain('by ');
    expect(reactMetadata?.querySelectorAll('.catalog-card__meta-separator')).toHaveLength(1);
    expect(reactMetadata?.querySelector('.catalog-card__meta-separator')?.textContent).toBe(' · ');
    expect(reactMetadata?.querySelector('.catalog-card__meta-separator')?.getAttribute('aria-hidden')).toBe('true');
    expect(reactMetadata?.querySelector('.catalog-card__lesson-count')?.textContent).toBe('4 lessons');
    expect(reactCard?.querySelector('.catalog-card__meta')?.textContent).not.toContain('Instructor');
    const draftExplanationId = reactLink.getAttribute('aria-describedby');
    expect(draftExplanationId).toBeTruthy();
    const tooltip = document.getElementById(draftExplanationId ?? '');
    expect(tooltip?.getAttribute('role')).toBe('tooltip');
    expect(tooltip?.firstElementChild?.textContent).toBe('This course is not available for enrollment yet.');
    expect(tooltip?.querySelector('.catalog-card__tooltip-notice')?.textContent).toBe('This course is not available for enrollment yet.');
    expect(tooltip?.querySelector('.catalog-card__tooltip-course')?.getAttribute('aria-hidden')).toBe('true');
    expect(tooltip?.querySelector('.catalog-card__tooltip-course')?.textContent).toBe('About React');
    expect(tooltip?.textContent).toContain('A concise course description.');
    expect(tooltip?.textContent).not.toContain('published_at');
    expect(tooltip?.textContent).not.toContain('Draft means this course');
    expect(tooltip?.style.getPropertyValue('--catalog-tooltip-tail-top')).toBe('');
    expect(tooltip?.classList.contains('catalog-card__tooltip--inline')).toBe(true);
    const price = reactCard?.querySelector('.catalog-card__price');
    if (!tooltip || !price) throw new Error('Card tooltip and price are required.');
    expect(tooltip.compareDocumentPosition(price) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const publishedLink = screen.getByRole('link', { name: 'TypeScript' });
    const publishedTooltip = document.getElementById(publishedLink.getAttribute('aria-describedby') ?? '');
    expect(publishedLink.closest('article')?.querySelector('.catalog-card__preview-cue')?.textContent).toBe('View details');
    expect(publishedTooltip?.textContent).not.toContain('Published means this course');
    expect(publishedTooltip?.textContent).not.toContain('published_at');
    expect(screen.getByText('No course description is available.')).toBeTruthy();
    expect(Array.from(document.querySelectorAll('.catalog-card__price')).some((price) => price.textContent === 'UZS\u00A00.00')).toBe(true);
    expect(screen.getByText('Price unavailable')).toBeTruthy();
    const cartButton = reactCard?.querySelector('button') as HTMLButtonElement;
    expect(cartButton.textContent).toContain('Not available');
    expect(cartButton.disabled).toBe(true);
    expect(cartButton.closest('.catalog-card__actions')).toBeTruthy();
    const freeCard = screen.getByRole('link', { name: 'TypeScript' }).closest('article');
    expect(freeCard?.querySelector('.catalog-card__meta')?.textContent).toBe('Ada Lovelace · 1 lesson');
    expect((freeCard?.querySelector('button') as HTMLButtonElement).textContent).toContain('Enroll Free');
    expect((freeCard?.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    const draftFreeCard = screen.getByRole('link', { name: 'Draft free' }).closest('article');
    expect((draftFreeCard?.querySelector('button') as HTMLButtonElement).textContent).toContain('Not available');
    expect((draftFreeCard?.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    const publishedPaidCard = screen.getByRole('link', { name: 'Published paid' }).closest('article');
    expect((publishedPaidCard?.querySelector('button') as HTMLButtonElement).textContent).toContain('Add to cart');
    expect((publishedPaidCard?.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    const pluralResultHeading = screen.getByRole('heading', { level: 2, name: 'Found 5 courses' });
    expect(pluralResultHeading.textContent).toBe('Found 5 courses');
    expect(pluralResultHeading.querySelector('.catalog-page__results-prefix')?.textContent).toBe('Found ');
    expect(pluralResultHeading.querySelector('strong.catalog-page__results-total')?.textContent).toBe('5');
    expect(pluralResultHeading.querySelector('.catalog-page__results-suffix')?.textContent).toBe(' courses');
    expect(pluralResultHeading.querySelector('strong')?.textContent).not.toContain('courses');

    const next = screen.getByRole('button', { name: 'Go to next page' });
    expect(next).toBeTruthy();
    expect(requests.every((requestOptions) => requestOptions.path === '/courses')).toBe(true);
  });

  it('canonicalizes legacy sort before its request, applies sort immediately, and applies a changed price range on blur', async () => {
    const user = userEvent.setup();
    const requests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async <TResponse,>(options: ApiRequestOptions) => {
      requests.push(options);
      return response() as TResponse;
    };
    renderCatalog(request, ['/?search_query=first', '/?search_query=React&min_price=30&max_price=10&sort=-id&page=3']);

    await screen.findByRole('link', { name: 'React' });
    expect(screen.getByText('Ada Lovelace').parentElement?.textContent).toBe('Ada Lovelace · 0 lessons');
    expect(requests[0]?.query).toEqual({ search_query: 'React', min_price: undefined, max_price: undefined, sort: '-created_at', page: 3, page_size: 20 });
    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?search_query=React&sort=-created_at&page=3'));

    const filters = screen.getByRole('form', { name: 'Course filters' });
    expect(filters.querySelector('input[name="search_query"], select')).toBeNull();
    expect(filters.querySelector('h2')).toBeNull();
    expect(screen.getByRole('group', { name: 'Price range:' })).toBeTruthy();
    const minimum = screen.getByLabelText('Min price') as HTMLInputElement;
    const maximum = screen.getByLabelText('Max price') as HTMLInputElement;
    expect(minimum.placeholder).toBe('Min price');
    expect(maximum.placeholder).toBe('Max price');
    expect(minimum.closest('.catalog-filter-bar__field')?.querySelector('.ui-sr-only')?.textContent).toBe('Min price');
    expect(maximum.closest('.catalog-filter-bar__field')?.querySelector('.ui-sr-only')?.textContent).toBe('Max price');
    expect(within(filters).queryByRole('button', { name: /apply/i })).toBeNull();
    expect(filters.querySelector('.catalog-filter-bar__action')).toBeNull();
    expect(screen.queryByLabelText('Search courses')).toBeNull();
    const sortTrigger = screen.getByRole('button', { name: 'Sort by: Newest' });
    expect(sortTrigger.closest('.catalog-page__sort-field')).toBeTruthy();
    expect(sortTrigger.getAttribute('aria-controls')).toBe(null);
    expect(document.querySelector('.catalog-page__sort-select')).toBeNull();
    const toolbarControls = document.querySelector('.catalog-page__toolbar-controls');
    expect(toolbarControls).toBeTruthy();
    expect(Array.from(toolbarControls?.children ?? [])).toEqual([
      filters,
      sortTrigger.closest('.catalog-page__sort-toolbar'),
    ]);
    expect(document.querySelector('.catalog-page__filter-sidebar')).toBeNull();
    await act(async () => { await user.hover(sortTrigger); });
    const listbox = screen.getByRole('listbox', { name: 'Sort by options' });
    expect(sortTrigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(sortTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(sortTrigger.getAttribute('aria-controls')).toBe(listbox.id);
    expect(listbox.getAttribute('aria-activedescendant')).toBe(`${listbox.id}-option-1`);
    const sortOptions = within(listbox).getAllByRole('option');
    expect(sortOptions.map((option) => option.textContent)).toEqual([
      'Oldest', 'Newest', 'Low to High', 'High to Low', 'A to Z', 'Z to A',
    ]);
    expect(sortOptions.map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false', 'false', 'false']);
    expect(listbox.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(listbox.querySelectorAll('.catalog-page__sort-radio')).toHaveLength(6);
    await act(async () => { await user.unhover(sortTrigger); });
    expect(screen.queryByRole('listbox', { name: 'Sort by options' })).toBeNull();
    expect(sortTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(sortTrigger.getAttribute('aria-controls')).toBe(null);
    const singularResultHeading = screen.getByRole('heading', { level: 2, name: 'Found 1 course' });
    expect(singularResultHeading.textContent).toBe('Found 1 course');
    expect(singularResultHeading.querySelector('.catalog-page__results-prefix')?.textContent).toBe('Found ');
    expect(singularResultHeading.querySelector('strong.catalog-page__results-total')?.textContent).toBe('1');
    expect(singularResultHeading.querySelector('.catalog-page__results-suffix')?.textContent).toBe(' course');
    expect(singularResultHeading.querySelector('strong')?.textContent).not.toContain('course');

    await act(async () => {
      sortTrigger.focus();
      await user.keyboard('{Enter}');
    });
    const keyboardListbox = await screen.findByRole('listbox', { name: 'Sort by options' });
    expect(keyboardListbox).toBe(document.activeElement);
    await act(async () => { await user.keyboard('{ArrowDown}{Enter}'); });
    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?search_query=React&sort=price'));
    await waitFor(() => expect(requests[requests.length - 1]?.query).toEqual({ search_query: 'React', min_price: undefined, max_price: undefined, sort: 'price', page: 1, page_size: 20 }));

    await act(async () => {
      await user.type(screen.getByLabelText('Min price'), '5');
      await user.click(screen.getByLabelText('Max price'));
    });
    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?search_query=React&min_price=5&sort=price'));
    await waitFor(() => expect(requests[requests.length - 1]?.query).toEqual({ search_query: 'React', min_price: 5, max_price: undefined, sort: 'price', page: 1, page_size: 20 }));

    await act(async () => { await user.click(screen.getByRole('button', { name: 'Back' })); });
    await waitFor(() => expect((screen.getByLabelText('Min price') as HTMLInputElement).value).toBe(''));
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Forward' })); });
    await waitFor(() => expect((screen.getByLabelText('Min price') as HTMLInputElement).value).toBe('5'));
  });

  it('shows linked negative-price validation on blur without changing the URL or requesting, then applies a corrected value', async () => {
    const user = userEvent.setup();
    const requests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async <TResponse,>(options: ApiRequestOptions) => {
      requests.push(options);
      return response() as TResponse;
    };
    renderCatalog(request, ['/']);

    await screen.findByRole('link', { name: 'React' });
    const minimum = screen.getByLabelText('Min price') as HTMLInputElement;
    await act(async () => {
      await user.type(minimum, '-1');
      await user.tab();
    });

    await screen.findByText('Enter a non-negative price.');
    expect(minimum.getAttribute('aria-invalid')).toBe('true');
    expect(minimum.getAttribute('aria-describedby')).toContain('-error');
    expect(screen.getByLabelText('catalog location').textContent).toBe('/');
    expect(requests).toHaveLength(1);

    await act(async () => {
      await user.clear(minimum);
      await user.type(minimum, '5');
      await user.tab();
    });
    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?min_price=5'));
    await waitFor(() => expect(requests[1]?.query).toEqual({
      search_query: undefined, min_price: 5, max_price: undefined, sort: 'created_at', page: 1, page_size: 20,
    }));
  });

  it('does not navigate for a normalized no-op and removes a cleared bound while preserving search and sort', async () => {
    const user = userEvent.setup();
    const requests: ApiRequestOptions[] = [];
    const request: ApiClient['request'] = async <TResponse,>(options: ApiRequestOptions) => {
      requests.push(options);
      return response() as TResponse;
    };
    renderCatalog(request, ['/?search_query=React&min_price=5&max_price=10&sort=-price&page=3']);

    await screen.findByRole('link', { name: 'React' });
    const minimum = screen.getByLabelText('Min price');
    const maximum = screen.getByLabelText('Max price');
    expect(requests).toHaveLength(1);

    await act(async () => {
      await user.click(minimum);
      await user.tab();
    });
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(requests).toHaveLength(1);
    expect(screen.getByLabelText('catalog location').textContent).toBe('/?search_query=React&min_price=5&max_price=10&sort=-price&page=3');

    await act(async () => {
      await user.click(minimum);
      await user.clear(minimum);
      await user.type(minimum, '7');
      await user.click(maximum);
    });
    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?search_query=React&min_price=7&max_price=10&sort=-price'));
    await waitFor(() => expect(requests).toHaveLength(2));

    await act(async () => {
      await user.clear(maximum);
      await user.tab();
    });
    await waitFor(() => expect(screen.getByLabelText('catalog location').textContent).toBe('/?search_query=React&min_price=7&sort=-price'));
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]?.query).toEqual({
      search_query: 'React', min_price: 7, max_price: undefined, sort: '-price', page: 1, page_size: 20,
    });
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
    expect(next.textContent).toBe('>');
    expect(next.classList.contains('ui-pagination__button--direction')).toBe(true);
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
