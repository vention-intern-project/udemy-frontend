import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, matchPath, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useSession } from '@features/auth-session';
import { useDensityMode } from '@shared/ui/theme';
import { APP_ROUTE_BY_ID, densityForPath, routeForPath } from '../router/route-registry';

type NavigationItemVariant = 'browse-link' | 'signup-primary';

interface NavigationItem {
  label: string;
  to: string;
  end?: boolean;
  desktopGroup?: 'auth-actions';
  variant?: NavigationItemVariant;
}

function navigationForSession(
  status: ReturnType<typeof useSession>['state'],
  selectedCourseId: string | null,
): NavigationItem[] {
  if (status.status !== 'authenticated') {
    return [
      { label: 'Browse courses', to: '/', end: true, variant: 'browse-link' },
      { label: 'Log in', to: '/login', end: true, desktopGroup: 'auth-actions' },
      {
        label: 'Sign up',
        to: '/signup',
        end: true,
        desktopGroup: 'auth-actions',
        variant: 'signup-primary',
      },
    ];
  }
  if (status.user.role === 'student') {
    return [
      { label: 'Cart', to: '/cart', end: true },
      { label: 'My learning', to: '/learning', end: true },
    ];
  }
  if (status.user.role === 'instructor') {
    const items: NavigationItem[] = [
      { label: 'Instructor courses', to: '/instructor/courses', end: true },
    ];
    if (selectedCourseId) {
      items.push({
        label: 'Course enrollments',
        to: `/instructor/courses/${encodeURIComponent(selectedCourseId)}/enrollments`,
        end: true,
      });
    }
    return items;
  }
  return [];
}

