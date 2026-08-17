import { useEffect, useLayoutEffect, useMemo, useRef, useState, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, GraduationCap, LibraryBig, LogIn, ShoppingCart, UserPlus } from 'lucide-react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';

import type { Cart } from '@entities/cart';
import { useSession } from '@features/auth-session';
import { cartQueryKey, requestCart } from '@features/cart-workflow';
import {
  addCatalogSearchHistory,
  parseCatalogQuery,
  persistCatalogSearchHistory,
  readCatalogSearchHistory,
  serializeCatalogQuery,
} from '@features/catalog-discovery';
import { Input, VisuallyHidden } from '@shared/ui/primitives';
import { useDensityMode } from '@shared/ui/theme';
import { CourseChatLauncher } from '@widgets/course-chat';
import learnHubBookMark from './assets/learnhub-book-ui018.png';
import { AccountMenu } from './AccountMenu';
import {
  assistantNavigationTarget,
  cartNavigationState,
  catalogPageForLocation,
  isCurrentTabNavigation,
  navigationForSession,
  type NavigationItem,
  type NavigationItemVariant,
} from './app-shell-navigation';
import { focusInstructorCourseTitle, scheduleAppShellFocus } from './app-shell-focus';
import { densityForPath, routeForPath } from '../router/route-registry';
import styles from './AppShell.module.css';

type MobileMenuFocusTarget = 'trigger' | 'main';

const STUDENT_MOBILE_QUERY = '(max-width: 767px)';
const INSTRUCTOR_COURSE_TITLE_ID = 'instructor-course-title';

interface CartPresentation {
  accessibleName: string;
  badge: string | null;
}

interface ScrollPosition {
  left: number;
  top: number;
}

export function presentCart(itemCount: number | undefined): CartPresentation {
  if (itemCount === undefined) return { accessibleName: 'Cart', badge: null };
  const badge = itemCount >= 100 ? '99+' : String(itemCount);
  return { accessibleName: `Cart (${badge})`, badge };
}

interface NavigationLinksProps {
  items: readonly NavigationItem[];
  onNavigate?: (to: string) => void;
  showPrimaryNavigationIndicator?: boolean;
}

const NAVIGATION_VARIANT_CLASS: Record<NavigationItemVariant, string> = {
  'browse-link': styles.navLinkBrowse,
  'login-secondary': styles.navLinkLogin,
  'signup-primary': styles.navLinkSignup,
};

interface CartNavigationLinkProps {
  itemCount: number | undefined;
}

function CartNavigationLink({ itemCount }: CartNavigationLinkProps) {
  const presentation = presentCart(itemCount);
  const location = useLocation();
  return (
    <NavLink
      aria-label={presentation.accessibleName}
      className={({ isActive }) =>
        [styles.cartLink, isActive ? styles.cartLinkActive : null].filter(Boolean).join(' ')
      }
      end
      state={cartNavigationState(location)}
      to="/cart"
    >
      <ShoppingCart aria-hidden="true" focusable="false" size={26} strokeWidth={1.75} />
      {presentation.badge ? <span className={styles.cartBadge}>{presentation.badge}</span> : null}
    </NavLink>
  );
}

