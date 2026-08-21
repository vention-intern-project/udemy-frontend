// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import type { Cart } from '../../src/entities/cart';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import { CartPage } from '../../src/pages/cart-page';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';
import { localeRuntime } from '../../src/shared/locale';
import { QueryClientProvider } from '@tanstack/react-query';

const student = {
  email: 'student@example.test',
  name: 'Sam',
  surname: 'Student',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const cartWithItems = {
  id: 1,
  items: [
    {
      id: 10,
      course_id: 7,
      added_at: '2026-01-01T00:00:00Z',
      course: { id: 7, title: 'Long accessible course title', price: '19.990', currency: 'USD' },
    },
    {
      id: 11,
      course_id: 8,
      added_at: '2026-01-01T00:00:00Z',
      course: { id: 8, title: 'Second course', price: '10.00', currency: 'USD' },
    },
  ],
  total_price: '29.990',
  currency: 'USD',
  item_count: 2,
};
const cartWithThreeItems = {
  id: 1,
  items: [
    {
      id: 10,
      course_id: 7,
      added_at: '2026-01-01T00:00:00Z',
      course: { id: 7, title: 'First course', price: '10.00', currency: 'USD' },
    },
    {
      id: 11,
      course_id: 8,
      added_at: '2026-01-01T00:00:00Z',
      course: { id: 8, title: 'Middle course', price: '10.00', currency: 'USD' },
    },
    {
      id: 12,
      course_id: 9,
      added_at: '2026-01-01T00:00:00Z',
      course: { id: 9, title: 'Last course', price: '10.00', currency: 'USD' },
    },
  ],
  total_price: '30.00',
  currency: 'USD',
  item_count: 3,
};

const CART_RESIDUAL_COPY = {
  en: {
    breadcrumb: 'Breadcrumb',
    cart: 'Cart',
    cartCourses: 'Cart courses',
    cartTotal: 'Cart total',
    courseCount: '2 courses',
    courseLabel: 'Course',
    empty: 'Your cart is empty',
    mockCheckout: 'Mock checkout',
    orderSummary: 'Order summary',
    price: 'Price',
    total: 'Total',
  },
  ru: {
    breadcrumb: 'Хлебные крошки',
    cart: 'Корзина',
    cartCourses: 'Курсы в корзине',
    cartTotal: 'Итог корзины',
    courseCount: '2 курс',
    courseLabel: 'Курс',
    empty: 'Ваша корзина пуста',
    mockCheckout: 'Тестовое оформление',
    orderSummary: 'Итоги заказа',
    price: 'Цена',
    total: 'Итого',
  },
  uz: {
    breadcrumb: 'Yo‘l ko‘rsatkich',
    cart: 'Savat',
    cartCourses: 'Savatdagi kurslar',
    cartTotal: 'Savat jami',
    courseCount: '2 kurs',
    courseLabel: 'Kurs',
    empty: 'Savatingiz bo‘sh',
    mockCheckout: 'Sinov buyurtmasi',
    orderSummary: 'Buyurtma yakuni',
    price: 'Narx',
    total: 'Jami',
  },
} as const;

const CART_MAPPED_CONSUMER_COPY = {
  en: {
    clearAction: 'Clear cart',
    clearDialog: 'Clear cart?',
    clearStatus: 'Cart cleared.',
    learningReturn: 'My learning',
    removeStatus: 'Course removed from cart.',
  },
  ru: {
    clearAction: 'Очистить корзину',
    clearDialog: 'Очистить корзину?',
    clearStatus: 'Корзина очищена.',
    learningReturn: 'Моё обучение',
    removeStatus: 'Курс удалён из корзины.',
  },
  uz: {
    clearAction: 'Savatni tozalash',
    clearDialog: 'Savat tozalansinmi?',
    clearStatus: 'Savat tozalandi.',
    learningReturn: 'Ta’limim',
    removeStatus: 'Kurs savatdan olib tashlandi.',
  },
} as const;

interface CartReturnTargetExpectation {
  readonly expectedHref: string;
  readonly labels: Readonly<Record<'en' | 'ru' | 'uz', string>>;
  readonly returnTo?: string;
}

const CART_RETURN_TARGET_EXPECTATIONS: readonly CartReturnTargetExpectation[] = [
  { expectedHref: '/', labels: { en: 'Catalog', ru: 'Каталог', uz: 'Katalog' } },
  { returnTo: '/', expectedHref: '/', labels: { en: 'Catalog', ru: 'Каталог', uz: 'Katalog' } },
  {
    returnTo: '/courses/7?tab=outline#lessons',
    expectedHref: '/courses/7?tab=outline#lessons',
    labels: { en: 'Course details', ru: 'Сведения о курсе', uz: 'Kurs tafsilotlari' },
  },
  {
    returnTo: '/signup',
    expectedHref: '/signup',
    labels: { en: 'Create account', ru: 'Создать аккаунт', uz: 'Akkaunt yaratish' },
  },
  {
    returnTo: '/login',
    expectedHref: '/login',
    labels: { en: 'Log in', ru: 'Войти', uz: 'Kirish' },
  },
  {
    returnTo: '/forgot-password',
    expectedHref: '/forgot-password',
    labels: { en: 'Forgot password', ru: 'Забыли пароль', uz: 'Parolni unutdingizmi' },
  },
  {
    returnTo: '/reset-password',
    expectedHref: '/reset-password',
    labels: { en: 'Reset password', ru: 'Сбросить пароль', uz: 'Parolni tiklash' },
  },
  {
    returnTo: '/learning?page=2#courses',
    expectedHref: '/learning?page=2#courses',
    labels: { en: 'My learning', ru: 'Моё обучение', uz: 'Ta’limim' },
  },
  {
    returnTo: '/learning/enrollments/4',
    expectedHref: '/learning/enrollments/4',
    labels: {
      en: 'Learning details',
      ru: 'Сведения об обучении',
      uz: 'Ta’lim tafsilotlari',
    },
  },
  {
    returnTo: '/learning/enrollments/4/ai-chat',
    expectedHref: '/learning/enrollments/4/ai-chat',
    labels: { en: 'Course assistant', ru: 'Ассистент курса', uz: 'Kurs yordamchisi' },
  },
  {
    returnTo: '/ai-chat',
    expectedHref: '/ai-chat',
    labels: { en: 'AI assistant', ru: 'ИИ-ассистент', uz: 'AI yordamchi' },
  },
  {
    returnTo: '/instructor/courses',
    expectedHref: '/instructor/courses',
    labels: {
      en: 'Instructor courses',
      ru: 'Курсы преподавателя',
      uz: 'O‘qituvchi kurslari',
    },
  },
  {
    returnTo: '/instructor/courses/7/edit',
    expectedHref: '/instructor/courses/7/edit',
    labels: { en: 'Edit course', ru: 'Редактировать курс', uz: 'Kursni tahrirlash' },
  },
  {
    returnTo: '/instructor/courses/7/enrollments',
    expectedHref: '/instructor/courses/7/enrollments',
    labels: { en: 'Course enrollments', ru: 'Записи на курс', uz: 'Kursga yozilishlar' },
  },
  {
    returnTo: '/instructor/lessons/12/edit',
    expectedHref: '/instructor/lessons/12/edit',
    labels: { en: 'Edit lesson', ru: 'Редактировать урок', uz: 'Darsni tahrirlash' },
  },
];

function tokenStore(token = 'student-token'): AccessTokenStore {
  let value: string | null = token;
  return {
    get: () => value,
    set: (next) => {
      value = next;
    },
    clear: () => {
      value = null;
    },
  };
}

interface CartRouteEntry {
  readonly pathname: string;
  readonly state?: unknown;
}

type CartInitialEntry = string | CartRouteEntry;

function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  return options.decode ? options.decode(value) : (value as TResponse);
}

