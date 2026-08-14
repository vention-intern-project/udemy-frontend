// @vitest-environment jsdom

import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
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
    expect(launcherButton.getAttribute('aria-expanded')).toBe('false');
    expect(launcherButton.hasAttribute('aria-controls')).toBe(false);
    expect(description.textContent).toBe('Open AI assistant');
    expect(document.activeElement).toBe(launcherButton);
  });

  it('prevents empty and duplicate submission, and retains a conversation after Close', async () => {
    const first = deferred<{ thread_id: string; response: string }>();
    const second = deferred<{ thread_id: string; response: string }>();
    const third = deferred<{ thread_id: string; response: string }>();
    requestCourseChatMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);
    const user = userEvent.setup();
    render(launcher());

    const launcherButton = screen.getByRole('button', { name: 'Open AI assistant' });
    await interact(() => user.click(launcherButton));
    const widget = screen.getByRole('region', { name: 'Course assistant chat' });
    expect(launcherButton.getAttribute('aria-expanded')).toBe('true');
    expect(launcherButton.getAttribute('aria-controls')).toBe(widget.id);
    const actionTrigger = screen.getByRole('button', { name: 'Conversation actions' });
    expect(actionTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(actionTrigger.hasAttribute('aria-controls')).toBe(false);
    const input = screen.getByRole('textbox', { name: 'Message the course assistant' });
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
    await interact(() => user.type(input, '{Enter}'));
    expect(requestCourseChatMock).not.toHaveBeenCalled();
    await interact(() => user.type(input, 'First question'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
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
      user.type(
        screen.getByRole('textbox', { name: 'Message the course assistant' }),
        'Draft to keep',
      ),
    );

    await interact(() => user.click(actionTrigger));
    const actionMenu = document.querySelector<HTMLElement>('[data-part="mini-chat-action-menu"]');
    if (actionMenu === null) throw new Error('Expected the action menu to be visible.');
    expect(actionTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(actionTrigger.getAttribute('aria-controls')).toBe(actionMenu.id);

    await interact(() =>
      user.click(screen.getByRole('button', { name: 'Close course assistant' })),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Open AI assistant' }),
      ),
    );
    expect(launcherButton.getAttribute('aria-expanded')).toBe('false');
    expect(launcherButton.hasAttribute('aria-controls')).toBe(false);
    await interact(() => user.click(launcherButton));
    expect(
      screen.getByRole('button', { name: 'Conversation actions' }).getAttribute('aria-expanded'),
    ).toBe('false');
    expect(screen.queryByRole('button', { name: 'Clear chat' })).toBeNull();
    expect(screen.getByText('First response')).toBeTruthy();
    expect(
      (screen.getByRole('textbox', { name: 'Message the course assistant' }) as HTMLTextAreaElement)
        .value,
    ).toBe('Draft to keep');
    await interact(() =>
      user.clear(screen.getByRole('textbox', { name: 'Message the course assistant' })),
    );
    await interact(() =>
      user.type(
        screen.getByRole('textbox', { name: 'Message the course assistant' }),
        'Third question',
      ),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    await act(async () => {
      third.resolve({ thread_id: 'backend-thread', response: 'Third response' });
      await third.promise;
    });
    await screen.findByText('Third response');
    expect(requestCourseChatMock.mock.calls[2]?.[1]).toBe('backend-thread');
  });

  it('hides Send for whitespace and post-submit pending drafts in compact and full composers', async () => {
    const compactRequest = deferred<{ thread_id: string; response: string }>();
    const fullRequest = deferred<{ thread_id: string; response: string }>();
    requestCourseChatMock
      .mockReturnValueOnce(compactRequest.promise)
      .mockReturnValueOnce(fullRequest.promise);
    const user = userEvent.setup();

    render(launcher());
    await interact(() => user.click(screen.getByRole('button', { name: 'Open AI assistant' })));
    const compactInput = screen.getByRole('textbox', { name: 'Message the course assistant' });
    await interact(() => user.type(compactInput, '   '));
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
    await interact(() => user.type(compactInput, 'Compact question'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
    expect(requestCourseChatMock).toHaveBeenCalledTimes(1);

    cleanup();
    render(
      <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
        <CourseChatPanel context={{ kind: 'course', courseId: 7 }} />
      </SessionProvider>,
    );
    const fullInput = screen.getByRole('textbox', { name: 'Message the course assistant' });
    await interact(() => user.type(fullInput, '   '));
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
    await interact(() => user.type(fullInput, 'Full question'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Send message' })));
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeNull();
    expect(requestCourseChatMock).toHaveBeenCalledTimes(2);
  });

  it('aborts its retained request controller when the mounted interaction unmounts', async () => {
    let signal: AbortSignal | undefined;
    requestCourseChatMock.mockImplementationOnce(
      (_session, _thread, _message, _context, _attempt, nextSignal) => {
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

  it('ignores a stale local response while the post-reset request remains pending', async () => {
    const stale = deferred<{ thread_id: string; response: string }>();
    const current = deferred<{ thread_id: string; response: string }>();
    const followUp = deferred<{ thread_id: string; response: string }>();
    requestCourseChatMock
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(current.promise)
      .mockReturnValueOnce(followUp.promise);
    const { result } = renderHook(() => useCourseChat({ kind: 'course', courseId: 7 }), {
      wrapper: sessionWrapper,
    });

    act(() => result.current.setDraft('Request A'));
    act(() => result.current.submit());
    act(() => result.current.reset());
    act(() => result.current.setDraft('Request B'));
    act(() => result.current.submit());
    expect(requestCourseChatMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      stale.resolve({ thread_id: 'stale-thread', response: 'Stale response' });
      await stale.promise;
    });
    expect(result.current.pending).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.messages.map(({ author, text }) => ({ author, text }))).toEqual([
      { author: 'learner', text: 'Request B' },
    ]);

    act(() => result.current.setDraft('Blocked while B is pending'));
    act(() => result.current.submit());
    expect(requestCourseChatMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      current.resolve({ thread_id: 'current-thread', response: 'Current response' });
      await current.promise;
    });
    act(() => result.current.submit());
    expect(requestCourseChatMock).toHaveBeenCalledTimes(3);
    expect(requestCourseChatMock.mock.calls[2]?.[1]).toBe('current-thread');

    await act(async () => {
      followUp.resolve({ thread_id: 'current-thread', response: 'Follow-up response' });
      await followUp.promise;
    });
  });

  it('ignores a stale local rejection and finally while the post-reset request is pending', async () => {
    const stale = deferred<{ thread_id: string; response: string }>();
    const current = deferred<{ thread_id: string; response: string }>();
    requestCourseChatMock.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise);
    const { result } = renderHook(() => useCourseChat({ kind: 'course', courseId: 7 }), {
      wrapper: sessionWrapper,
    });

    act(() => result.current.setDraft('Request A'));
    act(() => result.current.submit());
    act(() => result.current.reset());
    act(() => result.current.setDraft('Request B'));
    act(() => result.current.submit());
    expect(requestCourseChatMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      stale.reject(new ApiError({ kind: 'http', status: 500, message: 'Stale failure' }));
      await stale.promise.catch(() => undefined);
    });
    expect(result.current.pending).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.messages.map(({ author, text }) => ({ author, text }))).toEqual([
      { author: 'learner', text: 'Request B' },
    ]);

    act(() => result.current.setDraft('Blocked while B is pending'));
    act(() => result.current.submit());
    expect(requestCourseChatMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      current.resolve({ thread_id: 'current-thread', response: 'Current response' });
      await current.promise;
    });
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
      request.reject(
        new ApiError({ kind: 'http', status: 403, message: 'private backend detail' }),
      );
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
