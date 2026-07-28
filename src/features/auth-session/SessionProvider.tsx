import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  decodeUserProfileDto,
  mapUserProfileDto,
  type UserProfile,
  type UserProfileDto,
} from '@entities/user';
import {
  ApiError,
  createApiClient,
  type ApiClient,
  type ApiRequestOptions,
  type SessionCacheEpoch,
} from '@shared/api';
import {
  createBrowserAccessTokenStore,
  createExceptionSafeAccessTokenStore,
  type AccessTokenStore,
} from './storage';

export type { SessionCacheEpoch } from '@shared/api';

export type SessionState =
  | { status: 'bootstrapping' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: UserProfile }
  | { status: 'error' };

export interface SessionContextValue {
  state: SessionState;
  cacheEpoch?: SessionCacheEpoch | null;
  retryBootstrap(): void;
  acceptAccessToken(token: string): void;
  clearSession(): void;
  requestPublic<TResponse, TBody = unknown>(
    options: ApiRequestOptions<TBody, NoInfer<TResponse>>,
  ): Promise<TResponse>;
  requestRequired<TResponse, TBody = unknown>(
    options: ApiRequestOptions<TBody, NoInfer<TResponse>>,
  ): Promise<TResponse>;
  requestOptional<TResponse, TBody = unknown>(
    options: ApiRequestOptions<TBody, NoInfer<TResponse>>,
  ): Promise<TResponse>;
}

interface SessionProviderProps {
  children: ReactNode;
  client?: ApiClient;
  tokenStore?: AccessTokenStore;
  apiBaseUrl?: string;
  fetchImplementation?: typeof fetch;
}

const SessionContext = createContext<SessionContextValue | null>(null);
SessionContext.displayName = 'SessionContext';
let sessionCacheEpochSequence = 0;

function createSessionCacheEpoch(): SessionCacheEpoch {
  sessionCacheEpochSequence += 1;
  return `session-cache-${sessionCacheEpochSequence}` as SessionCacheEpoch;
}

function forSessionGeneration<TBody, TResponse>(
  options: ApiRequestOptions<TBody, TResponse>,
  generation: number,
): ApiRequestOptions<TBody, TResponse> {
  if (!options.dedupeKey) return options;
  return {
    ...options,
    dedupeKey: `session:${generation}:${options.dedupeKey}`,
  };
}

