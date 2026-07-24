import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

interface AppQueryProviderProps {
  readonly children: ReactNode;
}

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export const appQueryClient = createAppQueryClient();

export function AppQueryProvider({ children }: AppQueryProviderProps) {
  return <QueryClientProvider client={appQueryClient}>{children}</QueryClientProvider>;
}