function AiAssistantNavigationLink() {
  const location = useLocation();
  const target = assistantNavigationTarget(location);
  const tooltipId = `ai-assistant-tooltip-${useId()}`;
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isTooltipFocused, setIsTooltipFocused] = useState(false);
  const [isTooltipEscapeDismissed, setIsTooltipEscapeDismissed] = useState(false);

  function clearTooltipTimer() {
    if (tooltipTimerRef.current !== null) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  }

  useEffect(() => {
    clearTooltipTimer();
    setIsTooltipVisible(false);
    setIsTooltipFocused(false);
    setIsTooltipEscapeDismissed(false);
    return clearTooltipTimer;
  }, [location.hash, location.pathname, location.search]);

  function openTooltipAfterPointerDelay() {
    if (isTooltipEscapeDismissed) return;
    clearTooltipTimer();
    tooltipTimerRef.current = setTimeout(() => {
      setIsTooltipVisible(true);
      tooltipTimerRef.current = null;
    }, 500);
  }

  function closeTooltipAfterPointerLeave() {
    clearTooltipTimer();
    if (!isTooltipFocused) setIsTooltipVisible(false);
  }

  function openTooltipOnFocus() {
    clearTooltipTimer();
    setIsTooltipFocused(true);
    if (!isTooltipEscapeDismissed) setIsTooltipVisible(true);
  }

  function closeTooltipOnBlur() {
    clearTooltipTimer();
    setIsTooltipVisible(false);
    setIsTooltipFocused(false);
    setIsTooltipEscapeDismissed(false);
  }

  return (
    <NavLink
      aria-label="Open AI assistant"
      aria-describedby={isTooltipVisible ? tooltipId : undefined}
      className={({ isActive }) =>
        [styles.aiAssistantLink, isActive ? styles.aiAssistantLinkActive : null]
          .filter(Boolean)
          .join(' ')
      }
      onBlur={closeTooltipOnBlur}
      onFocus={openTooltipOnFocus}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        clearTooltipTimer();
        setIsTooltipVisible(false);
        setIsTooltipEscapeDismissed(true);
      }}
      onPointerEnter={openTooltipAfterPointerDelay}
      onPointerLeave={closeTooltipAfterPointerLeave}
      state={target.state}
      to={target.to}
    >
      <Bot aria-hidden="true" focusable="false" size={24} strokeWidth={1.75} />
      {isTooltipVisible ? (
        <span id={tooltipId} className={styles.aiAssistantTooltip} role="tooltip">
          AI assistant
        </span>
      ) : null}
    </NavLink>
  );
}

function StudentMobileNavigation({ itemCount }: CartNavigationLinkProps) {
  const location = useLocation();
  const assistantTarget = assistantNavigationTarget(location);
  const cartState = cartNavigationState(location);
  const cartPresentation = presentCart(itemCount);
  return (
    <nav className={styles.studentMobileNavigation} aria-label="Student navigation">
      <NavLink className={styles.studentMobileNavigationLink} end to="/">
        <LibraryBig aria-hidden="true" focusable="false" size={20} />
        <span>Catalog</span>
      </NavLink>
      <NavLink className={styles.studentMobileNavigationLink} end to="/learning">
        <GraduationCap aria-hidden="true" focusable="false" size={20} />
        <span>My learning</span>
      </NavLink>
      <NavLink
        className={styles.studentMobileNavigationLink}
        end
        state={assistantTarget.state}
        to={assistantTarget.to}
      >
        <Bot aria-hidden="true" focusable="false" size={20} />
        <span>AI chat</span>
      </NavLink>
      <NavLink
        aria-label={cartPresentation.accessibleName}
        className={styles.studentMobileNavigationLink}
        end
        state={cartState}
        to="/cart"
      >
        <span className={styles.studentMobileCartIcon}>
          <ShoppingCart aria-hidden="true" focusable="false" size={20} />
          {cartPresentation.badge ? (
            <span className={styles.studentMobileCartBadge}>{cartPresentation.badge}</span>
          ) : null}
        </span>
        <span>Cart</span>
      </NavLink>
    </nav>
  );
}

function AnonymousMobileNavigation() {
  return (
    <nav className={styles.anonymousMobileNavigation} aria-label="Anonymous navigation">
      <NavLink className={styles.anonymousMobileNavigationLink} end to="/">
        <LibraryBig aria-hidden="true" focusable="false" size={20} />
        <span>Catalog</span>
      </NavLink>
      <NavLink className={styles.anonymousMobileNavigationLink} end to="/login">
        <LogIn aria-hidden="true" focusable="false" size={20} />
        <span>Log in</span>
      </NavLink>
      <NavLink className={styles.anonymousMobileNavigationLink} end to="/signup">
        <UserPlus aria-hidden="true" focusable="false" size={20} />
        <span>Sign up</span>
      </NavLink>
    </nav>
  );
}

