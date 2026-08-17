// @vitest-environment jsdom

import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, type ReactNode } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionProvider } from '../../../src/features/auth-session';
import { requestCourseChat } from '../../../src/features/course-chat/api';
import {
  CourseChatSessionProvider,
  useCourseChat,
} from '../../../src/features/course-chat/useCourseChat';
import { CourseChatLauncher } from '../../../src/widgets/course-chat';
import { CourseChatPanel } from '../../../src/widgets/course-chat/CourseChatPanel';
import { ApiError } from '../../../src/shared/api';

vi.mock('../../../src/features/course-chat/api', () => ({ requestCourseChat: vi.fn() }));
vi.mock('../../../src/features/course-chat/preview', () => ({
  isCourseChatPreviewEnabled: false,
  previewCourseChat: vi.fn(),
  previewMessages: () => [],
}));

const requestCourseChatMock = vi.mocked(requestCourseChat);

function sessionWrapper({ children }: { readonly children: ReactNode }) {
  return (
    <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
      <CourseChatSessionProvider>{children}</CourseChatSessionProvider>
    </SessionProvider>
  );
}

function launcher() {
  return (
    <MemoryRouter>
      <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
        <CourseChatSessionProvider>
          <CourseChatLauncher
            assistant={{ context: { kind: 'course', courseId: 7 }, enrollmentId: 4 }}
          />
        </CourseChatSessionProvider>
      </SessionProvider>
    </MemoryRouter>
  );
}

function launcherWithRouteTransition(destination: '/learning' | '/cart') {
  function RouteTransitionControl() {
    const navigate = useNavigate();
    return (
      <button type="button" onClick={() => navigate(destination)}>
        {destination === '/learning' ? 'Go to My learning' : 'Go to Cart'}
      </button>
    );
  }

  return (
    <MemoryRouter initialEntries={['/']}>
      <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
        <CourseChatSessionProvider>
          <RouteTransitionControl />
          <CourseChatLauncher
            assistant={{ context: { kind: 'course', courseId: 7 }, enrollmentId: 4 }}
          />
        </CourseChatSessionProvider>
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
  vi.unstubAllGlobals();
  document.querySelectorAll('[data-test-footer]').forEach((footer) => footer.remove());
});

function footerForGeometryTest() {
  const footer = document.createElement('footer');
  footer.dataset.testFooter = 'true';
  document.body.append(footer);
  return footer;
}

function geometryRect(top: number, bottom: number): DOMRect {
  return {
    x: 0,
    y: top,
    width: 60,
    height: bottom - top,
    top,
    right: 60,
    bottom,
    left: 0,
    toJSON: () => ({}),
  };
}

function flushGeometryFrames(frameCallbacks: FrameRequestCallback[]) {
  act(() => {
    for (let drains = 0; frameCallbacks.length > 0; drains += 1) {
      if (drains >= 10) throw new Error('Animation frames did not settle after 10 drains.');
      frameCallbacks.splice(0).forEach((callback) => callback(0));
    }
  });
}

interface DesktopMediaQueryMock {
  readonly mediaQuery: MediaQueryList;
  setMatches(matches: boolean): void;
}

function mockDesktopMediaQuery(initialMatches: boolean): DesktopMediaQueryMock {
  const changeListeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    matches: initialMatches,
    media: '(min-width: 768px)',
    onchange: null,
    addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'change' && typeof listener === 'function') changeListeners.add(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'change' && typeof listener === 'function') changeListeners.delete(listener);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery),
  );

  return {
    mediaQuery,
    setMatches(matches: boolean) {
      Object.defineProperty(mediaQuery, 'matches', { configurable: true, value: matches });
      const event = { matches, media: mediaQuery.media } as MediaQueryListEvent;
      changeListeners.forEach((listener) => listener(event));
    },
  };
}