function LocationProbe() {
  const location = useLocation();
  return (
    <div aria-label="Current route">{`${location.pathname}${location.search}${location.hash}`}</div>
  );
}

async function renderCart(request: ApiClient['request'], initialEntry: CartInitialEntry = '/cart') {
  const queryClient = createAppQueryClient();
  await act(async () => {
    render(
      <I18nextProvider i18n={localeRuntime}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider client={{ request }} tokenStore={tokenStore()}>
            <MemoryRouter
              future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
              initialEntries={[initialEntry]}
            >
              <LocationProbe />
              <CartPage />
            </MemoryRouter>
          </SessionProvider>
        </QueryClientProvider>
      </I18nextProvider>,
    );
  });
  return queryClient;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  await localeRuntime.changeLanguage('en');
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function interact(action: () => Promise<void>) {
  await act(async () => {
    await action();
  });
}

async function removeCourseAndExpectFocus(courseId: number, expectedActionName: string) {
  let currentItems = cartWithThreeItems.items;
  const request: ApiClient['request'] = async <TResponse, TBody>(
    options: ApiRequestOptions<TBody, TResponse>,
  ) => {
    if (options.path === '/me') return decode(options, student);
    if (options.path === '/cart' && options.method === 'GET') {
      return decode(options, {
        ...cartWithThreeItems,
        items: currentItems,
        item_count: currentItems.length,
      });
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
  await waitFor(() =>
    expect(screen.getByRole('button', { name: expectedActionName })).toBe(document.activeElement),
  );
}

describe('CartPage', () => {
  it.each(['en', 'ru', 'uz'] as const)(
    'localizes every allocated safe return label in %s without changing its route target',
    async (locale) => {
      await act(() => localeRuntime.changeLanguage(locale));
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/cart' && options.method === 'GET')
          return decode(options, cartWithItems);
        throw new Error(`Unexpected request ${options.method} ${options.path}`);
      };

      for (const expectation of CART_RETURN_TARGET_EXPECTATIONS) {
        await renderCart(request, {
          pathname: '/cart',
          state:
            expectation.returnTo === undefined ? undefined : { returnTo: expectation.returnTo },
        });

        const source = await screen.findByRole('link', { name: expectation.labels[locale] });
        expect(source.getAttribute('href')).toBe(expectation.expectedHref);
        if (locale !== 'en') expect(source.textContent).not.toBe(expectation.labels.en);
        cleanup();
      }
    },
  );

  it.each(['en', 'ru', 'uz'] as const)(
    'renders the admitted visible and accessible Cart family in %s',
    async (locale) => {
      const copy = CART_RESIDUAL_COPY[locale];
      await act(() => localeRuntime.changeLanguage(locale));
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/cart' && options.method === 'GET')
          return decode(options, cartWithItems);
        throw new Error(`Unexpected request ${options.method} ${options.path}`);
      };

      await renderCart(request);

      expect(await screen.findByRole('heading', { level: 1, name: copy.cart })).toBeTruthy();
      expect(screen.getByRole('navigation', { name: copy.breadcrumb })).toBeTruthy();
      const courses = screen.getByRole('list', { name: copy.cartCourses });
      expect(within(courses).getAllByText(copy.courseLabel)).toHaveLength(2);
      expect(within(courses).getAllByText(copy.price)).toHaveLength(2);
      expect(screen.getByText(copy.courseCount)).toBeTruthy();
      const total = screen.getByRole('complementary', { name: copy.cartTotal });
      expect(within(total).getByRole('heading', { name: copy.orderSummary })).toBeTruthy();
      expect(within(total).getByText(copy.total)).toBeTruthy();
      expect(within(total).getByRole('button', { name: copy.mockCheckout })).toBeTruthy();
      expect(document.body.textContent).not.toMatch(/Translation unavailable|(?:cart|a11y):\w+/);
      cleanup();

      await renderCart(async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/cart' && options.method === 'GET')
          return decode(options, { ...cartWithItems, items: [], item_count: 0 });
        throw new Error(`Unexpected request ${options.method} ${options.path}`);
      });
      expect(await screen.findByRole('heading', { name: copy.empty })).toBeTruthy();
    },
  );

  it.each([
    {
      entry: { pathname: '/cart', state: { returnTo: '/learning?page=2#courses' } },
      expectedLabel: 'My learning',
      expectedHref: '/learning?page=2#courses',
    },
    {
      entry: { pathname: '/cart', state: { returnTo: '/' } },
      expectedLabel: 'Catalog',
      expectedHref: '/',
    },
    {
      entry: { pathname: '/cart', state: { returnTo: '/courses/7?tab=outline#lessons' } },
      expectedLabel: 'Course details',
      expectedHref: '/courses/7?tab=outline#lessons',
    },
    {
      entry: { pathname: '/cart', state: { returnTo: '/instructor/courses/7/edit' } },
      expectedLabel: 'Edit course',
      expectedHref: '/instructor/courses/7/edit',
    },
    {
      entry: { pathname: '/cart', state: { returnTo: 'https://outside.example/cart' } },
      expectedLabel: 'Catalog',
      expectedHref: '/',
    },
    {
      entry: { pathname: '/cart', state: { returnTo: '/cart?coupon=SAVE' } },
      expectedLabel: 'Catalog',
      expectedHref: '/',
    },
  ])(
    'renders only the safe source return link for resolved Cart state',
    async ({ entry, expectedLabel, expectedHref }) => {
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/cart' && options.method === 'GET')
          return decode(options, cartWithItems);
        throw new Error(`Unexpected request ${options.method} ${options.path}`);
      };

      await renderCart(request, entry);

      const source = await screen.findByRole('link', { name: expectedLabel });
      const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(source.getAttribute('href')).toBe(expectedHref);
      expect(breadcrumb.contains(source)).toBe(true);
      expect(source.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(screen.getByText('/', { selector: 'span' })).toBeTruthy();
      expect(screen.getByText('Cart', { selector: 'span' })).toBeTruthy();
      expect(screen.getByText('Cart', { selector: '[aria-current="page"]' })).toBeTruthy();
      expect(
        source.compareDocumentPosition(screen.getByRole('heading', { name: 'Cart' })) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );

  it.each(['pointer', 'Enter', 'Space'])(
    'uses the existing Router click path for the safe My learning return on %s',
    async (activation) => {
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/cart' && options.method === 'GET')
          return decode(options, cartWithItems);
        throw new Error(`Unexpected request ${options.method} ${options.path}`);
      };
      await renderCart(request, {
        pathname: '/cart',
        state: { returnTo: '/learning?page=2#courses' },
      });
      const user = userEvent.setup();
      const source = await screen.findByRole('link', { name: 'My learning' });

      source.focus();
      expect(source).toBe(document.activeElement);
      if (activation === 'pointer') await interact(() => user.click(source));
      if (activation === 'Enter') await interact(() => user.keyboard('{Enter}'));
      if (activation === 'Space') await interact(() => user.keyboard(' '));

      await waitFor(() =>
        expect(screen.getByLabelText('Current route').textContent).toBe('/learning?page=2#courses'),
      );
    },
  );

  it('activates the non-self Catalog fallback through the Router click path on unmodified Space', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, cartWithItems);
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request, { pathname: '/cart', state: { returnTo: '/cart?coupon=SAVE' } });
    const user = userEvent.setup();
    const source = await screen.findByRole('link', { name: 'Catalog' });

    source.focus();
    expect(source).toBe(document.activeElement);
    await interact(() => user.keyboard(' '));

    await waitFor(() => expect(screen.getByLabelText('Current route').textContent).toBe('/'));
  });

  it('accepts Chromium Space-key aliases without changing the safe return target', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, cartWithItems);
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request, {
      pathname: '/cart',
      state: { returnTo: '/learning?page=2#courses' },
    });
    const source = await screen.findByRole('link', { name: 'My learning' });

    source.focus();
    fireEvent.keyDown(source, { key: 'Space', code: 'Space' });

    await waitFor(() =>
      expect(screen.getByLabelText('Current route').textContent).toBe('/learning?page=2#courses'),
    );
  });

  it('uses the no-observer fallback to expose one mobile summary jump without checkout', async () => {
    const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
    const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    const originalScrollIntoView = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    );
    try {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
      vi.stubGlobal('IntersectionObserver', undefined);
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
          matches: query === '(max-width: 1023px)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      );
      const scrollIntoView = vi.fn();
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: scrollIntoView,
      });
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/cart' && options.method === 'GET')
          return decode(options, cartWithItems);
        if (options.path === '/cart/checkout') throw new Error('Checkout must not run');
        throw new Error(`Unexpected request ${options.method} ${options.path}`);
      };

      await renderCart(request);
      const summaryHeading = await screen.findByRole('heading', { name: 'Order summary' });
      Object.defineProperty(summaryHeading, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          bottom: 1024,
          height: 24,
          left: 0,
          right: 0,
          toJSON: () => ({}),
          top: 1000,
          width: 200,
          x: 0,
          y: 1000,
        }),
      });
      fireEvent.scroll(window);

      const jump = await screen.findByRole('button', { name: 'Go to order summary' });
      expect(screen.getAllByRole('heading', { name: 'Order summary' })).toHaveLength(1);
      const cartCourses = screen.getByRole('list', { name: 'Cart courses' });
      expect(
        cartCourses.compareDocumentPosition(jump) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      const user = userEvent.setup();
      screen.getByRole('button', { name: 'Remove Second course' }).focus();
      await interact(() => user.tab());
      expect(jump).toBe(document.activeElement);
      await interact(() => user.tab());
      expect(screen.getByRole('button', { name: 'Mock checkout' })).toBe(document.activeElement);
      fireEvent.click(jump);
      expect(summaryHeading).toBe(document.activeElement);
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      expect(screen.getByRole('button', { name: 'Mock checkout' })).toBeTruthy();
    } finally {
      if (originalInnerHeight) Object.defineProperty(window, 'innerHeight', originalInnerHeight);
      else delete (window as { innerHeight?: number }).innerHeight;
      if (originalInnerWidth) Object.defineProperty(window, 'innerWidth', originalInnerWidth);
      else delete (window as { innerWidth?: number }).innerWidth;
      if (originalScrollIntoView)
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScrollIntoView);
      else delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('clears cancelled summary frames across effect restart and unmount cleanup', async () => {
    const originalSummaryBounds = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'getBoundingClientRect',
    );
    const frameCallbacks = new Map<number, FrameRequestCallback>();
    let nextFrameId = 0;
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      nextFrameId += 1;
      frameCallbacks.set(nextFrameId, callback);
      return nextFrameId;
    });
    const cancelAnimationFrame = vi.fn((frameId: number) => {
      frameCallbacks.delete(frameId);
    });
    let summaryTop = 1000;
    try {
      Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          bottom: summaryTop + 24,
          height: 24,
          left: 0,
          right: 200,
          toJSON: () => ({}),
          top: summaryTop,
          width: 200,
          x: 0,
          y: summaryTop,
        }),
      });
      vi.stubGlobal('IntersectionObserver', undefined);
      vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
      vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/cart' && options.method === 'GET')
          return decode(options, cartWithItems);
        throw new Error(`Unexpected request ${options.method} ${options.path}`);
      };

      const queryClient = await renderCart(request);
      expect(await screen.findByRole('button', { name: 'Go to order summary' })).toBeTruthy();
      expect(requestAnimationFrame).not.toHaveBeenCalled();

      fireEvent.scroll(window);
      fireEvent.resize(window);
      fireEvent.scroll(window);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
      expect(frameCallbacks.size).toBe(1);
      const firstFrame = frameCallbacks.get(1);
      if (!firstFrame) throw new Error('Expected the summary visibility frame.');
      frameCallbacks.delete(1);
      await act(async () => {
        firstFrame(0);
      });

      fireEvent.resize(window);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
      expect(frameCallbacks.has(2)).toBe(true);

      const cartQuery = queryClient
        .getQueryCache()
        .getAll()
        .find((query) => query.queryKey[2] === 'API-002');
      const cachedCart = cartQuery?.state.data as Cart | undefined;
      if (!cartQuery || !cachedCart) throw new Error('Expected the cached Cart query.');
      await act(async () => {
        queryClient.setQueryData<Cart>(cartQuery.queryKey, {
          ...cachedCart,
          totalPrice: `${cachedCart.totalPrice}0`,
        });
      });
      await waitFor(() => expect(cancelAnimationFrame).toHaveBeenCalledWith(2));
      expect(frameCallbacks.size).toBe(0);

      summaryTop = 80;
      fireEvent.resize(window);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(3);
      const restartedFrame = frameCallbacks.get(3);
      if (!restartedFrame) throw new Error('Expected a frame after the summary effect restarted.');
      frameCallbacks.delete(3);
      await act(async () => {
        restartedFrame(0);
      });
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'Go to order summary' })).toBeNull(),
      );

      fireEvent.scroll(window);
      expect(requestAnimationFrame).toHaveBeenCalledTimes(4);
      expect(frameCallbacks.has(4)).toBe(true);
      cleanup();
      expect(cancelAnimationFrame).toHaveBeenCalledWith(4);
      expect(frameCallbacks.size).toBe(0);
    } finally {
      if (originalSummaryBounds)
        Object.defineProperty(
          HTMLElement.prototype,
          'getBoundingClientRect',
          originalSummaryBounds,
        );
      else
        delete (HTMLElement.prototype as { getBoundingClientRect?: unknown }).getBoundingClientRect;
    }
  });

  it('submits one labelled mock checkout, requires explicit cart recovery after an unknown result, and never reports payment success', async () => {
    let checkoutCalls = 0;
    let rejectCheckout: ((reason?: unknown) => void) | undefined;
    const pendingCheckout = new Promise<unknown>((_resolve, reject) => {
      rejectCheckout = reject;
    });
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, cartWithItems);
      if (options.path === '/cart/checkout') {
        checkoutCalls += 1;
        return decode(options, await pendingCheckout);
      }
      if (options.path === '/enrollments/my')
        return decode(options, {
          items: [],
          page: 1,
          page_size: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: false,
        });
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();
    const checkout = await screen.findByRole('button', { name: 'Mock checkout' });
    await interact(() => user.dblClick(checkout));
    expect(checkoutCalls).toBe(1);
    expect(screen.getByRole('article').getAttribute('aria-busy')).toBe('true');
    expect(
      (screen.getByRole('button', { name: 'Checking out…' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await act(async () => {
      rejectCheckout?.(new ApiError({ kind: 'offline', status: null, message: 'private' }));
    });
    expect(
      await screen.findByText(
        'We could not confirm checkout. Check the cart status for updated guidance.',
      ),
    ).toBeTruthy();
    const recovery = screen.getByRole('button', { name: 'Check checkout status' });
    expect(
      (screen.getByRole('button', { name: 'Mock checkout' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await interact(() => user.click(recovery));
    expect(
      await screen.findByText(
        'Your cart still cannot prove whether checkout partially completed. Check My Learning before taking another checkout action.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Check My Learning' }).getAttribute('href')).toBe(
      '/learning',
    );
    expect(
      (screen.getByRole('button', { name: 'Mock checkout' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await interact(() => user.click(screen.getByRole('button', { name: 'Mock checkout' })));
    expect(checkoutCalls).toBe(1);
    expect(screen.queryByText(/payment success/i)).toBeNull();
  });

  it('keeps a dispatched 5xx checkout locked before and after unchanged-cart reconciliation', async () => {
    let checkoutCalls = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, cartWithItems);
      if (options.path === '/cart/checkout') {
        checkoutCalls += 1;
        throw new ApiError({ kind: 'server', status: 503, message: 'private' });
      }
      if (options.path === '/enrollments/my')
        return decode(options, {
          items: [],
          page: 1,
          page_size: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: false,
        });
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();

    const checkout = await screen.findByRole('button', { name: 'Mock checkout' });
    await interact(() => user.click(checkout));
    expect(await screen.findByText('Checkout status needs checking')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Mock checkout' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await interact(() => user.click(checkout));
    checkout.focus();
    await interact(() => user.keyboard('{Enter}'));
    expect(checkoutCalls).toBe(1);

    await interact(() => user.click(screen.getByRole('button', { name: 'Check checkout status' })));
    expect(
      await screen.findByText(
        'Your cart still cannot prove whether checkout partially completed. Check My Learning before taking another checkout action.',
      ),
    ).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Mock checkout' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await interact(() => user.click(screen.getByRole('button', { name: 'Mock checkout' })));
    expect(checkoutCalls).toBe(1);
  });

  it('presents a known checkout acknowledgement as payment pending after cart reconciliation', async () => {
    let cartReads = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        cartReads += 1;
        return decode(
          options,
          cartReads === 1
            ? cartWithItems
            : { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 },
        );
      }
      if (options.path === '/cart/checkout')
        return decode(options, { message: 'Checkout successful.', enrolled_courses: 2 });
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();
    const checkout = await screen.findByRole('button', { name: 'Mock checkout' });
    await interact(() => user.click(checkout));
    expect(
      await screen.findByText(
        'Mock checkout was accepted. Payment is pending; continue in My Learning.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/payment success/i)).toBeNull();
    expect(screen.getByRole('link', { name: 'Check My Learning' }).getAttribute('href')).toBe(
      '/learning',
    );
  });

  it.each([
    {
      name: 'unauthorized',
      error: new ApiError({ kind: 'unauthorized', status: 401, message: 'private' }),
      expected: 'Sign in required',
    },
    {
      name: 'forbidden',
      error: new ApiError({ kind: 'forbidden', status: 403, message: 'private' }),
      expected: 'Checkout unavailable',
    },
    {
      name: 'not found',
      error: new ApiError({ kind: 'not_found', status: 404, message: 'private' }),
      expected: 'Checkout unavailable',
    },
    {
      name: 'conflict',
      error: new ApiError({ kind: 'conflict', status: 409, message: 'private' }),
      expected: 'Enrollment changed',
    },
    {
      name: 'cart changed',
      error: new ApiError({ kind: 'bad_request', status: 400, message: 'private' }),
      expected: 'Cart changed',
    },
    {
      name: 'unavailable',
      error: new ApiError({ kind: 'server', status: 503, message: 'private' }),
      expected: 'Checkout status needs checking',
    },
    {
      name: 'malformed response',
      error: new ApiError({ kind: 'invalid_response', status: null, message: 'private' }),
      expected: 'Checkout status needs checking',
    },
  ])('renders a privacy-safe distinct $name checkout state', async ({ error, expected }) => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, cartWithItems);
      if (options.path === '/cart/checkout') throw error;
      if (options.path === '/enrollments/my')
        return decode(options, {
          items: [],
          page: 1,
          page_size: 20,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: false,
        });
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();
    const checkout = await screen.findByRole('button', { name: 'Mock checkout' });
    await interact(() => user.click(checkout));
    expect(await screen.findByText(expected)).toBeTruthy();
    expect(screen.queryByText('private')).toBeNull();
  });
  it('renders the exact long server total without decimal recomputation', async () => {
    const totalPrice = '1000000000000000000000019.0001';
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, { ...cartWithItems, total_price: totalPrice });
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);

    expect((await screen.findByLabelText('Cart total')).textContent).toContain(`USD ${totalPrice}`);
  });

  it('composes the exact Cart list-and-summary hierarchy without a selection control', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, cartWithItems);
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);

    expect(screen.queryByText('Student workspace')).toBeNull();
    expect(await screen.findByText('2 courses')).toBeTruthy();
    expect(screen.queryByText('2 courses in cart')).toBeNull();
    expect(screen.queryByText('Courses')).toBeNull();
    expect(screen.queryByRole('button', { name: /select all/i })).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Long accessible course title' }).getAttribute('href'),
    ).toBe('/courses/7');
    expect(
      screen
        .getByRole('link', { name: 'Preview Long accessible course title' })
        .getAttribute('href'),
    ).toBe('/courses/7');
    expect(
      screen
        .getByRole('button', { name: 'Remove Long accessible course title' })
        .querySelector('svg'),
    ).toBeTruthy();
    const cartItem = screen
      .getByRole('link', { name: 'Long accessible course title' })
      .closest<HTMLElement>('[role="listitem"]');
    if (!cartItem) throw new Error('Long-title Cart item is unavailable.');
    const price = within(cartItem).getByText('Price', { selector: 'p' });
    const remove = screen.getByRole('button', { name: 'Remove Long accessible course title' });
    expect(price.parentElement?.parentElement).toBe(
      remove.parentElement?.parentElement?.parentElement,
    );
    expect(price.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const summary = screen.getByLabelText('Cart total');
    expect(within(summary).getByRole('heading', { name: 'Order summary' })).toBeTruthy();
    expect(within(summary).getByText('Total')).toBeTruthy();
    expect(within(summary).getByRole('separator')).toBeTruthy();
    expect(summary.textContent).toContain('USD 29.990');
    const clearCart = screen.getByRole('button', { name: 'Clear cart' });
    expect(clearCart.querySelector('svg')).toBeTruthy();
    expect(clearCart.className).toContain('clearCartButton');
    const titleGroup = screen.getByRole('heading', { name: 'Cart' }).parentElement;
    expect(titleGroup?.className).toContain('titleRow');
    expect(titleGroup?.parentElement?.className).toContain('toolbar');
    expect(titleGroup?.parentElement?.contains(clearCart)).toBe(true);
    const checkout = screen.getByRole('button', { name: 'Mock checkout' });
    expect(checkout).toBeTruthy();
    const disclosure = within(summary).getByText('Insecure checkout');
    expect(disclosure.tagName).toBe('SPAN');
    expect(disclosure.parentElement?.previousElementSibling?.contains(checkout)).toBe(true);
    const disclosureIcon = disclosure.parentElement?.querySelector('svg.lucide-shield-x');
    expect(disclosureIcon?.getAttribute('aria-hidden')).toBe('true');
    expect(
      disclosure.parentElement?.querySelector('button, a, input, select, textarea'),
    ).toBeNull();
  });

  it('does not display a converted or collapsed Total for mixed authoritative row currencies', async () => {
    const mixedCurrencyCart = {
      ...cartWithItems,
      items: [
        cartWithItems.items[0],
        {
          ...cartWithItems.items[1],
          course: { ...cartWithItems.items[1].course, currency: 'EUR' },
        },
      ],
    };
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, mixedCurrencyCart);
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);

    expect(await screen.findByText('Total unavailable')).toBeTruthy();
    expect(screen.getByLabelText('Cart total').textContent).not.toContain('USD 29.990');
    expect(screen.getByText('USD 19.990')).toBeTruthy();
    expect(screen.getByText('EUR 10.00')).toBeTruthy();
  });

  it('centers an empty-cart recovery card with its real catalog link', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, {
          id: 1,
          items: [],
          total_price: '0.00',
          currency: 'USD',
          item_count: 0,
        });
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);

    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse courses' }).getAttribute('href')).toBe('/');
  });

  it('keeps the newest initial-error retry focus intent when an obsolete retry fails', async () => {
    let reads = 0;
    let rejectFirstRetry: ((error: Error) => void) | undefined;
    const firstRetry = new Promise<unknown>((_resolve, reject) => {
      rejectFirstRetry = reject;
    });
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
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
    await act(async () => {
      fireEvent.click(refresh);
      fireEvent.click(refresh);
    });
    await waitFor(() => expect(reads).toBe(2));
    expect(
      (screen.getByRole('button', { name: 'Refresh cart' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await act(async () => {
      rejectFirstRetry?.(new ApiError({ kind: 'server', status: 503, message: 'private' }));
    });
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Refresh cart' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Refresh cart' })));
    await waitFor(() => expect(reads).toBe(3));
    await screen.findByRole('button', { name: 'Remove Long accessible course title' });
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Cart' })).toBe(document.activeElement),
    );
  });

  it('does not steal focus during an ordinary retained-data refresh', async () => {
    let reads = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        reads += 1;
        if (reads === 2) throw new ApiError({ kind: 'server', status: 503, message: 'private' });
        return decode(options, cartWithItems);
      }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    const queryClient = await renderCart(request);
    const remove = await screen.findByRole('button', {
      name: 'Remove Long accessible course title',
    });

    await act(async () => {
      await queryClient.invalidateQueries(
        {
          predicate: (query) => query.queryKey[0] === 'private' && query.queryKey[2] === 'API-002',
        },
        { throwOnError: false },
      );
    });
    const refresh = await screen.findByRole('button', { name: 'Refresh cart' });
    remove.focus();
    await act(async () => {
      fireEvent.click(refresh);
    });

    await waitFor(() => expect(reads).toBe(3));
    expect(remove).toBe(document.activeElement);
  });

  it('serializes destructive input, exposes aggregate busy state, and revalidates the shared cart after removal', async () => {
    let resolveRemove: (() => void) | undefined;
    let cartReads = 0;
    let removeRequests = 0;
    let clearRequests = 0;
    const pendingRemove = new Promise<void>((resolve) => {
      resolveRemove = resolve;
    });
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        cartReads += 1;
        return decode(
          options,
          cartReads === 1
            ? cartWithItems
            : {
                ...cartWithItems,
                items: [cartWithItems.items[1]],
                total_price: '10.00',
                item_count: 1,
              },
        );
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

    const remove = await screen.findByRole('button', {
      name: 'Remove Long accessible course title',
    });
    await interact(() => user.click(remove));
    await waitFor(() => expect(removeRequests).toBe(1));
    expect(screen.getByRole('article').getAttribute('aria-busy')).toBe('true');
    const pendingRemoveAction = screen.getByRole('button', {
      name: 'Remove Long accessible course title',
    });
    expect((pendingRemoveAction as HTMLButtonElement).disabled).toBe(false);
    expect(pendingRemoveAction.getAttribute('aria-busy')).toBeNull();
    expect(pendingRemoveAction.querySelector('[data-part="spinner"]')).toBeNull();
    expect((screen.getByRole('button', { name: 'Clear cart' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await interact(() =>
      user.dblClick(screen.getByRole('button', { name: 'Remove Second course' })),
    );
    expect(removeRequests).toBe(1);
    expect(clearRequests).toBe(0);

    await act(async () => {
      resolveRemove?.();
    });
    expect(await screen.findByText('Course removed from cart.')).toBeTruthy();
    await waitFor(() => expect(cartReads).toBe(2));
    expect(screen.getAllByText('USD 10.00')).toHaveLength(2);
  });

  it('preserves stale content on a background failure and clears remove feedback only after a successful recovery', async () => {
    let reads = 0;
    let removeAttempts = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
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
    const remove = await screen.findByRole('button', {
      name: 'Remove Long accessible course title',
    });
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
    expect(
      screen.getByRole('button', { name: 'Remove Long accessible course title' }),
    ).toBeTruthy();
  });

  it('requires confirmation before clearing and revalidates the empty cart result', async () => {
    let reads = 0;
    let clearRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET') {
        reads += 1;
        return decode(
          options,
          reads === 1
            ? cartWithItems
            : { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 },
        );
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
    await interact(() =>
      user.click(
        within(screen.getByRole('dialog', { name: 'Clear cart?' })).getByRole('button', {
          name: 'Clear cart',
        }),
      ),
    );
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Cart cleared.');
    expect(clearRequests).toBe(1);
    expect(reads).toBe(2);
  });

  it.each(['ru', 'uz'] as const)(
    'announces the localized polite clear-cart status in %s without changing the write or focus contract',
    async (locale) => {
      await act(() => localeRuntime.changeLanguage(locale));
      let reads = 0;
      let clearRequests = 0;
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/cart' && options.method === 'GET') {
          reads += 1;
          return decode(
            options,
            reads === 1
              ? cartWithItems
              : { id: 1, items: [], total_price: '0.00', currency: 'USD', item_count: 0 },
          );
        }
        if (options.path === '/cart' && options.method === 'DELETE') {
          clearRequests += 1;
          return decode(options, undefined);
        }
        throw new Error(`Unexpected request ${options.method} ${options.path}`);
      };
      await renderCart(request);
      const user = userEvent.setup();
      const copy = CART_MAPPED_CONSUMER_COPY[locale];
      const clear = await screen.findByRole('button', { name: copy.clearAction });

      await interact(() => user.click(clear));
      await interact(() =>
        user.click(
          within(screen.getByRole('dialog', { name: copy.clearDialog })).getByRole('button', {
            name: copy.clearAction,
          }),
        ),
      );

      const status = screen.getByRole('status');
      await waitFor(() => expect(status.textContent).toContain(copy.clearStatus));
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.textContent).not.toContain('Cart cleared.');
      expect(clearRequests).toBe(1);
      expect(reads).toBe(2);
      await waitFor(() =>
        expect(screen.getByRole('heading', { level: 1 })).toBe(document.activeElement),
      );
    },
  );

  it.each(['ru', 'uz'] as const)(
    'announces the localized polite course-removal status in %s without changing the write contract',
    async (locale) => {
      await act(() => localeRuntime.changeLanguage(locale));
      let reads = 0;
      let removeRequests = 0;
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/cart' && options.method === 'GET') {
          reads += 1;
          return decode(
            options,
            reads === 1
              ? cartWithItems
              : {
                  ...cartWithItems,
                  items: [cartWithItems.items[1]],
                  total_price: '10.00',
                  item_count: 1,
                },
          );
        }
        if (options.path === '/cart/items/7' && options.method === 'DELETE') {
          removeRequests += 1;
          return decode(options, undefined);
        }
        throw new Error(`Unexpected request ${options.method} ${options.path}`);
      };
      await renderCart(request);
      const user = userEvent.setup();
      const remove = await screen.findByRole('button', { name: /Long accessible course title/ });

      await interact(() => user.click(remove));

      const status = screen.getByRole('status');
      const copy = CART_MAPPED_CONSUMER_COPY[locale];
      await waitFor(() => expect(status.textContent).toContain(copy.removeStatus));
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.textContent).not.toContain('Course removed from cart.');
      expect(removeRequests).toBe(1);
      expect(reads).toBe(2);
    },
  );

  it('uses a truthful pending label while the confirmed cart clear is in flight', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, cartWithItems);
      if (options.path === '/cart' && options.method === 'DELETE') return new Promise(() => {});
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();
    const clear = await screen.findByRole('button', { name: 'Clear cart' });

    await interact(() => user.click(clear));
    await interact(() =>
      user.click(
        within(screen.getByRole('dialog', { name: 'Clear cart?' })).getByRole('button', {
          name: 'Clear cart',
        }),
      ),
    );

    await waitFor(() => {
      const confirmation = screen.getByRole('button', { name: 'Clearing cart...' });
      expect((confirmation as HTMLButtonElement).disabled).toBe(true);
      expect(confirmation.getAttribute('aria-busy')).toBe('true');
      expect(
        within(screen.getByRole('dialog', { name: 'Clear cart?' })).getByRole('status').textContent,
      ).toContain('Clearing cart...');
    });
  });

  it('keeps retained cart content recoverable when post-remove revalidation fails', async () => {
    let reads = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
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
    const remove = await screen.findByRole('button', {
      name: 'Remove Long accessible course title',
    });

    await interact(() => user.click(remove));
    expect(await screen.findByText('Cart update needs a refresh')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Remove Long accessible course title' }),
    ).toBeTruthy();
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
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/cart' && options.method === 'GET')
        return decode(options, {
          ...cartWithItems,
          items: currentItems,
          item_count: currentItems.length,
          total_price: currentItems.length === 0 ? '0.00' : '19.990',
        });
      if (options.path === '/cart/items/7') {
        currentItems = [];
        return decode(options, undefined);
      }
      throw new Error(`Unexpected request ${options.method} ${options.path}`);
    };
    await renderCart(request);
    const user = userEvent.setup();

    const remove = await screen.findByRole('button', {
      name: 'Remove Long accessible course title',
    });
    await interact(() => user.click(remove));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBe(
        document.activeElement,
      ),
    );
  });
});