function NavigationLinks({ items, onNavigate }: {
  items: readonly NavigationItem[];
  onNavigate?: (to: string) => void;
}) {
  return (
    <ul className="app-nav__list">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            end={item.end}
            className={({ isActive }) => [
              'app-nav__link',
              isActive ? 'app-nav__link--active' : null,
              item.variant ? `app-nav__link--${item.variant}` : null,
            ].filter(Boolean).join(' ')}
            onClick={() => onNavigate?.(item.to)}
            to={item.to}
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function AppShell() {
  const { state } = useSession();
  const { densityMode, setDensityMode } = useDensityMode();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const routeFocusIdentity = `${location.pathname}${location.search}`;
  const previousRouteFocusIdentityRef = useRef(routeFocusIdentity);
  const courseRouteMatch = [
    APP_ROUTE_BY_ID['PAGE-011'].path,
    APP_ROUTE_BY_ID['PAGE-012'].path,
  ].map((path) => matchPath({ path, end: true }, location.pathname))
    .find((match) => match?.params.courseId);
  const navigation = navigationForSession(state, courseRouteMatch?.params.courseId ?? null);
  const desktopPrimaryNavigation = navigation.filter((item) => item.desktopGroup !== 'auth-actions');
  const desktopAuthActions = navigation.filter((item) => item.desktopGroup === 'auth-actions');
  const hasDesktopAuthActions = desktopAuthActions.length > 0;
  const layout = routeForPath(location.pathname)?.layout ?? 'public';
  const routeDensityMode = densityForPath(location.pathname);

  useLayoutEffect(() => {
    if (densityMode !== routeDensityMode) setDensityMode(routeDensityMode);
  }, [densityMode, routeDensityMode, setDensityMode]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const root = document.documentElement;
    const main = mainRef.current;
    const syncAuthScrollbarOffset = () => {
      const rootRect = root.getBoundingClientRect();
      const hasRenderedRootBox = Number.isFinite(rootRect.left)
        && Number.isFinite(rootRect.right)
        && Number.isFinite(rootRect.width)
        && rootRect.width > 0;
      const signedOffset = hasRenderedRootBox
        ? window.innerWidth / 2 - (rootRect.left + rootRect.right) / 2
        : 0;
      main?.style.setProperty(
        '--auth-physical-scrollbar-offset',
        `${Number.isFinite(signedOffset) ? signedOffset : 0}px`,
      );
    };

    const directionObserver = new MutationObserver(syncAuthScrollbarOffset);
    directionObserver.observe(root, { attributes: true, attributeFilter: ['dir'] });
    window.addEventListener('resize', syncAuthScrollbarOffset);
    syncAuthScrollbarOffset();
    return () => {
      window.removeEventListener('resize', syncAuthScrollbarOffset);
      directionObserver.disconnect();
      main?.style.removeProperty('--auth-physical-scrollbar-offset');
    };
  }, []);

  useEffect(() => {
    if (previousRouteFocusIdentityRef.current !== routeFocusIdentity) {
      setMobileOpen(false);
      scheduleFocus(() => mainRef.current?.focus());
      previousRouteFocusIdentityRef.current = routeFocusIdentity;
    }
  }, [routeFocusIdentity]);

  function scheduleFocus(focus: () => void) {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(focus);
    } else {
      globalThis.setTimeout(focus, 0);
    }
  }

  function closeMobileMenu(focusTarget: 'trigger' | 'main') {
    setMobileOpen(false);
    scheduleFocus(() => {
      if (focusTarget === 'trigger') menuButtonRef.current?.focus();
      else mainRef.current?.focus();
    });
  }

  return (
    <div className={`app-shell app-shell--${layout}`} data-layout={layout}>
      <a className="app-skip-link" href="#main-content">Skip to main content</a>
      <header className="app-header">
        <div className="app-header__inner">
          <Link className="app-brand" to="/" aria-label="LearnHub home">
            <svg
              aria-hidden="true"
              className="app-brand__mark"
              focusable="false"
              viewBox="0 0 32 32"
            >
              <rect className="app-brand__mark-outline" x="2" y="2" width="28" height="28" rx="6" />
              <path
                className="app-brand__mark-book"
                d="M5.5 8.5c3.4.6 6.3 1.8 9.5 3.7v13.2c-3.2-1.9-6.4-3-9.5-3.4V8.5Zm21 0c-3.4.6-6.3 1.8-9.5 3.7v13.2c3.2-1.9 6.4-3 9.5-3.4V8.5Z"
              />
            </svg>
            <span className="app-brand__wordmark">LearnHub</span>
          </Link>
          <nav
            className={hasDesktopAuthActions
              ? 'app-nav app-nav--desktop app-nav--desktop-split'
              : 'app-nav app-nav--desktop'}
            aria-label="Primary navigation"
          >
            <NavigationLinks items={desktopPrimaryNavigation} />
            {hasDesktopAuthActions ? (
              <div className="app-nav__auth-actions">
                <NavigationLinks items={desktopAuthActions} />
              </div>
            ) : null}
          </nav>
          <div className={state.status === 'authenticated'
            ? state.user.role === 'instructor'
              ? 'app-account app-account--instructor'
              : 'app-account'
            : 'app-account app-account--anonymous'}>
            {state.status === 'authenticated' ? (
              <span title={state.user.email}>{state.user.name} - {state.user.role}</span>
            ) : null}
            <button
              ref={menuButtonRef}
              className="app-menu-button"
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileOpen((open) => !open)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && mobileOpen) {
                  event.preventDefault();
                  closeMobileMenu('trigger');
                }
              }}
            >
              <span aria-hidden="true">Menu</span>
              <span className="ui-sr-only">{mobileOpen ? 'Close navigation' : 'Open navigation'}</span>
            </button>
          </div>
        </div>
        {mobileOpen ? (
          <nav
            id="mobile-navigation"
            className="app-nav app-nav--mobile"
            aria-label="Mobile navigation"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeMobileMenu('trigger');
              }
            }}
          >
            <NavigationLinks
              items={navigation}
              onNavigate={(to) => closeMobileMenu(to === routeFocusIdentity ? 'trigger' : 'main')}
            />
          </nav>
        ) : null}
      </header>
      <main ref={mainRef} className="app-main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>(c) 2026 LearnHub</span>
        <span>Accessible learning, built for every role.</span>
      </footer>
    </div>
  );
}
