// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import { SessionProvider, useSession, type AccessTokenStore } from '../../src/features/auth-session';
import { learningCourseProgressQueryKey, learningDetailQueryKey } from '../../src/features/learning-progress';
import { LearningDetailPage } from '../../src/pages/learning-detail-page';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => cleanup());

const student = { email: 'student@example.test', name: 'Sam', surname: 'Student', role: 'student', birthday: null, phone_number: null, created_at: '2026-01-01T00:00:00Z' };
const activeEnrollment = { id: 4, user_id: 1, course_id: 7, status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', course: { id: 7, title: 'Accessible progress course', description: null, price: '0.00', currency: 'USD' } };
const oneLessonOutline = { items: [{ id: 12, title: 'First lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false };

function tokenStore(): AccessTokenStore { return { get: () => 'student-token', set: () => {}, clear: () => {} }; }
function decode<TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>, value: unknown): TResponse { return options.decode ? options.decode(value) : value as TResponse; }

interface DetailHarnessOptions {
  readonly queryClient?: QueryClient;
  readonly sessionChange?: boolean;
  readonly routeChange?: boolean;
  readonly store?: AccessTokenStore;
}

function DetailHarnessControls({ routeChange, sessionChange }: DetailHarnessOptions) {
  const navigate = useNavigate();
  const session = useSession();
  return <>
    {routeChange ? <button type="button" onClick={() => navigate('/learning/enrollments/5')}>Open workspace 5</button> : null}
    {sessionChange ? <button type="button" onClick={() => session.acceptAccessToken('replacement-token')}>Change learner</button> : null}
  </>;
}

async function renderPage(request: ApiClient['request'], options: DetailHarnessOptions = {}) {
  const queryClient = options.queryClient ?? createAppQueryClient();
  await act(async () => {
    render(<QueryClientProvider client={queryClient}><SessionProvider client={{ request }} tokenStore={options.store ?? tokenStore()}><MemoryRouter initialEntries={['/learning/enrollments/4']}><DetailHarnessControls {...options} /><Routes><Route path="/learning/enrollments/:enrollmentId" element={<LearningDetailPage />} /></Routes></MemoryRouter></SessionProvider></QueryClientProvider>);
  });
  return queryClient;
}

describe('LearningDetailPage', () => {
  it('uses singular lesson wording in the visible and accessible progress projections', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, { items: [{ id: 12, title: 'First lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    expect(await screen.findByText('0 of 1 lesson completed')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: '0 of 1 lesson completed, 0%' })).toBeTruthy();
  });

  it('starts each active lesson as explicitly unknown despite nonzero aggregate progress', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 1, total_lessons: 2, progress_percentage: 50 });
      if (options.path === '/courses/7/lessons') return decode(options, { items: [{ id: 12, title: 'First lesson', lesson_type: 'video', download_url: '/media/private.mp4', description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    expect(await screen.findByText('Completion status unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
    expect(screen.queryByText('/media/private.mp4')).toBeNull();
    expect(screen.queryByRole('link', { name: /download/i })).toBeNull();
  });

  it.each(['cancelled', 'pending_payment'] as const)('does not issue progress or lesson requests for a %s enrollment', async (status) => {
    const rawRequest = vi.fn(async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, { ...activeEnrollment, status });
      throw new Error(`Unexpected request ${options.path}`);
    });
    await renderPage(rawRequest as ApiClient['request']);
    expect(await screen.findByText('Learning progress is not available for this enrollment.')).toBeTruthy();
    expect(rawRequest.mock.calls.map(([options]) => options.path)).not.toContain('/courses/7/progress');
    expect(rawRequest.mock.calls.map(([options]) => options.path)).not.toContain('/courses/7/lessons');
    expect(screen.queryByRole('button', { name: /mark/i })).toBeNull();
  });

  it.each([403, 404])('renders a neutral no-action state when progress returns %i for an active enrollment', async (status) => {
    const rawRequest = vi.fn(async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') throw new ApiError({ kind: 'forbidden', status, message: 'private backend text' });
      if (options.path === '/courses/7/lessons') return decode(options, { items: [], page: 1, page_size: 100, total: 0, pages: 0, has_next: false, has_previous: false });
      throw new Error(`Unexpected request ${options.path}`);
    });
    await renderPage(rawRequest as ApiClient['request']);
    expect(await screen.findByRole('heading', { name: 'Learning workspace unavailable' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /mark|try again/i })).toBeNull();
    expect(screen.queryByText('private backend text')).toBeNull();
  });

  it.each([403, 404])('renders the same neutral no-action state when API-022 returns %i', async (status) => {
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') throw new ApiError({ kind: 'forbidden', status, message: 'private backend text' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    expect(await screen.findByRole('heading', { name: 'Learning workspace unavailable' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /mark|try again/i })).toBeNull();
    expect(screen.queryByText('private backend text')).toBeNull();
  });

  it('prioritizes a progress failure over a pending lesson outline', async () => {
    let rejectProgress: ((reason?: unknown) => void) | undefined;
    const progress = new Promise<unknown>((_resolve, reject) => { rejectProgress = reject; });
    const outline = new Promise<unknown>(() => {});
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, await progress);
      if (options.path === '/courses/7/lessons') return decode(options, await outline);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    await screen.findByRole('status', { name: 'Loading learning progress' });
    await act(async () => { rejectProgress?.(new ApiError({ kind: 'server', status: 500, message: 'private progress detail' })); });
    expect(await screen.findByText('Learning progress is unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByLabelText('Loading learning progress')).toBeNull();
  });

  it('prioritizes a lesson-outline failure over pending progress', async () => {
    let rejectOutline: ((reason?: unknown) => void) | undefined;
    const progress = new Promise<unknown>(() => {});
    const outline = new Promise<unknown>((_resolve, reject) => { rejectOutline = reject; });
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, await progress);
      if (options.path === '/courses/7/lessons') return decode(options, await outline);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    await screen.findByRole('status', { name: 'Loading learning progress' });
    await act(async () => { rejectOutline?.(new ApiError({ kind: 'server', status: 500, message: 'private outline detail' })); });
    expect(await screen.findByText('Learning progress is unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.queryByLabelText('Loading learning progress')).toBeNull();
  });

  it('deduplicates a pending lesson completion and adopts its successful response', async () => {
    let completeRequests = 0;
    let resolveCompletion: ((value: unknown) => void) | undefined;
    const completion = new Promise<unknown>((resolve) => { resolveCompletion = resolve; });
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, { items: [{ id: 12, title: 'First lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
      if (options.path === '/courses/7/lessons/12/complete') { completeRequests += 1; return decode(options, await completion); }
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const action = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(action); await user.click(action); });
    expect(completeRequests).toBe(1);
    await act(async () => { resolveCompletion?.({ lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' }); });
    await waitFor(() => expect(screen.getByText('Completed')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Mark incomplete' })).toBeTruthy();
  });

  it('adopts the API-018 response as the known-incomplete row state', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, { items: [{ id: 12, title: 'First lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
      if (options.path.endsWith('/complete')) return decode(options, { lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
      if (options.path.endsWith('/incomplete')) return decode(options, { lesson_id: 12, completed: false, completed_at: null });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const completeAction = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(completeAction); });
    await screen.findByRole('button', { name: 'Mark incomplete' });
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Mark incomplete' })); });
    await waitFor(() => expect(screen.getByText('Not completed')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
  });

  it('rolls a failed first completion back to the explicit unknown state', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, { items: [{ id: 12, title: 'First lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
      if (options.path === '/courses/7/lessons/12/complete') throw new ApiError({ kind: 'server', status: 500, message: 'private detail' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const action = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(action); });
    await waitFor(() => expect(screen.getByText('Lesson progress could not be updated. Try again.')).toBeTruthy());
    expect(screen.getByText('Lesson progress could not be updated. Try again.').closest('[data-tone]')?.getAttribute('data-tone')).toBe('error');
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('Completion status unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
  });

  it('restores a known completed row when API-018 fails', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, { items: [{ id: 12, title: 'First lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
      if (options.path.endsWith('/complete')) return decode(options, { lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
      if (options.path.endsWith('/incomplete')) throw new ApiError({ kind: 'server', status: 500, message: 'private' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const complete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(complete); });
    const incomplete = await screen.findByRole('button', { name: 'Mark incomplete' });
    await act(async () => { await user.click(incomplete); });
    await waitFor(() => expect(screen.getByText('Completed')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Mark incomplete' })).toBeTruthy();
  });

  it('restores a known not-completed row when a later API-017 attempt fails', async () => {
    let completeRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, { items: [{ id: 12, title: 'First lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
      if (options.path.endsWith('/complete')) {
        completeRequests += 1;
        if (completeRequests === 2) throw new ApiError({ kind: 'server', status: 500, message: 'private' });
        return decode(options, { lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
      }
      if (options.path.endsWith('/incomplete')) return decode(options, { lesson_id: 12, completed: false, completed_at: null });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const firstComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(firstComplete); });
    const markIncomplete = await screen.findByRole('button', { name: 'Mark incomplete' });
    await act(async () => { await user.click(markIncomplete); });
    await screen.findByText('Not completed');
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Mark complete' })); });
    await screen.findByText('Lesson progress could not be updated. Try again.');
    expect(screen.getByText('Not completed')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
  });

  it.each([{ operation: 'API-017', action: 'complete' }, { operation: 'API-018', action: 'incomplete' }] as const)('makes $operation 403 neutral and suppresses further lesson actions', async ({ action }) => {
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
      if (options.path.endsWith('/complete') && action === 'incomplete') return decode(options, { lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' });
      if (options.path.endsWith(`/${action}`)) throw new ApiError({ kind: 'forbidden', status: 403, message: 'private mutation detail' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(markComplete); });
    if (action === 'incomplete') {
      const markIncomplete = await screen.findByRole('button', { name: 'Mark incomplete' });
      await act(async () => { await user.click(markIncomplete); });
    }
    expect(await screen.findByRole('heading', { name: 'Learning workspace unavailable' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /mark|try again/i })).toBeNull();
    expect(screen.queryByText('private mutation detail')).toBeNull();
  });

  it.each(['invalid_response', 'offline'] as const)('treats a %s mutation result as uncertain and reconciles its exact origin', async (kind) => {
    const queryClient = createAppQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
      if (options.path.endsWith('/complete')) throw new ApiError({ kind, status: null, message: 'private mutation detail' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, { queryClient });
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(markComplete); });
    expect(await screen.findByText('We could not confirm the lesson update. Progress is being refreshed.')).toBeTruthy();
    expect(screen.getByText('Completion status unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy();
    expect(screen.queryByText('private mutation detail')).toBeNull();
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: learningCourseProgressQueryKey(student.email, 7), exact: true }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: learningDetailQueryKey(student.email, 4), exact: true });
  });

  it('keeps an aborted mutation silent and restores its exact snapshot', async () => {
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, oneLessonOutline);
      if (options.path.endsWith('/complete')) throw new ApiError({ kind: 'aborted', status: null, message: 'private abort detail' });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(markComplete); });
    await waitFor(() => expect(screen.getByText('Completion status unavailable')).toBeTruthy());
    expect(screen.queryByText(/could not confirm|could not be updated|private abort detail/i)).toBeNull();
  });

  it('reconciles an uncertain immutable origin without projecting it into a newer route', async () => {
    let rejectCompletion: ((reason?: unknown) => void) | undefined;
    const completion = new Promise<unknown>((_resolve, reject) => { rejectCompletion = reject; });
    const queryClient = createAppQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/enrollments/5') return decode(options, { ...activeEnrollment, id: 5, course_id: 8, course: { ...activeEnrollment.course, id: 8, title: 'Second workspace' } });
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/8/progress') return decode(options, { course_id: 8, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons' || options.path === '/courses/8/lessons') return decode(options, oneLessonOutline);
      if (options.path === '/courses/7/lessons/12/complete') return decode(options, await completion);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, { queryClient, routeChange: true });
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(markComplete); });
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Open workspace 5' })); });
    await screen.findByRole('heading', { name: 'Second workspace' });
    await act(async () => { rejectCompletion?.(new ApiError({ kind: 'invalid_response', status: null, message: 'private invalid response' })); });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: learningCourseProgressQueryKey(student.email, 7), exact: true }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: learningDetailQueryKey(student.email, 4), exact: true });
    expect(screen.getByText('Completion status unavailable')).toBeTruthy();
    expect(screen.queryByText(/could not confirm|private invalid response/i)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Learning workspace unavailable' })).toBeNull();
  });

  it('keeps a late mutation success out of a new route and invalidates only its immutable origin', async () => {
    let resolveCompletion: ((value: unknown) => void) | undefined;
    const completion = new Promise<unknown>((resolve) => { resolveCompletion = resolve; });
    const queryClient = createAppQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/enrollments/5') return decode(options, { ...activeEnrollment, id: 5, course_id: 8, course: { ...activeEnrollment.course, id: 8, title: 'Second workspace' } });
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/8/progress') return decode(options, { course_id: 8, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons' || options.path === '/courses/8/lessons') return decode(options, { items: [{ id: 12, title: 'Shared lesson id', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
      if (options.path === '/courses/7/lessons/12/complete') return decode(options, await completion);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, { queryClient, routeChange: true });
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(markComplete); });
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Open workspace 5' })); });
    await screen.findByRole('heading', { name: 'Second workspace' });
    await act(async () => { resolveCompletion?.({ lesson_id: 12, completed: true, completed_at: '2026-07-26T00:00:00Z' }); });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: learningDetailQueryKey(student.email, 4), exact: true }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: learningCourseProgressQueryKey(student.email, 7), exact: true });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: learningDetailQueryKey(student.email, 5), exact: true });
    expect(screen.getByText('Completion status unavailable')).toBeTruthy();
    expect(screen.queryByText('Lesson marked complete.')).toBeNull();
  });

  it('keeps a late mutation error out of a replacement session subject', async () => {
    let rejectCompletion: ((reason?: unknown) => void) | undefined;
    const completion = new Promise<unknown>((_resolve, reject) => { rejectCompletion = reject; });
    let profileRequests = 0;
    let storedToken: string | null = 'student-token';
    const store: AccessTokenStore = { get: () => storedToken, set: (value) => { storedToken = value; }, clear: () => { storedToken = null; } };
    const replacementStudent = { ...student, email: 'replacement@example.test', name: 'Riley' };
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') { profileRequests += 1; return decode(options, profileRequests === 1 ? student : replacementStudent); }
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 1, progress_percentage: 0 });
      if (options.path === '/courses/7/lessons') return decode(options, { items: [{ id: 12, title: 'First lesson', lesson_type: 'text', download_url: null, description: null, is_published: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }], page: 1, page_size: 100, total: 1, pages: 1, has_next: false, has_previous: false });
      if (options.path === '/courses/7/lessons/12/complete') return decode(options, await completion);
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request, { sessionChange: true, store });
    const user = userEvent.setup();
    const markComplete = await screen.findByRole('button', { name: 'Mark complete' });
    await act(async () => { await user.click(markComplete); });
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Change learner' })); });
    await waitFor(() => expect(profileRequests).toBe(2));
    await screen.findByText('Completion status unavailable');
    await act(async () => { rejectCompletion?.(new ApiError({ kind: 'server', status: 500, message: 'private' })); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark complete' })).toBeTruthy());
    expect(screen.getByText('Completion status unavailable')).toBeTruthy();
    expect(screen.queryByText('Lesson progress could not be updated. Try again.')).toBeNull();
  });

  it('restores focus after enrollment-detail retry succeeds', async () => {
    let enrollmentRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') {
        enrollmentRequests += 1;
        if (enrollmentRequests === 1) throw new ApiError({ kind: 'server', status: 500, message: 'private' });
        return decode(options, { ...activeEnrollment, status: 'cancelled' });
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => { await user.click(retry); });
    const heading = await screen.findByRole('heading', { name: activeEnrollment.course.title });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('restores focus after progress and workspace retry succeeds', async () => {
    let progressRequests = 0;
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      if (options.path === '/me') return decode(options, student);
      if (options.path === '/enrollments/4') return decode(options, activeEnrollment);
      if (options.path === '/courses/7/progress') {
        progressRequests += 1;
        if (progressRequests === 1) throw new ApiError({ kind: 'server', status: 500, message: 'private' });
        return decode(options, { course_id: 7, completed_lessons: 0, total_lessons: 0, progress_percentage: 0 });
      }
      if (options.path === '/courses/7/lessons') return decode(options, { items: [], page: 1, page_size: 100, total: 0, pages: 0, has_next: false, has_previous: false });
      throw new Error(`Unexpected request ${options.path}`);
    };
    await renderPage(request);
    const user = userEvent.setup();
    const retry = await screen.findByRole('button', { name: 'Try again' });
    await act(async () => { await user.click(retry); });
    const heading = await screen.findByRole('heading', { name: activeEnrollment.course.title });
    await screen.findByRole('heading', { name: 'Learning progress' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });
});
