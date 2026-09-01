import {
  type MouseEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  ChevronRight,
  GraduationCap,
  LibraryBig,
  LogIn,
  LogOut,
  Menu,
  ShoppingCart,
  UserPlus,
  X,
} from 'lucide-react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';

import type { Cart } from '@entities/cart';
import type { UserProfile } from '@entities/user';
import { useSession } from '@features/auth-session';
import { requestInstructorCourseCreateDisclosure } from '@features/instructor-courses';
import { cartQueryKey, requestCart } from '@features/cart-workflow';
import {
  addCatalogSearchHistory,
  parseCatalogQuery,
  persistCatalogSearchHistory,
  readCatalogSearchHistory,
  serializeCatalogQuery,
} from '@features/catalog-discovery';
import { Dialog, Input, VisuallyHidden } from '@shared/ui/primitives';
import { useDensityMode } from '@shared/ui/theme';
import { LanguageSelector, useLocale } from '@shared/locale';
import type { ExclusiveDisclosureControl } from '@shared/types';
import { CourseChatLauncher } from '@widgets/course-chat';
import learnHubBookMark from './assets/learnhub-book-ui018.png';
import { AccountIdentity, AccountMenu } from './AccountMenu';
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
type HeaderDisclosure = 'account' | 'language';

const STUDENT_MOBILE_QUERY = '(max-width: 767.98px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';
const INSTRUCTOR_COURSE_TITLE_ID = 'instructor-course-title';
const INSTRUCTOR_COURSES_PATH = '/instructor/courses';
const INSTRUCTOR_COURSES_HEADING_ID = 'your-courses-heading';
const INSTRUCTOR_COURSES_NEW_TAB_FOCUS_KEY = 'learnhub.instructor-courses.new-tab-focus';
const INSTRUCTOR_COURSES_NEW_TAB_FOCUS_MAX_AGE_MS = 30_000;

interface CartPresentation {
  badge: string | null;
}

interface ScrollPosition {
  left: number;
  top: number;
}

interface InstructorCoursesNewTabFocusMarker {
  readonly destination: string;
  readonly requestedAt: number;
  readonly sourcePath: string;
}

function isInstructorCoursesNewTabFocusMarker(
  value: unknown,
): value is InstructorCoursesNewTabFocusMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'destination' in value &&
    typeof value.destination === 'string' &&
    'requestedAt' in value &&
    typeof value.requestedAt === 'number' &&
    Number.isFinite(value.requestedAt) &&
    Number.isSafeInteger(value.requestedAt) &&
    'sourcePath' in value &&
    typeof value.sourcePath === 'string'
  );
}

export function presentCart(itemCount: number | undefined): CartPresentation {
  if (itemCount === undefined) return { badge: null };
  const badge = itemCount >= 100 ? '99+' : String(itemCount);
  return { badge };
}

interface NavigationLinksProps {
  items: readonly NavigationItem[];
  onNavigate?: (to: string) => void;
  showPrimaryNavigationIndicator?: boolean;
  showTrailingChevron?: boolean;
}

const NAVIGATION_VARIANT_CLASS: Record<NavigationItemVariant, string> = {
  'browse-link': styles.navLinkBrowse,
  'login-secondary': styles.navLinkLogin,
  'signup-primary': styles.navLinkSignup,
};

function isExplicitNewTabNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  if (event.defaultPrevented) return false;
  if (event.type === 'auxclick') return event.button === 1;
  const target = event.currentTarget.getAttribute('target');
  return (
    event.button === 0 &&
    (event.metaKey || event.ctrlKey || event.shiftKey || target?.toLowerCase() === '_blank') &&
    !event.currentTarget.hasAttribute('download')
  );
}

function requestInstructorCoursesNewTabFocus(
  event: MouseEvent<HTMLAnchorElement>,
  destination: string,
): void {
  if (destination !== INSTRUCTOR_COURSES_PATH || !isExplicitNewTabNavigation(event)) return;
  try {
    const marker: InstructorCoursesNewTabFocusMarker = {
      destination,
      requestedAt: Date.now(),
      sourcePath: window.location.pathname,
    };
    window.localStorage.setItem(INSTRUCTOR_COURSES_NEW_TAB_FOCUS_KEY, JSON.stringify(marker));
  } catch {
    // Focus restoration is progressive enhancement when local storage is unavailable.
  }
}

