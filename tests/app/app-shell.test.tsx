// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppShell } from '../../src/app/layouts/AppShell';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import { cartQueryKey } from '../../src/features/cart-workflow';
import type { ApiClient, ApiRequestOptions } from '../../src/shared/api';
import { ThemeProvider } from '../../src/shared/ui/theme';

describe('AppShell cart cache consumer', () => {
  it('mounts without an API-002 cart request when no cart cache exists', () => {
    const client = new QueryClient();
    const request = vi.fn();
    render(<QueryClientProvider client={client}><ThemeProvider initialDensityMode="marketplace"><SessionProvider fetchImplementation={request}><MemoryRouter><AppShell /></MemoryRouter></SessionProvider></ThemeProvider></QueryClientProvider>);
    expect(screen.getByRole('link', { name: 'Browse courses' })).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });

  it('reacts to an existing authenticated cart cache without mounting API-002', async () => {
    const client = new QueryClient();
    const tokenStore: AccessTokenStore = { get: () => 'student-token', set() {}, clear() {} };
    const requestCalls = vi.fn();
    const request: ApiClient['request'] = async <TResponse, TBody>(options: ApiRequestOptions<TBody, TResponse>) => {
      requestCalls(options.path);
      if (options.path === '/me') {
        return options.decode?.({
          email: 'student@example.test', name: 'Sam', surname: 'Student', role: 'student',
          birthday: null, phone_number: null, created_at: '2026-01-01T00:00:00Z',
        }) as TResponse;
      }
      throw new Error(`Unexpected request ${options.path}`);
    };
    client.setQueryData(cartQueryKey('student@example.test'), {
      id: 1, items: [], totalPrice: '0.00', currency: 'USD', itemCount: 1,
    });
    render(<QueryClientProvider client={client}><ThemeProvider initialDensityMode="marketplace"><SessionProvider tokenStore={tokenStore} client={{ request }}><MemoryRouter><AppShell /></MemoryRouter></SessionProvider></ThemeProvider></QueryClientProvider>);
    expect(await screen.findByRole('link', { name: 'Cart (1)' })).toBeTruthy();
    client.setQueryData(cartQueryKey('student@example.test'), {
      id: 1, items: [], totalPrice: '0.00', currency: 'USD', itemCount: 2,
    });
    expect(await screen.findByRole('link', { name: 'Cart (2)' })).toBeTruthy();
    expect(requestCalls).toHaveBeenCalledTimes(1);
  });
});
