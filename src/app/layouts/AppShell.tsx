import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type MouseEvent,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap,
  LogOut,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Link, matchPath, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import type { Cart } from '@entities/cart';
import type { UserProfile, UserRole } from '@entities/user';
import { useSession, type SessionState } from '@features/auth-session';
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
import assistantIcon from './assets/ai-assistant-navigation-icon.png';
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

interface CartPresentation {
  accessibleName: string;
  badge: string | null;
}

export function presentCart(itemCount: number | undefined): CartPresentation {
  if (itemCount === undefined) return { accessibleName: 'Cart', badge: null };
  const badge = itemCount >= 100 ? '99+' : String(itemCount);
  return { accessibleName: `Cart (${badge})`, badge };
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
      { label: 'Catalog', to: '/', end: true, variant: 'browse-link' },
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
      { label: 'Catalog', to: '/', end: true, variant: 'browse-link' },
      { label: 'My learning', to: '/learning', end: true },
    ];
  }
  if (status.user.role === 'instructor') {
    const items: NavigationItem[] = [{ label: 'My courses', to: '/instructor/courses', end: true }];
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

interface CartNavigationLinkProps {
  itemCount: number | undefined;
}

interface AccountMenuProps {
  user: UserProfile;
}

interface AccountRolePresentation {
  readonly Icon: LucideIcon;
}

const ACCOUNT_ROLE_PRESENTATION: Record<UserRole, AccountRolePresentation> = {
  student: { Icon: GraduationCap },
  instructor: { Icon: UserRound },
  admin: { Icon: ShieldCheck },
};

function CartNavigationLink({ itemCount }: CartNavigationLinkProps) {
  const presentation = presentCart(itemCount);
  return (
    <NavLink
      aria-label={presentation.accessibleName}
      className={({ isActive }) =>
        [styles.cartLink, isActive ? styles.cartLinkActive : null].filter(Boolean).join(' ')
      }
      end
      to="/cart"
    >
      <ShoppingCart aria-hidden="true" focusable="false" size={24} strokeWidth={2} />
      {presentation.badge ? <span className={styles.cartBadge}>{presentation.badge}</span> : null}
    </NavLink>
  );
}

function AiAssistantNavigationLink() {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  const enrollmentMatch = matchPath('/learning/enrollments/:enrollmentId/*', location.pathname);
  const assistantPath = enrollmentMatch?.params.enrollmentId
    ? `/learning/enrollments/${enrollmentMatch.params.enrollmentId}/ai-chat`
    : '/ai-chat';
  return (
    <NavLink
      aria-label="Open AI assistant"
      className={({ isActive }) =>
        [styles.aiAssistantLink, isActive ? styles.aiAssistantLinkActive : null]
          .filter(Boolean)
          .join(' ')
      }
      state={location.pathname === assistantPath ? undefined : { returnTo }}
      to={assistantPath}
    >
      <img src={assistantIcon} alt="" aria-hidden="true" />
    </NavLink>
  );
}

function AccountMenu({ user }: AccountMenuProps) {
  const { clearSession } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const suppressNextAccountFocusOpenRef = useRef(false);
  const menuId = `account-menu-${useId()}`;
  const identity = `${user.name} ${user.surname}`;
  const initials =
    `${user.name.trim().charAt(0)}${user.surname.trim().charAt(0)}`.toLocaleUpperCase();
  const RoleIcon = ACCOUNT_ROLE_PRESENTATION[user.role].Icon;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !accountMenuRef.current?.contains(event.target)) {
        setOpen(false);
        setPinned(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setPinned(false);
        suppressNextAccountFocusOpenRef.current = true;
        accountTriggerRef.current?.focus({ preventScroll: true });
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={accountMenuRef}
      className={[styles.accountMenu, open ? styles.accountMenuOpen : null]
        .filter(Boolean)
        .join(' ')}
      onFocus={() => {
        if (suppressNextAccountFocusOpenRef.current) {
          suppressNextAccountFocusOpenRef.current = false;
          return;
        }
        setOpen(true);
      }}
      onBlur={(event) => {
        if (!pinned && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false);
      }}
    >
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={`Account menu for ${identity}`}
        className={[styles.accountInitials, open ? styles.accountInitialsOpen : null]
          .filter(Boolean)
          .join(' ')}
        data-account-initials
        ref={accountTriggerRef}
        type="button"
        onClick={() => {
          setPinned(true);
          setOpen(true);
        }}
      >
        {initials}
      </button>
      {open ? (
        <div
          aria-label={`Account details for ${identity}`}
          className={styles.accountMenuList}
          id={menuId}
          role="group"
        >
          <div className={styles.accountMenuProfile} data-part="account-menu-profile">
            <span className={styles.accountMenuAvatar} aria-hidden="true">
              {initials}
            </span>
            <span className={styles.accountMenuDetails}>
              <span className={styles.accountMenuName}>{identity}</span>
              <span className={styles.accountMenuEmail}>{user.email}</span>
            </span>
            <span className={styles.accountMenuRole}>
              <RoleIcon data-part="account-menu-role-icon" aria-hidden="true" size={16} />
              <span>{user.role}</span>
            </span>
          </div>
          <div className={styles.accountMenuDivider} role="separator" />
          <button
            className={styles.accountMenuLogout}
            type="button"
            onClick={() => {
              clearSession();
              navigate('/');
            }}
          >
            <LogOut aria-hidden="true" size={16} />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NavigationLinks({ items, onNavigate }: NavigationLinksProps) {
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

function isCurrentTabNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  const target = event.currentTarget.getAttribute('target');
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (!target || target.toLowerCase() === '_self') &&
    !event.currentTarget.hasAttribute('download')
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
  const [mobileOpen, setMobileOpen] = useState(false);
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
  const routeFocusIdentity = `${location.pathname}${location.search}`;
  const previousRouteFocusIdentityRef = useRef(routeFocusIdentity);
  const courseRouteMatch = [APP_ROUTE_BY_ID['PAGE-011'].path, APP_ROUTE_BY_ID['PAGE-012'].path]
    .map((path) => matchPath({ path, end: true }, location.pathname))
    .find((match) => match?.params.courseId);
  const navigation = navigationForSession(state, courseRouteMatch?.params.courseId ?? null);
  const route = routeForPath(location.pathname);
  const layout = route?.layout ?? 'public';
  const isCatalogRoute = route?.id === 'PAGE-001';
  const isAnonymous = state.status === 'anonymous';
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
    if (previousLocationRef.current !== currentLocation) {
      setMobileOpen(false);
      const restoreCatalogSearchFocus = restoreCatalogSearchFocusRef.current;
      const routeChanged = previousRouteFocusIdentityRef.current !== routeFocusIdentity;
      restoreCatalogSearchFocusRef.current = false;
      if (restoreCatalogSearchFocus) {
        scheduleFocus(() => catalogSearchRef.current?.focus());
      } else if (routeChanged) {
        scheduleFocus(() => mainRef.current?.focus({ preventScroll: true }));
      }
      previousLocationRef.current = currentLocation;
      previousRouteFocusIdentityRef.current = routeFocusIdentity;
    }
  }, [currentLocation, location.pathname, routeFocusIdentity]);

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
        ]
          .filter(Boolean)
          .join(' ')}
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
                <rect
                  className={styles.brandMarkOutline}
                  x="2"
                  y="2"
                  width="28"
                  height="28"
                  rx="6"
                />
                <path
                  className={styles.brandMarkBook}
                  d="M5.5 8.5c3.4.6 6.3 1.8 9.5 3.7v13.2c-3.2-1.9-6.4-3-9.5-3.4V8.5Zm21 0c-3.4.6-6.3 1.8-9.5 3.7v13.2c3.2-1.9 6.4-3 9.5-3.4V8.5Z"
                />
              </svg>
              <span className={styles.brandWordmark}>LearnHub</span>
            </Link>
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
              />
              {hasDesktopAuthActions && !isAnonymous ? (
                <div className={styles.navAuthActions}>
                  <NavigationLinks items={desktopAuthActions} />
                </div>
              ) : null}
            </nav>
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
            {state.status === 'authenticated' && state.user.role === 'student' ? (
              <div className={styles.headerCartAccountGroup}>
                <AiAssistantNavigationLink />
                <div className={styles.account}>
                  <AccountMenu user={state.user} />
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
                </div>
                <CartNavigationLink itemCount={cart.data?.itemCount} />
              </div>
            ) : (
              <>
                {hasCartNavigation ? <CartNavigationLink itemCount={cart.data?.itemCount} /> : null}
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
                </div>
              </>
            )}
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
        <CourseChatLauncher assistant={globalAssistant} />
      ) : null}
    </div>
  );
}