export function SessionProvider({
  children,
  client: suppliedClient,
  tokenStore: suppliedTokenStore,
  apiBaseUrl = '',
  fetchImplementation,
}: SessionProviderProps) {
  const tokenStore = useMemo(
    () =>
      createExceptionSafeAccessTokenStore(suppliedTokenStore ?? createBrowserAccessTokenStore()),
    [suppliedTokenStore],
  );
  const [state, setState] = useState<SessionState>({ status: 'bootstrapping' });
  const [cacheEpoch, setCacheEpoch] = useState<SessionCacheEpoch | null>(null);
  const [bootstrapSequence, setBootstrapSequence] = useState(0);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);

  const clearSession = useCallback(() => {
    generationRef.current += 1;
    tokenStore.clear();
    if (mountedRef.current) {
      setCacheEpoch(null);
      setState({ status: 'anonymous' });
    }
  }, [tokenStore]);

  const isCurrentSnapshot = useCallback(
    (generation: number, _token: string | null) =>
      mountedRef.current && generationRef.current === generation,
    [],
  );

  const clearSessionForSnapshot = useCallback(
    (generation: number, token: string | null) => {
      if (!isCurrentSnapshot(generation, token)) return false;
      const currentToken = tokenStore.get();
      if (currentToken !== token) {
        generationRef.current += 1;
        setCacheEpoch(null);
        setState({ status: 'anonymous' });
        return false;
      }
      generationRef.current += 1;
      tokenStore.clear();
      setCacheEpoch(null);
      setState({ status: 'anonymous' });
      return true;
    },
    [isCurrentSnapshot, tokenStore],
  );

  const ownedClient = useMemo(
    () =>
      createApiClient({
        baseUrl: apiBaseUrl,
        fetch: fetchImplementation,
        getAccessToken: () => tokenStore.get(),
      }),
    [apiBaseUrl, fetchImplementation, tokenStore],
  );
  const client = suppliedClient ?? ownedClient;

  const bootstrap = useCallback(async () => {
    const generation = generationRef.current;
    const token = tokenStore.get();
    if (!token) {
      if (isCurrentSnapshot(generation, token)) {
        setCacheEpoch(null);
        setState({ status: 'anonymous' });
      }
      return;
    }

    if (isCurrentSnapshot(generation, token)) setState({ status: 'bootstrapping' });
    try {
      const profile = await client.request<UserProfileDto>(
        forSessionGeneration(
          {
            path: '/me',
            dedupeKey: 'bootstrap',
            decode: decodeUserProfileDto,
          },
          generation,
        ),
      );
      if (isCurrentSnapshot(generation, token) && tokenStore.get() === token) {
        setCacheEpoch(createSessionCacheEpoch());
        setState({ status: 'authenticated', user: mapUserProfileDto(profile) });
      } else if (isCurrentSnapshot(generation, token)) {
        generationRef.current += 1;
        setCacheEpoch(null);
        setState({ status: 'anonymous' });
      }
    } catch (error) {
      if (!isCurrentSnapshot(generation, token)) return;
      if (error instanceof ApiError && error.status === 401) {
        clearSessionForSnapshot(generation, token);
      } else {
        setState({ status: 'error' });
      }
    }
  }, [clearSessionForSnapshot, client, isCurrentSnapshot, tokenStore]);

  useEffect(() => {
    mountedRef.current = true;
    void bootstrap();
    return () => {
      mountedRef.current = false;
    };
  }, [bootstrap, bootstrapSequence]);

  const retryBootstrap = useCallback(() => {
    generationRef.current += 1;
    if (mountedRef.current) {
      setCacheEpoch(null);
      setState({ status: 'bootstrapping' });
    }
    setBootstrapSequence((sequence) => sequence + 1);
  }, []);

  const acceptAccessToken = useCallback(
    (token: string) => {
      generationRef.current += 1;
      if (!tokenStore.set(token)) {
        if (mountedRef.current) {
          setCacheEpoch(null);
          setState({ status: 'anonymous' });
        }
        return;
      }
      if (mountedRef.current) {
        setCacheEpoch(null);
        setState({ status: 'bootstrapping' });
      }
      setBootstrapSequence((sequence) => sequence + 1);
    },
    [tokenStore],
  );

  const requestRequired = useCallback(
    async <TResponse, TBody = unknown>(
      options: ApiRequestOptions<TBody, NoInfer<TResponse>>,
    ): Promise<TResponse> => {
      const generation = generationRef.current;
      const token = tokenStore.get();
      try {
        return await client.request<TResponse, TBody>(
          forSessionGeneration({ ...options, authPolicy: 'required' }, generation),
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSessionForSnapshot(generation, token);
        }
        throw error;
      }
    },
    [clearSessionForSnapshot, client, tokenStore],
  );

  const requestOptional = useCallback(
    async <TResponse, TBody = unknown>(
      options: ApiRequestOptions<TBody, NoInfer<TResponse>>,
    ): Promise<TResponse> => {
      const generation = generationRef.current;
      const token = tokenStore.get();
      try {
        return await client.request<TResponse, TBody>(
          forSessionGeneration({ ...options, authPolicy: 'optional' }, generation),
        );
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401 || !token) {
          throw error;
        }
        if (!clearSessionForSnapshot(generation, token)) throw error;
        return client.request<TResponse, TBody>(
          forSessionGeneration({ ...options, authPolicy: 'public' }, generationRef.current),
        );
      }
    },
    [clearSessionForSnapshot, client, tokenStore],
  );

  const requestPublic = useCallback(
    <TResponse, TBody = unknown>(
      options: ApiRequestOptions<TBody, NoInfer<TResponse>>,
    ): Promise<TResponse> => client.request<TResponse, TBody>({ ...options, authPolicy: 'public' }),
    [client],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      cacheEpoch,
      retryBootstrap,
      acceptAccessToken,
      clearSession,
      requestPublic,
      requestRequired,
      requestOptional,
    }),
    [
      acceptAccessToken,
      cacheEpoch,
      clearSession,
      requestOptional,
      requestPublic,
      requestRequired,
      retryBootstrap,
      state,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
