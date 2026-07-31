// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import * as checkoutCart from '../../src/features/checkout-cart';
import type { CheckoutWorkflow, EnrollmentStatusRefresh } from '../../src/features/checkout-cart';
import {
  SessionProvider,
  useSession,
  type AccessTokenStore,
} from '../../src/features/auth-session';
import type { EnrollmentStatus } from '../../src/entities/enrollment';
import * as learningProgress from '../../src/features/learning-progress';
import type { LearningWorkspaceWorkflow } from '../../src/features/learning-progress';
import { LearningDetailPage } from '../../src/pages/learning-detail-page';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const student = {
  email: 'student@example.test',
  name: 'Sam',
  surname: 'Student',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-01-01T00:00:00Z',
};
const activeEnrollment = {
  id: 4,
  user_id: 1,
  course_id: 7,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  course: {
    id: 7,
    title: 'Accessible progress course',
    description: null,
    price: '0.00',
    currency: 'USD',
  },
};
const oneLessonOutline = {
  items: [
    {
      id: 12,
      title: 'First lesson',
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
};

function tokenStore(): AccessTokenStore {
  return { get: () => 'student-token', set: () => {}, clear: () => {} };
}
function decode<TResponse, TBody>(
  options: ApiRequestOptions<TBody, TResponse>,
  value: unknown,
): TResponse {
  return options.decode ? options.decode(value) : (value as TResponse);
}

interface DetailHarnessOptions {
  readonly initialEntry?: string;
  readonly queryClient?: QueryClient;
  readonly sessionChange?: boolean;
  readonly routeChange?: boolean;
  readonly store?: AccessTokenStore;
}

function DetailHarnessControls({ routeChange, sessionChange }: DetailHarnessOptions) {
  const navigate = useNavigate();
  const session = useSession();
  return (
    <>
      {routeChange ? (
        <button type="button" onClick={() => navigate('/learning/enrollments/5')}>
          Open workspace 5
        </button>
      ) : null}
      {sessionChange ? (
        <button type="button" onClick={() => session.acceptAccessToken('replacement-token')}>
          Change learner
        </button>
      ) : null}
    </>
  );
}

async function renderPage(request: ApiClient['request'], options: DetailHarnessOptions = {}) {
  const queryClient = options.queryClient ?? createAppQueryClient();
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider client={{ request }} tokenStore={options.store ?? tokenStore()}>
          <MemoryRouter initialEntries={[options.initialEntry ?? '/learning/enrollments/4']}>
            <DetailHarnessControls {...options} />
            <Routes>
              <Route path="/learning/enrollments/:enrollmentId" element={<LearningDetailPage />} />
            </Routes>
          </MemoryRouter>
        </SessionProvider>
      </QueryClientProvider>,
    );
  });
  return queryClient;
}

type EnrollmentRefetchResult = Awaited<
  ReturnType<LearningWorkspaceWorkflow['enrollment']['refetch']>
>;

type EnrollmentRefreshScenario =
  | { readonly kind: 'failure'; readonly error: unknown }
  | { readonly kind: 'missing_data' }
  | { readonly kind: 'status'; readonly status: EnrollmentStatus };

function resultForEnrollmentRefreshScenario(
  result: EnrollmentRefetchResult,
  scenario: EnrollmentRefreshScenario,
): EnrollmentRefetchResult {
  if (scenario.kind === 'failure')
    return Object.assign({}, result, { isError: true, error: scenario.error, data: undefined });
  if (scenario.kind === 'missing_data')
    return Object.assign({}, result, { isError: false, error: null, data: undefined });
  if (result.data === undefined)
    throw new Error('Enrollment query did not provide data for a status scenario');
  return Object.assign({}, result, {
    isError: false,
    error: null,
    data: { ...result.data, status: scenario.status },
  });
}

async function capturePageEnrollmentRefresh(
  scenario: EnrollmentRefreshScenario,
): Promise<EnrollmentStatusRefresh> {
  const originalUseLearningWorkspace = learningProgress.useLearningWorkspace;
  function useLearningWorkspaceWithRefreshResult(
    enrollmentId: number | null,
  ): LearningWorkspaceWorkflow {
    const workspace = originalUseLearningWorkspace(enrollmentId);
    return {
      ...workspace,
      enrollment: {
        ...workspace.enrollment,
        refetch: async (options) =>
          resultForEnrollmentRefreshScenario(await workspace.enrollment.refetch(options), scenario),
      },
    };
  }

  vi.spyOn(learningProgress, 'useLearningWorkspace').mockImplementation(
    useLearningWorkspaceWithRefreshResult,
  );
  let capturedRefresh: EnrollmentStatusRefresh | undefined;
  const checkoutWorkflow: CheckoutWorkflow = {
    pending: false,
    checkoutBlocked: false,
    paymentActionsLocked: false,
    feedback: null,
    checkout: vi.fn(),
    recoverCheckout: vi.fn(),
    completeMockPayment: vi.fn((_enrollmentId, _outcome, refresh) => {
      capturedRefresh = refresh;
    }),
    checkPaymentStatus: vi.fn(),
  };
  vi.spyOn(checkoutCart, 'useCheckoutCart').mockReturnValue(checkoutWorkflow);

  const request: ApiClient['request'] = async <TResponse, TBody>(
    options: ApiRequestOptions<TBody, TResponse>,
  ) => {
    if (options.path === '/me') return decode(options, student);
    if (options.path === '/enrollments/4')
      return decode(options, { ...activeEnrollment, status: 'pending_payment' });
    throw new Error(`Unexpected request ${options.path}`);
  };
  await renderPage(request);
  const user = userEvent.setup();
  const paymentAction = await screen.findByRole('button', { name: 'Complete mock payment' });
  await act(async () => {
    await user.click(paymentAction);
  });
  if (capturedRefresh === undefined)
    throw new Error('Learning detail did not provide an enrollment refresh callback');
  return capturedRefresh;
}

