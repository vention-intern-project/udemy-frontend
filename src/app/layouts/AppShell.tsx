import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type MouseEvent,
} from 'react';
import { Link, matchPath, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useSession } from '../../features/auth-session';
import {
  addCatalogSearchHistory, parseCatalogQuery, persistCatalogSearchHistory,
  readCatalogSearchHistory, serializeCatalogQuery,
} from '../../features/catalog-discovery';
import { Input } from '../../shared/ui/primitives';
import { useDensityMode } from '../../shared/ui/theme';
import { APP_ROUTE_BY_ID, routeForPath } from '../router/route-registry';

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
            onClick={(event) => {
              if (isCurrentTabNavigation(event)) onNavigate?.(item.to);
            }}
            to={item.to}
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function isCurrentTabNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  const target = event.currentTarget.getAttribute('target');
  return !event.defaultPrevented
    && event.button === 0
    && !event.metaKey
    && !event.ctrlKey
    && !event.shiftKey
    && !event.altKey
    && (!target || target.toLowerCase() === '_self')
    && !event.currentTarget.hasAttribute('download');
}

export function AppShell() {
  const { state } = useSession();
  const { densityMode, setDensityMode } = useDensityMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const catalogQuery = useMemo(() => parseCatalogQuery(new URLSearchParams(location.search)), [location.search]);
  const [catalogSearchDraft, setCatalogSearchDraft] = useState(catalogQuery.search_query ?? '');
  const [catalogSearchHistory, setCatalogSearchHistory] = useState(() => readCatalogSearchHistory());
  const [catalogSearchOpen, setCatalogSearchOpen] = useState(false);
  const [activeCatalogSearchIndex, setActiveCatalogSearchIndex] = useState<number | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const catalogSearchRef = useRef<HTMLInputElement>(null);
  const catalogSearchWrapperRef = useRef<HTMLDivElement>(null);
  const restoreCatalogSearchFocusRef = useRef(false);
  const catalogSearchListboxId = `catalog-search-history-${useId()}`;
  const currentLocation = `${location.pathname}${location.search}${location.hash}`;
  const previousLocationRef = useRef(currentLocation);
  const courseRouteMatch = [
    APP_ROUTE_BY_ID['PAGE-011'].path,
    APP_ROUTE_BY_ID['PAGE-012'].path,
  ].map((path) => matchPath({ path, end: true }, location.pathname))
    .find((match) => match?.params.courseId);
  const navigation = navigationForSession(state, courseRouteMatch?.params.courseId ?? null);
  const route = routeForPath(location.pathname);
  const layout = route?.layout ?? 'public';
  const isCatalogRoute = route?.id === 'PAGE-001';
  const isAnonymousCatalogRoute = isCatalogRoute && state.status !== 'authenticated';
  const catalogDesktopPrimaryNavigation = isAnonymousCatalogRoute
    ? navigation.filter((item) => item.label === 'Browse courses')
    : navigation;
  const catalogDesktopAccountNavigation = isAnonymousCatalogRoute
    ? [
      ...navigation.filter((item) => item.label === 'Log in'),
      ...navigation.filter((item) => item.label === 'Sign up'),
    ]
    : [];
  const routeDensityMode = route?.layout === 'workspace' ? 'workspace' : 'marketplace';
  const documentTitle = route ? `${route.title} | LearnHub` : 'LearnHub';

  useLayoutEffect(() => {
    if (densityMode !== routeDensityMode) setDensityMode(routeDensityMode);
  }, [densityMode, routeDensityMode, setDensityMode]);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  useEffect(() => {
    if (!isCatalogRoute) return;
    setCatalogSearchDraft(catalogQuery.search_query ?? '');
    setCatalogSearchOpen(false);
    setActiveCatalogSearchIndex(null);
  }, [catalogQuery.search_query, isCatalogRoute]);

  useEffect(() => {
    if (!isCatalogRoute) return;
    setCatalogSearchHistory(readCatalogSearchHistory());
  }, [isCatalogRoute]);

  useEffect(() => {
    if (previousLocationRef.current !== currentLocation) {
      setMobileOpen(false);
      const restoreCatalogSearchFocus = restoreCatalogSearchFocusRef.current;
      restoreCatalogSearchFocusRef.current = false;
      scheduleFocus(() => {
        if (restoreCatalogSearchFocus) catalogSearchRef.current?.focus();
        else mainRef.current?.focus();
      });
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

  const catalogSearchMatches = useMemo(() => {
    const draft = catalogSearchDraft.trim().toLocaleLowerCase();
    return draft
      ? catalogSearchHistory.filter((term) => term.toLocaleLowerCase().includes(draft))
      : catalogSearchHistory;
  }, [catalogSearchDraft, catalogSearchHistory]);
  const activeCatalogSearchTerm = activeCatalogSearchIndex === null
    ? undefined
    : catalogSearchMatches[activeCatalogSearchIndex];

  useEffect(() => {
    if (!catalogSearchOpen) return undefined;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!catalogSearchWrapperRef.current?.contains(event.target as Node)) {
        setCatalogSearchOpen(false);
        setActiveCatalogSearchIndex(null);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [catalogSearchOpen]);

  function closeCatalogSearchList() {
    setCatalogSearchOpen(false);
    setActiveCatalogSearchIndex(null);
  }

  function rememberCatalogSearch(term: string) {
    const nextHistory = addCatalogSearchHistory(catalogSearchHistory, term);
    if (nextHistory.length === 0) return;
    setCatalogSearchHistory(nextHistory);
    persistCatalogSearchHistory(nextHistory);
  }

  function submitCatalogSearch(value = catalogSearchDraft) {
    const submittedSearch = value.trim();
    const next = {
      ...catalogQuery,
      search_query: submittedSearch || undefined,
      page: 1,
    };
    const nextSearch = serializeCatalogQuery(next);
    const currentCanonicalSearch = serializeCatalogQuery(catalogQuery);
    setCatalogSearchDraft(next.search_query ?? '');
    if (submittedSearch) rememberCatalogSearch(submittedSearch);
    closeCatalogSearchList();
    if (nextSearch === currentCanonicalSearch && location.search === (nextSearch ? `?${nextSearch}` : '')) return;

    restoreCatalogSearchFocusRef.current = true;
    navigate({
      pathname: location.pathname,
      search: nextSearch ? `?${nextSearch}` : '',
      hash: location.hash,
    });
  }

  return (
    <div className={`app-shell app-shell--${layout}`} data-layout={layout}>
      <a className="app-skip-link" href="#main-content">Skip to main content</a>
      <header className={`app-header${isCatalogRoute ? ' app-header--catalog' : ''}${isAnonymousCatalogRoute ? ' app-header--anonymous-catalog' : ''}`}>
        <div className="app-header__inner">
          <div className="app-header__catalog-start">
            <Link className="app-brand" to="/" aria-label="LearnHub home">
              <span aria-hidden="true" className="app-brand__mark">L</span>
              LearnHub
            </Link>
            <nav className="app-nav app-nav--desktop" aria-label="Primary navigation">
              <NavigationLinks items={catalogDesktopPrimaryNavigation} />
            </nav>
          </div>
          {isCatalogRoute ? (
            <form
              className="app-catalog-search"
              role="search"
              aria-label="Course catalog search"
              onSubmit={(event) => {
                event.preventDefault();
                submitCatalogSearch(activeCatalogSearchTerm);
              }}
            >
              <div ref={catalogSearchWrapperRef} className="app-catalog-search__field">
                <Input
                  ref={catalogSearchRef}
                  label={<span className="ui-sr-only">Search courses</span>}
                  name="search_query"
                  type="search"
                  value={catalogSearchDraft}
                  placeholder="Search courses, topics, or instructors"
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={catalogSearchOpen && catalogSearchMatches.length > 0 ? catalogSearchListboxId : undefined}
                  aria-expanded={catalogSearchOpen && catalogSearchMatches.length > 0}
                  aria-activedescendant={activeCatalogSearchTerm
                    ? `${catalogSearchListboxId}-option-${activeCatalogSearchIndex}`
                    : undefined}
                  onBlur={(event) => {
                    if (!catalogSearchWrapperRef.current?.contains(event.relatedTarget)) {
                      closeCatalogSearchList();
                    }
                  }}
                  onFocus={() => {
                    setCatalogSearchOpen(catalogSearchMatches.length > 0);
                    setActiveCatalogSearchIndex(null);
                  }}
                  onChange={(event) => {
                    setCatalogSearchDraft(event.target.value);
                    setCatalogSearchOpen(catalogSearchHistory.length > 0);
                    setActiveCatalogSearchIndex(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      closeCatalogSearchList();
                      return;
                    }
                    if (catalogSearchMatches.length === 0) return;
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setCatalogSearchOpen(true);
                      setActiveCatalogSearchIndex((index) => index === null
                        ? 0
                        : Math.min(index + 1, catalogSearchMatches.length - 1));
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setCatalogSearchOpen(true);
                      setActiveCatalogSearchIndex((index) => index === null
                        ? catalogSearchMatches.length - 1
                        : Math.max(index - 1, 0));
                    }
                  }}
                />
                <svg className="app-catalog-search__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                  <path d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
                {catalogSearchOpen && catalogSearchMatches.length > 0 ? (
                  <div className="app-catalog-search__listbox" id={catalogSearchListboxId} role="listbox" aria-label="Recent searches">
                    {catalogSearchMatches.map((term, index) => (
                      <div
                        key={term.toLocaleLowerCase()}
                        id={`${catalogSearchListboxId}-option-${index}`}
                        className="app-catalog-search__option"
                        role="option"
                        aria-selected={activeCatalogSearchIndex === index}
                        tabIndex={-1}
                        onPointerDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveCatalogSearchIndex(index)}
                        onClick={() => submitCatalogSearch(term)}
                      >
                        {term}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </form>
          ) : null}
          <div className="app-header__catalog-end">
            {isAnonymousCatalogRoute ? (
              <nav className="app-nav app-nav--desktop app-nav--catalog-account" aria-label="Account navigation">
                <NavigationLinks items={catalogDesktopAccountNavigation} />
              </nav>
            ) : null}
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
      <main ref={mainRef} className={`app-main${isCatalogRoute ? ' app-main--catalog' : ''}`} id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>(c) 2026 LearnHub</span>
        <span>Accessible learning, built for every role.</span>
      </footer>
    </div>
  );
}
