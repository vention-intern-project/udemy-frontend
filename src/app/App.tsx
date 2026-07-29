import { BrowserRouter } from 'react-router-dom';

import { SessionProvider } from '../features/auth-session';
import { CourseChatSessionProvider } from '../features/course-chat';
import { ThemeProvider } from '../shared/ui/theme';
import { ApplicationTitleBoundary, AppRouter, densityForPath } from './router';
import { AppQueryProvider, SessionPrivateCacheLifecycle } from './query';
import './app.css';

export function App() {
  const initialDensityMode = densityForPath(globalThis.location?.pathname ?? '/');

  return (
    <AppQueryProvider>
      <ThemeProvider initialDensityMode={initialDensityMode}>
        <SessionProvider apiBaseUrl={import.meta.env.VITE_API_BASE_URL ?? ''}>
          <CourseChatSessionProvider>
            <SessionPrivateCacheLifecycle />
            <BrowserRouter>
              <ApplicationTitleBoundary>
                <AppRouter />
              </ApplicationTitleBoundary>
            </BrowserRouter>
          </CourseChatSessionProvider>
        </SessionProvider>
      </ThemeProvider>
    </AppQueryProvider>
  );
}
