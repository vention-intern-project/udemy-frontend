// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
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
  render(
    <SessionProvider tokenStore={{ get: () => null, set: () => true, clear: () => {} }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/learning/enrollments/:enrollmentId/ai-chat" element={<AiChatPage />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  );
}

afterEach(() => {
  vi.resetAllMocks();
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

  it('does not autofocus the full-page chat composer', () => {
    useLearningWorkspaceMock.mockReturnValue(
      workspaceFor({ isPending: false, isError: false, data: activeEnrollment }),
    );
    renderPage();
    expect(document.activeElement).not.toBe(
      screen.getByRole('textbox', { name: 'Message the course assistant' }),
    );
  });
});
