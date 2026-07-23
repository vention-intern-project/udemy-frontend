import { BrowserRouter } from 'react-router-dom';

import { SessionProvider } from '../features/auth-session';
import { ThemeProvider } from '../shared/ui/theme';
import { AppRouter, densityForPath, RouteErrorBoundary } from './router';
import { AppQueryProvider, SessionPrivateCacheLifecycle } from './query';
import './app.css';

export function App() {
  const initialDensityMode = densityForPath(globalThis.location?.pathname ?? '/');

  return (
    <AppQueryProvider>
      <ThemeProvider initialDensityMode={initialDensityMode}>
        <SessionProvider apiBaseUrl={import.meta.env.VITE_API_BASE_URL ?? ''}>
          <SessionPrivateCacheLifecycle />
          <BrowserRouter>
            <RouteErrorBoundary>
              <AppRouter />
            </RouteErrorBoundary>
          </BrowserRouter>
        </SessionProvider>
      </ThemeProvider>
    </AppQueryProvider>
  );
}