describe('LearningDetailPage', () => {
  function expectMyLearningReturn() {
    const links = screen.getAllByRole('link', { name: 'My learning' });
    expect(links).toHaveLength(1);
    const link = links[0]!;
    expect(link.getAttribute('href')).toBe('/learning');
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(link.querySelector('svg')?.getAttribute('width')).toBe('18');
    expect(link.textContent).toBe('My learning');
  }

  it('keeps the normal workspace back control as a decorative-icon contextual link', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
      throw new Error(`Unexpected request ${options.path}`);
    };

    await renderPage(request);

    await screen.findByRole('link', { name: 'My learning' });
    expectMyLearningReturn();
    expect(screen.queryByText('Media unavailable in this workspace')).toBeNull();
    expect(screen.queryByRole('button', { name: /load (video|pdf)/i })).toBeNull();
  });

  it('renders the same contextual return for invalid and loading learning-detail states', async () => {
    const pendingEnrollment = new Promise<never>(() => {});
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, await pendingEnrollment);
      throw new Error(`Unexpected request ${options.path}`);
    };

    await renderPage(request, { initialEntry: '/learning/enrollments/not-an-id' });
    expectMyLearningReturn();
    cleanup();
    await renderPage(request);
    await screen.findByRole('status', { name: 'Loading learning workspace' });
    expectMyLearningReturn();
  });

  it('uses singular lesson wording in the visible and accessible progress projections', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            {
              id: 12,
              title: 'First lesson',
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
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    expect(await screen.findByText('0 of 1 lesson completed')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: '0 of 1 lesson completed, 0%' })).toBeTruthy();
  });

  it('projects visible lessons as available and the progress remainder as coming soon', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 4,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            { ...oneLessonOutline.items[0]!, id: 12, is_published: true },
            { ...oneLessonOutline.items[0]!, id: 13, is_published: true },
            { ...oneLessonOutline.items[0]!, id: 14, is_published: true },
          ],
          page: 1,
          page_size: 100,
          total: 3,
          pages: 1,
          has_next: false,
          has_previous: false,
        });
      throw new Error(`Unexpected request ${options.path}`);
    };

    await renderPage(request);

    expect(await screen.findByText('3 available now · 1 lesson coming soon')).toBeTruthy();
    expect(
      screen.getByText('3 available now · 1 lesson coming soon').previousElementSibling
        ?.textContent,
    ).toBe('Lessons (3)');
  });

  it('starts each active lesson as explicitly unknown despite nonzero aggregate progress', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 1,
          total_lessons: 2,
          progress_percentage: 50,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            {
              id: 12,
              title: 'First lesson',
              lesson_type: 'video',
              download_url: '/media/private.mp4',
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
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    expect(await screen.findByText('Completion status unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
    expect(screen.queryByText('/media/private.mp4')).toBeNull();
    expect(screen.queryByRole('link', { name: /download/i })).toBeNull();
  });

  it.each(['cancelled', 'pending_payment'] as const)(
    'does not issue progress or lesson requests for a %s enrollment',
    async (status) => {
      const rawRequest = vi.fn(
        async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
          if (options.path === '/me') return decode(options, student);
          if (options.path === '/enrollments/4')
            return decode(options, { ...activeEnrollment, status });
          throw new Error(`Unexpected request ${options.path}`);
        },
      );
      await renderPage(rawRequest as ApiClient['request']);
      expect(
        await screen.findByText(
          status === 'pending_payment'
            ? 'Mock payment is awaiting completion. Learning remains locked until your enrollment is active.'
            : 'Learning progress is not available for this enrollment.',
        ),
      ).toBeTruthy();
      expect(rawRequest.mock.calls.map(([options]) => options.path)).not.toContain(
        '/courses/7/progress',
      );
      expect(rawRequest.mock.calls.map(([options]) => options.path)).not.toContain(
        '/courses/7/lessons',
      );
      expect(screen.queryByRole('button', { name: /mark/i })).toBeNull();
    },
  );

  it('preserves an Error returned by a failed enrollment refresh', async () => {
    const originalError = new Error('original refresh failure');
    const refresh = await capturePageEnrollmentRefresh({ kind: 'failure', error: originalError });
    await expect(refresh.refetchEnrollment()).rejects.toBe(originalError);
  });

  it.each([null, 'non-error refresh failure'])(
    'normalizes a failed enrollment refresh carrying %p to a stable Error',
    async (error) => {
      const refresh = await capturePageEnrollmentRefresh({ kind: 'failure', error });
      await expect(refresh.refetchEnrollment()).rejects.toThrow('Enrollment status refresh failed');
    },
  );

  it('reports a successful enrollment refresh without data as a distinct stable Error', async () => {
    const refresh = await capturePageEnrollmentRefresh({ kind: 'missing_data' });
    await expect(refresh.refetchEnrollment()).rejects.toThrow(
      'Enrollment status refresh returned no enrollment data',
    );
  });

  it.each(['pending_payment', 'active', 'cancelled'] as const)(
    'projects the observed %s status from a successful enrollment refresh',
    async (status) => {
      const refresh = await capturePageEnrollmentRefresh({ kind: 'status', status });
      await expect(refresh.refetchEnrollment()).resolves.toBe(status);
    },
  );

  it('submits one explicit failed mock-payment action and keeps the refreshed cancelled enrollment locked', async () => {
    let enrollmentReads = 0;
    let paymentRequests = 0;
    const rawRequest = vi.fn(
      async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/enrollments/4') {
          enrollmentReads += 1;
          return decode(options, {
            ...activeEnrollment,
            status: enrollmentReads === 1 ? 'pending_payment' : 'cancelled',
          });
        }
        if (options.path === '/payments/complete') {
          paymentRequests += 1;
          expect(options.body).toEqual({ enrollment_id: 4, status: 'failed' });
          return decode(options, {
            enrollment_id: 4,
            status: 'cancelled',
            message: 'Payment failed.',
          });
        }
        throw new Error(`Unexpected request ${options.path}`);
      },
    );
    await renderPage(rawRequest as ApiClient['request']);
    const user = userEvent.setup();
    const failedPayment = await screen.findByRole('button', {
      name: 'Simulate mock payment failure',
    });
    await act(async () => {
      await user.click(failedPayment);
    });
    expect(paymentRequests).toBe(1);
    expect(
      await screen.findByText('The mock payment was declined. This enrollment remains locked.'),
    ).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(rawRequest.mock.calls.map(([options]) => options.path)).not.toContain(
      '/courses/7/progress',
    );
    expect(rawRequest.mock.calls.map(([options]) => options.path)).not.toContain(
      '/courses/7/lessons',
    );
  });

  it('hides both payment mutations after an unknown API-034 result and releases no second POST before observed pending reconciliation', async () => {
    let enrollmentReads = 0;
    let paymentPosts = 0;
    const rawRequest = vi.fn(
      async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/enrollments/4') {
          enrollmentReads += 1;
          return decode(options, { ...activeEnrollment, status: 'pending_payment' });
        }
        if (options.path === '/payments/complete') {
          paymentPosts += 1;
          throw new ApiError({ kind: 'offline', status: 0, message: 'offline' });
        }
        if (options.path === '/courses/7/progress')
          return decode(options, {
            course_id: 7,
            completed_lessons: 0,
            total_lessons: 0,
            progress_percentage: 0,
          });
        if (options.path === '/courses/7/lessons')
          return decode(options, {
            items: [],
            page: 1,
            page_size: 100,
            total: 0,
            pages: 0,
            has_next: false,
            has_previous: false,
          });
        throw new Error(`Unexpected request ${options.path}`);
      },
    );
    await renderPage(rawRequest as ApiClient['request']);
    const user = userEvent.setup();
    await waitFor(() => expect(enrollmentReads).toBe(1));
    await act(async () => {
      await user.click(await screen.findByRole('button', { name: 'Complete mock payment' }));
    });
    expect(
      await screen.findByText(
        'We could not confirm the mock payment status. Check enrollment status before taking another action.',
      ),
    ).toBeTruthy();
    expect(paymentPosts).toBe(1);
    expect(screen.queryByRole('button', { name: 'Complete mock payment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Simulate mock payment failure' })).toBeNull();
    const statusCheck = screen.getByRole('button', { name: 'Check payment status' });
    await act(async () => {
      await user.click(statusCheck);
    });
    expect(
      await screen.findByText(
        'The enrollment is still pending, so you can choose a new mock payment outcome.',
      ),
    ).toBeTruthy();
    expect(paymentPosts).toBe(1);
    expect(screen.getByRole('button', { name: 'Complete mock payment' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Simulate mock payment failure' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Check payment status' })).toBeNull();
  });

  it('retains the payment lock and reconciliation action when the post-payment enrollment refresh fails', async () => {
    let enrollmentReads = 0;
    const rawRequest = vi.fn(
      async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/enrollments/4') {
          enrollmentReads += 1;
          if (enrollmentReads === 3)
            throw new ApiError({ kind: 'offline', status: 0, message: 'offline' });
          return decode(options, { ...activeEnrollment, status: 'pending_payment' });
        }
        if (options.path === '/payments/complete')
          return decode(options, { enrollment_id: 4, status: 'active', message: 'mock' });
        throw new Error(`Unexpected request ${options.path}`);
      },
    );
    await renderPage(rawRequest as ApiClient['request']);
    const user = userEvent.setup();
    await waitFor(() => expect(enrollmentReads).toBe(1));
    await act(async () => {
      await user.click(await screen.findByRole('button', { name: 'Complete mock payment' }));
    });
    expect(
      await screen.findByText(
        'We could not confirm the mock payment status. Check enrollment status before taking another action.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Complete mock payment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Simulate mock payment failure' })).toBeNull();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Check payment status' }));
    });
    expect(
      await screen.findByText(
        'The enrollment is still pending, so you can choose a new mock payment outcome.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Complete mock payment' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Simulate mock payment failure' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Check payment status' })).toBeNull();
  });

  it('unlocks progress only after a refreshed active enrollment following explicit mock-payment success', async () => {
    let enrollmentReads = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') {
        enrollmentReads += 1;
        return decode(options, {
          ...activeEnrollment,
          status: enrollmentReads === 1 ? 'pending_payment' : 'active',
        });
      }
      if (options.path === '/payments/complete') {
        expect(options.body).toEqual({ enrollment_id: 4, status: 'success' });
        return decode(options, {
          enrollment_id: 4,
          status: 'active',
          message: 'Payment successful.',
        });
      }
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 0,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [],
          page: 1,
          page_size: 100,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: false,
        });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const completedPayment = await screen.findByRole('button', { name: 'Complete mock payment' });
    await act(async () => {
      await user.click(completedPayment);
    });
    expect(await screen.findByRole('heading', { name: 'Learning progress' })).toBeTruthy();
    expect(enrollmentReads).toBeGreaterThan(1);
  });

  it.each([403, 404])(
    'renders a neutral no-action state when progress returns %i for an active enrollment',
    async (status) => {
      const rawRequest = vi.fn(
        async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
          if (options.path === '/me') return decode(options, student);
          if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
          if (options.path === '/courses/7/progress')
            throw new ApiError({ kind: 'forbidden', status, message: 'private backend text' });
          if (options.path === '/courses/7/lessons')
            return decode(options, {
              items: [],
              page: 1,
              page_size: 100,
              total: 0,
              pages: 0,
              has_next: false,
              has_previous: false,
            });
          throw new Error(`Unexpected request ${options.path}`);
        },
      );
      await renderPage(rawRequest as ApiClient['request']);
      expect(
        await screen.findByRole('heading', { name: 'Learning workspace unavailable' }),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: /mark|try again/i })).toBeNull();
      expect(screen.queryByText('private backend text')).toBeNull();
      expectMyLearningReturn();
    },
  );

  it.each([403, 404])(
    'renders a neutral no-action state when API-014 returns %i with successful progress',
    async (status) => {
      const rawRequest = vi.fn(
        async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
          if (options.path === '/me') return decode(options, student);
          if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
          if (options.path === '/courses/7/progress')
            return decode(options, {
              course_id: 7,
              completed_lessons: 0,
              total_lessons: 1,
              progress_percentage: 0,
            });
          if (options.path === '/courses/7/lessons')
            throw new ApiError({ kind: 'forbidden', status, message: 'private backend text' });
          throw new Error(`Unexpected request ${options.path}`);
        },
      );
      await renderPage(rawRequest as ApiClient['request']);
      expect(
        await screen.findByRole('heading', { name: 'Learning workspace unavailable' }),
      ).toBeTruthy();
      expect(screen.queryByRole('progressbar')).toBeNull();
      expect(screen.queryByRole('heading', { name: /Lessons/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /mark|try again/i })).toBeNull();
      expect(screen.queryByText('private backend text')).toBeNull();
      expectMyLearningReturn();
    },
  );

  it.each([403, 404])(
    'renders the same neutral no-action state when API-022 returns %i',
    async (status) => {
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/enrollments/4')
          throw new ApiError({ kind: 'forbidden', status, message: 'private backend text' });
        throw new Error(`Unexpected request ${options.path}`);
      };
      await renderPage(request);
      expect(
        await screen.findByRole('heading', { name: 'Learning workspace unavailable' }),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: /mark|try again/i })).toBeNull();
      expect(screen.queryByText('private backend text')).toBeNull();
      expectMyLearningReturn();
    },
  );

  it('renders one contextual return when enrollment data is missing', async () => {
    const originalUseLearningWorkspace = learningProgress.useLearningWorkspace;
    vi.spyOn(learningProgress, 'useLearningWorkspace').mockImplementation(
      (enrollmentId, preferences) => {
        const workspace = originalUseLearningWorkspace(enrollmentId, preferences);
        return {
          ...workspace,
          enrollment: {
            ...workspace.enrollment,
            data: undefined,
            isError: false,
            isPending: false,
          } as unknown as LearningWorkspaceWorkflow['enrollment'],
        };
      },
    );
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      throw new Error(`Unexpected request ${options.path}`);
    };

    await renderPage(request);
    expect(
      await screen.findByRole('heading', { name: 'Learning workspace unavailable' }),
    ).toBeTruthy();
    expectMyLearningReturn();
  });

  it('retains a successful lesson outline when progress fails and retries both peers', async () => {
    let progressRequests = 0;
    let outlineRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') {
        progressRequests += 1;
        if (progressRequests === 1)
          throw new ApiError({ kind: 'server', status: 500, message: 'private progress detail' });
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      }
      if (options.path === '/courses/7/lessons') {
        outlineRequests += 1;
        return decode(options, oneLessonOutline);
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    expect(await screen.findByRole('heading', { name: 'Lessons (1)' })).toBeTruthy();
    expect(screen.getByText('First lesson')).toBeTruthy();
    expect(screen.getByText('Progress summary is unavailable')).toBeTruthy();
    expect(screen.queryByText('private progress detail')).toBeNull();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(await screen.findByRole('progressbar')).toBeTruthy();
    expect(progressRequests).toBe(2);
    expect(outlineRequests).toBe(2);
  });

  it('retains a successful progress summary when the lesson outline fails and retries both peers', async () => {
    let progressRequests = 0;
    let outlineRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') {
        progressRequests += 1;
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      }
      if (options.path === '/courses/7/lessons') {
        outlineRequests += 1;
        if (outlineRequests === 1)
          throw new ApiError({ kind: 'server', status: 500, message: 'private outline detail' });
        return decode(options, oneLessonOutline);
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    expect(await screen.findByRole('progressbar')).toBeTruthy();
    expect(screen.getByText('Lesson outline is unavailable')).toBeTruthy();
    expect(screen.queryByText('private outline detail')).toBeNull();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(await screen.findByRole('heading', { name: 'Lessons (1)' })).toBeTruthy();
    expect(progressRequests).toBe(2);
    expect(outlineRequests).toBe(2);
  });

  it('keeps both independent failures in one truthful total-unavailable state', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        throw new ApiError({ kind: 'server', status: 500, message: 'private progress detail' });
      if (options.path === '/courses/7/lessons')
        throw new ApiError({ kind: 'server', status: 500, message: 'private outline detail' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    expect(await screen.findByText('Learning progress is unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByRole('heading', { name: /lessons/i })).toBeNull();
    expect(screen.queryByText('private progress detail')).toBeNull();
    expect(screen.queryByText('private outline detail')).toBeNull();
  });

  it('deduplicates a pending lesson completion and adopts its successful response', async () => {
    let completeRequests = 0;
    let resolveCompletion: ((value: unknown) => void) | undefined;
    const completion = new Promise<unknown>((resolve) => {
      resolveCompletion = resolve;
    });
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            {
              id: 12,
              title: 'First lesson',
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
      if (options.path === '/courses/7/lessons/12/complete') {
        completeRequests += 1;
        return decode(options, await completion);
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const action = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => {
      await user.click(action);
    });
    expect(action.getAttribute('aria-busy')).toBe('true');
    expect(action.getAttribute('aria-disabled')).toBe('true');
    expect((action as HTMLButtonElement).disabled).toBe(false);
    expect(action).toBe(document.activeElement);
    expect(action.querySelector('[data-part="spinner"]')).toBeNull();
    expect(action.textContent).toContain('Mark incomplete');
    await act(async () => {
      await user.click(action);
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
    });
    expect(completeRequests).toBe(1);
    await act(async () => {
      resolveCompletion?.({ lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
    });
    await waitFor(() => expect(screen.getByText('Completed')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Mark incomplete' })).toBeTruthy();
  });

  it('keeps one stable polite success slot through the accepted lifetime and opacity exit without moving focus', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
      if (options.path.endsWith('/complete'))
        return decode(options, {
          lesson_id: 12,
          completed: true,
          completed_at: '2026-07-27T00:00:00Z',
        });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const action = await screen.findByRole('button', { name: 'Mark complete' });
    vi.useFakeTimers();
    action.focus();
    await act(async () => {
      fireEvent.click(action);
      await Promise.resolve();
    });
    const success = screen.getByText('Lesson marked complete.');
    const slot = success.parentElement?.parentElement?.parentElement;
    expect(success.closest('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
    expect(slot?.getAttribute('data-feedback-state')).toBe('visible');
    expect(screen.getByRole('button', { name: 'Mark incomplete' })).toBe(document.activeElement);

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(slot?.getAttribute('data-feedback-state')).toBe('exiting');
    expect(screen.getByText('Lesson marked complete.')).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(119);
    });
    expect(screen.getByText('Lesson marked complete.')).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Lesson marked complete.')).toBeNull();
    expect(slot?.getAttribute('data-feedback-state')).toBe('empty');
  });

  it('replaces a success timer on a rapid completion toggle while keeping errors persistent', async () => {
    let completionCount = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
      if (options.path.endsWith('/complete') || options.path.endsWith('/incomplete')) {
        completionCount += 1;
        if (completionCount === 3)
          throw new ApiError({ kind: 'server', status: 500, message: 'private detail' });
        return decode(options, {
          lesson_id: 12,
          completed: completionCount === 1,
          completed_at: completionCount === 1 ? '2026-07-27T00:00:00Z' : null,
        });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const firstAction = await screen.findByRole('button', { name: 'Mark complete' });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(firstAction);
      await Promise.resolve();
    });
    expect(screen.getByText('Lesson marked complete.')).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(3900);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark incomplete' }));
      await Promise.resolve();
    });
    expect(screen.getByText('Lesson marked incomplete.')).toBeTruthy();
    expect(
      screen
        .getByText('Lesson marked incomplete.')
        .closest('[role="status"]')
        ?.getAttribute('data-tone'),
    ).toBe('info');
    await act(async () => {
      vi.advanceTimersByTime(120);
    });
    expect(screen.getByText('Lesson marked incomplete.')).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
      await Promise.resolve();
    });
    const error = screen.getByText('Lesson progress could not be updated. Try again.');
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(error).toBeTruthy();
  });

  it('extends the existing success notice without restarting its visible state', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 2,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            oneLessonOutline.items[0]!,
            { ...oneLessonOutline.items[0]!, id: 13, title: 'Second lesson' },
          ],
          page: 1,
          page_size: 100,
          total: 2,
          pages: 1,
          has_next: false,
          has_previous: false,
        });
      if (options.path.endsWith('/complete')) {
        const pathSegments = options.path.split('/');
        const lessonId = Number(pathSegments[pathSegments.length - 2]);
        return decode(options, {
          lesson_id: lessonId,
          completed: true,
          completed_at: '2026-07-27T00:00:00Z',
        });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };

    await renderPage(request);
    const actions = await screen.findAllByRole('button', { name: 'Mark complete' });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(actions[0]!);
      await Promise.resolve();
    });
    const feedbackSlot =
      screen.getByText('Lesson marked complete.').parentElement?.parentElement?.parentElement;
    const feedbackNotice = screen.getByText('Lesson marked complete.').closest('[role="status"]');
    expect(feedbackSlot?.getAttribute('data-feedback-state')).toBe('visible');
    expect(feedbackNotice).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(3900);
      fireEvent.click(actions[1]!);
      await Promise.resolve();
    });
    expect(feedbackSlot?.getAttribute('data-feedback-state')).toBe('visible');
    expect(screen.getByText('Lesson marked complete.')).toBeTruthy();
    expect(screen.getByText('Lesson marked complete.').closest('[role="status"]')).toBe(
      feedbackNotice,
    );

    await act(async () => {
      vi.advanceTimersByTime(120);
    });
    expect(screen.getByText('Lesson marked complete.')).toBeTruthy();
    expect(feedbackSlot?.getAttribute('data-feedback-state')).toBe('visible');

    await act(async () => {
      vi.advanceTimersByTime(3880);
    });
    expect(feedbackSlot?.getAttribute('data-feedback-state')).toBe('exiting');
  });

  it('removes the exiting success immediately when reduced motion is preferred', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
      if (options.path.endsWith('/complete'))
        return decode(options, {
          lesson_id: 12,
          completed: true,
          completed_at: '2026-07-27T00:00:00Z',
        });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const action = await screen.findByRole('button', { name: 'Mark complete' });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(action);
      await Promise.resolve();
    });
    expect(screen.getByText('Lesson marked complete.')).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Lesson marked complete.')).toBeNull();
    expect(
      document.querySelector('[data-feedback-state]')?.getAttribute('data-feedback-state'),
    ).toBe('empty');
  });

  it('adopts the API-018 response as the known-incomplete row state', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            {
              id: 12,
              title: 'First lesson',
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
      if (options.path.endsWith('/complete'))
        return decode(options, {
          lesson_id: 12,
          completed: true,
          completed_at: '2026-07-26T00:00:00Z',
        });
      if (options.path.endsWith('/incomplete'))
        return decode(options, { lesson_id: 12, completed: false, completed_at: null });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const completeAction = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => {
      await user.click(completeAction);
    });
    await screen.findByRole('button', { name: 'Mark incomplete' });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Mark incomplete' }));
    });
    await waitFor(() => expect(screen.getByText('Not completed')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
  });

  it('rolls a failed first completion back to the explicit unknown state', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            {
              id: 12,
              title: 'First lesson',
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
      if (options.path === '/courses/7/lessons/12/complete')
        throw new ApiError({ kind: 'server', status: 500, message: 'private detail' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const action = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => {
      await user.click(action);
    });
    await waitFor(() =>
      expect(screen.getByText('Lesson progress could not be updated. Try again.')).toBeTruthy(),
    );
    expect(
      screen
        .getByText('Lesson progress could not be updated. Try again.')
        .closest('[data-tone]')
        ?.getAttribute('data-tone'),
    ).toBe('error');
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('Completion status unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
  });

  it('restores a known completed row when API-018 fails', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            {
              id: 12,
              title: 'First lesson',
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
      if (options.path.endsWith('/complete'))
        return decode(options, {
          lesson_id: 12,
          completed: true,
          completed_at: '2026-07-26T00:00:00Z',
        });
      if (options.path.endsWith('/incomplete'))
        throw new ApiError({ kind: 'server', status: 500, message: 'private' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const complete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => {
      await user.click(complete);
    });
    const incomplete = await screen.findByRole('button', { name: 'Mark incomplete' });
    await act(async () => {
      await user.click(incomplete);
    });
    await waitFor(() => expect(screen.getByText('Completed')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Mark incomplete' })).toBeTruthy();
  });

  it('restores a known not-completed row when a later API-017 attempt fails', async () => {
    let completeRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            {
              id: 12,
              title: 'First lesson',
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
      if (options.path.endsWith('/complete')) {
        completeRequests += 1;
        if (completeRequests === 2)
          throw new ApiError({ kind: 'server', status: 500, message: 'private' });
        return decode(options, {
          lesson_id: 12,
          completed: true,
          completed_at: '2026-07-26T00:00:00Z',
        });
      }
      if (options.path.endsWith('/incomplete'))
        return decode(options, { lesson_id: 12, completed: false, completed_at: null });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const firstComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => {
      await user.click(firstComplete);
    });
    const markIncomplete = await screen.findByRole('button', { name: 'Mark incomplete' });
    await act(async () => {
      await user.click(markIncomplete);
    });
    await screen.findByText('Not completed');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Mark complete' }));
    });
    await screen.findByText('Lesson progress could not be updated. Try again.');
    expect(screen.getByText('Not completed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
  });

  it.each([
    { operation: 'API-017', action: 'complete' },
    { operation: 'API-018', action: 'incomplete' },
  ] as const)(
    'makes $operation 403 neutral and suppresses further lesson actions',
    async ({ action }) => {
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
        if (options.path === '/courses/7/progress')
          return decode(options, {
            course_id: 7,
            completed_lessons: 0,
            total_lessons: 1,
            progress_percentage: 0,
          });
        if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
        if (options.path.endsWith('/complete') && action === 'incomplete')
          return decode(options, {
            lesson_id: 12,
            completed: true,
            completed_at: '2026-07-26T00:00:00Z',
          });
        if (options.path.endsWith(`/${action}`))
          throw new ApiError({
            kind: 'forbidden',
            status: 403,
            message: 'private mutation detail',
          });
        throw new Error(`Unexpected request ${options.path}`);
      };
      await renderPage(request);
      const user = userEvent.setup();
      const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
      await act(async () => {
        await user.click(markComplete);
      });
      if (action === 'incomplete') {
        const markIncomplete = await screen.findByRole('button', { name: 'Mark incomplete' });
        await act(async () => {
          await user.click(markIncomplete);
        });
      }
      expect(
        await screen.findByRole('heading', { name: 'Learning workspace unavailable' }),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: /mark|try again/i })).toBeNull();
      expect(screen.queryByText('private mutation detail')).toBeNull();
    },
  );

  it.each(['invalid_response', 'offline'] as const)(
    'treats a %s mutation result as uncertain and reconciles its exact origin',
    async (kind) => {
      const queryClient = createAppQueryClient();
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      const request: ApiClient['request'] = async <TResponse, TBody>(
        options: ApiRequestOptions<TBody, TResponse>,
      ) => {
        if (options.path === '/me') return decode(options, student);
        if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
        if (options.path === '/courses/7/progress')
          return decode(options, {
            course_id: 7,
            completed_lessons: 0,
            total_lessons: 1,
            progress_percentage: 0,
          });
        if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
        if (options.path.endsWith('/complete'))
          throw new ApiError({ kind, status: null, message: 'private mutation detail' });
        throw new Error(`Unexpected request ${options.path}`);
      };
      await renderPage(request, { queryClient });
      const user = userEvent.setup();
      const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
      await act(async () => {
        await user.click(markComplete);
      });
      expect(
        await screen.findByText(
          'We could not confirm the lesson update. Progress is being refreshed.',
        ),
      ).toBeTruthy();
      expect(screen.getByText('Completion status unavailable')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
      expect(screen.queryByText('private mutation detail')).toBeNull();
      await waitFor(() =>
        expect(invalidate).toHaveBeenCalledWith({
          queryKey: ['private', expect.any(String), 'API-019', 'learning:course:7:progress'],
          exact: true,
        }),
      );
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['private', expect.any(String), 'API-022', 'learning:enrollment:4'],
        exact: true,
      });
    },
  );

  it('keeps an aborted mutation silent and restores its exact snapshot', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
      if (options.path.endsWith('/complete'))
        throw new ApiError({ kind: 'aborted', status: null, message: 'private abort detail' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => {
      await user.click(markComplete);
    });
    await waitFor(() => expect(screen.getByText('Completion status unavailable')).toBeTruthy());
    expect(
      screen.queryByText(/could not confirm|could not be updated|private abort detail/i),
    ).toBeNull();
  });

  it('reconciles an uncertain immutable origin without projecting it into a newer route', async () => {
    let rejectCompletion: ((reason?: unknown) => void) | undefined;
    const completion = new Promise<unknown>((_resolve, reject) => {
      rejectCompletion = reject;
    });
    const queryClient = createAppQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/enrollments/5')
        return decode(options, {
          ...activeEnrollment,
          id: 5,
          course_id: 8,
          course: { ...activeEnrollment.course, id: 8, title: 'Second workspace' },
        });
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/8/progress')
        return decode(options, {
          course_id: 8,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons' || options.path === '/courses/8/lessons')
        return decode(options, oneLessonOutline);
      if (options.path === '/courses/7/lessons/12/complete')
        return decode(options, await completion);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, { queryClient, routeChange: true });
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => {
      await user.click(markComplete);
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Open workspace 5' }));
    });
    await screen.findByRole('heading', { name: 'Second workspace' });
    await act(async () => {
      rejectCompletion?.(
        new ApiError({
          kind: 'invalid_response',
          status: null,
          message: 'private invalid response',
        }),
      );
    });
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['private', expect.any(String), 'API-019', 'learning:course:7:progress'],
        exact: true,
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['private', expect.any(String), 'API-022', 'learning:enrollment:4'],
      exact: true,
    });
    expect(screen.getByText('Completion status unavailable')).toBeTruthy();
    expect(screen.queryByText(/could not confirm|private invalid response/i)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Learning workspace unavailable' })).toBeNull();
  });

  it('keeps a late mutation success out of a new route and invalidates only its immutable origin', async () => {
    let resolveCompletion: ((value: unknown) => void) | undefined;
    const completion = new Promise<unknown>((resolve) => {
      resolveCompletion = resolve;
    });
    const queryClient = createAppQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/enrollments/5')
        return decode(options, {
          ...activeEnrollment,
          id: 5,
          course_id: 8,
          course: { ...activeEnrollment.course, id: 8, title: 'Second workspace' },
        });
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/8/progress')
        return decode(options, {
          course_id: 8,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons' || options.path === '/courses/8/lessons')
        return decode(options, {
          items: [
            {
              id: 12,
              title: 'Shared lesson id',
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
      if (options.path === '/courses/7/lessons/12/complete')
        return decode(options, await completion);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, { queryClient, routeChange: true });
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => {
      await user.click(markComplete);
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Open workspace 5' }));
    });
    await screen.findByRole('heading', { name: 'Second workspace' });
    await act(async () => {
      resolveCompletion?.({ lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
    });
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['private', expect.any(String), 'API-022', 'learning:enrollment:4'],
        exact: true,
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['private', expect.any(String), 'API-019', 'learning:course:7:progress'],
      exact: true,
    });
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ['private', expect.any(String), 'API-022', 'learning:enrollment:5'],
      exact: true,
    });
    expect(screen.getByText('Completion status unavailable')).toBeTruthy();
    expect(screen.queryByText('Lesson marked complete.')).toBeNull();
  });

  it('keeps a late mutation error out of a replacement session subject', async () => {
    let rejectCompletion: ((reason?: unknown) => void) | undefined;
    const completion = new Promise<unknown>((_resolve, reject) => {
      rejectCompletion = reject;
    });
    let profileRequests = 0;
    let storedToken: string | null = 'student-token';
    const store: AccessTokenStore = {
      get: () => storedToken,
      set: (value) => {
        storedToken = value;
      },
      clear: () => {
        storedToken = null;
      },
    };
    const replacementStudent = { ...student, email: 'replacement@example.test', name: 'Riley' };
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') {
        profileRequests += 1;
        return decode(options, profileRequests === 1 ? student : replacementStudent);
      }
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress')
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 1,
          progress_percentage: 0,
        });
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [
            {
              id: 12,
              title: 'First lesson',
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
      if (options.path === '/courses/7/lessons/12/complete')
        return decode(options, await completion);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, { sessionChange: true, store });
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => {
      await user.click(markComplete);
    });
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Change learner' }));
    });
    await waitFor(() => expect(profileRequests).toBe(2));
    await screen.findByText('Completion status unavailable');
    await act(async () => {
      rejectCompletion?.(new ApiError({ kind: 'server', status: 500, message: 'private' }));
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy());
    expect(screen.getByText('Completion status unavailable')).toBeTruthy();
    expect(screen.queryByText('Lesson progress could not be updated. Try again.')).toBeNull();
  });

  it('restores focus after enrollment-detail retry succeeds', async () => {
    let enrollmentRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') {
        enrollmentRequests += 1;
        if (enrollmentRequests === 1)
          throw new ApiError({ kind: 'server', status: 500, message: 'private' });
        return decode(options, { ...activeEnrollment, status: 'cancelled' });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await user.click(retry);
    });
    const heading = await screen.findByRole('heading', { name: activeEnrollment.course.title });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('does not let a later enrollment refresh move focus after the retry fails', async () => {
    let enrollmentRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') {
        enrollmentRequests += 1;
        if (enrollmentRequests < 3)
          throw new ApiError({ kind: 'server', status: 500, message: 'private enrollment' });
        return decode(options, { ...activeEnrollment, status: 'cancelled' });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    const queryClient = await renderPage(request);
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await user.click(retry);
    });
    await screen.findByRole('button', { name: 'Try again' });
    const sentinel = document.createElement('button');
    document.body.append(sentinel);
    sentinel.focus();
    await act(async () => {
      await queryClient.refetchQueries();
    });
    await screen.findByRole('heading', { name: activeEnrollment.course.title });
    expect(document.activeElement).toBe(sentinel);
    sentinel.remove();
  });

  it('does not let a pending enrollment retry focus after its workspace identity changes', async () => {
    let resolveRetry: (() => void) | undefined;
    const retryResponse = new Promise<void>((resolve) => {
      resolveRetry = resolve;
    });
    let enrollmentFourRequests = 0;
    const secondEnrollment = {
      ...activeEnrollment,
      id: 5,
      course_id: 8,
      course: { ...activeEnrollment.course, id: 8, title: 'Second workspace' },
    };
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') {
        enrollmentFourRequests += 1;
        if (enrollmentFourRequests === 1)
          throw new ApiError({ kind: 'server', status: 500, message: 'private enrollment' });
        await retryResponse;
        return decode(options, activeEnrollment);
      }
      if (options.path === '/enrollments/5') return decode(options, secondEnrollment);
      if (options.path === '/courses/8/progress')
        return decode(options, {
          course_id: 8,
          completed_lessons: 0,
          total_lessons: 0,
          progress_percentage: 0,
        });
      if (options.path === '/courses/8/lessons') return decode(options, oneLessonOutline);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, { routeChange: true });
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await user.click(retry);
    });
    await waitFor(() => expect(enrollmentFourRequests).toBe(2));
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Open workspace 5' }));
    });
    await screen.findByRole('heading', { name: 'Second workspace' });
    const sentinel = document.createElement('button');
    document.body.append(sentinel);
    sentinel.focus();
    await act(async () => {
      resolveRetry?.();
    });
    await waitFor(() => expect(document.activeElement).toBe(sentinel));
    sentinel.remove();
  });

  it('restores focus after progress and workspace retry succeeds', async () => {
    let progressRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(
      options: ApiRequestOptions<TBody, TResponse>,
    ) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') {
        progressRequests += 1;
        if (progressRequests === 1)
          throw new ApiError({ kind: 'server', status: 500, message: 'private' });
        return decode(options, {
          course_id: 7,
          completed_lessons: 0,
          total_lessons: 0,
          progress_percentage: 0,
        });
      }
      if (options.path === '/courses/7/lessons')
        return decode(options, {
          items: [],
          page: 1,
          page_size: 100,
          total: 0,
          pages: 0,
          has_next: false,
          has_previous: false,
        });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => {
      await user.click(retry);
    });
    const heading = await screen.findByRole('heading', { name: activeEnrollment.course.title });
    await screen.findByRole('heading', { name: 'Learning progress' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });
});