describe('course chat interaction lifecycle', () => {
  it('keeps footer collision work inactive below 768px and starts it only after desktop entry', () => {
    const media = mockDesktopMediaQuery(false);
    const requestAnimationFrame = vi.fn();
    const disconnectResizeObserver = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {
          disconnectResizeObserver();
        }
      },
    );
    footerForGeometryTest();

    render(launcher());
    const root = screen.getByLabelText('Course assistant');

    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(root.style.insetBlockEnd).toBe('');

    media.setMatches(true);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    media.setMatches(false);
    expect(disconnectResizeObserver).toHaveBeenCalledTimes(1);
    expect(root.style.insetBlockEnd).toBe('');
  });

  it('keeps a 16px visible-footer gap from the normal anchor and restores it at or beyond the gap', () => {
    mockDesktopMediaQuery(true);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const footer = footerForGeometryTest();
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(geometryRect(880, 1_100));

    render(launcher());
    const root = screen.getByLabelText('Course assistant');
    const rootRect = vi.spyOn(root, 'getBoundingClientRect');
    rootRect.mockReturnValue(geometryRect(760, 880));
    window.dispatchEvent(new Event('resize'));
    flushGeometryFrames(frameCallbacks);
    expect(root.style.insetBlockEnd).toBe('calc(var(--spacing-8) + 16px)');

    rootRect.mockReturnValue(geometryRect(744, 864));
    window.dispatchEvent(new Event('resize'));
    flushGeometryFrames(frameCallbacks);
    expect(root.style.insetBlockEnd).toBe('calc(var(--spacing-8) + 16px)');

    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(geometryRect(840, 1_020));
    window.dispatchEvent(new Event('resize'));
    flushGeometryFrames(frameCallbacks);
    expect(root.style.insetBlockEnd).toBe('calc(var(--spacing-8) + 56px)');

    rootRect.mockReturnValue(geometryRect(704, 824));
    window.dispatchEvent(new Event('resize'));
    flushGeometryFrames(frameCallbacks);
    expect(root.style.insetBlockEnd).toBe('calc(var(--spacing-8) + 56px)');

    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(geometryRect(896, 1_100));
    window.dispatchEvent(new Event('resize'));
    flushGeometryFrames(frameCallbacks);
    expect(root.style.insetBlockEnd).toBe('');
  });

  it.each([
    ['/learning', 'Go to My learning'],
    ['/cart', 'Go to Cart'],
  ] as const)(
    'clears stale Catalog footer clearance synchronously before %s geometry runs',
    async (destination, navigationLabel) => {
      mockDesktopMediaQuery(true);
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
      const frameCallbacks: FrameRequestCallback[] = [];
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        frameCallbacks.push(callback);
        return frameCallbacks.length;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
      const footer = footerForGeometryTest();
      vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(geometryRect(820, 1_020));

      const user = userEvent.setup();
      render(launcherWithRouteTransition(destination));
      const root = screen.getByLabelText('Course assistant');
      vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(geometryRect(760, 880));
      flushGeometryFrames(frameCallbacks);
      expect(root.style.insetBlockEnd).toBe('calc(var(--spacing-8) + 76px)');

      await interact(() => user.click(screen.getByRole('button', { name: navigationLabel })));
      expect(root.style.insetBlockEnd).toBe('');
      expect(frameCallbacks).toHaveLength(1);
    },
  );

  it('coalesces geometry updates and cancels pending work on unmount', () => {
    mockDesktopMediaQuery(true);
    const frameCallbacks: FrameRequestCallback[] = [];
    const cancelAnimationFrame = vi.fn();
    const disconnectResizeObserver = vi.fn();
    const resizeObservers: ResizeObserverCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeObservers.push(callback);
        }
        observe() {}
        disconnect() {
          disconnectResizeObserver();
        }
      },
    );
    const footer = footerForGeometryTest();
    vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue(geometryRect(950, 1_100));

    render(launcher());
    const root = screen.getByLabelText('Course assistant');
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(geometryRect(760, 880));
    flushGeometryFrames(frameCallbacks);

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    resizeObservers.forEach((callback) => callback([], {} as ResizeObserver));
    expect(frameCallbacks).toHaveLength(1);

    cleanup();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(disconnectResizeObserver).toHaveBeenCalledTimes(1);
  });

  it('requires CourseChatSessionProvider for useCourseChat', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(() =>
        renderHook(() => useCourseChat({ kind: 'course', courseId: 7 }), {
          wrapper: ({ children }: { readonly children: ReactNode }) => (
            <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
              {children}
            </SessionProvider>
          ),
        }),
      ).toThrow('CourseChatSessionProvider');
      expect(consoleErrorSpy.mock.calls.flat()).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('CourseChatSessionProvider') }),
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

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
    render(<CourseChatPanel context={{ kind: 'course', courseId: 7 }} />, {
      wrapper: sessionWrapper,
    });
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
    render(<CourseChatPanel context={{ kind: 'course', courseId: 7 }} />, {
      wrapper: sessionWrapper,
    });
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
    render(<CourseChatPanel context={{ kind: 'general' }} />, { wrapper: sessionWrapper });
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
    render(<CourseChatPanel context={{ kind: 'course', courseId: 7 }} />, {
      wrapper: sessionWrapper,
    });
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
