// @vitest-environment jsdom

import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  StrictMode,
  useLayoutEffect,
  useRef,
  type FormEvent,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '../../src/app/query';
import { AppRouter } from '../../src/app/router';
import type { UserProfileDto } from '../../src/entities/user';
import {
  AuthFormShell,
  AuthLink,
  mapAuthFailure,
  useLoginWorkflow,
  useResetPasswordWorkflow,
  useSignupWorkflow,
} from '../../src/features/auth-workflows';
import authFormStyles from '../../src/features/auth-workflows/AuthForm.module.css';
import { SessionProvider, type AccessTokenStore } from '../../src/features/auth-session';
import { CartCompositeCheckoutProvider } from '../../src/features/checkout-cart';
import { ApiError, type ApiClient, type ApiRequestOptions } from '../../src/shared/api';
import { localeRuntime, type Locale } from '../../src/shared/locale';
import { ThemeProvider } from '../../src/shared/ui/theme';

interface TestAccessTokenStore extends AccessTokenStore {
  value: string | null;
}

interface RouteLayoutRaceProbeProps {
  readonly destination: string;
  onDestinationLayout(): void;
}

interface RenderAuthOptions {
  readonly strict?: boolean;
  readonly routerChild?: ReactNode;
}

interface RouteLayoutObservation {
  readonly signalAborted: boolean;
  readonly freshSubmitDispatched: boolean;
}

interface ResetTokenRenderObservation {
  readonly confirmation: string | undefined;
  readonly hasAlert: boolean;
  readonly password: string | undefined;
  readonly submitDisabled: boolean | undefined;
  readonly submitText: string | undefined;
}

interface RouteNavigationControlProps {
  readonly destination: string;
}

interface AuthResidualLocaleCopy {
  readonly continueLabel: string;
  readonly createAccount: string;
  readonly createAnAccount: string;
  readonly forgotPassword: string;
  readonly logIn: string;
  readonly passwordUpdated: string;
  readonly recoveryChannel: string;
  readonly recoveryLink: string;
  readonly resetPassword: string;
  readonly resetTokenHelp: string;
}

const AUTH_RESIDUAL_COPY: Readonly<Record<Locale, AuthResidualLocaleCopy>> = {
  en: {
    continueLabel: 'Continue',
    createAccount: 'Create account',
    createAnAccount: 'Create an account',
    forgotPassword: 'Forgot your password?',
    logIn: 'Log in',
    passwordUpdated: 'Your password has been updated.',
    recoveryChannel:
      'If the account can use password recovery, the next steps will be available through the configured recovery channel.',
    recoveryLink:
      'Open the password-reset link from your recovery message to choose a new password.',
    resetPassword: 'Reset password',
    resetTokenHelp:
      'Your reset link supplies a private token. It stays hidden while you complete this form.',
  },
  ru: {
    continueLabel: 'Продолжить',
    createAccount: 'Создать аккаунт',
    createAnAccount: 'Создать аккаунт',
    forgotPassword: 'Забыли пароль?',
    logIn: 'Войти',
    passwordUpdated: 'Ваш пароль обновлён.',
    recoveryChannel:
      'Если для аккаунта доступно восстановление пароля, дальнейшие шаги будут доступны через настроенный канал восстановления.',
    recoveryLink:
      'Откройте ссылку для сброса пароля из сообщения для восстановления, чтобы выбрать новый пароль.',
    resetPassword: 'Сбросить пароль',
    resetTokenHelp:
      'Ссылка для сброса содержит приватный токен. Он остаётся скрытым, пока вы заполняете форму.',
  },
  uz: {
    continueLabel: 'Davom etish',
    createAccount: 'Akkaunt yaratish',
    createAnAccount: 'Akkaunt yaratish',
    forgotPassword: 'Parolni unutdingizmi?',
    logIn: 'Kirish',
    passwordUpdated: 'Parolingiz yangilandi.',
    recoveryChannel:
      'Agar akkaunt parolni tiklashdan foydalana olsa, keyingi qadamlar sozlangan tiklash kanali orqali mavjud bo‘ladi.',
    recoveryLink:
      'Yangi parol tanlash uchun tiklash xabaringizdagi parolni tiklash havolasini oching.',
    resetPassword: 'Parolni tiklash',
    resetTokenHelp:
      'Tiklash havolangiz maxfiy tokenni o‘z ichiga oladi. Shaklni to‘ldirayotganingizda u yashirin qoladi.',
  },
};

const profile: UserProfileDto = {
  email: 'learner@example.com',
  name: 'Ada',
  surname: 'Lovelace',
  role: 'student',
  birthday: null,
  phone_number: null,
  created_at: '2026-07-21T00:00:00Z',
};