function NavigationLinks({
  items,
  onNavigate,
  showPrimaryNavigationIndicator = false,
}: NavigationLinksProps) {
  return (
    <ul className={styles.navList}>
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            end={item.end}
            className={({ isActive }) =>
              [
                styles.navLink,
                isActive ? styles.navLinkActive : null,
                showPrimaryNavigationIndicator && item.primaryNavigationIndicator
                  ? styles.navLinkPrimary
                  : null,
                item.to === '/' || item.to === '/learning'
                  ? styles.navLinkPrimaryInteractive
                  : null,
                item.variant ? NAVIGATION_VARIANT_CLASS[item.variant] : null,
              ]
                .filter(Boolean)
                .join(' ')
            }
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

export function AppShell() {
  const session = useSession();
  const { cacheEpoch, state } = session;
  const cartSubject =
    state.status === 'authenticated' && state.user.role === 'student' ? (cacheEpoch ?? null) : null;
  const hasCartNavigation = state.status === 'anonymous' || cartSubject !== null;
  const cart = useQuery<Cart>({
    queryKey: cartSubject ? cartQueryKey(cartSubject) : ['disabled', 'app-shell-cart'],
    queryFn: ({ signal }) => requestCart(session, signal),
    enabled: cartSubject !== null,
  });
  const { densityMode, setDensityMode } = useDensityMode();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isStudentMobileViewport, setIsStudentMobileViewport] = useState(false);
  const [isMobileCatalogScrolled, setIsMobileCatalogScrolled] = useState(false);
  const catalogQuery = useMemo(
    () => parseCatalogQuery(new URLSearchParams(location.search)),
    [location.search],
  );
  const [catalogSearchDraft, setCatalogSearchDraft] = useState(catalogQuery.search_query ?? '');
  const [catalogSearchHistory, setCatalogSearchHistory] = useState(() =>
    readCatalogSearchHistory(),
  );
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
  const previousScrollLocationRef = useRef(location);
  const entryScrollPositionsRef = useRef(new Map<string, ScrollPosition>());
  const routeFocusIdentity = `${location.pathname}${location.search}`;
  const previousRouteFocusIdentityRef = useRef(routeFocusIdentity);
  const navigation = navigationForSession(state);
  const route = routeForPath(location.pathname);
  const layout = route?.layout ?? 'public';
  const isCatalogRoute = route?.id === 'PAGE-001';
  const isInstructorCoursesRoute = route?.id === 'PAGE-010';
  const isAnonymous = state.status !== 'authenticated';
  const isInstructor = state.status === 'authenticated' && state.user.role === 'instructor';
  const brandDestination = isInstructor ? '/instructor/courses' : '/';
  const hasCatalogSearch =
    isCatalogRoute ||
    (state.status === 'authenticated' && state.user.role === 'student' && layout === 'workspace');
  const isAnonymousCatalogRoute = isCatalogRoute && isAnonymous;
  const launcherRouteIds = new Set(['PAGE-001', 'PAGE-002', 'PAGE-007', 'PAGE-008']);
  const hasGlobalAssistant = route !== undefined && launcherRouteIds.has(route.id);
  const globalAssistant =
    state.status === 'authenticated' && state.user.role === 'student'
      ? { context: { kind: 'general' as const } }
      : null;
  const desktopPrimaryNavigation = navigation.filter(
    (item) => item.desktopGroup !== 'auth-actions',
  );
  const desktopAuthActions = navigation.filter((item) => item.desktopGroup === 'auth-actions');
  const hasDesktopAuthActions = desktopAuthActions.length > 0;
  const catalogDesktopPrimaryNavigation = isAnonymous ? desktopPrimaryNavigation : navigation;
  const catalogDesktopAccountNavigation = isAnonymous ? desktopAuthActions : [];
  const routeDensityMode = densityForPath(location.pathname);
  const isStudentMobile =
    isStudentMobileViewport && state.status === 'authenticated' && state.user.role === 'student';
  const isAnonymousMobile = isStudentMobileViewport && isAnonymous;
  const showHeaderCart = hasCartNavigation && !(isAnonymous && isStudentMobileViewport);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia(STUDENT_MOBILE_QUERY);
    const updateViewport = () => setIsStudentMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (isAnonymousMobile) setMobileOpen(false);
  }, [isAnonymousMobile]);

  useEffect(() => {
    if (!isCatalogRoute || !isStudentMobileViewport) {
      setIsMobileCatalogScrolled(false);
      return undefined;
    }

    const updateMobileCatalogScrollState = () => setIsMobileCatalogScrolled(window.scrollY > 0);
    updateMobileCatalogScrollState();
    window.addEventListener('scroll', updateMobileCatalogScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateMobileCatalogScrollState);
  }, [isCatalogRoute, isStudentMobileViewport]);

  useLayoutEffect(() => {
    if (densityMode !== routeDensityMode) setDensityMode(routeDensityMode);
  }, [densityMode, routeDensityMode, setDensityMode]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const root = document.documentElement;
    const main = mainRef.current;
    const syncAuthScrollbarOffset = () => {
      const rootRect = root.getBoundingClientRect();
      const hasRenderedRootBox =
        Number.isFinite(rootRect.left) &&
        Number.isFinite(rootRect.right) &&
        Number.isFinite(rootRect.width) &&
        rootRect.width > 0;
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
    const rememberCurrentPosition = () => {
      entryScrollPositionsRef.current.set(location.key, {
        left: window.scrollX,
        top: window.scrollY,
      });
    };

    window.addEventListener('scroll', rememberCurrentPosition, { passive: true });
    return () => window.removeEventListener('scroll', rememberCurrentPosition);
  }, [location.key]);

  useEffect(() => {
    const previousLocation = previousScrollLocationRef.current;
    if (previousLocation.key === location.key) return;

    if (navigationType !== 'POP') {
      entryScrollPositionsRef.current.set(previousLocation.key, {
        left: window.scrollX,
        top: window.scrollY,
      });
    }

    const pathnameChanged = previousLocation.pathname !== location.pathname;
    const previousCatalogPage = catalogPageForLocation(
      previousLocation.pathname,
      previousLocation.search,
    );
    const currentCatalogPage = catalogPageForLocation(location.pathname, location.search);
    const catalogPageChanged =
      previousCatalogPage !== null &&
      currentCatalogPage !== null &&
      previousCatalogPage !== currentCatalogPage;
    if (location.hash) {
      let targetId = location.hash.slice(1);
      try {
        targetId = decodeURIComponent(targetId);
      } catch {
        // Preserve malformed fragment navigation without letting it interrupt route restoration.
      }
      document.getElementById(targetId)?.scrollIntoView?.();
    } else if ((pathnameChanged || catalogPageChanged) && navigationType === 'POP') {
      const position = entryScrollPositionsRef.current.get(location.key);
      window.scrollTo(position?.left ?? 0, position?.top ?? 0);
    } else if (pathnameChanged || catalogPageChanged) {
      window.scrollTo(0, 0);
    }

    previousScrollLocationRef.current = location;
  }, [location, navigationType]);

  useEffect(() => {
    if (previousLocationRef.current !== currentLocation) {
      setMobileOpen(false);
      const restoreCatalogSearchFocus = restoreCatalogSearchFocusRef.current;
      const routeChanged = previousRouteFocusIdentityRef.current !== routeFocusIdentity;
      restoreCatalogSearchFocusRef.current = false;
      if (restoreCatalogSearchFocus) {
        scheduleAppShellFocus(() => catalogSearchRef.current?.focus());
      } else if (routeChanged) {
        scheduleAppShellFocus(() => mainRef.current?.focus({ preventScroll: true }));
      }
      previousLocationRef.current = currentLocation;
      previousRouteFocusIdentityRef.current = routeFocusIdentity;
    }
  }, [currentLocation, location.pathname, routeFocusIdentity]);

  function closeMobileMenu(focusTarget: MobileMenuFocusTarget) {
    setMobileOpen(false);
    scheduleAppShellFocus(() => {
      if (focusTarget === 'trigger') menuButtonRef.current?.focus();
      else mainRef.current?.focus();
    });
  }

  function handleInstructorCourseTitleFocus() {
    setMobileOpen(false);
    focusInstructorCourseTitle(INSTRUCTOR_COURSE_TITLE_ID);
  }

  const catalogSearchMatches = useMemo(() => {
    const draft = catalogSearchDraft.trim().toLocaleLowerCase();
    return draft
      ? catalogSearchHistory.filter((term) => term.toLocaleLowerCase().includes(draft))
      : catalogSearchHistory;
  }, [catalogSearchDraft, catalogSearchHistory]);
  const activeCatalogSearchTerm =
    activeCatalogSearchIndex === null ? undefined : catalogSearchMatches[activeCatalogSearchIndex];
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
    const destinationPathname = isCatalogRoute ? location.pathname : '/';
    if (
      destinationPathname === location.pathname &&
      nextSearch === currentCanonicalSearch &&
      location.search === (nextSearch ? `?${nextSearch}` : '')
    )
      return;

    restoreCatalogSearchFocusRef.current = true;
    navigate({
      pathname: destinationPathname,
      search: nextSearch ? `?${nextSearch}` : '',
      hash: isCatalogRoute ? location.hash : '',
    });
  }

  return (
    <div className={styles.shell} data-layout={layout}>
      <a className={styles.skipLink} href="#main-content">
        Skip to main content
      </a>
      <header
        className={[
          styles.header,
          isCatalogRoute ? styles.headerCatalog : null,
          isAnonymous ? styles.headerAnonymous : null,
          hasCatalogSearch ? styles.headerWithCatalogSearch : styles.headerWithoutCatalogSearch,
          isAnonymousCatalogRoute ? styles.headerAnonymousCatalog : null,
          isInstructor ? styles.headerInstructorCourses : null,
          isStudentMobile ? styles.headerStudentMobile : null,
          isAnonymousMobile ? styles.headerAnonymousMobile : null,
          isMobileCatalogScrolled ? styles.headerMobileSearchDetached : null,
        ]
          .filter(Boolean)
          .join(' ')}
        data-app-shell-header
      >
        <div className={styles.headerInner}>
          <div className={styles.headerCatalogStart}>
            <Link className={styles.brand} to={brandDestination} aria-label="LearnHub home">
              <img alt="" aria-hidden="true" className={styles.brandMark} src={learnHubBookMark} />
              <span className={styles.brandWordmark}>LearnHub</span>
            </Link>
            {!isStudentMobile ? (
              <nav
                className={
                  hasDesktopAuthActions && !isAnonymous
                    ? [styles.navDesktop, styles.navDesktopSplit].join(' ')
                    : styles.navDesktop
                }
                aria-label="Primary navigation"
              >
                <NavigationLinks
                  items={
                    isAnonymousCatalogRoute
                      ? catalogDesktopPrimaryNavigation
                      : desktopPrimaryNavigation
                  }
                  showPrimaryNavigationIndicator
                />
                {hasDesktopAuthActions && !isAnonymous ? (
                  <div className={styles.navAuthActions}>
                    <NavigationLinks items={desktopAuthActions} />
                  </div>
                ) : null}
              </nav>
            ) : null}
          </div>
          {hasCatalogSearch ? (
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
                  aria-activedescendant={
                    activeCatalogSearchTerm
                      ? `${catalogSearchListboxId}-option-${activeCatalogSearchIndex}`
                      : undefined
                  }
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
                      setActiveCatalogSearchIndex((index) =>
                        index === null ? 0 : Math.min(index + 1, catalogSearchMatches.length - 1),
                      );
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setCatalogSearchOpen(true);
                      setActiveCatalogSearchIndex((index) =>
                        index === null ? catalogSearchMatches.length - 1 : Math.max(index - 1, 0),
                      );
                    }
                  }}
                />
                <svg
                  className={styles.catalogSearchIcon}
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                </svg>
                {catalogSearchListboxVisible ? (
                  <div
                    className={styles.catalogSearchListbox}
                    id={catalogSearchListboxId}
                    role="listbox"
                    aria-label="Recent searches"
                  >
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
            {isInstructorCoursesRoute && !isStudentMobileViewport ? (
              <button
                className={[styles.navLink, styles.navLinkPrimary, styles.navAction].join(' ')}
                type="button"
                onClick={handleInstructorCourseTitleFocus}
              >
                Create course
              </button>
            ) : null}
            {isStudentMobile ? <AccountMenu user={state.user} /> : null}
            {isStudentMobile ? null : state.status === 'authenticated' &&
              state.user.role === 'student' ? (
              <div className={styles.headerCartAccountGroup}>
                <AiAssistantNavigationLink />
                <div className={styles.account}>
                  <AccountMenu user={state.user} />
                  {!isAnonymousMobile ? (
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
                      <VisuallyHidden>
                        {mobileOpen ? 'Close navigation' : 'Open navigation'}
                      </VisuallyHidden>
                    </button>
                  ) : null}
                </div>
                <CartNavigationLink itemCount={cart.data?.itemCount} />
              </div>
            ) : (
              <>
                {showHeaderCart ? <CartNavigationLink itemCount={cart.data?.itemCount} /> : null}
                {isAnonymous ? (
                  <nav
                    className={[styles.navDesktop, styles.navCatalogAccount].join(' ')}
                    aria-label="Account navigation"
                  >
                    <NavigationLinks items={catalogDesktopAccountNavigation} />
                  </nav>
                ) : null}
                <div
                  className={
                    state.status === 'authenticated'
                      ? state.user.role === 'instructor'
                        ? [styles.account, styles.accountInstructor].join(' ')
                        : styles.account
                      : [styles.account, styles.accountAnonymous].join(' ')
                  }
                >
                  {state.status === 'authenticated' ? <AccountMenu user={state.user} /> : null}
                  {!isAnonymousMobile ? (
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
                      <VisuallyHidden>
                        {mobileOpen ? 'Close navigation' : 'Open navigation'}
                      </VisuallyHidden>
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
        {mobileOpen && !isAnonymousMobile ? (
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
            {isInstructorCoursesRoute ? (
              <div className={styles.instructorCourseActions} data-part="instructor-course-actions">
                <NavigationLinks
                  items={navigation}
                  onNavigate={(to) =>
                    closeMobileMenu(to === routeFocusIdentity ? 'trigger' : 'main')
                  }
                />
                <button
                  className={[styles.navLink, styles.navLinkPrimary, styles.navAction].join(' ')}
                  type="button"
                  onClick={handleInstructorCourseTitleFocus}
                >
                  Create course
                </button>
              </div>
            ) : (
              <NavigationLinks
                items={navigation}
                onNavigate={(to) => closeMobileMenu(to === routeFocusIdentity ? 'trigger' : 'main')}
              />
            )}
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
        ]
          .filter(Boolean)
          .join(' ')}
        id="main-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <span>(c) 2026 LearnHub</span>
        <span>Accessible learning, built for every role.</span>
      </footer>
      {hasGlobalAssistant && globalAssistant !== null ? (
        !isStudentMobile ? (
          <CourseChatLauncher assistant={globalAssistant} />
        ) : null
      ) : null}
      {isStudentMobile ? <StudentMobileNavigation itemCount={cart.data?.itemCount} /> : null}
      {isAnonymousMobile ? <AnonymousMobileNavigation /> : null}
    </div>
  );
}