export function claimInstructorCoursesNewTabFocus(
  pathname: string,
  referrer = document.referrer,
  now = Date.now(),
): boolean {
  if (pathname !== INSTRUCTOR_COURSES_PATH) return false;
  try {
    const serialized = window.localStorage.getItem(INSTRUCTOR_COURSES_NEW_TAB_FOCUS_KEY);
    if (!serialized) return false;
    // A marker can only authorize one document. Retire it before parsing the referrer so an
    // invalid document value cannot leave a replayable focus request behind.
    window.localStorage.removeItem(INSTRUCTOR_COURSES_NEW_TAB_FOCUS_KEY);
    const marker: unknown = JSON.parse(serialized);
    if (!isInstructorCoursesNewTabFocusMarker(marker)) return false;
    const referrerUrl = new URL(referrer);
    const valid =
      marker.destination === pathname &&
      referrerUrl.origin === window.location.origin &&
      marker.sourcePath === referrerUrl.pathname &&
      now - marker.requestedAt >= 0 &&
      now - marker.requestedAt <= INSTRUCTOR_COURSES_NEW_TAB_FOCUS_MAX_AGE_MS;
    return valid;
  } catch {
    return false;
  }
}

interface CartNavigationLinkProps {
  itemCount: number | undefined;
}

function CartNavigationLink({ itemCount }: CartNavigationLinkProps) {
  const presentation = presentCart(itemCount);
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <NavLink
      aria-label={
        presentation.badge ? t('a11y:cart', { cartCount: presentation.badge }) : t('common:cart')
      }
      className={({ isActive }) =>
        [styles.cartLink, isActive ? styles.cartLinkActive : null].filter(Boolean).join(' ')
      }
      end
      state={cartNavigationState(location)}
      to="/cart"
    >
      <ShoppingCart aria-hidden="true" focusable="false" size={25} strokeWidth={1.75} />
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
  const { t } = useTranslation();

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
      aria-label={t('a11y:openAiAssistant')}
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
      <Bot aria-hidden="true" focusable="false" size={28} strokeWidth={1.75} />
      {isTooltipVisible ? (
        <span id={tooltipId} className={styles.aiAssistantTooltip} role="tooltip">
          {t('common:aiChat')}
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
  const { t } = useTranslation();
  return (
    <nav className={styles.studentMobileNavigation} aria-label={t('a11y:studentNavigation')}>
      <NavLink className={styles.studentMobileNavigationLink} end to="/">
        <LibraryBig aria-hidden="true" focusable="false" size={20} />
        <span>{t('navigation:catalog')}</span>
      </NavLink>
      <NavLink className={styles.studentMobileNavigationLink} end to="/learning">
        <GraduationCap aria-hidden="true" focusable="false" size={20} />
        <span>{t('navigation:myLearning')}</span>
      </NavLink>
      <NavLink
        className={styles.studentMobileNavigationLink}
        end
        state={assistantTarget.state}
        to={assistantTarget.to}
      >
        <Bot aria-hidden="true" focusable="false" size={20} />
        <span>{t('common:aiChat')}</span>
      </NavLink>
      <NavLink
        aria-label={
          cartPresentation.badge
            ? t('a11y:cart', { cartCount: cartPresentation.badge })
            : t('common:cart')
        }
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
        <span>{t('common:cart')}</span>
      </NavLink>
    </nav>
  );
}

function AnonymousMobileNavigation() {
  const { t } = useTranslation();
  return (
    <nav className={styles.anonymousMobileNavigation} aria-label={t('a11y:anonymousNavigation')}>
      <NavLink className={styles.anonymousMobileNavigationLink} end to="/">
        <LibraryBig aria-hidden="true" focusable="false" size={20} />
        <span>{t('navigation:catalog')}</span>
      </NavLink>
      <NavLink className={styles.anonymousMobileNavigationLink} end to="/login">
        <LogIn aria-hidden="true" focusable="false" size={20} />
        <span>{t('navigation:logIn')}</span>
      </NavLink>
      <NavLink className={styles.anonymousMobileNavigationLink} end to="/signup">
        <UserPlus aria-hidden="true" focusable="false" size={20} />
        <span>{t('navigation:signUp')}</span>
      </NavLink>
    </nav>
  );
}

function NavigationLinks({
  items,
  onNavigate,
  showPrimaryNavigationIndicator = false,
  showTrailingChevron = false,
}: NavigationLinksProps) {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <ul className={styles.navList}>
      {items.map((item) => {
        const isCatalogSection =
          item.to === '/' && routeForPath(location.pathname)?.id === 'PAGE-002';
        return (
          <li key={item.to}>
            <NavLink
              aria-current={isCatalogSection ? 'location' : undefined}
              end={item.end}
              className={({ isActive }) =>
                [
                  styles.navLink,
                  isActive || isCatalogSection ? styles.navLinkActive : null,
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
                requestInstructorCoursesNewTabFocus(event, item.to);
                if (isCurrentTabNavigation(event)) onNavigate?.(item.to);
              }}
              onAuxClick={(event) => requestInstructorCoursesNewTabFocus(event, item.to)}
              to={item.to}
            >
              {t(item.labelKey)}
              {showTrailingChevron ? (
                <ChevronRight aria-hidden="true" focusable="false" size={16} />
              ) : null}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

interface AuthenticatedTabletDrawerProps {
  readonly navigation: readonly NavigationItem[];
  readonly onClose: () => void;
  readonly onCreateCourse?: () => void;
  readonly onLogOut: () => void;
  readonly onNavigate: (to: string) => void;
  readonly open: boolean;
  readonly user: UserProfile;
}

const AUTHENTICATED_TABLET_DRAWER_EXIT_DURATION_MS = 180;

function AuthenticatedTabletDrawer({
  navigation,
  onClose,
  onCreateCourse,
  onLogOut,
  onNavigate,
  open,
  user,
}: AuthenticatedTabletDrawerProps) {
  const { t } = useTranslation();
  const [present, setPresent] = useState(open);
  const [closing, setClosing] = useState(false);
  const afterCloseActionRef = useRef<AuthenticatedTabletDrawerProps['onCreateCourse']>(undefined);
  const roleLabel =
    user.role === 'student'
      ? t('auth:student')
      : user.role === 'instructor'
        ? t('course:instructor')
        : t('auth:admin');
  const location = useLocation();
  const assistantTarget = assistantNavigationTarget(location);

  const runAfterCloseAction = useCallback(() => {
    const action = afterCloseActionRef.current;
    afterCloseActionRef.current = undefined;
    if (action) scheduleAppShellFocus(action);
  }, []);

  const closeForNavigation = useCallback(
    (to: string) => {
      afterCloseActionRef.current = () => onNavigate(to);
      onClose();
    },
    [onClose, onNavigate],
  );

  useEffect(() => {
    if (open) {
      afterCloseActionRef.current = undefined;
      setPresent(true);
      setClosing(false);
      return undefined;
    }
    if (!present) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPresent(false);
      setClosing(false);
      runAfterCloseAction();
      return undefined;
    }

    setClosing(true);
    const timeoutId = window.setTimeout(() => {
      setPresent(false);
      setClosing(false);
      runAfterCloseAction();
    }, AUTHENTICATED_TABLET_DRAWER_EXIT_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [open, present, runAfterCloseAction]);

  return (
    <Dialog
      className={[
        styles.authenticatedTabletDrawer,
        closing ? styles.authenticatedTabletDrawerClosing : null,
      ]
        .filter(Boolean)
        .join(' ')}
      closeContent={<X aria-hidden="true" focusable="false" size={20} strokeWidth={1.75} />}
      closeLabel={t('a11y:closeNavigation')}
      onClose={onClose}
      open={present}
      title={
        <>
          <VisuallyHidden>{t('common:menu')}</VisuallyHidden>
          <span aria-hidden="true">
            <AccountIdentity user={user} roleLabel={roleLabel} variant="drawerHeader" />
          </span>
        </>
      }
    >
      <nav
        aria-label={t('a11y:mobileNavigation')}
        className={styles.authenticatedTabletDrawerNavigation}
        id="authenticated-tablet-navigation"
      >
        <NavigationLinks items={navigation} onNavigate={closeForNavigation} showTrailingChevron />
        {user.role === 'student' ? (
          <NavLink
            className={({ isActive }) =>
              [styles.authenticatedTabletDrawerLink, isActive ? styles.navLinkActive : null]
                .filter(Boolean)
                .join(' ')
            }
            onClick={(event) => {
              if (isCurrentTabNavigation(event)) closeForNavigation(assistantTarget.to);
            }}
            state={assistantTarget.state}
            to={assistantTarget.to}
          >
            <span className={styles.authenticatedTabletDrawerLinkLabel}>
              <Bot aria-hidden="true" focusable="false" size={20} strokeWidth={1.75} />
              {t('common:aiChat')}
            </span>
            <ChevronRight aria-hidden="true" focusable="false" size={16} />
          </NavLink>
        ) : null}
        {onCreateCourse ? (
          <button
            className={styles.authenticatedTabletDrawerAction}
            type="button"
            onClick={() => {
              afterCloseActionRef.current = onCreateCourse;
              onClose();
            }}
          >
            <span>{t('instructor:coursesCreateCourse')}</span>
            <ChevronRight aria-hidden="true" focusable="false" size={16} />
          </button>
        ) : null}
      </nav>
      <div className={styles.authenticatedTabletDrawerFooter}>
        <button className={styles.authenticatedTabletDrawerLogout} type="button" onClick={onLogOut}>
          <LogOut aria-hidden="true" focusable="false" size={18} />
          <span>{t('auth:logOut')}</span>
        </button>
      </div>
    </Dialog>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const session = useSession();
  const { clearStoredLocale } = useLocale();
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
  const [authenticatedTabletDrawerOpen, setAuthenticatedTabletDrawerOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [isStudentMobileViewport, setIsStudentMobileViewport] = useState(false);
  const [isTabletViewport, setIsTabletViewport] = useState(false);
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
  const [activeHeaderDisclosure, setActiveHeaderDisclosure] = useState<HeaderDisclosure | null>(
    null,
  );
  const accountDisclosureControl: ExclusiveDisclosureControl = {
    closeRequested: activeHeaderDisclosure === 'language',
    requestOpen: () => setActiveHeaderDisclosure('account'),
  };
  const languageDisclosureControl: ExclusiveDisclosureControl = {
    closeRequested: activeHeaderDisclosure === 'account',
    requestOpen: () => setActiveHeaderDisclosure('language'),
  };
  const [activeCatalogSearchIndex, setActiveCatalogSearchIndex] = useState<number | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const tabletMenuRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const catalogSearchRef = useRef<HTMLInputElement>(null);
  const catalogSearchWrapperRef = useRef<HTMLDivElement>(null);
  const restoreCatalogSearchFocusRef = useRef(false);
  const newTabInstructorCoursesFocusClaimedRef = useRef(false);
  const catalogSearchListboxId = `catalog-search-history-${useId()}`;
  const currentLocation = `${location.pathname}${location.search}${location.hash}`;
  const previousLocationRef = useRef(currentLocation);
  const previousScrollLocationRef = useRef(location);
  const entryScrollPositionsRef = useRef(new Map<string, ScrollPosition>());
  const routeFocusIdentity = `${location.pathname}${location.search}`;
  const previousRouteFocusIdentityRef = useRef(routeFocusIdentity);
  const initialRoutePathnameRef = useRef(location.pathname);
  const navigation = navigationForSession(state);
  const route = routeForPath(location.pathname);
  const layout = route?.layout ?? 'public';
  const isCatalogRoute = route?.id === 'PAGE-001';
  const isCourseDetailRoute = route?.id === 'PAGE-002';
  const isInstructorCoursesRoute = route?.id === 'PAGE-010';
  const isAnonymous = state.status !== 'authenticated';
  const isInstructor = state.status === 'authenticated' && state.user.role === 'instructor';
  const brandDestination = isInstructor ? '/instructor/courses' : '/';
  const hasCatalogSearch =
    isCatalogRoute ||
    (isCourseDetailRoute && !isInstructor) ||
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
  const isAuthenticatedMobile = isStudentMobileViewport && state.status === 'authenticated';
  const isAnonymousMobile = isStudentMobileViewport && isAnonymous;
  const isAnonymousTablet = isTabletViewport && isAnonymous;
  const isAuthenticatedTablet = isTabletViewport && state.status === 'authenticated';
  const isInstructorCompactDrawer = isInstructor && (isStudentMobileViewport || isTabletViewport);
  const isAuthenticatedDrawerViewport =
    isAuthenticatedTablet || (isInstructor && isAuthenticatedMobile);
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
    if (typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia(TABLET_QUERY);
    const updateViewport = () => {
      setIsTabletViewport(mediaQuery.matches);
    };
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!isAuthenticatedDrawerViewport) setAuthenticatedTabletDrawerOpen(false);
  }, [isAuthenticatedDrawerViewport]);

  useEffect(() => {
    if (!logoutPending || location.pathname !== '/') return;
    session.clearSession();
    setLogoutPending(false);
  }, [location.pathname, logoutPending, session]);

  useEffect(() => {
    if (isAnonymousTablet || !isAnonymous) return;
    setMobileOpen(false);
  }, [isAnonymous, isAnonymousTablet]);

  useEffect(() => {
    if (!mobileOpen || !isAnonymousTablet) return undefined;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!tabletMenuRef.current?.contains(event.target as Node)) setMobileOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
    };
  }, [isAnonymousTablet, mobileOpen]);

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
    document.addEventListener('click', rememberCurrentPosition, true);
    return () => {
      window.removeEventListener('scroll', rememberCurrentPosition);
      document.removeEventListener('click', rememberCurrentPosition, true);
    };
  }, [location.key]);

  useLayoutEffect(() => {
    const previousLocation = previousScrollLocationRef.current;
    if (previousLocation.key === location.key) return;

    if (navigationType !== 'POP' && !entryScrollPositionsRef.current.has(previousLocation.key)) {
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
      setAuthenticatedTabletDrawerOpen(false);
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

  useEffect(() => {
    const hasClaimedNewTabFocus =
      newTabInstructorCoursesFocusClaimedRef.current ||
      claimInstructorCoursesNewTabFocus(initialRoutePathnameRef.current);
    if (!hasClaimedNewTabFocus) return undefined;
    newTabInstructorCoursesFocusClaimedRef.current = true;
    let cancelled = false;
    const focusHeading = (heading: HTMLElement) =>
      scheduleAppShellFocus(() => {
        if (cancelled) return;
        heading.focus({ preventScroll: true });
        newTabInstructorCoursesFocusClaimedRef.current = false;
      });
    const heading = document.getElementById(INSTRUCTOR_COURSES_HEADING_ID);
    if (heading instanceof HTMLElement) {
      focusHeading(heading);
      return () => {
        cancelled = true;
      };
    }
    const observer = new MutationObserver(() => {
      const renderedHeading = document.getElementById(INSTRUCTOR_COURSES_HEADING_ID);
      if (!(renderedHeading instanceof HTMLElement)) return;
      observer.disconnect();
      focusHeading(renderedHeading);
    });
    observer.observe(mainRef.current ?? document.body, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  function closeMobileMenu(focusTarget: MobileMenuFocusTarget) {
    setMobileOpen(false);
    scheduleAppShellFocus(() => {
      if (focusTarget === 'trigger') menuButtonRef.current?.focus();
      else mainRef.current?.focus();
    });
  }

  function handleInstructorCourseTitleFocus() {
    setMobileOpen(false);
    setAuthenticatedTabletDrawerOpen(false);
    if (document.getElementById(INSTRUCTOR_COURSE_TITLE_ID)) {
      focusInstructorCourseTitle(INSTRUCTOR_COURSE_TITLE_ID);
      return;
    }
    requestInstructorCourseCreateDisclosure();
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

  const languageSelector = (
    <LanguageSelector
      className={[styles.languageSelector, isAnonymousMobile ? styles.languageSelectorMobile : null]
        .filter(Boolean)
        .join(' ')}
      menuClassName={styles.languageMenu}
      optionClassName={styles.languageOption}
      selectedOptionClassName={styles.languageOptionSelected}
      selectionIndicatorClassName={styles.languageRadio}
      mobile={isAnonymousMobile}
      exclusiveDisclosure={languageDisclosureControl}
    />
  );

  return (
    <div className={styles.shell} data-layout={layout}>
      <a className={styles.skipLink} href="#main-content">
        {t('a11y:skipToMainContent')}
      </a>
      <header
        className={[
          styles.header,
          isCatalogRoute ? styles.headerCatalog : null,
          isAnonymous ? styles.headerAnonymous : null,
          hasCatalogSearch ? styles.headerWithCatalogSearch : styles.headerWithoutCatalogSearch,
          isAnonymousCatalogRoute ? styles.headerAnonymousCatalog : null,
          isInstructor ? styles.headerInstructorCourses : null,
          isAuthenticatedMobile ? styles.headerAuthenticatedMobile : null,
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
            <Link
              className={styles.brand}
              to={brandDestination}
              aria-label={t('a11y:learnHubHome')}
            >
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
                aria-label={t('a11y:primaryNavigation')}
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
            {isAuthenticatedDrawerViewport ? (
              <button
                ref={menuButtonRef}
                aria-controls={
                  authenticatedTabletDrawerOpen ? 'authenticated-tablet-navigation' : undefined
                }
                aria-expanded={authenticatedTabletDrawerOpen}
                aria-haspopup="dialog"
                className={styles.menuButton}
                type="button"
                onClick={() => setAuthenticatedTabletDrawerOpen((open) => !open)}
              >
                <Menu aria-hidden="true" focusable="false" size={20} strokeWidth={1.75} />
                <VisuallyHidden>
                  {authenticatedTabletDrawerOpen
                    ? t('a11y:closeNavigation')
                    : t('a11y:openNavigation')}
                </VisuallyHidden>
              </button>
            ) : null}
            {isAnonymousTablet ? (
              <div
                ref={tabletMenuRef}
                className={styles.tabletMenuAnchor}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && mobileOpen) {
                    event.preventDefault();
                    closeMobileMenu('trigger');
                  }
                }}
              >
                <button
                  ref={menuButtonRef}
                  className={styles.menuButton}
                  type="button"
                  aria-expanded={mobileOpen}
                  aria-controls="tablet-navigation-menu"
                  onClick={() => setMobileOpen((open) => !open)}
                >
                  <Menu aria-hidden="true" focusable="false" size={20} strokeWidth={1.75} />
                  <VisuallyHidden>
                    {mobileOpen ? t('a11y:closeNavigation') : t('a11y:openNavigation')}
                  </VisuallyHidden>
                </button>
                {mobileOpen ? (
                  <nav
                    id="tablet-navigation-menu"
                    className={styles.tabletMenuPopover}
                    aria-label={t('a11y:mobileNavigation')}
                  >
                    <NavigationLinks
                      items={navigation}
                      onNavigate={(to) =>
                        closeMobileMenu(to === routeFocusIdentity ? 'trigger' : 'main')
                      }
                    />
                  </nav>
                ) : null}
              </div>
            ) : null}
          </div>
          {hasCatalogSearch ? (
            <form
              className={styles.catalogSearch}
              role="search"
              aria-label={t('a11y:courseCatalogSearch')}
              onSubmit={(event) => {
                event.preventDefault();
                submitCatalogSearch(activeCatalogSearchTerm);
              }}
            >
              <div ref={catalogSearchWrapperRef} className={styles.catalogSearchField}>
                <Input
                  ref={catalogSearchRef}
                  label={<VisuallyHidden>{t('a11y:searchCourses')}</VisuallyHidden>}
                  fieldClassName={styles.catalogSearchPrimitiveField}
                  className={styles.catalogSearchInput}
                  name="search_query"
                  type="search"
                  value={catalogSearchDraft}
                  placeholder={t('common:searchCoursesPlaceholder')}
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
                    aria-label={t('a11y:recentSearches')}
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
            {isInstructorCoursesRoute && !isStudentMobileViewport && !isAuthenticatedTablet ? (
              <button
                className={[styles.navLink, styles.navLinkPrimary, styles.navAction].join(' ')}
                type="button"
                onClick={handleInstructorCourseTitleFocus}
              >
                {t('instructor:coursesCreateCourse')}
              </button>
            ) : null}
            {isStudentMobile ? (
              <>
                <AccountMenu user={state.user} exclusiveDisclosure={accountDisclosureControl} />
                {languageSelector}
              </>
            ) : null}
            {isStudentMobile ? null : state.status === 'authenticated' &&
              state.user.role === 'student' ? (
              <div className={styles.headerCartAccountGroup}>
                {!isAuthenticatedTablet ? <AiAssistantNavigationLink /> : null}
                <CartNavigationLink itemCount={cart.data?.itemCount} />
                {!isAuthenticatedTablet ? (
                  <div className={styles.account}>
                    <AccountMenu user={state.user} exclusiveDisclosure={accountDisclosureControl} />
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
                        <Menu aria-hidden="true" focusable="false" size={20} strokeWidth={1.75} />
                        <VisuallyHidden>
                          {mobileOpen ? t('a11y:closeNavigation') : t('a11y:openNavigation')}
                        </VisuallyHidden>
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {showHeaderCart ? <CartNavigationLink itemCount={cart.data?.itemCount} /> : null}
                {isAnonymous ? (
                  <nav
                    className={[styles.navDesktop, styles.navCatalogAccount].join(' ')}
                    aria-label={t('a11y:accountNavigation')}
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
                  {state.status === 'authenticated' && (!isAuthenticatedTablet || isInstructor) ? (
                    <AccountMenu user={state.user} exclusiveDisclosure={accountDisclosureControl} />
                  ) : null}
                  {isAuthenticatedMobile || (isInstructor && isAuthenticatedTablet)
                    ? languageSelector
                    : null}
                  {!isInstructorCompactDrawer &&
                  !isAnonymousMobile &&
                  !isAnonymousTablet &&
                  !isAuthenticatedTablet ? (
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
                      <Menu aria-hidden="true" focusable="false" size={20} strokeWidth={1.75} />
                      <VisuallyHidden>
                        {mobileOpen ? t('a11y:closeNavigation') : t('a11y:openNavigation')}
                      </VisuallyHidden>
                    </button>
                  ) : null}
                </div>
              </>
            )}
            {!isAuthenticatedMobile && !(isInstructor && isAuthenticatedTablet)
              ? languageSelector
              : null}
          </div>
        </div>
        {mobileOpen &&
        !isInstructor &&
        !isAnonymousMobile &&
        !isAnonymousTablet &&
        !isAuthenticatedTablet ? (
          <nav
            id="mobile-navigation"
            className={styles.navMobile}
            aria-label={t('a11y:mobileNavigation')}
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
                  {t('instructor:coursesCreateCourse')}
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
      {state.status === 'authenticated' && isAuthenticatedDrawerViewport ? (
        <AuthenticatedTabletDrawer
          navigation={navigation}
          onClose={() => setAuthenticatedTabletDrawerOpen(false)}
          onCreateCourse={isInstructorCoursesRoute ? handleInstructorCourseTitleFocus : undefined}
          onLogOut={() => {
            setAuthenticatedTabletDrawerOpen(false);
            clearStoredLocale();
            setLogoutPending(true);
            navigate('/', { replace: true, flushSync: true });
          }}
          onNavigate={(to) => {
            if (to === routeFocusIdentity) menuButtonRef.current?.focus();
            else mainRef.current?.focus({ preventScroll: true });
          }}
          open={authenticatedTabletDrawerOpen}
          user={state.user}
        />
      ) : null}
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
        <span>{t('common:footerCopyright')}</span>
        <span>{t('common:footerTagline')}</span>
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
