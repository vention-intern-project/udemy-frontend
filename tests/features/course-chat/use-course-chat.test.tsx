// @vitest-environment jsdom

import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionProvider } from '../../../src/features/auth-session';
import { requestCourseChat } from '../../../src/features/course-chat/api';
import { useCourseChat } from '../../../src/features/course-chat/useCourseChat';
import { CourseChatLauncher } from '../../../src/widgets/course-chat';
import { CourseChatPanel } from '../../../src/widgets/course-chat/CourseChatPanel';
import { ApiError } from '../../../src/shared/api';

vi.mock('../../../src/features/course-chat/api', () => ({ requestCourseChat: vi.fn() }));

const requestCourseChatMock = vi.mocked(requestCourseChat);

function sessionWrapper({ children }: { readonly children: ReactNode }) {
  return (
    <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
      {children}
    </SessionProvider>
  );
}

function launcher() {
  return (
    <MemoryRouter>
      <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
        <CourseChatLauncher
          assistant={{ context: { kind: 'course', courseId: 7 }, enrollmentId: 4 }}
        />
      </SessionProvider>
    </MemoryRouter>
  );
}

function GuestLauncherLocation() {
  const location = useLocation();
  return (
    <>
      <CourseChatLauncher assistant={null} guest />
      <output>{`${location.pathname}${location.search}`}</output>
    </>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

async function interact(action: () => Promise<void>) {
  await act(async () => {
    await action();
  });
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('course chat interaction lifecycle', () => {
  it('links the labelled launcher to a focus-available noninteractive description', () => {
    render(launcher());

    const launcherButton = screen.getByRole('button', { name: 'Open AI assistant' });
    const description = screen.getByRole('tooltip');
    launcherButton.focus();

    expect(launcherButton.getAttribute('aria-describedby')).toBe(description.id);
    expect(description.textContent).toBe('Open AI assistant');
    expect(document.activeElement).toBe(launcherButton);
  });

  it('guides a guest to register or log in and preserves the current page as the return target', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/?search_query=typescript']}>
        <GuestLauncherLocation />
      </MemoryRouter>,
    );

    await interact(() => user.click(screen.getByRole('button', { name: 'Open AI assistant' })));

    expect(screen.getByText('Create an account to use the AI learning assistant.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create an account' }).getAttribute('href')).toBe(
      '/signup?returnTo=%2F%3Fsearch_query%3Dtypescript',
    );
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe(
      '/login?returnTo=%2F%3Fsearch_query%3Dtypescript',
    );
  });

  it('prevents empty and duplicate submission, retains a thread across messages, and clears it after close', async () => {
    const first = deferred<{ thread_id: string; response: string }>();
    const second = deferred<{ thread_id: string; response: string }>();
    const third = deferred<{ thread_id: string; response: string }>();
    requestCourseChatMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);
    const user = userEvent.setup();
    render(launcher());

    await interact(() => user.click(screen.getByRole('button', { name: 'Open AI assistant' })));
    const input = screen.getByRole('textbox', { name: 'Message the course assistant' });
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    expect(requestCourseChatMock).not.toHaveBeenCalled();
    await interact(() => user.type(input, 'First question'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    expect(screen.getByRole('button', { name: 'Send message' })).toHaveProperty('disabled', true);
    expect(requestCourseChatMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      first.resolve({ thread_id: 'backend-thread', response: 'First response' });
      await first.promise;
    });
    await screen.findByText('First response');

    await interact(() =>
      user.type(
        screen.getByRole('textbox', { name: 'Message the course assistant' }),
        'Second question',
      ),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    await act(async () => {
      second.resolve({ thread_id: 'backend-thread', response: 'Second response' });
      await second.promise;
    });
    await screen.findByText('Second response');
    expect(requestCourseChatMock.mock.calls[1]?.[1]).toBe('backend-thread');

    await interact(() =>
      user.click(screen.getByRole('button', { name: 'Close course assistant' })),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Open AI assistant' }),
      ),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Open AI assistant' })));
    expect(screen.queryByText('First response')).toBeNull();
    await interact(() =>
      user.type(
        screen.getByRole('textbox', { name: 'Message the course assistant' }),
        'Fresh question',
      ),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    await act(async () => {
      third.resolve({ thread_id: 'new-thread', response: 'Fresh response' });
      await third.promise;
    });
    await screen.findByText('Fresh response');
    expect(requestCourseChatMock.mock.calls[2]?.[1]).not.toBe('backend-thread');
  });

  it('aborts its retained request controller when the mounted interaction unmounts', async () => {
    let signal: AbortSignal | undefined;
    requestCourseChatMock.mockImplementationOnce(
      (_session, _thread, _message, _context, nextSignal) => {
        signal = nextSignal;
        return new Promise(() => {});
      },
    );
    const { result, unmount } = renderHook(() => useCourseChat({ kind: 'course', courseId: 7 }), {
      wrapper: sessionWrapper,
    });

    act(() => {
      result.current.setDraft('Pending question');
    });
    act(() => {
      result.current.submit();
    });
    await waitFor(() => expect(signal).toBeDefined());
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('settles a response after the Strict Mode effect lifecycle replay', async () => {
    requestCourseChatMock.mockResolvedValueOnce({
      thread_id: 'strict-thread',
      response: 'Strict response',
    });
    const user = userEvent.setup();
    render(<StrictMode>{launcher()}</StrictMode>);

    await interact(() => user.click(screen.getByRole('button', { name: 'Open AI assistant' })));
    await interact(() =>
      user.type(
        screen.getByRole('textbox', { name: 'Message the course assistant' }),
        'Question after replay',
      ),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));

    await screen.findByText('Strict response');
    expect(requestCourseChatMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Sending…' })).toBeNull();
  });

  it.each([
    [401, 'Sign in required'],
    [403, 'Assistant unavailable'],
    [404, 'Assistant unavailable'],
    [422, 'Message needs checking'],
    [500, 'Couldn’t generate a response.'],
    [503, 'Assistant temporarily unavailable'],
  ])('maps status %s to non-detail feedback with one request', async (status, title) => {
    const request = deferred<{ thread_id: string; response: string }>();
    requestCourseChatMock.mockReturnValueOnce(request.promise);
    const failure = new ApiError({
      kind: status === 422 ? 'validation' : 'http',
      status,
      message: 'private backend detail',
    });
    const user = userEvent.setup();
    render(
      <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
        <CourseChatPanel context={{ kind: 'course', courseId: 7 }} />
      </SessionProvider>,
    );
    await interact(() =>
      user.type(screen.getByRole('textbox', { name: 'Message the course assistant' }), 'Question'),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    await act(async () => {
      request.reject(failure);
      await request.promise.catch(() => undefined);
    });
    await screen.findByText(title);
    expect(requestCourseChatMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('private backend detail')).toBeNull();
  });

  it('uses context-agnostic unavailable copy for the general assistant', async () => {
    const request = deferred<{ thread_id: string; response: string }>();
    requestCourseChatMock.mockReturnValueOnce(request.promise);
    const user = userEvent.setup();
    render(
      <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
        <CourseChatPanel context={{ kind: 'general' }} />
      </SessionProvider>,
    );
    await interact(() =>
      user.type(screen.getByRole('textbox', { name: 'Message the course assistant' }), 'Question'),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    await act(async () => {
      request.reject(new ApiError({ kind: 'http', status: 403, message: 'private backend detail' }));
      await request.promise.catch(() => undefined);
    });
    await screen.findByText('Assistant unavailable');
    expect(screen.getByText('The assistant is unavailable.')).toBeTruthy();
  });

  it('keeps the message list at its bottom when an assistant response arrives', async () => {
    const response = deferred<{ thread_id: string; response: string }>();
    requestCourseChatMock.mockReturnValueOnce(response.promise);
    const user = userEvent.setup();
    render(
      <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
        <CourseChatPanel context={{ kind: 'course', courseId: 7 }} />
      </SessionProvider>,
    );
    const messages = document.querySelector('[aria-live="polite"]');
    if (messages === null) throw new Error('Message list was not rendered.');
    Object.defineProperties(messages, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 400 },
    });
    messages.scrollTop = 200;
    messages.dispatchEvent(new Event('scroll', { bubbles: true }));

    await interact(() =>
      user.type(screen.getByRole('textbox', { name: 'Message the course assistant' }), 'Question'),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    await act(async () => {
      response.resolve({ thread_id: 'thread', response: 'Assistant response' });
      await response.promise;
    });

    await screen.findByText('Assistant response');
    expect(messages.scrollTop).toBe(400);
  });
});
