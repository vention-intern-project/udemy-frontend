// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as LearningProgress from '../../src/features/learning-progress';
import { useLearningWorkspace } from '../../src/features/learning-progress';
import { SessionProvider } from '../../src/features/auth-session';
import { AiChatPage } from '../../src/pages/ai-chat-page';

vi.mock('../../src/features/learning-progress', async (importOriginal) => ({
  ...(await importOriginal<typeof LearningProgress>()),
  useLearningWorkspace: vi.fn(),
}));

const useLearningWorkspaceMock = vi.mocked(useLearningWorkspace);

const activeEnrollment = {
  id: 4,
  courseId: 7,
  status: 'active',
  course: { title: 'Accessible progress course' },
};

function workspaceFor(enrollment: Record<string, unknown>) {
  return { enrollment } as unknown as ReturnType<typeof useLearningWorkspace>;
}

function renderPage(path = '/learning/enrollments/4/ai-chat') {
  return render(
    <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/learning/enrollments/:enrollmentId/ai-chat" element={<AiChatPage />} />
          <Route path="/ai-chat" element={<AiChatPage />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  );
}

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe('AiChatPage eligibility states', () => {
  it('renders loading before unavailable guards during the initial enrollment request', () => {
    useLearningWorkspaceMock.mockReturnValue(
      workspaceFor({ isPending: true, isError: false, data: undefined }),
    );
    renderPage();
    expect(screen.getByLabelText('Loading course assistant')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Course assistant unavailable' })).toBeNull();
  });

  it.each([
    ['request error', { isPending: false, isError: true, data: undefined }],
    [
      'inactive enrollment',
      {
        isPending: false,
        isError: false,
        data: { ...activeEnrollment, status: 'pending_payment' },
      },
    ],
  ])('renders truthful non-detail unavailability for %s', (_label, enrollment) => {
    useLearningWorkspaceMock.mockReturnValue(workspaceFor(enrollment));
    renderPage();
    expect(screen.getByRole('heading', { name: 'Course assistant unavailable' })).toBeTruthy();
    expect(screen.queryByText(/backend|detail/i)).toBeNull();
  });

  it('renders the chat only for the active enrollment', () => {
    useLearningWorkspaceMock.mockReturnValue(
      workspaceFor({ isPending: false, isError: false, data: activeEnrollment }),
    );
    renderPage();
    expect(screen.getByRole('heading', { name: 'BETA AI Learning Assistant' })).toBeTruthy();
    expect(screen.getByText('Course Assistant')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Message the course assistant' })).toBeTruthy();
  });

  it('uses the decorative image only for the full-page assistant hero', () => {
    useLearningWorkspaceMock.mockReturnValue(
      workspaceFor({ isPending: false, isError: false, data: activeEnrollment }),
    );
    const { container } = renderPage();

    const heroImage = container.querySelector<HTMLImageElement>('[data-part="ai-chat-hero-image"]');
    expect(heroImage).toBeTruthy();
    expect(heroImage?.src).toContain('ai-chat-hero-ui020');
    expect(heroImage?.alt).toBe('');
    expect(heroImage?.getAttribute('aria-hidden')).toBe('true');
  });

  it.each([
    '/learning/enrollments/abc/ai-chat',
    '/learning/enrollments/0/ai-chat',
    '/learning/enrollments/-1/ai-chat',
    '/learning/enrollments/1.5/ai-chat',
    '/learning/enrollments/9007199254740992/ai-chat',
    '/learning/enrollments/999999999999999999999999/ai-chat',
  ])('renders an invalid route state without mounting a course workspace for %s', (path) => {
    renderPage(path);

    expect(screen.getByRole('heading', { name: 'Invalid course assistant address' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Message the course assistant' })).toBeNull();
    expect(useLearningWorkspaceMock).not.toHaveBeenCalled();
  });

  it('mounts the course workspace for the largest safe enrollment ID', () => {
    const largestSafeEnrollmentId = 9007199254740991;
    useLearningWorkspaceMock.mockReturnValue(
      workspaceFor({
        isPending: false,
        isError: false,
        data: { ...activeEnrollment, id: largestSafeEnrollmentId },
      }),
    );

    renderPage(`/learning/enrollments/${largestSafeEnrollmentId}/ai-chat`);

    expect(screen.getByText('Course Assistant')).toBeTruthy();
    expect(useLearningWorkspaceMock).toHaveBeenCalledWith(largestSafeEnrollmentId, {
      reducedMotion: false,
    });
  });

  it('autofocuses the full-page chat composer', () => {
    useLearningWorkspaceMock.mockReturnValue(
      workspaceFor({ isPending: false, isError: false, data: activeEnrollment }),
    );
    renderPage();
    expect(document.activeElement).toBe(
      screen.getByRole('textbox', { name: 'Message the course assistant' }),
    );
  });

  it('focuses the general assistant composer after choosing any suggested action', () => {
    useLearningWorkspaceMock.mockReturnValue(
      workspaceFor({ isPending: false, isError: false, data: activeEnrollment }),
    );
    renderPage('/ai-chat');

    const input = screen.getByRole('textbox', {
      name: 'Message the course assistant',
    }) as HTMLTextAreaElement;
    const suggestedActions = [
      ['Recommend a course', 'Recommend a course based on my learning goals.'],
      ['Explain a concept', 'Explain a concept I am learning in simple terms.'],
      ['Quiz me', 'Quiz me on the course material I am learning.'],
    ] as const;

    for (const [label, prompt] of suggestedActions) {
      const action = screen.getByRole('button', { name: label });
      fireEvent.click(action);
      expect(document.activeElement).toBe(input);
      expect((input as HTMLTextAreaElement).value).toBe(prompt);
      expect(action.getAttribute('data-selected')).toBe('true');
      for (const [otherLabel] of suggestedActions.filter(([otherLabel]) => otherLabel !== label)) {
        expect(screen.getByRole('button', { name: otherLabel }).getAttribute('data-selected')).toBe(
          'false',
        );
      }
    }

    fireEvent.change(input, { target: { value: 'A custom question' } });
    for (const [label] of suggestedActions) {
      expect(screen.getByRole('button', { name: label }).getAttribute('data-selected')).toBe(
        'false',
      );
    }
  });

  it('keeps compact Suggested Actions collapsed until selection and never submits a prompt', () => {
    useLearningWorkspaceMock.mockReturnValue(
      workspaceFor({ isPending: false, isError: false, data: activeEnrollment }),
    );
    renderPage('/ai-chat');

    const input = screen.getByRole('textbox', { name: 'Message the course assistant' });
    const trigger = screen.getByRole('button', { name: 'Suggested Actions' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const compactPanelId = trigger.getAttribute('aria-controls');
    expect(compactPanelId).toBeTruthy();
    expect(document.getElementById(compactPanelId ?? '')).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const compactPanel = document.getElementById(compactPanelId ?? '');
    expect(compactPanel).toBeTruthy();
    fireEvent.click(
      within(compactPanel as HTMLElement).getByRole('button', { name: 'Recommend a course' }),
    );

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(compactPanelId ?? '')).toBeNull();
    expect(document.activeElement).toBe(input);
    expect((input as HTMLTextAreaElement).value).toBe(
      'Recommend a course based on my learning goals.',
    );
    expect(screen.queryByRole('button', { name: 'Send message' })).toBeTruthy();
  });

  it('reveals the compact composer only when a selected action leaves it offscreen', async () => {
    useLearningWorkspaceMock.mockReturnValue(
      workspaceFor({ isPending: false, isError: false, data: activeEnrollment }),
    );
    const originalClientHeight = Object.getOwnPropertyDescriptor(
      document.documentElement,
      'clientHeight',
    );
    const originalClientWidth = Object.getOwnPropertyDescriptor(
      document.documentElement,
      'clientWidth',
    );
    try {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
      Object.defineProperties(document.documentElement, {
        clientHeight: { configurable: true, value: 720 },
        clientWidth: { configurable: true, value: 320 },
      });
      renderPage('/ai-chat');

      const input = screen.getByRole('textbox', {
        name: 'Message the course assistant',
      }) as HTMLTextAreaElement;
      const scrollIntoView = vi.fn();
      Object.defineProperty(input, 'scrollIntoView', { configurable: true, value: scrollIntoView });
      let isPartiallyBelowViewport = false;
      vi.spyOn(input, 'getBoundingClientRect').mockImplementation(
        () =>
          ({
            bottom: isPartiallyBelowViewport ? 721 : 120,
            height: 40,
            left: 0,
            right: 320,
            top: isPartiallyBelowViewport ? 681 : 80,
            width: 320,
            x: 0,
            y: isPartiallyBelowViewport ? 681 : 80,
            toJSON: () => ({}),
          }) as DOMRect,
      );

      const trigger = screen.getByRole('button', { name: 'Suggested Actions' });
      fireEvent.click(trigger);
      const compactPanel = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
      fireEvent.click(
        within(compactPanel as HTMLElement).getByRole('button', { name: 'Recommend a course' }),
      );
      expect(scrollIntoView).not.toHaveBeenCalled();

      isPartiallyBelowViewport = true;
      fireEvent.click(trigger);
      const reopenedCompactPanel = document.getElementById(
        trigger.getAttribute('aria-controls') ?? '',
      );
      fireEvent.click(
        within(reopenedCompactPanel as HTMLElement).getByRole('button', {
          name: 'Explain a concept',
        }),
      );
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest',
      });
      expect(document.activeElement).toBe(input);
      expect((input as HTMLTextAreaElement).selectionStart).toBe(input.value.length);
      expect((input as HTMLTextAreaElement).selectionEnd).toBe(input.value.length);
    } finally {
      if (originalClientHeight)
        Object.defineProperty(document.documentElement, 'clientHeight', originalClientHeight);
      else delete (document.documentElement as { clientHeight?: number }).clientHeight;
      if (originalClientWidth)
        Object.defineProperty(document.documentElement, 'clientWidth', originalClientWidth);
      else delete (document.documentElement as { clientWidth?: number }).clientWidth;
    }
  });
});
