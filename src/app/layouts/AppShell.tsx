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

import { useSession, type SessionState } from '@features/auth-session';
import {
  addCatalogSearchHistory, parseCatalogQuery, persistCatalogSearchHistory,
  readCatalogSearchHistory, serializeCatalogQuery,
} from '@features/catalog-discovery';
import { Input, VisuallyHidden } from '@shared/ui/primitives';
import { useDensityMode } from '@shared/ui/theme';
import { APP_ROUTE_BY_ID, densityForPath, routeForPath } from '../router/route-registry';
import styles from './AppShell.module.css';

type NavigationItemVariant = 'browse-link' | 'signup-primary';
type NavigationItemDesktopGroup = 'auth-actions';
type MobileMenuFocusTarget = 'trigger' | 'main';

interface NavigationItem {
  label: string;
  to: string;
  end?: boolean;
  desktopGroup?: NavigationItemDesktopGroup;
  variant?: NavigationItemVariant;
}

interface NavigationLinksProps {
  items: readonly NavigationItem[];
  onNavigate?: (to: string) => void;
}

const NAVIGATION_VARIANT_CLASS: Record<NavigationItemVariant, string> = {
  'browse-link': styles.navLinkBrowse,
  'signup-primary': styles.navLinkSignup,
};

function navigationForSession(
  status: SessionState,
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

function NavigationLinks({ items, onNavigate }: NavigationLinksProps) {
  return (
    <ul className={styles.navList}>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            end={item.end}
            className={({ isActive }) => [
              styles.navLink,
              isActive ? styles.navLinkActive : null,
              item.variant ? NAVIGATION_VARIANT_CLASS[item.variant] : null,
            ].filter(Boolean).join(' ')}
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
  const routeFocusIdentity = `${location.pathname}${location.search}`;
  const previousRouteFocusIdentityRef = useRef(routeFocusIdentity);
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
  const desktopPrimaryNavigation = navigation.filter((item) => item.desktopGroup !== 'auth-actions');
  const desktopAuthActions = navigation.filter((item) => item.desktopGroup === 'auth-actions');
  const hasDesktopAuthActions = desktopAuthActions.length > 0;
  const catalogDesktopPrimaryNavigation = isAnonymousCatalogRoute
    ? desktopPrimaryNavigation
    : navigation;
  const catalogDesktopAccountNavigation = isAnonymousCatalogRoute
    ? desktopAuthActions
    : [];
  const routeDensityMode = densityForPath(location.pathname);
  const documentTitle = route ? `${route.title} | LearnHub` : 'LearnHub';

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
      const routeChanged = previousRouteFocusIdentityRef.current !== routeFocusIdentity;
      restoreCatalogSearchFocusRef.current = false;
      if (restoreCatalogSearchFocus) {
        scheduleFocus(() => catalogSearchRef.current?.focus());
      } else if (routeChanged) {
        scheduleFocus(() => mainRef.current?.focus());
      }
      previousLocationRef.current = currentLocation;
      previousRouteFocusIdentityRef.current = routeFocusIdentity;
    }
  }, [currentLocation, routeFocusIdentity]);

  function scheduleFocus(focus: () => void) {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(focus);
    } else {
      globalThis.setTimeout(focus, 0);
    }
  }

  function closeMobileMenu(focusTarget: MobileMenuFocusTarget) {
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
  const catalogSearchListboxVisible = catalogSearchOpen && catalogSearchMatches.length > 0;

  useEffect(() => {
    if (!catalogSearchListboxVisible) return undefined;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!catalogSearchWrapperRef.current?.contains(event.target as Node)) {
        setCatalogSearchOpen(false);
        setActiveCatalogSearchIndex(null);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
  }, [catalogSearchListboxVisible]);

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
    <div className={styles.shell} data-layout={layout}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <header
        className={[
          styles.header,
          isCatalogRoute ? styles.headerCatalog : null,
          isAnonymousCatalogRoute ? styles.headerAnonymousCatalog : null,
        ].filter(Boolean).join(' ')}
        data-app-shell-header
      >
        <div className={styles.headerInner}>
          <div className={styles.headerCatalogStart}>
            <Link className={styles.brand} to="/" aria-label="LearnHub home">
              <svg
                aria-hidden="true"
                className={styles.brandMark}
                focusable="false"
                viewBox="0 0 32 32"
              >
                <rect className={styles.brandMarkOutline} x="2" y="2" width="28" height="28" rx="6" />
                <path
                  className={styles.brandMarkBook}
                  d="M5.5 8.5c3.4.6 6.3 1.8 9.5 3.7v13.2c-3.2-1.9-6.4-3-9.5-3.4V8.5Zm21 0c-3.4.6-6.3 1.8-9.5 3.7v13.2c3.2-1.9 6.4-3 9.5-3.4V8.5Z"
                />
              </svg>
              <span className={styles.brandWordmark}>LearnHub</span>
            </Link>
            <nav
              className={hasDesktopAuthActions && !isAnonymousCatalogRoute
                ? [styles.navDesktop, styles.navDesktopSplit].join(' ')
                : styles.navDesktop}
              aria-label="Primary navigation"
            >
              <NavigationLinks items={isAnonymousCatalogRoute
                ? catalogDesktopPrimaryNavigation
                : desktopPrimaryNavigation}
              />
              {hasDesktopAuthActions && !isAnonymousCatalogRoute ? (
                <div className={styles.navAuthActions}>
                  <NavigationLinks items={desktopAuthActions} />
                </div>
              ) : null}
            </nav>
          </div>
          {isCatalogRoute ? (
            <form
              className={styles.catalogSearch}
              role="search"
              aria-label="Course catalog search"
              onSubmit={(event) => {
                event.preventDefault();
                submitCatalogSearch(activeCatalogSearchTerm);
              }}
            >
              <div ref={catalogSearchWrapperRef} className={styles.catalogSearchField}>
                <Input
                  ref={catalogSearchRef}
                  label={<VisuallyHidden>Search courses</VisuallyHidden>}
                  fieldClassName={styles.catalogSearchPrimitiveField}
                  className={styles.catalogSearchInput}
                  name="search_query"
                  type="search"
                  value={catalogSearchDraft}
                  placeholder="Search courses, topics, or instructors"
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls={catalogSearchListboxVisible ? catalogSearchListboxId : undefined}
                  aria-expanded={catalogSearchListboxVisible}
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
                <svg className={styles.catalogSearchIcon} aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                  <path d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
                {catalogSearchListboxVisible ? (
                  <div className={styles.catalogSearchListbox} id={catalogSearchListboxId} role="listbox" aria-label="Recent searches">
                    {catalogSearchMatches.map((term, index) => (
                      <div
                        key={term.toLocaleLowerCase()}
                        id={`${catalogSearchListboxId}-option-${index}`}
                        className={styles.catalogSearchOption}
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
          <div className={styles.headerCatalogEnd}>
            {isAnonymousCatalogRoute ? (
              <nav className={[styles.navDesktop, styles.navCatalogAccount].join(' ')} aria-label="Account navigation">
                <NavigationLinks items={catalogDesktopAccountNavigation} />
              </nav>
            ) : null}
            <div className={state.status === 'authenticated'
              ? state.user.role === 'instructor'
                ? [styles.account, styles.accountInstructor].join(' ')
                : styles.account
              : [styles.account, styles.accountAnonymous].join(' ')}>
              {state.status === 'authenticated' ? (
                <span title={state.user.email}>{state.user.name} - {state.user.role}</span>
              ) : null}
              <button
                ref={menuButtonRef}
                className={styles.menuButton}
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
                <VisuallyHidden>{mobileOpen ? 'Close navigation' : 'Open navigation'}</VisuallyHidden>
              </button>
            </div>
          </div>
        </div>
        {mobileOpen ? (
          <nav
            id="mobile-navigation"
            className={styles.navMobile}
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
      <main
        ref={mainRef}
        className={[
          styles.main,
          isCatalogRoute ? styles.mainCatalog : null,
          layout === 'workspace' ? styles.mainWorkspace : null,
          layout === 'auth' ? styles.mainAuth : null,
        ].filter(Boolean).join(' ')}
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <span>(c) 2026 LearnHub</span>
        <span>Accessible learning, built for every role.</span>
      </footer>
    </div>
  );
}