function tokenStore(): TestAccessTokenStore {
  return {
    value: null,
    get() {
      return this.value;
    },
    set(value) {
      this.value = value;
    },
    clear() {
      this.value = null;
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}`}</output>;
}

function RouteLayoutRaceProbe({ destination, onDestinationLayout }: RouteLayoutRaceProbeProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const handled = useRef(false);
  const current = `${location.pathname}${location.search}`;

  useLayoutEffect(() => {
    if (current !== destination || handled.current) return;
    handled.current = true;
    onDestinationLayout();
  }, [current, destination, onDestinationLayout]);

  return (
    <button type="button" onClick={() => navigate(destination)}>
      Commit route transition
    </button>
  );
}

function RouteNavigationControl({ destination }: RouteNavigationControlProps) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(destination)}>
      Navigate test route
    </button>
  );
}

async function interact(action: () => Promise<unknown>) {
  await act(async () => {
    await action();
  });
}

function createSubmitEvent(): FormEvent {
  return new Event('submit', { cancelable: true }) as unknown as FormEvent;
}

function renderAuth(
  path: string,
  handler: (options: ApiRequestOptions) => Promise<unknown>,
  options: RenderAuthOptions = {},
) {
  const client = createAppQueryClient();
  const store = tokenStore();
  const request = vi.fn(handler);
  const apiClient: ApiClient = {
    request: async <TResponse, TBody = unknown>(options: ApiRequestOptions<TBody, TResponse>) => {
      const value = await request(options);
      if (!options.decode) return value as TResponse;
      try {
        return options.decode(value);
      } catch (error) {
        throw new ApiError({
          kind: 'invalid_response',
          status: 200,
          message: 'Server returned an invalid success response',
          cause: error,
        });
      }
    },
  };
  const tree = (
    <QueryClientProvider client={client}>
      <ThemeProvider initialDensityMode="marketplace">
        <SessionProvider client={apiClient} tokenStore={store}>
          <MemoryRouter
            initialEntries={[path]}
            future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
          >
            <CartCompositeCheckoutProvider>
              <AppRouter />
              <LocationProbe />
              {options.routerChild}
            </CartCompositeCheckoutProvider>
          </MemoryRouter>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  const view = render(options.strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { client, request, store, view };
}

function AuthWorkflowTestProvider({ children }: PropsWithChildren) {
  const client = createAppQueryClient();
  const apiClient: ApiClient = {
    request: async () => {
      throw new Error('A client-side validation test must not make a request.');
    },
  };
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider initialDensityMode="marketplace">
        <SessionProvider client={apiClient} tokenStore={tokenStore()}>
          <MemoryRouter>{children}</MemoryRouter>
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

type AuthWorkflow = 'signup' | 'login' | 'forgot' | 'reset';
type TokenAuthWorkflow = Extract<AuthWorkflow, 'signup' | 'login'>;

function successfulTokenResponse(workflow: TokenAuthWorkflow, accessToken: string) {
  return workflow === 'signup'
    ? {
        user: { id: 1, email: 'learner@example.com' },
        access_token: accessToken,
        token_type: 'bearer',
      }
    : { access_token: accessToken };
}

async function fillAuthForm(workflow: AuthWorkflow, user: ReturnType<typeof userEvent.setup>) {
  if (workflow === 'signup') {
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
    await interact(() => user.type(screen.getByLabelText(/^First name/), 'Ada'));
    await interact(() => user.type(screen.getByLabelText(/^Last name/), 'Lovelace'));
    await interact(() => user.type(screen.getByLabelText(/^Password/), 'password'));
    await interact(() => user.type(screen.getByLabelText(/^Confirm password/), 'password'));
  } else if (workflow === 'login') {
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
    await interact(() => user.type(screen.getByLabelText(/^Password/), 'password'));
  } else if (workflow === 'forgot') {
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
  } else {
    await interact(() => user.type(screen.getByLabelText(/^New password/), 'new password'));
    await interact(() => user.type(screen.getByLabelText(/^Confirm new password/), 'new password'));
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  await localeRuntime.changeLanguage('en');
  vi.stubGlobal('scrollTo', vi.fn());
});

describe('authentication pages', () => {
  it.each(['en', 'ru', 'uz'] as const)(
    'uses the existing primary AuthLink contract for every admitted Back-to-login footer in %s',
    async (locale) => {
      await localeRuntime.changeLanguage(locale);
      const backToLogin = localeRuntime.t('auth:backToLogin');
      const primaryClassName = render(
        <MemoryRouter>
          <AuthLink to="/login" tone="primary">
            Primary reference
          </AuthLink>
        </MemoryRouter>,
      ).getByRole('link', { name: 'Primary reference' }).className;

      cleanup();
      renderAuth('/forgot-password', async () => ({}));
      const forgotFooter = await screen.findByRole('link', { name: backToLogin });
      expect(forgotFooter.getAttribute('href')).toBe('/login');
      expect(forgotFooter.className).toBe(primaryClassName);

      cleanup();
      renderAuth('/reset-password?token=footer-tone-token', async () => ({ message: 'ok' }));
      const resetFormFooter = await screen.findByRole('link', { name: backToLogin });
      expect(resetFormFooter.getAttribute('href')).toBe('/login');
      expect(resetFormFooter.className).toBe(primaryClassName);

      const newPassword = document.getElementById('password') as HTMLInputElement;
      const confirmation = document.getElementById('passwordConfirmation') as HTMLInputElement;
      const submit = document.querySelector<HTMLButtonElement>('main form button[type="submit"]');
      expect(submit).not.toBe(null);
      const user = userEvent.setup();
      await interact(() => user.type(newPassword, 'new password'));
      await interact(() => user.type(confirmation, 'new password'));
      await interact(() => user.click(submit as HTMLButtonElement));

      const resetSuccessFooter = await screen.findByRole('link', { name: backToLogin });
      const inlineSuccessLink = screen.getByRole('link', {
        name: localeRuntime.t('auth:logInWithYourNewPassword'),
      });
      expect(resetSuccessFooter.getAttribute('href')).toBe('/login');
      expect(resetSuccessFooter.className).toBe(primaryClassName);
      expect(inlineSuccessLink.getAttribute('href')).toBe('/login');
      expect(inlineSuccessLink.className).toBe(primaryClassName);
    },
  );

  it('gives each AuthFormShell a unique accessible heading relationship', () => {
    render(
      <>
        <AuthFormShell title="First form" description="First description">
          <form />
        </AuthFormShell>
        <AuthFormShell title="Second form" description="Second description">
          <form />
        </AuthFormShell>
      </>,
    );

    const firstRegion = screen.getByRole('region', { name: 'First form' });
    const secondRegion = screen.getByRole('region', { name: 'Second form' });
    const firstHeading = screen.getByRole('heading', { name: 'First form' });
    const secondHeading = screen.getByRole('heading', { name: 'Second form' });

    expect(firstHeading.id).not.toBe('');
    expect(secondHeading.id).not.toBe('');
    expect(firstHeading.id).not.toBe(secondHeading.id);
    expect(firstRegion.getAttribute('aria-labelledby')).toBe(firstHeading.id);
    expect(secondRegion.getAttribute('aria-labelledby')).toBe(secondHeading.id);
  });

  it.each([
    { route: '/login', passwordIds: ['password'] },
    { route: '/signup', passwordIds: ['password', 'passwordConfirmation'] },
    {
      route: '/reset-password?token=password-semantics-token',
      passwordIds: ['password', 'passwordConfirmation'],
    },
  ])(
    'keeps every password reveal independent and accessible on $route',
    async ({ route, passwordIds }) => {
      renderAuth(route, async () => ({}));
      const user = userEvent.setup();

      for (const passwordId of passwordIds) {
        const input = document.getElementById(passwordId) as HTMLInputElement | null;
        const button = input?.parentElement?.querySelector<HTMLButtonElement>('button');
        expect(input).not.toBe(null);
        expect(button).not.toBe(null);
        expect(input?.type).toBe('password');
        expect(button?.type).toBe('button');
        expect(button?.getAttribute('aria-controls')).toBe(passwordId);
        expect(button?.getAttribute('aria-label')).toBe('Show password');
        expect(button?.getAttribute('aria-pressed')).toBe('false');
        expect(button?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        expect(button?.querySelector('svg')?.getAttribute('focusable')).toBe('false');
      }

      const email = screen.queryByLabelText(/^Email/);
      if (email) expect(email.closest('[data-part="control-frame"]')).toBe(null);

      for (const passwordId of passwordIds) {
        const input = document.getElementById(passwordId) as HTMLInputElement;
        const button = input.parentElement?.querySelector<HTMLButtonElement>(
          'button',
        ) as HTMLButtonElement;
        button.focus();
        await interact(() => user.keyboard(' '));
        expect(button).toBe(document.activeElement);
        expect(input.type).toBe('text');
        expect(button.getAttribute('aria-label')).toBe('Hide password');
        expect(button.getAttribute('aria-pressed')).toBe('true');
        expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        passwordIds
          .filter((id) => id !== passwordId)
          .forEach((id) => {
            expect((document.getElementById(id) as HTMLInputElement).type).toBe('password');
          });

        await interact(() => user.keyboard('{Enter}'));
        expect(input.type).toBe('password');
        await interact(() => user.click(button));
        expect(input.type).toBe('text');
        await interact(() => user.click(button));
        expect(input.type).toBe('password');
      }

      const submit = document.querySelector<HTMLButtonElement>('main form button[type="submit"]');
      expect(submit).not.toBe(null);
      await interact(() => user.click(submit as HTMLButtonElement));
      expect(screen.queryByRole('alert')).toBe(null);
      expect(document.getElementById(email ? 'email' : passwordIds[0])).toBe(
        document.activeElement,
      );
      for (const passwordId of passwordIds) {
        const input = document.getElementById(passwordId) as HTMLInputElement;
        const button = input.parentElement?.querySelector<HTMLButtonElement>('button');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(`${passwordId}-error`);
        expect(button?.getAttribute('aria-controls')).toBe(passwordId);
        expect(button?.hasAttribute('disabled')).toBe(false);
      }
    },
  );

  it('validates signup accessibly and supports password reveal without an API request', async () => {
    const requestAnimationFrame = vi.fn(() => 1);
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
    const { request } = renderAuth('/signup', async () => ({}));
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Create account' });

    await interact(() => user.click(screen.getAllByRole('button', { name: 'Show password' })[0]));
    expect(screen.getByLabelText(/^Password/).getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Create account' })));

    const email = screen.getByLabelText(/^Email/);
    expect(email).toBe(document.activeElement);
    expect(screen.queryByRole('alert')).toBe(null);
    expect(email.getAttribute('aria-invalid')).toBe('true');
    const summaryFields = [
      ['Email', 'email', /^Email/],
      ['First name', 'name', /^First name/],
      ['Last name', 'surname', /^Last name/],
      ['Password', 'password', /^Password/],
      ['Password confirmation', 'passwordConfirmation', /^Confirm password/],
    ] as const;
    for (const [, fieldId, fieldLabel] of summaryFields) {
      const field = screen.getByLabelText(fieldLabel);
      expect(field.getAttribute('id')).toBe(fieldId);
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.getAttribute('aria-describedby')?.split(' ')).toContain(`${fieldId}-error`);
      expect(document.getElementById(`${fieldId}-error`)?.textContent).toBeTruthy();
    }
    await interact(() => user.click(screen.getByRole('button', { name: 'Create account' })));
    expect(email).toBe(document.activeElement);
    expect(request).not.toHaveBeenCalled();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('keeps the signup Role listbox labelled with its fixed value contract', async () => {
    renderAuth('/signup', async () => ({}));
    const user = userEvent.setup();
    const role = screen.getByRole('button', { name: 'Role' });

    expect(role.getAttribute('aria-haspopup')).toBe('listbox');
    expect(role.getAttribute('aria-expanded')).toBe('false');
    expect(role.hasAttribute('aria-required')).toBe(false);
    expect(role.textContent).toContain('Student');

    await interact(() => user.click(role));
    const listbox = screen.getByRole('listbox', { name: 'Role options' });
    expect(listbox.getAttribute('aria-required')).toBe('true');
    expect(screen.getByRole('option', { name: 'Student' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    await interact(() => user.click(screen.getByRole('option', { name: 'Instructor' })));
    expect(role.textContent).toContain('Instructor');
  });

  it('maps hostile 422 issues to stable field copy without rendering backend messages', async () => {
    const hostileMarkers = [
      'PRIVATE_EMAIL_DIAGNOSTIC',
      'PRIVATE_PASSWORD_DIAGNOSTIC',
      'PRIVATE_UNKNOWN_FIELD',
    ];
    renderAuth('/login', async () => {
      throw new ApiError({
        kind: 'validation',
        status: 422,
        message: hostileMarkers.join(' '),
        issues: [
          { location: ['body', 'email'], message: hostileMarkers[0], type: 'value_error.email' },
          {
            location: ['body', 'password'],
            message: hostileMarkers[1],
            type: 'vendor_private_rule',
          },
          {
            location: ['body', 'internal'],
            message: hostileMarkers[2],
            type: 'vendor_private_rule',
          },
        ],
      });
    });
    const user = userEvent.setup();
    await screen.findByLabelText(/^Email/);
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
    await interact(() => user.type(screen.getByLabelText(/^Password/), 'password'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Log in' })));

    const email = screen.getByLabelText(/^Email/);
    const password = screen.getByLabelText(/^Password/);
    await waitFor(() => expect(email).toBe(document.activeElement));
    expect(screen.queryByRole('alert')).toBe(null);
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('email-error')?.textContent).toBe(
      'Enter a valid email address.',
    );
    expect(document.getElementById('password-error')?.textContent).toBe(
      'Check this field and submit again.',
    );
    hostileMarkers.forEach((marker) => expect(document.body.textContent).not.toContain(marker));
  });

  it('retires only the edited login field feedback', async () => {
    renderAuth('/login', async () => {
      throw new ApiError({
        kind: 'validation',
        status: 422,
        message: 'private validation detail',
        issues: [
          { location: ['body', 'email'], message: 'private email detail', type: 'value_error' },
          {
            location: ['body', 'password'],
            message: 'private password detail',
            type: 'value_error',
          },
        ],
      });
    });
    const user = userEvent.setup();
    const email = await screen.findByLabelText(/^Email/);
    const password = screen.getByLabelText(/^Password/);
    await interact(() => user.type(email, 'learner@example.com'));
    await interact(() => user.type(password, 'password'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Log in' })));

    await waitFor(() => expect(email.getAttribute('aria-invalid')).toBe('true'));
    expect(password.getAttribute('aria-invalid')).toBe('true');
    await interact(() => user.type(email, 'a'));

    expect(email).toBe(document.activeElement);
    expect(email.getAttribute('aria-invalid')).not.toBe('true');
    expect(document.getElementById('email-error')).toBe(null);
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('password-error')?.textContent).toBeTruthy();
  });

  it('retires consecutive login field errors from current state before rerender', async () => {
    const { result } = renderHook(() => useLoginWorkflow('field-error-race-login'), {
      wrapper: AuthWorkflowTestProvider,
    });

    await act(() => result.current.submit(createSubmitEvent()));
    act(() => {
      result.current.setEmail('learner@example.com');
      result.current.setPassword('password');
    });

    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.summary).toBe(null);
  });

  it('retires consecutive signup field errors from current state before rerender', async () => {
    const { result } = renderHook(() => useSignupWorkflow('field-error-race-signup'), {
      wrapper: AuthWorkflowTestProvider,
    });

    await act(() => result.current.submit(createSubmitEvent()));
    act(() => {
      result.current.update('email', 'learner@example.com');
      result.current.update('name', 'Ada');
    });

    expect(result.current.fieldErrors.name).toBeUndefined();
    expect(result.current.fieldErrors.email).toBeUndefined();
    expect(result.current.summary).toBe(null);
  });

  it('retires consecutive reset-password field errors from current state before rerender', async () => {
    const { result } = renderHook(
      () =>
        useResetPasswordWorkflow({
          ownerKey: 'field-error-race-reset',
          token: 'field-error-race-token',
          onSuccess: vi.fn(),
        }),
      { wrapper: AuthWorkflowTestProvider },
    );

    await act(() => result.current.submit(createSubmitEvent()));
    act(() => {
      result.current.setNewPassword('new password');
      result.current.setPasswordConfirmation('new password');
    });

    expect(result.current.fieldErrors).toEqual({});
    expect(result.current.summary).toBe(null);
  });

  it.each([
    ['/login', 'Log in', /^Email/],
    ['/signup', 'Create account', /^Email/],
    ['/reset-password?token=focus-token', 'Reset password', /^New password/],
  ] as const)(
    'keeps focus in the edited field while retiring stale %s validation feedback',
    async (path, submitName, fieldName) => {
      renderAuth(path, async () => ({}));
      const user = userEvent.setup();
      const field = await screen.findByLabelText(fieldName);

      await interact(() => user.click(screen.getByRole('button', { name: submitName })));
      await waitFor(() => expect(field).toBe(document.activeElement));
      await interact(() => user.type(field, 'a'));

      expect(field).toBe(document.activeElement);
    },
  );

  it('focuses one compact alert only for a targetless auth failure', async () => {
    renderAuth('/forgot-password', async () => {
      throw new ApiError({ kind: 'offline', status: null, message: 'private offline detail' });
    });
    const user = userEvent.setup();
    const email = await screen.findByLabelText(/^Email/);
    await interact(() => user.type(email, 'person@example.com'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Continue' })));

    const alert = await screen.findByRole('alert');
    expect(alert).toBe(document.activeElement);
    expect(alert.textContent).toContain('You appear to be offline');
    expect(email.getAttribute('aria-invalid')).not.toBe('true');
    expect(screen.queryAllByRole('link', { name: /Email:/ })).toHaveLength(0);
  });

  it.each([
    ['signup', '/signup', '/signup', 'Create account', 'Creating account...'],
    ['login', '/login', '/login', 'Log in', 'Logging in...'],
    ['forgot', '/forgot-password', '/forgot-password', 'Continue', 'Submitting request...'],
    [
      'reset',
      '/reset-password?token=private-reset-token',
      '/reset-password',
      'Reset password',
      'Resetting password...',
    ],
  ] as const)(
    'synchronously excludes duplicate %s submissions',
    async (workflow, pagePath, operationPath, idleButtonName, pendingButtonName) => {
      const pendingRequest = createDeferred<unknown>();
      const { request } = renderAuth(pagePath, async (options) => {
        if (options.path !== operationPath) throw new Error(`Unexpected path ${options.path}`);
        return pendingRequest.promise;
      });
      const user = userEvent.setup();
      await screen.findByRole('button', { name: idleButtonName });
      if (workflow === 'signup') {
        await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
        await interact(() => user.type(screen.getByLabelText(/^First name/), 'Ada'));
        await interact(() => user.type(screen.getByLabelText(/^Last name/), 'Lovelace'));
        await interact(() => user.type(screen.getByLabelText(/^Password/), 'password'));
        await interact(() => user.type(screen.getByLabelText(/^Confirm password/), 'password'));
      } else if (workflow === 'login') {
        await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
        await interact(() => user.type(screen.getByLabelText(/^Password/), 'password'));
      } else if (workflow === 'forgot') {
        await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
      } else {
        await interact(() => user.type(screen.getByLabelText(/^New password/), 'new password'));
        await interact(() =>
          user.type(screen.getByLabelText(/^Confirm new password/), 'new password'),
        );
      }

      const form = screen.getByRole('button', { name: idleButtonName }).closest('form');
      expect(form).not.toBe(null);
      await act(async () => {
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await Promise.resolve();
      });

      await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('button', { name: pendingButtonName }).hasAttribute('disabled')).toBe(
        true,
      );
      if (workflow !== 'forgot') {
        screen.getAllByRole('button', { name: 'Show password' }).forEach((button) => {
          expect(button.hasAttribute('disabled')).toBe(true);
        });
      }
      await act(async () => {
        pendingRequest.reject(
          new ApiError({ kind: 'offline', status: null, message: 'private offline detail' }),
        );
        await Promise.resolve();
      });
      expect((await screen.findByRole('alert')).textContent).toContain('You appear to be offline');
      await waitFor(() =>
        expect(screen.getByRole('button', { name: idleButtonName }).hasAttribute('disabled')).toBe(
          false,
        ),
      );
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it('re-masks a revealed password while a failed login submission is disabled', async () => {
    const pendingRequest = createDeferred<unknown>();
    renderAuth('/login', async (options) => {
      if (options.path !== '/login') throw new Error(`Unexpected path ${options.path}`);
      return pendingRequest.promise;
    });
    const user = userEvent.setup();
    await screen.findByRole('button', { name: 'Log in' });
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
    await interact(() => user.type(screen.getByLabelText(/^Password/), 'password'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Show password' })));
    const password = screen.getByLabelText(/^Password/);
    expect(password.getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe(
      'true',
    );

    await interact(() => user.click(screen.getByRole('button', { name: 'Log in' })));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Logging in...' }).hasAttribute('disabled')).toBe(
        true,
      ),
    );
    expect(password.getAttribute('type')).toBe('password');
    const pendingReveal = screen.getByRole('button', { name: 'Show password' });
    expect(pendingReveal.getAttribute('aria-pressed')).toBe('false');
    expect(pendingReveal.hasAttribute('disabled')).toBe(true);

    await act(async () => {
      pendingRequest.reject(
        new ApiError({ kind: 'offline', status: null, message: 'private offline detail' }),
      );
      await Promise.resolve();
    });
    await screen.findByRole('alert');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Log in' }).hasAttribute('disabled')).toBe(false),
    );
    expect(password.getAttribute('type')).toBe('password');
    expect(screen.getByRole('button', { name: 'Show password' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it.each([
    [
      'signup',
      'resolve',
      '/signup',
      '/signup?race=destination',
      '/signup',
      'Create account',
      'Creating account...',
    ],
    [
      'signup',
      'reject',
      '/signup',
      '/signup?race=destination',
      '/signup',
      'Create account',
      'Creating account...',
    ],
    ['login', 'resolve', '/login', '/login?race=destination', '/login', 'Log in', 'Logging in...'],
    ['login', 'reject', '/login', '/login?race=destination', '/login', 'Log in', 'Logging in...'],
    [
      'forgot',
      'resolve',
      '/forgot-password',
      '/forgot-password?race=destination',
      '/forgot-password',
      'Continue',
      'Submitting request...',
    ],
    [
      'forgot',
      'reject',
      '/forgot-password',
      '/forgot-password?race=destination',
      '/forgot-password',
      'Continue',
      'Submitting request...',
    ],
    [
      'reset',
      'resolve',
      '/reset-password?token=private-reset-token',
      '/reset-password?token=private-reset-token&race=destination',
      '/reset-password',
      'Reset password',
      'Resetting password...',
    ],
    [
      'reset',
      'reject',
      '/reset-password?token=private-reset-token',
      '/reset-password?token=private-reset-token&race=destination',
      '/reset-password',
      'Reset password',
      'Resetting password...',
    ],
  ] as const)(
    'layout-invalidates pending %s before late %s and preserves a fresh route-lifecycle attempt',
    async (
      workflow,
      settlement,
      pagePath,
      destination,
      operationPath,
      idleButtonName,
      pendingButtonName,
    ) => {
      const abandoned = createDeferred<unknown>();
      const fresh = createDeferred<unknown>();
      const layoutObservations: RouteLayoutObservation[] = [];
      let operationAttempt = 0;
      let abandonedSignal: AbortSignal | undefined;
      const app = renderAuth(
        pagePath,
        async (options) => {
          if (options.path === operationPath) {
            operationAttempt += 1;
            if (operationAttempt === 1) {
              abandonedSignal = options.signal;
              return abandoned.promise;
            }
            return fresh.promise;
          }
          if (options.path === '/me') return profile;
          throw new Error(`Unexpected path ${options.path}`);
        },
        {
          strict: true,
          routerChild: (
            <RouteLayoutRaceProbe
              destination={destination}
              onDestinationLayout={() => {
                const form = document.querySelector<HTMLFormElement>('main form');
                layoutObservations.push({
                  signalAborted: abandonedSignal?.aborted ?? false,
                  freshSubmitDispatched: Boolean(form),
                });
                form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                if (settlement === 'resolve') {
                  abandoned.resolve(
                    workflow === 'signup' || workflow === 'login'
                      ? successfulTokenResponse(workflow, 'abandoned-token')
                      : { message: 'ABANDONED_PRIVATE_SUCCESS' },
                  );
                } else {
                  abandoned.reject(
                    new ApiError({
                      kind: 'offline',
                      status: null,
                      message: 'ABANDONED_PRIVATE_ERROR',
                    }),
                  );
                }
              }}
            />
          ),
        },
      );
      const user = userEvent.setup();
      await screen.findByRole('button', { name: idleButtonName });
      await fillAuthForm(workflow, user);
      await interact(() => user.click(screen.getByRole('button', { name: idleButtonName })));

      await waitFor(() =>
        expect(
          app.request.mock.calls.filter(([options]) => options.path === operationPath),
        ).toHaveLength(1),
      );
      expect(screen.getByRole('button', { name: pendingButtonName }).hasAttribute('disabled')).toBe(
        true,
      );
      expect(abandonedSignal).toBeInstanceOf(AbortSignal);
      expect(abandonedSignal?.aborted).toBe(false);

      await interact(() =>
        user.click(screen.getByRole('button', { name: 'Commit route transition' })),
      );
      expect(screen.getByLabelText('location').textContent).toBe(destination);
      expect(layoutObservations).toEqual([{ signalAborted: true, freshSubmitDispatched: true }]);
      await waitFor(() =>
        expect(
          app.request.mock.calls.filter(([options]) => options.path === operationPath),
        ).toHaveLength(2),
      );

      expect(app.store.value).toBe(null);
      expect(app.request.mock.calls.filter(([options]) => options.path === '/me')).toHaveLength(0);
      expect(document.body.textContent).not.toContain('ABANDONED_PRIVATE');
      expect(screen.queryByRole('alert')).toBe(null);
      expect(screen.getByRole('button', { name: pendingButtonName }).hasAttribute('disabled')).toBe(
        true,
      );

      await act(async () => {
        fresh.resolve(
          workflow === 'signup' || workflow === 'login'
            ? successfulTokenResponse(workflow, 'fresh-token')
            : { message: 'ok' },
        );
        await Promise.resolve();
      });

      if (workflow === 'signup' || workflow === 'login') {
        await screen.findByRole('heading', { name: 'My learning' });
        expect(app.store.value).toBe('fresh-token');
      } else if (workflow === 'forgot') {
        expect(await screen.findByText(/If the account can use password recovery/)).toBeTruthy();
      } else {
        expect(await screen.findByText('Password reset complete')).toBeTruthy();
      }
      await waitFor(() => expect(app.client.getMutationCache().getAll()).toHaveLength(0));
    },
  );

  it('logs in through a public operation, hydrates SessionProvider, and honors safe returnTo', async () => {
    const { request, store, client } = renderAuth('/login?returnTo=%2Fcart', async (options) => {
      if (options.path === '/login') return { access_token: 'secret-token' };
      if (options.path === '/me') return profile;
      throw new Error(`Unexpected path ${options.path}`);
    });
    const user = userEvent.setup();
    expect(
      screen.getByText('Log in with a student account to view your cart and continue checkout.'),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create an account' }).getAttribute('href')).toBe(
      '/signup?returnTo=%2Fcart',
    );
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
    await interact(() => user.type(screen.getByLabelText(/^Password/), 'correct horse'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Log in' })));

    await screen.findByRole('heading', { name: 'Cart' });
    expect(screen.getByLabelText('location').textContent).toBe('/cart');
    expect(store.value).toBe('secret-token');
    const loginOptions = request.mock.calls.find(([options]) => options.path === '/login')?.[0];
    expect(loginOptions).toEqual(expect.objectContaining({ authPolicy: 'public' }));
    expect(loginOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(loginOptions?.signal?.aborted).toBe(false);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ path: '/me' }));
    await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
    expect(JSON.stringify(client.getMutationCache().getAll())).not.toContain('secret-token');
  });

  it('preserves only a safe cart return target between Login and Create account', async () => {
    renderAuth('/login?returnTo=%2Fcart&unexpected=value', async () => ({}));
    const user = userEvent.setup();

    expect(screen.getByRole('link', { name: 'Create an account' }).getAttribute('href')).toBe(
      '/signup?returnTo=%2Fcart',
    );
    await interact(() => user.click(screen.getByRole('link', { name: 'Create an account' })));
    expect(screen.getByLabelText('location').textContent).toBe('/signup?returnTo=%2Fcart');
    const signupLoginLinks = screen.getAllByRole('link', { name: 'Log in' });
    expect(signupLoginLinks[signupLoginLinks.length - 1]?.getAttribute('href')).toBe(
      '/login?returnTo=%2Fcart',
    );
    await interact(() =>
      user.click(signupLoginLinks[signupLoginLinks.length - 1] as HTMLAnchorElement),
    );
    expect(screen.getByLabelText('location').textContent).toBe('/login?returnTo=%2Fcart');
  });

  it('does not propagate an unsafe return target between authentication pages', async () => {
    renderAuth('/login?returnTo=https%3A%2F%2Fevil.example&unexpected=value', async () => ({}));
    const user = userEvent.setup();

    expect(
      screen.queryByText('Log in with a student account to view your cart and continue checkout.'),
    ).toBeNull();
    expect(screen.getByRole('link', { name: 'Create an account' }).getAttribute('href')).toBe(
      '/signup',
    );
    await interact(() => user.click(screen.getByRole('link', { name: 'Create an account' })));
    const signupLoginLinks = screen.getAllByRole('link', { name: 'Log in' });
    expect(signupLoginLinks[signupLoginLinks.length - 1]?.getAttribute('href')).toBe('/login');
  });

  it('signs up a student and honors a safe cart return target', async () => {
    const { store } = renderAuth('/signup?returnTo=%2Fcart', async (options) =>
      options.path === '/signup' ? successfulTokenResponse('signup', 'signup-cart-token') : profile,
    );
    const user = userEvent.setup();

    await fillAuthForm('signup', user);
    await interact(() => user.click(screen.getByRole('button', { name: 'Create account' })));

    await screen.findByRole('heading', { name: 'Cart' });
    expect(screen.getByLabelText('location').textContent).toBe('/cart');
    expect(store.value).toBe('signup-cart-token');
  });

  it('maps duplicate signup safely, retries explicitly, and strips confirmation from the DTO', async () => {
    let signupAttempts = 0;
    const { request, store } = renderAuth('/signup', async (options) => {
      if (options.path === '/me') return profile;
      signupAttempts += 1;
      if (signupAttempts === 1) {
        throw new ApiError({
          kind: 'bad_request',
          status: 400,
          message: 'private duplicate detail',
        });
      }
      return {
        access_token: 'signup-token',
        token_type: 'bearer',
        user: { id: 1, email: 'learner@example.com' },
      };
    });
    const user = userEvent.setup();
    await screen.findByLabelText(/^Email/);
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
    await interact(() => user.type(screen.getByLabelText(/^First name/), 'Ada'));
    await interact(() => user.type(screen.getByLabelText(/^Last name/), 'Lovelace'));
    await interact(() => user.type(screen.getByLabelText(/^Password/), 'plain required value'));
    await interact(() =>
      user.type(screen.getByLabelText(/^Confirm password/), 'plain required value'),
    );
    await interact(() => user.click(screen.getByRole('button', { name: 'Create account' })));

    expect((await screen.findByRole('alert')).textContent).toContain('email may already be in use');
    expect(document.body.textContent).not.toContain('private duplicate detail');
    await interact(() => user.click(screen.getByRole('button', { name: 'Create account' })));
    await screen.findByRole('heading', { name: 'My learning' });
    expect(store.value).toBe('signup-token');
    const signupOptions = request.mock.calls.find(([options]) => options.path === '/signup')?.[0];
    expect(signupOptions?.body).toEqual({
      email: 'learner@example.com',
      name: 'Ada',
      surname: 'Lovelace',
      password: 'plain required value',
      role: 'student',
    });
    expect(signupOptions?.body).not.toHaveProperty('passwordConfirmation');
  });

  it.each([
    ['login', '/login', '/login', 'Log in', { access_token: 7 }],
    [
      'signup',
      '/signup',
      '/signup',
      'Create account',
      { access_token: 'token', token_type: 'bearer' },
    ],
    ['forgot', '/forgot-password', '/forgot-password', 'Continue', { message: 7 }],
    ['reset', '/reset-password?token=malformed-token', '/reset-password', 'Reset password', {}],
  ] as const)(
    'rejects malformed successful %s responses before success state',
    async (workflow, pagePath, operationPath, submitName, malformedResponse) => {
      const { request, store } = renderAuth(pagePath, async (options) => {
        if (options.path !== operationPath) throw new Error(`Unexpected path ${options.path}`);
        return malformedResponse;
      });
      const user = userEvent.setup();
      await screen.findByRole('button', { name: submitName });
      await fillAuthForm(workflow, user);
      await interact(() => user.click(screen.getByRole('button', { name: submitName })));

      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(store.value).toBe(null);
      expect(screen.getByLabelText('location').textContent).toBe(pagePath);
      expect(screen.queryByRole('heading', { name: 'My learning' })).toBe(null);
      expect(screen.queryByText(/If the account can use password recovery/)).toBe(null);
      expect(screen.queryByText('Password reset complete')).toBe(null);
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0]?.[0].decode).toEqual(expect.any(Function));
    },
  );

  it('rejects an unsafe external returnTo and falls back to the role home', async () => {
    renderAuth('/login?returnTo=https%3A%2F%2Fevil.example', async (options) =>
      options.path === '/login' ? { access_token: 'secret-token' } : profile,
    );
    const user = userEvent.setup();
    await screen.findByLabelText(/^Email/);
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
    await interact(() => user.type(screen.getByLabelText(/^Password/), 'password'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Log in' })));

    await screen.findByRole('heading', { name: 'My learning' });
    expect(screen.getByLabelText('location').textContent).toBe('/learning');
  });

  it('shows neutral forgot-password success without account or delivery disclosure', async () => {
    const { request } = renderAuth('/forgot-password', async () => ({
      message: 'private server detail',
    }));
    const user = userEvent.setup();
    await screen.findByLabelText(/^Email/);
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'person@example.com'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Continue' })));

    const successCopy = await screen.findByText(/If the account can use password recovery/);
    const status = successCopy.closest('[role="status"]');
    expect(status).not.toBe(null);
    expect(status?.textContent).toContain('If the account can use password recovery');
    expect(status?.textContent).not.toMatch(
      /email (was )?sent|delivery succeeded|account exists|private server detail/i,
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/forgot-password',
        authPolicy: 'public',
        body: { email: 'person@example.com' },
      }),
    );
  });

  it('redirects a missing reset token without rendering a token field', async () => {
    renderAuth('/reset-password', async () => ({}));
    await screen.findByRole('heading', { name: 'Forgot password' });
    expect(screen.getByLabelText('location').textContent).toBe(
      '/forgot-password?reason=missing-token',
    );
    expect(screen.queryByLabelText(/token/i)).toBe(null);
  });

  it('maps invalid reset tokens to a stable public error and allows safe retry', async () => {
    let attempts = 0;
    const { request } = renderAuth('/reset-password?token=private-reset-token', async () => {
      attempts += 1;
      if (attempts === 1)
        throw new ApiError({ kind: 'bad_request', status: 400, message: 'raw token detail' });
      return { message: 'ok' };
    });
    const user = userEvent.setup();
    await screen.findByLabelText(/^New password/);
    await interact(() => user.type(screen.getByLabelText(/^New password/), 'new password'));
    await interact(() => user.type(screen.getByLabelText(/^Confirm new password/), 'new password'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Reset password' })));

    expect((await screen.findByRole('alert')).textContent).toContain('invalid or has expired');
    expect(screen.getByRole('main').textContent).not.toContain('private-reset-token');
    expect(document.body.textContent).not.toContain('raw token detail');
    await interact(() => user.click(screen.getByRole('button', { name: 'Reset password' })));
    expect(await screen.findByText('Password reset complete')).toBeTruthy();
    const loginRecovery = screen.getByRole('link', { name: 'Log in with your new password' });
    expect(loginRecovery.classList.contains(authFormStyles.linkPrimary)).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('replaces a consumed reset credential with an in-memory token-free confirmation', async () => {
    const { request } = renderAuth('/reset-password?token=private-reset-token', async () => ({
      message: 'ok',
    }));
    const user = userEvent.setup();
    await screen.findByLabelText(/^New password/);
    await fillAuthForm('reset', user);
    await interact(() => user.click(screen.getByRole('button', { name: 'Reset password' })));

    expect(await screen.findByText('Password reset complete')).toBeTruthy();
    expect(screen.getByLabelText('location').textContent).toBe('/reset-password');
    expect(screen.queryByRole('button', { name: 'Reset password' })).toBe(null);
    expect(request).toHaveBeenCalledTimes(1);

    cleanup();
    renderAuth('/reset-password?token=stale-token&status=success', async () => ({}));
    expect(await screen.findByRole('button', { name: 'Reset password' })).toBeTruthy();
    expect(screen.getByLabelText('location').textContent).toBe('/reset-password?token=stale-token');
    expect(screen.queryByText('Password reset complete')).toBeNull();
  });

  it('rejects query-only reset confirmation and explains a missing reset credential', async () => {
    renderAuth('/reset-password?status=success', async () => ({}));

    expect(await screen.findByRole('heading', { name: 'Forgot password' })).toBeTruthy();
    expect(screen.getByText('Use your reset link')).toBeTruthy();
    expect(screen.queryByText('Password reset complete')).toBeNull();
    expect(screen.getByLabelText('location').textContent).toBe(
      '/forgot-password?reason=missing-token',
    );
  });

  it('isolates reset fields, errors, and settlement by token identity', async () => {
    const tokenA = createDeferred<unknown>();
    const { request } = renderAuth(
      '/reset-password?token=token-a',
      async (options) => {
        if (options.path !== '/reset-password') throw new Error(`Unexpected path ${options.path}`);
        return tokenA.promise;
      },
      { routerChild: <RouteNavigationControl destination="/reset-password?token=token-b" /> },
    );
    const user = userEvent.setup();
    await screen.findByLabelText(/^New password/);
    await fillAuthForm('reset', user);
    await interact(() => user.click(screen.getByRole('button', { name: 'Reset password' })));
    await interact(() => user.click(screen.getByRole('button', { name: 'Navigate test route' })));

    expect(screen.getByLabelText('location').textContent).toBe('/reset-password?token=token-b');
    expect((screen.getByLabelText(/^New password/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^Confirm new password/) as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('alert')).toBe(null);
    await act(async () => {
      tokenA.resolve({ message: 'PRIVATE_TOKEN_A_SUCCESS' });
      await Promise.resolve();
    });
    expect(screen.queryByText('Password reset complete')).toBe(null);
    expect(screen.getByLabelText('location').textContent).toBe('/reset-password?token=token-b');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('shows token B reset form after token A succeeds in the same mounted page', async () => {
    const { request } = renderAuth(
      '/reset-password?token=token-a',
      async () => ({ message: 'ok' }),
      { routerChild: <RouteNavigationControl destination="/reset-password?token=token-b" /> },
    );
    const user = userEvent.setup();
    await screen.findByLabelText(/^New password/);
    await fillAuthForm('reset', user);
    await interact(() => user.click(screen.getByRole('button', { name: 'Reset password' })));

    expect(await screen.findByText('Password reset complete')).toBeTruthy();
    expect(screen.getByLabelText('location').textContent).toBe('/reset-password');
    await interact(() => user.click(screen.getByRole('button', { name: 'Navigate test route' })));

    expect(screen.getByLabelText('location').textContent).toBe('/reset-password?token=token-b');
    expect(await screen.findByRole('button', { name: 'Reset password' })).toBeTruthy();
    expect(screen.queryByText('Password reset complete')).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('clears reset A validation state and summary focus before rendering token B', async () => {
    const destination = '/reset-password?token=token-b';
    const renderObservations: ResetTokenRenderObservation[] = [];
    const { request } = renderAuth(
      '/reset-password?token=token-a',
      async () => {
        throw new ApiError({
          kind: 'validation',
          status: 422,
          message: 'HOSTILE_A_DETAIL',
          issues: [
            { location: ['body', 'token'], message: 'HOSTILE_A_TOKEN', type: 'private_rule' },
          ],
        });
      },
      {
        routerChild: (
          <RouteLayoutRaceProbe
            destination={destination}
            onDestinationLayout={() => {
              const submit = document.querySelector<HTMLButtonElement>(
                'main form button[type="submit"]',
              );
              renderObservations.push({
                confirmation: document.querySelector<HTMLInputElement>(
                  'input[name="passwordConfirmation"]',
                )?.value,
                hasAlert: document.querySelector('[role="alert"]') !== null,
                password: document.querySelector<HTMLInputElement>('input[name="newPassword"]')
                  ?.value,
                submitDisabled: submit?.disabled,
                submitText: submit?.textContent ?? undefined,
              });
            }}
          />
        ),
      },
    );
    const user = userEvent.setup();
    await screen.findByLabelText(/^New password/);
    await fillAuthForm('reset', user);
    await interact(() => user.click(screen.getByRole('button', { name: 'Reset password' })));

    const summary = await screen.findByRole('alert');
    expect(summary).toBe(document.activeElement);
    await interact(() =>
      user.click(screen.getByRole('button', { name: 'Commit route transition' })),
    );

    expect(renderObservations).toEqual([
      {
        confirmation: '',
        hasAlert: false,
        password: '',
        submitDisabled: false,
        submitText: 'Reset password',
      },
    ]);
    expect(screen.getByLabelText('location').textContent).toBe(destination);
    expect(screen.queryByRole('alert')).toBe(null);
    expect(document.getElementById('password-error')).toBe(null);
    expect(document.getElementById('passwordConfirmation-error')).toBe(null);
    expect((screen.getByLabelText(/^New password/) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^Confirm new password/) as HTMLInputElement).value).toBe('');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('projects technical auth errors before domain failures and uses summary focus for unmapped validation', async () => {
    for (const error of [
      new ApiError({ kind: 'server', status: 500, message: 'HOSTILE_500_DETAIL' }),
      new ApiError({ kind: 'http', status: 503, message: 'HOSTILE_503_DETAIL' }),
      new ApiError({ kind: 'invalid_response', status: 200, message: 'HOSTILE_INVALID_RESPONSE' }),
    ]) {
      const failure = mapAuthFailure(error, 'reset');
      expect(failure.summary).toEqual({ kind: 'request-failure' });
      expect(failure.fields).toEqual({});
    }

    const { request } = renderAuth('/reset-password?token=private-reset-token', async () => {
      throw new ApiError({
        kind: 'validation',
        status: 422,
        message: 'HOSTILE_VALIDATION_DETAIL',
        issues: [
          { location: ['body', 'token'], message: 'HOSTILE_TOKEN_DETAIL', type: 'private_rule' },
        ],
      });
    });
    const user = userEvent.setup();
    await screen.findByLabelText(/^New password/);
    await fillAuthForm('reset', user);
    await interact(() => user.click(screen.getByRole('button', { name: 'Reset password' })));

    const summary = await screen.findByRole('alert');
    expect(summary.textContent).toMatch(/could not process|try again/i);
    expect(summary.textContent).not.toContain('highlighted fields');
    expect(summary).toBe(document.activeElement);
    expect(screen.queryByText(/HOSTILE_(VALIDATION|TOKEN)_DETAIL/)).toBe(null);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each(['en', 'ru', 'uz'] as const)(
    'renders every DRAFT-21 auth residual consumer in %s without changing workflow behavior',
    async (locale) => {
      const copy = AUTH_RESIDUAL_COPY[locale];
      await act(() => localeRuntime.changeLanguage(locale));

      renderAuth('/login', async () => ({}));
      expect(screen.getByRole('link', { name: copy.createAnAccount })).not.toBe(null);
      expect(screen.getByRole('link', { name: copy.forgotPassword })).not.toBe(null);
      cleanup();

      renderAuth('/signup', async () => ({}));
      expect(within(screen.getByRole('main')).getByRole('link', { name: copy.logIn })).not.toBe(
        null,
      );
      expect(screen.getByRole('button', { name: copy.createAccount })).not.toBe(null);
      cleanup();

      renderAuth('/forgot-password?reason=missing-token', async () => ({ message: 'ok' }));
      expect(screen.getByText(copy.recoveryLink)).not.toBe(null);
      const forgotUser = userEvent.setup();
      const email = document.getElementById('email') as HTMLInputElement;
      await interact(() => forgotUser.type(email, 'learner@example.com'));
      await interact(() =>
        forgotUser.click(screen.getByRole('button', { name: copy.continueLabel })),
      );
      expect(await screen.findByText(copy.recoveryChannel)).not.toBe(null);
      cleanup();

      renderAuth('/reset-password?token=localized-reset-token', async () => ({ message: 'ok' }));
      expect(screen.getByText(copy.resetTokenHelp)).not.toBe(null);
      const user = userEvent.setup();
      const password = document.getElementById('password') as HTMLInputElement;
      const confirmation = document.getElementById('passwordConfirmation') as HTMLInputElement;
      await interact(() => user.type(password, 'new password'));
      await interact(() => user.type(confirmation, 'new password'));
      await interact(() => user.click(screen.getByRole('button', { name: copy.resetPassword })));
      await waitFor(() =>
        expect(within(screen.getByRole('main')).getByRole('status').textContent).toContain(
          copy.passwordUpdated,
        ),
      );
    },
  );

  it('re-resolves settled client validation in the current locale without resubmitting', async () => {
    renderAuth('/login', async () => ({}));
    const user = userEvent.setup();
    await screen.findByRole('button', { name: 'Log in' });

    await interact(() => user.click(screen.getByRole('button', { name: 'Log in' })));
    expect(document.getElementById('email-error')?.textContent).toBe('Email is required.');

    await act(() => localeRuntime.changeLanguage('ru'));
    expect(document.getElementById('email-error')?.textContent).toBe(
      'Поле «Электронная почта» обязательно.',
    );

    await act(() => localeRuntime.changeLanguage('uz'));
    expect(document.getElementById('email-error')?.textContent).toBe(
      '«Elektron pochta» maydonini to‘ldirish shart.',
    );
  });

  it('resolves a settled auth failure in the active locale without exposing private detail', async () => {
    renderAuth('/login', async () => {
      throw new ApiError({ kind: 'offline', status: null, message: 'PRIVATE_OFFLINE_DETAIL' });
    });
    const user = userEvent.setup();
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
    await interact(() => user.type(screen.getByLabelText(/^Password/), 'password'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Log in' })));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'You appear to be offline. Check your connection and submit again.',
    );
    await act(() => localeRuntime.changeLanguage('ru'));
    expect(screen.getByRole('alert').textContent).toBe(
      'Похоже, нет подключения к интернету. Проверьте соединение и отправьте форму снова.',
    );
    await act(() => localeRuntime.changeLanguage('uz'));
    expect(screen.getByRole('alert').textContent).toBe(
      'Internet aloqasi yo‘q ko‘rinadi. Ulanishni tekshirib, formani qayta yuboring.',
    );
    expect(screen.queryByText('PRIVATE_OFFLINE_DETAIL')).toBeNull();
  });

  it('settles a deferred public auth failure in the locale selected while the request is pending', async () => {
    const pendingRequest = createDeferred<unknown>();
    const { request } = renderAuth('/login', async (options) => {
      if (options.path !== '/login') throw new Error(`Unexpected path ${options.path}`);
      return pendingRequest.promise;
    });
    const user = userEvent.setup();
    await interact(() => user.type(screen.getByLabelText(/^Email/), 'learner@example.com'));
    await interact(() => user.type(screen.getByLabelText(/^Password/), 'password'));
    await interact(() => user.click(screen.getByRole('button', { name: 'Log in' })));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ authPolicy: 'public', path: '/login' }),
    );
    expect(screen.getByRole('button', { name: 'Logging in...' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.queryByRole('alert')).toBeNull();

    await act(() => localeRuntime.changeLanguage('ru'));
    expect(
      screen.getByRole('button', { name: 'Выполняется вход...' }).hasAttribute('disabled'),
    ).toBe(true);

    await act(async () => {
      pendingRequest.reject(
        new ApiError({ kind: 'offline', status: null, message: 'PRIVATE_DEFERRED_OFFLINE_DETAIL' }),
      );
      await Promise.resolve();
    });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(
      'Похоже, нет подключения к интернету. Проверьте соединение и отправьте форму снова.',
    );
    expect(alert).toBe(document.activeElement);
    expect(screen.queryByText(/PRIVATE_DEFERRED_OFFLINE_DETAIL/)).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Войти' }).hasAttribute('disabled')).toBe(false),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
});
