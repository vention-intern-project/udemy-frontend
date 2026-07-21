import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, matchPath, NavLink, Outlet, useLocation } from 'react-router-dom';

import { useSession } from '../../features/auth-session';
import { useDensityMode } from '../../shared/ui/theme';
import { APP_ROUTE_BY_ID, densityForPath, routeForPath } from '../router/route-registry';

interface NavigationItem {
  label: string;
  to: string;
  end?: boolean;
}

function navigationForSession(
  status: ReturnType<typeof useSession>['state'],
  selectedCourseId: string | null,
): NavigationItem[] {
  if (status.status !== 'authenticated') {
    return [
      { label: 'Browse courses', to: '/', end: true },
      { label: 'Sign up', to: '/signup', end: true },
      { label: 'Log in', to: '/login', end: true },
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
            className={({ isActive }) => isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'}
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
  const currentLocation = `${location.pathname}${location.search}${location.hash}`;
  const previousLocationRef = useRef(currentLocation);
  const courseRouteMatch = [
    APP_ROUTE_BY_ID['PAGE-011'].path,
    APP_ROUTE_BY_ID['PAGE-012'].path,
  ].map((path) => matchPath({ path, end: true }, location.pathname))
    .find((match) => match?.params.courseId);
  const navigation = navigationForSession(state, courseRouteMatch?.params.courseId ?? null);
  const layout = routeForPath(location.pathname)?.layout ?? 'public';
  const routeDensityMode = densityForPath(location.pathname);

  useLayoutEffect(() => {
    if (densityMode !== routeDensityMode) setDensityMode(routeDensityMode);
  }, [densityMode, routeDensityMode, setDensityMode]);

  useEffect(() => {
    if (previousLocationRef.current !== currentLocation) {
      setMobileOpen(false);
      scheduleFocus(() => mainRef.current?.focus());
      previousLocationRef.current = currentLocation;
    }
  }, [currentLocation]);

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
            <span aria-hidden="true" className="app-brand__mark">L</span>
            LearnHub
          </Link>
          <nav className="app-nav app-nav--desktop" aria-label="Primary navigation">
            <NavigationLinks items={navigation} />
          </nav>
          <div className="app-account">
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
              onNavigate={(to) => closeMobileMenu(to === currentLocation ? 'trigger' : 'main')}
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
